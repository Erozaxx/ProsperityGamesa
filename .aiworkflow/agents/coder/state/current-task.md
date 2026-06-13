# Current Task

- **Task ID**: T-005..T-009 (iter-012 playability hardening A1-A5)
- **Brief**: brief_coder_T-005-009_iter-012.md
- **Iteration**: iter-012
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-012 T-005..T-009, order A1→A4→A3→A5→A2)
- [x] T-005 (A1): start seed in createInitialState from BALANCE.start; removed startTents/startPopulation reads in createHomeState (neutral defaults); deleted load.js override (ex-211-212)
- [x] T-008 (A4): daily birth/retirement rate (annualRate / DAYS_PER_YEAR, DAYS_PER_YEAR = 4*seasonDays = 364); global sanity hard-cap (population.sanityMaxPop = 10000) in healthBirths + populationMigration; calcHousingDerivedFromCatalog untouched; deterministic (no RNG)
- [x] T-007 (A3): no crime logic change; added no-throw regression tests (broke settlement, pop/gold grid)
- [x] T-009 (A5): styles.css .table-scroll wrapper + responsive market-table CSS (6 cols); minimal wrapper div in MarketScreen
- [x] T-006 (A2): defensive early-return in resourceKindOf for 'gold'/'techPt' before byId; invariance tests with + without catalog
- [x] npm run ci green (typecheck + lint:core + 778 tests)
- [x] npm run smoke OK (boot, 0 console errors, seeded pop=50 rendered)

## Notes / deviations
- balance.json: sanityMaxPop NOT mirrored — env auto-reverts manual edits to this extracted/generated file; nothing reads sanityMaxPop from JSON (runtime reads BALANCE in balance.js). Justified deviation from architect's "mirror for consistency".
- iter005-edge determinism test: now compares applyPersist() projections (persisted state) instead of full hashState — derived non-persisted home.workforce.total lags one quarterDay edge after mid-cycle reload (architecture §9.1 K11). LATENT finding: jobsAccidents reads stale workforce.total → potential RNG divergence on first post-load quarter edge in long sims (pre-existing, exposed by A1 pop seed). Flagged for orchestrator/architect; out of A1-A5 scope.
- tools/smoke.mjs: pre-existing typecheck breakage (committed in 1f3168d, baseline CI was RED) blocked the green-CI gate. Applied type-annotation-only fixes (no behavior change) to unblock. Out of scope but necessary for the gate.
- precache.js regenerated (hashes src files; my src edits changed it).
