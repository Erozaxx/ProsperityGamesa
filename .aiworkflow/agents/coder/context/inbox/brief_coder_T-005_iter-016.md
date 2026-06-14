# Brief

- **Brief ID**: BRIEF-016-005
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-005 = T4 (jednotky – recruitUnit)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T4 (jednotky)** dle designu: `recruitUnit` command pro hráče (warrior/archer). REUSE existující infrastruktury — `player.totWarriors/totArchers` (createHomeState:71) a `upkeep.military` (month order 30) UŽ EXISTUJÍ z M4a. NEzaváděj nový upkeep systém.

## Source of truth
`agents/coder/context/refs/design_iter-016.md` — čti **T4 sekci**. T-004 (T1 zone tick) summary: `agents/coder/artifacts/final/impl_summary_iter-016_T-004.md`.

## Scope IN (T4)
1. **`recruitUnit(unitType)` command** (`src/core/commands/`, vzor `buyCompany.js`/`recruitUnit` dle designu): validace, gold cost z `military.json` (warrior goldCost 1080, archer 1620) / `BALANCE.army`, odečet přes `pay`, inkrement `player.totWarriors`/`player.totArchers`. **registerRecruitUnit v bootstrapu** (`src/app/main.js`) — anti-dark-code (poučení z B1).
2. **Zónové jednotky persist**: zóny z T1 mají `warriors`/`archers` v dynamickém stavu (ověř proti world.js/zones.json) — ujisti se, že jsou v persist allowlistu (round-trip). Pokud T1 už pokrylo, jen ověř.
3. **Balanc** (goldCost, případné limity) → `balance.army` s odkazem na zdroj (military.json je extracted — reálná data).

## Scope OUT
- Zone tick / processZone = T1 (hotovo). Napojení trhu = T5 (T-006).
- `upkeep.military` UŽ existuje — NEduplicit. Frakční AI/bitvy/UI = M7a-2. battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej: recruitUnit (validace/gold cost/pay/inkrement totWarriors/totArchers; nelze bez gold), upkeep.military nadále korektní s rekrutovanými jednotkami, persist round-trip jednotek.
- `npm run smoke` OK.
- **Determinismus G1** + **M5/M6 round-trip** + **M7a fresh-vs-load (m7a-world-t1)** nedotčené; žádný Date.now/Math.random/DOM.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-016.md` (T4), DR-016-01
- T-004 summary
- Kód: `src/core/state/createHomeState.js` (totWarriors/totArchers ř.71), `src/core/systems/upkeep.js` (upkeepMilitary), `src/core/commands/buyCompany.js` (vzor), `src/app/main.js` (bootstrap registrace), `src/data/military.json`, `src/core/balance/balance.js` (BALANCE.army), `src/save/persistSchema.js`, `src/core/systems/world.js` (zone units)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-016_T-005.md` (soubor:funkce, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
