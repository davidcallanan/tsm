# TSM - TypeScript modules

Warning:

---

**THIS IS BETA SOFTWARE -- Very subject to change!**

Don't expect things to work, it's been over a year since I last tested this code.

I am not even giving this a version number for now or uploading it to a registry.

---

**Information**

This is a new modernized JavaScript and TypeScript module format, which can be transpiled to various other formats where necessary. Particularly, this transpilation is needed in the outer layers of an application when one decides to integrate the code with a particular runtime environment (such as Node, Deno, Web, and React Native).

## Motivation

Modulerization still sucks in 2022, especially across different environments.

## File imports

File imports end with a `.js` or `.ts` extension. Absolute imports are relative to the base path in the current context. Relative `./` imports are currently forbidden.

Examples:

 - `import { foo } from "bar/baz.ts"`
 - `import { spam } from "ham/eggs.js"`

If the base path is `$BASE_PATH`, the examples refer to the following files respectively:

 - `$BASE_PATH/bar/baz.ts`
 - `$BASE_PATH/ham/eggs.js`

## Module imports

Module imports signify a module boundary and establish a new context within the imported module. Module imports are achieved by importing a directory (which may be a symlink).

Examples:

 - `import { Component } from "mods/react"`
 - `import type { TunaService } from "mods/bacon"`

Absolute imports are once again relative to the base path in the current context, and relative `./` imports are forbidden. The base path in the newly established context is the directory being imported.

The actual file being imported is `mod.ts` in the respective directory. The examples above refer to the following files:

 - `$BASE_URL/mods/react/mod.ts`
 - `$BASE_URL/mods/bacon/mod.ts`

## Dependency management

This module system does not incorporate any magical dependency resolution mechanism.

A module is simply a directory, and it is up to you to populate this directory however you please.

The preferred method is generally to use a symlinked directory to avoid duplicate installations of a module on a given device.

Examples: You could include a module's source code directly in your project, you could use git submodules, you could symlink to a global store on your device, you could symlink to modules in a monorepo, you could use an existing package manager to automatically retrieve module source code, etc.

Note: If you are a git user, you'll need to enable the symlinks option in git if you want to keep any symlinks intact (which is likely in monorepos where there is no automated linking step).

You can import interface-only modules using the `import type` statement to get type information.

Dependency injection and factory functions are generally recommended to resolve implementations at runtime.

However, you can use module imports to directly depend on a bare concrete implementation (raw code). Bare implementations will then require dependencies to be injected if any external communication is needed. For modules where you import a bare concrete implementation directly, you can expect code and instance duplication if used in multiple places throughout your codebase. Often times these are internal modules for organisation purposes and therefore such duplication is limited. The option for dependency injection is always open to circumvent this.

## Environment

An empty environment will be provided to modules, that is, there will be no global variables other than the built-in JavaScript features defined in the ECMAScript standard. These include, for example, the mathematical built-ins such as `Math.PI`. (You may be able to bypass this using TypeScript but it is not recommended).

To gain access to functions that perform external communication, dependency injection is your friend. To abstract away implementation details, factory functions are your friend. In other words, all dependency management is done with code; there is no magical solution baked into the module system. Use dependency injection and factory function techniques where appropriate to obtain implementations.

## Transpilation

The JavaScript ecosystem is a mess, and transpilation is common practice to get your TypeScript and JavaScript in a format that is compatible with your specific environment.

This repo will include tools for transpiling TSM modules to various formats, and you can gain access to additional formats by using other tools that transpile further if necessary.

## Usage of Transpiler

Copy and paste the `transpile` package into your project.

See `transpilation_example.js`, which will transpile all tsm modules from a `packages` folder into `packages.esm`. This is an example of what you might do in a monorepo.

Better examples coming soon!

Example packages coming soon as well.

## Contributing

This project uses `pnpm ^4.14.4` and `node ^14.3.0`.

TODO: upgrade to `pnpm ^6.27.1` and `node ^17.2.0`.

Currently using old versions because this project was in use a long time ago for an old codebase of mine.

## TODO

 - Implementation vs interface modules
 - Flat modules like Go (no imports between files)
 - Documentation generation
 - Linting and formatting
 - Provide compiler errors
 - Sourcemaps 
 - Documentation
 - Command-Line Interface

## License

See `LICENSE` file for details.
