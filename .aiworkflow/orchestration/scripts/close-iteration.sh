#!/usr/bin/env bash
set -euo pipefail
# Uzavře iteraci: zkontroluje master checklist, archivuje outputs, zapíše exit summary
ROOT="${1:-.}"
ITER="${2:?iteration id required}"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

PLAN="$ROOT/orchestration/runs/$ITER/plan.md"
[[ -f "$PLAN" ]] || { printf 'Chyba: plan.md nenalezen: %s\n' "$PLAN" >&2; exit 1; }

# Zkontroluj otevřené tasky
open_tasks="$(grep -c '^\- \[ \]' "$PLAN" 2>/dev/null || true)"
if [[ "$open_tasks" -gt 0 ]]; then
  printf 'VAROVÁNÍ: %s nedokončených úkolů v master checklistu!\n' "$open_tasks"
  grep '^\- \[ \]' "$PLAN"
  printf '\nChceš přesto uzavřít iteraci? (y/N): '
  read -r confirm
  [[ "$confirm" == "y" || "$confirm" == "Y" ]] || { printf 'Uzavření zrušeno.\n'; exit 0; }
fi

# Collect outputs
bash "$ROOT/orchestration/scripts/collect-outputs.sh" "$ROOT" "$ITER"

# Exit summary
SUMMARY="$ROOT/orchestration/runs/$ITER/exit-summary.md"
cat > "$SUMMARY" <<ESEOF
# Exit Summary: $ITER

- **Closed**: $TS
- **Open tasks at close**: $open_tasks

## Collected Outputs
$(find "$ROOT/orchestration/runs/$ITER/collected" -type f ! -name '.gitkeep' | sort | sed 's|^|- |')

## Notes
–
ESEOF

# Aktualizuj status v plan.md
tmp="$(mktemp)"
sed 's/Status: active/Status: closed/' "$PLAN" > "$tmp" && mv "$tmp" "$PLAN"

# Archivuj notifikace z orchestrátor inboxu
ORCH_INBOX="$ROOT/agents/orchestrator/context/inbox"
ARCHIVE="$ROOT/orchestration/runs/$ITER/logs/inbox-archive"
mkdir -p "$ARCHIVE"
find "$ORCH_INBOX" -name "done_*.md" -exec mv {} "$ARCHIVE/" \; 2>/dev/null || true

# Odstraň symlink active.md (iterace je uzavřena)
ACTIVE_LINK="$ROOT/orchestration/plans/active.md"
if [[ -L "$ACTIVE_LINK" ]]; then
  rm "$ACTIVE_LINK"
  printf 'Symlink orchestration/plans/active.md odstraněn.\n'
fi

printf 'Iterace %s uzavřena.\n' "$ITER"
printf 'Exit summary: %s\n' "$SUMMARY"
printf 'Tip: spusť make init-iteration ITER=iter-XXX pro další iteraci.\n'
