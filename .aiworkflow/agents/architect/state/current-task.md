# Current Task

- **Task ID**: T-001 (iter-004)
- **Brief**: context/inbox/brief_architect_T-001_iter-004.md (BRIEF-011)
- **Iteration**: iter-004 (M0a)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – detailní implementační návrh (spec pro Sonnet codera) pro všech 6 tasků
iter-004 (M0a). Výstup: `artifacts/final/design_iter-004_T-001.md`. NE implementace –
soubory, signatury (JSDoc), datové tvary, algoritmy/pseudo, jak to ověří test.

Pokrytí:
- T1: struktura repa (§3.1), package.json (type:module, ci skript), tsconfig (checkJs,
  lib bez DOM), grep gate `tools/check-core-imports.mjs` (zakázané vzory + algoritmus),
  index.html placeholder, pravidla vrstvení, živé artefakty do /docs.
- T2: GameState tvar (§3.2), createInitialState() + InitOptions, freeze.js (devFreeze/DEV),
  types.d.ts základ; sloty pro pozdní domény.
- T3: clock.js – STEP_MS/STEPS_PER_DAY/SPEED_FACTOR, step(), createAccumulator/advance()
  dle §4.1 pseudo (frame budget, pauza zahazuje dluh, stopPending slot).
- T4: scheduler.js – binární min-heap ScheduleEntry[] + scheduleCount index (K17),
  tie-breaker _seq (determinismus), insert/due/cancel; timeEdges.js + PeriodicTask tvar.
- T5: rng.js – mulberry32, 8 pojmenovaných streamů (uint32 v state.rng.streams),
  makeRng/initRng/hashState, determinism hash.
- T6: registry.js (fail-fast, kolize ID, assertSerializable), calendar.js (autorita
  kalendáře, 91d sezóna/364d rok, produkuje TimeEdges), tickOrder.js (TICK_ORDER data +
  runTick + registerCorePeriodics no-op sloty), commands dispatch.js + setSpeed.js.

## Dílčí checklist
- [x] T-001: Detailní návrh všech 6 tasků iter-004 + package.json/tsconfig/grep-gate.

### Pracovní rozpad (interní)
- [x] Přečteno: AGENTS.md, brief BRIEF-011, architektura §3.1/3.2/3.3/4.1-4.4/5.6,
      master plán §3 iter-004 + §1.3
- [x] T1–T6 spec (soubory, signatury, datové tvary, algoritmy, testy)
- [x] package.json + tsconfig.json + grep-gate skript konkrétně
- [x] Souhrn souborů/závislostí + pořadí implementace + ROZHODNUTÍ NÁVRHU
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí; tam, kde architektura nechávala volnost,
  zvoleno a zdůvodněno (značeno „ROZHODNUTÍ NÁVRHU"): flat heap, mulberry32, 8 streamů,
  pauza zahazuje dluh, calendar=autorita, měsíc 30d/rok 364d provizorně, periodika jako
  no-op sloty, command registr oddělený, tsconfig lib bez DOM.
- Implementaci provede Sonnet v T-002.

## Blockery
–
