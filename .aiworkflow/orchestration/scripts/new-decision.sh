#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
ID="${2:?DR ID required (např. DR-001)}"
TOPIC="${3:?topic required}"

mkdir -p "$ROOT/orchestration/decisions"
FILE="$ROOT/orchestration/decisions/${ID}_${TOPIC}.md"
[[ -f "$FILE" ]] && { printf 'Decision record již existuje: %s\n' "$FILE"; exit 1; }

cp "$ROOT/shared/templates/decision-record-template.md" "$FILE"
tmp="$(mktemp)"
sed "s/DR-XXX/$ID/" "$FILE" > "$tmp" && mv "$tmp" "$FILE"

printf 'Vytvořen: %s\n' "$FILE"
printf 'Tip: zkopíruj relevantní DR do agents/<slug>/context/refs/ pro informování agentů.\n'
