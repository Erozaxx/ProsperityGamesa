# Current Task

- **Task ID**: T-002
- **Brief**: BRIEF-012
- **Iteration**: iter-004
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Implementace M0a engine core dle návrhu architekta (design_iter-004_T-001.md). Hotovo.

## Předpoklady
- Návrh architekta je závazný (design_iter-004_T-001.md)
- Zero-build ESM runtime, Node 22

## Blockery
–

## Checklist
- [x] T1: struktura repa + package.json + tsconfig.json + grep gate + index.html
- [x] T2: state container (createInitialState, freeze, types.d.ts) – bylo hotové
- [x] T3: clock (clock.js, accumulator, advance)
- [x] T4: scheduler (scheduler.js, timeEdges.js)
- [x] T5: RNG (rng.js, mulberry32, hashState)
- [x] T6: registry + calendar + tickOrder + commands (dispatch, setSpeed)
- [x] Testy: clock/scheduler/RNG/calendar (27 testů, všechny zelené)
- [x] tsc --noEmit → zelené
- [x] grep gate → zelené
- [x] impl note zapsán
