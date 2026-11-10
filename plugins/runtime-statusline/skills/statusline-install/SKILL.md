---
name: statusline-install
description: Turns on the Runtime status line in Claude Code, pointed at the newest installed copy so plugin updates reach it. Use when the user says "install the status line", "set up the footer" or "turn on runtime-statusline".
---

1. Run `bash "${CLAUDE_SKILL_DIR}/../../scripts/install.sh"` and repeat its lines word for word.
2. Say the status line shows on the next redraw, and that `claude plugin update runtime-statusline@runtime` brings updates with nothing else to do.

If it says jq is needed, give the user its install line and stop. Change nothing else.
