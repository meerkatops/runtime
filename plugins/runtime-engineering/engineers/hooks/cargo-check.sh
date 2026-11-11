#!/bin/sh
# Launcher for cargo-check.py (PostToolUse on Edit|Write|Bash): checks python3 first, so a
# missing interpreter, or one older than 3.11, is reported as "hook could not run", never a silent pass.
# It reports; it never blocks. Usage: cargo-check.sh [--agent NAME]
here=$(cd "$(dirname "$0")" && pwd)
if ! command -v python3 >/dev/null 2>&1; then
  cat >/dev/null  # drain stdin
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' \
    'hook could not run: python3 (not on PATH). cargo check did not run; run it yourself and report the hook problem.'
  exit 0
fi
if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' 2>/dev/null; then
  cat >/dev/null  # drain stdin
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' \
    'hook could not run: python3 is older than 3.11 (it needs tomllib). cargo check did not run; run it yourself and report the hook problem.'
  exit 0
fi
exec python3 "$here/cargo-check.py" "$@"
