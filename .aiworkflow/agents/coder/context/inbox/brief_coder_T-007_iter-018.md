# Brief

- **Brief ID**: BRIEF-018-007
- **Iteration**: iter-018 (M7b)
- **Task**: T-007 = T5 (battle UI screen)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T5 (battle UI screen)** dle designu — tím se M7b dokončuje (a celé M7). Battle screen: commands (akce), progress (bitva live), log. Drž vzor existujícího UI: pure komponenty `{snapshot, send}`, čtou přes **selektory**, píší přes **commands** (`battleCommand`). ŽÁDNÁ herní logika v UI.

## Source of truth
`agents/coder/context/refs/design_iter-018.md` — čti **T5 (battle UI, playtest feel R-D)**. `battleCommand` command + `state.battle` stav už hotové (T1–T4).

## Scope IN (T5)
1. **Selektory** (`src/ui/selectors.js` dle designu): `selectBattle` (aktivní bitva: jednotky obou stran number/cd, dostupné akce dle cd, battle log, progress/state running/done, summary). Deriváty (dostupnost akce, % progress) počítané ZDE (ne v UI).
2. **BattleScreen** komponenta (`src/ui/screens.js`): zobrazení live bitvy (jednotky player/opponent, casualties), akční tlačítka (charge/volley/shieldWall/flank/fireArrows → `send('battleCommand',{side,action})`, disabled dle cd), battle log (ring buffer), výsledek bitvy. Když žádná bitva → prázdný stav / přehled.
3. **Tab** v `src/ui/App.js`: přidej `battle` (Bitva) tab dle vzoru. (Volitelně: tab viditelný/zvýrazněný jen když bitva aktivní — dle designu.)
4. Styly (`src/ui/styles.css`) dle potřeby (mobile-first, žádný overflow).
5. **Playtest feel poznámky** (R-D) do impl summary / komentáře — pro M9 kalibraci (rychlost bitvy, čitelnost).

## Scope OUT
- Core battle automat/commands = hotovo (T1–T4). Jen UI vrstva. Žádná logika v UI. NEsahej processAI/battle automat.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy selektorů (selectBattle: jednotky, dostupnost akcí dle cd, log, progress).
- `npm run smoke` OK — **boot + render battle screen bez console chyb** (klíčové); ověř battleCommand tlačítko volá command (když bitva aktivní).
- **Determinismus G1** + **M7b battle (m7b-battle-t1/t3/t4)** + M7a + M5/M6/M4b nedotčené; selektory čisté read.
- Žádný DOM v core. Precache regen pokud přidání UI souborů ovlivní manifest.

## Inputs
- Design: `context/refs/design_iter-018.md` (T5)
- T-004..T-006 summaries
- Kód/vzor: `src/ui/screens.js` (WorldZonesScreen/BuildScreen vzor), `src/ui/selectors.js` (selectBattleLog už existuje z T-006), `src/ui/App.js` (taby), `src/ui/styles.css`, `src/core/systems/battle.js` (state.battle tvar, akce/cooldowny), `src/core/commands/battleCommand.js`, `src/data/military.json` (_battle.attacks)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-007 (iter-018)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-018_T-007.md` (soubor:funkce, gate výstup, co UI pokrývá, playtest feel R-D pro M9)
- `bash agents/coder/scripts/handoff-out.sh T-007 "<stručně + gate výsledek>"`
- NEcommituj (git).
