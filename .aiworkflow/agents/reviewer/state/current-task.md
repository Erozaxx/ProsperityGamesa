# Current Task

- **Task ID**: T-004
- **Brief**: BRIEF-031
- **Iteration**: iter-008
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: review gate iter-008 (M2b = DoD M2), pravomoc re-run.
Výstup: agents/reviewer/artifacts/final/review_iter-008_T-004.md

## Výsledek
Verdikt: **RE-RUN**. 4 BLOCKERY (integrace).

CI ověřeno: `npm run ci` ZELENÉ (tsc 0, lint:core OK 33 souborů, node --test 529/529).
Stavební bloky M2b kvalitní a unit-otestované. ALE `src/app/main.js` žádnou z M2b funkcí
NENAPOJUJE → jádro acceptance "osada žije offline" v reálné appce není splněno.
Zelené CI to nezachytí (žádný test neexercituje boot wiring main.js/runCatchup).

## Blockery (integrace v main.js)
- B-1: main.js volá loadGame(SLOT_ID) bez katalogu + nikdy nevolá loadAllCatalogs →
  obchází loadAndReconstruct, katalogy nenačtené → S-1 v reálné boot cestě NEVYŘEŠENO;
  populationMigration jede throw/catch fallback (~8000 ns) v produkci.
- B-2: runCatchupBatch/catchupStepCount nikde v main.js nevolány → offline progres se
  v appce nedopočítá → DoD M2 jádro chybí na integraci.
- B-3: createAutosave nenapojen (main.js dál raw saveGame v onHide); periodic/event/hide-bypass triggery chybí.
- B-4: exportToString/importFromString + OfflineSummary/CatchupProgress nejsou importovány
  v App.js/main.js → export/import + summary z UI nedostupné (dead code).

## Stanovisko k per-step getCatalog('houseTypes') — SUGGESTION (ne blocker)
Na produkční cestě (po opravě B-1, katalogy načtené) = jednotky ns lookup, žádný throw,
~470 ns/krok, catch-up 8h ~270 ms << strop. Akceptovatelné, G1 neporušeno.
Drahá cesta (~8000 ns) je symptom B-1 (nenačtené katalogy), ne příčina v population.js.
Doporučení (po blockerech): zvednout houseTypes mimo hot-path (cache v ctx) nebo hasCatalog místo try/catch.

## Další nálezy (non-blocking)
- S-5: catalogs.js loaduje PŘED assertCatalogValid + chybí buildById() (K10).
- S-6: exportString.js exportuje holý payload místo envelope (ztráta lastSimTimestamp, cross-version).
- S-7: balance.offline má jen capTechRealHours; chybí capRealHours/chunkSteps/progressThresholdSteps.
- N-1: createAutosave default 30s vs design 60s.

## Doporučení
RE-RUN: coder napoj boot sekvenci v main.js (řeší B-1..B-4 najednou) + S-5/S-6/S-7;
tester přidat integrační test boot cesty; pak reviewer re-gate.
Kód neměněn (scope OUT).
