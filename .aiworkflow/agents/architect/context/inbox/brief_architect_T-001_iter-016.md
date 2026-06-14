# Brief

- **Brief ID**: BRIEF-016-001
- **Iteration**: iter-016 (M7a – AI svět & jednotky)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-14

## Goal
Detailní implementační design **M7a** (AI svět: zóny, frakční AI, revolty/questy/tribute, jednotky, napojení trhu) na úroveň pro Sonnet codera. Drž architekturu iter-002 (D/K/§8.2). Design, ne kód. **ROZHODNI SPLIT** M7a-1/M7a-2 (master plán §3/iter-014 split-trigger).

## Stav repo
- **Stuby** (z M2a, k nahrazení): `src/core/systems/world.js` (`worldTick` day edge order 30, no-op), `src/core/systems/battle.js` (battle = M7b/iter-017, NEsahej teď). Kontraktní testy §8 existují.
- **rng streamy** `'world'` + `'battle'` UŽ existují (`rng.js:10`).
- **Katalogy**: `src/data/zones.json` (frakce: player/thePrincess/thePsychopath/theWarlord; policies: Growth/Military/Resource; **prázdné `zones[]` + `aiStates[]`** — gap G-LISTZONE); `src/data/military.json` (warrior goldCost 1080/upkeep 108, archer 1620/162 — EXTRACTED, reálná data).
- **Kontrakt M4b**: `market.inject(state, goodsId, qty)` (`src/core/systems/market.js`) + `getGoldValue` — smí se volat (M7a plní kontrakt).
- Modifier vrstva K13, registr efektů K14, schedule (serializovatelný), persist `src/save/`.

## Zadání designu (master plán §3/iter-014(M7a), T1–T6)
1. **T1 – Zone tick (§8.2)**: `processZone(state, zoneId, rng('world'))`, round-robin přes 5denní periodu (ne všechny zóny každý tick), ekonomika/politika zóny vzorci z balance dat (goldDemand ~150×units, production ~50×workers, favour). Stav zón ve `state` (serializovatelný, deterministický).
2. **T2 – Frakční AI automat**: AISTATES 0–7 jako **data** + přechodová funkce (deterministická), plánování přes schedule (string-ID + index K17), aktivační prahy z balance dat. (Frakce princess/psychopath/warlord chování — odvoditelné z originálu `world.js`.)
3. **T3 – Revolty + questy + tribute**: oceňování přes `getGoldValue`; AI–AI bitvy RNG resolve **vzorcem** (ne plný battle automat — to je M7b).
4. **T4 – Jednotky**: warriors/archers (z military.json), rekrutace, upkeep (month, jako existující upkeep systém), persist schéma.
5. **T5 – Napojení trhu na zóny**: produkční zóny `market.inject(goodsId, qty)`, válčící odčerpávají (plní kontrakt z M4b; negativní test S-06 se obrací na pozitivní).
6. **T6 – UI world/zones screen**: mapa zón, frakce, diplomacie/policy (selektory + commands, žádná logika v UI).

## Povinná rozhodnutí
- **SPLIT** (master plán §3/iter-014 pozn.): doporuč **M7a-1 (T1, T4, T5: zóny + jednotky + napojení trhu)** / **M7a-2 (T2, T3, T6: frakční AI + revolty/questy/tribute + UI)** — ano/ne + odůvodnění. T1 (zone tick) a T2 (frakční automat) jsou dva nezávislé L celky.
- **G-LISTZONE**: zones.json má prázdné zones[]/aiStates[]. Navrhni approximovaný obsah (min. hratelná sada zón + AISTATES 0–7), provenance:'approximated', odvozeno z originálu `world.js`, kalibrace M9.
- **Determinismus/catch-up-safe (kritické)**: AI svět MUSÍ běžet deterministicky v offline dávce (catch-up); rng('world') izolovaný; schedule serializovatelný (přežije save/load); žádný Date.now/Math.random mimo rng stream/DOM v core.

## Scope OUT
- Žádný kód. Battle automat = M7b/iter-017 (NEsahej battle.js). Žádná změna architektury iter-002 ani kontraktů §8 signatur (změna = decision record).

## Inputs
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-014(M7a), §1.2, split-trigger)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2 zone tick, §8 kontrakty/world, K8/K16/K17)
- Kód: `src/core/systems/world.js` (stub), `src/core/systems/market.js` (market.inject/getGoldValue), `src/core/engine/` (schedule, rng 'world'), `src/core/systems/upkeep.js` (vzor upkeep), `src/save/`, `src/data/zones.json`, `src/data/military.json`, `src/core/balance/balance.js` (BALANCE.world prahy)
- Originál: `doc/original_source/modules/prosperity/services/world.js` (frakční AI, zóny, AISTATES — zdroj pravdy mechanik)
- DR-013-00 (`context/refs/`)

## Acceptance Criteria
- Design pokrývá T1–T6 pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Explicitní SPLIT rozhodnutí (M7a-1/M7a-2) + co je v které části.
- Determinismus/catch-up-safe: zone tick + frakční automat + AI-AI bitvy deterministické v dávce; schedule serializovatelný.
- Persist schéma (zóny, jednotky, frakční stav) — co se ukládá / co derivuje.
- G-LISTZONE postup (approximované zóny + AISTATES).
- tickOrder dopady + diagram; kontrakt market.inject §8.2 naplněn beze změny signatur.
- Žádný rozpor s D/K/§; cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-016_T-001.md` + poznámka pro orchestrátora o splitu (rozdělím plán/iterace).

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + split rozhodnutí + G-LISTZONE>"`
- NEcommituj (git).
