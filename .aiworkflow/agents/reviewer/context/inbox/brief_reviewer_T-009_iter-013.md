# Brief

- **Brief ID**: BRIEF-013-009
- **Iteration**: iter-013 (M5-1)
- **Task**: T-009 (reviewer) — **review gate M5-1** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Závěrečný **review gate M5-1** (dle master plánu §1.4 — právo re-run). Ověř DoD M5-1 bod po bodu, soulad s designem a architekturou, a kvalitu kódu. QA (T-008) dala GO empiricky; ty hodnotíš correctness + kvalitu + dodržení tvrdých invariantů. Máš pravomoc vrátit (re-run) při blocker/major nálezu.

## Rozsah review (produkční diff M5-1)
Base→HEAD: `2e71c94..HEAD` (jen iter-013, NE iter-012). Klíčové soubory:
```
src/core/systems/buildings.js        (+865 – jádro: modifier fold, agregáty, rebuildBuildingDerived, ageBuildings, builder, completeBuild)
src/core/commands/build.js           (build command)
src/core/commands/buyCompany.js      (companies)
src/core/balance/balance.js          (BALANCE.buildings)
src/core/balance/formulas.js         (scaleCostByCount)
src/core/state/createInitialState.js + createHomeState.js + types.d.ts  (stav)
src/save/load.js + persistSchema.js  (persist budov/projektů/firem/modifikátorů)
src/core/systems/jobs.js + housing.js (napojení agregátů)
src/core/engine/tickOrder.js + rng.js
src/data/buildings.json + companies.json (katalogy, approximated)
test/m5-buildings-t1..t4.test.js
```
Diff: `git diff 2e71c94..HEAD -- src/ tools/ test/m5-buildings-*.test.js`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Save = JEN derivovatelný minimal** (`catalogState.modifiers` + raw stav budov/projektů/firem); NIKDY derivované (`home.derived`, `effective`, `_effCache`, `_modVersion`). Ověř v persistSchema + load.
2. **Sdílený `rebuildBuildingDerived`** = jediná cesta re-derivace, volaná z load Step 5 I z mutací (completeBuild/destroyInstance/applyRepair/buyCompany) + createInitialState. ŽÁDNÁ load-only ani mutation-only větev (třída bugu DR-012-02). Ověř všechny call-sites.
3. **Deterministický fold**: sort by (source,id); set = poslední po sortu; op add→mul→set; žádná závislost na pořadí klíčů.
4. **JEDNA cesta agregátů**: Σ effective bez ×created (value=created zapečen). Žádné dvojí započtení.
5. Žádné in-place `applyUpgrade`/mutace derivovaných hodnot; žádný Date.now/Math.random/DOM v core; catch-up-safe.

## Na co se zaměřit
1. **Correctness** výše uvedených invariantů (cti je proti kódu, ne proti tvrzení).
2. **Soulad s designem** `context/refs/design_iter-013_T-001.md` (§4.1–4.8) a architekturou iter-002 (K13/K14/§6/§7.1). Odchylky označ.
3. **Reuse/simplify**: duplicita, mrtvý kód (zejm. zbytky stubů z T1/T2 — `effectFromCatalog` workaround měl být nahrazen v T4; je ještě používán nekonzistentně?), zbytečná složitost. Konkrétně soubor:řádek + návrh.
4. **Persist/migrace**: nová pole (buildings/projectQueue/ownedCompanies) — je potřeba migrace starších savů? Round-trip korektní?
5. **Živé artefakty**: tickOrder doc + ASCII diagram aktualizované ve stejných commitech jako systémové změny (N-04).
6. **Balanc do balance.js** s odkazem na zdroj (ne inline magické konstanty).
7. **Gapy** (G-BUILD-TXAUDIT, G-BUILD-COSTSCALE, G-BUILDER-CAP/MASON, G-LISTBUILDINGS) korektně označené `provenance:'approximated'` + v gap-reportu.

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + konkrétní návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Při blocker/major → orchestrátor reopne coderovi (re-run loop); minor/nit → backlog.

## Inputs
- Design: `context/refs/design_iter-013_T-001.md`; QA report: `context/refs/qa_report_iter-013_T-008.md`; DR-013-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (K13/K14/§6/§7.1)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-013_T-004..T-007.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-013_T-009.md` — nálezy + verdikt.

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-009 "<verdikt + počet nálezů dle závažnosti>"`
- NEcommituj (git), NEopravuj kód — jen review.

## Constraints
- Věcně, konkrétně, s návrhem. Determinismus/persist invarianty (modifier vrstva) prověř obzvlášť pečlivě — je to nejrizikovější část.
