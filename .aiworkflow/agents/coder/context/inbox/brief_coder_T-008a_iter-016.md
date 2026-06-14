# Brief

- **Brief ID**: BRIEF-016-008a
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-008a = oprava 4 minor z review gate (hygiena před close)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Drobné opravy 4 minor nálezů z review gate T-008 (GO bez podmínek — toto je hygiena před uzavřením M7a-1). Malé, lokalizované. Detaily: `agents/coder/context/refs/review_iter-016_T-008.md`.

## Scope IN (4 minor)
1. **MINOR-1 — mrtvý kód**: `calcMilitaryRating`/`calcEconomicRating` (`src/core/systems/world.js` ~ř.299-328) jsou nikde nevolané (mrtvý kód, na rozdíl od M7a-2 stubů ani neoznačené). **Odstraň je** (pokud jsou opravdu nevolané — ověř grep přes celý repo). Pokud jsou zamýšlené pro M7a-2, NEodstraňuj, jen je jasně označ komentářem `// M7a-2 stub` jako ostatní; preferuj odstranění, pokud M7a-2 je nepotřebuje (architekt je v designu nezmínil jako M7a-1).
2. **MINOR-2 — persist odchylka dokumentace**: `goldDemand`/`goldProduction` se persistují (`persistSchema.js` ~ř.263-265) navzdory designu §8 (řazeno jako derivace). Je to **vědomá správná odchylka** kvůli M-2 hash stabilitě (snapshot pre-policy hodnot, aby fresh-vs-load seděl). Přidej **komentář v persistSchema.js** vysvětlující PROČ se persistují (M-2 hash stabilita, ne derivace v pravém smyslu) + zapiš gap **G-WORLD-PERSIST-DERIVED** do `src/data/gap-report.json` (severity low, milestone M9, provenance derived) jako traceability.
3. **MINOR-3 — zavádějící komentář**: `world.js` ~ř.179 homeZone mirror komentář je zavádějící (mirror neimplementován). Oprav komentář, ať odpovídá realitě.
4. **MINOR-4 — tickOrder doc drift (N-04)**: `docs/tickOrder.md` stále uvádí `world.tick` jako "STUB" — realita: je LIVE (M7a-1). Aktualizuj na LIVE (M7a-1) + případně doplň, že processZone tiká day-index round-robin.

Nit (2) dle uvážení jen pokud triviální.

## Scope OUT
- Žádná změna chování (jen mrtvý kód / komentáře / doc / gap-report). Neměň determinismus/persist LOGIKU (jen dokumentace u MINOR-2).
- battle.js NEDOTČEN. Frakční AI/UI = M7a-2.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. (Odstranění mrtvého kódu nesmí nic rozbít — ověř, že calcMilitaryRating/calcEconomicRating opravdu nikde nejsou.)
- `npm run smoke` OK.
- **Determinismus G1** + **M7a fresh-vs-load (m7a-world-t1)** + M5/M6/M4b nedotčené.
- Precache regen jen při změně zdroje ovlivňujícího manifest (gap-report.json je v precache → pravděpodobně regen; ověř).

## Inputs
- Review: `agents/coder/context/refs/review_iter-016_T-008.md` (MINOR-1..4)
- Kód: `src/core/systems/world.js` (~ř.179, 299-328), `src/save/persistSchema.js` (~ř.263-265), `docs/tickOrder.md`, `src/data/gap-report.json`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-016_T-008a.md` (co opraveno, zda mrtvý kód odstraněn, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-008a "<stručně + gate výsledek>"`
- NEcommituj (git).
