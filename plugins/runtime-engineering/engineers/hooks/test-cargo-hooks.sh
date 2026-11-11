#!/bin/sh
# Feeds rust-engineer's one hook (cargo-check, PostToolUse on Edit|Write|Bash) crafted JSON inputs
# and checks each answer: a report as additionalContext, or silence, and never a block.
# HOME is a scratch dir, and a trusted-roots file there trusts ~/work; rustup and cargo stay the real ones.
# Needs git, jq, python3, rustup and cargo. Usage: TMPDIR=<writable dir> sh test-cargo-hooks.sh
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d "${TMPDIR:-/tmp}/rust-hooks.XXXXXX") || { echo "FAIL  no writable TMPDIR"; exit 1; }
trap 'rm -rf "$T"' EXIT
export PATH="$HOME/.cargo/bin:$PATH" RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}" CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export HOME=$T/home XDG_STATE_HOME=$T/state CARGO_TARGET_DIR=$T/target
mkdir -p "$HOME/.config/engineer-agents"; base_roots() { printf '%s\n' "$HOME/work" > "$HOME/.config/engineer-agents/trusted-roots"; chmod 644 "$HOME/.config/engineer-agents/trusted-roots"; }; base_roots
unset RUST_ENGINEER_DEADLINE_S
P=$HOME/work/proj; LIB=$P/crates/demo/src/lib.rs
export CLAUDE_PROJECT_DIR=$P
R=$T/results; : > "$R"  # cases run in pipeline subshells, so counts go to a file
pass_() { echo pass >> "$R"; echo "PASS  $1"; }
fail_() { echo fail >> "$R"; echo "FAIL  $1"; }

crate() {  # crate DIR NAME: a one-crate workspace in a fresh git repo
  mkdir -p "$1/crates/demo/src"
  printf '[workspace]\nmembers = ["crates/demo"]\nresolver = "2"\n' > "$1/Cargo.toml"
  printf '[package]\nname = "%s"\nversion = "0.1.0"\nedition = "2021"\n' "$2" > "$1/crates/demo/Cargo.toml"
  printf 'pub fn add(a: u8, b: u8) -> u8 {\n    a.wrapping_add(b)\n}\n' > "$1/crates/demo/src/lib.rs"
  printf 'target/\nCargo.lock\n' > "$1/.gitignore"
  git -C "$1" init -q && git -C "$1" add -A && git -C "$1" -c user.email=t@t -c user.name=t commit -qm base
}
crate "$P" demo
reset() { git -C "$P" reset -q --hard && git -C "$P" clean -fdq; }

# case_ NAME EXPECT(quiet|regex) [env VAR=..]... ; stdin is the hook input. Never a decision.
case_() {
  name=$1 want=$2; shift 2
  out=$(env "$@" sh "$HERE/cargo-check.sh" --agent rust-engineer 2>&1); rc=$?
  if printf '%s' "$out" | grep -Eq '"(permissionD|d)ecision"'; then ok=n
  elif [ "$want" = quiet ]; then ok=$([ $rc -eq 0 ] && [ -z "$out" ] && echo y)
  else ok=$([ $rc -eq 0 ] && printf '%s' "$out" | grep -Eq "$want" && echo y); fi
  [ "$ok" = y ] && pass_ "$name" || { fail_ "$name (rc=$rc)"; printf '%s\n' "$out" | cut -c1-220 | head -n 4 | sed 's/^/      | /'; }
}
edit_json() { jq -n --arg f "$1" '{hook_event_name:"PostToolUse",agent_type:"rust-engineer",session_id:"s1",tool_name:"Edit",tool_input:{file_path:$f}}'; }
bash_json() { jq -n '{hook_event_name:"PostToolUse",agent_type:"rust-engineer",session_id:"s1",tool_name:"Bash",tool_input:{command:"x"}}'; }
CTX='"additionalContext": ?"'
SKIP='not a trusted repo; type check skipped'

echo "== a trusted repo is checked"
printf '\npub fn sub(a: u8, b: u8) -> u8 {\n    a.wrapping_sub(b)\n}\n' >> "$LIB"
edit_json "$LIB" | case_ "clean edit: silent" quiet
printf '\npub fn bad() -> u8 { "x" }\n' >> "$LIB"
edit_json "$LIB" | case_ "compile error: reported as context, not a block" "$CTX"'cargo check --offline -p demo failed.*lib.rs:[0-9]+:[0-9]+: error'
reset
printf 'pub fn f() -> u8 { "x" }\n' > "$P/crates/demo/src/extra.rs"; printf '\nmod extra;\n' >> "$LIB"
bash_json | case_ "Bash adds an untracked broken module: reported" "$CTX"'cargo check --offline -p demo failed.*extra.rs'
bash_json | case_ "Bash again with no .rs file changed: silent" quiet
printf 'pub fn f() -> u8 { "y" }\n' > "$P/crates/demo/src/extra.rs"
bash_json | case_ "Bash after the file changed again: reported again" "$CTX"'cargo check --offline -p demo failed.*extra.rs'
reset
printf 'pub fn f() -> u8 {\n    1\n}\n' > "$P/crates/demo/src/extra.rs"; printf '\npub mod extra;\n' >> "$LIB"
git -C "$P" add -A && git -C "$P" -c user.email=t@t -c user.name=t commit -qm extra
bash_json | case_ "a committed, clean module: silent" quiet
rm "$P/crates/demo/src/extra.rs"
bash_json | case_ "Bash deletes a module lib.rs still declares: its crate is checked" "$CTX"'cargo check --offline -p demo failed.*E0583'
bash_json | case_ "Bash again, same deletion: silent" quiet
git -C "$P" reset -q --hard HEAD~1
cp "$P/crates/demo/Cargo.toml" "$T/demo.toml"
printf "[package]\nauthors = [\"Example\"]\nname = 'demo'\nversion = \"0.1.0\"\nedition = \"2021\"\n" > "$P/crates/demo/Cargo.toml"
printf '\npub fn bad() -> u8 { "x" }\n' >> "$LIB"
edit_json "$LIB" | case_ "single-quoted name after an array: still checked" "$CTX"'cargo check --offline -p demo failed'
cp "$T/demo.toml" "$P/crates/demo/Cargo.toml"
reset

echo "== an untrusted repo is skipped, once per session"
U=$T/elsewhere/proj; crate "$U" demo
printf '\npub fn bad() -> u8 { "x" }\n' >> "$U/crates/demo/src/lib.rs"
edit_json "$U/crates/demo/src/lib.rs" | case_ "untrusted: one skip line" "$CTX$SKIP\"" CLAUDE_PROJECT_DIR="$U"
edit_json "$U/crates/demo/src/lib.rs" | case_ "untrusted again, same session: silent" quiet CLAUDE_PROJECT_DIR="$U"
mkdir -p "$HOME/.config/engineer-agents"; F=$HOME/.config/engineer-agents/trusted-roots
printf '%s\n%s\n' "$HOME/work" "$T/elsewhere" > "$F"; chmod 644 "$F"
edit_json "$U/crates/demo/src/lib.rs" | case_ "root added in trusted-roots: checked" "$CTX"'.*cargo check --offline -p demo failed' CLAUDE_PROJECT_DIR="$U"
chmod 666 "$F"
edit_json "$U/crates/demo/src/lib.rs" | case_ "world-writable trusted-roots: refused" "$CTX"'hook could not run: .*no one else can write' CLAUDE_PROJECT_DIR="$U"
rm "$F"; printf '%s\n%s\n' "$HOME/work" "$T/elsewhere" > "$T/roots"; ln -s "$T/roots" "$F"
edit_json "$U/crates/demo/src/lib.rs" | case_ "symlinked trusted-roots: refused" "$CTX"'hook could not run: .*symlink is refused' CLAUDE_PROJECT_DIR="$U"
rm "$F"; base_roots

echo "== env is neutralized; package names are list items"
LOGC=$T/logcargo; mkdir -p "$LOGC"
cat > "$LOGC/cargo" <<SH
#!/bin/sh
case "\$1" in locate-project) exit 1 ;; esac
printf '%s\n' "\$@" > "$T/cargo-argv"
printf 'TC=%s W=%s WW=%s RF=%s ERF=%s\n' "\$RUSTUP_TOOLCHAIN" "\$RUSTC_WRAPPER" "\$RUSTC_WORKSPACE_WRAPPER" "\$RUSTFLAGS" "\$CARGO_ENCODED_RUSTFLAGS" > "$T/cargo-env"
SH
chmod +x "$LOGC/cargo"
want_tc=$(rustup default | cut -d' ' -f1)
printf '\npub fn sub(a: u8, b: u8) -> u8 {\n    a.wrapping_sub(b)\n}\n' >> "$LIB"
edit_json "$LIB" | case_ "hostile env: cargo runs, silent" quiet PATH="$LOGC:$PATH" RUSTUP_TOOLCHAIN=evil \
  RUSTC_WRAPPER=/tmp/evil RUSTC_WORKSPACE_WRAPPER=/tmp/evil RUSTFLAGS=-Cevil CARGO_ENCODED_RUSTFLAGS=-Cevil
[ "$(cat "$T/cargo-env")" = "TC=$want_tc W= WW= RF= ERF=" ] && pass_ "no pin: toolchain is rustup default ($want_tc), wrappers and rustflags cleared" \
  || fail_ "cargo env: $(cat "$T/cargo-env")"
grep -qx -- '-p' "$T/cargo-argv" && grep -qx 'demo' "$T/cargo-argv" \
  && pass_ "cargo got '-p' and 'demo' as separate argv items" || fail_ "cargo argv: $(tr '\n' ' ' < "$T/cargo-argv")"
for bad in 'demo --config x' '-Zdemo'; do
  rm -f "$T/cargo-argv"; sed -i.bak "s/^name = \"demo\"/name = \"$bad\"/" "$P/crates/demo/Cargo.toml"
  edit_json "$LIB" | case_ "name '$bad': skipped" "$CTX"'skipped: package name' PATH="$LOGC:$PATH"
  [ ! -e "$T/cargo-argv" ] && pass_ "cargo never ran for '$bad'" || fail_ "cargo ran for '$bad'"
  mv "$P/crates/demo/Cargo.toml.bak" "$P/crates/demo/Cargo.toml"
done
reset

echo "== the repo's pinned toolchain is used when installed; the hook installs nothing"
FR=$T/fakerust; mkdir -p "$FR"
cat > "$FR/rustup" <<SH
#!/bin/sh
printf '%s\n' "\$*" >> "$T/rustup-calls"
case "\$*" in
  default) echo "stable-x86_64-test (default)" ;;
  "toolchain list") printf 'stable-x86_64-test (active, default)\n1.70.0-aarch64-other\n1.70.0-x86_64-test\n' ;;
  show) printf 'Default host: x86_64-test\n' ;;
  *) exit 1 ;;
esac
SH
cat > "$FR/cargo" <<SH
#!/bin/sh
case "\$1" in locate-project) exit 1 ;; esac
printf 'TC=%s AI=%s\n' "\$RUSTUP_TOOLCHAIN" "\$RUSTUP_AUTO_INSTALL" > "$T/pin-env"
echo "src/lib.rs:1:1: error: fake"; exit 101
SH
chmod +x "$FR/rustup" "$FR/cargo"
printf '[toolchain]\nchannel = "1.70.0"\n' > "$P/rust-toolchain.toml"
edit_json "$LIB" | case_ "pinned and installed: checked, report names the toolchain" "$CTX"'cargo check --offline -p demo failed \(toolchain 1.70.0-x86_64-test\)' PATH="$FR:$PATH"
[ "$(cat "$T/pin-env")" = "TC=1.70.0-x86_64-test AI=0" ] && pass_ "cargo ran on the pin for this host (a cross toolchain listed first), auto-install off" || fail_ "pin env: $(cat "$T/pin-env")"
rm -f "$T/pin-env"; printf '[toolchain]\nchannel = "1.60.0"\n' > "$P/rust-toolchain.toml"
edit_json "$LIB" | case_ "pinned, not installed: one skip line" "$CTX"'skipped: .*rust-toolchain.toml pins toolchain 1.60.0, which is not installed' PATH="$FR:$PATH"
edit_json "$LIB" | case_ "not installed again, same session: silent" quiet PATH="$FR:$PATH"
[ ! -e "$T/pin-env" ] && pass_ "cargo check never ran on the missing pin" || fail_ "cargo ran: $(cat "$T/pin-env")"
grep -q install "$T/rustup-calls" && fail_ "rustup was asked to install: $(tr '\n' ';' < "$T/rustup-calls")" || pass_ "rustup was only asked default, show and toolchain list"
rm -f "$P/rust-toolchain.toml"; printf '[toolchain]\nchannel = "/tmp/evil"\n' > "$P/rust-toolchain.toml"
edit_json "$LIB" | case_ "a path as channel: skipped, never passed to rustup" "$CTX"'skipped: .*names no channel this hook can use' PATH="$FR:$PATH"
reset

echo "== the workspace must be inside the project"
O=$HOME/work/outer; mkdir -p "$O/inner/src"
printf '[workspace]\nmembers = ["inner"]\nresolver = "2"\n' > "$O/Cargo.toml"
printf '[package]\nname = "inner"\nversion = "0.1.0"\nedition = "2021"\n' > "$O/inner/Cargo.toml"
printf 'pub fn bad() -> u8 { "x" }\n' > "$O/inner/src/lib.rs"
edit_json "$O/inner/src/lib.rs" | case_ "workspace above the project: skipped, not checked" "$CTX"'.*skipped: inner.s cargo workspace .* is outside the project' CLAUDE_PROJECT_DIR="$O/inner"

pass=$(grep -c pass "$R"); failed=$(grep -c fail "$R")
echo "== $pass passed, $failed failed"
[ "$failed" -eq 0 ]
