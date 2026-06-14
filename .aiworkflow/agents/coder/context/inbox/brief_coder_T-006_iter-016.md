# Brief

- **Brief ID**: BRIEF-016-006
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-006 = T5 (napojení trhu na zóny – market.inject)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T5 (napojení trhu na zóny)** dle designu — tím se M7a-1 dokončuje. Produkční zóny vstřikují zboží na trh (`marketInject(+)`), válčící zóny odčerpávají (`marketInject(-)`). Plní kontrakt §8.2 z M4b. Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-016.md` — čti **T5 sekci**. T-004 (zone tick/processZone) summary.

## Scope IN (T5)
1. **Napojení v `processZone`** (`src/core/systems/world.js`, z T1): dle designu — produkční zóny volají `marketInject(state, goodsId, +qty)` (dodávají zboží dle production), válčící/odběrové zóny `marketInject(state, goodsId, -qty)`. Množství/zboží dle zone ekonomiky (z T1) a balance.world. Oceňování přes `getGoldValue` kde relevantní.
2. **Kontrakt §8.2 BEZE ZMĚNY signatur**: `marketInject(state, goodsId, qty)` + `getGoldValue` — NEMĚŇ signatury (změna = decision record). Jen je VOLÁŠ z world.
3. **Pořadí**: `world.tick` (order 30) MUSÍ běžet PŘED `market.drift` (~35) — ověř v tickOrder.js, ať injekce ovlivní drift téhož dne (dle designu). Pokud pořadí nesedí, uprav dle designu (a aktualizuj tickOrder doc).
4. **S-06 negativní → pozitivní kontrakt**: existující negativní test (world NEvolá market.inject před M4 — `test/contracts.test.js`/`m4b-market-caravan.test.js`) se v M7a-1 obrací na **pozitivní** — world NYNÍ market.inject volá. Uprav/přidej test, který ověří, že produkční zóna reálně injectuje a válčící odčerpává (a že to ovlivní marketState available v mezích clamp [0,max]).
5. **Determinismus/catch-up-safe**: injekce deterministické (žádný Date.now/Math.random mimo rng('world')); levné v dávce; marketState clamp dodržen.

## Scope OUT
- Zone tick / jednotky = hotovo (T1/T4). Frakční AI/bitvy/UI = M7a-2. battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej/uprav: zone→market inject (produkční +, válčící −, clamp [0,max]), S-06 pozitivní kontrakt test, arbitráž sanity (injekce nerozbije market invarianty), pořadí world.tick před market.drift.
- `npm run smoke` OK.
- **Determinismus G1** + **M5/M6 round-trip** + **M7a fresh-vs-load (m7a-world-t1)** + **M4b market testy (m4b-market-caravan)** nedotčené (krom S-06 obrácení).
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-016.md` (T5), DR-016-01
- T-004 summary
- Kód: `src/core/systems/world.js` (processZone z T1), `src/core/systems/market.js` (marketInject ř.103, getGoldValue ř.91), `src/core/engine/tickOrder.js` (world.tick/market.drift order), `src/core/balance/balance.js` (BALANCE.world), `test/contracts.test.js` + `test/m4b-market-caravan.test.js` (S-06)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-016_T-006.md` (soubor:funkce, gate výstup, jak zóny injectují/odčerpávají, S-06 obrácení)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
