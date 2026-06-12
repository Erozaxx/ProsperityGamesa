#!/usr/bin/env bash
set -euo pipefail
# Volej po dokončení každého úkolu:
#   bash scripts/handoff-out.sh <task-id> "<popis výstupu>"
TASK_ID="${1:?task-id required}"
DESC="${2:?popis required}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SLUG="$(basename "$AGENT_DIR")"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 1. Zapsat do outboxu
OUTBOX="$AGENT_DIR/context/outbox"
mkdir -p "$OUTBOX"
cat > "$OUTBOX/done_${TASK_ID}_${TS//:/}.md" <<EOF
# Handoff: $TASK_ID
- Agent: $AGENT_SLUG
- Task: $TASK_ID
- Completed: $TS
- Description: $DESC
EOF

# 2. Aktualizovat state
sed -i.bak "s/Status: in-progress/Status: done/" "$AGENT_DIR/state/current-task.md" 2>/dev/null || true
sed -i.bak "s/Status: blocked/Status: done/" "$AGENT_DIR/state/current-task.md" 2>/dev/null || true
rm -f "$AGENT_DIR/state/current-task.md.bak"

# 3. Notifikovat orchestrátora
ORCH_INBOX="$ROOT/agents/orchestrator/context/inbox"
mkdir -p "$ORCH_INBOX"
cp "$OUTBOX/done_${TASK_ID}_${TS//:/}.md" "$ORCH_INBOX/"

printf '[%s] ✓ Task %s dokončen → notifikace odeslána orchestrátorovi\n' "$TS" "$TASK_ID"
