---
name: ground-react
description: Grounds every React, Next.js, CSS and Material UI claim in their own documentation, read this session, and holds their facts, each with its page, and a starting app. Use for any claim about components, Hooks, Server Components, caching, CSS, theming, accessibility, component or browser tests or a release, and before a new front end's first file.
---

# ground-react

Base every front-end claim on a page read this session, its URL beside the claim. TypeScript, Node.js and `node --test` claims are /ground-typescript's.

1. Read what the repo runs: package.json, tsconfig, the Next.js or Vite config and the token file (the CSS file of theme custom properties). A new front end takes them from `${CLAUDE_SKILL_DIR}/assets/`, not /ground-typescript's starting files.
2. Read React, Next.js and Material UI at https://react.dev/llms.txt, https://nextjs.org/docs/llms.txt and https://mui.com/material-ui/llms.txt, for the major the repo runs: a listed page is Markdown at its URL plus `.md`.
3. Read CSS, accessibility and performance at the sites `sources.md` names, with WebFetch or curl.

Read with the Read tool:

- `${CLAUDE_SKILL_DIR}/references/sources.md`: the pages, by question.
- `${CLAUDE_SKILL_DIR}/references/start.md`: a new front end's decisions and traps.
- `${CLAUDE_SKILL_DIR}/references/rules.md`: how each behaves.
- `${CLAUDE_SKILL_DIR}/assets/README.md`: the starting app.
- `${CLAUDE_SKILL_DIR}/references/freshness.json`: facts to re-check.
