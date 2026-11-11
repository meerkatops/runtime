# Decide at the start

What a new TypeScript repo settles before its first file. Each answer goes in `package.json`, `tsconfig.json` and `eslint.config.js`, so a builder never has to choose. Each line names the page that says why.

| Decision | Our answer | Page |
|---|---|---|
| Strictness | `"strict": true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUncheckedSideEffectImports` | https://www.typescriptlang.org/tsconfig/ |
| Module format, Node | `"module": "nodenext"`, `"type": "module"` in package.json, `verbatimModuleSyntax` | https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html |
| Module format, bundled pages | `"module": "esnext"`, `"moduleResolution": "bundler"`, `noEmit`, no `"type": "module"`. A React front end takes its whole tsconfig from the ground-react skill's starting files, not from these | same page |
| Erasable syntax | `erasableSyntaxOnly`: no enums, runtime namespaces, parameter properties or `import =` | https://www.typescriptlang.org/tsconfig/ and https://nodejs.org/docs/latest-v24.x/api/typescript.md |
| Run vs check vs ship | Node strips types to run scripts and tests; `tsc --noEmit` checks; `tsc` or the bundler emits what ships, with `rewriteRelativeImportExtensions` | https://nodejs.org/docs/latest-v24.x/api/typescript.md |
| Ambient types | `"types": ["node"]` named, since the default is empty | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html |
| Package face | `exports` with conditions most specific first and `types` first of all; `imports` with `#` for internal aliases; no `paths`. An `imports` target names the emitted file (`"#lib/*.js": { "source": "./src/lib/*.ts", "default": "./dist/lib/*.js" }`): the built package resolves `default` into `dist`, `tsc` maps that path from `outDir` back to `rootDir` to find the source, which needs both set, and `node --conditions=source` runs tests and scripts from `src` before any build | https://nodejs.org/docs/latest-v24.x/api/packages.md and https://www.typescriptlang.org/docs/handbook/modules/reference.html |
| Library output | `declaration`, `rootDir`, `outDir`, lowest supported `target` | https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html |
| Tests | `node --conditions=source --test` as the `test` script; files `*.test.ts` beside the code; every subtest awaited; process isolation | https://nodejs.org/docs/latest-v24.x/api/test.md |
| Lint | ESLint flat config in `eslint.config.js`, extending typescript-eslint's `strictTypeChecked` with `parserOptions.projectService`; a file outside the tsconfig, the config file itself, is named in `allowDefaultProject`. `import-x/no-cycle` from eslint-plugin-import-x refuses a circular import, with its settings naming `.ts` and the `source` condition so it follows source files. Which rules are on is the coding-rulebook's TypeScript tool gate | https://eslint.org/docs/latest/use/configure/configuration-files, https://typescript-eslint.io/getting-started/typed-linting/, https://typescript-eslint.io/packages/parser/ and https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-cycle.md |
| Development tools | `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-import-x` and `@types/node` pinned to exact versions in `devDependencies`: eslint-plugin-import-x is the import plugin whose peer range reaches ESLint 10 (eslint-plugin-import's stops at 9); `strict-type-checked` may change its rules outside a major version, and typescript-eslint supports TypeScript `>=4.8.4 <6.1.0`, so `typescript` stays on 6.0 until that range moves; `@types/node` is pinned on the line of the Node major in `engines`, our choice | https://typescript-eslint.io/users/configs/, https://typescript-eslint.io/users/dependency-versions/, https://github.com/un-ts/eslint-plugin-import-x/blob/master/README.md and https://docs.npmjs.com/cli/v11/configuring-npm/package-json |
| Errors | `Error` subclasses with a stable `code`, `new Error(msg, { cause })`, `useUnknownInCatchVariables` | https://nodejs.org/docs/latest-v24.x/api/errors.md and https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html |
| Exit | set `process.exitCode`; an unhandled rejection is an uncaught exception | https://nodejs.org/docs/latest-v24.x/api/process.md |
| JSON | `import x from "./x.json" with { type: "json" }` | https://nodejs.org/docs/latest-v24.x/api/esm.md |
| Paths | `import.meta.dirname` and `import.meta.filename`; `module.createRequire` where CommonJS is unavoidable | https://nodejs.org/docs/latest-v24.x/api/esm.md |

## Traps the pages name

- Without `verbatimModuleSyntax`, a type imported without `type` passes `tsc` and fails at run time under type stripping; the starting tsconfig sets it, which makes `tsc` match Node.js here. https://nodejs.org/docs/latest-v24.x/api/typescript.md and https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax
- An extensionless relative import fails in Node ESM; `bundler` resolution allows it and spreads. https://nodejs.org/docs/latest-v24.x/api/esm.md
- An excess property error is a real bug; an `as` cast hides it. https://www.typescriptlang.org/docs/handbook/2/objects.html
- `skipLibCheck` hides misconfiguration. https://github.com/microsoft/TypeScript/wiki/Performance
- `error.message` may change between Node versions; `code` does not. https://nodejs.org/docs/latest-v24.x/api/errors.md
- `'uncaughtException'` is not a place to resume from. https://nodejs.org/docs/latest-v24.x/api/process.md
- Unions past a dozen members and unnamed conditional types slow checking. https://github.com/microsoft/TypeScript/wiki/Performance
- `typeof null` is `"object"`; truthiness skips `""` and `0`. https://www.typescriptlang.org/docs/handbook/2/narrowing.html
