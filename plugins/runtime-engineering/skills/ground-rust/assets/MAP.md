# MAP: where each piece of <product> lives

<One paragraph: what <product> does, in the words its app modules carry.>

`structure-map.json` is the machine-read form of this map; `catalog/homes.json` names the shared homes. A task fills its own files and edits no file another task fills. Every file below exists as a stub with its `pub mod` line, naming the task that fills it. A new file gets its row here in the same change.

## Layers

Imports point down only. Cargo enforces the crate graph; `ci/check-lib-imports.sh` enforces the lib layer's ban (no product crate ever, another lib crate only by an allowed edge) and refuses an async runtime under a lib or core crate.

| Layer | Crates | May import |
|---|---|---|
| root | `<product>` (main, compose, verbs, answer, crash) | app, adapters, lib, core |
| app | `<product>-app` | core |
| adapters | `<product>-adapters` | core, lib |
| core | `<product>-core` (no I/O) | lib |
| lib | `lib-<capability>` | nothing of the product's; another lib crate only as an edge listed in `ci/check-lib-imports.sh`'s `allowed` line and named below as a difference |

A lib crate is named for its capability, not the product: no product type, its own error type, no product import. It moves to a shared repo at its second real consumer.

## Modules and the tasks that fill them

| Layer | Module | Holds | Tasks |
|---|---|---|---|
| core | model | the facts the product moves; `Error` | <task> |
| core | ports | the traits the product reaches the outside through, and their fakes | <task> |
| adapters | <port> | <port>'s real implementation | <task> |
| app | <job> | one use case, against ports only | <task> |
| lib | lib-<capability> | <capability> | <task> |
| root | compose | Config, the only env reader; one wiring file per adapter group | <task> |
| root | verbs | the registry; one file per verb | <task> |
| root | answer | the one writer | <task> |
| root | crash | the crash record, hook first in main | <task> |

## The repo's frame

Not product code; no task fills these as a module, and structure-map.json ignores them.

| Path | Holds |
|---|---|
| `.github/` | the CI workflow |
| `catalog/homes.json` | the shared homes |
| `ci/` | checks, and each piece's `ci/proof/` script |

## Shared homes

One home each; a second copy is a review finding, found by its bypass patterns. Details in `catalog/homes.json`.

| Home | Where | First built by |
|---|---|---|
| Clock | `crates/<product>-core/src/ports.rs#Clock` | <task> |
| Config | `crates/<product>/src/compose.rs#read_config` | <task> |
| answer | `crates/<product>/src/answer.rs#write` | <task> |
| Sandbox | `crates/<product>-adapters/src/process.rs#Sandbox` | <task> |
| panic record | `crates/<product>/src/crash.rs#install_crash_hook` | <task> |

## Every file and the task that fills it

### <crate>

| File | Filled by |
|---|---|
| `crates/<crate>/src/<module>.rs` | <task> |

## Rules

- Units of measure, in names and at a boundary: coding-rulebook A2.
- One home per piece: coding-rulebook G2.
- The Rust standard: /ground-rust. Its `scripts/standard-check.mjs .` passes only when each difference below is named.

## Unsafe crates

The workspace denies `unsafe_code`. A crate named here allows it at its root beside `#![deny(unsafe_op_in_unsafe_fn)]`, keeps it behind a safe face in one private module with a `// SAFETY:` invariant per block, and has its proof in `ci/proof/` (`miri-<crate>.sh` where it has no FFI; a fuzz target and a differential test where it has). standard-check refuses a crate-level lint relaxation this list does not name.

| Crate | Why | Proof |
|---|---|---|
| None | | |

## Differences from the standard

None.
