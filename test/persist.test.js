/**
 * persist.test.js – iter-007 M2a-1 persistence pipeline tests.
 * Tests: persistSchema (applyPersist), migrations (migrate), load (loadAndReconstruct).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { applyPersist, PERSIST_SCHEMA } from '../src/save/persistSchema.js';
import { migrate, MIGRATIONS } from '../src/save/migrations.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { createInitialState } from '../src/core/state/createInitialState.js';

// -----------------------------------------------------------------------
// 1. PERSIST_SCHEMA
// -----------------------------------------------------------------------
describe('PERSIST_SCHEMA structure', () => {
  it('has player fields', () => {
    assert.ok(Array.isArray(PERSIST_SCHEMA.player));
    assert.ok(PERSIST_SCHEMA.player.includes('gold'));
    assert.ok(PERSIST_SCHEMA.player.includes('techPt'));
    assert.ok(PERSIST_SCHEMA.player.includes('inventory'));
  });

  it('has home sub-domain fields', () => {
    assert.ok(Array.isArray(PERSIST_SCHEMA.population));
    assert.ok(Array.isArray(PERSIST_SCHEMA.housing));
    assert.ok(Array.isArray(PERSIST_SCHEMA.food));
    assert.ok(Array.isArray(PERSIST_SCHEMA.health));
    assert.ok(Array.isArray(PERSIST_SCHEMA.crime));
  });
});

// -----------------------------------------------------------------------
// 2. applyPersist
// -----------------------------------------------------------------------
describe('applyPersist', () => {
  it('extracts player.gold correctly', () => {
    const state = createInitialState();
    state.player.gold = 500;
    const payload = applyPersist(state);
    assert.strictEqual(payload.player.gold, 500);
  });

  it('extracts home.population correctly', () => {
    const state = createInitialState();
    state.home.population.total = 42;
    const payload = applyPersist(state);
    assert.strictEqual(payload.home.population.total, 42);
  });

  it('preserves engine.curStep', () => {
    const state = createInitialState();
    state.engine.curStep = 12345;
    const payload = applyPersist(state);
    assert.strictEqual(payload.engine.curStep, 12345);
  });

  it('omits engine.frameBudget', () => {
    const state = createInitialState();
    const payload = applyPersist(state);
    assert.strictEqual(payload.engine.frameBudget, undefined, 'frameBudget should not be persisted');
  });

  it('preserves meta block', () => {
    const state = createInitialState();
    const payload = applyPersist(state);
    assert.ok(payload.meta, 'meta should be present');
    assert.ok(typeof payload.meta.saveVersion === 'number', 'meta.saveVersion should be a number');
  });

  it('preserves home.food.store', () => {
    const state = createInitialState();
    state.home.food.store.bread = 20;
    const payload = applyPersist(state);
    assert.strictEqual(payload.home.food.store.bread, 20);
  });
});

// -----------------------------------------------------------------------
// 3. migrations
// -----------------------------------------------------------------------
describe('migrate', () => {
  it('MIGRATIONS has v1→v2 and v2→v3 migrations (iter-010 M4a + iter-011 M4b)', () => {
    assert.ok(Array.isArray(MIGRATIONS));
    // M4a added v1→v2, M4b added v2→v3
    assert.ok(MIGRATIONS.length >= 2, `expected >= 2 migrations, got ${MIGRATIONS.length}`);
    assert.strictEqual(MIGRATIONS[0].from, 1);
    assert.strictEqual(MIGRATIONS[0].to, 2);
    assert.strictEqual(MIGRATIONS[1].from, 2);
    assert.strictEqual(MIGRATIONS[1].to, 3);
  });

  it('migrate v1→v3 (chain): adds taxRate, totWarriors, council, marketState, caravan to payload', () => {
    const payload = { meta: { saveVersion: 1 }, engine: { curStep: 0 }, player: { gold: 100 } };
    const result = /** @type {any} */ (migrate(payload));
    assert.strictEqual(result.player.taxRate, 1);
    assert.strictEqual(result.player.totWarriors, 0);
    assert.strictEqual(result.player.totArchers, 0);
    assert.strictEqual(result.player.diseaseFromColdChance, 0);
    assert.ok(result.council, 'council should be added by migration');
    // v2→v3 also runs: marketState and caravan should be present
    assert.ok(result.world && result.world.marketState !== undefined, 'world.marketState should be added');
    assert.ok(result.world && result.world.caravan !== undefined, 'world.caravan should be added');
    assert.strictEqual(result.meta.saveVersion, 3);
  });

  it('migrate handles missing meta.saveVersion gracefully (treated as v1, migrated to v3)', () => {
    const payload = { engine: { curStep: 0 }, player: { gold: 50 } };
    const result = /** @type {any} */ (migrate(payload));
    // Missing saveVersion defaults to 1, so all migrations run
    assert.ok(result.council, 'council should be added when missing saveVersion');
    assert.strictEqual(result.player.taxRate, 1);
  });

  it('migrate v2→v3: adds world.marketState and world.caravan', () => {
    const payload = { meta: { saveVersion: 2 }, world: { forest: {} } };
    const result = /** @type {any} */ (migrate(payload));
    assert.ok(result.world.marketState !== undefined, 'world.marketState should be added');
    assert.deepEqual(result.world.marketState, {}, 'marketState starts empty');
    assert.ok(result.world.caravan !== undefined, 'world.caravan should be added');
    assert.strictEqual(result.world.caravan.capacity, 10000);
    assert.strictEqual(result.world.caravan.sentOut, 0);
    assert.strictEqual(result.meta.saveVersion, 3);
  });

  it('migrate v2→v3: existing world.marketState is preserved', () => {
    const existing = { wood: { available: 5000, max: 10000, baseline: 5000 } };
    const payload = { meta: { saveVersion: 2 }, world: { marketState: existing } };
    const result = /** @type {any} */ (migrate(payload));
    assert.deepEqual(result.world.marketState, existing, 'existing marketState preserved');
  });
});

// -----------------------------------------------------------------------
// 4. loadAndReconstruct
// -----------------------------------------------------------------------
describe('loadAndReconstruct', () => {
  it('returns a valid GameState from a minimal payload', () => {
    const state = createInitialState();
    state.engine.curStep = 999;
    state.player.gold = 123;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.engine.curStep, 999);
    assert.strictEqual(reconstructed.player.gold, 123);
  });

  it('fills missing fields with defaults', () => {
    // A minimal payload missing home
    const minimal = {
      meta: { saveVersion: 1, gameVersion: '0.0.0', startedAtStep: 0, seed: 0 },
      engine: { curStep: 5, speed: 1, running: true, schedule: [], scheduleCount: {}, _seq: 0 },
      rng: { seed: 0, streams: {} },
      season: { curStep: 5, curDay: 1, curMonth: 1, curYear: 1, curSeason: 0, dayInSeason: 1, _absDay: 1 },
    };
    const reconstructed = loadAndReconstruct(minimal);
    // Should have a home state from defaults
    assert.ok(reconstructed.home, 'home should be present');
    assert.ok(reconstructed.player, 'player should be present');
  });

  it('preserves food store from payload', () => {
    const state = createInitialState();
    state.home.food.store.bread = 50;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.home.food.store.bread, 50);
  });

  it('round-trip: save then reconstruct preserves gold', () => {
    const state = createInitialState();
    state.player.gold = 888;
    state.player.techPt = 42;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.player.gold, 888);
    assert.strictEqual(reconstructed.player.techPt, 42);
  });
});
