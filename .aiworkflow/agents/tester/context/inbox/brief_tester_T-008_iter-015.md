# Brief

- **Brief ID**: BRIEF-015-008
- **Iteration**: iter-015 (M6)
- **Task**: T-008 (tester) — plný test loop M6 + **DoD M6 (K13 plně)**
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-14

## Goal
Nezávislá QA M6 (tech strom + techy jako modifikátory + academy/research + UI) a ověření **DoD M6**: K13 zcela naplněno (budovy z M5-1 + techy z M6 přes stejnou modifier vrstvu). Ověřuj EMPIRICKY vlastním během. Přísný na determinismus/persist (tech modifikátory + research — třída DR-012-02) a na to, že **M6 nerozbil M5** (round-trip budov + kontrakty).

## Co bylo implementováno
- T1: techs.json (6 sektorů, 7 techů), buyTech command + registerBuyTech, M-1 player init, techCap reuse.
- T2: techy jako modifikátory (rebuildBuildingDerived krok b2, addTechModifiers/applyTechModifiers), round-trip-s-techy bit-identický.
- T3: research.js (researchDaily day order 75), exp z jobů+academy/university, level-up → grant techPt.
- T4: TechScreen UI + tab Veda + selektory.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail). **`npm run smoke`** OK (tab Veda renderuje, 0 console errors).
2. **buyTech lifecycle**: validace prereqs (⊆ unlockedTechs), canAfford(techPt), pay (odečet techPt), odemčení; tech efekt se projeví v `home.derived` (přes effective, budovy-cílící tech). Nelze koupit bez techPt / bez prereqs / 2×.
3. **Tech modifikátory round-trip = IDENTITA (plný hashState)**: buyTech budovy-cílící tech(y) (+ postavit cílovou budovu) → snapshot hashState → save → load → rebuild → **bit-identický**. Save = jen unlockedTechs + modifikátory; payload bez derivovaných tech dat (home.derived/_effCache/_modVersion). Ověř víc kombinací.
4. **K13 plně**: budovy A techy jdou přes STEJNOU modifier vrstvu (catalogState.modifiers, source=building:* i tech:*); jedna sdílená re-derivační cesta (rebuildBuildingDerived); deterministický fold. Ověř, že kombinace budova+tech na stejný atribut se foldí korektně (add→mul→set).
5. **Research/techPt produkce**: dlouhý seedovaný sim (≥1 herní rok) → research akumuluje exp, level-up grantuje techPt, deterministicky (stejný seed → stejný research stav + techPt). techCap level-up tabulkově (100/125/156…). Catch-up-safe (research v offline dávce == live).
6. **M6 NEROZBIL M5**: M5-1 round-trip (m5-buildings-t4) + kontrakty (m5-contracts) + build UI stále funkční; G1 (iter005-edge) plný hashState nedotčen.
7. **Persist round-trip všech M6 domén**: unlockedTechs, research.sectors (level+exp), + M5 domény; staré savy (bez unlockedTechs/research) → undefined-guard → {} / {sectors:{}}.
8. **Determinismus**: žádný Math.random/Date.now/DOM v core (grep gate); fresh-vs-load identita i s techy+research.
9. **UI funkční**: TechScreen renderuje (tech strom, research progres, techPt); buyTech tlačítko reálně odemyká (mění stav); žádná logika v UI (deriváty v selektorech).

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK, necommituj.
- **Známé gapy (NE bug)**: G-TECH-JOB-EFFECTIVE (tech efekty na job-produkci no-op, jobsProduction nečte přes effective() → M9); univ Math.random bonus vynechán (determinismus). Tyto NEhlásíš jako bug — jsou schválené (tom-proxy T-003, sledovací M9).

## Acceptance Criteria (DoD M6)
- ci zelené, smoke OK (UI renderuje).
- Tech modifikátory round-trip identita (plný hashState); K13 plně (budovy+techy jedna vrstva).
- Research produkuje techPt deterministicky; catch-up-safe (≥1 rok sim).
- M6 nerozbil M5 (round-trip + kontrakty + G1).
- Verdikt GO/NO-GO (DoD M6).

## Inputs
- Design: `context/refs/design_iter-015.md`, DR-015-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-015_T-004..T-007.md`
- Testy: `test/m6-tech-t1.test.js`, `m6-tech-roundtrip.test.js`, `m6-tech-research.test.js`, `ui-selectors-m6.test.js`, `m5-buildings-t4.test.js`, `iter005-edge.test.js`
- Kód: `src/core/systems/research.js`, `buildings.js` (tech helpers), `src/core/commands/buyTech.js`, `src/ui/` (TechScreen/selektory), `src/save/`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-015_T-008.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-008 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
