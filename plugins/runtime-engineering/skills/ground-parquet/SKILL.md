---
name: ground-parquet
description: Grounds every Apache Parquet claim in the specification and each library's own documentation, read this session. Use whenever code reads or writes Parquet from Rust, TypeScript or Python, before saying Parquet fits a job, and before a project writes its first Parquet file; and for any claim about the file format, its encodings, codecs, types and statistics, partitioning, table formats, GeoParquet, encryption, or the DuckDB, PostgreSQL and BigQuery paths.
---

# ground-parquet

Base every Parquet claim on a page read in this session, and write its URL beside the claim.

1. Read what the project runs: the Parquet library and its version in the manifest, and a real file's footer when one exists (`${CLAUDE_SKILL_DIR}/references/start.md` names the commands).
2. Read the format at https://parquet.apache.org/docs/ and in the specification files of https://github.com/apache/parquet-format.
3. Read a library's behavior and defaults on its own page, for the version the project runs. Check a feature against https://parquet.apache.org/docs/file-format/implementationstatus/ before relying on it across two implementations.
4. Fetch each page and link with WebFetch or curl: a specification file in its raw form, and a DuckDB `stable` URL at the versioned page it forwards to.
5. Say so when no page states a claim; never fill the gap from memory.

## Where the facts live

Read each with the Read tool.

- `${CLAUDE_SKILL_DIR}/references/when.md`: when Parquet fits and when it does not.
- `${CLAUDE_SKILL_DIR}/references/start.md`: what to read in a project, what it settles first, and the traps.
- `${CLAUDE_SKILL_DIR}/references/rules.md`: the format, each library, GeoParquet, interchange and security.
- `${CLAUDE_SKILL_DIR}/references/sources.md`: the pages our claims rest on, by question.
- `${CLAUDE_SKILL_DIR}/references/freshness.json`: facts to re-check by hand against their pages.
