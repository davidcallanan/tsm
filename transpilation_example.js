import { transpileEsmBundleAndAlsoCommonJS } from "tsm-transpile";
import fs from "fs";
import path from "path";
import glob from "glob-promise";

let packages = await glob(path.resolve("packages") + "/*");
!fs.existsSync(path.resolve("packages.esm")) && fs.mkdirSync(path.resolve("packages.esm"));

for (let pkg of packages) {
	(async () => {
		let packageName = path.relative(path.resolve("packages"), pkg)
		let outputDir = path.join(path.resolve("packages.esm"), packageName);
		let packageDotJson = {
			name: "@-/" + packageName,
			version: "0.0.1",
			main: "index.js",
			module: "index.mjs"
		};

		!fs.existsSync(outputDir) && fs.mkdirSync(outputDir);
		fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify(packageDotJson, null, "\t"));
		
		try {
			await transpileEsmBundleAndAlsoCommonJS(pkg, path.join(outputDir, "index.mjs"), path.join(outputDir, "index.js"));
		} catch(e) {
			console.error(e);
			console.log("ERROR COMPILING: " + packageName);
			console.log("Best thing to do is double-check that your imports are done correctly.");
		}
	})();
}
