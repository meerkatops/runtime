# What the pages say about writing TypeScript well

Each line names the page that states it. Read the page before relying on the line in a review. The choices we make on top of these pages, for the machine and for agents, are in the TypeScript section of the coding-rulebook skill in this plugin (`runtime-engineering:coding-rulebook`); check TypeScript work against it too.

## Types

- Narrow with `typeof`, `instanceof`, `in` and type predicates; an assertion is removed by the compiler and checks nothing at run time. https://www.typescriptlang.org/docs/handbook/2/everyday-types.html and https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Model each variant as a discriminated union with a literal `kind`, and close its `switch` with a `never` check so a new member fails the build until it is handled. https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- `satisfies T` checks a value against a type without widening the value's own type. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- Default to `readonly T[]` and readonly tuples; `readonly` is shallow. A readonly object property does not change assignability, but a `readonly T[]` or readonly tuple cannot be assigned to its mutable form. https://www.typescriptlang.org/docs/handbook/2/objects.html
- `interface extends` over intersections: a conflict errors instead of becoming `never`, and it checks faster. https://www.typescriptlang.org/docs/handbook/2/objects.html and https://github.com/microsoft/TypeScript/wiki/Performance
- `unknown` for a value whose shape is not known; `any` turns checking off. https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- A non-null `!` is an assertion with no run-time effect; narrow instead. https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Generics: a type parameter appears at least twice, there are as few as possible, and each sits as low as it can. https://www.typescriptlang.org/docs/handbook/2/functions.html
- Overloads: most specific first; prefer a union or an optional parameter to an overload. https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Declarations use lowercase `number`, `string`, `boolean`, `symbol` and `object`; a callback returns `void`, not `any`; a callback's parameters are not optional. https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Write `import type` and `type` specifiers; `verbatimModuleSyntax` keeps what you see as what you get. https://www.typescriptlang.org/tsconfig/

## Modules and packages

- The host decides the module format; TypeScript models the host. Node needs `"type": "module"` and relative specifiers with extensions; a bundler project uses `bundler` resolution and never sets `"type": "module"`. https://www.typescriptlang.org/docs/handbook/modules/theory.html and https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- `exports` encapsulates a package: an unlisted subpath cannot be imported. Conditions go most specific first and `default` last, with `types` first of all. https://nodejs.org/docs/latest-v24.x/api/packages.md
- `imports` with `#` names an internal alias Node resolves; `paths` is for the type checker alone. https://nodejs.org/docs/latest-v24.x/api/packages.md and https://nodejs.org/docs/latest-v24.x/api/typescript.md
- An `imports` or `exports` target names the emitted file, never a source file: `tsc` does not rewrite a `#` specifier, so the emitted JavaScript resolves it as written. For the local package `tsc` maps the target from `outDir` back to `rootDir` to find the input file, so both are set; a custom condition ahead of `default` (`source`, passed as `node --conditions=source`) lets Node run the source before a build. https://www.typescriptlang.org/docs/handbook/modules/reference.html and https://nodejs.org/docs/latest-v24.x/api/packages.md
- `import.meta.dirname` and `import.meta.filename` in place of the CommonJS globals; `module.createRequire` where CommonJS is unavoidable. https://nodejs.org/docs/latest-v24.x/api/esm.md
- JSON imports carry `with { type: "json" }`. https://nodejs.org/docs/latest-v24.x/api/esm.md
- Top-level `await` is allowed in ESM; one that never settles exits with code 13. https://nodejs.org/docs/latest-v24.x/api/esm.md
- A repo with layers uses project references, one `tsconfig.json` per layer with `composite`, built with `tsc --build`. https://www.typescriptlang.org/docs/handbook/project-references.html

## Running and testing

- Node strips types to run `.ts` directly, checks nothing, ignores `tsconfig.json`, and refuses non-erasable syntax; `tsc --noEmit` is the check. https://nodejs.org/docs/latest-v24.x/api/typescript.md
- `node --test` discovers `*.test.ts`; every subtest is awaited; each file runs in its own process by default. https://nodejs.org/docs/latest-v24.x/api/test.md
- Set `process.exitCode` and let the process end; an unhandled rejection is an uncaught exception by default. https://nodejs.org/docs/latest-v24.x/api/process.md
- Read arguments with `util.parseArgs`. https://nodejs.org/docs/latest-v24.x/api/util.md

## Errors

- Subclass `Error`, give each a stable `code`, and chain with `new Error(message, { cause })`; callers identify an error by `code`, never by `message`. https://nodejs.org/docs/latest-v24.x/api/errors.md
- A catch variable is `unknown`; narrow it with `instanceof` before reading it. https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- `'uncaughtException'` is for logging before exit, not for resuming. https://nodejs.org/docs/latest-v24.x/api/process.md

## Checking speed

- Name a conditional type so its result is cached; keep unions under about a dozen members; `interface` over type aliases for object shapes; `skipLibCheck` only to buy speed, knowing it hides misconfiguration. https://github.com/microsoft/TypeScript/wiki/Performance
