#!/usr/bin/env bash
# Runtime status line for Claude Code. Two lines:
#   ▶ working this session  (or ◼ idle on repo:branch)
#   ctx ██░░░░░░░░ 21% | 5h 30% | 7d 76% | Model·effort | repo:branch
# Percentages are green under 50, yellow under 80, red from 80.
# Reads only the JSON Claude Code passes on stdin, and git. Writes nothing.
# Needs bash, jq and git.

input=$(cat)

GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; RED=$'\033[0;31m'
DIM=$'\033[0;90m'; CYAN=$'\033[0;36m'; MAGENTA=$'\033[0;35m'; RESET=$'\033[0m'

color_for() {
  if [ "$1" -ge 80 ]; then printf '%s' "$RED"
  elif [ "$1" -ge 50 ]; then printf '%s' "$YELLOW"
  else printf '%s' "$GREEN"; fi
}
# a file's age in seconds, on macOS and Linux
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

# One jq call. Fields are joined on the unit separator (0x1f), not a tab: bash collapses runs of tabs,
# so an empty field would shift every field after it.
ctx=""; h5=""; d7=""; model=""; effort=""; cwd=""; wt=""; tp=""
IFS=$'\037' read -r ctx h5 d7 model effort cwd wt tp < <(
  printf '%s' "$input" | jq -r '[
    (.context_window.used_percentage        // ""),
    (.rate_limits.five_hour.used_percentage // ""),
    (.rate_limits.seven_day.used_percentage // ""),
    (.model.display_name                    // ""),
    (.effort.level                          // ""),
    (.workspace.current_dir // .cwd         // ""),
    (.workspace.git_worktree                // ""),
    (.transcript_path                       // "")
  ] | map(tostring | gsub("[\u0000-\u001f]"; " ")) | join("\u001f")' 2>/dev/null
) || true

parts=()

# Working or idle. A subagent writes <transcript>/subagents/agent-<id>.jsonl as it works; one written in the
# last 90 seconds is working. The session itself is working while its transcript was written in the last 20.
{
  now=$(date +%s); runs=""; subs=""; nsubs=0
  if [ -n "$tp" ] && [ -d "${tp%.jsonl}/subagents" ]; then
    for f in "${tp%.jsonl}"/subagents/agent-*.jsonl; do
      [ -f "$f" ] || continue
      [ $(( now - $(mtime "$f") )) -le 90 ] || continue
      nsubs=$(( nsubs + 1 ))
      desc=$(jq -r '.description // empty' "${f%.jsonl}.meta.json" 2>/dev/null)
      subs+="${subs:+, }${desc:-a subagent}"
    done
  fi
  [ "$nsubs" -gt 0 ] && runs="$([ "$nsubs" -gt 1 ] && echo "$nsubs subagents" || echo subagent): ${subs}"
  if [ -z "$runs" ] && [ -n "$tp" ] && [ $(( now - $(mtime "$tp") )) -le 20 ]; then runs="this session"; fi
  if [ -n "$runs" ]; then parts+=("${GREEN}▶ working${RESET} ${runs}"); else parts+=("${DIM}◼ idle${RESET}"); fi
} 2>/dev/null || true

if [ -n "$ctx" ]; then
  ci=$(printf '%.0f' "$ctx"); width=10
  filled=$(( (ci * width + 50) / 100 ))
  [ "$filled" -gt "$width" ] && filled=$width
  [ "$filled" -lt 0 ] && filled=0
  bar=""
  for ((b=0; b<filled; b++)); do bar+="█"; done
  for ((b=filled; b<width; b++)); do bar+="░"; done
  parts+=("${DIM}ctx${RESET} $(color_for "$ci")${bar}${RESET} ${DIM}${ci}%${RESET}")
fi
if [ -n "$h5" ]; then hi=$(printf '%.0f' "$h5"); parts+=("$(color_for "$hi")5h ${hi}%${RESET}"); fi
if [ -n "$d7" ]; then di=$(printf '%.0f' "$d7"); parts+=("$(color_for "$di")7d ${di}%${RESET}"); fi
if [ -n "$model" ]; then
  seg="${MAGENTA}${model}${RESET}"
  [ -n "$effort" ] && seg="${seg}${DIM}·${effort}${RESET}"
  parts+=("$seg")
fi

# repo:branch, asked of the session's own folder, so it is right wherever Claude Code runs this from
loc=""
if top=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null); then
  loc="${CYAN}$(basename "$top")${RESET}"
  branch=$(git -C "${cwd:-.}" branch --show-current 2>/dev/null)
  [ -n "$branch" ] && loc="${loc}${DIM}:${RESET}${CYAN}${branch}${RESET}"
fi
[ -n "$wt" ] && loc="${loc}${YELLOW} [wt:${wt}]${RESET}"
case "${parts[0]}" in *"idle"*) [ -n "$loc" ] && parts[0]="${parts[0]} ${DIM}on${RESET} ${loc}" ;; esac

# plain %s, never %b, so the slider's characters stay whole
out=""
if [ "${#parts[@]}" -gt 0 ]; then
  out="${parts[0]}"; rest=""
  for i in "${!parts[@]}"; do
    [ "$i" -eq 0 ] && continue
    rest+="${rest:+ ${DIM}|${RESET} }${parts[$i]}"
  done
  [ -n "$rest" ] && out+=$'\n'"$rest"
fi
printf '%s' "$out"
