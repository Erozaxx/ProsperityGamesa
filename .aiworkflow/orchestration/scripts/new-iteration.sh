#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
ITER="${2:?iteration id required (např. iter-001)}"

mkdir -p "$ROOT/orchestration/runs/$ITER"/{briefs,collected,logs,reviews}
mkdir -p "$ROOT/orchestration/metrics/$ITER"

PLAN="$ROOT/orchestration/runs/$ITER/plan.md"

if [[ ! -f "$PLAN" ]]; then
  cp "$ROOT/shared/templates/iteration-plan-template.md" "$PLAN"
  # Portabilní náhrada (macOS + Linux)
  tmp="$(mktemp)"
  sed "s/ITER-ID/$ITER/g" "$PLAN" > "$tmp" && mv "$tmp" "$PLAN"
fi

# Aktualizuj symlink orchestration/plans/active.md → aktuální plan
mkdir -p "$ROOT/orchestration/plans"
ln -sf "../runs/$ITER/plan.md" "$ROOT/orchestration/plans/active.md"

printf 'Iterace vytvořena: %s\n' "$ROOT/orchestration/runs/$ITER"
printf 'Plan: %s\n' "$PLAN"
printf 'Active symlink: orchestration/plans/active.md → runs/%s/plan.md\n' "$ITER"
printf 'Další krok: vyplň Goal a Master Checklist v plan.md\n'
