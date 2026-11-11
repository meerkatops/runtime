---
name: ground-typescript
description: Grounds every TypeScript and Node.js claim in their own documentation, read this session, and holds their facts, each with its page, in its references and the starting files in its assets. Use for any claim about a compiler option, a module format, a type, an error, `node --test`, a package's exports or what a release changed, and before a new Node.js TypeScript repo's first file.
---

# ground-typescript

Base every TypeScript and Node.js claim on a page read in this session, and write its URL beside the claim. React, Next.js, CSS and Material UI claims are /ground-react's; a TypeScript claim about a `.tsx` file stays here.

1. Read what we run first: `node --version`, the `engines` and `typescript` entries in the repo's package.json, and its tsconfig; a new repo takes them from the starting files, a new front end from /ground-react's assets.
2. Read TypeScript at https://www.typescriptlang.org/docs/handbook/intro.html, and the TSConfig reference, https://www.typescriptlang.org/tsconfig/. Date a feature from the release notes linked on the handbook and https://devblogs.microsoft.com/typescript/.
3. Read Node.js through its index, https://nodejs.org/llms.txt, which links every API page as Markdown at `https://nodejs.org/docs/latest-v<major>.x/api/<page>.md`, for the major the repo runs.
4. Use WebFetch or curl; before citing a page it links, fetch that page by its own URL.

## Where the facts live

Read each with Read. The rules we add to them are /coding-rulebook's `typescript.md`; Parquet is /ground-parquet's.

- `${CLAUDE_SKILL_DIR}/references/sources.md`: the pages our claims rest on, by question.
- `${CLAUDE_SKILL_DIR}/references/start.md`: what a new repo settles, and the traps.
- `${CLAUDE_SKILL_DIR}/references/rules.md`: what the pages say about writing TypeScript.
- `${CLAUDE_SKILL_DIR}/assets/README.md`: the starting files.
- `${CLAUDE_SKILL_DIR}/references/freshness.json`: facts to re-check by hand.
