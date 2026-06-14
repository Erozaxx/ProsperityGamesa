# Brief

- **Brief ID**: BRIEF-016-008
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-008 (reviewer) — **review gate M7a-1** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Závěrečný **review gate M7a-1** (master plán §1.4, právo re-run). QA (T-007) dala GO empiricky; ty hodnotíš correctness + kvalitu + dodržení invariantů. Přísně prověř **determinismus AI světa v dávce** (M-1 round-robin se reálně tiká na day-edge, M-2 re-hydratace zón bez load-only větve/driftu — třída DR-012-02) a kontrakt §8.2.

## Rozsah review (produkční diff M7a-1)
Base→HEAD: `afac3b9..HEAD` (jen iter-016). Klíčové soubory:
```
src/core/systems/world.js     (+449 – worldTick day-index round-robin, processZone ekonomika/politika + marketInject, hydrateZones)
src/core/commands/recruitUnit.js (+120)
src/data/zones.json (+529 – 13 zón, 8 aiStates, 4 frakce, approximated)
src/core/state/createInitialState.js (createWorldState init), src/save/load.js + persistSchema.js (zone persist/hydratace)
src/core/balance/balance.js (BALANCE.world), src/app/main.js (registerRecruitUnit)
test/m7a-world-t1.test.js, m7a-units-t4.test.js, m7a-world-t5.test.js
```
Diff: `git diff afac3b9..HEAD -- src/ test/m7a-*`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **M-1 zone tick se REÁLNĚ tiká**: `worldTick`/`processZone` na day-index round-robin přes `_absDay` (`day % daysPerZoneSlot === 0`, zoneIndex z dayIndex) — NE mrtvý `curStep % dist`. Ověř, že se zóny reálně zpracují (ne tichý no-op). Bezstavový (žádný kurzor → přežije save/load).
2. **M-2 re-hydratace zón (DR-012-02)**: sdílená `hydrateZones(state)` volaná z `createInitialState` I `load` (žádná load-only ani init-only větev); **id-based merge** (ne generický Object.assign na pole → žádný stale tail/index mismatch); `createWorldState` init zones/factions; persist = jen dynamický stav zón (favour/gold/units/aiState…), static (id/topology/base) re-hydratováno z katalogu; payload bez derivovaných. Fresh-vs-load hashState identický.
3. **Kontrakt §8.2 market.inject**: `marketInject`/`getGoldValue` BEZ změny signatur (změna = decision record); produkční zóny inject(+), válčící(−), clamp [0,max]; world.tick(30) před market.drift(35).
4. **battle.js NEDOTČEN**: AI-vs-player → scheduleInsert stub M7b; žádná battle logika v M7a-1.
5. **Jednotky**: reuse `player.totWarriors/totArchers` + `upkeep.military` (M4a) — žádný duplicitní upkeep; recruitUnit přes pay; registerRecruitUnit v bootstrapu.
6. **Determinismus**: jediný `rng('world')` stream; žádný Math.random/Date.now/DOM v core; catch-up-safe (zone tick O(1)/den).

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu, ne tvrzení).
2. **Soulad s designem** `context/refs/design_iter-016.md` (vč. T-002a revize §2.1/§8.1) a architekturou (§8.2, §8, K16/K17). Odchylky označ.
3. **Reuse/simplify/mrtvý kód** (soubor:řádek + návrh). Zejm. M7a-2 stuby v processZone (frakce/tribute) — jsou jasně označené a no-op, ne polovičatá logika?
4. **Persist/migrace**: nová pole (world.zones/factions) — staré savy OK (hydrateZones z katalogu)? persist allowlist korektní (jen dynamika)?
5. **Živé artefakty**: tickOrder doc + diagram aktuální (world.tick pozice, gatherTributes je M7a-2).
6. **Gapy** (G-LISTZONE, G-WORLD-DAYEDGE, G-WORLD-INJECT-QTY) korektně označené `provenance:'approximated'` + v gap-reportu? **Schválené tom-proxy T-003 — neflaguj jako blocker, jen ověř dokumentaci.**
7. **DoD M7a-1**: zóny tikají + ekonomika, jednotky, napojení trhu — splněno? (Frakční AI = M7a-2.)

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M7a-1** + determinismu (round-robin reálně tiká, re-hydratace bez driftu).

## Inputs
- Design: `context/refs/design_iter-016.md`; QA: `context/refs/qa_report_iter-016_T-007.md`; DR-016-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2, §8, K16/K17)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-016_T-004..T-006.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-016_T-008.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-008 "<verdikt + DoD M7a-1 + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus zone tick (round-robin reálně tiká) + re-hydratace (hydrateZones, id-merge, žádná load-only větev) prověř obzvlášť pečlivě — ověřuj proti kódu. M-1 byl reálný silent-no-op bug; ověř, že oprava skutečně tiká.
