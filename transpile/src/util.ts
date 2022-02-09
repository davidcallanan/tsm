import * as fs from "fs";
import * as path from "path";

export function findBasePath(modules: Set<string>, file: string) {
	let dir = path.normalize(path.dirname(file));
	let segments = dir.split(path.sep);

	while (true) {
		let pathCandidate = segments.join(path.sep);
		if (modules.has(pathCandidate)) {
			return pathCandidate;
		} else {
			segments.pop();
		}
	}
}

export function resolveImport(modules: Set<string>, importPath: string, containingFile: string) {
	importPath = importPath.replace(/\//gi, path.sep);

	if (path.normalize(importPath) != importPath) {
		console.error(`Paths containing relative dots [".", ".."] are not allowed: "${importPath}".`);
		return null;
	}

	// TODO: prevent importing files across module boundary, including mod.ts
	
	let basePath = findBasePath(modules, containingFile);
	let modulePath = path.join(basePath, importPath);
	let moduleStats = fs.statSync(modulePath);
	let isModule = moduleStats.isDirectory();

	// Containing module check - ensures imported item is within current module and not a submodule.
	if (basePath != findBasePath(modules, modulePath)) {
		console.error(`A file or module being imported must be within your own module and not a submodule: "${importPath}".`);
		if (importPath.endsWith("/mod.ts")) {
			console.error(`Try remove "/mod.ts" from the end of the import.`);
		}
		return null;
	}

	if (isModule) {
		// Import as module
		return path.join(modulePath, "mod.ts");
	} else {
		// Import as file
		return modulePath;
	}
}
