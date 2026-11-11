# Starting files

Copied into a new Rust repo, then edited for the product's names: `<product>`, `<org>`, `<bin>`, `<capability>`, `<task>` and the other `<...>` placeholders. Each setting is explained in [start](../references/start.md). These are our Rust standard: every Rust repo copies them, and `node ../scripts/standard-check.mjs <repo>` holds the repo to them. A deliberate difference is named by file under `## Differences from the standard` in the repo's MAP.md; standard-check fails on any other.

## The repo root

| Asset | Saved as | Checked |
|---|---|---|
| `workspace.Cargo.toml` | `Cargo.toml` | by key, except `[workspace.dependencies]`, `version` and `repository`; a `[workspace.lints]` level below the standard's is refused, not listable |
| `rust-toolchain.toml` | `rust-toolchain.toml` | by key |
| `rustfmt.toml` | `rustfmt.toml` | by key |
| `clippy.toml` | `clippy.toml` | by key |
| `deny.toml` | `deny.toml`, its `allow-org` naming the repo's own GitHub organization | by key, except `allow-org` |
| `gitignore` | `.gitignore` | by line |
| `env.example` | `.env.example`, a line per variable Config reads | present |
| `repo-README.md` | `README.md` | present |
| `MAP.md` | `MAP.md`, with its `## Unsafe crates` table (each crate that allows `unsafe_code` at its root, why, and its proof) and its `## Differences from the standard` heading | present; the Unsafe table is read |
| `structure-map.json` | `structure-map.json`, one module per row of MAP.md | present |
| `catalog/homes.json` | `catalog/homes.json`, schema 2 as `catalog/homes.schema.json` describes: each home a unique capability `id` and the repo it `lives` in | present |
| (none) | `Cargo.lock`, committed; `LICENSE`; `THIRD-PARTY` | present |

## ci/

| Asset | Saved as | Checked |
|---|---|---|
| `ci/check.sh` | `ci/check.sh` | by line |
| `ci/check-lib-imports.sh` | `ci/check-lib-imports.sh`; a lib-to-lib edge goes in its `allowed` line, which never excuses a lib-to-product edge or an async runtime | by line |
| `ci/schema-check.sh` | `ci/schema-check.sh` | by line |
| `ci/gitleaks.sh` | `ci/gitleaks.sh`: the gitleaks CLI's built-in rules at the installed version; no config file is vendored | by line |
| `ci/proof/scaffold.sh` | `ci/proof/scaffold.sh`, the scaffold's done check; its `STANDARD_CHECK` is the path of this skill's `scripts/standard-check.mjs` | present |
| `ci/proof/bench-kernel.sh` | `ci/proof/bench-<kernel>.sh`, one per kernel MAP.md names, with its `.baseline`; run on a developer machine before a release, never in CI | example |
| `ci/proof/miri-crate.sh` | `ci/proof/miri-<crate>.sh`, one per crate under `## Unsafe crates` without FFI; an FFI crate's proof is its `fuzz/` target | example |

Line checks skip comments and blank lines.

## .github/workflows/

| Asset | Saved as | Checked |
|---|---|---|
| `github/workflows/ci.yml` | `.github/workflows/ci.yml` | present |

## Crates

| Asset | Saved as |
|---|---|
| `crate-lib.Cargo.toml` | a library crate's manifest, `crates/<product>-core/Cargo.toml`. A named reusable kernel that a real target needs adds `#![cfg_attr(not(feature = "std"), no_std)]` and `extern crate alloc;` to its `lib.rs`, and `ci/check.sh` checks it `--no-default-features`. A crate under `## Unsafe crates` adds `#![allow(unsafe_code)]` and `#![deny(unsafe_op_in_unsafe_fn)]`. |
| `crate-wasm.Cargo.toml` | the browser wrapper, `crates/<product>-wasm/Cargo.toml`; its `wasm-bindgen` and core lines come from `[workspace.dependencies]` |
| `rust/types.rs` | `crates/<crate>/src/types.rs`: the crate's one `Error` and `not_built(task)` |
| `rust/stub.rs` | each stub module, `crates/<crate>/src/<module>.rs`: its `//!` line, typed signatures, bodies returning `not_built("<task>")`; an unused argument keeps its `_` until the task fills it |
| `rust/stub_test.rs` | `crates/<crate>/tests/<module>.rs`, the one test the filling task replaces |
| `rust/crash.rs` | `crates/<product>/src/crash.rs`, the panic hook `main` installs first with the crashes folder, then `set_context` once parsing knows the verb (a `OnceLock`, first call wins): one JSON record per crash at `~/.<bin>/crashes/<time>-<pid>.json` (0600 in a 0700 folder, 50 kept) with message, file:line, backtrace, version, verb, redacted args, cwd, env var names, session and time; the repo writes the test that proves it under `panic = "abort"` by running the built binary |
| `rust/plugin_version.rs` | optional, only for a binary shipped as a Claude Code plugin: `crates/<product>/tests/plugin_version.rs`, the answer-contract test of `version` and `newer`, its verbs and `<marketplace>` and `<plugin>` named; any other repo leaves it out |
| `rust/fixture.rs` | `crates/<crate>/tests/common/mod.rs`, the test fixtures (one plain component per name, a new folder each, `write` refusing `..`, absolute paths and overwrites, git's env built from nothing) and `find_on_path` |

A browser crate adds `cargo check --target wasm32-unknown-unknown -p <product>-wasm` to CI, a difference its MAP.md names. The binary crate `crates/<product>/Cargo.toml` is a library manifest plus `[[bin]]`; its `main` installs the crash hook and calls `run`.
