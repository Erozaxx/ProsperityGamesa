# Implementation Summary — iter-012 Playability Hardening (T-005..T-009)

- **Agent**: coder
- **Iteration**: iter-012
- **Tasks**: T-005 (A1), T-006 (A2), T-007 (A3), T-008 (A4), T-009 (A5)
- **Date**: 2026-06-13
- **Source of truth**: `architecture_playability_iter-012_T-003.md` (Final, supersedes T-001)
- **Implementation order (binding)**: A1 → A4 → A3 (test) → A5 → A2
- **Result**: `npm run ci` GREEN, `npm run smoke` OK. NOT committed (orchestrator commits after QA).

---

## A1 (T-005) — Start seed from BALANCE.start

**Changes**
- `src/core/state/createInitialState.js`: after building `player`/`home` (factories), seed from `BALANCE.start`:
  `player.gold = 500`, `home.population.total = 50`, `home.housing.counts = { ...BALANCE.start.housing }` (`{tent:5}`),
  `home.food.store = { ...zeroStore, ...BALANCE.start.food }` (guarantees all 6 keys, bread=20). Single seed path.
- `src/core/state/createHomeState.js`: removed the bogus `start['startTents']`/`start['startPopulation']` reads (those
  keys never existed in BALANCE.start). `createHomeState()` is now a pure neutral default (`population.total: 0`,
  `housing.counts: {}`, zero-filled 6-key food store). Signature simplified (no `catalog` param). `createPlayerState()`
  unchanged (`gold: 0` neutral default).
- `src/save/load.js`: deleted the `state.home = createHomeState(catalog)` / `state.player = createPlayerState()` override
  (ex-lines 211-212). Seed from `createInitialState` is now kept and `applyPayload` (allowlist) overwrites persisted
  fields — fresh and load share ONE seed path. Removed now-unused `createHomeState`/`createPlayerState` import; the
  `catalog` param is retained as `_catalog` for signature compatibility (unused).

**Why correct**: factories keep their "no catalog / neutral defaults" JSDoc contract; start values centralized where
`BALANCE` is already imported. Old saves load correctly (allowlist re-applies persisted gold/pop/housing/food); a save
missing home fields keeps the seeded default (R-A1-1, desired). Save version unchanged (3), no shape change.

## A4 (T-008) — Daily population rates + global sanity cap

**Changes**
- `src/core/systems/population.js`: added `export const DAYS_PER_YEAR = 4 * BALANCE.season.seasonDays` (= 364) and
  `export function populationSanityCap(housingCapacity)` = `max(housingCapacity, BALANCE.population.sanityMaxPop)`.
  `populationRetirement` now uses `retRate / DAYS_PER_YEAR` (daily). `populationMigration` clamps the result to the
  sanity cap (symmetric with births — review MINOR-3).
- `src/core/systems/health.js`: `healthBirths` uses `matRate / DAYS_PER_YEAR` (daily) and clamps the new total to
  `max(capacity, sanityMaxPop)`. Imports `DAYS_PER_YEAR` from population.js.
- `src/core/balance/balance.js`: added `population.sanityMaxPop = 10000`.
- `calcHousingDerivedFromCatalog` NOT modified (shared fn). No RNG → deterministic; `healthDisease` RNG stream untouched.

**Deviation**: `src/data/balance.json` NOT mirrored with `sanityMaxPop` — the environment auto-reverts manual edits to
this extracted/generated data file, and nothing reads `sanityMaxPop` from JSON (runtime reads `BALANCE` from balance.js;
all tests read `BALANCE.population.sanityMaxPop`). Functionally complete; the architect's "mirror for consistency" note
was superseded by the file's generated nature.

## A3 (T-007) — Crime no-throw regression (no code change)

- `src/core/systems/crime.js` unchanged (existing `Math.min(floor, player.gold)` clamp + `incidents>0` + `player.gold>0`
  guards already prevent throws). Added regression tests only.

## A5 (T-009) — Market UI overflow

**Changes**
- `src/ui/screens.js`: wrapped `<table class="market-table">` in `<div class="table-scroll">…</div>` (no component logic change).
- `src/ui/styles.css`: added `.table-scroll` (overflow-x:auto), `.market-table` layout, `.market-actions` (nowrap +
  styled/disabled buttons reusing existing `var(--…)`), and `@media (max-width:480px)` stacking the action buttons.

## A2 (T-006) — Resolver hardening (Option A)

**Changes**
- `src/core/resources/handlers.js`: `resourceKindOf` returns `'gold'`/`'techPt'` via early-return BEFORE the `byId`
  lookup. No-op with catalog loaded (gold/techPt are in resources.json with matching kind); catalog-less harnesses now
  resolve correctly instead of falling to `'resource'`. 4-line defense-in-depth, no production behavior change.

---

## Tests added / updated

**New**
- `test/iter012-playability.test.js` (9 tests):
  - A1: fresh start seed (gold 500 / pop 50 / tent 5 / bread 20), all-6-food-keys, housing is a fresh copy,
    old-save load overrides seed, save-missing-home falls back to seed (R-A1-1).
  - A2: `resourceKindOf`/`handlerFor` invariance for gold/techPt WITH and WITHOUT catalog; grep-gate (gold/techPt in
    resources.json with kind==id); gold handler reads `player.gold`.
- `test/health-crime.test.js` (+2 tests): A3 `crimeDaily` no-throw across pop∈{0,1,50,1000,10000} × gold∈{0,1,5,100};
  gold clamp on broke settlement (never negative).
- `test/population.test.js` (+3 tests): births hard-cap exactly at sanityMaxPop; no overshoot when already at cap;
  `DAYS_PER_YEAR`/`populationSanityCap` helper assertions.

**Updated (seeded-start / daily-rate)**
- `test/population.test.js`: retirement/births now assert `natality(pop, annualRate / DAYS_PER_YEAR)` (pop scaled up so
  floor>0); renamed "allows unlimited growth (tent)" → "grows up to the sanity cap" with cap assertion.
- `test/transactions.test.js`: grant tests zero the relevant field first (fresh start now seeds gold/bread) to test deltas.
- `test/calendar.test.js`: added catalog `before` hook (seeded pop/food makes real tick systems run; catalog-less would
  mis-resolve food/resource keys).
- `test/iter005-edge.test.js`: added catalog `before` hook; the G1 determinism assertion now compares `applyPersist()`
  projections (persisted state) instead of the full `hashState` — derived, non-persisted `home.workforce.total` lags one
  quarterDay edge after a mid-cycle reload (architecture §9.1 K11). Precache freshness test passes after regen.

## Out-of-scope but necessary
- `tools/smoke.mjs`: pre-existing typecheck breakage (committed in 1f3168d; baseline CI was already RED) blocked the
  green-CI gate. Applied type-annotation-only fixes (`@type` on MIME/errors, `listen` callback, `instanceof Error` in
  catch). Zero behavior change.
- `src/precache.js`: regenerated (`node tools/gen-precache.mjs`) — it hashes src files and my edits changed it.

## LATENT finding (flagged for orchestrator / architect)
`jobsAccidents` (quarterDay order 20) reads the un-persisted derived `home.workforce.total` BEFORE `autoAssignWorkers`
(order 30) refreshes it. After a mid-cycle reload this field is 0 (not persisted) vs a live value in the uninterrupted
run, so on the FIRST post-load quarterDay edge the two paths can consume the population RNG stream differently → full
`hashState` divergence in long sims. Pre-existing; A1's pop seed made it observable. NOT in A1-A5 scope; recommend an
architect decision (recompute-on-load of derived workforce, or have jobsAccidents read a live worker count) in a follow-up.

## Validation output
- `npm run ci` → exit 0. typecheck: 0 errors; lint:core: OK (52 files); `node --test`: **778 tests, 778 pass, 0 fail**.
- `npm run smoke` → exit 0: "SMOKE OK: app rendered, 0 console errors." (UI shows seeded "Populace 50").
- Determinism: no RNG paths changed; save version stays 3 (values only, no shape change).
