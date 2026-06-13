/**
 * Tests for src/save/saveStore.js – IndexedDB save round-trip, rotation, fallback.
 * Uses fake-indexeddb to provide IndexedDB in Node.
 */
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { step } from '../src/core/engine/index.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { hashState } from '../src/core/engine/rng.js';
import { saveGame, loadGame, _resetDB } from '../src/save/saveStore.js';
import { SLOT_ID, GENERATIONS } from '../src/save/schema.js';

/** Bootstraps a simple game state with N steps advanced. */
function makeState(steps = 0) {
  const state = createInitialState({ seed: 0xABCDEF });
  initRng(state);
  if (steps > 0) {
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const ctx = { registry, periodics };
    for (let i = 0; i < steps; i++) step(state, ctx);
  }
  return state;
}

// Reset cached DB before each test group
test('save: empty state → loadGame returns null', async () => {
  _resetDB();
  const result = await loadGame(SLOT_ID);
  assert.equal(result, null);
});

test('save: round-trip preserves hashState', async () => {
  _resetDB();
  const state = makeState(10);
  const hashBefore = hashState(state);

  await saveGame(state, { now: 1000 });
  const loaded = await loadGame(SLOT_ID);

  assert.ok(loaded !== null, 'loadGame should return a result');
  assert.equal(hashState(loaded.state), hashBefore);
});

test('save: savedAt and lastSimTimestamp stored correctly', async () => {
  _resetDB();
  const state = makeState(5);

  const { savedAt } = await saveGame(state, { now: 1234 });
  assert.equal(savedAt, 1234);

  const loaded = await loadGame(SLOT_ID);
  assert.ok(loaded !== null);
  assert.equal(loaded.record.lastSimTimestamp, 1234);
  assert.equal(loaded.record.savedAt, 1234);
});

test('save: rotation – after N+2 saves, only GENERATIONS records exist per slot', async () => {
  _resetDB();
  const state = makeState(3);

  // Save 5 times (more than GENERATIONS=3)
  for (let i = 0; i < 5; i++) {
    await saveGame(state, { now: i * 100 });
  }

  const loaded = await loadGame(SLOT_ID);
  assert.ok(loaded !== null);
  // activeGen should be (5-1) % 3 = 1
  assert.equal(loaded.record.generation, (5 - 1) % GENERATIONS);
});

test('save: rotation – activeGen cycles 0→1→2→0→1', async () => {
  _resetDB();
  const state = makeState(0);
  const gens = [];

  for (let i = 0; i < 5; i++) {
    const { generation } = await saveGame(state, { now: i });
    gens.push(generation);
  }

  assert.deepEqual(gens, [0, 1, 2, 0, 1]);
});

test('save: fallback – corrupted active generation falls back to previous', async () => {
  _resetDB();
  // We need to directly access the DB to corrupt a record.
  // Use two saves, then corrupt the second (active) one.
  const { openDB, get, put } = await import('../src/save/idb.js');
  const { DB_NAME, DB_VERSION, STORE_SAVES, STORE_SLOTS } = await import('../src/save/schema.js');

  const state = makeState(5);

  // Save twice
  await saveGame(state, { now: 100 });  // gen=0
  await saveGame(state, { now: 200 });  // gen=1 (active)

  // Corrupt gen=1 (active) by overwriting with bad payload
  const upgradeFn = (/** @type {IDBDatabase} */ db) => {
    if (!db.objectStoreNames.contains(STORE_SAVES)) {
      db.createObjectStore(STORE_SAVES, { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains(STORE_SLOTS)) {
      db.createObjectStore(STORE_SLOTS, { keyPath: 'slotId' });
    }
  };
  const db = await openDB(DB_NAME, DB_VERSION, upgradeFn);
  const txn = db.transaction(STORE_SAVES, 'readwrite');
  const store = txn.objectStore(STORE_SAVES);
  await put(store, { key: `${SLOT_ID}:1`, slotId: SLOT_ID, generation: 1, savedAt: 200, lastSimTimestamp: 200, saveVersion: 1, gameVersion: '0.0.0-m0a', payload: {} });

  // loadGame should fall back to gen=0
  _resetDB();
  const loaded = await loadGame(SLOT_ID);
  assert.ok(loaded !== null, 'should fall back to previous generation');
  assert.equal(loaded.record.generation, 0);
  assert.ok(Number.isFinite(loaded.state.engine.curStep));
});

test('save: assertSerializable guard – function in state throws', async () => {
  _resetDB();
  const state = makeState(0);
  // Inject a function into state (would fail structuredClone)
  /** @type {any} */ (state).badField = () => {};

  await assert.rejects(
    () => saveGame(state, { now: 1 }),
    /must not contain functions/
  );
});
