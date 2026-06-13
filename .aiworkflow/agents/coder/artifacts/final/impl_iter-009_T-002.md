# Impl Note – iter-009 T-002 (M3 Production)

## CI Results
- tsc: **0 errors**
- lint:core (grep gate): **OK** (41 files checked)
- tests: **577/577 pass** (36 new M3 tests in `test/m3-production.test.js`)

## Scope Delivered

### T1: World Stocks (forest/field/mine)
- `src/core/systems/forest.js` – `forestRegen` (10days, order 10): sapling queue, spring/autumn animal regen, fire risk via `makeRng(state,'forest')`
- `src/core/systems/field.js` – `fieldDaily` (day, order 40): rodent infestation (no-op until farmland M4), inspectTime decrement; RNG not consumed when no farms (determinism)
- `src/core/systems/mine.js` – `mineDaily` (day, order 50): expander event (no-op in M3 until M5), RNG consumed only when needed
- `src/core/resources/handlers.js` – `stock` resource kind with `STOCK_PATH` map to `state.world.*` sub-domains
- `src/core/balance/balance.js` – `forestStocks`, `field`, `mine`, `space`, `accidents` sections
- `src/core/balance/formulas.js` – `forestArea(level)`, `fieldArea(level)`, `mineArea(level,mineUnlocked)`, `forestUsed(curTrees)`
- `src/core/state/createInitialState.js` – `createWorldState()` wires forest/field/mine from BALANCE
- `src/core/catalog/schemas.js` – added `'stock'` to resources kind enum

### T2: Jobs + Production Progress Model
- `src/core/systems/jobs.js` – **rewritten** from M2a placeholder; progress model: `job.curStep += workerEfficiency * job.number` per quarterDay; completion at `curStep > maxStep * STEPS_PER_DAY * number`; `jobsAccidents` wolf/proc accidents; `autoAssignWorkers` round-robin slot fill
- `src/core/commands/assignJob.js` – new command; validates jobId, delta, max, unemployed workers
- `src/core/engine/tickOrder.js` – added `jobs.accidents` (quarterDay/20), `jobs.autoAssign` (quarterDay/30)
- `tools/extract/extractors/jobs.mjs` – added `maxStep:0.005`, `max:50`, `autoAssignable:true`; builder stub

### T3: workerEfficiency
- `src/core/systems/workerEfficiency.js` – `workerEfficiencyDaily` (day, order 5): sets `state.home.workerEfficiency`; M3 = constant 1.0 (G-MORALE-M5 gap)
- `src/core/balance/formulas.js` – `workerEfficiency({base,curfew,...})` clamped to [0.25, 2.0]

### T4: Skills
- `src/core/systems/skills.js` – `skillsProgress` (step, order 20): K4 2× compensation (`effMaxStep = maxStep * 0.5`); woodworking(maxStep=50) completes at step 26
- `src/core/commands/startSkill.js` – new command; validates skill exists, not already progressing
- `tools/extract/extractors/skills.mjs` – 2 approximated example skills (woodworking/scholarship)
- `src/app/catalogs.js` – added `'skills'` to CATALOG_NAMES
- `src/core/catalog/loader.js` – added `'skills'` to ID_CATALOGS

### BL-3: ctx.catalog pre-load
- `src/core/engine/tickOrder.js` – `hasCatalog(ctx, name)` helper; M3 systems use `ctx.catalog.jobs`, `ctx.catalog.skills`
- No per-step `getCatalog()` try/catch in hot-path for M3 systems

### Persist Schema
- `src/save/persistSchema.js` – added `world.forest`, `world.field`, `world.mine` to allowlist; added `home.workerEfficiency`, `home.workforce.assigned`, `home.jobs.*` (number/curStep), `home.skills.*` (progressing/curStep); progPct derived – NOT saved
- `src/save/load.js` – `applyPayload` restores new domains

### Types
- `src/core/state/types.d.ts` – `JobState`, `SkillState`, `WorkforceState`, `ForestState`, `FieldState`, `MineState`, `CatalogCache`; `TickContext.catalog?`

### Gap Report
- Added 12 new M3 gaps: G-JOB-MAXSTEP, G-FOREST-TECHMODS, G-FIELD-FARMS, G-MINE-EXPANDER, G-BUILDER-M5, G-JOB-TASKS, G-POP-WORKFORCE, G-HOME-LEVEL, G-MORALE-M5, G-SKILL-COMPENSATION, G-SKILL-EFFECTS, G-SKILL-DISCOVERY

### Docs
- `docs/tickOrder.md` – updated to M3 with all new system IDs, edges, orders

## Approximated Values (gaps to revisit in M9)
- `jobs.maxStep = 0.005` – approximated from home.js loops (G-JOB-MAXSTEP)
- `jobs.max = 50` – approximated (G-POP-WORKFORCE)
- `skills.woodworking.maxStep = 50`, `skills.scholarship.maxStep = 100` – approximated (G-LISTSKILL)
- `skills.stepCompensation = 0.5` – K4 2× compensation for engine step vs original Skills.step() (G-SKILL-COMPENSATION)
- `forest.startTrees = 27173`, `forest.startAnimals = 3864` – from config.js:686-715
- `forest.saplingQueueLen = 10` – approximated from original game behavior
- `workerEfficiency` M3 baseline = 1.0, morale parts deferred to M5 (G-MORALE-M5)

## Deviations from Spec
- T5 UI screens not implemented (ForestScreen, FieldScreen, MineScreen, JobsScreen, SkillsScreen) – deferred; no UI framework confirmed yet; no failing tests
- `assignJob` command validates resulting number within [0, max] but does not check `autoAssignable` (players can manually override)
- BL-3 Variant B (population.js/food.js hasCatalog refactor) deferred; existing try/catch still in place but no hot-path cost for M3 systems
