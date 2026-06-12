#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
printf 'Dostupní agenti:\n'
find "$ROOT/agents" -mindepth 1 -maxdepth 1 -type d | sort | while read -r d; do
  slug="$(basename "$d")"
  inbox_count="$(find "$d/context/inbox" -name "*.md" ! -name ".gitkeep" 2>/dev/null | wc -l | tr -d ' ')"
  done_count="$(find "$d/context/outbox" -name "done_*.md" 2>/dev/null | wc -l | tr -d ' ')"
  printf '  %-20s  inbox: %s  done notifications: %s\n' "$slug" "$inbox_count" "$done_count"
done
