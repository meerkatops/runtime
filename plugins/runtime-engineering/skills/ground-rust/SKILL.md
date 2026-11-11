---
name: ground-rust
description: Grounds every Rust claim in Rust's own documentation, read this session, and holds Rust's facts, each with its page, in its references and the starting files in its assets. Use for any claim about crates, Cargo, editions, ownership, errors, tests, WebAssembly or performance, and before a new Rust repo's first file.
---

# ground-rust

Base every Rust claim on a page read in this session, and write its URL beside the claim.

1. Read what we run first: `rustc --version`, and `edition`, `rust-version` and `[workspace]` in the repo's `Cargo.toml`.
2. Read the language at https://doc.rust-lang.org/: the book, the reference, the standard library, the Cargo book, the edition guide, Clippy and rustdoc, each with its own index. Read the API guidelines at https://rust-lang.github.io/api-guidelines/checklist.html and WebAssembly bindings at https://wasm-bindgen.github.io/wasm-bindgen/.
3. Date a feature from the release posts at https://blog.rust-lang.org/.
4. Read a page with WebFetch or curl; before citing a page it links, fetch that page by its own URL.

## Where the facts live

Read each with the Read tool. The rules we add to them are /coding-rulebook's Rust section; a new repo's settings are `start.md`'s; Parquet is /ground-parquet's.

- `${CLAUDE_SKILL_DIR}/references/sources.md`: the pages our claims rest on, by question.
- `${CLAUDE_SKILL_DIR}/references/start.md`: what a new repo settles before its first file, and the WebAssembly boundary.
- `${CLAUDE_SKILL_DIR}/references/rules.md`: what Rust's pages say about writing it and where builds live, each line with its page.
- `${CLAUDE_SKILL_DIR}/assets/README.md`: the starting files, copied into a new repo, the shared-homes catalog schema among them; `node ${CLAUDE_SKILL_DIR}/scripts/standard-check.mjs <repo>` holds a repo to them.
- `${CLAUDE_SKILL_DIR}/references/freshness.json`: facts to re-check by hand against their pages.
