# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-030
- **Iteration**: iter-008
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M2b – catchup engine (T1/T2), export/import round-trip (T5), autosave triggery (T4), offline summary model (T3), save bootstrap round-trip (S-1). Vyřešena benchmark regrese.

## Předpoklady
- Produkční kód implementován coderem T-002 (M2b: offline catch-up, export/import, autosave, UI).
- Scope OUT: žádné změny produkčního kódu.

## Blockery
–

## Checklist (z briefu iter-008 BRIEF-030)
- [x] Benchmark regrese prošetřena: příčina = getCatalog() throw/catch bez načtených katalogů (~3000 ns/throw vs 22 ns loaded)
- [x] tools/bench-step.mjs upraven: načítá katalogy před měřením (produkční cesta)
- [x] iter005-edge.test.js: threshold ponechán 10000 ns, přidán comment + nový test catch-up < 30 s
- [x] npm run ci ZELENÉ: 529/529 PASS
- [x] test/catchup.test.js nový: catchupStepCount, runCatchupBatch, G1 chunked==batch==live, cap, T2 interrupt/resume (22 testů)
- [x] test/export-string.test.js nový: round-trip, komprese, error handling, allowlist parita (12 testů)
- [x] test/autosave.test.js nový: throttle, hide-bypass, flush (11 testů)
- [x] test/offline-summary.test.js nový: buildOfflineSummary model, formatOfflineSummary (15 testů)
- [x] test/app-bootstrap.test.js nový: save→load via saveStore+catalog, payload allowlist, idempotence (8 testů)
- [x] Verdikt zapsán do artifacts/final/testreport_iter-008_T-003.md
