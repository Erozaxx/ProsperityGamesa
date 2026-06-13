# Current Task

- **Task ID**: T-002
- **Brief**: BRIEF-029rr (iter-008 M2b RE-RUN 1)
- **Iteration**: iter-008
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-008 T-002 RE-RUN 1 – B-1..B-4 + integrace)
- [x] B-1: main.js volá loadAllCatalogs() → loadGame(SLOT_ID, catalog) → loadAndReconstruct
- [x] B-2: po loadu spočítá missedMs → runCatchupBatch (chunky+yield+cap) → offlineSummary
- [x] B-3: createAutosave napojen (periodic setInterval + lifecycle hide bypass), odstraněn raw saveGame v onHide
- [x] B-4: exportToString/importFromString + OfflineSummary/CatchupProgress wire do App.js přes getExtraProps
- [x] bootSequence(env) extrahována jako testovatelná čistá funkce (všechny browser deps injektovány)
- [x] Integrační test boot-integration.test.js (12 testů, 5 suitů – B-1..B-4 + full path)
- [x] Opraveny export-string.test.js (S-6 envelope: importFromString vrací {state, lastSimTimestamp})
- [x] render.js: getExtraProps podpora pro extra App props
- [x] tsc: 0 errors
- [x] lint:core: 33 files OK
- [x] node --test: 541 pass, 0 fail
