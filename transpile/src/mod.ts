import * as fs from "fs";
import * as path from "path";
import * as rollup from "rollup";
import ts from "typescript";
import glob from "glob-promise";
import rimraf from "rimraf";

import { resolveImport } from "./util.js";
import { createImportsTransformer } from "./rewriteImports.js";

// @ts-ignore
let futureTypescriptLibPath = import.meta.resolve("typescript/lib");
let typescriptLibPath: string;

class CompilerHost implements ts.CompilerHost {
	inputPath: string;
	outputPath: string;
	modules: Set<string>;

	constructor(inputPath: string, outputPath: string, modules: Set<string>) {
		this.inputPath = inputPath;
		this.outputPath = outputPath;
		this.modules = modules;
	}

	getCurrentDirectory() {
		return ts.sys.getCurrentDirectory();
	}

	getDirectories(path: string) {
		return ts.sys.getDirectories(path);
	}

	getCanonicalFileName(fileName: string) {
		return fileName;
	}

	getNewLine() {
		return ts.sys.newLine;
	}

	getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) {
		const sourceText = ts.sys.readFile(fileName);
		return sourceText !== undefined
			? ts.createSourceFile(fileName, sourceText, languageVersion)
			: undefined
		;
	}

	getDefaultLibFileName(options) {
		return path.join(typescriptLibPath, /* "lib.es2020.d.ts" TEMP --> */ "lib.es2020.full.d.ts").substring(6);
	}

	useCaseSensitiveFileNames() {
		return true;
	}

	readFile(fileName: string): string | undefined {
		return ts.sys.readFile(fileName);
	}

	writeFile(fileName: string, contents: string) {
		// let targetPath = path.join(this.outputPath, path.relative(this.inputPath, fileName));
		// ts.sys.writeFile(targetPath, contents);
		ts.sys.writeFile(fileName, contents);
	}

	fileExists(fileName: string): boolean {
		return ts.sys.fileExists(fileName);
	}

	resolveModuleNames(
		moduleNames: string[],
		containingFile: string,
	): ts.ResolvedModule[] {
		const resolvedModules: ts.ResolvedModule[] = [];

		for (const moduleName of moduleNames) {
			resolvedModules.push({
				resolvedFileName: resolveImport(this.modules, moduleName, containingFile) || "INVALID_IMPORT_FORMAT.ts",
			});
		}

		return resolvedModules;
	}
}

export async function transpileEsm(inputPath: string, outputPath: string): Promise<boolean> {
	inputPath = path.resolve(inputPath);
	outputPath = path.resolve(outputPath);

	let moduleName = path.basename(inputPath);
	let modules = new Set<string>();
	let files =
		(await glob(inputPath + "/**/*@(.ts|.js)", { follow: true }))
			.map((file: string) => path.normalize(file))
		;

	for (let file of files) {
		let segments = file.split(path.sep);
		if (segments[segments.length - 1] === "mod.ts") {
			modules.add(segments.slice(0, segments.length - 1).join(path.sep));
		}
	}

	typescriptLibPath = await futureTypescriptLibPath;

	const host = new CompilerHost(inputPath, outputPath, modules);
	const program = ts.createProgram(files, {
		allowJs: true,
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ES2015,
		baseUrl: inputPath,
		outDir: outputPath,
	}, host);

	let emitResult = program.emit(undefined, undefined, undefined, undefined, {
		after: [
			createImportsTransformer(inputPath, outputPath, modules),
		],
		afterDeclarations: [
			createImportsTransformer(inputPath, outputPath, modules),
		],
	});

	let allDiagnostics = ts
		.getPreEmitDiagnostics(program)
		.concat(emitResult.diagnostics);

	allDiagnostics.forEach((diagnostic: ts.Diagnostic) => {
		if (diagnostic.file) {
			let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
			let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
			console.warn(`\x1b[2m\x1b[33m${moduleName}\x1b[0m ${path.relative(inputPath, diagnostic.file.fileName).replace(/\\/gi, "/")} (${line + 1},${character + 1}): ${message}`);
		} else {
			console.warn(`\x1b[2m\x1b[33m${moduleName}\x1b[0m ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
		}
	});

	return !emitResult.emitSkipped;
}

/**
 * This function transpiles a TSM module into a cross-compatible bundled ESM
 * module, alongside a DTS file and sourcemap. The resulting module will not
 * contain any further import statements, thus being compatible in most
 * environments.
 */
export async function transpileEsmBundle(inputPath: string, outputPath: string) {
	inputPath = path.resolve(inputPath);
	outputPath = path.resolve(outputPath);

	let moduleName = path.basename(inputPath);
	let tsOutputPath = path.join(path.resolve(".tsm_tmp"), encodeURIComponent(inputPath));
	let success = await transpileEsm(inputPath, tsOutputPath);

	if (!success) {
		rimraf.sync(tsOutputPath);
		console.info(`\x1b[2m\x1b[31m${moduleName}\x1b[0m failure`);
		return;
	}

	let bundle = await rollup.rollup({
		input: path.join(tsOutputPath, "mod.js"),
	});

	await bundle.write({
		format: "esm",
		file: outputPath,
	});

	rimraf.sync(tsOutputPath);
	console.info(`\x1b[2m\x1b[32m${moduleName}\x1b[0m success`);

	// webpack({
	// 	mode: "development",
	// 	entry: path.join(tsOutputPath, "mod.js"),
	// 	output: {
	// 		path: path.dirname(outputPath),
	// 		filename: path.basename(outputPath),
	// 		library: "module",
	// 		libraryTarget: "var",
	// 	},
	// 	plugins: [
	// 		new EsmWebpackPlugin(),
	// 	],
	// }, (err: any, stats: any) => {
	// 	rimraf.sync(tsOutputPath);

	// 	if (err || stats.hasErrors()) {
	// 		console.error("ERROR DURING WEBPACK BUNDLING PROCESS!");
	// 		console.error(err);
	// 		console.info(`\x1b[2m\x1b[31m${moduleName}\x1b[0m failure`);
	// 		throw err;
	// 	} else {
	// 		console.info(`\x1b[2m\x1b[32m${moduleName}\x1b[0m success`);
	// 	}
	// });
}

export async function transpileEsmBundleAndAlsoCommonJS(inputPath: string, esmOutputPath: string, cjsOutputPath: string) {
	inputPath = path.resolve(inputPath);
	let outputPath = path.resolve(esmOutputPath);

	let moduleName = path.basename(inputPath);
	let tsOutputPath = path.join(path.resolve(".tsm_tmp"), encodeURIComponent(inputPath));
	let success = await transpileEsm(inputPath, tsOutputPath);

	if (!success) {
		rimraf.sync(tsOutputPath);
		console.info(`\x1b[2m\x1b[31m${moduleName}\x1b[0m failure`);
		return;
	}

	let bundle = await rollup.rollup({
		input: path.join(tsOutputPath, "mod.js"),
	});

	await bundle.write({
		format: "esm",
		file: esmOutputPath,
	});

	await bundle.write({
		format: "cjs",
		file: cjsOutputPath,
	});

	rimraf.sync(tsOutputPath);
	console.info(`\x1b[2m\x1b[32m${moduleName}\x1b[0m success`);
}
