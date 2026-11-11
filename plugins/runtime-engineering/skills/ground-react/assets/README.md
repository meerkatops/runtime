# Starting app

A Next.js App Router app with Material UI themed from one token file, copied into a new repo and then edited for the repo's name. Each choice is explained in [start](../references/start.md). The app passes its own gate as copied: type check, lint, token check, component tests, build and a browser flow.

Rename `gitignore` to `.gitignore`. Run `npm install` once to write `package-lock.json`, commit it, and install with `npm ci` from then on. `npm run e2e:install` fetches the browser the flow test drives, with the Playwright the repo installed. Delete `vite/` unless the app is a page with no server.

## The files

- `package.json`: the scripts the coding-rulebook's React tool gate runs (`typecheck`, `lint`, `check:tokens`, `test`, `build`, `e2e`) and every dependency pinned to an exact version. `overrides` lets three lint plugins install beside ESLint 10, which they do not yet list as a peer.
- `tsconfig.json`: ground-typescript's strict flags, set for a bundler, with `skipLibCheck: true` as the rulebook's X21 allows.
- `next.config.ts`: Cache Components with partial prefetching, typed routes, and the Content Security Policy header, sent without a nonce.
- `eslint.config.mjs`: the lint step's config.
- `app/tokens.css`: the one theme source, light by default and dark by the system setting. Its values are placeholders: put the design system's in their place.
- `app/global.css`: element defaults; it ends motion for a person who asked for less.
- `app/theme.ts`: the Material UI theme. Its palette, its spacing and its corner radius each name a token.
- `app/layout.tsx`, `app/page.tsx`: the root layout with its providers, and a page that is a Server Component.
- `components/counter.tsx`, `components/counter.test.tsx`: a Client Component and its test, the pattern for each component after it.
- `lib/data/`: the data layer, server only. `notice.ts` reads the notice with `"use cache"` and a `cacheLife`, and writes it only after it has checked the caller and the text; a JSON file, `data/notice.json`, stands in for the repo's store. `caller.ts` says who is calling: no sign-in ships, so it answers nobody and every write is refused until the repo's sign-in is wired in there.
- `components/notice.tsx`: an async Server Component that awaits the notice, under the page's `<Suspense>`.
- `app/actions.ts`, `components/notice-form.tsx`, `components/notice-form.test.tsx`: a Server Function and the form that submits to it through `useActionState`, the pattern for each mutation after it.
- `lib/result.ts`, `lib/notice.ts`: the result type an expected failure is returned in, and the notice's shapes, shared by the server and the browser.
- `app/error.tsx`, `app/global-error.tsx`: the error pages, each reporting what it catches.
- `instrumentation.ts`, `instrumentation-node.ts`, `instrumentation-client.ts`, `app/api/crash/route.ts`, `lib/crash-record.ts`, `lib/report-crash.ts`, `lib/write-crash-record.ts`: the crash record, from the server and from the browser. Every report is redacted and held to one size; the route refuses a post from another site.
- `tools/check-tokens.mjs`, `tools/check-tokens.test.ts`: refuses a color literal outside the token file, in any source folder, and the test that plants each kind.
- `vitest.config.mts`, `vitest.setup.ts`: the component test runner. The config is `.mts` because Vite loads it as an ES module.
- `playwright.config.ts`, `e2e/smoke.spec.ts`: the flow test, run against the production build on a port of its own, at a desktop width and at the phone width the rulebook's X13 sets.
- `vite/eslint.config.mjs`: the lint config for a page with no server.

## An app without Material UI

Remove the `@mui` and `@emotion` packages, `app/theme.ts` and the three providers in `app/layout.tsx`, and style each component with a CSS Module beside it (`counter.module.css`) whose values are the tokens: `color: var(--color-text)`, `padding: calc(2 * var(--space-unit))`. Keep `app/tokens.css`, `app/global.css`, the token check and everything else.

## A page with no server

A page embedded in another host is built with Vite in place of Next.js. What changes:

- Remove `next`, `@mui/material-nextjs` and `eslint-config-next` from `package.json`, with the `eslint-plugin-import` override. Add `eslint-plugin-react` 7.37.5 and `eslint-plugin-react-hooks` 7.1.1 to `devDependencies`: `eslint-config-next` brought them. Set the scripts `dev` to `vite`, `build` to `vite build`, `start` to `vite preview` and `typecheck` to `tsc --noEmit -p tsconfig.json`.
- Move `vite/eslint.config.mjs` over `eslint.config.mjs`. It registers the React, React Hooks, jsx-a11y and import-x plugins itself and keeps every other rule.
- In `tsconfig.json`, remove the `next` plugin and the `.next` entries of `include`, and add `"vite/client"` to `types`.
- Remove what needs a server: `next.config.ts`, the three `instrumentation` files, `lib/data/`, `data/`, `lib/write-crash-record.ts` and, in `app/`, the layout, the pages, `actions.ts` and `api/`. Remove `components/notice.tsx` too, since it reads `lib/data/`; a page with no server gets its data from the host's API instead. Keep `app/tokens.css`, `app/global.css` and `app/theme.ts`, the other components, the token check and the component tests.
- In `e2e/smoke.spec.ts`, keep the home page and transition tests and remove the two that need the server: the notice read on the server, and the crash endpoint. A flow that calls the host's API is tested against the host.
- Add `index.html` and an entry file that calls `createRoot` with `onUncaughtError` and `onCaughtError`, each passing the error to `reportCrash`; `lib/report-crash.ts` then names the host's endpoint, as the rulebook's Crash record in React says. The entry file wraps the app in `ThemeProvider` and `CssBaseline`, with no `AppRouterCacheProvider`.
- In `playwright.config.ts`, the `webServer` command becomes `npm run start -- --port 3217 --strictPort`.
- The host sends the Content Security Policy; Vite's page on it is https://vite.dev/guide/features.html#content-security-policy-csp. The home page test checks the policy header, so in `vite.config.ts` set `preview.headers` to the host's policy (https://vite.dev/config/preview-options#preview-headers), or move that check to a test against the host.
