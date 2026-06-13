# Implementation Note – iter-007 T-002b (M2a-2)

- **Task**: T-002b, iter-007
- **Date**: 2026-06-13
- **Author**: coder (Sonnet)

## What Was Done

### T3 – Population + Housing Systems
- `src/core/systems/population.js`: `populationMigration` (step/10) and `populationRetirement` (noon/20)
  - Fractional migration accumulator: rate = attractiveness / (stepsPerDay * 10), jump when acc >= 1
  - Respects housing capacity limit (null capacity = unlimited)
  - `calcHousingDerivedFromCatalog` helper exported for reuse
- `src/core/systems/housing.js`: `housingSettlementLevel` (day/20) – recalculates from counts + catalog
- `src/core/systems/health.js`: `healthBirths` (noon/10) – births via natality formula, capacity-capped

### T4 – Food + Health + Crime Systems
- `src/core/systems/food.js`: `meal1` (day/10), `meal2` (noon/50), `foodSpoilage` (month/10)
  - Fair-share consumption via `consumeFood` pure formula
  - Spoilage rates from population.json (bread: 0.08, fish: 0.23, cheese: 0.08 – D-CHEESE-SPOILAGE: used 0.08 active, 0.10 baseSpoilage, gap M9)
  - Starvation deaths at 0.001× starved units
- `src/core/systems/health.js`: `healthDisease` (noon/30)
  - RNG: `makeRng(state, 'population')` for determinism
  - Lifecycle: chance trigger → duration countdown → deaths → end
- `src/core/systems/jobs.js`: `jobsProduction` (quarterDay/10)
  - Food-kind jobs only; fixed 5 workers per job (M3 gap: real worker assignment)
  - Uses `resourceKindOf` to filter food items only
- `src/core/systems/crime.js`: `crimeDaily` (noon/40)
  - Crime level delta: basePerDay - guardDampening (approximated 0.0005)
  - Gold loss from incidents

### T5 – Stubs World + Battle + Contract Tests
- `src/core/systems/world.js`: `worldTick` no-op (day/30) – S-06 compliant (zero market API refs)
- `src/core/systems/battle.js`: `battleStep` pure + `battleTick` no-op (step/30)
  - BattleState contract established: `{zoneId, sides, state, tick, log, summary}`

### tickOrder + docs
- `src/core/engine/tickOrder.js`: all 17 periodics registered with real system functions
  - Noon order: births(10) → retirement(20) → disease(30) → crime(40) → meal2(50)
  - Day order: meal1(10) → settlementLevel(20) → world(30)
- `docs/tickOrder.md`: updated to iter-007 M2a-2 with full live/stub table

### Tests
- `test/population.test.js`: calcHousingDerivedFromCatalog, migration accumulator, retirement, births, settlement level
- `test/food.test.js`: consumeFood fair-share, foodVariety, spoilage formula, meal1/meal2, starvation
- `test/health-crime.test.js`: diseaseChance, disease lifecycle, crimeCount, crimeDaily
- `test/contracts.test.js`: §8 contracts – battle determinism, world/battle round-trip, schedule save/load, S-06 negative

### UI
- `src/ui/App.js`: minimal population/food/health/crime display above speed controls

## CI Results
- tsc: 0 errors
- lint:core: 32 files OK (no DOM/Date.now/Math.random in core)
- node --test: **411 pass, 0 fail** (was 340 before M2a-2)

## Odchylky / Gaps / Approximated

| Gap | Detail | Provenance |
|-----|--------|------------|
| D-CHEESE-SPOILAGE | Used population.json spoilage.cheese=0.08 (active); baseSpoilage.cheese=0.10 (reference). Balance M9. | approximated |
| Job worker count | Fixed 5 workers per job in M2a. Real worker assignment (jobs+home assignment) M3. | approximated |
| Crime guard dampening | Fixed 0.0005 per tick (city guard mechanic M4). | approximated |
| Crime gold loss | floor(incidents * 0.5) – real theft mechanic M4. | approximated |
| Migration attractiveness divisor | divisor = stepsPerDay * 10 (no source ref). | approximated |
| BALANCE.health disease* | diseaseBaseChancePer20kPop=0.01, duration=14d, deathFraction=0.05 – no source; from M2a-1 approximation. | approximated |
| BALANCE.housing.levelThresholds | [0,10,50,200,500,1000,5000] – no source; approximated. | approximated |
| BALANCE.start | population=50, gold=500, food.bread=20 – approximated from design §6.4. | approximated |
