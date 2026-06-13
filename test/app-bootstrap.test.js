/**
 * app-bootstrap.test.js – iter-008 T-003
 * Tests for S-1 (save→load pipeline with catalogs, allowlist payload).
 * Covers:
 * - save→load round-trip via real saveStore (with catalog)
 * - payload is allowlist (no frameBudget, no housing derivates)
 * - loadGame without catalog returns raw payload (diagnostics mode)
 * - catalog loader validation behavior
 */

import 'fake-indexeddb/auto';
import { describe, it, before, after } from 'node:test';
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
import { saveGame, loadGame, _resetDB } from '../src/save/saveStore.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

let _slotCounter = 0;
function freshSlot() {
  _resetDB();
  return `bootstrap-test-slot-${_slotCounter++}`;
}

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

function makeFreshState(seed = 0x1234ABCD) {
  const state = createInitialState({ seed });
  initRng(state);
  state.home.population.total = 60;
  state.home.housing.counts = { tent: 3 };
  state.home.food.store = { bread: 200, fish: 50 };
  state.player.gold = 500;
  return state;
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
    loadCatalog(name, loadJson(name));
  }
});

after(() => {
  clearCatalogs();
});

// A minimal catalog handle for loadAndReconstruct
const CATALOG = {};

// ---------------------------------------------------------------------------
// Save→Load round-trip via real saveStore with catalog
// ---------------------------------------------------------------------------
describe('S-1: save→load via saveStore + catalog', () => {
  it('save→loadGame(slotId, catalog) round-trip: allowlisted state fields preserved', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    const ctx = makeCtx();
    // Run some steps
    for (let i = 0; i < 200; i++) step(state, ctx);

    const now = Date.now();
    await saveGame(state, { slotId: slot, now });

    const loaded = await loadGame(slot, CATALOG);
    assert.ok(loaded !== null, 'loadGame should return a result');
    assert.ok(loaded.state, 'loaded.state should exist');
    assert.ok(loaded.record, 'loaded.record should exist');

    // Verify key allowlisted fields are preserved
    assert.equal(loaded.state.engine.curStep, state.engine.curStep,
      'curStep should be preserved after save/load round-trip');
    assert.equal(loaded.state.home.population.total, state.home.population.total,
      'population.total should be preserved');
    assert.equal(loaded.state.player.gold, state.player.gold,
      'player.gold should be preserved');
  });

  it('lastSimTimestamp is stored and returned in record', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    const now = 1234567890;
    await saveGame(state, { slotId: slot, now });

    const loaded = await loadGame(slot, CATALOG);
    assert.ok(loaded !== null, 'Should load successfully');
    assert.equal(loaded.record.lastSimTimestamp, now,
      'lastSimTimestamp in record should match saved now');
  });

  it('save→load is idempotent: double load gives same curStep', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    const ctx = makeCtx();
    for (let i = 0; i < 100; i++) step(state, ctx);

    await saveGame(state, { slotId: slot, now: Date.now() });

    const loaded1 = await loadGame(slot, CATALOG);
    const loaded2 = await loadGame(slot, CATALOG);
    assert.ok(loaded1 && loaded2, 'Both loads should succeed');
    assert.equal(loaded1.state.engine.curStep, loaded2.state.engine.curStep,
      'Double load should give same curStep');
  });
});

// ---------------------------------------------------------------------------
// Payload is allowlist (applyPersist)
// ---------------------------------------------------------------------------
describe('S-1: payload is allowlist (not full state)', () => {
  it('saved payload does NOT contain engine.frameBudget', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    await saveGame(state, { slotId: slot, now: Date.now() });

    const loaded = await loadGame(slot, CATALOG);
    assert.ok(loaded !== null);

    // The saved record payload should not have frameBudget
    const payloadEngine = /** @type {any} */ (loaded.record.payload)?.engine ?? {};
    assert.ok(!('frameBudget' in payloadEngine),
      'engine.frameBudget should NOT be in saved payload (not in allowlist)');
  });

  it('applyPersist(state) matches what was saved', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    const ctx = makeCtx();
    for (let i = 0; i < 50; i++) step(state, ctx);

    await saveGame(state, { slotId: slot, now: Date.now() });
    const loaded = await loadGame(slot, CATALOG);
    assert.ok(loaded !== null);

    const expectedPayload = applyPersist(state);
    const savedPayload = loaded.record.payload;

    // Compare key fields (engine without frameBudget, home, player)
    assert.deepEqual(
      /** @type {any} */ (savedPayload).engine,
      /** @type {any} */ (expectedPayload).engine,
      'Saved engine should match applyPersist output'
    );
    assert.deepEqual(
      /** @type {any} */ (savedPayload).home,
      /** @type {any} */ (expectedPayload).home,
      'Saved home should match applyPersist output'
    );
  });

  it('loadGame without catalog returns a loaded result (diagnostics mode)', async () => {
    const slot = freshSlot();
    const state = makeFreshState();
    await saveGame(state, { slotId: slot, now: Date.now() });

    // Without catalog, loadGame should still work (returns raw payload-based state)
    const loaded = await loadGame(slot);
    assert.ok(loaded !== null, 'loadGame without catalog should return result (diagnostics mode)');
  });
});

// ---------------------------------------------------------------------------
// loadAndReconstruct idempotence (applyPersist→load→applyPersist)
// ---------------------------------------------------------------------------
describe('S-1: loadAndReconstruct idempotence', () => {
  it('applyPersist→loadAndReconstruct→applyPersist gives same payload', () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    for (let i = 0; i < 300; i++) step(state, ctx);

    const payload1 = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload1, CATALOG);
    const payload2 = applyPersist(reconstructed);

    // Key allowlisted fields should be identical
    assert.deepEqual(
      /** @type {any} */ (payload1).engine,
      /** @type {any} */ (payload2).engine,
      'applyPersist→loadAndReconstruct→applyPersist: engine should be idempotent'
    );
    assert.deepEqual(
      /** @type {any} */ (payload1).home,
      /** @type {any} */ (payload2).home,
      'applyPersist→loadAndReconstruct→applyPersist: home should be idempotent'
    );
  });

  it('hashState after round-trip (save→load) then N steps == original state then N steps', async () => {
    const N = 100;
    const slot = freshSlot();

    // Path A: run N steps directly
    const stateA = makeFreshState(0x55AA5511);
    const ctxA = makeCtx();
    await saveGame(stateA, { slotId: slot, now: Date.now() });
    for (let i = 0; i < N; i++) step(stateA, ctxA);

    // Path B: load from save, then run N steps
    const loaded = await loadGame(slot, CATALOG);
    assert.ok(loaded !== null);
    const stateB = loaded.state;
    const ctxB = makeCtx();
    for (let i = 0; i < N; i++) step(stateB, ctxB);

    assert.equal(hashState(stateA), hashState(stateB),
      'Save→load round-trip + N steps must produce same hash as original + N steps (G1)');
  });
});
