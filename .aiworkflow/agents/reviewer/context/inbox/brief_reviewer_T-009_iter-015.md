# Brief

- **Brief ID**: BRIEF-015-009
- **Iteration**: iter-015 (M6)
- **Task**: T-009 (reviewer) — **review gate M6 + DoD M6 (K13 plně)** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Závěrečný **review gate M6** (master plán §1.4, právo re-run) + ověření **DoD M6**: K13 zcela naplněno (budovy z M5-1 + techy z M6 přes stejnou modifier vrstvu). QA (T-008) dala GO empiricky; ty hodnotíš correctness + kvalitu + dodržení invariantů. Přísně prověř determinismus tech modifikátorů + research (třída DR-012-02) a že M6 nerozbil M5.

## Rozsah review (produkční diff M6)
Base→HEAD: `735846d..HEAD` (jen iter-015). Klíčové soubory:
```
src/core/systems/buildings.js     (+118 – rebuildBuildingDerived krok b2, addTechModifiers/applyTechModifiers/removeAllTechSourcedModifiers, findTech)
src/core/systems/research.js      (+152 – researchDaily, exp, level-up, grant techPt)
src/core/commands/buyTech.js      (buyTech + registerBuyTech)
src/data/techs.json (+148), buildings.json (academy/university), jobs.json (kategorie)
src/core/balance/balance.js (research), tickOrder.js (research.daily order 75), createHomeState.js (M-1 init), persistSchema.js
src/ui/screens.js (TechScreen), selectors.js (selectTechTree/Research/TechPoints), App.js (tab), styles.css
test/m6-tech-t1.test.js, m6-tech-roundtrip.test.js, m6-tech-research.test.js, ui-selectors-m6.test.js
```
Diff: `git diff 735846d..HEAD -- src/ test/m6-* test/ui-selectors-m6.test.js`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Techy jako modifikátory K13 PLNĚ**: tech efekty výhradně přes `catalogState.modifiers` (source=`tech:<id>`), STEJNÁ vrstva jako budovy. **Jedna sdílená re-derivace** (`rebuildBuildingDerived` krok b2) volaná z load Step 5 + mutací + createInitialState + buyTech delta (`applyTechModifiers`). ŽÁDNÁ load-only ani tech-only větev (DR-012-02). Ověř proti kódu všechny call-sites.
2. **Determinismus**: `_modVersion` reset konzistentní v obou cestách (rebuild + applyTechModifiers); deterministický fold (sort by source,id; add→mul→set); kombinace budova+tech na stejný atribut foldí korektně. Round-trip s techy bit-identický. Save = jen `unlockedTechs` + modifikátory; payload bez derivovaných (`home.derived`/`_effCache`/`_modVersion`).
3. **M-1 player init**: `createPlayerState` má `unlockedTechs:{}` + `research:{sectors:{}}` → fresh==load (žádný undefined-vs-{} desync). Fresh-vs-load test existuje.
4. **M-2 defenzivní guard**: `addTechModifiers`/`findTech` s `hasCatalog('techs')` guard + `if(!tech)continue` — rebuildBuildingDerived nesmí crashnout bez katalogu (createInitialState bez katalogů).
5. **Research determinismus**: `researchDaily` bez Math.random/Date.now/DOM; level-up `grant` přes ctx; catch-up-safe (batch==incremental).
6. **M6 nerozbil M5**: M5-1 round-trip (m5-buildings-t4) + kontrakty + G1 nedotčené. techCap reuse (formulas.js, žádná duplikace).

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu).
2. **Soulad s designem** `context/refs/design_iter-015.md` (vč. T-002a revize) a architekturou (K13 §5.3, K14, persist §6). Odchylky označ.
3. **Reuse/simplify/mrtvý kód** (soubor:řádek + návrh). Zejm. `removeAllTechSourcedModifiers` použití, žádná duplikace fold logiky budovy vs techy.
4. **Persist/migrace**: nová pole (unlockedTechs/research) — staré savy OK (undefined-guard)?
5. **Živé artefakty**: tickOrder doc + diagram aktuální (research.daily order 75).
6. **Gapy** (G-LISTTECHS, G-TECH-JOB-EFFECTIVE, univ Math.random) korektně označené `provenance:'approximated'` + v gap-reportu? **Pozn.**: G-TECH-JOB-EFFECTIVE + univ Math.random jsou SCHVÁLENÉ (tom-proxy T-003, sledovací M9) — neflaguj jako blocker, jen ověř že jsou zdokumentované.
7. **DoD M6**: K13 zcela naplněno (budovy+techy)? Milník kompletní?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M6 (K13 plně)**.

## Inputs
- Design: `context/refs/design_iter-015.md`; QA: `context/refs/qa_report_iter-015_T-008.md`; DR-015-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.3 K13, §5.4, §6)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-015_T-004..T-007.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-015_T-009.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-009 "<verdikt + DoD M6 + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus tech modifikátorů + research (re-derivace, fold, _modVersion) prověř obzvlášť pečlivě — ověřuj proti kódu, ne tvrzení.
