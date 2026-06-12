#!/usr/bin/env bash
set -euo pipefail
# Zobrazí stav agentů: co mají v inboxu a jaký je jejich current-task status
ROOT="${1:-.}"

printf '=== Agent Status ===\n\n'
for d in "$ROOT"/agents/*; do
  [[ -d "$d" ]] || continue
  slug="$(basename "$d")"
  status="$(grep 'Status:' "$d/state/current-task.md" 2>/dev/null | head -1 | sed 's/.*Status: //' | tr -d ' \r' || echo 'unknown')"
  inbox="$(find "$d/context/inbox" -name "*.md" ! -name ".gitkeep" 2>/dev/null | wc -l | tr -d ' ')"
  printf '%-20s  status: %-12s  inbox: %s\n' "$slug" "$status" "$inbox"
done

printf '\n=== Aktivní iterace ===\n'
find "$ROOT/orchestration/runs" -name "plan.md" | sort | while read -r plan; do
  iter="$(basename "$(dirname "$plan")")"
  status_line="$(grep 'Status:' "$plan" 2>/dev/null | head -1 || echo 'Status: unknown')"
  open="$(grep -c '^\- \[ \]' "$plan" 2>/dev/null || true)"
  done="$(grep -c '^\- \[x\]' "$plan" 2>/dev/null || true)"
  printf '  %s  [%s]  open: %s  done: %s\n' "$iter" "$status_line" "$open" "$done"
done
