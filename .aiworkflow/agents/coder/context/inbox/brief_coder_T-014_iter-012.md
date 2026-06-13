# Brief

- **Brief ID**: BRIEF-012-014
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-06-13

## Goal
Opravit reload-determinismus regres podle SCHVÁLENÉHO architektonického rozhodnutí (Option A — rebuild-on-load) a **vrátit oslabený G1 test na plný `hashState`**.

## Context
A1 seed (T-005) odhalil regres: `jobsAccidents` hradí čerpání 'population' RNG streamu hodnotou `min(population.total, workforce.total)`; `workforce.total` je odvozená a po load se nepřepočítá (stale 0) → desync RNG → divergence perzistované populace po save/load. Architekt rozhodl **Option A**: přepočítat odvozené pole na load.

Single source of truth designu: **`.aiworkflow/agents/architect/artifacts/final/fix_reload_determinism_iter-012_T-013.md`** (ZÁVAZNÉ) + `orchestration/decisions/DR-012-02_*.md`. Drž se jich přesně, neimprovizuj.

## Scope IN (3 změny dle designu)
1. **`src/core/systems/jobs.js`**: přidej a exportuj `deriveWorkforceTotal(state, ctx?)` = `min(population.total, workerSlots(state, ctx))` jako single source of truth. `autoAssignWorkers` ji použij **bez změny chování** (musí počítat stejnou hodnotu jako dnes). `workerSlots` musí umět běžet bez `ctx` přes globální katalog fallback, aby load cesta nepotřebovala ctx.
2. **`src/save/load.js`**: v `loadAndReconstruct` Step 5 „recalculate derivates" (po `applyPayload`, před `validateInvariants`) přepočítej `state.home.workforce.total` přes helper.
3. **`test/iter005-edge.test.js`**: G1 zpět na **plný `hashState`** — odstraň `applyPersist()` obejití (ř. ~104-110), doprovodný iter-012 A1 komentář a nepoužitý import (`applyPersist`). `before()` načtení katalogů PONECH (je správné a potřebné). Po fixu MUSÍ `hashState(stateC) === hashState(stateA)` projít.

## Scope OUT
- Žádná změna tick logiky, pořadí edge/order, RNG cest, ani tvaru save (v3).
- Žádné jiné oblasti než reload-determinismus workforce.total. Nesahej na A1-A5 implementaci kromě bodu 3.

## Acceptance Criteria
- `npm run ci` zelené (typecheck + lint:core + test).
- `npm run smoke` OK.
- **G1 `iter005-edge.test.js` na plném `hashState` zelený** (pokud by neprošel s plným hashem, fix je neúplný — NEoslabuj test, oprav fix).
- `autoAssignWorkers` chování beze změny (workforce.total počítá identicky jako před změnou).
- Determinismus spojitého simu zachován; edge bez načteného katalogu vrací 0 (shodné se spojitým simem bez katalogu).

## Expected Outputs
- Změny v `src/core/systems/jobs.js`, `src/save/load.js`, `test/iter005-edge.test.js`.
- Doplň `.aiworkflow/agents/coder/artifacts/final/impl_summary_iter-012_T-014.md` (co změněno, výsledek ci+smoke, potvrzení G1 na plném hashState).

## Risks / Constraints
- Determinismus je core invariant — žádná nová nedeterministická cesta.
- NEcommituj (git) — commit dělá orchestrátor po QA.
- Pokud G1 s plným hashem neprojde, NEMASKUJ — zastav se a zapiš do summary co se rozchází, eskaluj.
