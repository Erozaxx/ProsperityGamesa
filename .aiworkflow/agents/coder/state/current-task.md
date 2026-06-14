# Current Task

- **Task ID**: T-005 (iter-016 M7a-1 — T4 jednotky: recruitUnit command)
- **Brief**: brief_coder_T-005_iter-016.md
- **Iteration**: iter-016
- **Status**: done
- **Done**: 2026-06-14

## Vysledek
- recruitUnit command (src/core/commands/recruitUnit.js): EXISTOVAL z předchozí práce; ověřen a kompletní
  - Validace: unitType string, count pozitivní integer, existence v military.json katalogu
  - Gold cost: warrior 1080, archer 1620 (z military.json + BALANCE.army fallback)
  - pay(): gold decrementován, guard canAfford
  - Inkrement: player.totWarriors / player.totArchers
  - Registrace: main.js registerRecruitUnit(creg) — anti-dark-code B1
- test/m7a-units-t4.test.js (NOVÝ): 32 testů, 7 describe skupin
  - T4-10: balance constants (BALANCE.army.warriorCost=1080, archerCost=1620, military.json)
  - T4-1: validace (unknown unitType, count=0/-1/1.5, empty string, numeric type)
  - T4-3: nelze bez gold (warrior <1080, archer <1620, multi-unit)
  - T4-2/T4-4: gold cost a pay (1×warrior=1080, 1×archer=1620, 3×warrior=3240, count default=1)
  - T4-5/T4-6: inkrement totWarriors/totArchers, izolace (warrior ≠ archers a naopak)
  - T4-7: upkeep.military correct po rekrutaci (5×warrior, 3×archer, kombinovaný, notEnoughMilitaryFunding)
  - T4-8: persist round-trip (totWarriors, totArchers, hashState G1 determinism, zone warriors/archers)
- Persist zone warriors/archers: ověřeno → pokryto z T1 (T1-7 applyPersist+hydrateZones)
- BALANCE.army.warriorCost/archerCost: existují, odpovídají military.json (extracted)
- CI: 1163/1163 pass, 0 fail (+32 nových T4 testů)
- Smoke: SMOKE OK
- G1+M5/M6+M7a determinismus: nedotčen (round-trip, hashState, zone-fresh-vs-load vše zeleně)
- Git: NEcommitováno
