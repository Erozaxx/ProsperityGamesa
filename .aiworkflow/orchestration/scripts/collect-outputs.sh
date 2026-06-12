#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
ITER="${2:?iteration id required}"

TARGET="$ROOT/orchestration/runs/$ITER/collected"
mkdir -p "$TARGET"

while IFS= read -r agent_dir; do
  slug="$(basename "$agent_dir")"
  src="$agent_dir/artifacts/final"
  outbox="$agent_dir/context/outbox"
  if [[ -d "$src" ]]; then
    mkdir -p "$TARGET/$slug/artifacts"
    cp -R "$src"/. "$TARGET/$slug/artifacts/" 2>/dev/null || true
  fi
  if [[ -d "$outbox" ]]; then
    mkdir -p "$TARGET/$slug/handoffs"
    find "$outbox" -name "done_*.md" -exec cp {} "$TARGET/$slug/handoffs/" \; 2>/dev/null || true
  fi
done < <(find "$ROOT/agents" -mindepth 1 -maxdepth 1 -type d | sort)

printf 'Outputs collected do: %s\n' "$TARGET"
