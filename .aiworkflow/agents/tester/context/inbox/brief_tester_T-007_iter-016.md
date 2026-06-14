# Brief

- **Brief ID**: BRIEF-016-007
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-007 (tester) — plný test loop M7a-1
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-14

## Goal
Nezávislá QA M7a-1 (zóny + jednotky + napojení trhu). Ověřuj EMPIRICKY vlastním během. Přísný na **determinismus AI světa v offline dávce** (M-1 round-robin se reálně tiká, M-2 re-hydratace bez driftu — třída DR-012-02) a že M7a-1 nerozbil M5/M6/M4b.

## Co bylo implementováno (T1/T4/T5)
- T1: `worldTick` (day-index round-robin přes `_absDay`), `processZone` (ekonomika/politika), sdílená `hydrateZones` (init+load id-based merge), 13 zón + 8 aiStates + 4 frakce.
- T4: `recruitUnit` command (warrior/archer, gold cost), reuse `upkeep.military`.
- T5: `processZone` volá `marketInject` (produkční +, válčící −); S-06 pozitivní; world.tick(30) < market.drift(35).

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail). **`npm run smoke`** OK.
2. **Zone tick se REÁLNĚ tiká na day-edge (M-1 fix)**: ověř, že `worldTick`/`processZone` se reálně spustí (ne tichý no-op jako v původním curStep%dist) — přes ~13 dní se zpracují VŠECHNY zóny round-robin (day-index přes `_absDay`). Klíčové: dříve byla zónová ekonomika mrtvá.
3. **Fresh-vs-load determinismus (M-2, kritické)**: `hashState(createInitialState)` == `hashState(load(save(createInitialState)))` — zóny/frakce hydratované identicky; po N dnech sim (se zónovou aktivitou) save→load→pokračování bit-identické. Žádný load-only drift. Persist = jen dynamický stav zón (favour/gold/units/aiState…), static (id/topology/base) re-hydratováno z katalogu; payload bez derivovaných.
4. **Catch-up-safe (AI svět v dávce)**: dlouhý seedovaný sim (≥1 herní rok) se zónovou aktivitou v offline dávce → bez crashe, deterministický (stejný seed+čas → stejný hashState), levný (zone tick O(1) na den). Batch == incremental.
5. **Napojení trhu**: produkční zóna reálně injectuje (market `available` ↑, cena ↓), válčící odčerpává (available ↓, cena ↑); clamp [0,max] dodržen; arbitráž sanity (inject nerozbije market invarianty — okamžitý buy→sell neziskový). Kontrakt §8.2 signatury beze změny.
6. **Jednotky**: `recruitUnit` reálně rekrutuje (gold odečten, totWarriors/totArchers ↑); nelze bez gold; `upkeep.military` korektně účtuje upkeep rekrutovaných (month).
7. **M7a-1 nerozbil M5/M6/M4b**: m5-buildings-t4 + m6-tech-roundtrip + m4b-market-caravan + G1 (iter005-edge) nedotčené.
8. **Persist round-trip M7a-1 domén**: world.zones (dynamika), world.factions, totWarriors/totArchers, home.store; staré savy (bez world dat) → hydrateZones z katalogu (undefined-guard).
9. **Determinismus**: jediný rng('world') stream; žádný Math.random/Date.now/DOM v core (grep gate).

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK.
- **Známé gapy (NE bug)**: G-LISTZONE (approximované zóny), G-WORLD-DAYEDGE (day-edge vs per-step), G-WORLD-INJECT-QTY (inject množství approx) — schválené tom-proxy T-003, kalibrace M9. Frakční AI/revolty/UI = M7a-2 (NEtestuj, neexistují).

## Acceptance Criteria (DoD M7a-1)
- ci zelené, smoke OK.
- Zone tick se reálně tiká (ne no-op); fresh-vs-load determinismus (žádný drift); catch-up-safe (≥1 rok).
- Market.inject ze zón funguje (produkční +/válčící −, clamp); kontrakt §8.2 beze změny.
- recruitUnit + upkeep funguje; M7a-1 nerozbil M5/M6/M4b.
- Verdikt GO/NO-GO.

## Inputs
- Design: `context/refs/design_iter-016.md`, DR-016-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-016_T-004..T-006.md`
- Testy: `test/m7a-world-t1.test.js`, `m7a-units-t4.test.js`, `m7a-world-t5.test.js`, `m4b-market-caravan.test.js`, `iter005-edge.test.js`
- Kód: `src/core/systems/world.js`, `src/core/commands/recruitUnit.js`, `src/save/`, `src/data/zones.json`/`military.json`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-016_T-007.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-007 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
