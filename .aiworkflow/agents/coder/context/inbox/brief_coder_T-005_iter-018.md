# Brief

- **Brief ID**: BRIEF-018-005
- **Iteration**: iter-018 (M7b)
- **Task**: T-005 = T3 (battleCommand commands)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T3 (battleCommand commands)** dle designu — hráčské akce do battle queue. Battle automat + obranná AI = hotovo (T1+T2). Hook připravený: `state.battle.queue` (battleStep krok 3 konzumuje). Determinismus tvrdá podmínka. Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-018.md` — čti **T3 / §7 (commands, queue, player akce)**. T-004 summary (hook `state.battle.queue`, battleStep krok 3).

## Scope IN (T3)
1. **`battleCommand` command(s)** (`src/core/commands/`, vzor recruitUnit/buyTech): hráčské bojové akce (charge/volley/shieldWall/flank/fireArrows dle designu) → validace (akce dostupná dle cd, bitva aktivní) → `state.battle.queue.push({side:'player', action})`. `battleStep` krok 3 je konzumuje (už hotové z T-004).
2. **Registrace `registerBattleCommands`** v bootstrapu (`src/app/main.js`) — anti-dark-code (B1 poučení).
3. Determinismus: command jen vkládá do queue (žádná RNG/logika v command), automat zpracuje deterministicky. Žádný Date.now/Math.random/DOM.

## Scope OUT
- battleStep/battleTick/automat/obranná AI = hotovo (T1+T2). Invaze/bandité/resolveBattleOutcome = T4 (T-006, částečně už z T-004). UI = T5. NEsahej processAI/frakční AI.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: battleCommand validace (akce dostupná/nedostupná dle cd, bitva aktivní/neaktivní), command→queue→battleStep zpracuje deterministicky, nelze nevalidní akci.
- `npm run smoke` OK.
- **Determinismus G1** + **M7b battle (m7b-battle-t1)** + M7a + M5/M6/M4b nedotčené; battleState serializovatelný (queue obsahuje jen plain data, ne funkce).
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-018.md` (T3/§7), DR-018-01
- T-004 summary
- Kód: `src/core/systems/battle.js` (battleStep krok 3 queue, akce/cooldowny), `src/core/commands/` (vzor recruitUnit.js), `src/app/main.js` (bootstrap), `src/data/military.json` (_battle.attacks)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-005 (iter-018)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-018_T-005.md` (soubor:funkce, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
