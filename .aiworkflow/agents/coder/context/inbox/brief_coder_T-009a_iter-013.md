# Brief

- **Brief ID**: BRIEF-013-009a
- **Iteration**: iter-013 (M5-1)
- **Task**: T-009a = oprava 4 minor nálezů z review gate (před close)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Drobné opravy 4 minor nálezů z review gate T-009 (GO-s-podmínkami). Malé, lokalizované, hygiena před uzavřením M5-1. NErozšiřuj scope. Detaily nálezů: `agents/coder/context/refs/review_iter-013_T-009.md`.

## Scope IN (přesně tyto 4)
1. **MINOR-1 — gap-report**: Doplň M5-1 gapy do centrálního `src/data/gap-report.json` (nebo kde gap-report žije — ověř): **G-BUILD-TXAUDIT, G-BUILD-COSTSCALE, G-BUILDER-CAP, G-BUILDER-MASON, G-LISTBUILDINGS** (a další z M5-1, viz review). U každého: id, popis, severity, milník dořešení (M5-2/M9), provenance. Sjednoť formát s existujícími položkami v gap-reportu.
2. **MINOR-2 (N-04) — stale tickOrder doc**: Oprav `docs/tickOrder.md` (~ř. 128–131) zastaralou T4 sekci: tvrdí `[NOT YET IMPLEMENTED]` a odkazuje na **neexistující** `src/core/catalog/effective.js`. Realita: `effective`/modifier vrstva je implementovaná v `src/core/systems/buildings.js`. Aktualizuj prozaickou sekci, ať odpovídá kódu (tabulka+diagram jsou prý už OK — ověř a nech konzistentní).
3. **MINOR-3 — zavádějící komentáře**: `src/core/systems/buildings.js:787–790` komentář tvrdí, že volá `effective()`, ale volá `effectFromCatalog`. Oprav komentář, ať odpovídá realitě (effectFromCatalog je legitimní helper pro `maxActiveProjects`/`maxProjectQueue`, která nemají top-level base pole a nejsou v `home.derived` — NENÍ to mrtvý kód, nech ho být, jen oprav komentář).
4. **MINOR-4 — duplicita**: Logika `effectFromCatalog` pro `maxActiveProjects`/`maxProjectQueue` je duplikovaná mezi `build.js` (~ř. 40,54) a `buildersProcess` (`buildings.js:790`). Pokud lze snadno deduplikovat do jednoho helperu (export z buildings.js, použít v build.js), udělej to. Pokud by to bylo invazivní/riskantní, ponech a přidej krátký komentář proč (nech jako mini-gap). Preferuj jednoduchost.

Nit (4) z review zapracuj jen pokud triviální; jinak nech do backlogu.

## Scope OUT
- Žádná změna chování (jen komentáře/doc/gap-report/dedup bez sémantické změny). Žádný nový gameplay.
- Neměň modifier fold / persist / determinismus logiku.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. (Pokud dedup mění kód, ověř že testy stále zelené; případně přidej/uprav test.)
- `npm run smoke` OK.
- **Determinismus G1** + round-trip nedotčené (neměníš logiku).
- Precache regen jen pokud měníš zdroj ovlivňující manifest (gap-report.json pravděpodobně NEní v precache — ověř; pokud ano, regeneruj).

## Inputs
- Review: `agents/coder/context/refs/review_iter-013_T-009.md` (MINOR-1..4 detail)
- Kód: `src/data/gap-report.json`, `docs/tickOrder.md`, `src/core/systems/buildings.js` (effectFromCatalog ~787-790), `src/core/commands/build.js` (~40,54)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-013_T-009a.md` (co změněno, gate výstup, zda dedup proveden nebo ponechán+proč)
- `bash agents/coder/scripts/handoff-out.sh T-009a "<stručně + gate výsledek>"`
- NEcommituj (git).
