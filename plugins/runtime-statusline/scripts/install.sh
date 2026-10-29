#!/usr/bin/env bash
# Points Claude Code's status line at the newest installed copy of this plugin, so every plugin update reaches it
# with no second step. Keeps a copy of settings.json first. Run it again any time; it only sets statusLine.
set -euo pipefail
command -v jq >/dev/null || { echo "jq is needed: brew install jq (macOS) or apt install jq (Linux)"; exit 1; }
S="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"; [ -f "$S" ] || echo '{}' > "$S"
cp "$S" "$S.bak-statusline"
CMD='bash -c '"'"'d=$(ls -d "$HOME"/.claude/plugins/cache/*/runtime-statusline/*/ 2>/dev/null | sort -V | tail -1); [ -n "$d" ] && exec bash "${d}scripts/statusline.sh"'"'"
echo "Was: $(jq -c '.statusLine // "none"' "$S")"
jq --arg c "$CMD" '.statusLine = {type: "command", command: $c, refreshInterval: 15}' "$S" > "$S.tmp" && mv "$S.tmp" "$S"
echo "Now: the newest installed runtime-statusline. Saved the old settings as $S.bak-statusline"
