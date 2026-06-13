import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createAccumulator, advance, step } from '../src/core/engine/clock.js';

function makeCtx() {
  const state = createInitialState({ seed: 42 });
  initRng(state);
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { state, ctx: { registry, periodics } };
}

describe('clock: advance', () => {
  it('speed=1, +100ms => stepsRun===2, curStep+=2', () => {
    const { state, ctx } = makeCtx();
    state.engine.speed = 1;
    const acc = createAccumulator(0, 10);
    const result = advance(acc, state, ctx, 100);
    assert.equal(result.stepsRun, 2);
    assert.equal(result.dirty, true);
    assert.equal(state.engine.curStep, 2);
  });

  it('speed=2, +100ms => stepsRun===4, curStep+=4', () => {
    const { state, ctx } = makeCtx();
    state.engine.speed = 2;
    const acc = createAccumulator(0, 10);
    const result = advance(acc, state, ctx, 100);
    assert.equal(result.stepsRun, 4);
    assert.equal(state.engine.curStep, 4);
  });

  it('speed=0 (pause) => stepsRun===0, curStep unchanged, accMs===0', () => {
    const { state, ctx } = makeCtx();
    state.engine.speed = 0;
    const acc = createAccumulator(0, 10);
    const result = advance(acc, state, ctx, 500);
    assert.equal(result.stepsRun, 0);
    assert.equal(result.dirty, false);
    assert.equal(state.engine.curStep, 0);
    assert.equal(acc.accMs, 0);
  });

  it('frame budget limits steps; remainder carried over', () => {
    const { state, ctx } = makeCtx();
    state.engine.speed = 1;
    const acc = createAccumulator(0, 3); // frameBudget=3
    const r1 = advance(acc, state, ctx, 1000); // 1000ms / 50ms = 20 due, budget=3
    assert.equal(r1.stepsRun, 3);
    assert.equal(state.engine.curStep, 3);
    // Accumulator should have 17 * 50 = 850ms remaining
    assert.ok(acc.accMs >= 800, `accMs=${acc.accMs} should be ~850`);
    // Next advance with +0ms should run 3 more
    const r2 = advance(acc, state, ctx, 1000);
    assert.equal(r2.stepsRun, 3);
    assert.equal(state.engine.curStep, 6);
  });

  it('determinism: same nowMs sequence => same curStep', () => {
    const { state: s1, ctx: c1 } = makeCtx();
    const { state: s2, ctx: c2 } = makeCtx();
    const acc1 = createAccumulator(0, 10);
    const acc2 = createAccumulator(0, 10);
    const times = [50, 100, 200, 350];
    for (const t of times) {
      advance(acc1, s1, c1, t);
      advance(acc2, s2, c2, t);
    }
    assert.equal(s1.engine.curStep, s2.engine.curStep);
  });
});
