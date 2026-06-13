/**
 * Tests for src/app/loop.js – game loop, fake nowFn/raf/cancelRaf, Node-only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createAccumulator, STEP_MS } from '../src/core/engine/clock.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createGameLoop } from '../src/app/loop.js';

/**
 * Creates a fake rAF/cancelRAF system for testing.
 * Returns { raf, cancelRaf, flush(n) } where flush(n) runs n pending callbacks.
 */
function createFakeRaf() {
  let id = 0;
  /** @type {Map<number, FrameRequestCallback>} */
  const pending = new Map();

  /** @param {FrameRequestCallback} cb @returns {number} */
  const raf = (cb) => {
    const thisId = ++id;
    pending.set(thisId, cb);
    return thisId;
  };

  /** @param {number} id */
  const cancelRaf = (id) => { pending.delete(id); };

  /** Flush one pending callback with a given timestamp. @param {number} ts */
  const flushOne = (ts = 0) => {
    const [firstId, cb] = pending.entries().next().value ?? [null, null];
    if (cb) {
      pending.delete(firstId);
      cb(ts);
    }
  };

  return { raf, cancelRaf, flushOne, pending };
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

test('loop.start() schedules a rAF callback', () => {
  const state = createState();
  const ctx = createCtx();
  let now = 0;
  const acc = createAccumulator(now, state.engine.frameBudget);
  const { raf, cancelRaf, pending } = createFakeRaf();

  const loop = createGameLoop({
    state, ctx, acc,
    nowFn: () => now,
    raf, cancelRaf,
    onDirty: () => {},
  });

  assert.equal(pending.size, 0);
  loop.start();
  assert.equal(pending.size, 1);
  loop.stop();
});

test('after advancing time, steps run and onDirty called', () => {
  const state = createState();
  const ctx = createCtx();
  let now = 0;
  const acc = createAccumulator(now, state.engine.frameBudget);
  const { raf, cancelRaf, flushOne } = createFakeRaf();

  let dirtyCount = 0;
  const loop = createGameLoop({
    state, ctx, acc,
    nowFn: () => now,
    raf, cancelRaf,
    onDirty: () => { dirtyCount++; },
  });

  loop.start();
  // Advance 100ms = 2 steps at speed=1 (STEP_MS=50)
  now = 100;
  flushOne(now);

  assert.ok(state.engine.curStep >= 2, `expected curStep>=2, got ${state.engine.curStep}`);
  assert.equal(dirtyCount, 1);
  loop.stop();
});

test('stop() prevents further frame callbacks', () => {
  const state = createState();
  const ctx = createCtx();
  let now = 0;
  const acc = createAccumulator(now, state.engine.frameBudget);
  const { raf, cancelRaf, flushOne, pending } = createFakeRaf();

  const loop = createGameLoop({
    state, ctx, acc,
    nowFn: () => now,
    raf, cancelRaf,
    onDirty: () => {},
  });

  loop.start();
  loop.stop();
  // Flush whatever was scheduled before stop
  now = 100;
  flushOne(now);
  // After stop, no new callbacks should be scheduled
  assert.equal(pending.size, 0);
});

test('loop.running reflects state', () => {
  const state = createState();
  const ctx = createCtx();
  let now = 0;
  const acc = createAccumulator(now, state.engine.frameBudget);
  const { raf, cancelRaf } = createFakeRaf();

  const loop = createGameLoop({
    state, ctx, acc,
    nowFn: () => now,
    raf, cancelRaf,
    onDirty: () => {},
  });

  assert.equal(loop.running, false);
  loop.start();
  assert.equal(loop.running, true);
  loop.stop();
  assert.equal(loop.running, false);
});

test('start() is idempotent (double-start does not schedule twice)', () => {
  const state = createState();
  const ctx = createCtx();
  let now = 0;
  const acc = createAccumulator(now, state.engine.frameBudget);
  const { raf, cancelRaf, pending } = createFakeRaf();

  const loop = createGameLoop({
    state, ctx, acc,
    nowFn: () => now,
    raf, cancelRaf,
    onDirty: () => {},
  });

  loop.start();
  loop.start(); // second call should be no-op
  assert.equal(pending.size, 1); // only one rAF scheduled
  loop.stop();
});
