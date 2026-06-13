# Brief

- **Brief ID**: BRIEF-012-016
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-06-13

## Goal
Dotáhnout fix reload-determinismu variantou **Derive-on-init** (SCHVÁLENO uživatelem, T-015a). Cíl: **plné `npm run ci` zelené** — vč. 2 dříve failujících testů (app-bootstrap, export-string), G1 (iter005-edge) a iter012-playability.

## Gate status
✅ **USER-GATE OTEVŘEN** — uživatel schválil behavior-change spojitého simu (Derive-on-init). Můžeš implementovat.

## Context
Tvůj T-014 (Option A rebuild-on-load) je korektní a odhalil hlubší preexist. díru: `createInitialState` seeduje populaci, ale `workforce.total` nechá na 0; `jobsAccidents` (order 20) běží před `autoAssignWorkers` (order 30) už na kroku 1 → spojitý sim přeskočí RNG draw, kdežto load (po Option A) ne → desync. Fix: dopočítat `workforce.total` už při konstrukci v `createInitialState` přes **stejný `deriveWorkforceTotal` helper** (single source of truth).

Single source of truth designu: **`agents/architect/artifacts/final/fix_reload_determinism_complete_iter-012_T-015.md`** (ZÁVAZNÉ, čti celé — má přesný kód, edge-cases i ověření) + `orchestration/decisions/DR-012-02_*.md`.

## Scope IN (jediná změna kódu)
1. **`src/core/state/createInitialState.js`**:
   - Import `deriveWorkforceTotal` z `'../systems/jobs.js'`.
   - Po sestavení `state` objektu, PŘED `return`: `state.home.workforce.total = deriveWorkforceTotal(state)` (bez `ctx` → globální katalog fallback, == load.js Step 5). Vzor přesně dle §2b design docu (sestav `state` do lokální proměnné, dopočítej, vrať).
2. **Volitelně (mimo CI, pro čistotu artefaktů)**: `node tools/gen-precache.mjs` → commitnout regenerovaný `src/precache.js` (změnily se bajty zdroje). Pokud to vygeneruje šum / nesouvisející diff, NEcommituj precache a poznamenej to do summary — orchestrátor rozhodne.

## Scope OUT (NEsahej)
- `load.js` Step 5 (Option A, T-014) — zůstává.
- `jobs.js` `deriveWorkforceTotal`/`autoAssignWorkers` — beze změny.
- `createHomeState.js` (`workforce.total: 0` default zůstává), `tickOrder.js`, `jobsAccidents`, `persistSchema.js`, tvar save v3.
- Žádná duplikace derivace — VÝHRADNĚ volej `deriveWorkforceTotal` (3 místa: init/load/autoAssign).

## Acceptance Criteria (cílový stav)
- `node --test test/app-bootstrap.test.js` (S-1 idempotence) PASS.
- `node --test test/export-string.test.js` (round-trip) PASS.
- `node --test test/iter005-edge.test.js` G1 plný `hashState` PASS (16/16).
- `node --test test/iter012-playability.test.js` PASS.
- **`npm run ci` ZELENÉ** (typecheck + lint:core + test, žádný test se nesmí rozbít).
- `npm run smoke` OK (seeded pop=50, 0 console errors).
- `applyPersist(state)` payload nadále NEobsahuje `workforce.total` (jen `assigned`) — tvar save v3 beze změny.

## Expected Outputs
- Změna v `src/core/state/createInitialState.js` (+ volitelně `src/precache.js`).
- Doplň `.aiworkflow/agents/coder/artifacts/final/impl_summary_iter-012_T-016.md` (změna, výsledek plného `npm run ci` + smoke, potvrzení 2 dříve red testů zelené, zda jsi regeneroval precache a proč).

## Risks / Constraints
- Determinismus core invariant; derivace je čistá funkce, žádná nová RNG cesta.
- NEcommituj (git) — commit dělá orchestrátor po QA.
- Pokud plné CI po fixu NEzezelená nebo se rozbije jiný test, NEMASKUJ — zastav se, zapiš co se rozchází, eskaluj.
