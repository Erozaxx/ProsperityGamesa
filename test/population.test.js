/**
 * population.test.js – iter-007 M2a-2 population systems tests.
 * Tests: migration accumulator, births, retirement, housing capacity.
 */

import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { populationMigration, populationRetirement, calcHousingDerivedFromCatalog, DAYS_PER_YEAR, populationSanityCap } from '../src/core/systems/population.js';
import { healthBirths } from '../src/core/systems/health.js';
import { natality } from '../src/core/balance/formulas.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function createState() {
  const state = createInitialState();
  initRng(state);
  return state;
}

const MOCK_CTX = { registry: /** @type {any} */ ({}), periodics: [] };

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

afterEach(() => {
  // catalogs persist across tests (loaded in before), no need to clear
});

// -----------------------------------------------------------------------
// 1. calcHousingDerivedFromCatalog helper
// -----------------------------------------------------------------------
describe('calcHousingDerivedFromCatalog', () => {
  it('returns zeros for empty counts', () => {
    const catalog = [{ id: 'tent', capacity: null, workers: 3, attractiveness: 0 }];
    const result = calcHousingDerivedFromCatalog(catalog, {});
    assert.strictEqual(result.capacity, 0);
    assert.strictEqual(result.workerSlots, 0);
    assert.strictEqual(result.attractiveness, 0);
  });

  it('sums capacity for non-null entries', () => {
    const catalog = [
      { id: 'tent', capacity: null, workers: 3, attractiveness: 0 },
      { id: 'house', capacity: 600, workers: 5, attractiveness: 0 },
    ];
    const counts = { tent: 2, house: 3 };
    const result = calcHousingDerivedFromCatalog(catalog, counts);
    // tent has null capacity (no contribution), house has 600 * 3 = 1800
    assert.strictEqual(result.capacity, 1800);
    assert.strictEqual(result.workerSlots, 2 * 3 + 3 * 5); // 6 + 15 = 21
  });

  it('sums attractiveness', () => {
    const catalog = [
      { id: 'house', capacity: 600, workers: 5, attractiveness: 4 },
      { id: 'mansion', capacity: 1000, workers: 6, attractiveness: 8 },
    ];
    const counts = { house: 2, mansion: 1 };
    const result = calcHousingDerivedFromCatalog(catalog, counts);
    // 4*2 + 8*1 = 8 + 8 = 16
    assert.strictEqual(result.attractiveness, 16);
  });

  it('handles missing counts gracefully (defaults to 0)', () => {
    const catalog = [{ id: 'house', capacity: 600, workers: 5, attractiveness: 4 }];
    const result = calcHousingDerivedFromCatalog(catalog, {});
    assert.strictEqual(result.capacity, 0);
    assert.strictEqual(result.workerSlots, 0);
    assert.strictEqual(result.attractiveness, 0);
  });
});

// -----------------------------------------------------------------------
// 2. populationMigration – accumulator
// -----------------------------------------------------------------------
describe('populationMigration', () => {
  it('accumulates migrationAcc each step', () => {
    const state = createState();
    state.home.population.total = 0;
    state.home.population.migrationAcc = 0;
    // Give attractive housing
    state.home.housing.counts = { mansion: 1 }; // attractiveness=8

    const before = state.home.population.migrationAcc;
    populationMigration(state, {}, MOCK_CTX);
    // Should have increased by attractiveness / (stepsPerDay * 10)
    assert.ok(state.home.population.migrationAcc > before, 'migrationAcc should increase');
  });

  it('does not increase population until acc >= 1', () => {
    const state = createState();
    state.home.population.total = 10;
    state.home.population.migrationAcc = 0;
    // Very low attractiveness (tent has 0), won't accumulate much
    state.home.housing.counts = { tent: 1 }; // attractiveness=0

    populationMigration(state, {}, MOCK_CTX);
    // tent has 0 attractiveness, no migration
    assert.strictEqual(state.home.population.total, 10, 'population should not change with 0 attractiveness');
  });

  it('adds population when acc >= 1', () => {
    const state = createState();
    state.home.population.total = 10;
    state.home.population.migrationAcc = 0.99; // almost at 1
    // Give attractive housing
    state.home.housing.counts = { mansion: 100 }; // high attractiveness pushes acc over 1

    const popBefore = state.home.population.total;
    populationMigration(state, {}, MOCK_CTX);
    // After adding high attractiveness, acc should trigger addition
    // acc was 0.99 + (8*100 / (900*10)) = 0.99 + 0.0889 = 1.0789, floor=1
    assert.ok(state.home.population.total > popBefore, 'population should increase when acc >= 1');
  });

  it('subtracts floor(acc) from migrationAcc after adding population', () => {
    const state = createState();
    state.home.population.total = 10;
    state.home.population.migrationAcc = 1.5;
    state.home.housing.counts = { tent: 1 }; // 0 attractiveness means rate=0, just the existing acc

    // With 0 attractiveness, rate is 0, so no new acc is added
    // migrationAcc = 1.5 + 0 = 1.5, floor=1, acc becomes 0.5
    populationMigration(state, {}, MOCK_CTX);
    assert.ok(state.home.population.migrationAcc < 1, 'acc should drop below 1 after adding population');
    // acc should be ~0.5 (1.5 - 1 = 0.5)
    assert.ok(
      Math.abs(state.home.population.migrationAcc - 0.5) < 0.01,
      `acc should be ~0.5, got ${state.home.population.migrationAcc}`
    );
  });

  it('respects housing capacity limit', () => {
    const state = createState();
    // Only 1 house with capacity=200, already 199 people
    state.home.population.total = 199;
    state.home.population.migrationAcc = 5; // would add 5 but capacity limits
    state.home.housing.counts = { hovel: 1 }; // capacity=200, attractiveness=-1 (hovel)

    // With acc=5 and 1 space left (cap=200, pop=199), should only add 1
    populationMigration(state, {}, MOCK_CTX);
    // hovel attractiveness is -1, rate = -1/9000 (negative, so 0 added from rate)
    // acc stays at 5, floor=5, but capacity limits to 1
    assert.ok(state.home.population.total <= 200, 'population should not exceed housing capacity');
  });
});

// -----------------------------------------------------------------------
// 3. populationRetirement
// -----------------------------------------------------------------------
describe('populationRetirement', () => {
  // iter-012 A4 (T-008): retirement now uses the DAILY rate (annual retRate ÷ DAYS_PER_YEAR).
  // Use a large population so floor(pop * dailyRate) is observable.
  it('decreases population by natality(pop, retRate/DAYS_PER_YEAR)', () => {
    const state = createState();
    state.home.population.total = 200000;
    const expectedDied = natality(200000, BALANCE.population.retRate / DAYS_PER_YEAR);
    assert.ok(expectedDied > 0, 'sanity: daily retirement should be observable at pop=200000');

    populationRetirement(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, 200000 - expectedDied);
  });

  it('adds to diedTotal', () => {
    const state = createState();
    state.home.population.total = 200000;
    state.home.population.diedTotal = 5;
    const expectedDied = natality(200000, BALANCE.population.retRate / DAYS_PER_YEAR);

    populationRetirement(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.diedTotal, 5 + expectedDied);
  });

  it('clamps total >= 0', () => {
    const state = createState();
    state.home.population.total = 1; // very small population

    populationRetirement(state, {}, MOCK_CTX);

    assert.ok(state.home.population.total >= 0, 'total should not go negative');
  });

  it('does nothing for 0 population (no deaths)', () => {
    const state = createState();
    state.home.population.total = 0;
    state.home.population.diedTotal = 0;

    populationRetirement(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, 0);
    assert.strictEqual(state.home.population.diedTotal, 0);
  });
});

// -----------------------------------------------------------------------
// 4. healthBirths
// -----------------------------------------------------------------------
describe('healthBirths', () => {
  // iter-012 A4 (T-008): births now use the DAILY rate (annual matRate ÷ DAYS_PER_YEAR).
  // pop=9100 keeps the daily floor() > 0 while staying below sanityMaxPop (10000).
  it('increases population by natality(pop, matRate/DAYS_PER_YEAR)', () => {
    const state = createState();
    state.home.population.total = 9100;
    // Give null-capacity housing (tent) so capacity does not limit births.
    state.home.housing.counts = { tent: 10 };
    const expectedBorn = natality(9100, BALANCE.population.matRate / DAYS_PER_YEAR);
    assert.ok(expectedBorn > 0, 'sanity: daily births should be observable at pop=9100');

    healthBirths(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, 9100 + expectedBorn);
  });

  it('increases bornTotal', () => {
    const state = createState();
    state.home.population.total = 9100;
    state.home.population.bornTotal = 0;
    state.home.housing.counts = { tent: 10 };
    const expectedBorn = natality(9100, BALANCE.population.matRate / DAYS_PER_YEAR);

    healthBirths(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.bornTotal, expectedBorn);
  });

  it('clamps births to housing capacity', () => {
    const state = createState();
    // hovel capacity=200, already at 200 people
    state.home.population.total = 200;
    state.home.housing.counts = { hovel: 1 }; // capacity=200

    healthBirths(state, {}, MOCK_CTX);

    // Should not exceed capacity
    assert.ok(state.home.population.total <= 200, 'population should not exceed housing capacity');
  });

  // iter-012 A4 (T-008): null-capacity housing (tent) no longer allows literally unlimited
  // growth — the global sanity hard-cap bounds it. Renamed from "allows unlimited growth".
  it('grows up to the sanity cap with null-capacity housing (tent)', () => {
    const state = createState();
    state.home.population.total = 9100;
    state.home.housing.counts = { tent: 10 }; // tent has null capacity (no per-house limit)

    const before = state.home.population.total;
    healthBirths(state, {}, MOCK_CTX);

    // Grows, but never beyond the global sanity cap.
    assert.ok(state.home.population.total >= before, 'births allowed with null-capacity housing');
    assert.ok(
      state.home.population.total <= BALANCE.population.sanityMaxPop,
      'population must not exceed the global sanity cap'
    );
  });

  it('hard-caps births at the global sanity cap (tent-only)', () => {
    const state = createState();
    // Just below the cap; with null-capacity housing only the sanity cap should bound growth.
    state.home.population.total = BALANCE.population.sanityMaxPop - 1;
    state.home.housing.counts = { tent: 100 };

    healthBirths(state, {}, MOCK_CTX);

    assert.strictEqual(
      state.home.population.total,
      BALANCE.population.sanityMaxPop,
      'population should be clamped exactly to sanityMaxPop'
    );
  });

  it('does not exceed sanity cap even when births would overshoot', () => {
    const state = createState();
    state.home.population.total = BALANCE.population.sanityMaxPop;
    state.home.housing.counts = { tent: 100 };

    healthBirths(state, {}, MOCK_CTX);

    assert.ok(
      state.home.population.total <= BALANCE.population.sanityMaxPop,
      'already-at-cap population must not grow'
    );
  });
});

// -----------------------------------------------------------------------
// 4b. R-A4-3: over-cap loaded ("exploded") saves must not be shrunk
//     (iter-012 T-017 / F-1). Cap only stops NEW growth; never a retro shrink.
// -----------------------------------------------------------------------
describe('A4 over-cap loaded save is not shrunk (R-A4-3 / T-017 F-1)', () => {
  // tent has null capacity → housing capacity = 0 → sanityCap = sanityMaxPop.
  const overCap = BALANCE.population.sanityMaxPop + 5000;

  it('healthBirths leaves an over-cap total unchanged (no shrink, no growth past cap)', () => {
    const state = createState();
    state.home.population.total = overCap;
    state.home.population.bornTotal = 0;
    state.home.housing.counts = { tent: 100 }; // null-capacity → sanityCap = sanityMaxPop
    // Sanity: births would be > 0 at this pop, so a clamp-shrink bug would fire.
    assert.ok(
      natality(overCap, BALANCE.population.matRate / DAYS_PER_YEAR) > 0,
      'sanity: daily births should be observable above the cap'
    );

    healthBirths(state, {}, MOCK_CTX);

    assert.strictEqual(
      state.home.population.total,
      overCap,
      'over-cap total must not be shrunk down to the cap, nor grow above it'
    );
    assert.strictEqual(state.home.population.bornTotal, 0, 'no births counted while at/over cap');
  });

  it('populationMigration leaves an over-cap total unchanged (no shrink)', () => {
    const state = createState();
    state.home.population.total = overCap;
    state.home.population.migrationAcc = 5; // forces toAdd >= 1 so the cap branch executes
    state.home.housing.counts = { tent: 100 }; // null capacity → no per-house limit, sanityCap = sanityMaxPop

    populationMigration(state, {}, MOCK_CTX);

    assert.strictEqual(
      state.home.population.total,
      overCap,
      'over-cap total must not be shrunk down to the cap by migration'
    );
  });
});

// -----------------------------------------------------------------------
// 5. DAYS_PER_YEAR + sanity cap helpers (iter-012 A4 / T-008)
// -----------------------------------------------------------------------
describe('A4 sanity helpers', () => {
  it('DAYS_PER_YEAR equals 4 * seasonDays (= 364)', () => {
    assert.strictEqual(DAYS_PER_YEAR, 4 * BALANCE.season.seasonDays);
    assert.strictEqual(DAYS_PER_YEAR, 364);
  });

  it('populationSanityCap returns housing capacity when it exceeds sanityMaxPop', () => {
    const big = BALANCE.population.sanityMaxPop + 5000;
    assert.strictEqual(populationSanityCap(big), big);
  });

  it('populationSanityCap returns sanityMaxPop when housing capacity is lower', () => {
    assert.strictEqual(populationSanityCap(0), BALANCE.population.sanityMaxPop);
    assert.strictEqual(populationSanityCap(100), BALANCE.population.sanityMaxPop);
  });
});
