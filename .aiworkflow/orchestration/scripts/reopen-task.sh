#!/usr/bin/env bash
set -euo pipefail
# Použití: reopen-task.sh <root> <agent-slug> <task-id> <reason>
ROOT="${1:-.}"
AGENT="${2:?agent-slug required}"
TASK_ID="${3:?task-id required}"
REASON="${4:?reason required}"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

INBOX="$ROOT/agents/$AGENT/context/inbox"
[[ -d "$INBOX" ]] || { printf 'Chyba: agent nenalezen: %s\n' "$AGENT" >&2; exit 1; }

cat > "$INBOX/reopen_${TASK_ID}_${TS//:/}.md" <<REOPEN
# Reopen: $TASK_ID

- **Task ID**: $TASK_ID
- **Agent**: $AGENT
- **Reopened**: $TS
- **Reason**: $REASON

## Co je potřeba opravit
$REASON

## Postup
1. Přečti tento soubor
2. Oprav problém
3. Znovu zavolej: bash scripts/handoff-out.sh $TASK_ID "opraveno: $REASON"
REOPEN

printf 'Task %s vrácen agentovi %s\n' "$TASK_ID" "$AGENT"
printf 'Důvod: %s\n' "$REASON"
