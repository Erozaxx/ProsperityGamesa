# Tick Order – Living Artefact (iter-009 M3 / iter-013 M5-1 T1+T2 / iter-016 M7a-1 / iter-017 M7a-2)

Source of truth: `src/core/engine/tickOrder.js` (`TICK_ORDER` export and `registerCorePeriodics`).

## Execution Phases (each step)

| # | Phase | Description |
|---|-------|-------------|
| 1 | calendar | Advances day/month/year/season; produces TimeEdges for this step |
| 2 | schedule | Fires one-shot events with step ≤ curStep, via fns registry |
| 3 | periodics | Runs periodic tasks in declared order, filtered by active edge |
| 4 | eventFlush | Dev invariant checks (NaN guard on curStep; full invariants in M2+) |

## Core Periodics (iter-009 M3 / iter-013 M5-1 / iter-017 M7a-2 – live systems)

| ID | Edge | Order | SystemFn | Status |
|----|------|-------|----------|--------|
| population.migration | step | 10 | population.migration | LIVE |
| skills.progress | step | 20 | skills.progress | LIVE (M3) |
| battle.tick | step | 30 | battle.tick | STUB |
| jobs.production | quarterDay | 10 | jobs.production | LIVE (M3 progress model) |
| jobs.accidents | quarterDay | 20 | jobs.accidents | LIVE (M3) |
| jobs.autoAssign | quarterDay | 30 | jobs.autoAssign | LIVE (M3) |
| buildings.builders | quarterDay | 40 | buildings.builders | LIVE (M5-1 T2) |
| health.births | noon | 10 | health.births | LIVE |
| population.retirement | noon | 20 | population.retirement | LIVE |
| health.disease | noon | 30 | health.disease | LIVE |
| crime.daily | noon | 40 | crime.daily | LIVE |
| food.meal2 | noon | 50 | food.meal2 | LIVE |
| workerEfficiency.daily | day | 5 | workerEfficiency.daily | LIVE (M3) |
| food.meal1 | day | 10 | food.meal1 | LIVE |
| housing.settlementLevel | day | 20 | housing.settlementLevel | LIVE |
| world.tick | day | 30 | world.tick | LIVE (M7a-1: day-index round-robin processZone + marketInject) |
| market.drift | day | 35 | market.drift | LIVE (M4b) |
| field.daily | day | 40 | field.daily | LIVE (M3) |
| mine.daily | day | 50 | mine.daily | LIVE (M3) |
| home.burnWood | day | 60 | home.burnWood | LIVE (M4a) |
| buildings.age | day | 70 | buildings.age | LIVE (M5-1 T1) |
| research.daily | day | 75 | research.daily | LIVE (M6) |
| forest.regen | 10days | 10 | forest.regen | LIVE (M3) |
| localTaxes | 5days | 10 | taxes.local | LIVE (M4a) |
| food.spoilage | month | 10 | food.spoilage | LIVE |
| taxes.monthly | month | 20 | taxes.monthly | LIVE (M4a) |
| world.gatherTributes | month | 25 | world.gatherTributes | LIVE (M7a-2: tribute collection before upkeep, §6.2) |
| upkeep.military | month | 30 | upkeep.military | LIVE (M4a) |
| council.closeMonth | month | 40 | council.closeMonth | LIVE (M4a) |
| season.change | season | 10 | noop | STUB |

### ASCII Diagram (iter-013 M5-1 update)

```
step:       populationMigration → skillsProgress → battleTick(stub)
quarterDay: jobsProduction → jobsAccidents → autoAssignWorkers → [buildersProcess]NEW(T2)
noon:       healthBirths → populationRetirement → healthDisease → crimeDaily → meal2
day:        workerEfficiency → meal1 → settlementLevel → worldTick(round-robin) → market.drift
            → field → mine → burnWood → [buildings.age]NEW(T1) → [research.daily]NEW(M6)
10days:     forestRegen
5days:      localTaxes
month:      food.spoilage → taxes.monthly → world.gatherTributes → upkeep.military → council.closeMonth
season:     noop
schedule:   one-shot events by deadlineStep (e.g. future: contract.expire)
event-driven (outside tick): completeBuild/destroyInstance/applyRepair → rebuildBuildingDerived
             → recalcBuildingAggregates → derived.{maxWorkers,storageCapacity,attractiveness}
```

## Schedule Handlers (iter-017 M7a-2 – registerWorldEffects)

One-shot schedule entries fired by `engine.schedule` (step ≤ curStep). Registered via `registerWorldEffects` (world.js) + `registerCorePeriodics` (tickOrder.js).

| Schedule ID | Handler fn | Status | Notes |
|---|---|---|---|
| world.processFaction | processFaction | LIVE (M7a-2) | AI turn per faction; self-re-arms unconditionally (anti-DR-012-02); period = BALANCE.world.aiTurnPeriod |
| world.takeOver | takeOver | LIVE (M7a-2) | AI faction takes over a zone after AI-vs-AI battle resolve |
| world.questExpire | questExpire | LIVE (M7a-2) | Idempotent quest expiration when deadline step reached |
| startBattle | startBattleStub | STUB (M7b) | AI-vs-player battle trigger; no-op until M7b |
| AIIsAttacking | AIIsAttackingStub | STUB (M8) | Attack announcement event; no-op until M8 |
| warningAIAttacking | warningAIAttackingStub | STUB (M8) | Spy warning event; no-op until M8 |
| dangerAIAttacking | dangerAIAttackingStub | STUB (M8) | Spy danger event; no-op until M8 |
| loadImportantEvent | loadImportantEventStub | STUB (M8) | Revolt/story event; no-op until M8 |
| world.gatherTributes | gatherTributes | LIVE (M7a-2) | Also registered as periodic (month, order 25); registered here as fallback |

## Edge Definitions

- `step`: every step (curStep % 1 === 0)
- `quarterDay`: every 225 steps (1/4 of a day)
- `noon`: step 450 within day (midday)
- `day`: first step of each day (stepInDay === 0)
- `5days`: every day where _absDay % 5 === 0
- `10days`: every day where _absDay % 10 === 0
- `month`: every 30th day (provisional – confirm @ M1)
- `season`: first step of each new season (dayInSeason === 1 on day boundary)
- `year`: first step of year (curSeason===0, dayInSeason===1 on day boundary)

## Calendar Constants

- 1 step = 0.05s game time = 50ms real time per step
- 1 day = 900 steps (45s game time)
- 1 season = 91 days
- 1 year = 4 seasons = 364 days
- 1 month = 30 days (provisional, confirm @ M1)

## M3 New Systems (iter-009)

### T1: World Stocks (forest/field/mine)
- `world.forest` — tracks `curTrees`, `saplings[]`, `curAnimals`
- `world.field` — tracks `curLivestock`, `inspectTime`
- `world.mine` — tracks `curOres`
- `stock` resource kind handler reads/writes `state.world.*` sub-domains
- Area formulas in `balance/formulas.js`: `forestArea(level)`, `fieldArea(level)`, `mineArea(level)`

### T2: Jobs Progress Model
- `jobsProduction` (quarterDay, order 10): `job.curStep += workerEfficiency * job.number`; completion when `curStep > maxStep * 900 * number`
- `jobs.accidents` (quarterDay, order 20): wolf attacks (G-ACCIDENTS), proc accidents
- `jobs.autoAssign` (quarterDay, order 30): round-robin auto-assignment of free workers

### T3: workerEfficiency
- `workerEfficiency.daily` (day, order 5): sets `state.home.workerEfficiency`; M3 baseline = 1.0 (G-MORALE-M5)
- Clamped to [0.25, 2.0] by `workerEfficiency()` formula

### T4: Skills Progress
- `skills.progress` (step, order 20): `s.curStep++`; effMaxStep = `def.maxStep * 0.5` (K4: 2× compensation); completion grants products
- `startSkill` command sets `progressing = true`

### BL-3: ctx.catalog pre-load
- `hasCatalog(ctx, name)` helper avoids per-step `getCatalog()` try/catch in hot-path
- New M3 systems use `ctx.catalog.jobs`, `ctx.catalog.skills` (pre-loaded in app bootstrap)

## M5-1 New Systems (iter-013)

### T1: Building Instances + Wear (buildings.age)
- State: `state.home.buildings[id] = { created, totalMade, instances:[{instId,hp,inRepair}] }`
- `ageBuildings` (day, order 70): probabilistic HP wear via `rng.stream('buildings')` (isolated, K16/D4); winter +`winterHpLoss`; triggers repair projects when `hp/resistance <= 0.25`; destroys instance when `inRepair && hp <= 0`
- `rebuildBuildingDerived(state)`: SINGLE shared derivation path (M-2). Called from load Step 5 AND from every mutation (completeBuild/destroyInstance/applyRepair). Steps: (a) `created = instances.length`, (b) re-gen building modifiers [TODO T4], (c) recalcBuildingAggregates
- `recalcBuildingAggregates`: ONE canonical path (M-1): `derived.{maxWorkers, storageCapacity, attractiveness}` = Σ effective(id, attr) across buildings
- Persist: `buildings/{created,totalMade,instances}` + `projectQueue` + `projectSeq` in allowlist; `derived` and `_effCache` NOT saved
- RNG stream: `'buildings'` (new isolated stream, appended to STREAM_NAMES in rng.js)

### T2: Builder System + build() command (iter-013 M5-1 T2)
- `build(itemId)` command (`src/core/commands/build.js`, registered via `registerBuild`): validates existence/unlock/queue capacity; scales cost via `scaleCostByCount(baseCost, totalMade, scaleFactor)`; pays via `pay()` (no ctx — G-BUILD-TXAUDIT gap, M5-D11); pushes build project to `projectQueue` with deterministic ID via `projectSeq`
- `buildersProcess` (quarterDay, order 40): advances projects in `projectQueue`. Builder count from `state.home.jobs['builder'].number` (M3 job slot). Queue capacity and maxActiveProjects from builderHut instances × per-hut effects. Repair projects: deferred payment in builder (`project.paid=false` until canAfford). Requeue heuristic: `delay > requeueDelay` → move to end. Completion: `completeBuild` (new instance, `totalMade++`, `rebuildBuildingDerived`) or `applyRepair` (restore HP, `inRepair=false`).
- `completeBuild(state, project, ctx)`: push `{instId,hp,inRepair:false}` into `instances`; `created=instances.length`; `totalMade++`; call `rebuildBuildingDerived` (M-2 shared path)
- `applyRepair(state, project, ctx)`: `inst.hp += resistance` (clamped to max); `inRepair=false`; call `recalcBuildingAggregates`
- G-BUILDER-COMPANIES (T3): builder firm capacity/selection deferred to T-006. T2 uses only `state.home.jobs['builder'].number`.
- Balance constants added: `masonStep=1`, `quarterDaysPerDay=4`, `maxActiveProjects=0`, `maxProjectQueue=0`, `requeueDelay=2`

### T4 (LIVE — iter-013 M5-1, T-005/T-006/T-007)
- `effective(buildingId, attr, state)`: modifier fold (add→mul→set, deterministic sort by source+id) — implemented in `src/core/systems/buildings.js` (functions `fold`, `effective`, `baseAttr`). Note: `effective.js` does NOT exist as a separate file; the effective/modifier layer lives entirely in `buildings.js`.
- `addBuildingModifiers(state, buildingId)`: effects→modifier mapping with per-type aggregate (T4.3) — live in `src/core/systems/buildings.js` (`addBuildingModifiers`, `removeAllBuildingSourcedModifiers`)
- `recalcBuildingAggregates(state)`: iterates over placed buildings, calls `effective(buildingId, attr, state)` for each aggregated attr, accumulates into `home.derived` — live in `src/core/systems/buildings.js`
- `rebuildBuildingDerived(state)`: shared re-derivation entry point (5 call-sites: fresh, load, completeBuild, destroyInstance, applyRepair) — live in `src/core/systems/buildings.js`
- Modifier memoisation: `catalogState._effCache` / `_modVersion` (not persisted, re-derived on load/fresh)

## Bootstrap Sequence (reference, not a runtime file)

```js
const state = createInitialState({ seed });
initRng(state);
const registry = createRegistry();
const periodics = registerCorePeriodics(registry);
const creg = createCommandRegistry();
registerSetSpeed(creg);
registerAssignJob(creg);
registerStartSkill(creg);
const ctx = {
  registry, periodics,
  catalog: {
    jobs: getCatalog('jobs'),
    skills: getCatalog('skills'),
    houseTypes: getCatalog('houseTypes'),
    foods: getCatalog('foods'),
  }
};
// Loop: advance(acc, state, ctx, nowMs)
// UI: dispatch(creg, state, { type: 'assignJob', params: { jobId: 'woodcutter', delta: 1 } })
```
