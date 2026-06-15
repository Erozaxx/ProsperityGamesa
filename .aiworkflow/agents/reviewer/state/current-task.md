# Current Task

- **Task ID**: T-002 (REVIEW DESIGN M7b — battle automat, iter-018, Opus)
- **Brief**: BRIEF-018-002
- **Iteration**: iter-018
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: Review DESIGNu M7b (DESIGN-018-001) PŘED implementací, ověřeno PROTI KÓDU.
Ověřeno: G2 (advance clock.js:75 i runCatchupBatch catchup.js:50 volají identický step()→runTick→battle.tick; tickOrder.js:230 every:'step' order 30) → auto-resolve == live STRUKTURÁLNĚ ZADARMO. Serializovatelnost: persistSchema.js:300 + load.js:247 plný passthrough state.battle; rng stream 'battle' (rng.js:10) v save; makeRng vytváří rng lokálně (žádné closury v state.battle) → kill-resume dosažitelný. baseRevival NEEXISTUJE v src (gap). military.json bez combat statů (gap). startBattleStub world.js:1189, registr 'startBattle' world.js:1228 == schedule insert 1083. Originál battle.js ověřen (cd double-decrement ř.274-290, crit uvnitř getDamage ř.443, units.army cyklus ř.249).

## Výsledek
Verdikt: **GO s podmínkami**. G2 == live ZADARMO POTVRZENO. Serializovatelnost kill-resume DOSAŽITELNÁ (podmíněno F-1: žádné closury/cykly/units.army). Split=NE SOUHLASÍM. G-MILITARY-STATS approx OK.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 3 (M-1 baseRevival fallback gap; M-2 opponent AI double cd-decrement 1:1; M-3 crit rng pořadí 1×/útok) + ostraha F-1 serializovatelnost (žádné neserializovatelné v state.battle)
- MINOR: 5 (military combat staty gap; invasion forces zdroj; outcome API mapping; tick/reaction init; load battle sanitizace)
- NIT: 3 (runtime pole vs kontrakt; hluboký klon battleStep; konstanty místo)

Povinné gate testy: §10.3 (kill-resume nenulový subAccMs) + §10.4 (G2 advance vs runCatchupBatch).

Výstup: agents/reviewer/artifacts/final/review_design_iter-018_T-002.md

## NEcommitnuto (per brief).
