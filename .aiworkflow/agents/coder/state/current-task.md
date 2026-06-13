# Current Task

- **Task ID**: T-002a
- **Brief**: BRIEF-024b
- **Iteration**: iter-007
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-007 T-002a M2a-1)
- [x] Krok 0: oprav padající test (gap-report _meta.iteration = "iter-007" → pass)
- [x] Krok 1: catalog hardening – byId, K10 kolize, typová/min-max/enum validace, B4 cross-ref (food platný N-2), jobs.products→mapa, extract.mjs idempotentní
- [x] Krok 2: T1 transakce – resourceHandlers, canAfford/pay/grant, atomicita, ne-pod-nulu, txEvent přes ctx.emitTx, NaN guard
- [x] Krok 3: T2 persist – persistSchema.js, applyPersist, load.js (7-krokový loadAndReconstruct), migrations.js, createHomeState.js factory, round-trip testy
- [x] Krok 4: pure formulas – consumeFood, foodVariety, diseaseChance, crimeCount, settlementLevel + tabulkové testy
- [x] tsc: 0 chyb
- [x] lint:core: 24 files OK
- [x] node --test: 340 pass, 0 fail
