# Impl Summary — iter-018 T-004 (M7b: Battle Automat T1+T2)

**Task ID**: T-004 (iter-018, M7b)
**Date**: 2026-06-15
**Agent**: coder (Sonnet)
**Gate**: `npm run ci` — 1297 tests, 0 fail. `npm run smoke` — OK.

---

## Soubory:funkce

| Soubor | Funkce/Sekce | Popis |
|---|---|---|
| `src/core/systems/battle.js` | `battleStep(bs, commands, rng)` | Plný souboj — 7-krokový pure automat (end-check, cd-down, commands, defensive AI, opponent AI, tick++, derived) |
| `src/core/systems/battle.js` | `battleTick(state, params, ctx)` | Sub-step akumulátor (subAccMs += 50, while ≥30 battleStep) |
| `src/core/systems/battle.js` | `createBattleState(state, zone, faction, isBandit)` | Inicializace BattleState (§3.2 — tick:0, reaction:60, subAccMs:0, queue:[]) |
| `src/core/systems/battle.js` | `resolveBattleOutcome(state, rng)` | Outcome: revival, zone transfer, loot/demand, battleLog |
| `src/core/systems/battle.js` | `startBattle(state, params, ctx)` | Schedule handler (naplnění world.js:1189 stub) |
| `src/core/systems/battle.js` | `banditRaid(state, params, ctx)` | Schedule handler pro bandity + self-rearm |
| `src/core/balance/formulas.js` | `battleDamage(number, strength, multiplier, isCrit)` | T2 vzorec, PURE, 1:1 orig ř.442 |
| `src/core/balance/formulas.js` | `battleDefense(focusNumber, attackerNumber, baseDefense)` | T2 vzorec, PURE, 1:1 orig ř.494-499 |
| `src/core/balance/formulas.js` | `revivePlayer(casualties, baseRevival, bonuses)` | T2 vzorec, PURE bez rng (M-1 fallback) |
| `src/core/balance/formulas.js` | `reviveAI(casualties, rng)` | T2 vzorec, rng.next() 1×/unit type (determinismus) |
| `src/core/balance/balance.js` | `BALANCE.battle` | Nový blok: battleTickMs=30, reactionDefault=60, endCheckPeriod=80, baseRevivalDefault=0.25, critChanceDefault=0.1, banditPeriod |
| `src/data/military.json` | `military[].combat`, `_battle.attacks` | G-MILITARY-STATS: combat staty (approx, M9), attacks katalog 1:1 originál ř.586-629 |
| `src/core/systems/world.js` | `registerWorldEffects` | Napojení startBattle handleru (naplnění stubu) |
| `test/m7b-battle-t1.test.js` | 37 testů | Gate testy: BR-1..BR-10 (determinismus, kill-resume, formulas, timing, crit, G2, F-1, M-1) |

---

## Jak vyřešeny invarianty

### M-1 (baseRevival fallback)
- `BALANCE.battle.baseRevivalDefault = 0.25` (provenance: approximated, kalibrace M9)
- `resolveBattleOutcome`: `const baseRevival = (st.player?.baseRevival) ?? BALANCE.battle.baseRevivalDefault`
- `??` NE `||` — legitimní `0` by `||` přepisoval, `??` nikoliv
- `revivePlayer(casualties, baseRevival, bonuses)` — PURE parametrem, beze čtení globálního stavu
- Testováno: BR-8

### M-2 (opponent cd double-decrement)
- V `battleStep` krok 5 (opponent AI): po každém `attackWith` následuje `cd--; if (cd<0) cd=0`
- Dekrementuje KAŽDÝ tick i v ticku útoku (1:1 originál ř.274-277, ř.287-290)
- Player se dekrementuje JEDNOU na začátku (krok 2, orig ř.239-247) — záměrná asymetrie
- Warriors útočí na tick=60, archers na tick=80; po útoku cd=79 resp. cd=119 (M-2 efekt)
- Testováno: BR-4

### M-3 (crit rng pevný počet)
- `rng.next()` je volán PŘESNĚ 1× per attack-with-focus, AŽ v bodu 5 (po guardu `number>0 && cd===0`)
- Pro útoky bez focus (shieldWall) se crit NEVOLÍ
- Crit je 1× per útok, NE per focus cíl
- `battleDamage(n, s, m, isCrit)` dostává bool — crit roll je explicitní v `battleStep`, ne uvnitř formuly
- Testováno: BR-5

### F-1 (serializovatelnost)
- `unit.army` self-ref odstraněn — `targetSide` předáván parametrem do `attackWith`
- `liege: string` (ne objekt) — na Side i Unit
- `lastAttackId: string | null` (ne attack objekt ref) — `units.lastAttackId = attack.id`
- `meta.thumbRing: boolean` (ne unlockedTechs ref)
- Žádné funkce/closury/undefined v `state.battle`
- `JSON.parse(JSON.stringify(bs))` round-trip bez výjimky
- Testováno: BR-7

### G2 (auto-resolve == live)
- Obranná AI je v `battleStep` krok 4 — pokud `commandsApplied === 0` → player hraje charge/volley
- `battle.tick` je `every:'step'` → `battleTick` volán z `runCatchupBatch` i `advance` identicky
- Offline catch-up = prázdná queue → stejný battleStep → výsledek bit-identický
- Testováno: BR-6+BR-10

---

## Kill-resume bit-identický?

ANO. Testováno BR-2:
- Save uprostřed bitvy (libovolný tick, subAccMs zachováno)
- Load přes `applyPersist + loadAndReconstruct`
- Pokračování z obou stavů → `deepStrictEqual` na battle state
- rng stream `state.rng.streams.battle` je součástí save → pozice zachována

---

## Gate výsledek

```
npm run ci:
  - typecheck: OK
  - lint:core: OK
  - tests: 1297 tests, 1297 pass, 0 fail

npm run smoke: OK — app rendered, 0 console errors

Existující testy (nedotčené):
  - M7a2-world-t2/t3: 48 pass
  - M5/M6: pass
  - M4b: pass

Nové testy (test/m7b-battle-t1.test.js):
  - 37 testů, 37 pass, 0 fail
```

---

## Hook pro T3/T4

### T3 (battleCommand — hráčské intenty)
- `state.battle.queue` je `BattleCommand[]` připravena pro enqueue
- Handler `handleBattleCommand(state, {side, action})` → `state.battle.queue.push({side, action})`
- `battleStep` krok 3 konzumuje queue — žádná změna kontraktu

### T4 (invaze/bandité/resolveBattleOutcome wiring)
- `startBattle(state, params, ctx)` registrován v `registerWorldEffects` — world.js volá automaticky
- `banditRaid(state, params, ctx)` připraven (self-rearm přes scheduleInsert)
- `resolveBattleOutcome` naplněn — zone transfer, loot, immunity, battleLog
- `state.world.battleLog[]` dostupný pro offline summary (§9.3)
- Scény: banditi (isBandit=true → loot), AI invaze (isBandit=false → zone transfer/raze)

### T5 (UI)
- Selektory z `state.battle`: `{zoneId, sides, state, tick, log, summary}` — hotové k čtení
- `state.battle.queue` — enqueue přes command intent
- Žádná logika v UI (C3)
