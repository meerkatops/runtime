#!/bin/sh
# The secret scan: the gitleaks CLI's built-in rules at the installed version (no config file is vendored),
# inline gitleaks:allow marks ignored and no repo ignore file read. Only errors are logged, so anything on stderr
# is a scanner failure and never reads as clean. History and range scans read the committed bytes: no textconv,
# no external diff, and merge commits diffed against each parent, so a secret that exists only in a merge is seen.
#   ci/gitleaks.sh          the working tree
#   ci/gitleaks.sh <revs>   the commits <revs> names: HEAD for the history, <base>..<head> for a range
#   The working tree is the files git lists (tracked, and untracked but not ignored), never build output; outside
#   git (a CI run that unpacks the committed tree alone) every file but target/ and .git, as committed.
# Exit 0 clean (an empty range is clean); 1 a secret found, rule and file only; 2 the scan could not run.
set -u
cd "$(dirname "$0")/.." || exit 2
command -v gitleaks >/dev/null 2>&1 || { echo "gitleaks: not on PATH; brew install gitleaks" >&2; exit 2; }
# The built-in rules, and only them: gitleaks would otherwise read a config from the env or from a .gitleaks.toml in
# the scanned tree, so a repo could weaken its own scan. Both paths are closed here, fail-closed.
unset GITLEAKS_CONFIG GITLEAKS_CONFIG_TOML
for f in .gitleaks.toml .gitleaksignore; do
  if [ -e "$f" ] || git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "gitleaks: $f in the tree would change the scan; remove it" >&2; exit 2
  fi
done
work=$(mktemp -d "${TMPDIR:-/tmp}/gitleaks.XXXXXX")
trap 'rm -rf "$work"' EXIT
set -- "${1:-}"
own="--no-banner --redact --log-level error --ignore-gitleaks-allow"
if [ -z "$1" ]; then
  # gitleaks dir reads no .gitignore, so it would scan target/'s build output (a .rmeta there matches a rule): scan a
  # copy of git's file list instead, tracked and untracked but not ignored, each path as git names it.
  # Each stage is checked on its own, so a failed list or copy exits 2 and never reads as a clean scan.
  mkdir "$work/tree" || exit 2
  # A git checkout only when git's top level is this folder: a tree unpacked inside another repo, or a GIT_DIR from
  # the environment, would otherwise list that repo's files and scan none of these.
  unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_COMMON_DIR
  if [ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$(pwd -P)" ]; then
    git ls-files -z -co --exclude-standard >"$work/all" 2>"$work/copy-err" || { cat "$work/copy-err" >&2; exit 2; }
  else
    # No .git (a CI run that unpacks the committed tree alone).
    # Only target/ and .git are skipped: the committed tree is what is scanned, so a .gitignore in it never narrows
    # the scan (a file committed under an ignored folder is scanned, as git ls-files -c lists it).
    set -- -path ./target -o -path ./.git
    find . \( "$@" \) -prune -o -type f -print0 >"$work/all" 2>"$work/copy-err" || { cat "$work/copy-err" >&2; exit 2; }
    set -- ""
  fi
  xargs -0 sh -c 'for f do if [ -f "$f" ]; then printf "%s\0" "$f"; fi; done' sh <"$work/all" >"$work/files" 2>>"$work/copy-err" || {
    cat "$work/copy-err" >&2; exit 2; }
  tar --null -T "$work/files" -cf "$work/tree.tar" 2>>"$work/copy-err" || { cat "$work/copy-err" >&2; exit 2; }
  tar -xf "$work/tree.tar" -C "$work/tree" 2>>"$work/copy-err" || { cat "$work/copy-err" >&2; exit 2; }
  if [ -s "$work/copy-err" ]; then cat "$work/copy-err" >&2; echo "gitleaks: copying the tree logged an error" >&2; exit 2; fi
  if [ -s "$work/all" ] && [ -z "$(ls -A "$work/tree")" ]; then echo "gitleaks: git lists files but none were copied" >&2; exit 2; fi
  if [ ! -s "$work/all" ] && [ -n "$(find . \( -path ./target -o -path ./.git \) -prune -o -type f -print | head -1)" ]; then
    echo "gitleaks: no file listed, but the tree holds files" >&2; exit 2
  fi
  # shellcheck disable=SC2086 # one word per option
  (cd "$work/tree" && gitleaks dir $own --gitleaks-ignore-path "$work/none" --report-format json \
    --report-path "$work/report.json" .) 2>"$work/err"
  code=$?
else
  # gitleaks splits its log options at spaces, so a revision holding one, or an option, is refused.
  case "$1" in -* | *[[:space:]]*) echo "gitleaks: $1 is not a revision or range" >&2; exit 2 ;; esac
  if ! count=$(git rev-list --count "$1" 2>"$work/err"); then
    cat "$work/err" >&2
    exit 2
  fi
  if [ "$count" -eq 0 ]; then
    echo "gitleaks: $1 holds no commit, so it is clean"
    exit 0
  fi
  # shellcheck disable=SC2086 # one word per option
  gitleaks git $own --gitleaks-ignore-path "$work/none" --report-format json --report-path "$work/report.json" \
    --log-opts="--no-textconv --no-ext-diff --diff-merges=separate $1" . 2>"$work/err"
  code=$?
fi
if [ -s "$work/err" ]; then
  cat "$work/err" >&2
  echo "gitleaks: the scanner logged an error, so the scan is not clean" >&2
  exit 2
fi
case $code in
  0) echo "gitleaks: clean" ;;
  1)
    grep -oE '"(RuleID|File)": *"[^"]*"' "$work/report.json" | sed 's/^"[A-Za-z]*": *//' | paste -d' ' - - |
      sed 's/^/gitleaks: found /'
    exit 1
    ;;
  *) echo "gitleaks: exited $code without a verdict" >&2; exit 2 ;;
esac
