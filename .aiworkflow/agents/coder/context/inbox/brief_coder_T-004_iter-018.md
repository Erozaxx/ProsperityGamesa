# Brief

- **Brief ID**: BRIEF-018-004
- **Iteration**: iter-018 (M7b)
- **Task**: T-004 = T1+T2 (L) — battle automat + damage/revival vzorce
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **jádro battle automatu** (T1 battleState/battleStep/battleTick + T2 damage/revival vzorce) dle designu — nejcitlivější task M7b (determinismus + 1:1 originál). Naplňuje `battle.js` stub (kontrakt §8.1). Drž invarianty DOSLOVA. Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-018.md` — čti **§3 (battleStep kroky), §4 (crit M-3), §6.1a (baseRevival M-1), §7.3 (cd double-decrement M-2), §8.1/§8.1a (serializovatelnost F-1), §6.5/§8.3**. DR-018-01. Originál `doc/original_source/modules/prosperity/services/battle.js`.

## ⚠️ Tvrdé invarianty (review gate je ověří — NEPORUŠ)
1. **Kontrakt §8.1 beze změny signatury**: `battleStep(bs, commands, rng)` (battle.js:29) signatura zůstává. BattleState top-level klíče `{zoneId, sides:{player,opponent}, state, tick, log, summary}` beze změny.
2. **Serializovatelnost (F-1, kill-resume)**: celý `state.battle` MUSÍ být serializovatelný — **ŽÁDNÉ cyklické reference** (originálova `units.army=side` ř.249 → vynech, targetSide předávej parametrem), **žádné objektové `liege`/`lastAttack`** → `liege: string`, `lastAttackId: string|null`, žádné funkce/closury/undefined. Save uprostřed bitvy → load → fresh==load hashState (kill-resume bit-identický).
3. **Determinismus**: jediný `rng('battle')`; `Math.random`→`rng.next()`; pevné pořadí kroků battleStep (end-check → cd-down → player commands → player AI → opponent AI → tick++) a útoků (warriors→archers, player→opponent).
   - **M-3 crit**: `rng.next() < critChance` přesně **1× per skutečně provedený útok s focus PO guardu** (number>0 && cd==0), NE před guardem, NE per cíl, NE 2×.
   - **M-2 cd double-decrement**: opponent AI `cd--` (clamp≥0) běží PO `attackWith`, **KAŽDÝ tick i v ticku útoku**, warriors→archers (1:1 orig ř.265-291). Player se dekrementuje jen 1× (záměrná asymetrie dle §7.3).
   - **M-1 revival**: `baseRevival` z `BALANCE.battle.baseRevivalDefault` (=0.25, approx) — `state.player.baseRevival ?? BALANCE...` (`??` NE `||`); `revivePlayer` pure (baseRevival parametrem); `reviveAI = floor(cas*rng/4)`. Žádné undefined/NaN.
4. **G2 auto-resolve == live**: obranná AI politika (skriptované akce dle cooldownů) **uvnitř `battleStep`** když `queue` prázdná → offline catch-up dohraje bitvu STEJNÝM automatem. `battleTick` adaptér: `subAccMs += STEP_MS(50)`; `while >= BATTLE_TICK_MS(30): battleStep`. Žádný druhý časovač.

## Scope IN (T1+T2)
- `battle.js`: `createBattleState`, `battleStep` (plný souboj dle §3/§7), `battleTick` (adaptér akumulátoru), obranná AI auto-resolve.
- `formulas.js`: `battleDamage`/`battleDefense`/`revivePlayer`/(`reviveAI`) PURE + tabulkové testy vs originál.
- `military.json`: combat staty (strength/defense/critChance/baseCd) — G-MILITARY-STATS approx z originálu, provenance flag.
- `balance.js`: `BALANCE.battle` (baseRevivalDefault 0.25, cooldowny charge 80/volley 120…).
- Persist `state.battle` (allowlist persistSchema.js:300 — ověř) + kill-resume.

## Scope OUT
- battleCommand commands (hráčské akce) = T3 (T-005). Invaze/bandité/resolveBattleOutcome = T4 (T-006). UI = T5. **NEsahej processAI/world.js frakční AI** (M7a hotové).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej (NOVÝ soubor např. `test/m7b-battle-t1.test.js`): battleStep replay (stejný seed → bit-identický), **kill-resume** (save uprostřed bitvy → load → fresh==load hashState), tabulkové damage/revival vs originál, cd double-decrement reaction timing (warriors tick 60/archers 80), crit rng pevný počet, auto-resolve (prázdná queue → obranná AI dohraje deterministicky).
- `npm run smoke` OK.
- **Determinismus G1** + **M7a (m7a2-world-t2/t3) + M5/M6/M4b** nedotčené; žádný Math.random/Date.now/DOM v core; battleState serializovatelný (JSON round-trip).
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-018.md`, DR-018-01
- Kód: `src/core/systems/battle.js` (stub), `src/core/engine/` (rng 'battle', akumulátor STEP_MS), `src/core/balance/formulas.js`+`balance.js`, `src/data/military.json`, `src/save/persistSchema.js` (state.battle), originál `doc/original_source/modules/prosperity/services/battle.js`

## Workflow po dokončení (POVINNÉ — všechny 3, NEZAPOMEŇ)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-018)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-018_T-004.md` (soubor:funkce, gate výstup, jak vyřešeny M-1/M-2/M-3/F-1/G2, hook pro T3/T4)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
