# Current Task

- **Task ID**: T-002 (Architektonický review DESIGN M7a — AI svět/zóny/frakce/jednotky/market.inject)
- **Brief**: BRIEF-016-002
- **Iteration**: iter-016
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Review designu M7a PROTI KÓDU + originálu world.js. Ověřeno:
rng.js:10 (stream 'world' index 5, žádný nový), scheduler.js (scheduleInsert plain-data K17 + seq),
contracts.js (self-rearm precedent + armContractOffer idempotentní guard), tickOrder.js:204-205
(world.tick 30 < market.drift 35; month taxes 20/upkeep 30 → gatherTributes 25 volný),
market.js:91/103 (getGoldValue/marketInject signatury beze změny), upkeep.js:23-39 (player.totWarriors/totArchers),
persistSchema.js:24 (world allowlist zones/factions), load.js:217-226 (world-merge objektový) + :284-295 (M5-R1/DR-012-02 gate),
createInitialState.js:18-49 (createWorldState — zones/factions CHYBÍ), balance.js (army/world), military.json, zones.json (prázdné),
originál world.js (round-robin ř.583 per-step; AISTATES enum 0-6 ale state 7 v kódu ř.767/851).
Výstup: agents/reviewer/artifacts/final/review_design_iter-016_T-002.md

## Výsledek
Verdikt: **GO-s-podmínkami**. Split M7a-1/M7a-2 = **ANO** (schválit, hranice správná).
Determinismus AI v dávce: model SPRÁVNÝ (1 stream world / schedule K17 / bezstavovost / re-hydratace),
podmíněno opravou M-1 (round-robin gating) + dotažením M-2 (re-hydratace kontrakt).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 2 (M-1 round-robin `curStep % dist` na day-edge prakticky mrtvý → day-index; M-2 re-hydratace zón: createWorldState init chybí + load.js array-merge objektový místo id-based + sdílená hydrateZones fn)
- MINOR: 3 (m-1 gatherTributes periodikum vs schedule; m-2 idempotentní self-rearm bootstrap; m-3 potvrzení market kontraktu bez akce)
- NIT: 3 (n-1 AISTATES 7 provenance z kódu; n-2 military.json cross-check OK; n-3 originálové bugy správně opraveny)

## Podmínky GO
C-1: round-robin přepočítat na day-index (ne curStep % dist). C-2: re-hydratace zón kontrakt (fresh init + id-based merge + no load-only branch + fresh-vs-load hashState test).

## NEcommitnuto (per brief).
