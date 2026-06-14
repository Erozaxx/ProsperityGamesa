# Brief

- **Brief ID**: BRIEF-017-005
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-005 = T3 (revolty + questy + tribute + AI-AI bitvy)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T3** dle designu: revolty, questy, tribute výběr, AI-AI bitvy RNG vzorcem. Staví na T2 (processAI automat, registerWorldEffects, hook pro AI-AI bitvy). Design je source of truth. Determinismus tvrdá podmínka. **battle.js NEDOTČEN.**

## Source of truth
`agents/coder/context/refs/design_iter-017.md` — čti **§4 (revolty/questy/tribute/AI-AI bitvy)**, §5.1 (quest gating). DR-017-01. T-004 summary (hook pro T3 v processAI state 6).

## Scope IN (T3)
1. **Revolty** (§4.1): favour-drain vzorce **gated `revoltMechanicStart`** v `processZone` (world.js); deterministické (rng('world')). Favour je objekt `{factionId:number}` (z T2 migrace).
2. **Questy** (§4 + §5.1): deterministicky generované (`questSeq`, `rng('world')`), oceňování `getGoldValue`, **absolutní deadlineStep**; `acceptQuest`/`rejectQuest` commands (+ registrace v bootstrapu, anti-dark-code). **Quest gating** přes EXISTUJÍCÍ pole: `home.settlementLevel >= BALANCE.world.questSettlementMin`, `(player.totWarriors + player.totArchers) > 0` (dle §5.1 — NE neexistující home.level/militaryCouncil.discovered). `world.quests`/`questSeq` v persist (G-QUEST-PERSIST).
3. **Tribute výběr** (§4.4): `gatherTributes` **month edge** (periodikum, order 25 dle designu — registruj do tickOrder); akumulace už v M7a-1 processZone → výběr do home gold/resources přes transakce.
4. **AI-AI bitvy** (§4): `aiBattleResolve` ve `formulas.js` (1:1 originál, rng param) volaná z `processAI` state 6 (hook z T2). **NE battle automat.** `battle.js` NEDOTČEN. AI-vs-player → `scheduleInsert('startBattle')` stub (už z T2).

## Scope OUT
- Frakční automat processAI = hotovo (T2). UI = T6 (T-006). battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: revolty deterministické (favour drain), questy generování/accept/reject (deterministicky, gating přes existující pole), tribute gatherTributes (month, akumulace→home), aiBattleResolve tabulkově (1:1 originál), persist round-trip (world.quests/questSeq + frakční stav), fresh-vs-load s questy/revoltami.
- `npm run smoke` OK.
- **Determinismus G1** + **M7a-1 round-trip + T2 (m7a2-world-t2)** + M5/M6/M4b nedotčené; jediný rng('world'); žádný Date.now/Math.random/DOM v core; catch-up-safe.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-017.md` (§4, §5.1), DR-017-01
- T-004 summary
- Kód: `src/core/systems/world.js` (processZone revolt gated blok, processAI state 6 hook, gatherTributes), `src/core/balance/formulas.js` (aiBattleResolve doplnit), `src/core/commands/` (vzor recruitUnit/buyTech pro quest commands), `src/app/main.js` (boot), `src/core/engine/tickOrder.js` (gatherTributes month 25), `src/core/systems/market.js` (getGoldValue), `src/save/persistSchema.js`, `src/core/state/createHomeState.js` (settlementLevel), originál `world.js`

## Workflow po dokončení (POVINNÉ — drž všechny 3 kroky)
- `agents/coder/state/current-task.md` → **Task ID: T-005 (iter-017)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-017_T-005.md` (soubor:funkce, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
