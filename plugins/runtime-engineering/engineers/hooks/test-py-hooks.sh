#!/bin/sh
# Proves python-engineer's one hook (PostToolUse Edit|Write|Bash: ruff format, ruff check and the project's type
# checker, fed back as information) by piping hook input to py-engineer.py. HOME is a scratch dir, so ~/work
# there is a trusted root. Every case also fails if any output carries `decision` or `permissionDecision`: the hook
# never blocks. Needs python3, git and uv on PATH (uv builds each test project's .venv with ruff, pyright and mypy).
# Usage: TMPDIR=<writable dir> sh test-py-hooks.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/py-engineer.py"
PY=$(command -v python3)
command -v uv >/dev/null || { echo "FAIL uv is not on PATH"; exit 1; }
T=$(mktemp -d "${TMPDIR:-/tmp}/py-engineer-hooks.XXXXXX") || exit 1
T=$(cd "$T" && pwd -P)
trap 'rm -rf "$T"' EXIT
export HOME="$T/home" XDG_STATE_HOME="$T/state" UV_CACHE_DIR="${UV_CACHE_DIR:-$T/uv-cache}"
mkdir -p "$HOME/.config/engineer-agents"; base_roots() { printf '%s\n' "$HOME/work" > "$HOME/.config/engineer-agents/trusted-roots"; chmod 644 "$HOME/.config/engineer-agents/trusted-roots"; }; base_roots
P="$HOME/work/proj"; U="$T/elsewhere/proj"; OUT="$T/outside"
export CLAUDE_PROJECT_DIR="$P"
unset PYTHON_ENGINEER_DEADLINE_S
GOOD='def double(x: int) -> int:
    return x * 2
'
BAD='def double(x):
    return x * 2
'
mkproj() {
  mkdir -p "$1/src/p"
  printf '[project]\nname = "p"\nversion = "0"\nrequires-python = ">=3.10"\n\n[tool.pyright]\ntypeCheckingMode = "strict"\n' > "$1/pyproject.toml"
  printf '%s' "$GOOD" > "$1/src/p/a.py"
  printf '.venv/\n' > "$1/.gitignore"
  (cd "$1" && uv venv -q .venv && uv pip install -q --python .venv/bin/python ruff pyright mypy) || { echo "FAIL uv could not build $1/.venv"; exit 1; }
  git -C "$1" init -q && git -C "$1" add -A && git -C "$1" -c user.email=t@t -c user.name=t commit -qm init
}
mkproj "$P"; mkproj "$U"; mkdir -p "$OUT"

pass=0; fail=0
ok() { pass=$((pass+1)); echo "PASS $1"; }
no() { fail=$((fail+1)); echo "FAIL $1"; echo "     got: $(printf "%s" "$2" | head -c 1500)"; }
A='"agent_type":"python-engineer","session_id":"test-'$$'","agent_id":"a1","hook_event_name":"PostToolUse"'
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
hook() { "$PY" "$HOOK" --agent python-engineer 2>&1; }
edit_in() { printf '{%s,"tool_name":"Edit","tool_input":{"file_path":"%s"}}' "$A" "$1"; }
bash_in() { printf '{%s,"tool_name":"Bash","tool_input":{"command":"echo"}}' "$A"; }

echo "== a trusted repo is checked"
judge "green edit is silent" silent "$(edit_in "$P/src/p/a.py" | hook)"
printf '%s' "$BAD" > "$P/src/p/a.py"
judge "missing annotation is reported by pyright, not blocked" report "$(edit_in "$P/src/p/a.py" | hook)" "reportMissingParameterType"
printf 'import os\n%s' "$GOOD" > "$P/src/p/a.py"
judge "unused import is reported by ruff" report "$(edit_in "$P/src/p/a.py" | hook)" "F401"
printf 'def double(x: int) -> int:\n    return x*2\n' > "$P/src/p/a.py"
judge "unformatted code is reported" report "$(edit_in "$P/src/p/a.py" | hook)" "unformatted"
printf '%s' "$BAD" > "$P/src/p/a.py"
judge "Bash leaving a type error is reported" report "$(bash_in | hook)" "reportUnknownParameterType"
judge "Bash again with nothing changed: silent" silent "$(bash_in | hook)"
git -C "$P" checkout -q -- src/p/a.py
printf 'from .a import double\n\nFOUR: int = double(2)\n' > "$P/src/p/b.py"; : > "$P/src/p/__init__.py"
git -C "$P" add -A && git -C "$P" -c user.email=t@t -c user.name=t commit -qm b
judge "a committed, clean import: silent" silent "$(bash_in | hook)"
rm "$P/src/p/a.py"
judge "Bash deletes an imported module: the whole project is type-checked" report "$(bash_in | hook)" "src/p/a.py deleted or renamed; its importers are checked:.*pyright, whole project.*src/p/b.py:1:"
judge "Bash again, same deletion: silent" silent "$(bash_in | hook)"
printf '[mypy]\n' > "$P/mypy.ini"
printf '\n' >> "$P/src/p/b.py"  # a new signature, so the hook looks again
judge "the same deletion under mypy: the whole project is type-checked" report "$(bash_in | hook)" "mypy, whole project.*src/p/b.py:1: error"
git -C "$P" reset -q --hard HEAD~1; rm -f "$P/mypy.ini"
judge "another agent: silent" silent "$(edit_in "$P/src/p/a.py" | sed 's/"python-engineer"/"rust-engineer"/' | hook)"

echo "== a worktree the session entered is checked, though CLAUDE_PROJECT_DIR still names the first checkout"
W="$HOME/work/proj-wt"; git -C "$P" worktree add -q "$W" HEAD
(cd "$W" && uv venv -q .venv && uv pip install -q --python .venv/bin/python ruff pyright) || no "worktree venv" ""
printf '%s' "$BAD" > "$W/src/p/a.py"
judge "an edit in the worktree is reported" report "$(edit_in "$W/src/p/a.py" | hook)" "reportMissingParameterType"
judge "Bash run in the worktree is reported" report "$(printf '{%s,"cwd":"%s","tool_name":"Bash","tool_input":{"command":"echo"}}' "$A" "$W" | hook)" "reportUnknownParameterType"
git -C "$P" worktree remove --force "$W"

echo "== mypy when the project configures it, and only from its own environment"
printf '\n[tool.mypy]\nwarn_unused_configs = true\n' >> "$P/pyproject.toml"  # not strict: the hook's --strict is what reports
printf '%s' "$BAD" > "$P/src/p/a.py"
judge "configured mypy runs --strict and reports" report "$(edit_in "$P/src/p/a.py" | hook)" "no-untyped-def"
mv "$P/.venv/bin/mypy" "$T/mypy-aside"
judge "no mypy in the environment: one line, never PATH's" report "$(edit_in "$P/src/p/a.py" | hook)" "configures mypy but its environment has none"
judge "no mypy again, same session: silent" silent "$(edit_in "$P/src/p/a.py" | hook)"
mv "$T/mypy-aside" "$P/.venv/bin/mypy"
git -C "$P" checkout -q -- pyproject.toml src/p/a.py
printf '%s' "$BAD" > "$P/src/p/a.py"
for cfg in mypy.ini .mypy.ini setup.cfg; do  # the files mypy reads besides pyproject.toml, each with a [mypy] section
  printf '[mypy]\nwarn_unused_configs = True\n' > "$P/$cfg"
  judge "$cfg configures mypy: mypy runs" report "$(edit_in "$P/src/p/a.py" | hook)" "no-untyped-def"
  rm "$P/$cfg"
done
printf '[flake8]\nmax-line-length = 100\n' > "$P/setup.cfg"
judge "setup.cfg without a [mypy] section: pyright runs" report "$(edit_in "$P/src/p/a.py" | hook)" "reportMissingParameterType"
rm "$P/setup.cfg"; git -C "$P" checkout -q -- src/p/a.py

echo "== an untrusted repo is skipped, once per session"
printf '%s' "$BAD" > "$U/src/p/a.py"
judge "untrusted: the one skip line" report "$(edit_in "$U/src/p/a.py" | CLAUDE_PROJECT_DIR="$U" hook)" '"additionalContext": "not a trusted repo; type check skipped"}'
judge "untrusted again, same session: silent" silent "$(edit_in "$U/src/p/a.py" | CLAUDE_PROJECT_DIR="$U" hook)"
mkdir -p "$HOME/.config/engineer-agents"; F="$HOME/.config/engineer-agents/trusted-roots"
printf '%s\n%s\n' "$HOME/work" "$T/elsewhere" > "$F"; chmod 644 "$F"
judge "root added in trusted-roots: checked" report "$(edit_in "$U/src/p/a.py" | CLAUDE_PROJECT_DIR="$U" hook)" "reportMissingParameterType"
chmod 666 "$F"
judge "world-writable trusted-roots: refused" report "$(edit_in "$U/src/p/a.py" | CLAUDE_PROJECT_DIR="$U" hook)" "no one else can write"
rm "$F"; base_roots

echo "== files outside the project are ignored"
printf '%s' "$BAD" > "$OUT/x.py"
ln -s "$OUT/x.py" "$P/src/p/link.py"
judge "file outside project ignored" silent "$(edit_in "$OUT/x.py" | hook)"
judge "symlink to outside ignored"   silent "$(edit_in "$P/src/p/link.py" | hook)"
rm "$P/src/p/link.py"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
