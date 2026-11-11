#!/bin/sh
# An unsafe crate's proof, the example for ci/proof/miri-<crate>.sh: Miri over the crate's tests, for a crate MAP.md
# lists under "## Unsafe crates" that has no FFI (by default Miri runs no foreign code; an FFI crate's proof is its fuzz target
# and its differential test). Nightly is the auxiliary toolchain pinned by date (as tokio pins its Miri nightly),
# called here only, never floating; the build toolchain stays the stable pin. Fails closed: a missing toolchain or component is a failed proof, never a skip.
# Prints "miri-<crate>: ok".
set -eu
cd "$(dirname "$0")/../.."
command -v cargo >/dev/null 2>&1 || PATH="$HOME/.cargo/bin:$PATH"
crate="<crate>"
nightly="nightly-2026-08-17"
# The row as standard-check's unsafeCrates() reads it: a table row whose first cell is the crate, bare or in backticks.
awk -v c="$crate" '/^##+[[:space:]]+Unsafe crates[[:space:]]*$/ { on = 1; next } on && /^#/ { on = 0 }
  on && /^\|/ { cell = $0; sub(/^\|[[:space:]]*`?/, "", cell); sub(/`?[[:space:]]*\|.*$/, "", cell); if (cell == c) found = 1 }
  END { exit !found }' MAP.md || { echo "miri-$crate: MAP.md does not list $crate under ## Unsafe crates" >&2; exit 1; }
rustup run "$nightly" cargo --version >/dev/null 2>&1 || {
  echo "miri-$crate: $nightly is not installed (rustup toolchain install $nightly --component miri)" >&2; exit 2; }
cargo "+$nightly" miri --version >/dev/null 2>&1 || {
  echo "miri-$crate: miri is not a component of $nightly (rustup component add miri --toolchain $nightly)" >&2; exit 2; }
MIRIFLAGS="${MIRIFLAGS:--Zmiri-strict-provenance}" cargo "+$nightly" miri test --locked -p "$crate"
echo "miri-$crate: ok"
