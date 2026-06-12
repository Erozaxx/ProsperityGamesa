#!/usr/bin/env bash
set -euo pipefail
# Použití: dispatch-brief.sh <root> <agent-slug> <brief-file>
ROOT="${1:-.}"
AGENT="${2:?agent-slug required}"
BRIEF_FILE="${3:?brief file required}"

DEST="$ROOT/agents/$AGENT/context/inbox/$(basename "$BRIEF_FILE")"
[[ -d "$ROOT/agents/$AGENT" ]] || { printf 'Chyba: agent nenalezen: %s\n' "$AGENT" >&2; exit 1; }
[[ -f "$BRIEF_FILE" ]] || { printf 'Chyba: brief nenalezen: %s\n' "$BRIEF_FILE" >&2; exit 1; }

cp "$BRIEF_FILE" "$DEST"
printf 'Brief dispatchnut do: %s\n' "$DEST"
