#!/bin/sh
# The checks every change passes, on a developer machine or in CI: format, lints, tests, the dependency audit.
# Every cargo call runs --locked, so a Cargo.lock that no longer matches fails instead of changing.
# The secret scan is ci/gitleaks.sh, which fails closed when gitleaks is missing.
# Prints each step's seconds so compile time stays measured.
set -eu
cd "$(dirname "$0")/.."
command -v cargo >/dev/null 2>&1 || PATH="$HOME/.cargo/bin:$PATH"
export CARGO_NET_GIT_FETCH_WITH_CLI=true
step() {
  name=$1; shift
  start=$(date +%s)
  "$@"
  echo "ci: $name $(( $(date +%s) - start )) s" >&2
}
step fetch cargo fetch --locked
step fmt cargo fmt --all -- --check
step clippy cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
step test cargo test --workspace --all-features --locked
step deny cargo deny --locked --log-level error check
step lib-imports ci/check-lib-imports.sh
step gitleaks ci/gitleaks.sh
