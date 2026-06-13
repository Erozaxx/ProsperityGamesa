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
import { populationMigration, populationRetirement, calcHousingDerivedFromCatalog } from '../src/core/systems/population.js';
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
  it('decreases population by natality(pop, retRate)', () => {
    const state = createState();
    state.home.population.total = 1000;
    const expectedDied = natality(1000, BALANCE.population.retRate);

    populationRetirement(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, 1000 - expectedDied);
  });

  it('adds to diedTotal', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.population.diedTotal = 5;
    const expectedDied = natality(1000, BALANCE.population.retRate);

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
  it('increases population by natality(pop, matRate)', () => {
    const state = createState();
    state.home.population.total = 1000;
    // Give unlimited capacity (tent)
    state.home.housing.counts = { tent: 10 };
    const expectedBorn = natality(1000, BALANCE.population.matRate);

    healthBirths(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, 1000 + expectedBorn);
  });

  it('increases bornTotal', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.population.bornTotal = 0;
    state.home.housing.counts = { tent: 10 };
    const expectedBorn = natality(1000, BALANCE.population.matRate);

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

  it('allows unlimited growth with null-capacity housing (tent)', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.housing.counts = { tent: 10 }; // tent has null capacity = unlimited

    const before = state.home.population.total;
    healthBirths(state, {}, MOCK_CTX);

    // With tent (null capacity), births should not be limited
    assert.ok(state.home.population.total >= before, 'births allowed with unlimited capacity');
  });
});
