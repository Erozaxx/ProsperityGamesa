# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-034
- **Iteration**: iter-009
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M3 – tabulkové testy produkce/efficiency/forest, catch-up-safe invariant všech M3 systémů, save round-trip, determinismus RNG streamů, edge cases.

## Předpoklady
- Produkční kód implementován coderem T-002 (M3: forest/field/mine/jobs/workerEfficiency/skills).
- Scope OUT: žádné změny produkčního kódu – jen nové testy.

## Blockery
–

## Checklist (z briefu iter-009 BRIEF-034)
- [x] npm install && npm run ci ZELENÉ (577 pass před, 622 pass po přidání testů)
- [x] Tabulkové testy: jobsProduction progress model (QD 5 completion, bread=20), workerEfficiency clamp [0.25,2], area vzorce (forest/field/mine), forest regen (10days, saplings, fire), skilly 2× kompenzace (maxStep·0.5 = effMaxStep=25, completion step 26)
- [x] Catch-up-safe invariant: live N == batch N (hash), 5 dní, 30 dní (přes monthly+10days), per-systém world.forest/mine/field identické
- [x] Save round-trip: progPct NOT v payloadu, dynamic fields YES, derived area/used NOT
- [x] Determinismus RNG: streamy forest/mine/field nezávislé, same seed = same result
- [x] Edge cases negativní: 0 workers = 0 produkce, mine curOres=0 (M3 no-op), field bez farem = no RNG
- [x] Math.random NOT volán žádným M3 systémem (runtime patch test)
- [x] Verdikt zapsán do artifacts/final/testreport_iter-009_T-003.md
