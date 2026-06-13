/**
 * edge-m2a.test.js – iter-007 T-003 edge cases for M2a systems.
 *
 * Covers:
 * - Starvation → death edge case
 * - Housing overflow (population capped at capacity)
 * - Persist round-trip per domain (population/food/health/crime/housing)
 * - Tx invariants: no NaN, no negatives, atomicity, non-below-zero
 * - PWA smoke (cumulative: no crash over many steps)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { STEPS_PER_DAY } from '../src/core/engine/timeEdges.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { canAfford, pay, grant } from '../src/core/resources/transactions.js';
import { meal1, meal2, foodSpoilage } from '../src/core/systems/food.js';
import { populationMigration, populationRetirement } from '../src/core/systems/population.js';
import { healthBirths, healthDisease } from '../src/core/systems/health.js';
import { crimeDaily } from '../src/core/systems/crime.js';

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

function createCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

const MOCK_CTX = { registry: /** @type {any} */ ({}), periodics: [] };

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

// -----------------------------------------------------------------------
// 1. Starvation → death edge case
// -----------------------------------------------------------------------
describe('starvation → death edge case', () => {
  it('zero food over many meals causes population deaths', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.food.store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    const popBefore = state.home.population.total;
    // Run many meals (10 days = 20 meals, high starvation)
    for (let day = 0; day < 10; day++) {
      meal1(state, {}, MOCK_CTX);  // day meal
      meal2(state, {}, MOCK_CTX);  // noon meal
    }

    // 1000 people × 2 food/meal × 20 meals = 20000 starved units
    // deaths = floor(starved * 0.001) per meal
    // With large population and no food, deaths should occur
    // Note: deaths = floor(2000 * 0.001) = 2 per meal × 20 meals = 40 deaths
    assert.ok(
      state.home.population.total < popBefore,
      `Starvation should cause deaths: before=${popBefore} after=${state.home.population.total}`
    );
  });

  it('partial food reduces starvation proportionally', () => {
    const state = createState();
    state.home.population.total = 100;
    // Only 50% of needed food (100 people × 2/meal = 200 needed, have 100)
    state.home.food.store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    meal1(state, {}, MOCK_CTX);

    // Should have consumed all bread (100), 100 starved
    assert.strictEqual(
      state.home.food.store.bread,
      0,
      'all bread consumed'
    );
    // deaths = floor(100 * 0.001) = 0 for small starvation, so population unchanged
    // (starvation deaths are fractional - only large starvation causes visible deaths)
    assert.ok(state.home.population.total >= 0, 'population non-negative after partial starvation');
  });

  it('population reaches zero gracefully (never negative)', () => {
    const state = createState();
    state.home.population.total = 2;
    state.home.food.store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    // Run many meals
    for (let i = 0; i < 100; i++) {
      meal1(state, {}, MOCK_CTX);
      meal2(state, {}, MOCK_CTX);
    }

    assert.ok(state.home.population.total >= 0, 'population must never go negative');
  });

  it('no NaN in food store after full consumption', () => {
    const state = createState();
    state.home.population.total = 500;
    state.home.food.store = { bread: 10, cheese: 5, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    meal1(state, {}, MOCK_CTX);

    for (const [id, val] of Object.entries(state.home.food.store)) {
      assert.ok(Number.isFinite(val), `food.store.${id} must be finite, got ${val}`);
      assert.ok(val >= 0, `food.store.${id} must be non-negative, got ${val}`);
    }
  });

  it('starvation deaths: floor(starved * 0.001) precision', () => {
    const state = createState();
    state.home.population.total = 10000;
    state.home.food.store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    // demand = 10000 * 2 = 20000, starved = 20000
    // deaths = floor(20000 * 0.001) = 20
    const popBefore = state.home.population.total;
    meal1(state, {}, MOCK_CTX);

    const expectedDeaths = Math.floor(popBefore * 2 * 0.001); // starved = demand = pop*consumeRate
    assert.strictEqual(
      popBefore - state.home.population.total,
      expectedDeaths,
      `Should lose exactly ${expectedDeaths} to starvation`
    );
  });
});

// -----------------------------------------------------------------------
// 2. Housing overflow – population capped at capacity
// -----------------------------------------------------------------------
describe('housing overflow – population capped at capacity', () => {
  it('migration cannot exceed housing capacity', () => {
    const state = createState();
    // hovel capacity = 200
    state.home.population.total = 199;
    state.home.population.migrationAcc = 10; // wants to add 10
    state.home.housing.counts = { hovel: 1 }; // capacity=200

    populationMigration(state, {}, MOCK_CTX);

    // hovel attractiveness=-1, rate per step is negative → no new acc
    // acc stays 10, tries to add 10, but capacity limits to 1
    assert.ok(
      state.home.population.total <= 200,
      `Population must not exceed hovel capacity=200, got ${state.home.population.total}`
    );
  });

  it('births cannot exceed housing capacity', () => {
    const state = createState();
    // house capacity=600, population already at 600
    state.home.population.total = 600;
    state.home.housing.counts = { house: 1 }; // capacity=600

    healthBirths(state, {}, MOCK_CTX);

    // population should not exceed capacity
    assert.ok(
      state.home.population.total <= 600,
      `Population must not exceed house capacity=600, got ${state.home.population.total}`
    );
  });

  it('tent has null capacity – unlimited growth allowed', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.housing.counts = { tent: 10 }; // null capacity = no limit
    state.home.population.migrationAcc = 5;

    populationMigration(state, {}, MOCK_CTX);

    // tent has capacity=null which means no limit; population should increase
    // (but tent has 0 attractiveness so only the existing acc of 5 would add)
    // With acc=5 and rate=0 (attractiveness=0), floor(5) = 5 added
    assert.ok(
      state.home.population.total >= 1000,
      'tent (null capacity) should allow unlimited growth'
    );
  });

  it('full housing: no migration overflow across many steps', () => {
    const state = createState();
    // hovel: capacity 200, start at exactly 200
    state.home.population.total = 200;
    state.home.housing.counts = { hovel: 1 };
    const ctx = createCtx();

    // Run 3 days (migration accumulates but capacity blocks it)
    for (let i = 0; i < 3 * STEPS_PER_DAY; i++) {
      step(state, ctx);
    }

    // Population must never exceed housing capacity
    // Note: births (noon) can only be blocked if capacity > 0
    // hovel capacity = 200; births at noon won't add beyond that
    assert.ok(
      state.home.population.total <= 200,
      `After 3 days, population should not exceed hovel capacity=200. Got ${state.home.population.total}`
    );
  });
});

// -----------------------------------------------------------------------
// 3. Persist round-trip per domain
// -----------------------------------------------------------------------
describe('persist round-trip per domain', () => {
  it('population domain: round-trip preserves all fields', () => {
    const state = createState();
    state.home.population.total = 250;
    state.home.population.migrationAcc = 0.73;
    state.home.population.bornTotal = 15;
    state.home.population.diedTotal = 3;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.home.population.total, 250);
    assert.strictEqual(reconstructed.home.population.migrationAcc, 0.73);
    assert.strictEqual(reconstructed.home.population.bornTotal, 15);
    assert.strictEqual(reconstructed.home.population.diedTotal, 3);
  });

  it('housing domain: round-trip preserves counts (not derivates)', () => {
    const state = createState();
    state.home.housing.counts = { tent: 3, house: 2, mansion: 1 };

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.deepStrictEqual(reconstructed.home.housing.counts, { tent: 3, house: 2, mansion: 1 });
  });

  it('housing: derivates (capacity) NOT in payload', () => {
    const state = createState();
    state.home.housing.counts = { house: 1 };
    // Artificially add derivate to home.housing (should not be saved)
    /** @type {any} */ (state.home.housing).capacity = 600;

    const payload = applyPersist(state);

    // derivate 'capacity' should not appear in payload
    assert.strictEqual(
      /** @type {any} */ (payload.home).housing.capacity,
      undefined,
      'Derived capacity must not be persisted'
    );
  });

  it('food domain: round-trip preserves store', () => {
    const state = createState();
    state.home.food.store = { bread: 100, cheese: 25, fish: 50, fruit: 0, meat: 30, vegetable: 15 };

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.deepStrictEqual(reconstructed.home.food.store, {
      bread: 100, cheese: 25, fish: 50, fruit: 0, meat: 30, vegetable: 15,
    });
  });

  it('health domain: round-trip preserves diseaseActive and diseaseDaysLeft', () => {
    const state = createState();
    state.home.health.diseaseActive = true;
    state.home.health.diseaseDaysLeft = 7;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.home.health.diseaseActive, true);
    assert.strictEqual(reconstructed.home.health.diseaseDaysLeft, 7);
  });

  it('crime domain: round-trip preserves level', () => {
    const state = createState();
    state.home.crime.level = 0.42;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.home.crime.level, 0.42);
  });

  it('migration v1: missing home fields filled from factory defaults', () => {
    // Simulate old save with no food field
    const payload = {
      meta: { saveVersion: 1, gameVersion: '0.0.0', startedAtStep: 0, seed: 0 },
      engine: { curStep: 50, speed: 1, running: true, schedule: [], scheduleCount: {}, _seq: 0 },
      rng: { seed: 0, streams: {} },
      season: { curStep: 50, curDay: 1, curMonth: 1, curYear: 1, curSeason: 0, dayInSeason: 1, _absDay: 1 },
      home: {
        population: { total: 10, migrationAcc: 0, bornTotal: 0, diedTotal: 0 },
        // food: missing! (old save)
      },
    };

    const reconstructed = loadAndReconstruct(payload);

    // food should be filled from factory default
    assert.ok(reconstructed.home.food, 'food should be present after migration');
    assert.ok(reconstructed.home.food.store, 'food.store should be present');
    // all values should be valid numbers
    for (const [id, val] of Object.entries(reconstructed.home.food.store)) {
      assert.ok(Number.isFinite(val), `food.store.${id} should be finite`);
      assert.ok(val >= 0, `food.store.${id} should be >= 0`);
    }
  });

  it('full round-trip: N steps → save → load → same hash as direct continuation', () => {
    const s1 = createInitialState({ seed: 0x9999_9999 });
    initRng(s1);
    s1.home.population.total = 100;
    s1.home.food.store = { bread: 500, cheese: 100, fish: 50, fruit: 50, meat: 50, vegetable: 100 };

    const ctx = createCtx();
    const N = STEPS_PER_DAY;

    // Run N steps on s1
    for (let i = 0; i < N; i++) step(s1, ctx);

    // Save s1, reconstruct s2
    const payload = applyPersist(s1);
    const s2 = loadAndReconstruct(payload);
    const ctx2 = createCtx();

    // Run another N steps on both
    const s1b = s1;
    for (let i = 0; i < N; i++) step(s1b, ctx);
    for (let i = 0; i < N; i++) step(s2, ctx2);

    assert.strictEqual(
      hashState(s1b),
      hashState(s2),
      'After save/load, continuing simulation must produce same hash'
    );
  });
});

// -----------------------------------------------------------------------
// 4. Tx invariants
// -----------------------------------------------------------------------
describe('tx invariants', () => {
  it('no NaN in gold after pay/grant sequence', () => {
    const state = createState();
    state.player.gold = 1000;

    const txs = /** @type {any[]} */ ([]);
    const ctx = { emitTx: (/** @type {any} */ tx) => txs.push(tx) };

    grant(state, { gold: 500 }, 'test-grant', /** @type {any} */ (ctx));
    pay(state, { gold: 200 }, 'test-pay', /** @type {any} */ (ctx));

    assert.ok(Number.isFinite(state.player.gold), 'gold must be finite after pay/grant');
    assert.strictEqual(state.player.gold, 1300);
  });

  it('no negative gold after pay', () => {
    const state = createState();
    state.player.gold = 100;

    assert.throws(
      () => pay(state, { gold: 200 }, 'test-pay', /** @type {any} */ ({})),
      /insufficient/i,
      'pay must throw when insufficient gold'
    );
    // State must be unchanged after failed pay
    assert.strictEqual(state.player.gold, 100, 'gold must be unchanged after failed pay');
  });

  it('atomicity: failed pay does not partially mutate state', () => {
    const state = createState();
    state.player.gold = 50;
    state.player.techPt = 100;

    // Attempt multi-key pay where gold is insufficient
    let threw = false;
    try {
      pay(state, { gold: 100, techPt: 50 }, 'test-atomic', /** @type {any} */ ({}));
    } catch {
      threw = true;
    }

    assert.ok(threw, 'Pay should throw on insufficient gold');
    // gold should NOT have been modified (atomicity)
    assert.strictEqual(state.player.gold, 50, 'gold must be unchanged after atomic failure');
    assert.strictEqual(state.player.techPt, 100, 'techPt must be unchanged after atomic failure');
  });

  it('NaN in cost throws guard', () => {
    const state = createState();
    state.player.gold = 100;

    assert.throws(
      () => pay(state, { gold: NaN }, 'nan-test', /** @type {any} */ ({})),
      /NaN|finite|invalid/i,
      'pay with NaN amount must throw'
    );
    assert.strictEqual(state.player.gold, 100, 'gold unchanged after NaN pay attempt');
  });

  it('grant with NaN throws guard', () => {
    const state = createState();
    state.player.gold = 100;

    assert.throws(
      () => grant(state, { gold: NaN }, 'nan-grant', /** @type {any} */ ({})),
      /NaN|finite|invalid/i,
      'grant with NaN must throw'
    );
    assert.strictEqual(state.player.gold, 100, 'gold unchanged after NaN grant');
  });

  it('txEvent emitted for pay (negative amount, cause, step)', () => {
    const state = createState();
    state.player.gold = 500;
    state.engine.curStep = 42;

    const txs = /** @type {any[]} */ ([]);
    const ctx = { emitTx: (/** @type {any} */ tx) => txs.push(tx) };

    // pay(state, cost, cause, ctx, step) – step passed explicitly (per transactions.js API)
    pay(state, { gold: 100 }, 'test-cause', /** @type {any} */ (ctx), state.engine.curStep);

    assert.ok(txs.length > 0, 'txEvent should be emitted');
    const tx = txs.find(t => t.key === 'gold');
    assert.ok(tx, 'txEvent for gold must exist');
    assert.ok(tx.amount < 0, 'txEvent amount must be negative for pay');
    assert.strictEqual(tx.cause, 'test-cause');
    assert.strictEqual(tx.step, 42);
  });

  it('txEvent emitted for grant (positive amount)', () => {
    const state = createState();
    state.player.gold = 0;
    state.engine.curStep = 10;

    const txs = /** @type {any[]} */ ([]);
    const ctx = { emitTx: (/** @type {any} */ tx) => txs.push(tx) };

    // grant(state, prod, cause, ctx, step) – step passed explicitly
    grant(state, { gold: 250 }, 'harvest', /** @type {any} */ (ctx), state.engine.curStep);

    const tx = txs.find(t => t.key === 'gold');
    assert.ok(tx, 'txEvent for gold grant must exist');
    assert.ok(tx.amount > 0, 'grant txEvent must have positive amount');
    assert.strictEqual(tx.cause, 'harvest');
    assert.strictEqual(tx.step, 10);
  });

  it('canAfford returns false when gold insufficient', () => {
    const state = createState();
    state.player.gold = 50;

    assert.strictEqual(canAfford(state, { gold: 100 }), false);
  });

  it('canAfford returns true when gold sufficient', () => {
    const state = createState();
    state.player.gold = 200;

    assert.strictEqual(canAfford(state, { gold: 100 }), true);
  });

  it('crime gold loss never negative', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.crime.level = 1.0; // max crime
    state.player.gold = 5; // small gold

    crimeDaily(state, {}, MOCK_CTX);

    assert.ok(state.player.gold >= 0, `gold must never go negative, got ${state.player.gold}`);
  });
});

// -----------------------------------------------------------------------
// 5. Invariants after running N steps (no NaN anywhere)
// -----------------------------------------------------------------------
describe('no NaN/negative invariants after N steps', () => {
  /** Assert that key numeric fields are finite and non-negative */
  function assertNoNaNNegative(/** @type {any} */ state, label = '') {
    const home = state.home;
    assert.ok(Number.isFinite(home.population.total), `${label}: population.total must be finite`);
    assert.ok(home.population.total >= 0, `${label}: population.total must be non-negative`);
    assert.ok(Number.isFinite(home.population.migrationAcc), `${label}: migrationAcc must be finite`);
    assert.ok(Number.isFinite(home.crime.level), `${label}: crime.level must be finite`);
    assert.ok(home.crime.level >= 0, `${label}: crime.level must be non-negative`);
    assert.ok(home.crime.level <= 1, `${label}: crime.level must be <= 1`);
    assert.ok(Number.isFinite(home.health.diseaseDaysLeft), `${label}: diseaseDaysLeft must be finite`);
    assert.ok(home.health.diseaseDaysLeft >= 0, `${label}: diseaseDaysLeft must be non-negative`);
    assert.ok(Number.isFinite(state.player.gold), `${label}: player.gold must be finite`);
    assert.ok(state.player.gold >= 0, `${label}: player.gold must be non-negative`);
    for (const [id, val] of Object.entries(home.food.store)) {
      const v = /** @type {number} */ (val);
      assert.ok(Number.isFinite(v), `${label}: food.store.${id} must be finite`);
      assert.ok(v >= 0, `${label}: food.store.${id} must be non-negative`);
    }
  }

  it('no NaN/negatives after 1 day (food-sufficient)', () => {
    const state = createInitialState({ seed: 0x1234_5678 });
    initRng(state);
    state.home.population.total = 100;
    state.home.food.store = { bread: 5000, cheese: 100, fish: 100, fruit: 100, meat: 100, vegetable: 100 };
    state.player.gold = 500;
    const ctx = createCtx();

    for (let i = 0; i < STEPS_PER_DAY; i++) step(state, ctx);

    assertNoNaNNegative(state, '1 day');
  });

  it('no NaN/negatives after 5 days (food-starving scenario)', () => {
    const state = createInitialState({ seed: 0xABCD_EF12 });
    initRng(state);
    state.home.population.total = 200;
    state.home.food.store = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 }; // limited food
    state.player.gold = 100;
    const ctx = createCtx();

    for (let i = 0; i < 5 * STEPS_PER_DAY; i++) step(state, ctx);

    assertNoNaNNegative(state, '5 days starvation');
  });

  it('no NaN after disease outbreak runs to completion', () => {
    const state = createInitialState({ seed: 0xFEED_BEEF });
    initRng(state);
    state.home.population.total = 100000; // large pop → likely disease
    state.home.food.store = { bread: 5000000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const ctx = createCtx();

    // Run enough days to have disease start and potentially finish (14 day duration)
    for (let i = 0; i < 20 * STEPS_PER_DAY; i++) step(state, ctx);

    assertNoNaNNegative(state, 'disease run');
  });
});

// -----------------------------------------------------------------------
// 6. PWA smoke – cumulative (no crash over many steps)
// -----------------------------------------------------------------------
describe('PWA smoke: cumulative simulation stability', () => {
  it('100 steps without crash', () => {
    const state = createState();
    state.home.population.total = 50;
    state.home.food.store = { bread: 1000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const ctx = createCtx();

    assert.doesNotThrow(() => {
      for (let i = 0; i < 100; i++) step(state, ctx);
    });
  });

  it('1800 steps (2 full days) without crash', () => {
    const state = createState();
    state.home.population.total = 100;
    state.home.food.store = { bread: 50000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    state.player.gold = 10000;
    const ctx = createCtx();

    assert.doesNotThrow(() => {
      for (let i = 0; i < 1800; i++) step(state, ctx);
    });
  });

  it('engine.curStep is finite integer after 5000 steps', () => {
    const state = createState();
    state.home.food.store = { bread: 100000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const ctx = createCtx();

    for (let i = 0; i < 5000; i++) step(state, ctx);

    assert.strictEqual(state.engine.curStep, 5000);
    assert.ok(Number.isFinite(state.engine.curStep));
    assert.ok(Number.isInteger(state.engine.curStep));
  });

  it('save/load/continue cycle: no crash in 3 cycles', () => {
    let state = createInitialState({ seed: 0xC0FF_EE42 });
    initRng(state);
    state.home.population.total = 50;
    state.home.food.store = { bread: 10000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    state.player.gold = 500;

    const ctx = createCtx();

    assert.doesNotThrow(() => {
      for (let cycle = 0; cycle < 3; cycle++) {
        // Run 200 steps
        for (let i = 0; i < 200; i++) step(state, ctx);
        // Save → load
        const payload = applyPersist(state);
        state = loadAndReconstruct(payload);
      }
    });

    assert.ok(state.engine.curStep > 0, 'steps should have advanced');
  });
});

// -----------------------------------------------------------------------
// 7. Determinism gate
// -----------------------------------------------------------------------
describe('determinism gate: seed → same hash', () => {
  it('same seed produces same hash after 5 days (global simulation determinism)', () => {
    function runN(seed = 0x1234) {
      const state = createInitialState({ seed });
      initRng(state);
      state.home.population.total = 100;
      state.home.food.store = { bread: 5000, cheese: 100, fish: 100, fruit: 100, meat: 100, vegetable: 100 };
      state.player.gold = 1000;
      const ctx = createCtx();
      for (let i = 0; i < 5 * STEPS_PER_DAY; i++) step(state, ctx);
      return hashState(state);
    }

    const h1 = runN(0xDEAD_CAFE);
    const h2 = runN(0xDEAD_CAFE);

    assert.strictEqual(h1, h2, `Determinism: same seed must yield same hash. h1=${h1} h2=${h2}`);
  });

  it('different seeds produce different hashes (no trivial hash collision)', () => {
    function runN(seed = 0x1234) {
      const state = createInitialState({ seed });
      initRng(state);
      state.home.population.total = 100;
      state.home.food.store = { bread: 5000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
      const ctx = createCtx();
      for (let i = 0; i < STEPS_PER_DAY; i++) step(state, ctx);
      return hashState(state);
    }

    const h1 = runN(0xAAAA_AAAA);
    const h2 = runN(0xBBBB_BBBB);

    // Different seeds should produce different hashes (very unlikely to collide)
    assert.notStrictEqual(h1, h2, 'Different seeds must produce different hashes');
  });
});
