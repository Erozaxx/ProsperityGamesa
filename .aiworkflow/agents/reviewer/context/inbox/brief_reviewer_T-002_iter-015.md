# Brief

- **Brief ID**: BRIEF-015-002
- **Iteration**: iter-015 (M6 – Výzkum & tech strom)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Review **designu M6** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (K13/K14/§6), proveditelnost Sonnet coderem, a **determinismus/persist** invarianty (zejm. generalizace sdílené re-derivace budovy+techy — nejrizikovější bod). Architektonický gate (T-002) před tom-proxy schválením.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-015_T-001.md`

## Na co se zaměřit (kritické)
1. **Generalizace rebuild (T2) — bez regrese M5-1**: design rozšiřuje stávající `rebuildBuildingDerived` o krok re-gen `tech:*` modifikátorů (helpery addTechModifiers/removeAllTechSourcedModifiers) → JEDNA cesta re-aplikující budovy I techy. Ověř proti `src/core/systems/buildings.js`:
   - Round-trip identita budov z M5-1 **zůstane** (unlockedTechs={} → tech krok no-op → bit-identické)?
   - **Žádná load-only ani tech-only větev** foldu (třída bugu DR-012-02)? Volá se z load Step 5 + mutací + createInitialState + buyTech delta?
   - tech modifikátory ve stejném `catalogState.modifiers`, source=`tech:<id>`, deterministický fold (sort by source,id)?
2. **techCap**: design tvrdí vzorec UŽ existuje `formulas.js:31` (round(100×1.25^level)). Ověř, že tam je a je doložitelný (original_source_doc §6). Coder jen reuse + test.
3. **Persist**: save = jen `unlockedTechs` (plain object) + `catalogState.modifiers`. Derivované (effective/agregáty) se NEukládají. Round-trip korektní; staré savy (bez unlockedTechs) přes undefined-guard.
4. **buyTech command**: validace prerekvizit (⊆ unlockedTechs) + canAfford(techPt) + pay; **registerBuyTech v bootstrapu** (anti-dark-code, poučení z B1 iter-014). Ověř, že design to předepisuje.
5. **Academy/research determinismus**: `research.daily` (day, order 75), grant techPt přes ctx; design vynechává originálový `Math.random` university bonus (deterministicky) → gap. OK? Catch-up-safe (levné v dávce)?
6. **G-LISTTECHS**: approximovaný strom (6 sektorů + ~6 techů s efekty jako modifikátory), provenance:'approximated', vzorec doložitelný. Postup OK (Q3/DR-001)?
7. **Soulad** s architekturou (K13 tvar modifikátoru §5.3, K14, persist §6) + proveditelnost pro Sonnet. Split NE — souhlasíš?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení generalizace rebuild (regrese M5-1?) + determinismus/persist.

## Inputs
- Design: `context/refs/design_iter-015_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.3 K13, §5.4 K14, §6)
- M5-1 design + kód: `agents/architect/artifacts/final/design_iter-013_T-001.md`, `src/core/systems/buildings.js` (rebuildBuildingDerived, effective, addBuildingModifiers), `src/core/balance/formulas.js` (techCap ~ř.31), `src/core/commands/buyCompany.js` (vzor), `src/save/load.js` (Step 5), `src/data/techs.json`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-015_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Generalizace rebuild + determinismus/persist prověř obzvlášť pečlivě (riziko regrese M5-1 round-trip identity). Ověřuj proti kódu, ne proti tvrzení.
