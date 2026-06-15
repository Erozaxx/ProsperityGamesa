# Implementation Summary — iter-016 T-004 (M7a-1 Zone Tick)

**Date**: 2026-06-14
**CI**: 1131/1131 pass, 0 fail
**Gate**: ZELENÉ

## Scope

Zone tick (worldTick + processZone), hydrateZones, zones.json catalog, persist schema, balance constants.

## Key Files Changed

### src/core/systems/world.js
- `randRound(x, rng)`: deterministic stochastic rounding (replaces `$rootScope.fns.randRound`)
- `processZone(state, zoneId, rng)`: full economy/policy implementation (resource/growth/military), goldDemand/goldProduction (pre-policy snapshot), goldStore drain (notEnoughGold), M7a-2 stubs (revolt/quest)
- `worldTick(state, _params, _ctx)`: day-index round-robin `floor(_absDay/slot) % len`, slot-boundary gate
- `hydrateZones(state)`: shared fresh+load path — id-based merge, catalog order wins, stale tail discarded, goldDemand/goldProduction initialized from saved or computed

### src/core/state/createInitialState.js
- `createWorldState()`: initializes `zones: []` and `factions: {}`
- `createInitialState()`: calls `hydrateZones(state)` after `rebuildBuildingDerived`

### src/save/load.js
- `applyPayload`: zones → raw copy for hydrateZones; home.store restored
- `loadAndReconstruct` Step 5: calls `hydrateZones(state)`

### src/save/persistSchema.js
- Zone persist: `{id, liege, policy, numWorkers, warriors, archers, resources, tribute, favour, goldStore, notEnoughGold, curQuest, goldDemand, goldProduction}`
- `home.store` added to persist (fixes M-2 round-trip determinism for ore/stone/wood)
- Factions persist: dynamic only `{state, wantToAttack, nextTarget}` per faction id

### src/core/balance/balance.js
- `BALANCE.world` extended: `zonePeriodDays`, `goldDemandPerUnit`, `goldProdPerWorker`, `growthBasePct`, `growthBaseAdd`, `growthWorkerCap`, `growthUnderTargetBonus`, `militaryWorkerThreshold`, `factionGrowth`, `aiBuyUnitChance`, `tributeGrowthDivisor`, `baseMilitaryRating`, `revoltMechanicStart`

### src/data/zones.json
- 13 zones: homeZone (player), 5×theWarlord, 6×thePrincess, 1×thePsychopath (hornCastle)
- 8 aiStates (ids 0-7), 4 factions with unitStats/aggression/backstab/recallMin, 3 policies
- Each zone has `provenance: "approximated"`

### tools/extract/extractors/zones.mjs
- Updated from empty stub to full zone catalog (prevents iter006 test from reverting zones.json)

### src/core/catalog/schemas.js + src/app/catalogs.js
- `zones` schema: `required: ['policies', 'factions', 'zones']`
- `'zones'` added to `CATALOG_NAMES`

### test/m7a-world-t1.test.js (new)
- T1-1: round-robin fires on day-edge (3 tests)
- T1-2: economy formula table tests (8 tests)
- T1-3: fresh-vs-load hashState CRITICAL M-2 (4 tests)
- T1-4: persist round-trip id-based merge (4 tests)
- T1-5: zones.json schema validation (7 tests)
- T1-6: processZone determinism (2 tests)
- T1-7: hydrateZones idempotency (3 tests)

## Key Bugs Found and Fixed

1. **iter006 test overwrites zones.json**: `iter006-catalog-schema.test.js` runs `extract.mjs` which calls `extractZones()` — updated extractor to produce full catalog instead of empty stub.
2. **M-2 round-trip determinism (home.store)**: `home.store` (ore/stone/wood) was not persisted. Added to persist schema.
3. **M-2 round-trip determinism (goldDemand/goldProduction)**: Pre-policy snapshot on zone not consistent after save/load. Added to zone persist fields; `hydrateZones` restores from saved value.
4. **Tribute formula uses pre-update numWorkers**: `numWorkersBefore` captured before growth policy increment.
5. **G-WORLD-ARCHRES**: `zone.archres` typo fixed to `zone.archers`.
6. **G-WORLD-NOTENOUGH**: unified key `notEnoughGold` (original had `notEnoughgold`/`notEnoughGold` mismatch).

## Scope OUT (per design)

- recruitUnit (T4), marketInject (T5), factionAI/revolts/UI (M7a-2), battle.js
