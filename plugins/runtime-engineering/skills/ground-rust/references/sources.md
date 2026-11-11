# Sources: the Rust pages our claims rest on

Read each page live, one fetch per page. Everything under https://doc.rust-lang.org/ has its own index page; the book's chapters are `ch<nn>-<nn>-<slug>.html`.

## Versions and what changed

- https://blog.rust-lang.org/ — each stable release's post, newest first.
- https://doc.rust-lang.org/edition-guide/ — what each edition changed, one page per change under `rust-2024/`.
- https://doc.rust-lang.org/cargo/reference/rust-version.html — the toolchain floor.

## The book

- https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html — ownership, moves, clones.
- https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html — `Option`.
- https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html — packages, crates, `src/bin`.
- https://doc.rust-lang.org/book/ch07-05-separating-modules-into-different-files.html — module files.
- https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html and https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html — `Result`, `?`, when to panic.
- https://doc.rust-lang.org/book/ch10-01-syntax.html and https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html — generics, lifetimes.
- https://doc.rust-lang.org/book/ch11-03-test-organization.html — unit and integration tests.
- https://doc.rust-lang.org/book/ch12-03-improving-error-handling-and-modularity.html — the `main` and `lib` split.
- https://doc.rust-lang.org/book/ch13-04-performance.html — iterators are zero-cost.
- https://doc.rust-lang.org/book/ch14-01-release-profiles.html, https://doc.rust-lang.org/book/ch14-02-publishing-to-crates-io.html, https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html — profiles, docs and re-exports, workspaces.
- https://doc.rust-lang.org/book/ch15-05-interior-mutability.html and https://doc.rust-lang.org/book/ch16-03-shared-state.html — `RefCell`, `Rc`, `Arc`, `Mutex`.
- https://doc.rust-lang.org/book/ch17-01-futures-and-syntax.html, https://doc.rust-lang.org/book/ch17-02-concurrency-with-async.html, https://doc.rust-lang.org/book/ch17-06-futures-tasks-threads.html — async, blocking, threads against tasks.
- https://doc.rust-lang.org/book/ch18-02-trait-objects.html — generics against `dyn`.
- https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html and https://doc.rust-lang.org/book/ch20-03-advanced-types.html — `unsafe`, newtypes.

## Cargo

- https://doc.rust-lang.org/cargo/reference/manifest.html — every manifest field, `[lints]`.
- https://doc.rust-lang.org/cargo/reference/workspaces.html — virtual roots, members, inheritance.
- https://doc.rust-lang.org/cargo/reference/features.html — features and optional dependencies.
- https://doc.rust-lang.org/cargo/reference/profiles.html — `opt-level`, `lto`, `codegen-units`, `panic`, `overflow-checks`.
- https://doc.rust-lang.org/cargo/reference/cargo-targets.html — `crate-type`.
- https://doc.rust-lang.org/cargo/reference/resolver.html — resolver versions.
- https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html and https://doc.rust-lang.org/cargo/guide/continuous-integration.html — the lock file and CI.
- https://doc.rust-lang.org/cargo/reference/publishing.html — publishing.

## Guidelines, lints, docs

- https://rust-lang.github.io/api-guidelines/checklist.html — the checklist; its pages on naming, interoperability, type safety, future proofing, documentation and dependability.
- https://doc.rust-lang.org/clippy/ and https://doc.rust-lang.org/clippy/configuration.html — lint groups and configuration.
- https://github.com/rust-lang/rustfmt and https://raw.githubusercontent.com/rust-lang/rustfmt/main/Configurations.md — formatting and `style_edition`.
- https://doc.rust-lang.org/rustdoc/what-is-rustdoc.html, https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html, https://doc.rust-lang.org/rustdoc/lints.html — docs, doc tests, `missing_docs`.

## Standard library and reference

- https://doc.rust-lang.org/std/error/trait.Error.html — the error trait.
- https://doc.rust-lang.org/std/result/index.html — `Result` is `#[must_use]`.
- https://doc.rust-lang.org/std/primitive.f64.html — float precision and determinism.
- https://doc.rust-lang.org/std/thread/index.html — stacks and spawning.
- https://doc.rust-lang.org/reference/attributes/diagnostics.html — `#[must_use]`.
- https://doc.rust-lang.org/reference/items/functions.html and https://doc.rust-lang.org/reference/panic.html — ABIs and panics.
- https://doc.rust-lang.org/reference/visibility-and-privacy.html — `pub`, `pub(crate)`.

## Close to the machine

- https://doc.rust-lang.org/nomicon/working-with-unsafe.html and https://doc.rust-lang.org/nomicon/ffi.html — the Nomicon: the module boundary scopes `unsafe`; FFI.
- https://doc.rust-lang.org/rustc/lints/levels.html — lint levels; `forbid` cannot be allowed below.
- https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html — `set_var` and `remove_var` unsafe in 2024.
- https://github.com/rust-lang/miri — Miri: no FFI by default (an experimental `-Zmiri-native-lib` flag exists), few platform APIs, "cannot ensure that your code is sound".
- https://rust-fuzz.github.io/book/cargo-fuzz/setup.html and https://rust-fuzz.github.io/book/cargo-fuzz/tutorial.html — cargo-fuzz, nightly only.
- https://doc.rust-lang.org/std/arch/index.html, https://doc.rust-lang.org/std/simd/index.html and https://doc.rust-lang.org/reference/attributes/codegen.html — intrinsics, `target_feature`, run-time detection; `std::simd` nightly.
- https://doc.rust-lang.org/cargo/commands/cargo-bench.html and https://doc.rust-lang.org/cargo/reference/profiles.html — `harness = false`, `[profile.bench]`.
- https://docs.rs/memmap2/latest/memmap2/struct.Mmap.html — why a map over a mutable file is undefined behavior.
- https://doc.rust-lang.org/std/alloc/index.html — one `#[global_allocator]`.
- https://doc.rust-lang.org/std/io/trait.BufRead.html#method.read_until, https://doc.rust-lang.org/std/fs/struct.File.html#method.sync_all and https://doc.rust-lang.org/std/fs/struct.OpenOptions.html#method.append — unbounded reads, durability, append.
- https://doc.rust-lang.org/rustc/profile-guided-optimization.html — PGO.
- https://doc.rust-lang.org/std/thread/fn.available_parallelism.html — thread count.
- https://nnethercote.github.io/perf-book/profiling.html — the profilers by name.
- https://bheisler.github.io/criterion.rs/book/faq.html — criterion on CI: "you probably shouldn't... don't rely on the results"; the bench gate's noise rule.
- https://doc.rust-lang.org/reference/attributes/codegen.html#the-target_feature-attribute — calling a function compiled for a feature the CPU lacks is undefined behavior.
- https://doc.rust-lang.org/reference/names/preludes.html#the-no_std-attribute — what `no_std` does and does not do.
- https://doc.rust-lang.org/cargo/reference/profiles.html#overflow-checks — overflow checks, per-package overrides.
- https://arxiv.org/abs/2007.00752 — Evans et al.: more than half of crates cannot be fully checked statically because of unsafe in their call chain.
- https://mktrm.github.io/files/int_overflow_usenix26.pdf — Zhang et al., USENIX Security 2026: overflow checks cost a 3.5% geomean on Rust benchmarks.
- https://raw.githubusercontent.com/BurntSushi/memchr/master/Cargo.toml and https://raw.githubusercontent.com/rusticstuff/simdutf8/main/README.md — `no_std` loses run-time detection; `target-cpu=native` disables run-time selection.
- https://raw.githubusercontent.com/tokio-rs/tokio/master/.github/workflows/ci.yml — the Miri nightly pinned by date.

## WebAssembly, embedded, performance

- https://wasm-bindgen.github.io/wasm-bindgen/ — the guide; its `reference/types/` pages per type.
- https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html — the target.
- https://rustwasm.github.io/docs/book/ — the archived book; its `reference/` pages on code size, debugging, adding wasm support and which crates work.
- https://docs.rust-embedded.org/book/intro/no-std.html — `no_std`.
- https://nnethercote.github.io/perf-book/ — the performance book, maintained by one compiler contributor, not a rust-lang project.
