# Brief

- **Brief ID**: BRIEF-013-008
- **Iteration**: iter-013 (M5-1)
- **Task**: T-008 (tester) — plný test loop M5-1
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-14

## Goal
Nezávislá QA validace M5-1 (building instances + builder + companies + modifier vrstva K13). Ověř kumulativní sadu §1.3 master plánu + M5-specifické invarianty EMPIRICKY vlastním během (neopisuj coderova tvrzení). Buď přísný zejm. na determinismus/persist — modifier vrstva je přesně třída bugu z determinismus ságy (DR-012-02).

## Co bylo implementováno (T1–T4)
- T1: building instances {created,totalMade,instances}, ageBuildings (day), opravy, persist.
- T2: build() command, builder systém (quarterDay), completeBuild, scaleCostByCount.
- T3: builder companies (buyCompany, ownedCompanies, companyBuildersTotal).
- T4: modifier vrstva K13 — effective/fold (deterministický sort source,id; add→mul→set), agregáty (Σeffective bez ×created), sdílený rebuildBuildingDerived (load Step 5 i mutace), save=jen catalogState.modifiers.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (potvrď počet testů + 0 fail). **`npm run smoke`** OK.
2. **Modifikátory round-trip = IDENTITA (plný hashState)**: nová hra → postav budovy / kup firmy / nech opotřebit → snapshot `hashState`; save→load→rebuildBuildingDerived → `hashState` **bitově identický**. Ověř na víc scénářích (vč. budovy s modifikátorem na maxWorkers/kapacitu, owned firma s masonProvided).
3. **Save = jen modifikátory**: `applyPersist(state)` payload NEobsahuje `derived`/`_effCache`/`_modVersion`/`effective`. Po loadu se vše přepočítá foldem na identické hodnoty.
4. **Deterministický fold**: 2× modifikátor `set` různého source → výsledek nezávislý na pořadí vložení (sort by source,id). Pořadí op add→mul→set. (Můžeš použít existující testy + vlastní.)
5. **Jedna cesta agregátů**: agregát (maxWorkers/kapacity) = `Σ effective` BEZ dvojího započtení `created`. Postav N instancí → ověř, že agregát roste lineárně dle value=created, ne kvadraticky.
6. **Catch-up-safe**: dlouhý seedovaný sim z fresh startu se stavbou/opotřebením v offline dávce (≥1 herní rok) → bez crashe, deterministický (stejný save+čas → stejný výsledek), levný (žádná O(n²)/alokace v hot-path). Buildings/builder/modifikátory běží v catch-upu stejně jako live.
7. **Persist round-trip všech nových domén**: buildings, projectQueue, projectSeq, ownedCompanies, catalogState.modifiers — round-trip bez ztráty, rozestavěný projekt pokračuje.
8. **Determinismus G1** (iter005-edge) plný hashState nedotčen; žádný Date.now/Math.random/DOM v core (grep gate).
9. **build flow e2e**: postav budovu → projekt do fronty → builder dokončí → instance + totalMade++ → modifikátor efekt na agregát. Ověř, že zdroje se odečetly (pay).

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš nález + repro, eskaluj (orchestrátor reopne coderovi). Helper skripty psát můžeš (tmp / agents/tester/state/), necommituj produkční změny.
- Kontrakty + build UI = M5-2 (netestuj, neexistují).

## Acceptance Criteria (DoD M5-1)
- ci zelené, smoke OK.
- Modifikátory round-trip identita na plném hashState (klíčové).
- Save bez derivovaných dat; fold deterministický; agregáty bez dvojího započtení.
- Catch-up-safe (≥1 rok sim bez crashe, deterministický).
- G1 determinismus nedotčen.
- Verdikt GO/NO-GO.

## Inputs
- Design: `context/refs/design_iter-013_T-001.md`, DR-013-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-013_T-004..T-007.md`
- Testy: `test/m5-buildings-t1..t4.test.js`, `test/iter005-edge.test.js`
- Kód: `src/core/systems/buildings.js`, `src/core/commands/build.js`/`buyCompany.js`, `src/save/`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-013_T-008.md` — každé AC PASS/FAIL + důkaz (čísla, hashe, výstupy). Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-008 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
