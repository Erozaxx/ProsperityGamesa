# Brief

- **Brief ID**: BRIEF-015-002a
- **Iteration**: iter-015 (M6)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-14

## Goal
Revize tvého `design_iter-015_T-001.md` — zapracuj **2 major + 1 minor** z reviewer gate (T-002, GO-s-podmínkami). Stále design, ne kód. Detaily: `agents/architect/context/refs/review_design_iter-015_T-002.md`.

## Zapracuj (podmínky před implementací)
1. **M-1 (major) — player state init (determinismus)**: `createPlayerState` (`src/core/state/createHomeState.js`) je plochý objekt BEZ `unlockedTechs`/`research`. Když coder zapomene init, fresh hra dá `undefined`, load dá `{}` přes undefined-guard → **hashState desync** (třída DR-012-02 na player úrovni). Předepiš v designu: `createPlayerState` MUSÍ inicializovat `unlockedTechs:{}` + `research:{sectors:{}}` (přesný tvar dle designu); a povinný **fresh-vs-load determinismus test** (createInitialState hashState == load(save(createInitialState)) hashState). Ověř přesné místo v createHomeState.js.
2. **M-2 (major) — defenzivní guard proti chybějícímu katalogu**: `rebuildBuildingDerived` běží i z `createInitialState` v testech/bootu **bez načtených katalogů**. `addTechModifiers`/`findTech` musí být defenzivní: `hasCatalog('techs')` guard + `if(!tech)continue` (žádný crash při chybějícím techs katalogu). Předepiš přesně, kde a jak (ověř proti `src/core/catalog/index.js` / `getCatalog`/`hasCatalog`).
3. **m-3 (minor) — prokazatelná effective() cesta**: tech efekty na joby/produkci fungují JEN když produkční systém čte cílový atribut přes `effective()`. Ověř proti kódu (jobs/production), které atributy už `effective()` čte, a navrhni ≥1-2 techy s efektem na takový atribut (demonstrovatelná funkčnost bez M9). Pokud žádný produkční atribut zatím přes effective() nečte, navrhni minimální napojení nebo zvol atribut, který už čte (storage/maxWorkers/attractiveness z M5-1).

Minor/nit (zbylé) zapracuj dle uvážení.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002. M7+ obsah.

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-015_T-001.md`
- Review (2 major/4 minor/3 nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-015_T-002.md`
- DR-015-01 (`context/refs/`)
- Kód pro ověření: `src/core/state/createHomeState.js` (createPlayerState), `src/core/catalog/index.js` (getCatalog/hasCatalog), `src/core/systems/buildings.js` (rebuildBuildingDerived, effective), `src/core/systems/jobs.js` (čte produkce přes effective()?), `src/core/state/createInitialState.js`

## Acceptance Criteria
- M-1, M-2, m-3 explicitně vyřešeny v designu (s přesnými místy v kódu).
- M-1: jasný tvar player state init + povinný fresh-vs-load test.
- M-2: konkrétní guard (hasCatalog + if(!tech)continue).
- m-3: konkrétní atribut(y) přes effective() + ≥1-2 demonstrační techy.

## Expected Outputs
- Aktualizuj `design_iter-015_T-001.md` in-place (changelog "Revize T-002a: …") nebo nový doc — zvol jedno, uveď v handoffu platný.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny M-1/M-2/m-3 + platný doc>"`
- NEcommituj (git).
