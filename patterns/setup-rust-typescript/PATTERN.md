---
id: setup-rust-typescript
title: A laptop and a new repo ready to build well in Rust and TypeScript
version: 0.1.0
status: proven
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: []
provides: [Workstation, RustWorkspace, TypeScriptPackage]
requires: []
---

# Set up Rust and TypeScript

## Problem

A new laptop and a new repo start with a dozen choices: which toolchain, which lints, which checks, which editor
plugins. Each one left open is made differently by every person and every agent, and code passes on one laptop and
fails on another. Checks added after the code is written find hundreds of problems at once.

## Use when / Do not use when

- **Use when** setting up a laptop to build, or starting a new Rust workspace or TypeScript package.
- **Do not use when** joining a repo that already has its own toolchain file, lint settings and check script: use those.

## Solution

Install once, then copy the starting files into each new repo before its first line of code. One script, `ci/check.sh`,
runs every check the same way on a laptop and in CI.

### 1. Install

| Tool | For | macOS / Linux | Windows |
|---|---|---|---|
| git | everything | `brew install git` | `winget install Git.Git` |
| rustup (cargo, rustc, clippy, rustfmt) | Rust | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | `winget install Rustlang.Rustup`, plus the Visual Studio C++ build tools |
| cargo-deny | Rust dependency licenses, advisories, bans | `cargo install --locked cargo-deny` | same |
| cargo-mutants | Rust: do the tests notice a changed line | `cargo install --locked cargo-mutants` | same |
| Node.js LTS (24) and npm | TypeScript, React, Next.js | `brew install node@24`, then add its `bin` to `PATH` (the formula is keg-only) | `winget install OpenJS.NodeJS.LTS` |
| Docker | Tika and other services locally | Docker Desktop | Docker Desktop |
| gitleaks | secrets in the code and history | `brew install gitleaks` | the release binary from GitHub |
| Semgrep (community edition) | code security patterns, both languages | `brew install semgrep` | `python3 -m pip install semgrep` |

TypeScript, ESLint and the test tools install per repo with npm, never globally, so every repo pins its own.

### 2. Editor

VS Code (or any editor speaking the language server protocol) with: **rust-analyzer** (Rust), **ESLint**
(TypeScript), **Docker**, and **CodeLLDB** to debug Rust. Set rust-analyzer's check command to `clippy`, so the editor
shows the same lints as the check script.

### 3. A new Rust workspace

```
rust-toolchain.toml     Cargo.toml (the workspace)     deny.toml     clippy.toml     rustfmt.toml
ci/check.sh             crates/<name>-core/            crates/<name>-adapters/        crates/<name>/ (the binary)
```

- **`rust-toolchain.toml`** pins one exact stable version with `clippy` and `rustfmt`, since lints change between
  versions and every laptop and CI must judge alike. `rust-version` in `Cargo.toml` is that version's minor.
- **`Cargo.toml`**: `resolver = "3"`, `edition = "2024"`, every dependency declared once under
  `[workspace.dependencies]`, and lints set once under `[workspace.lints.rust]` and `[workspace.lints.clippy]`,
  with `[lints] workspace = true` in every member crate:
  - `unsafe_code = "deny"`; `missing_docs = "warn"`.
  - Clippy `pedantic` as warnings; `unwrap_used`, `expect_used`, `panic`, `indexing_slicing`, `todo`,
    `unimplemented`, `string_slice`, `exit`, `print_stdout`, `print_stderr` and `dbg_macro` denied in library code.
  - `[profile.dev]` `debug = "line-tables-only"` and dependencies at `debug = 0`, which keeps `target/` small;
    `[profile.release]` with `lto = true`, `codegen-units = 1` and `overflow-checks = true`.
- **Layout:** `core` holds the types and the traits (ports) the program reaches the outside through, and depends on
  no I/O crate; `adapters` implement those traits (HTTP, files, Tika, a database); the binary crate reads config and
  wires them. Tests use fakes of the traits, so most tests need no network or container.
- **`Cargo.lock` is committed;** every check runs with `--locked`.
- **`target/`** is never shared between checkouts, and is deleted when a piece of work ends.
- **Starting crates** for a service like upload and extraction: `tokio`, `axum`, `reqwest` (streaming bodies),
  `serde` and `serde_json`, `thiserror` for library errors, `tracing` for logs, `uuid`.

### 4. A new TypeScript package

- **`package.json`**: `"type": "module"`, `"engines": { "node": ">=24" }`, `exports` with `types` first, `imports`
  with `#` for internal paths, and scripts `typecheck` (`tsc --noEmit`), `build` (`tsc`), `test`, `lint`
  (`eslint .`).
- **`tsconfig.json`**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noUncheckedSideEffectImports`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`, `skipLibCheck: false`.
  Node code uses `"module": "nodenext"`; a bundled page (React, Next.js) uses `"module": "esnext"` with
  `"moduleResolution": "bundler"`.
- **Tests:** `node --test` for Node code, files `*.test.ts` beside the code; the framework's runner (Vitest) for
  React components.
- **ESLint** with typescript-eslint's type-checked rules, and `eslint-plugin-react-hooks` in a React or Next.js app.
- **Next.js:** start with `npx create-next-app@latest`, TypeScript and the App Router, then tighten its `tsconfig.json`
  to the options above.
- **`package-lock.json` is committed;** CI installs with `npm ci`.

### 5. The checks

Every change passes these, run by `ci/check.sh`, the same command on a laptop and in CI.

| Check | Rust | TypeScript |
|---|---|---|
| Format | `cargo fmt --all -- --check` | the ESLint stylistic rules, or a formatter the repo names |
| Lint | `cargo clippy --workspace --all-targets --locked -- -D warnings` | `eslint .` |
| Types | the compiler | `tsc --noEmit` |
| Tests | `cargo test --workspace --locked` | `npm test` |
| Dependencies | `cargo deny --locked check` (licenses, advisories, bans, sources) | `npm audit --omit=dev` |
| Secrets | `gitleaks git` (history) and `gitleaks dir` (working tree) | same |
| Security patterns | `semgrep scan --config auto --error` | same |
| Tests that prove something | `cargo mutants --in-diff <diff>` on changed lines | StrykerJS on changed files |

Mutation testing changes a line and reruns the tests: a change no test notices means the line is untested. Run it on
the changed lines only, before a change lands; it is too slow for every save.

## Rules

1. **Pin the toolchain and commit the lock files.** A check that passes on one laptop passes on all of them.
2. **Lints and compiler options are set at the start,** before the first file, never added later.
3. **One check script,** the same on a laptop and in CI; nothing in CI that cannot run locally.
4. **Warnings fail the check** (`-D warnings`, ESLint errors).
5. **Library code never panics or prints;** errors are typed and returned, and only the binary writes output.
6. **Install per repo, not globally,** for anything a check depends on.

## Conformance

1. **Given** a fresh laptop after step 1, **then** `cargo --version`, `node --version`, `docker --version`,
   `gitleaks version` and `semgrep --version` each answer.
2. **Given** a new Rust workspace from step 3 with one crate, **then** `ci/check.sh` passes.
3. **Given** a `.unwrap()` added to a library crate, **then** clippy fails the check.
4. **Given** a cloud key committed to a test file, **then** gitleaks fails the check.
5. **Given** a new TypeScript package from step 4, **then** `tsc --noEmit`, `eslint .` and `npm test` pass, and an
   unchecked array index fails `tsc`.

## Swap points

- The editor; Vitest or Node's runner; a formatter; the mutation tool's scope.
- Must not change: the pinned toolchain, the lock files, the one check script, warnings as failures.

## Sources

- rustup install: https://rustup.rs/ and toolchain files: https://rust-lang.github.io/rustup/overrides.html
- Cargo workspaces, lints and profiles: https://doc.rust-lang.org/cargo/reference/workspaces.html, https://doc.rust-lang.org/cargo/reference/profiles.html
- Clippy lints: https://rust-lang.github.io/rust-clippy/
- cargo-deny: https://embarkstudios.github.io/cargo-deny/ and cargo-mutants: https://mutants.rs/
- TSConfig reference: https://www.typescriptlang.org/tsconfig/ and Node's TypeScript support: https://nodejs.org/api/typescript.html
- typescript-eslint: https://typescript-eslint.io/ and StrykerJS: https://stryker-mutator.io/
- gitleaks: https://github.com/gitleaks/gitleaks and Semgrep: https://semgrep.dev/docs/
- rust-analyzer: https://rust-analyzer.github.io/

## Known gaps

- The Windows column is not yet run on a fresh machine.
- Miri, fuzzing and benchmarks are left out of a first setup.
