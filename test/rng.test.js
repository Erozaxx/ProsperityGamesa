import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng, hashState } from '../src/core/engine/rng.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { createAccumulator, advance } from '../src/core/engine/clock.js';

function makeState(seed = 42) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

describe('RNG: determinism and correctness', () => {
  it('same seed => same stream initialization', () => {
    const s1 = makeState(12345);
    const s2 = makeState(12345);
    assert.deepEqual(s1.rng.streams, s2.rng.streams);
  });

  it('next() output is reproducible for same seed', () => {
    const s1 = makeState(99);
    const s2 = makeState(99);
    const rng1 = makeRng(s1, 'forest');
    const rng2 = makeRng(s2, 'forest');
    for (let i = 0; i < 10; i++) {
      assert.equal(rng1.next(), rng2.next());
    }
  });

  it('streams produce different sequences (non-correlated)', () => {
    const state = makeState(1);
    const forestRng = makeRng(state, 'forest');
    const marketRng = makeRng(state, 'market');
    const forestVals = Array.from({ length: 5 }, () => forestRng.next());
    // reset state to get fresh rng
    const state2 = makeState(1);
    const marketRng2 = makeRng(state2, 'market');
    const marketVals = Array.from({ length: 5 }, () => marketRng2.next());
    // They should differ (different seeds per stream)
    assert.notDeepEqual(forestVals, marketVals);
  });

  it('next() returns float in [0,1)', () => {
    const state = makeState();
    const rng = makeRng(state, 'world');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      assert.ok(v >= 0 && v < 1, `${v} not in [0,1)`);
    }
  });

  it('int(6) returns integers in {0..5}', () => {
    const state = makeState();
    const rng = makeRng(state, 'battle');
    for (let i = 0; i < 100; i++) {
      const v = rng.int(6);
      assert.ok(Number.isInteger(v) && v >= 0 && v < 6, `${v} not in {0..5}`);
    }
  });

  it('chance(0) always false, chance(1) always true', () => {
    const state = makeState();
    const rng = makeRng(state, 'events');
    for (let i = 0; i < 20; i++) {
      assert.equal(rng.chance(0), false);
    }
    for (let i = 0; i < 20; i++) {
      assert.equal(rng.chance(1), true);
    }
  });

  it('save-resume: rng state persists through JSON round-trip', () => {
    const state = makeState(77);
    const rng1 = makeRng(state, 'mine');
    // Advance rng
    rng1.next(); rng1.next(); rng1.next();
    const streamAfter = state.rng.streams['mine'];

    // Simulate save/load
    const json = JSON.stringify(state);
    const loaded = JSON.parse(json);
    assert.equal(loaded.rng.streams['mine'], streamAfter);

    // Continue from loaded state
    const rng2 = makeRng(loaded, 'mine');
    const rng3 = makeRng(state, 'mine');
    assert.equal(rng2.next(), rng3.next());
  });

  it('determinism hash: same seed+steps => same hash', () => {
    function simulate(seed, steps) {
      const state = createInitialState({ seed });
      initRng(state);
      const registry = createRegistry();
      const periodics = registerCorePeriodics(registry);
      const ctx = { registry, periodics };
      const acc = createAccumulator(0, 20);
      let now = 0;
      for (let i = 0; i < steps; i++) {
        now += 50;
        advance(acc, state, ctx, now);
      }
      return hashState(state);
    }

    const h1 = simulate(42, 10);
    const h2 = simulate(42, 10);
    assert.equal(h1, h2);
  });

  it('determinism hash stable after JSON round-trip', () => {
    const state = createInitialState({ seed: 1337 });
    initRng(state);
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const ctx = { registry, periodics };
    const acc = createAccumulator(0, 10);
    advance(acc, state, ctx, 500);

    const h1 = hashState(state);
    const loaded = JSON.parse(JSON.stringify(state));
    const h2 = hashState(loaded);
    assert.equal(h1, h2, 'hash should be identical after JSON round-trip');
  });
});
