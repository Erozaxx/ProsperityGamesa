# Current Task

- **Task ID**: T-004 (review gate iter-010, DoD M4a)
- **Brief**: BRIEF-039
- **Iteration**: iter-010 (M4a)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: review gate iter-010 (DoD M4a) – ekonomika gold/daně/upkeep auditovatelná z událostí.
Výstup: agents/reviewer/artifacts/final/review_iter-010_T-004.md

## Výsledek
Verdikt: **GO** (1 SUGGESTION follow-up do M4b, neblokuje M4a).

Ověřeno:
- Účetnictví OBSERVER (accounting.js recordTx/closeMonth – žádná inline mutace v pay/grant).
- WIRING reálně: ctx.emitTx (main.js:165), registerSetTaxRate (main.js:88),
  tickOrder periodics (taxes/upkeep/burnWood/closeMonth order 40 poslední),
  CouncilScreen + selectFinance + tab Rada v App.js.
- Účetní invariant Σ gold tx == Δ gold zelený (live 27000 kroků + catch-up 54000 kroků/2 měsíce).
- Reálná čísla: centerBase 22, upkeep 108/162, firewoodNeeds, spoilage – tabulkové testy PASS.
- persist+migrace v1→v2 (SAVE_VERSION=2) round-trip zelené; core bez DOM (lint:core PASS).
- npm run ci zelené: tsc 0, lint:core OK, 693 testů pass / 0 fail.

## Nálezy
- SUGGESTION-1 (M4b): crime.js:42-44 inline mutace player.gold mimo resource vrstvu (bez emitTx).
  Preexistující z iter-007, mimo scope M4a, v M4a se nespouští (incidents=0) → invariant testy zelené.
  Doporučení: přesměrovat přes pay(...,'crime:loss',ctx) + grep-gate test. NEblokuje M4a.
- NITPICK-1: persistSchema.applyPersist zapisuje payload.council=undefined v else-větvi (neškodné).

## Kód neměněn (scope OUT).
