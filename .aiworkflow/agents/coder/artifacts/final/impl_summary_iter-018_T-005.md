# Impl Summary — iter-018 T-005 (T3 battleCommand)

- **Task**: T-005 = T3 battleCommand (hráčské bojové akce → battle queue)
- **Iteration**: iter-018 (M7b)
- **Date**: 2026-06-15

## Co bylo implementováno

### Stav před T-005
- `src/core/commands/battleCommand.js` již existoval (napsán T-004/T1)
- `src/app/main.js` již importoval a volal `registerBattleCommands` (napsán T-004/T1)
- Oba soubory byly hotové a plně funkční

### Verifikace implementace
Přečetl jsem a ověřil správnost obou souborů:

**`src/core/commands/battleCommand.js`** — `battleCommand(state, params)`:
- Validace: `state.battle` musí existovat a `state.battle.state === 'running'`
- Validace: `side` musí být `'warriors'` nebo `'archers'`
- Validace: `action` musí patřit k danému `side` (warriors: charge/shieldWall/flank; archers: volley/fireArrows)
- Cooldown se NEkontroluje v command (design §7.1) — jen v battleStep krok 3
- Enqueue: `state.battle.queue.push({ side, action })` — plain data, serializovatelné (F-1)
- Žádná mutace bitvy, žádné RNG, žádný Date.now, žádný DOM (determinismus C3)
- `registerBattleCommands(creg)` registruje handler přes `registerCommand`

**`src/app/main.js`** — `bootstrapEngine()`:
- Import `registerBattleCommands` z `'../core/commands/battleCommand.js'`
- Volání `registerBattleCommands(creg)` v `bootstrapEngine()` — anti-dark-code (B1 poučení)

### Nové testy
**`test/m7b-battle-t3.test.js`** — 35 testů, 10 test suite:
- BC-1: enqueue happy path (všechny 5 akcí per správný side)
- BC-2: reject když žádná aktivní bitva
- BC-3: reject když battle.state != 'running' (setup/done)
- BC-4: reject invalid side (knights, "", null, 42)
- BC-5: reject špatná akce pro side (cross-side: volley→warriors, charge→archers, ...)
- BC-6: command → queue → battleStep deterministicky (G1)
- BC-7: cooldown NEkontrolován v command, battleStep ignoruje on-cd command
- BC-8: queue entries serializovatelné (JSON round-trip, pouze {side, action})
- BC-9: `registerBattleCommands` registruje přes `dispatch`
- BC-10: žádné RNG/side-effects v command (rng stream se nemění)

## Gate výsledek
- `npm run ci`: **1332 tests, 0 fail** (před T-005: 1297; přidáno 35 nových testů)
- `npm run smoke`: **OK**
- Determinismus G1: PASS (BR-1 + BC-6 + BC-10)
- M7b battle m7b-battle-t1: **37/37 pass** (nedotčeny)
- M7a + M5/M6/M4b: nedotčeny
- battleState serializovatelný: queue obsahuje jen plain `{side, action}` data (F-1)
- Anti-dark-code: `registerBattleCommands` v `main.js bootstrapEngine()` — splněno
