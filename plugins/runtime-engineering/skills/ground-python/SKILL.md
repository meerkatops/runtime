---
name: ground-python
description: Grounds every Python claim in Python's own documentation, the Packaging Authority's and each library's own, read this session, and holds their facts, each with its page, in its references and the starting files in its assets. Use for any claim about the language, the standard library, typing, packaging, environments, asyncio, threads, a model, array or dataframe library, or what a release changed, and before a new Python repo's first file.
---

# ground-python

Base every Python claim on a page read in this session, and write its URL beside the claim.

1. Read what we run first: `python3 --version`, `requires-python` and `[build-system]` in the repo's `pyproject.toml`, and the environment tool its README names.
2. Read the language and standard library at `https://docs.python.org/<repo's version>/`, and date a feature from that version's What's New there.
3. Read the style guide, https://peps.python.org/pep-0008/, the typing specification, https://typing.python.org/en/latest/, a proposal at `https://peps.python.org/pep-<number>/`, and packaging at https://packaging.python.org/en/latest/. Read a third-party library on its own documentation, at the version the repo pins.
4. Read a page with WebFetch or curl; before citing a page it links, fetch that page by its own URL.

## Where the facts live

Read each with the Read tool. The rules we add to them are /coding-rulebook's Python section; a new repo's settings are `start.md`'s; Parquet is /ground-parquet's.

- `${CLAUDE_SKILL_DIR}/references/sources.md`: the pages our claims rest on, by question.
- `${CLAUDE_SKILL_DIR}/references/start.md`: what a new repo settles before its first file, and the traps the pages name.
- `${CLAUDE_SKILL_DIR}/references/rules.md`: what the pages say about writing Python, each line with its page.
- `${CLAUDE_SKILL_DIR}/assets/README.md`: the starting `pyproject.toml` and the layout to create beside it.
- `${CLAUDE_SKILL_DIR}/references/freshness.json`: facts to re-check by hand against their pages.
