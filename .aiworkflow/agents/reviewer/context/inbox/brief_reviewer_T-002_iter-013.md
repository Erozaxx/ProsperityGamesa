# Brief

- **Brief ID**: BRIEF-013-002
- **Iteration**: iter-013 (M5 – Budovy, stavba, kontrakty)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Review **designu M5** (architektonický návrh, ne kód) před zahájením implementace. Ověř correctness, soulad se schválenou architekturou iter-002 (D/K/R/§), proveditelnost Sonnet coderem, a posuď doporučení **splitu M5-1/M5-2**. Toto je architektonický gate (T-002) před tom-proxy schválením (T-003).

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-013_T-001.md` (= `agents/architect/artifacts/final/design_iter-013_T-001.md`, 562 ř.)

## Na co se zaměřit
1. **Soulad s architekturou** iter-002: §5.3 (K13 modifikátory – fold add→mul→set, save jen modifikátory), §5.4 (K14 registr efektů – string-ID+params, ne imperativní háčky), §6.3–6.4 (persist allowlist + load=čistá konstrukce), §7.1 (transakce pay/canAfford), §8 (kontrakty). Označ jakoukoli odchylku od D1–D13/K0–K19.
2. **Correctness invariantů**:
   - Determinismus + catch-up-safe: žádný Date.now/Math.random/DOM v core; deterministické čítače (projectSeq/contractSeq/totalMade); izolovaný rng stream; levné v dávce (day/quarterDay).
   - **Save = JEN seznam modifikátorů** (nikdy derivované hodnoty); re-aplikace po loadu = fold. `created===instances.length` re-derivace.
   - Žádné in-place `applyUpgrade` mutace.
3. **scaleCost rozhodnutí**: architekt zjistil, že originál budovy neškáluje podle počtu → navrhuje approximated `scaleCostByCount` (default scaleFactor=1.0 = faithful), gap G-BUILD-COSTSCALE, kalibrace M9. Posuď, zda je to korektní (věrnost vs. hratelnost) a zda default=1.0 nerozbije hratelnost M5.
4. **Split M5-1(T1–T4)/M5-2(T5–T6)**: posuď doporučení. Je M5-1 (T1–T4: building instances + projectQueue/builder/scaleCost + companies + modifier vrstva) skutečně samostatně hratelné a koherentní BEZ T6 (build UI je v M5-2)? Pokud ne, navrhni jinou hranici (např. T6 UI částečně do M5-1). Doporuč orchestrátorovi: split ano/ne + kde.
5. **T4 (L) dekompozice**: ověř, že 6 kroků T4.1–T4.6 je opravdu Sonnet-proveditelných (master plán §1.2).
6. **G-LISTBUILDINGS gap**: postup (doplnit ≥6 budov approximated, informativní eskalace) dle Q3/DR-001 — OK?

## Inputs
- Design: `context/refs/design_iter-013_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.3, §5.4, §6, §7.1, §8)
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-012(M5), §1.2, split-trigger pozn.)
- DR-013-00 (`context/refs/`)
- Kód pro ověření tvrzení: `src/core/registry/effects.js`, `src/core/systems/market.js` (getGoldValue), `src/save/`, `src/data/buildings.json`, `src/core/balance/formulas.js`

## Acceptance Criteria
- Každý nález klasifikován: blocker / major / minor / nit, s konkrétním návrhem.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO pro zahájení implementace.
- Explicitní doporučení ke splitu (ano/ne + hranice).
- Ověření, že design je dost konkrétní pro Sonnet implementaci bez dalšího architektonického rozhodování.

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-013_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + split doporučení + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Věcně, konkrétně, s návrhem u každého nálezu. Determinismus/persist invarianty prověř obzvlášť pečlivě (jsou to tvrdé gaty M5).
