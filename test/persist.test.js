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
  it('MIGRATIONS is an empty array (no migrations yet at v1)', () => {
    assert.ok(Array.isArray(MIGRATIONS));
    // In M2a-1, v1 is baseline – no migrations needed
    assert.strictEqual(MIGRATIONS.length, 0);
  });

  it('migrate returns payload unchanged at v1', () => {
    const payload = { meta: { saveVersion: 1 }, engine: { curStep: 0 } };
    const result = migrate(payload);
    assert.deepEqual(result, payload);
  });

  it('migrate handles missing meta.saveVersion gracefully', () => {
    const payload = { engine: { curStep: 0 } };
    const result = migrate(payload);
    assert.deepEqual(result, payload);
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
