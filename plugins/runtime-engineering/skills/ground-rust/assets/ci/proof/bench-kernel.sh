#!/bin/sh
# A kernel's benchmark gate, the example for ci/proof/bench-<kernel>.sh: criterion under [profile.bench] (inherits
# release, so the number is the shipped number) against the checked-in baseline ci/proof/bench-<kernel>.baseline.
# The baseline's comment lines name corpus hash, toolchain, CPU, features, thread count and the baseline sha; each
# measure line is "<bench> <budget> <unit> <noise>", the noise being the A/A floor measured on this machine (two runs
# of one build, the larger relative gap, in percent of the budget). Criterion's FAQ: don't rely on CI wall time, so
# a breach blocks only when the budget is at least 3x that floor and the breach reproduces on a
# second run; otherwise it is printed as "recorded" for the backlog and the proof passes. A new baseline is written by
# a person in a reviewed change, never by this script. Runs on a developer machine before a release, never in CI.
# Prints "bench-<kernel>: ok" or the regressed measure.
set -eu
cd "$(dirname "$0")/../.."
command -v cargo >/dev/null 2>&1 || PATH="$HOME/.cargo/bin:$PATH"
kernel="<kernel>"
crate="<product>-core"
baseline="ci/proof/bench-$kernel.baseline"
margin_pct=10
[ -f "$baseline" ] || { echo "bench-$kernel: $baseline is missing; the budget is agreed before the change" >&2; exit 2; }
work=$(mktemp -d "${TMPDIR:-/tmp}/bench.XXXXXX")
trap 'rm -rf "$work"' EXIT
# One run: cargo bench's output to a file, its exit checked on its own, then the time lines parsed.
run() {
  if ! cargo bench --locked -p "$crate" --bench "$kernel" -- --noplot --save-baseline run >"$work/bench.out" 2>&1; then
    cat "$work/bench.out" >&2
    return 1
  fi
  # A time line is "<name>  time: [low unit mid unit high unit]"; criterion puts a long name on the line before it
  # and indents the time line, so the name is the time line's first field or else the previous line's.
  awk '/time:[[:space:]]*\[/ {
         name = ($0 ~ /^[^[:space:]]/) ? $1 : prev
         line = $0; sub(/.*time:[[:space:]]*\[/, "", line); sub(/\].*/, "", line); split(line, f, " ")
         if (name != "" && f[3] != "") print name, f[3], f[4]
         next
       }
       NF { prev = $1 }' "$work/bench.out"
}
# The measure `name` in `unit` from a run's output, or nothing.
pick() { printf '%s\n' "$1" | awk -v n="$2" -v u="$3" '$1 == n && $3 == u { print $2 }'; }
# True when `got` is over `budget` by more than the margin.
over() { awk -v g="$1" -v b="$2" -v m="$margin_pct" 'BEGIN { exit !(g > b * (1 + m / 100)) }'; }
first=$(run) || { echo "bench-$kernel: cargo bench could not run" >&2; exit 2; }
[ -n "$first" ] || { echo "bench-$kernel: no measurement parsed; the bench did not print a time line" >&2; exit 2; }
second=""
blocked=""
recorded=""
while read -r name budget unit noise; do
  case "$name" in \#*|"") continue ;; esac
  [ -n "$noise" ] || { echo "bench-$kernel: $name has no A/A noise floor in $baseline; measure it before gating" >&2; exit 2; }
  got=$(pick "$first" "$name" "$unit")
  [ -n "$got" ] || { echo "bench-$kernel: $name has a budget but no measurement in $unit" >&2; exit 2; }
  over "$got" "$budget" || continue
  # A breach. The budget itself must be at least 3x the noise floor (noise in percent of the budget, so the floor in
  # the budget's unit is budget * noise / 100), else the gate cannot tell a regression from noise.
  if awk -v b="$budget" -v n="$noise" 'BEGIN { exit !(b < 3 * b * n / 100) }'; then
    recorded="$recorded $name=$got$unit(budget $budget$unit under 3x noise ${noise}%)"
    continue
  fi
  # Once more under the same load: one sample is not a regression; two are.
  [ -n "$second" ] || second=$(run) || { echo "bench-$kernel: the second run could not run" >&2; exit 2; }
  again=$(pick "$second" "$name" "$unit")
  [ -n "$again" ] || { echo "bench-$kernel: $name vanished from the second run" >&2; exit 2; }
  if over "$again" "$budget"; then
    blocked="$blocked $name=$got$unit,$again$unit(budget $budget$unit)"
  else
    recorded="$recorded $name=$got$unit once, $again$unit on the second run (budget $budget$unit)"
  fi
done <"$baseline"
[ -z "$recorded" ] || echo "bench-$kernel: recorded for the backlog, not blocking:$recorded"
[ -z "$blocked" ] || { echo "bench-$kernel: regressed on both runs:$blocked" >&2; exit 1; }
echo "bench-$kernel: ok"
