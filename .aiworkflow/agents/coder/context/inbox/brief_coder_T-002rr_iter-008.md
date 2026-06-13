# Brief (RE-RUN 1 – review T-004 nalezl 4 blockery)
- **Brief ID**: BRIEF-029rr
- **Iteration**: iter-008 (M2b)
- **To**: coder (Sonnet)
## Problém (review T-004)
Stavební bloky M2b (catchup.js, autosave.js, exportString.js, catalogs.js, summary/progress UI, saveStore allowlist) jsou hotové a unit-otestované, ALE `src/app/main.js` (jediný entrypoint) je NENAPOJUJE. Zelené CI to maskuje (žádný test neexercituje boot wiring). Oprav integraci a přidej integrační test boot cesty.
## BLOCKERY k opravě (vše v main.js / App.js)
- **B-1**: main.js volá `loadGame(SLOT_ID)` bez katalogu a nikdy nevolá `loadAllCatalogs()` → obchází loadAndReconstruct, katalogy nenačtené. OPRAV: boot sekvence = načti+validuj katalogy (catalogs.js) → loadGame(SLOT_ID, catalog) → loadAndReconstruct.
- **B-2**: runCatchupBatch/catchupStepCount se v main.js nikde nevolá → offline progres se nedopočítá. OPRAV: po loadu spočti missedMs z lastSimTimestamp a spusť catch-up (chunky+yield+cap), výsledek → offline summary.
- **B-3**: createAutosave nenapojen (main.js dál raw saveGame v onHide). OPRAV: napoj createAutosave (periodic + event + visibilitychange/pagehide 'hide' bypass).
- **B-4**: export/import + OfflineSummary/CatchupProgress nejsou importovány v App.js/main.js → z UI nedostupné. OPRAV: zapoj do UI.
## Dále (suggestions z review – zapracuj)
- S-5: catalogs.js validovat PŘED použitím + doplnit buildById().
- S-6: exportString export jako ENVELOPE (vč. lastSimTimestamp), ne holý payload (jinak ztráta času při importu).
- S-7: doplnit balance.offline. N-1: autosave default 60s (dle návrhu), ne 30s.
## POVINNÉ: integrační test boot cesty
- Přidej test, který exercituje main.js boot wiring (nebo extrahuj boot do testovatelné funkce `bootSequence(env)`): katalogy načteny → save s lastSimTimestamp → catch-up dopočítá progres → autosave napojen → summary dostupné. Test musí SELHAT, kdyby wiring chyběl.
## Acceptance
- `npm run ci` ZELENÉ vč. nového integračního testu boot cesty. Core bez DOM. catch-up=týž kód jako live.
## Inputs
- Review: agents/reviewer/artifacts/final/review_iter-008_T-004.md (B-1..B-4, S-5..S-7); návrh design_iter-008_T-001.md; src/*; agents/coder/AGENTS.md
## Outputs
- impl note agents/coder/artifacts/final/impl_iter-008_T-002.md (aktualizuj); handoff-out.sh T-002
