import * as path from "path";
import ts from "typescript";

import { resolveImport } from "./util.js";

export function createImportsTransformer(inputPath: string, outputPath: string, modules: Set<string>): ts.TransformerFactory<ts.SourceFile> {
	return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
		return (sourceFile: ts.SourceFile) => {
			return ts.visitNode(sourceFile, createSourceFileImportsTransformer(ctx, sourceFile, inputPath, outputPath, modules));
		};
	};
}

function createSourceFileImportsTransformer(ctx: ts.TransformationContext, sourceFile: ts.SourceFile, inputPath: string, outputPath: string, modules: Set<string>) {
	let transformer = (node: any): ts.Node => {
		if (isStaticImport(node)) {
			const quotedImportPath = node.moduleSpecifier.getText(sourceFile)
			let importPath = quotedImportPath.substring(1, quotedImportPath.length - 1);
			let newImportPath = rewriteImportPath(modules, importPath, sourceFile.fileName, inputPath);
			let newNode = ts.getMutableClone(node);
			newNode.moduleSpecifier = ts.createLiteral(newImportPath);
			return newNode;
		} else if (isDynamicImport(node)) {
			const quotedImportPath = node.arguments[0].getText(sourceFile)
			let importPath = quotedImportPath.substring(1, quotedImportPath.length - 1);
			let newImportPath = rewriteImportPath(modules, importPath, sourceFile.fileName, inputPath);
			let newNode = ts.getMutableClone(node);
			newNode.arguments = ts.createNodeArray([ts.createStringLiteral(newImportPath)]);
			return newNode;
		}

		return ts.visitEachChild(node, transformer, ctx);
	};

	return transformer;
}

function rewriteImportPath(modules: Set<string>, importPath: string, containingFile: string, inputPath: string) {
	let modulePath = resolveImport(modules, importPath, containingFile);
	if (!modulePath) modulePath = importPath;
	let rewrittenImportPath = "./" + path.relative(path.dirname(containingFile), modulePath).replace(/\\/gi, "/");
	rewrittenImportPath = rewrittenImportPath.substring(0, rewrittenImportPath.length - 3) + ".js";
	return rewrittenImportPath;
}

function isStaticImport(node: ts.Node) {
	return true
		&& (false
			|| ts.isImportDeclaration(node)
			|| ts.isExportDeclaration(node)
		)
		&& node.moduleSpecifier
	;
}

function isDynamicImport(node: ts.Node) {
	return true
		&& ts.isCallExpression(node)
		&& node.expression.kind === ts.SyntaxKind.ImportKeyword
}
