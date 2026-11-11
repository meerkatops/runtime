#!/bin/sh
# Proves typescript-engineer's one hook (PostToolUse Edit|Write|Bash: tsc on the project that includes the file,
# fed back as information) by piping hook input to ts-engineer.py. HOME is a scratch dir, and a trusted-roots
# file there trusts ~/work. Every case also fails if any output carries `decision` or `permissionDecision`: the hook never blocks.
# Needs python3, git and node on PATH, and a typescript package to copy into the test projects.
# Usage: TMPDIR=<writable dir> [TS_PKG=<dir of a typescript package>] sh test-ts-hooks.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/ts-engineer.py"
PY=$(command -v python3)
T=$(mktemp -d "${TMPDIR:-/tmp}/ts-engineer-hooks.XXXXXX") || exit 1
T=$(cd "$T" && pwd -P)
trap 'rm -rf "$T"' EXIT
TS_PKG=${TS_PKG:-$(npm root -g 2>/dev/null)/typescript}
[ -f "$TS_PKG/bin/tsc" ] && [ -f "$TS_PKG/lib/typescript.js" ] || { echo "FAIL TS_PKG=$TS_PKG must be a TypeScript 5 or 6 package (bin/tsc and lib/typescript.js; TypeScript 7 has no JS compiler API)"; exit 1; }
export HOME="$T/home" XDG_STATE_HOME="$T/state"
mkdir -p "$HOME/.config/engineer-agents"; base_roots() { printf '%s\n' "$HOME/work" > "$HOME/.config/engineer-agents/trusted-roots"; chmod 644 "$HOME/.config/engineer-agents/trusted-roots"; }; base_roots
P="$HOME/work/proj"; U="$T/elsewhere/proj"; OUT="$T/outside"
export CLAUDE_PROJECT_DIR="$P"
unset TYPESCRIPT_ENGINEER_DEADLINE_S CLAUDE_PLUGIN_DATA
mkproj() {
  mkdir -p "$1/src"
  printf '{ "compilerOptions": { "strict": true, "noEmit": true, "module": "nodenext", "target": "es2023", "types": [] }, "include": ["src"] }\n' > "$1/tsconfig.json"
  printf 'export const n: number = 1;\n' > "$1/src/ok.ts"
  printf 'node_modules/\n' > "$1/.gitignore"
  mkdir -p "$1/node_modules"; cp -cR "$TS_PKG" "$1/node_modules/typescript" 2>/dev/null || cp -R "$TS_PKG" "$1/node_modules/typescript"
  git -C "$1" init -q && git -C "$1" add -A && git -C "$1" -c user.email=t@t -c user.name=t commit -qm init
}
mkproj "$P"; mkproj "$U"; mkdir -p "$OUT"

pass=0; fail=0
ok() { pass=$((pass+1)); echo "PASS $1"; }
no() { fail=$((fail+1)); echo "FAIL $1"; echo "     got: $(printf '%s' "$2" | head -c 500)"; }
A='"agent_type":"typescript-engineer","session_id":"test-'$$'","agent_id":"a1","hook_event_name":"PostToolUse"'
# judge NAME WANT(report|silent) OUTPUT [grep-text]
judge() {
  okk=""
  case "$2" in
    silent) [ -z "$3" ] && okk=y ;;
    report) printf '%s' "$3" | grep -q '"additionalContext"' && okk=y ;;
  esac
  if [ -n "${4:-}" ] && [ "$okk" = y ]; then printf '%s' "$3" | grep -q -- "$4" || okk=""; fi
  if printf '%s' "$3" | grep -q '"decision"\|permissionDecision'; then okk=""; fi  # never a block
  if [ "$okk" = y ]; then ok "$1"; else no "$1" "$3"; fi
}
hook() { "$PY" "$HOOK" --agent typescript-engineer 2>&1; }
edit_in() { printf '{%s,"tool_name":"Edit","tool_input":{"file_path":"%s"}}' "$A" "$1"; }
bash_in() { printf '{%s,"tool_name":"Bash","tool_input":{"command":"echo"}}' "$A"; }

echo "== a trusted repo is checked"
judge "green edit is silent" silent "$(edit_in "$P/src/ok.ts" | hook)"
printf 'export const n: number = "one";\n' > "$P/src/ok.ts"
judge "type error is reported, not blocked" report "$(edit_in "$P/src/ok.ts" | hook)" "tsc --noEmit -p tsconfig.json: 1 error(s)"
printf 'export const n: number = "two";\n' > "$P/src/ok.ts"
judge "Bash breaking types is reported" report "$(bash_in | hook)" "TS2322"
git -C "$P" checkout -q -- src/ok.ts

echo "== a deleted file's project is checked"
printf 'export const dep: number = 1;\n' > "$P/src/dep.ts"
printf 'import { dep } from "./dep.js";\n\nexport const use: number = dep;\n' > "$P/src/use.ts"
git -C "$P" add -A && git -C "$P" -c user.email=t@t -c user.name=t commit -qm dep
judge "a committed, clean import: silent" silent "$(bash_in | hook)"
rm "$P/src/dep.ts"
judge "Bash deletes an imported module: the importer's error is reported" report "$(bash_in | hook)" "src/use.ts(1,21): error TS2307"
judge "Bash again, same deletion: silent" silent "$(bash_in | hook)"
git -C "$P" reset -q --hard HEAD~1

echo "== a file created after the Program was cached, imported from outside include, is still checked"
mkdir -p "$P/lib"
printf 'import { later } from "../lib/later.js";\n\nexport const got: number = later;\n' > "$P/src/late.ts"
printf 'export const other = 1;\n' > "$P/lib/other.ts"
edit_in "$P/lib/other.ts" | hook >/dev/null  # builds and caches the Program, which cannot resolve lib/later.ts
printf 'export const later: number = "two";\n' > "$P/lib/later.ts"
judge "the new imported file is checked, not called outside every tsconfig" report "$(edit_in "$P/lib/later.ts" | hook)" "lib/later.ts(1,14): error TS2322"
rm -rf "$P/lib" "$P/src/late.ts"

echo "== an untrusted repo is skipped, once per session"
printf 'export const n: number = "one";\n' > "$U/src/ok.ts"
got=$(edit_in "$U/src/ok.ts" | CLAUDE_PROJECT_DIR="$U" hook)
judge "untrusted: the one skip line" report "$got" '"additionalContext": "not a trusted repo; type check skipped"}'
judge "untrusted again, same session: silent" silent "$(edit_in "$U/src/ok.ts" | CLAUDE_PROJECT_DIR="$U" hook)"
mkdir -p "$HOME/.config/engineer-agents"; F="$HOME/.config/engineer-agents/trusted-roots"
printf '%s\n%s\n' "$HOME/work" "$T/elsewhere" > "$F"; chmod 644 "$F"
judge "root added in trusted-roots: checked" report "$(edit_in "$U/src/ok.ts" | CLAUDE_PROJECT_DIR="$U" hook)" "TS2322"
chmod 666 "$F"
judge "world-writable trusted-roots: refused" report "$(edit_in "$U/src/ok.ts" | CLAUDE_PROJECT_DIR="$U" hook)" "no one else can write"
rm "$F"; printf '%s\n%s\n' "$HOME/work" "$T/elsewhere" > "$T/roots"; ln -s "$T/roots" "$F"
judge "symlinked trusted-roots: refused" report "$(edit_in "$U/src/ok.ts" | CLAUDE_PROJECT_DIR="$U" hook)" "symlink is refused"
rm "$F"; base_roots

echo "== tsc only from the project's own node_modules"
mv "$P/node_modules/typescript" "$T/ts-aside"
judge "no typescript in the project: one skip line" report "$(edit_in "$P/src/ok.ts" | hook)" '"additionalContext": "no tsc in this project; skipped"}'
judge "no typescript again, same session: silent" silent "$(edit_in "$P/src/ok.ts" | hook)"
ln -s "$T/ts-aside" "$P/node_modules/typescript"
printf 'export const n: number = "x";\n' > "$P/src/ok.ts"
judge "typescript symlinked from outside the project: not used" silent "$(edit_in "$P/src/ok.ts" | hook)"
rm "$P/node_modules/typescript"; mv "$T/ts-aside" "$P/node_modules/typescript"
judge "the project's own typescript checks" report "$(edit_in "$P/src/ok.ts" | hook)" "TS2322"
git -C "$P" checkout -q -- src/ok.ts

echo "== files outside the project are ignored"
printf 'export const s: number = "x";\n' > "$OUT/x.ts"
ln -s "$OUT/x.ts" "$P/src/link.ts"
judge "file outside project ignored" silent "$(edit_in "$OUT/x.ts" | hook)"
judge "symlink to outside ignored"   silent "$(edit_in "$P/src/link.ts" | hook)"
rm "$P/src/link.ts"

echo "== one hook entry serves each agent it names, and no other"
# react-engineer shares this hook: hooks.json names both agents on one command.
both() { "$PY" "$HOOK" --agent typescript-engineer --agent react-engineer 2>&1; }
as_agent() { printf '{"agent_type":"%s","session_id":"test-%s-%s","agent_id":"a2","hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"%s"}}' "$1" "$$" "$1" "$2"; }
printf 'export const view: number = "x";\n' > "$P/src/view.tsx"
judge "react-engineer on a .tsx file: reported" report "$(as_agent react-engineer "$P/src/view.tsx" | both)" "src/view.tsx(1,14): error TS2322"
judge "the plugin's react-engineer: reported" report "$(as_agent runtime-engineering:react-engineer "$P/src/view.tsx" | both)" "TS2322"
judge "another plugin's react-engineer: silent" silent "$(as_agent other-plugin:react-engineer "$P/src/view.tsx" | both)"
judge "typescript-engineer, same entry: reported" report "$(as_agent typescript-engineer "$P/src/view.tsx" | both)" "TS2322"
# The report names the agent the hook ran for, never the other agent the entry serves.
names() { [ "$(printf '%s' "$3" | grep -c -- "$2 tsc report")" = 1 ] && ! printf '%s' "$3" | grep -q -- "$4 tsc report" && ok "$1" || no "$1" "$3"; }
names "react-engineer's report names react-engineer" react-engineer "$(as_agent react-engineer "$P/src/view.tsx" | both)" typescript-engineer
names "the plugin's react-engineer's report names react-engineer" react-engineer "$(as_agent runtime-engineering:react-engineer "$P/src/view.tsx" | both)" typescript-engineer
names "typescript-engineer's report names typescript-engineer" typescript-engineer "$(as_agent typescript-engineer "$P/src/view.tsx" | both)" react-engineer
judge "an agent the entry does not name: silent" silent "$(as_agent python-engineer "$P/src/view.tsx" | both)"
judge "the main session: silent" silent "$(printf '{"session_id":"test-main","hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"%s"}}' "$P/src/view.tsx" | both)"
judge "react-engineer, entry naming only typescript-engineer: silent" silent "$(as_agent react-engineer "$P/src/view.tsx" | hook)"
rm "$P/src/view.tsx"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
