# Brief

- **Brief ID**: BRIEF-020-002
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-002 (reviewer) — review designu M9a
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Review **designu M9a** (kalibrační metodika, ne kód) před implementací. Ověř, že DoD je formulován proti **EXPLICITNÍM hratelnostním cílům**, ne proti neexistující serverové referenci (R-C / §9.1), že cíle jsou **měřitelné a testovatelné**, harness **deterministický a pod časový limit** (dekompozice L), cap hodnota zdůvodněná, a vědomé odchylky zapsané v datech, ne skryté v logice. Architektonický gate před tom-proxy.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-020_T-001.md`

## Na co se zaměřit (kritické)
1. **Cíle proti referenci (KLÍČOVÉ, R-C)**: DoD formulován proti definovaným hratelnostním cílům (recovery N dní, arbitráž nezisková, impact persistence), NE proti rekonstrukci serverových dat (originál je nemá). Ověř, že 3 cíle (CÍL-1/2/3) jsou matematicky odvozené a měřitelné jako automatizované testy. Posuď N=14 (0.8^14≈0.044<0.05), okno driftK [0.10,0.40], driftK=0.2 volba.
2. **Determinismus harness + dekompozice (KLÍČOVÉ)**: simulační harness seedovaný, deterministický; žádný Date.now/Math.random/DOM. **Dekompozice L**: kvartální segmenty (91 dní) přes save/load checkpointy + multi-seed split tak, aby žádný `it()` nepřekročil časový limit prostředí. Ověř proveditelnost (segmenty se napojí přes save/load bez driftu).
3. **Kalibrace = DATA ne logika**: cenový i drift vzorec beze změny (§9.1); měněn jen `driftK`/baseline v balance datech. Cap = nová konstanta `offline.capBalanceRealHours` oddělená od `capTechRealHours`, engine `min(tech,balance)` — ověř, že separace nerozbije existující offline cap chování (D10) a že `min` je správný kontrakt.
4. **Vědomé odchylky**: home.js:970 (JS precedence bug `?:`<`+`) → zvolena zamýšlená varianta, zapsaná jako `original-intended`. Posuď, zda je odchylka korektně zdokumentovaná (data/DR, ne skrytě).
5. **Golden-hash checkpointy**: verzovaný artefakt referenčních hashů — ověř, že je deterministický a regeneorvatelný (ne flaky), a že invarianty křivek (pop 0–10000, gold≥0, food≤max, žádný NaN, žádný starve>30 dní) jsou správné strážce.
6. **Split** (C-020-A trh / C-020-B cap+regression) — paralelizovatelné, oba Sonnet? Souhlasíš?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení: cíle-proti-referenci (R-C), determinismus harness + dekompozice (pod limit), kalibrace=data, cap separace+min kontrakt, vědomé odchylky, split.

## Inputs
- Design: `context/refs/design_iter-020_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§9.1 trh/drift, §9.2a/D10 cap, K4/K7, R1(S-03)/R2b/R-C)
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-017)
- Kód: `src/core/systems/market.js`, `src/core/balance/balance.js` (driftK:0.2, capTechRealHours:8), `src/core/engine/catchup.js` (cap aplikace), originál home.js:970

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-020_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + cíle/harness/cap + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Cíle-proti-referenci (R-C) + determinismus harness/dekompozice (pod limit) + cap separace prověř obzvlášť pečlivě — to jsou nejrizikovější body M9a.
