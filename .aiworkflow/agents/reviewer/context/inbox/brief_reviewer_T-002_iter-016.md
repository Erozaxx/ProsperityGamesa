# Brief

- **Brief ID**: BRIEF-016-002
- **Iteration**: iter-016 (M7a – AI svět & jednotky)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Review **designu M7a** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (§8.2/§8/K16/K17), proveditelnost Sonnet coderem, **determinismus/catch-up-safe** (AI svět v offline dávce — nejrizikovější), a posuď **split M7a-1/M7a-2**. Architektonický gate (T-002) před tom-proxy schválením.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-016_T-001.md`

## Na co se zaměřit (kritické)
1. **Determinismus + catch-up-safe (AI svět v dávce)**:
   - **Bezstavový round-robin** zone tick (`zoneIndex = curStep/dist % len`, žádný uložený kurzor) — ověř, že je deterministický a přežije save/load bez driftu.
   - Jediný `rng('world')` stream (žádný nový — ověř proti rng.js); frakční automat + AI-AI bitvy přes tento stream, ne `Math.random`.
   - **Schedule serializovatelný** (scheduleInsert/K17 index, ne Engine.insert objektová reference); self-rearm `world.processFaction` přežije save/load.
   - **Re-hydratace static zón z katalogu na load** (anti-DR-012-02): derivované (ratingy/goldDemand/production) se NEukládají, re-generují se; jen dynamický stav zón persistován. Ověř, že to nezavádí load-only větev / drift.
2. **Kontrakt §8.2 market.inject**: `marketInject`/`getGoldValue` BEZ změny signatur (změna = decision record). Ověř, že design nemění kontrakt; negativní test S-06 → pozitivní.
3. **battle.js NEDOTČEN**: AI-AI bitvy = RNG resolve vzorcem; AI-vs-player → scheduleInsert('startBattle') jako M7b stub. Ověř, že design battle automat odkládá na M7b.
4. **Jednotky**: reuse `player.totWarriors/totArchers` + `upkeep.military` (M4a) — ověř, že existují a M7a-1 nezavádí duplicitní upkeep.
5. **Split M7a-1(T1,T4,T5)/M7a-2(T2,T3,T6)**: je M7a-1 (zone tick + jednotky + market.inject) samostatně hratelné/testovatelné bez frakční AI? Doporuč split ano/ne + hranice.
6. **G-LISTZONE**: approximovaný obsah (~13 zón + AISTATES 0-7), provenance:'approximated', doložitelné z originálu — postup OK (Q3/DR-001)?
7. **Soulad** s architekturou (§8.2, kontrakty §8, K16/K17) + proveditelnost Sonnet. tickOrder dopady (world.gatherTributes month order 25, worldTick order 30 před market.drift 35).

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení determinismu (round-robin + re-hydratace + schedule) + splitu.

## Inputs
- Design: `context/refs/design_iter-016_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2, §8, K16/K17)
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-014(M7a), split-trigger)
- DR-013-00
- Kód pro ověření: `src/core/systems/world.js` (stub), `src/core/systems/market.js` (marketInject/getGoldValue), `src/core/engine/` (scheduleInsert, rng 'world' rng.js:10), `src/core/systems/upkeep.js` (military), `src/save/load.js`, `src/data/zones.json`/`military.json`, originál `doc/original_source/modules/prosperity/services/world.js`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-016_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Determinismus AI světa v dávce (round-robin, schedule, re-hydratace zón) prověř obzvlášť pečlivě — je to nejrizikovější (catch-up-safe invariant + DR-012-02 třída). Ověřuj proti kódu.
