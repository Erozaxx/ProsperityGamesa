# Current Task

- **Task ID**: T-002 (iter-010 M4a CONTINUATION)
- **Brief**: BRIEF-037b (iter-010 M4a continuation – fix 6 tsc errors + wiring)
- **Iteration**: iter-010
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-010 T-002 M4a)
- [x] Krok 0: Fix tsc errors – add @typedef GameState/TickContext/CommandRegistry/TxEvent to setTaxRate.js, accounting.js, taxes.js, burnWood.js, upkeep.js; fix emptyReport param types in createCouncilState.js
- [x] Krok 1: WIRING – ctx.emitTx = tx => recordTx(state, tx) in bootSequence (main.js) – already done
- [x] Krok 1: WIRING – registerSetTaxRate in bootstrapEngine (main.js) – already done
- [x] Krok 1: WIRING – closeMonth in tickOrder (month order 40, last) – already done
- [x] Krok 1: load.js applyPayload – add council + home.notEnoughMilitaryFunding restoration
- [x] Krok 2: UI – CouncilScreen, selectFinance, App.js tab Rada – already done
- [x] Fix stale tests in persist.test.js (MIGRATIONS.length now 1, not 0)
- [x] tsc: 0 errors
- [x] lint:core: OK (47 files)
- [x] node --test: 668 pass, 0 fail
