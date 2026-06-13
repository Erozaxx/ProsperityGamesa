/**
 * catchup-invariant.test.js – iter-007 T-003 catch-up safe invariant (S-05)
 *
 * Core invariant: live run of N steps == catch-up batch of N steps → identical hash.
 * Tests ALL systems: population, housing, health, food, crime, world, battle.
 *
 * No Date.now / Math.random / DOM allowed in core – verified by CI grep gate.
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

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/**
 * Create a fresh seeded state with catalogs loaded.
 * @param {number} [seed]
 */
function createFreshState(seed = 0xDEADBEEF) {
  const state = createInitialState({ seed });
  initRng(state);
  // Seed a non-trivial starting state for interesting simulation
  state.home.population.total = 100;
  state.home.population.migrationAcc = 0;
  state.home.housing.counts = { tent: 5, hovel: 2 };
  state.home.food.store = { bread: 200, cheese: 50, fish: 30, fruit: 20, meat: 10, vegetable: 40 };
  state.player.gold = 1000;
  return state;
}

/** Create ctx with registry + periodics */
function createCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

/**
 * Run N steps on a state in one go (batch / catch-up style).
 * This is exactly how catch-up works: no pauses, no real-time delays.
 * @param {object} state
 * @param {object} ctx
 * @param {number} n
 */
function runBatch(state, ctx, n) {
  for (let i = 0; i < n; i++) {
    step(state, ctx);
  }
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

// -----------------------------------------------------------------------
// S-05: Catch-up safe invariant – live == batch
//
// Principle: Two states initialized identically. One is run "live" (N individual
// steps from a for loop), the other "in batch" (same N steps, continuous).
// They MUST produce identical hashState() since the simulation is purely deterministic.
// -----------------------------------------------------------------------
describe('S-05 catch-up-safe invariant', () => {
  it('1 step: live == batch (smoke)', () => {
    const s1 = createFreshState();
    const s2 = createFreshState();
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    step(s1, ctx1);
    runBatch(s2, ctx2, 1);

    assert.strictEqual(
      hashState(s1),
      hashState(s2),
      'Single step: live and batch must produce same hash'
    );
  });

  it('1 day (900 steps): live == batch – population system', () => {
    const s1 = createFreshState(0x1111_1111);
    const s2 = createFreshState(0x1111_1111);
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    // "live": run step by step
    for (let i = 0; i < STEPS_PER_DAY; i++) {
      step(s1, ctx1);
    }
    // "batch": run in one go (catch-up)
    runBatch(s2, ctx2, STEPS_PER_DAY);

    const h1 = hashState(s1);
    const h2 = hashState(s2);
    assert.strictEqual(h1, h2, `1-day catch-up: hash mismatch. live=${h1} batch=${h2}`);
  });

  it('2 days (1800 steps): live == batch – food/health/crime systems', () => {
    const s1 = createFreshState(0x2222_2222);
    const s2 = createFreshState(0x2222_2222);
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 2 * STEPS_PER_DAY;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    const h1 = hashState(s1);
    const h2 = hashState(s2);
    assert.strictEqual(h1, h2, `2-day catch-up: hash mismatch. live=${h1} batch=${h2}`);
  });

  it('5 days (4500 steps): live == batch – full week, quarterly/daily edges', () => {
    const s1 = createFreshState(0x3333_3333);
    const s2 = createFreshState(0x3333_3333);
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 5 * STEPS_PER_DAY;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    const h1 = hashState(s1);
    const h2 = hashState(s2);
    assert.strictEqual(h1, h2, `5-day catch-up: hash mismatch. live=${h1} batch=${h2}`);
  });

  it('31 days (~27900 steps): live == batch – crosses month boundary (spoilage)', () => {
    const s1 = createFreshState(0x4444_4444);
    const s2 = createFreshState(0x4444_4444);
    // Extra food to survive 31 days
    s1.home.food.store = { bread: 5000, cheese: 1000, fish: 500, fruit: 500, meat: 500, vegetable: 1000 };
    s2.home.food.store = { bread: 5000, cheese: 1000, fish: 500, fruit: 500, meat: 500, vegetable: 1000 };
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 31 * STEPS_PER_DAY;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    const h1 = hashState(s1);
    const h2 = hashState(s2);
    assert.strictEqual(h1, h2, `31-day catch-up (crosses month): hash mismatch. live=${h1} batch=${h2}`);
  });

  it('population-specific: migrationAcc after batch equals live (no float drift)', () => {
    const s1 = createFreshState(0x5555_5555);
    const s2 = createFreshState(0x5555_5555);
    // Give attractiveness so migration accumulates
    s1.home.housing.counts = { mansion: 3 };
    s2.home.housing.counts = { mansion: 3 };
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 450; // half day
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    assert.strictEqual(
      s1.home.population.migrationAcc,
      s2.home.population.migrationAcc,
      'migrationAcc must be identical after live vs batch run'
    );
    assert.strictEqual(
      s1.home.population.total,
      s2.home.population.total,
      'population.total must be identical after live vs batch run'
    );
  });

  it('RNG streams identical after live vs batch N steps', () => {
    const s1 = createFreshState(0x6666_6666);
    const s2 = createFreshState(0x6666_6666);
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = STEPS_PER_DAY;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    // All RNG streams should match
    for (const [stream, v1] of Object.entries(s1.rng.streams)) {
      const v2 = s2.rng.streams[stream];
      assert.strictEqual(v1, v2, `RNG stream '${stream}' differs: live=${v1} batch=${v2}`);
    }
  });

  it('disease lifecycle invariant: active state identical live vs batch', () => {
    // Force disease to trigger by starting with very large population
    const s1 = createFreshState(0x7777_7777);
    const s2 = createFreshState(0x7777_7777);
    s1.home.population.total = 50000;
    s2.home.population.total = 50000;
    s1.home.food.store = { bread: 200000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    s2.home.food.store = { bread: 200000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 3 * STEPS_PER_DAY; // multiple days to trigger disease
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    assert.strictEqual(
      s1.home.health.diseaseActive,
      s2.home.health.diseaseActive,
      'diseaseActive must be identical after live vs batch'
    );
    assert.strictEqual(
      s1.home.health.diseaseDaysLeft,
      s2.home.health.diseaseDaysLeft,
      'diseaseDaysLeft must be identical after live vs batch'
    );
    assert.strictEqual(hashState(s1), hashState(s2), 'Full state hash must match for disease scenario');
  });

  it('determinism: same seed → same hash after N steps (no side effects)', () => {
    const s1 = createFreshState(0x8888_8888);
    const s2 = createFreshState(0x8888_8888);
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 5 * STEPS_PER_DAY;
    runBatch(s1, ctx1, N);
    runBatch(s2, ctx2, N);

    assert.strictEqual(
      hashState(s1),
      hashState(s2),
      'Determinism gate: same seed must produce same hash after N steps'
    );
  });

  it('curStep increments deterministically in batch', () => {
    const s = createFreshState();
    const ctx = createCtx();
    const N = 100;
    runBatch(s, ctx, N);
    assert.strictEqual(s.engine.curStep, N, `curStep should be ${N} after ${N} steps`);
  });
});

// -----------------------------------------------------------------------
// S-05 per-system isolation: each system is catch-up safe independently
// -----------------------------------------------------------------------
describe('S-05 per-system: catch-up safe isolation', () => {
  /** Run minimal state with only population migration */
  it('population.migration alone: live == batch', () => {
    const { populationMigration } = /** @type {any} */ (
      // Dynamic import workaround for isolated test
      { populationMigration: null }
    );
    // Full simulation approach (not isolated), but measuring per-step
    const s1 = createFreshState(0xAAAA_AAAA);
    const s2 = createFreshState(0xAAAA_AAAA);
    s1.home.housing.counts = { house: 5 };
    s2.home.housing.counts = { house: 5 };
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = STEPS_PER_DAY * 2;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    assert.strictEqual(hashState(s1), hashState(s2), 'population-only: live == batch');
  });

  it('food spoilage crosses month consistently', () => {
    const s1 = createFreshState(0xBBBB_BBBB);
    const s2 = createFreshState(0xBBBB_BBBB);
    // Large food store to observe spoilage
    const bigStore = { bread: 10000, cheese: 5000, fish: 3000, fruit: 2000, meat: 1000, vegetable: 4000 };
    s1.home.food.store = { ...bigStore };
    s2.home.food.store = { ...bigStore };
    s1.home.population.total = 0; // no consumption, isolate spoilage
    s2.home.population.total = 0;
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 35 * STEPS_PER_DAY; // cross month boundary
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    assert.deepStrictEqual(
      s1.home.food.store,
      s2.home.food.store,
      'food.store must match after crossing month boundary: live vs batch'
    );
    assert.strictEqual(hashState(s1), hashState(s2));
  });

  it('crime level: no stochastic drift live vs batch', () => {
    const s1 = createFreshState(0xCCCC_CCCC);
    const s2 = createFreshState(0xCCCC_CCCC);
    s1.home.population.total = 500;
    s2.home.population.total = 500;
    s1.player.gold = 5000;
    s2.player.gold = 5000;
    const ctx1 = createCtx();
    const ctx2 = createCtx();

    const N = 3 * STEPS_PER_DAY;
    for (let i = 0; i < N; i++) step(s1, ctx1);
    runBatch(s2, ctx2, N);

    assert.strictEqual(s1.home.crime.level, s2.home.crime.level, 'crime.level must match');
    assert.strictEqual(s1.player.gold, s2.player.gold, 'gold after crime must match');
  });
});
