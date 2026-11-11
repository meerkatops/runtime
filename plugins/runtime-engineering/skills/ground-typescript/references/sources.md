# Sources: the TypeScript and Node.js pages our claims rest on

Read each page live, one fetch per page. Node's pages are Markdown at `https://nodejs.org/docs/latest-v<major>.x/api/<page>.md`, listed at https://nodejs.org/llms.txt; put the repo's major in place of `24`. TypeScript has no index file; the handbook's left rail links every page.

## Versions and what changed

- https://devblogs.microsoft.com/typescript/ — each release's announcement, newest first; the native compiler's status.
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html — the transition release: strict on by default, `types` empty by default, `#/` subpath imports.
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html — `import defer`, `--module node20`.
- https://nodejs.org/en/blog/release/v24.0.0 — the Node 24 release.
- https://nodejs.org/docs/latest-v24.x/api/typescript.md — type stripping: what is stripped, what is refused, the recommended tsconfig.

## Types

- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html — primitives, unions, literals, assertions, `!`, `any`.
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html — `typeof`, `in`, `instanceof`, predicates, discriminated unions, `never`.
- https://www.typescriptlang.org/docs/handbook/2/functions.html — generics rules, overloads, `void`, `unknown`, `never`.
- https://www.typescriptlang.org/docs/handbook/2/objects.html — optional and readonly properties, index signatures, excess property checks, `extends` against `&`.
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html — keyof, indexed access, conditional, mapped and template literal types.
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html — `satisfies`.
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html — declaration rules: lowercase primitives, callbacks, overload order.

## Modules and configuration

- https://www.typescriptlang.org/docs/handbook/modules/theory.html — the host decides the format.
- https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html — the recommended tsconfig per host.
- https://www.typescriptlang.org/docs/handbook/modules/reference.html — how each `moduleResolution` resolves: package.json `exports`, `imports` and self-name imports, and the `outDir` to `rootDir` mapping for the local package.
- https://www.typescriptlang.org/tsconfig/ — every option at its own anchor.
- https://www.typescriptlang.org/docs/handbook/project-references.html — layering a repo with `composite` and `tsc --build`.
- https://github.com/microsoft/TypeScript/wiki/Performance — what slows checking and what to do.
- https://nodejs.org/docs/latest-v24.x/api/esm.md — ESM in Node: specifiers, `import.meta`, JSON, top-level await.
- https://nodejs.org/docs/latest-v24.x/api/packages.md — `type`, `exports`, `imports`, conditions.

## Running, testing, errors

- https://nodejs.org/docs/latest-v24.x/api/test.md — the test runner, discovery, isolation, mocking, coverage.
- https://nodejs.org/docs/latest-v24.x/api/errors.md — error classes, `code`, `cause`.
- https://nodejs.org/docs/latest-v24.x/api/process.md — exit codes, unhandled rejections, `exitCode`.
- https://nodejs.org/docs/latest-v24.x/api/util.md — `parseArgs`, `styleText`, `inspect`.
- https://nodejs.org/docs/latest-v24.x/api/fs.md — the promises API, `realpath`.

## The gate's tools

Third party; the commands the gate runs are in the coding-rulebook's TypeScript tool gate.

- https://eslint.org/docs/latest/use/configure/configuration-files — the flat config file and `defineConfig`.
- https://typescript-eslint.io/getting-started/typed-linting/ and https://typescript-eslint.io/packages/parser/ — typed linting, `projectService`, `allowDefaultProject`.
- https://typescript-eslint.io/users/configs/ and https://typescript-eslint.io/users/dependency-versions/ — the shared configs and which are stable; the TypeScript, ESLint and Node ranges supported.
- https://github.com/un-ts/eslint-plugin-import-x/blob/master/README.md and https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-cycle.md — the import plugin for flat config and ESLint 10, its resolver settings, and the no-cycle rule.
