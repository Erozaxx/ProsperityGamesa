# Brief

- **Brief ID**: BRIEF-016-004
- **Iteration**: iter-016 (M7a-1)
- **Task**: T-004 = T1 (zone tick + zóny + re-hydratace)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T1** dle schváleného designu: zone tick (nahradí stub `worldTick`), approximovaný obsah zón, a **determinismus-kritickou re-hydrataci** (sdílená `hydrateZones`, fresh-vs-load). Design je source of truth. Determinismus/catch-up-safe je tvrdá podmínka.

## Source of truth
`agents/coder/context/refs/design_iter-016.md` (po revizi T-002a) — čti zejm.: §2.1 (day-index round-robin), §8.1 (re-hydratace zón — createWorldState init, hydrateZones, id-based merge, persist vs re-hydratace tabulka), §14 (T1 dekompozice). DR-016-01.

## Scope IN (T1)
1. **`worldTick`** (`src/core/systems/world.js`, day edge order 30) — nahraď no-op stub:
   - **Day-index round-robin** dle §2.1: `daysPerZoneSlot = max(1, ceil(zonePeriodDays/zones.length))`; spusť `processZone` když `day % daysPerZoneSlot === 0`; `zoneIndex = floor(day/daysPerZoneSlot) % zones.length`, `day = state.season._absDay`, `zonePeriodDays = BALANCE.world.zonePeriodDays` (=5). **Bezstavový** (žádný kurzor ve state).
   - `processZone(state, zoneId, rng('world'))`: ekonomika/politika zóny vzorci z `balance.world` (goldDemand, production, favour, policy větve) — 1:1 z originálu `world.js`. Tribute v M7a-1 jen **akumuluj** do `zone.resources` (výběr = M7a-2, neregistruj gatherTributes).
2. **`createWorldState()`** (`createInitialState.js`): init `world.zones`/`world.factions` (dle §8.1) — fresh==load symetrie.
3. **Sdílená `hydrateZones(state)`** (§8.1, vzor `rebuildBuildingDerived`): re-hydratace static zón z katalogu (`zones.json`) + **id-based merge** uloženého dynamického stavu. Volaná z **`createInitialState` I `load`** — ŽÁDNÁ load-only větev (M5-R1 gate, anti-DR-012-02). Zóny/factions vyjmi z generického `Object.assign` v load.
4. **Persist** (§8.1.a tabulka): ukládej JEN dynamický stav zón (liege/policy/numWorkers/warriors/archers/resources/favour/goldStore/aiState…); static (id/topology/base stats) se RE-HYDRATUJE z katalogu, NEukládá.
5. **G-LISTZONE**: doplň `zones.json` o approximovaný obsah (~13 zón + AISTATES 0–7) dle designu, `provenance:'approximated'`; wiring (zones schema validátor + do CATALOG_NAMES dle vzoru M6 G-LISTTECHS).
6. **Balanc** (zonePeriodDays, goldDemand/production faktory, prahy) → `balance.world` s odkazem na zdroj/§.

## Scope OUT
- Jednotky (recruitUnit) = T4 (T-005). Napojení trhu (marketInject) = T5 (T-006).
- Frakční AI automat, revolty/questy/tribute výběr, UI = M7a-2 (NEsahej). battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej: zone round-robin (processZone se REÁLNĚ spustí na day-edge — ne no-op), zone ekonomika vzorce tabulkově, **fresh-vs-load hashState test** (createInitialState == load(save) — kritické, M-2), persist round-trip zón (id-based merge, žádný stale tail), zones.json schema validace.
- `npm run smoke` OK.
- **Determinismus G1** (iter005-edge) + **M5 round-trip (m5-buildings-t4)** + **M6 round-trip (m6-tech-roundtrip)** nedotčené; jediný rng('world') stream (žádný nový); žádný Date.now/Math.random mimo rng/DOM.
- **Catch-up-safe**: zone tick levný v dávce (O(1) per day-edge), deterministický.
- Precache regen jen při změně zdroje ovlivňujícího manifest (zones.json → pravděpodobně ano).

## Inputs
- Design: `context/refs/design_iter-016.md` (§2.1/§8.1/§14), DR-016-01
- Kód: `src/core/systems/world.js` (stub), `src/core/state/createInitialState.js` (createWorldState), `src/save/load.js` (zone hydration, M5-R1 precedent), `src/core/systems/calendar.js` (season._absDay), `src/core/balance/balance.js` (BALANCE.world), `src/data/zones.json`, `src/app/catalogs.js` + `src/core/catalog/schemas.js` (zones wiring), originál `doc/original_source/modules/prosperity/services/world.js`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-016_T-004.md` (soubor:funkce, gate výstup, fresh-vs-load výsledek, co je pro T4/T5)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
