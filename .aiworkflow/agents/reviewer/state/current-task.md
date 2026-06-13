# Current Task

- **Task ID**: T-004 (RE-REVIEW round 2)
- **Brief**: BRIEF-031rr
- **Iteration**: iter-008
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: RE-REVIEW round 2 gate iter-008 (M2b = DoD M2) po opravě B-1..B-4.
Výstup: agents/reviewer/artifacts/final/review_iter-008_T-004rr.md

## Výsledek
Verdikt: **GO**. Všechny 4 blockery REÁLNĚ vyřešené v bootSequence(env).

CI ověřeno: `npm run ci` ZELENÉ (tsc 0, lint:core OK, node --test 541/541 = 529 + 12 nových integračních).

## Ověření blockerů (v reálné bootSequence, ne jen unit)
- B-1 VYŘEŠENO: loadCatalogs() první → loadGame(SLOT_ID, {}) truthy → loadAndReconstruct path
  (saveStore.js větev catalog?). Runtime katalogy z globálního store → throw-path pryč.
- B-2 VYŘEŠENO: missedMs → catchupStepCount(cap 8h) → runCatchupBatch (chunk/yield) → buildOfflineSummary,
  PŘED loop.start(). catch-up = týž step() = G1.
- B-3 VYŘEŠENO: createAutosave (60s default) + setInterval('periodic') + lifecycle onHide('hide' bypass)
  + 'event' po doběhnutí catch-upu. Raw saveGame odstraněn.
- B-4 VYŘEŠENO: render.js spread ...extraProps → App.js renderuje Export/Import + OfflineSummary/CatchupProgress.

## Integrační test
test/boot-integration.test.js (12 testů) exercituje bootSequence(env) přes reálné katalogy + reálný step();
full-path test ověří všech 5 wiring eventů najednou. Selže, kdyby kterékoliv wiring chybělo.

## DoD M2: SPLNĚNO
Offline progres v reálné boot cestě (cap/summary), autosave, export/import z UI, catch-up=live, G1.

## Backlog (non-blocking, kód NEMĚNĚN)
- BL-1: loadGame/importFromString dostávají {} místo reálného catalog handle → balance.start overrides
  se neaplikují (graceful fallback na defaulty). Funkčně OK.
- BL-2: onImport tiše spolkne chybu importu → zobrazit showError.
- BL-3: per-step getCatalog('houseTypes') try/catch (z round 1) – mimo hot-path / hasCatalog.
- BL-4: mrtvý kód ve fake exportToString v boot-integration.test.js.
- BL-5: legacy bare-payload větev v importFromString – zvážit deprecate.

## Doporučení
GO. Iteraci iter-008 lze z pohledu reviewera uzavřít. Backlog BL-1..BL-5 do příští iterace.
Kód neměněn (scope OUT).
