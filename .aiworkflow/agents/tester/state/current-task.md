# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-013
- **Iteration**: iter-004
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M0a engine core.

## Předpoklady
- Produkční kód v src/core/ implementován coderem (T-002).

## Blockery
–

## Checklist (z briefa)
- [x] `npm run ci` zelené (tsc, grep gate, node --test)
- [x] Determinismus: stejný seed → stejný hash; různý seed → různý hash
- [x] Časové hrany: den, sezóna 4×91, rok 364, 5/10denní periodika přes rok (_absDay)
- [x] Scheduler tie-breaker _seq ověřen
- [x] Serializovatelnost stavu (žádné fce/Map/Date)
- [x] Edge testy doplněny (test/edge.test.js, 36 nových testů)
- [x] Negativní grep gate test (Date.now vložen → gate padl → reverted, NEcommitováno)
- [x] Verdikt zapsán do artifacts/final/testreport_iter-004_T-003.md
