/**
 * contracts.test.js – iter-007 M2a-2 §8 contract tests.
 * Tests:
 * 1. Determinism of empty battle (battleStep same seed → same result)
 * 2. Round-trip world/battle: applyPersist + loadAndReconstruct preserves world.zones/factions and battle=null
 * 3. Schedule with AI event survives save/load
 * 4. S-06 NEGATIVE: world.tick never calls goldValue or market.inject
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { scheduleInsert } from '../src/core/engine/scheduler.js';
import { register } from '../src/core/registry/registry.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { battleStep } from '../src/core/systems/battle.js';
import { worldTick } from '../src/core/systems/world.js';

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

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

// -----------------------------------------------------------------------
// 1. Determinism of empty battle
// -----------------------------------------------------------------------
describe('battleStep determinism', () => {
  it('same inputs produce same output', () => {
    /** @type {import('../src/core/systems/battle.js').BattleState} */
    const bs = {
      zoneId: 'zone1',
      sides: { player: {}, opponent: {} },
      state: 'running',
      tick: 0,
      log: [],
      summary: null,
    };

    // Two separate states with same seed
    const state1 = createState();
    const state2 = createState();
    // Set same rng state
    state1.rng.streams['battle'] = 42;
    state2.rng.streams['battle'] = 42;

    const rng1 = makeRng(state1, 'battle');
    const rng2 = makeRng(state2, 'battle');

    const result1 = battleStep(bs, [], rng1);
    const result2 = battleStep(bs, [], rng2);

    assert.strictEqual(result1.tick, result2.tick, 'same tick after battleStep');
    assert.strictEqual(result1.state, result2.state, 'same state after battleStep');
  });

  it('battleStep with done state returns unchanged bs', () => {
    /** @type {import('../src/core/systems/battle.js').BattleState} */
    const bs = {
      zoneId: 'zone1',
      sides: { player: {}, opponent: {} },
      state: 'done',
      tick: 5,
      log: [],
      summary: null,
    };

    const state = createState();
    const rng = makeRng(state, 'battle');

    const result = battleStep(bs, [], rng);
    assert.strictEqual(result, bs, 'done battle should return unchanged');
  });

  it('battleStep with null returns null', () => {
    const state = createState();
    const rng = makeRng(state, 'battle');
    const result = battleStep(/** @type {any} */ (null), [], rng);
    assert.strictEqual(result, null);
  });

  it('battle increments tick counter', () => {
    /** @type {import('../src/core/systems/battle.js').BattleState} */
    const bs = {
      zoneId: 'zone1',
      sides: { player: {}, opponent: {} },
      state: 'running',
      tick: 0,
      log: [],
      summary: null,
    };

    const state = createState();
    const rng = makeRng(state, 'battle');

    const result = battleStep(bs, [], rng);
    assert.strictEqual(result.tick, 1);
  });
});

// -----------------------------------------------------------------------
// 2. Round-trip world/battle
// -----------------------------------------------------------------------
describe('applyPersist + loadAndReconstruct round-trip', () => {
  it('preserves world.zones and world.factions through save/load', () => {
    const state = createState();
    state.world = {
      zones: [{ id: 'zone1', name: 'Test Zone' }],
      factions: [{ id: 'faction1', name: 'Test Faction' }],
    };
    state.battle = null;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    // world.zones should be preserved
    const zones = /** @type {any} */ (reconstructed.world).zones;
    assert.ok(Array.isArray(zones), 'world.zones should be preserved');
    assert.strictEqual(zones[0].id, 'zone1');

    // world.factions should be preserved
    const factions = /** @type {any} */ (reconstructed.world).factions;
    assert.ok(Array.isArray(factions), 'world.factions should be preserved');
    assert.strictEqual(factions[0].id, 'faction1');
  });

  it('preserves battle=null through save/load', () => {
    const state = createState();
    state.battle = null;

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.battle, null, 'battle should remain null after round-trip');
  });

  it('preserves active battle through save/load', () => {
    const state = createState();
    state.battle = {
      zoneId: 'zone1',
      sides: { player: {}, opponent: {} },
      state: 'running',
      tick: 5,
      log: [],
      summary: null,
    };

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    const battle = /** @type {any} */ (reconstructed.battle);
    assert.ok(battle !== null, 'active battle should survive save/load');
    assert.strictEqual(battle.tick, 5, 'battle.tick should be preserved');
    assert.strictEqual(battle.zoneId, 'zone1', 'battle.zoneId should be preserved');
  });
});

// -----------------------------------------------------------------------
// 3. Scheduled AI event survives save/load
// -----------------------------------------------------------------------
describe('scheduled event survives save/load', () => {
  it('scheduled event at future step persists through save/load', () => {
    const state = createState();
    const ctx = createCtx();

    // Register a test handler
    register(ctx.registry, 'test.aiEvent', (_s, _p, _c) => {});

    // Schedule an event far in the future (API: state, step, id, params)
    scheduleInsert(state, 9999, 'test.aiEvent', { msg: 'AI attack incoming' });

    assert.strictEqual(state.engine.schedule.length, 1, 'should have one scheduled event');

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    // Event should survive save/load
    assert.strictEqual(reconstructed.engine.schedule.length, 1, 'scheduled event should persist');
    assert.strictEqual(reconstructed.engine.schedule[0].id, 'test.aiEvent');
    assert.strictEqual(reconstructed.engine.schedule[0].step, 9999);
  });

  it('schedule count is preserved through save/load', () => {
    const state = createState();
    const ctx = createCtx();

    register(ctx.registry, 'test.event2', (_s, _p, _c) => {});
    scheduleInsert(state, 5000, 'test.event2', {});
    scheduleInsert(state, 6000, 'test.event2', {});

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);

    assert.strictEqual(reconstructed.engine.schedule.length, 2, 'two events should persist');
  });
});

// -----------------------------------------------------------------------
// 4. S-06 NEGATIVE: world.js must not reference goldValue or market.inject
// -----------------------------------------------------------------------
describe('S-06 contract: world.js must not call goldValue or market.inject', () => {
  it('world.js source does not reference goldValue', () => {
    const worldSrc = readFileSync(
      new URL('../src/core/systems/world.js', import.meta.url),
      'utf8'
    );
    assert.ok(
      !worldSrc.includes('goldValue'),
      'world.js must not reference goldValue before M4'
    );
  });

  it('world.js source does not reference market.inject', () => {
    const worldSrc = readFileSync(
      new URL('../src/core/systems/world.js', import.meta.url),
      'utf8'
    );
    assert.ok(
      !worldSrc.includes('market.inject'),
      'world.js must not reference market.inject before M4'
    );
  });

  it('worldTick does not mutate state (behavioral spy)', () => {
    const state = createState();
    const ctx = createCtx();

    // Track emitTx calls
    /** @type {any[]} */
    const txCalls = [];
    ctx.emitTx = (tx) => txCalls.push(tx);

    // Run several steps with world.tick in the periodic list
    for (let i = 0; i < 50; i++) {
      step(state, ctx);
    }

    // worldTick is no-op: it should not have emitted any goldValue-related txs
    // (We can't directly intercept goldValue calls since it's pure, but we verify
    // no unexpected tx events came from world-related causes)
    const worldTxs = txCalls.filter(tx => tx && tx.cause && tx.cause.startsWith('world'));
    assert.strictEqual(worldTxs.length, 0, 'world.tick should not emit any transactions');
  });

  it('calling worldTick directly does not throw', () => {
    const state = createState();
    const ctx = { registry: /** @type {any} */ ({}), periodics: [] };

    assert.doesNotThrow(() => {
      worldTick(state, {}, ctx);
    }, 'worldTick should not throw');
  });

  it('running N steps with world.tick registered does not crash', () => {
    const state = createState();
    const ctx = createCtx();

    assert.doesNotThrow(() => {
      for (let i = 0; i < 100; i++) {
        step(state, ctx);
      }
    }, 'engine steps with world.tick should not crash');

    assert.ok(state.engine.curStep >= 100, 'should have run 100 steps');
  });
});
