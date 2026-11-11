# <product>

<One line: what <product> does and for whom.>

## Layout

| Crate | Layer | Holds |
|---|---|---|
| `crates/<product>-core` | core | model, ports, rules; no I/O |
| `crates/<product>-adapters` | adapters | each port's real implementation |
| `crates/<product>-app` | app | the use cases, against ports only |
| `crates/<product>` | root | the binary: main, compose, verbs, answer, crash |
| `crates/lib-<capability>` | lib | shared, no product types |

`MAP.md` names every module and file with the task that fills it; `structure-map.json` is its machine-read form; `catalog/homes.json` names the shared homes.

## Build and check

- The toolchain is pinned in `rust-toolchain.toml`; rustup installs it on the first cargo call. `rust-version` in `Cargo.toml` is the floor CI checks.
- A git dependency on a private repo is fetched by the git CLI with your own credentials: `export CARGO_NET_GIT_FETCH_WITH_CLI=true`.
- `ci/check.sh`: fmt, clippy `-D warnings`, test and `cargo deny check`, every cargo call `--locked`.
- `ci/check-lib-imports.sh`, `ci/gitleaks.sh`, `ci/schema-check.sh`: the lib layer's import ban, the secret scan, JSON Schema validation.
- `ci/proof/<name>.sh`: one done check per piece, printing `<name>: ok`.
- Platforms: macOS arm64 and x64, and Linux x64. Windows is not supported.
