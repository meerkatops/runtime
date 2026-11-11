# Starting files

Copied into a new TypeScript repo, then edited for the repo's name and layout. Each setting is explained in [start](../references/start.md).

- `tsconfig.base.json`: the compiler options every layer's `tsconfig.json` extends. A bundled page's tsconfig overrides `module` to `esnext`, `moduleResolution` to `bundler` and sets `noEmit`.
- `tsconfig.json`: one package's config: it extends the base, names `rootDir`, `outDir` and `declaration`, and includes `src`, where the tests sit beside the code.
- `package.json`: the shape of a package's face (`type`, `engines`, `exports`, `imports`), the `typecheck`, `lint`, `test` and `build` scripts (`test` passes `--conditions=source`, so a `#lib` import runs from `src`; the built package resolves it into `dist`), and the pinned `devDependencies` they run, so the coding-rulebook's TypeScript tool gate finds each tool in `node_modules/.bin` from the first commit. Run `npm install` once to write `package-lock.json`, and commit it.
- `eslint.config.js`: the lint step's config, typed linting through the project service with the rules the gate names, `import-x/no-cycle` among them.
