# Tick Order – Living Artefact (iter-004, M0a)

Source of truth: `src/core/engine/tickOrder.js` (`TICK_ORDER` export and `registerCorePeriodics`).

## Execution Phases (each step)

| # | Phase | Description |
|---|-------|-------------|
| 1 | calendar | Advances day/month/year/season; produces TimeEdges for this step |
| 2 | schedule | Fires one-shot events with step ≤ curStep, via fns registry |
| 3 | periodics | Runs periodic tasks in declared order, filtered by active edge |
| 4 | eventFlush | Dev invariant checks (NaN guard on curStep; full invariants in M2+) |

## Core Periodics (iter-004 – all no-op until M2+)

| ID | Edge | Order | SystemFn |
|----|------|-------|---------|
| population.migration | step | 10 | noop |
| skills.progress | step | 20 | noop |
| jobs.production | quarterDay | 10 | noop |
| health.births | noon | 10 | noop |
| meal.daily | day | 10 | noop |
| forest.regen | 10days | 10 | noop |
| localTaxes | 5days | 10 | noop |
| taxes.monthly | month | 10 | noop |
| season.change | season | 10 | noop |

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

## Bootstrap Sequence (reference, not a runtime file)

```js
const state = createInitialState({ seed });
initRng(state);
const registry = createRegistry();
const periodics = registerCorePeriodics(registry);
const creg = createCommandRegistry();
registerSetSpeed(creg);
const ctx = { registry, periodics };
// Loop: advance(acc, state, ctx, nowMs)
// UI: dispatch(creg, state, { type: 'setSpeed', params: { speed: 2 } })
```
