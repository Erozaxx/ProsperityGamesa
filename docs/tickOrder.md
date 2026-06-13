# Tick Order – Living Artefact (iter-009 M3)

Source of truth: `src/core/engine/tickOrder.js` (`TICK_ORDER` export and `registerCorePeriodics`).

## Execution Phases (each step)

| # | Phase | Description |
|---|-------|-------------|
| 1 | calendar | Advances day/month/year/season; produces TimeEdges for this step |
| 2 | schedule | Fires one-shot events with step ≤ curStep, via fns registry |
| 3 | periodics | Runs periodic tasks in declared order, filtered by active edge |
| 4 | eventFlush | Dev invariant checks (NaN guard on curStep; full invariants in M2+) |

## Core Periodics (iter-009 M3 – live systems)

| ID | Edge | Order | SystemFn | Status |
|----|------|-------|----------|--------|
| population.migration | step | 10 | population.migration | LIVE |
| skills.progress | step | 20 | skills.progress | LIVE (M3) |
| battle.tick | step | 30 | battle.tick | STUB |
| jobs.production | quarterDay | 10 | jobs.production | LIVE (M3 progress model) |
| jobs.accidents | quarterDay | 20 | jobs.accidents | LIVE (M3) |
| jobs.autoAssign | quarterDay | 30 | jobs.autoAssign | LIVE (M3) |
| health.births | noon | 10 | health.births | LIVE |
| population.retirement | noon | 20 | population.retirement | LIVE |
| health.disease | noon | 30 | health.disease | LIVE |
| crime.daily | noon | 40 | crime.daily | LIVE |
| food.meal2 | noon | 50 | food.meal2 | LIVE |
| workerEfficiency.daily | day | 5 | workerEfficiency.daily | LIVE (M3) |
| food.meal1 | day | 10 | food.meal1 | LIVE |
| housing.settlementLevel | day | 20 | housing.settlementLevel | LIVE |
| world.tick | day | 30 | world.tick | STUB |
| field.daily | day | 40 | field.daily | LIVE (M3) |
| mine.daily | day | 50 | mine.daily | LIVE (M3) |
| forest.regen | 10days | 10 | forest.regen | LIVE (M3) |
| localTaxes | 5days | 10 | noop | M4 |
| food.spoilage | month | 10 | food.spoilage | LIVE |
| taxes.monthly | month | 20 | noop | M4 |
| season.change | season | 10 | noop | M3 (future) |

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
