# Sources: the pages our front-end claims rest on

Read each page live, one fetch per page. React, Next.js and Material UI each publish an index of every page (https://react.dev/llms.txt, https://nextjs.org/docs/llms.txt, https://mui.com/material-ui/llms.txt), and each page is Markdown at its URL with `.md` added. MDN, the W3C, web.dev, Testing Library and Playwright have no such index; fetch the page itself.

## Versions and what changed

- https://nextjs.org/docs/app/guides/upgrading/version-16 — the Next.js 16 changes: Node.js and TypeScript minimums, Turbopack by default, `proxy`, async request APIs.
- https://nextjs.org/docs/app/getting-started/installation — what `create-next-app` sets up and its defaults; supported browsers.
- https://react.dev/blog — each React release's announcement, newest first.
- https://mui.com/material-ui/migration/upgrade-to-v9/ and https://mui.com/material-ui/migration/upgrade-to-v7/ — what each Material UI major changed.

## React

- https://react.dev/reference/rules, https://react.dev/reference/rules/rules-of-hooks — the Rules of React.
- https://react.dev/learn/you-might-not-need-an-effect — when an Effect is wrong and what to write instead.
- https://react.dev/learn/choosing-the-state-structure, https://react.dev/learn/sharing-state-between-components, https://react.dev/learn/thinking-in-react — what is state and where it lives.
- https://react.dev/learn/rendering-lists — keys.
- https://react.dev/reference/react/useActionState, https://react.dev/reference/react/Suspense, https://react.dev/reference/react/use — forms, loading and reading a promise.
- https://react.dev/reference/react/Component — error boundaries.
- https://react.dev/reference/react-dom/client/createRoot — the root's error callbacks.
- https://react.dev/reference/react-dom/components/common — props every element takes: `dangerouslySetInnerHTML`, `style`, `aria-*`.
- https://react.dev/reference/rsc/use-client, https://react.dev/reference/rsc/use-server, https://react.dev/reference/rsc/server-components — the two directives and Server Components.
- https://react.dev/learn/react-compiler/introduction, https://react.dev/learn/react-compiler/installation — the compiler's status and setup.
- https://react.dev/reference/eslint-plugin-react-hooks — the lint rules, one page each.
- https://react.dev/learn/creating-a-react-app, https://react.dev/learn/build-a-react-app-from-scratch — framework or build tool.

## Next.js

- https://nextjs.org/docs/app/getting-started/server-and-client-components and https://nextjs.org/docs/app/guides/server-and-client-boundary — where each component runs.
- https://nextjs.org/docs/app/getting-started/fetching-data, https://nextjs.org/docs/app/getting-started/mutating-data — reading and changing data.
- https://nextjs.org/docs/app/getting-started/caching, https://nextjs.org/docs/app/getting-started/revalidating, https://nextjs.org/docs/app/api-reference/directives/use-cache, https://nextjs.org/docs/app/api-reference/functions/cacheLife, https://nextjs.org/docs/app/api-reference/functions/connection — Cache Components: what is cached, what is prerendered, and how a read is held to its request.
- https://nextjs.org/docs/app/getting-started/error-handling, https://nextjs.org/docs/app/api-reference/file-conventions/error — expected errors, error pages, `retry`, `digest`.
- https://nextjs.org/docs/app/guides/instrumentation, https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation, https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client — code that runs at server start, on a request error and before the browser app starts.
- https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/getting-started/proxy — request handlers and the proxy.
- https://nextjs.org/docs/app/guides/data-security, https://nextjs.org/docs/app/guides/environment-variables, https://nextjs.org/docs/app/guides/content-security-policy — the data layer and the origin check on a Server Action, what reaches the browser, and a Content Security Policy with a nonce and without one.
- https://nextjs.org/docs/app/getting-started/css, https://nextjs.org/docs/app/guides/css-in-js — CSS Modules, global CSS, Tailwind, CSS-in-JS libraries.
- https://nextjs.org/docs/app/getting-started/images, https://nextjs.org/docs/app/getting-started/fonts, https://nextjs.org/docs/app/getting-started/metadata-and-og-images, https://nextjs.org/docs/app/guides/lazy-loading, https://nextjs.org/docs/app/guides/scripts — images, fonts, metadata, lazy loading, third-party scripts.
- https://nextjs.org/docs/app/guides/production-checklist — the list to check before shipping.
- https://nextjs.org/docs/app/api-reference/config/typescript, https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes, https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler, https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents — config options.
- https://nextjs.org/docs/app/guides/building — what `next build` does and prints.

## CSS and the browser

- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties — custom properties.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme, https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme, https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark — light and dark.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts, https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts — layout.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using, https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries — responding to width.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer — cascade layers.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion, https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible — motion and focus.
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat — sending a small report, formatting a number with its unit.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site — where a request came from, as the browser states it.

## Material UI

- https://mui.com/material-ui/getting-started/installation/ — packages and peers.
- https://mui.com/material-ui/integrations/nextjs/ — the App Router setup, fonts, CSS layers.
- https://mui.com/material-ui/customization/theming/, https://mui.com/material-ui/customization/palette/, https://mui.com/material-ui/customization/spacing/ — the theme.
- https://mui.com/material-ui/guides/content-security-policy/ — what its styles need under a Content Security Policy.
- https://mui.com/material-ui/customization/css-theme-variables/overview/, https://mui.com/material-ui/customization/css-theme-variables/usage/, https://mui.com/material-ui/customization/css-theme-variables/configuration/, https://mui.com/material-ui/customization/css-theme-variables/native-color/ — the theme as CSS custom properties.
- https://mui.com/material-ui/customization/dark-mode/ — color schemes and the toggle.
- https://mui.com/material-ui/customization/how-to-customize/, https://mui.com/system/getting-started/the-sx-prop/, https://mui.com/system/styled/ — `sx`, `styled` and theme overrides.
- https://mui.com/material-ui/guides/minimizing-bundle-size/ — import paths.
- https://mui.com/material-ui/getting-started/accessibility/ — conformance, component by component.
- https://mui.com/material-ui/integrations/tailwindcss/tailwindcss-v4/ — what using Tailwind beside it takes.
- https://mui.com/material-ui/guides/testing/ — testing an app that uses it.

## Accessibility and performance

- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA — ARIA and its first rule.
- https://www.w3.org/WAI/WCAG22/Understanding/ — one page per success criterion: contrast-minimum, non-text-contrast, reflow, target-size-minimum, keyboard, focus-visible, name-role-value, labels-or-instructions.
- https://web.dev/learn/accessibility/ — focus, forms and ARIA, taught.
- https://web.dev/articles/vitals, https://web.dev/articles/optimize-lcp, https://web.dev/articles/optimize-cls, https://web.dev/articles/inp — the Core Web Vitals and how to improve each.

## Testing

- https://vitest.dev/guide/, https://vitest.dev/config/environment, https://vitest.dev/config/globals — the runner and its config; Vitest also has an index at https://vitest.dev/llms.txt.
- https://nextjs.org/docs/app/guides/testing/vitest, https://nextjs.org/docs/app/guides/testing/playwright — each tool with Next.js.
- https://testing-library.com/docs/queries/about/, https://testing-library.com/docs/guiding-principles/, https://testing-library.com/docs/user-event/intro/, https://testing-library.com/docs/react-testing-library/setup/ — queries, principles, interactions, setup.
- https://playwright.dev/docs/best-practices, https://playwright.dev/docs/locators, https://playwright.dev/docs/test-webserver, https://playwright.dev/docs/emulation, https://playwright.dev/docs/accessibility-testing — flows in a real browser.

## The gate's tools

Third party; the commands the gate runs are in the coding-rulebook's React tool gate.

- https://nextjs.org/docs/app/api-reference/config/eslint — `eslint-config-next` and the ESLint versions it supports.
- https://eslint.org/docs/latest/use/configure/configuration-files — the flat config file.
- https://typescript-eslint.io/getting-started/typed-linting/ and https://typescript-eslint.io/users/dependency-versions/ — typed linting and the TypeScript range supported.
- https://github.com/jsx-eslint/eslint-plugin-jsx-a11y — the accessibility rules and `flatConfigs.recommended`.
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides — `overrides`, and `$name` to match a direct dependency.
- https://vite.dev/guide/ and https://vite.dev/guide/env-and-mode — Vite, for a page with no server.
- https://github.com/un-ts/eslint-plugin-import-x — `import-x/no-cycle` and the settings that let it read TypeScript.
- https://github.com/jsx-eslint/eslint-plugin-react and https://react.dev/reference/eslint-plugin-react-hooks — the two plugins a Vite app's lint config registers itself.
