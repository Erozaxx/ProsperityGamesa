# Implementation Summary — iter-016 T-005 (M7a-1 T4 Jednotky — recruitUnit)

**Date**: 2026-06-14
**CI**: 1163/1163 pass, 0 fail
**Gate**: ZELENÉ

## Scope

T4 (jednotky): `recruitUnit` command pro rekrutaci warriors/archers hráčem.

## Key Files

### src/core/commands/recruitUnit.js (EXISTOVAL z předchozí práce — ověřen, kompletní)
- `findUnit(unitId)`: lookup v military.json katalogu + BALANCE.army fallback
- `recruitUnit(state, params)`: validace, goldCost, canAfford, pay(), inkrement totWarriors/totArchers
- `registerRecruitUnit(creg)`: registrace do command registry
- Registrace v `src/app/main.js`: `registerRecruitUnit(creg)` — anti-dark-code B1 (EXISTOVALO)

### test/m7a-units-t4.test.js (NOVÝ — 32 testů)
- T4-10: balance constants — BALANCE.army.warriorCost=1080, archerCost=1620, military.json goldCost
- T4-1: validation (unknown unitType / empty / numeric / count ≤ 0 / non-integer)
- T4-3: cannot recruit without gold (warrior/archer/multi-unit)
- T4-2/T4-4: gold cost and pay (1×warrior=1080, 1×archer=1620, 3×warrior=3240, count default=1)
- T4-5/T4-6: increment totWarriors/totArchers; izolace (warrior ≠ archers)
- T4-7: upkeep.military correct after recruit (5×warrior, 3×archer, combined, notEnoughMilitaryFunding)
- T4-8: persist round-trip (totWarriors, totArchers, hashState G1 determinism, zone warriors/archers)

## Ověření persist round-trip zónových jednotek (warriors/archers)

Per design §8.1.d — zone warriors/archers persist je pokryt z T1 (T-004):
- `test/m7a-world-t1.test.js` T1-4: `applyPersist` saves warriors/archers per zone
- T1-7: `applyPersist + hydrateZones: dynamic state preserved` — explicitně testuje `zone.warriors=999`
- T4-8 (nový): `zone warriors/archers survive round-trip (M7a T1+T4 combined)` — kombinovaný test

## Balance (§5.3 design)

`BALANCE.army.warriorCost=1080` / `archerCost=1620` — existují z M4a, zdroj: `dump.GOLDCOSTPERWARRIOR`
/ `dump.GOLDCOSTPERARCHER`, shodují se s `military.json goldCost` (provenance: extracted). Žádné nové konstanty
— reuse dle designu.

## Scope OUT (dle designu)

- zone tick = T1 (done, T-004)
- marketInject = T5 (T-006)
- upkeep.military — NEduplicit (existuje z M4a, pouze reused)
- frakční AI/bitvy/UI = M7a-2
- battle.js — NEDOTČEN

## Gate výsledek

| Gate | Výsledek |
|---|---|
| `npm run ci` | 1163/1163 PASS, 0 FAIL (+32 nových) |
| `npm run smoke` | SMOKE OK |
| Determinismus G1 | PASS (hashState round-trip T4-8) |
| M5/M6 round-trip | NEDOTČENO (1163 PASS zahrnuje m5/m6 testy) |
| M7a fresh-vs-load (m7a-world-t1) | NEDOTČENO (T1-3/T1-4 stále zelené) |
| Math.random/Date.now/DOM | 0 (recruitUnit je čistá fn nad state) |
| Precache regen | NE (military.json nezmněn, manifest nezměněn) |
