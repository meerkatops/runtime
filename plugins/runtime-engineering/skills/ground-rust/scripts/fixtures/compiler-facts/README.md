# Compiler facts the standard rests on

Four tiny programs, each with an `// expect:` line naming what rustc 1.99.1 does with it (edition 2024). They are
not run by the tests; `standard-check.test.mjs` only checks each file still names its expectation. Re-run them by
hand when the toolchain pin moves: `rustc --edition 2024 <file>` for the three compile facts, then run the binary
for the float fact.

| File | Fact |
|---|---|
| `allow-below-deny.rs` | `#![deny(unsafe_code)]` at the workspace with a crate-root `#![allow(unsafe_code)]` compiles |
| `allow-below-forbid.rs` | the same allow under `forbid` is E0453 |
| `set-var-2024.rs` | `std::env::set_var` outside `unsafe` is E0133 in edition 2024 |
| `float-rounding.rs` | `0.1_f64 + 0.2 == 0.3` prints `false`: operators are correctly rounded, not exact |
