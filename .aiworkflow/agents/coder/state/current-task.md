# Current Task

- **Task ID**: T-004 (iter-013 M5-1 T1 building instances + opotřebení + opravy + persist)
- **Brief**: brief_coder_T-004_iter-013.md
- **Iteration**: iter-013
- **Status**: done
- **Started**: 2026-06-14
- **Done**: 2026-06-14

## Checklist (T-004)

- [x] Stav budov: `state.home.buildings[id]={created,totalMade,instances:[{instId,hp,inRepair}]}` + projectQueue + projectSeq + derived
- [x] `ageBuildings` systém (day edge, order 70): opotřebení, winter, repair trigger, destroy, rng.stream('buildings')
- [x] enqueueRepair: repair projekt v projectQueue, cost přes getGoldValue, deterministické ID
- [x] destroyInstance: odebere instanci, volá rebuildBuildingDerived
- [x] Persist schéma budov: allowlist buildings/projectQueue/projectSeq v persistSchema.js + load.js
- [x] rebuildBuildingDerived: created re-derivace + stub addBuildingModifiers + recalcBuildingAggregates (T4 placeholder)
- [x] load.js Step 5: volání rebuildBuildingDerived PŘED deriveWorkforceTotal (M-2)
- [x] Registrace buildings.age v tickOrder.js (day, order 70)
- [x] BALANCE.buildings sekce v balance.js
- [x] scaleCostByCount v formulas.js
- [x] Přidání 'buildings' do RNG STREAM_NAMES (K16/D4)
- [x] buildings.json rozšíření (M5-1 fields + workerHouse, well; workerHouse ne 'house' kvůli K10)
- [x] extractors/buildings.mjs aktualizován (extraction reproducibility test)
- [x] types.d.ts: BuildingInstance, BuildingState, ProjectState, BuildingDerived, HomeState rozšíření
- [x] docs/tickOrder.md aktualizován (buildings.age, M5-1 sekce, ASCII diagram)
- [x] precache regenerován (PRECACHE_VERSION aktualizován)
- [x] test/m5-buildings-t1.test.js: 27 nových testů (scaleCostByCount, rebuildBuildingDerived, ageBuildings, persist round-trip, projectSeq, recalcBuildingAggregates)
- [x] npm run ci ZELENÉ — 807 testů, 0 fail
- [x] npm run smoke OK
- [x] G1 determinismus nedotčen

## T4 Placeholders (TODO pro T4/T-007)
- `addBuildingModifiers` — stub, no-op (TODO T4.3: effects→modifier mapping)
- `removeBuildingModifiers` — stub (TODO T4.3)
- `invalidateModifiers` — stub (TODO T4.2: bump _modVersion)
- `effective()` — vrací pouze base catalog hodnotu, bez modifier fold (TODO T4.1)
- `recalcBuildingAggregates` — čte base catalog values; TODO T4.4: nahradit za `effective(id, attr, state)` calls

## Výsledek
T1 dokončen. 807 testů, 0 fail. Smoke OK. G1 determinismus nedotčen.
Persist round-trip funguje. created re-derivováno ze instances.length po loadu.
