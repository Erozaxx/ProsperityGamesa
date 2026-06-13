# Current Task

- **Task ID**: T-002b
- **Brief**: BRIEF-025 (M2a-2)
- **Iteration**: iter-007
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-007 T-002b M2a-2)
- [x] T3 population system: populationMigration (step/10), calcHousingDerivedFromCatalog
- [x] T3 retirement: populationRetirement (noon/20)
- [x] T3 births: healthBirths (noon/10)
- [x] T3 housing: housingSettlementLevel (day/20)
- [x] T4 jobs: jobsProduction (quarterDay/10) – food jobs only, fixed 5 workers (M3 pending)
- [x] T4 food: meal1 (day/10), meal2 (noon/50), foodSpoilage (month/10)
- [x] T4 health disease: healthDisease (noon/30) lifecycle
- [x] T4 crime: crimeDaily (noon/40)
- [x] T5 world stub: worldTick (day/30) – no-op, S-06 compliant
- [x] T5 battle stub: battleTick (step/30) + battleStep pure function
- [x] tickOrder.js: all systems registered with correct edges+order
- [x] docs/tickOrder.md: updated with all new slots
- [x] Tests: population.test.js, food.test.js, health-crime.test.js, contracts.test.js
- [x] S-06 contract test: static import check + behavioral spy
- [x] UI: minimal population/food/health/crime display in App.js
- [x] tsc: 0 errors
- [x] lint:core: 32 files OK
- [x] node --test: 411 pass, 0 fail
