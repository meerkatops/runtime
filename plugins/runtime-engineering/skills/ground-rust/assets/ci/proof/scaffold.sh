#!/bin/sh
# The scaffold's done check: the scaffold whole. The repo matches the standard or lists each difference in MAP.md,
# the lib layer imports no product crate, the dependency audit passes, clippy and the build
# are clean, every shared home's file is present. Then two plants, each in a detached worktree copy
# under mktemp so a kill never leaves this tree edited: a println! in <product>-core must fail clippy naming
# print_stdout, and <product>-core under lib-<capability> must fail check-lib-imports. Each step prints
# "scaffold: <step> ok" or stops naming the step.
# STANDARD_CHECK is the path of the ground-rust skill's scripts/standard-check.mjs.
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"
command -v cargo >/dev/null 2>&1 || PATH="$HOME/.cargo/bin:$PATH"
export CARGO_TERM_COLOR=never
core="<product>-core"
lib="lib-<capability>"
work=$(mktemp -d "${TMPDIR:-/tmp}/scaffold.XXXXXX")
copy="$work/tree"
cleanup() {
  git -C "$root" worktree remove --force "$copy" >/dev/null 2>&1 || true
  git -C "$root" worktree prune >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

fail() {
  echo "scaffold: $1" >&2
  exit 1
}

# Runs a step quietly; on failure prints its output and stops naming it.
step() {
  name=$1
  shift
  if "$@" >"$work/out" 2>&1; then
    echo "scaffold: $name ok"
  else
    cat "$work/out" >&2
    fail "$name failed"
  fi
}

command -v cargo-deny >/dev/null 2>&1 || fail "deny failed: cargo-deny is not installed (cargo install --locked cargo-deny@=0.20.2)"
[ -n "${STANDARD_CHECK:-}" ] || fail "standard failed: set STANDARD_CHECK to the path of the ground-rust skill's scripts/standard-check.mjs"

step standard node "$STANDARD_CHECK" .
step lib-imports ci/check-lib-imports.sh
step deny cargo deny --locked --log-level error check
step clippy cargo clippy --workspace --all-targets --locked -- -D warnings
step build cargo build --workspace --locked

homes=$(sed -n 's/.*"home"[[:space:]]*:[[:space:]]*"\([^"#]*\)[#"].*/\1/p' catalog/homes.json)
[ -n "$homes" ] || fail "home-files failed: catalog/homes.json lists no home"
for file in $homes; do
  [ -f "$file" ] || fail "home-files failed: $file, a home catalog/homes.json names, does not exist"
done
echo "scaffold: home-files ok ($(printf '%s\n' "$homes" | wc -l | tr -d ' ') homes)"

# The copy holds this tree as it stands, committed or not, so the plants judge the work being proved. It builds in
# its own target folder: two checkouts never share one.
git worktree add --detach --quiet "$copy" HEAD
git ls-files --cached --others --exclude-standard | while IFS= read -r f; do
  if [ -e "$f" ]; then printf '%s\n' "$f"; fi
done >"$work/files"
tar -cf - -T "$work/files" | tar -C "$copy" -xf -
export CARGO_TARGET_DIR="$work/target"

printf '\n/// Planted by ci/proof/scaffold.sh.\npub fn planted() {\n    println!("x");\n}\n' >>"$copy/crates/$core/src/lib.rs"
if (cd "$copy" && cargo clippy -p "$core" --locked -- -D warnings) >"$work/out" 2>&1; then
  fail "plant passed: println! in $core"
fi
grep -q 'print_stdout' "$work/out" || {
  cat "$work/out" >&2
  fail "plant println! in $core failed for another reason than print_stdout"
}
git -C "$copy" checkout --quiet -- "crates/$core/src/lib.rs"
echo "scaffold: plant println! refused (clippy::print_stdout)"

printf '\n[target.'"'"'cfg(target_os = "freebsd")'"'"'.dependencies]\n%s.workspace = true\n' "$core" >>"$copy/crates/$lib/Cargo.toml"
(cd "$copy" && cargo update --workspace --offline --quiet) >"$work/out" 2>&1 || {
  cat "$work/out" >&2
  fail "plant $core in $lib: cargo could not update the lock"
}
set +e
"$copy/ci/check-lib-imports.sh" >"$work/out" 2>&1
code=$?
set -e
case $code in
  0) fail "plant passed: $core in $lib" ;;
  1) ;;
  *)
    cat "$work/out" >&2
    fail "plant $core in $lib: check-lib-imports could not look (exit $code)"
    ;;
esac
grep -q "$lib may not depend on $core" "$work/out" || {
  cat "$work/out" >&2
  fail "plant $core in $lib refused without naming the edge"
}
echo "scaffold: plant $core in $lib refused ($(cat "$work/out"))"
echo "scaffold: ok"
