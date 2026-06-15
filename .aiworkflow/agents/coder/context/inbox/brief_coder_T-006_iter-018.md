# Brief

- **Brief ID**: BRIEF-018-006
- **Iteration**: iter-018 (M7b)
- **Task**: T-006 = T4 dotažení (invaze + bandité + offline summary)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Dotáhni **T4 (invaze + bandité + offline summary)**. T-004 už udělal většinu: `startBattle` handler wired (invaze z M7a-2 frakční AI → reálná bitva), `resolveBattleOutcome` → `state.world.battleLog`. **ZBÝVÁ**: (1) naplánovat `banditRaid` periodicky, (2) napojit `state.world.battleLog` → OfflineSummary UI. Determinismus tvrdá podmínka. Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-018.md` — čti **T4 / §9 (invaze/bandité/offline summary)**. T-004 summary.

## Stav (z T-004)
- `startBattle` handler wired (`world.js:1229` register 'startBattle'; invaze z `world.js:1084` scheduleInsert). ✓
- `resolveBattleOutcome` (battle.js:522) → `state.world.battleLog` (battle.js:743). ✓
- `banditRaid` fn existuje (battle.js) ale **NENÍ ve schedule** (BALANCE.battle.banditPeriod=13500 existuje).
- `state.world.battleLog` **NENÍ čten v** `src/ui/OfflineSummary.js`.

## Scope IN (T4 dotažení)
1. **banditRaid schedule**: naplánuj `banditRaid` periodicky přes schedule (one-shot self-rearm, `BALANCE.battle.banditPeriod`), mirror `armContractOffer`/`armFactionAI` — idempotentní arm z bootSequence (anti-DR-012-02). banditRaid spustí bitvu proti hráči přes startBattle/createBattleState.
2. **battleLog → OfflineSummary**: napoj `state.world.battleLog` do `src/ui/OfflineSummary.js` (selektor + zobrazení výsledků bitev v offline summary — kolik bitev, výsledky). Žádná logika v UI (čtení přes selektor).
3. Determinismus/catch-up-safe: banditRaid + invaze deterministické (rng('battle')/'world'); bitvy se v offline dávce dohrají auto-resolve (G2, hotové z T-004); levné.

## Scope OUT
- battleStep/automat/battleCommand = hotovo (T1+T2+T3). UI battle screen = T5 (T-007). NEsahej processAI.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: banditRaid se naplánuje + spustí bitvu (deterministicky, idempotentní arm pro staré savy), invaze z frakční AI → reálná bitva (startBattle), battleLog → offline summary zobrazí výsledky, catch-up dohraje bitvy auto-resolve.
- `npm run smoke` OK (offline summary renderuje battle výsledky bez chyb).
- **Determinismus G1** + **M7b battle (m7b-battle-t1/t3)** + M7a + M5/M6/M4b nedotčené.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-018.md` (T4/§9), DR-018-01
- T-004/T-005 summaries
- Kód: `src/core/systems/battle.js` (banditRaid, startBattle, resolveBattleOutcome, battleLog), `src/core/systems/world.js` (startBattle invaze, armFactionAI vzor), `src/app/main.js` (bootSequence — kam arm banditRaid), `src/core/systems/contracts.js` (armContractOffer vzor), `src/ui/OfflineSummary.js`, `src/ui/selectors.js`, `src/core/balance/balance.js` (banditPeriod)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-006 (iter-018)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-018_T-006.md` (soubor:funkce, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
