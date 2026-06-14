# Impl Summary — iter-013 T-004 (M5-1 T1)

## Task
T-004 = T1: Building instances + opotřebení + opravy + persist

## Změněné soubory:funkce

| Soubor | Změna |
|--------|-------|
| `src/core/balance/balance.js` | Přidána sekce `BALANCE.buildings` (ageBias, repairThreshold, winterHpLoss, repairCostDivisor, repairProgressDivisor, defaultResistance, costScaleFactor, winterSeasonIndex) |
| `src/core/balance/formulas.js` | Přidána `scaleCostByCount(baseCost, totalMade, scaleFactor)` (§2.4, geometrický growth) |
| `src/core/engine/rng.js` | Přidán stream `'buildings'` do STREAM_NAMES (K16/D4 izolovaný stream) |
| `src/core/state/createHomeState.js` | Přidány do HomeState: `buildings`, `projectQueue`, `projectSeq`, `derived` |
| `src/core/state/types.d.ts` | Přidány typy `BuildingInstance`, `BuildingState`, `ProjectState`, `BuildingDerived`; rozšířena `HomeState` |
| `src/core/systems/buildings.js` | **NOVÝ soubor**: `ageBuildings`, `enqueueRepair`, `destroyInstance`, `rebuildBuildingDerived`, `recalcBuildingAggregates`, `effective` (base-only), `addBuildingModifiers` (stub), `invalidateModifiers` (stub), `effectiveMap`, `removeAllBuildingSourcedModifiers` |
| `src/core/engine/tickOrder.js` | Import + registrace `buildings.age` (day, order 70) |
| `src/save/persistSchema.js` | Přidán blok `home.buildings` (per id `{created,totalMade,instances}`), `home.projectQueue`, `home.projectSeq` |
| `src/save/load.js` | Import `rebuildBuildingDerived`; blok applyPayload pro buildings/projectQueue/projectSeq; Step 5 rozšířen o volání `rebuildBuildingDerived` PŘED `deriveWorkforceTotal` |
| `src/data/buildings.json` | Rozšíření na 6 budov s M5-1 poli (resistance, maxProgress, builders, effects); nové: workerHouse, well (workerHouse místo house kvůli K10 kolizi s houseTypes) |
| `tools/extract/extractors/buildings.mjs` | Aktualizován extractor pro 6 budov (extraction reproducibility test) |
| `docs/tickOrder.md` | Přidán buildings.age do tabulky, M5-1 sekce, ASCII diagram |
| `src/precache.js` | Regenerován (PRECACHE_VERSION: `prosperity-591ace62ba81` → `prosperity-a774e289b2d5`) |
| `test/m5-buildings-t1.test.js` | **NOVÝ soubor**: 27 testů (scaleCostByCount, rebuildBuildingDerived, ageBuildings, persist round-trip, projectSeq, recalcBuildingAggregates) |

## Gate výsledek

- `npm run ci`: **807 testů, 0 fail** (typecheck + lint:core + test, exit 0)
- `npm run smoke`: **OK** (exit 0)
- **Determinismus**: G1 (iter005-edge) passes, existující testy nedotčené; žádný Date.now/Math.random/DOM v core
- **Persist round-trip**: save→load → `created` re-derivováno ze `instances.length`, `derived` v payloadu NENÍ, identický stav po re-derive
- **Precache regenerován**: `node tools/gen-precache.mjs` → čistý diff jen PRECACHE_VERSION
- **Nové testy (27)**: m5-buildings-t1.test.js (scaleCostByCount tabulkový, rebuildBuildingDerived idempotence+drift, ageBuildings wear+winter+NaN+repair+determinism+destroy, persist round-trip, projectSeq, recalcBuildingAggregates)

## Placeholders pro T4 (T-007)

| Symbol | Soubor | TODO |
|--------|--------|------|
| `effective(id, attr, state)` | `buildings.js` | T4.1: přidat modifier fold (add→mul→set, sort by source+id); pak extrahovat do `catalog/effective.js` |
| `addBuildingModifiers(state, buildingId)` | `buildings.js` | T4.3: effects→modifier mapping (op add/mul/set, dot-path, per-typ aggregate: value=atom.value×created) |
| `removeBuildingModifiers(state, buildingId)` | `buildings.js` | T4.3: filter catalogState.modifiers by source=`building:${buildingId}` |
| `invalidateModifiers(state)` | `buildings.js` | T4.2: bump `state.catalogState._modVersion` |
| `recalcBuildingAggregates(state)` | `buildings.js` | T4.4: nahradit base-catalog reads za `effective(id, attr, state)` calls (ONE canonical path, M-1) |

T4 může přidat modifier fold a nahradit base-catalog reads, aniž by měnilo architekturu funkce — stačí rozšířit stávající stuby.

## Scope minimální projectQueue pro T1

Byl zaveden `state.home.projectQueue` (pole serializovatelných projektů) a `state.home.projectSeq` (deterministický čítač) kvůli repair projektům v T1. Build projekty (T2) budou používat stejnou strukturu — builder systém (T2/T-005) ji jen rozšíří o completeBuild logiku.

## Poznámky

- `'house'` přejmenováno na `'workerHouse'` v buildings.json kvůli K10 kolizi s houseTypes (id `house` již existuje v houseTypes.json)
- `extractors/buildings.mjs` aktualizován — extraction reproducibility test zůstává zelený
- `rebuildBuildingDerived` volána z load Step 5 PŘED `deriveWorkforceTotal` (dle design §4.6 — workforce může číst `derived.maxWorkers` v budoucnu)
- Design M5-R1 (zákaz load-only větve) respektován: `recalcBuildingAggregates`/`addBuildingModifiers` NEVOLÁNY přímo z `load.js` — pouze přes `rebuildBuildingDerived`
