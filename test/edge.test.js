/**
 * Edge tests for iter-004 M0a engine core.
 * Covers: determinism (different seeds), time edges across year boundary,
 * scheduler tie-breaker _seq, state serializability, registry/assertSerializable,
 * commands dispatch/setSpeed, schedule integration through tickOrder.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng, hashState } from '../src/core/engine/rng.js';
import { createRegistry, register, resolve, has, assertSerializable } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createAccumulator, advance } from '../src/core/engine/clock.js';
import { scheduleInsert, scheduleDue, scheduleCountOf } from '../src/core/engine/scheduler.js';
import { createCommandRegistry, dispatch } from '../src/core/commands/dispatch.js';
import { setSpeed, registerSetSpeed } from '../src/core/commands/setSpeed.js';
import { devFreeze } from '../src/core/state/freeze.js';

/** Bootstrap helper */
function makeBootstrap(seed = 1) {
  const state = createInitialState({ seed });
  initRng(state);
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const ctx = { registry, periodics };
  return { state, ctx };
}

/** Run exactly n steps using advance() */
function runSteps(state, ctx, n) {
  const acc = createAccumulator(0, n + 10);
  advance(acc, state, ctx, n * 50);
}

// ============================================================
// TC-E01: Determinism – different seeds produce different hashes
// ============================================================
describe('edge: determinism – seed independence', () => {
  it('same seed same hash, different seed different hash', () => {
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

    const h_42_a = simulate(42, 20);
    const h_42_b = simulate(42, 20);
    const h_99   = simulate(99, 20);

    // Same seed → same hash (stable determinism)
    assert.equal(h_42_a, h_42_b, 'same seed must produce same hash');
    // Different seed → different hash
    assert.notEqual(h_42_a, h_99, 'different seeds must produce different hashes');
  });

  it('hash changes after additional steps', () => {
    function simulate(seed, steps) {
      const state = createInitialState({ seed });
      initRng(state);
      const registry = createRegistry();
      const periodics = registerCorePeriodics(registry);
      const ctx = { registry, periodics };
      runSteps(state, ctx, steps);
      return hashState(state);
    }
    const h10 = simulate(1, 10);
    const h20 = simulate(1, 20);
    assert.notEqual(h10, h20, 'hash at step 10 should differ from step 20');
  });
});

// ============================================================
// TC-E02: Time edges – 5days/10days periodic across year boundary
// (use _absDay, not curDay which resets every year)
// ============================================================
describe('edge: 5days/10days edges cross year boundary', () => {
  it('isNew10Days fires at _absDay multiples across year boundary', () => {
    // Day 360 is near year end (364 days/year). Day 370 = _absDay 370 (year 2).
    // At _absDay 370: 370 % 10 === 0 → isNew10Days must fire.
    const { state, ctx } = makeBootstrap(7);

    // Override noop for 10days periodic to count firings
    let tenDayCount = 0;
    const tenDaysTask = ctx.periodics.find(p => p.every === '10days');
    assert.ok(tenDaysTask, 'should have a 10days periodic');
    const spyId = 'spy-10days';
    ctx.registry.handlers.set(spyId, () => { tenDayCount++; });
    tenDaysTask.systemFn = spyId;

    // Run exactly to _absDay 370 boundary: step = (370-1)*900 + 1
    // Day 1 = steps 1..900, day 2 = step 901..1800, day N starts at step (N-1)*900+1
    const targetStep = (370 - 1) * 900 + 1;
    runSteps(state, ctx, targetStep);

    // By absDay 370, isNew10Days should have fired exactly at days 10,20,...,370 → 37 times
    assert.equal(tenDayCount, 37, `expected 37 10-day firings by absDay 370, got ${tenDayCount}`);
  });

  it('isNew5Days fires at _absDay multiples, not curDay (which resets annually)', () => {
    const { state, ctx } = makeBootstrap(3);

    let fiveDayCount = 0;
    const fiveDaysTask = ctx.periodics.find(p => p.every === '5days');
    assert.ok(fiveDaysTask, 'should have a 5days periodic');
    const spyId = 'spy-5days';
    ctx.registry.handlers.set(spyId, () => { fiveDayCount++; });
    fiveDaysTask.systemFn = spyId;

    // Run to day 365 (first day of year 2), which = _absDay 365 (365 % 5 = 0)
    const targetStep = (365 - 1) * 900 + 1;
    runSteps(state, ctx, targetStep);

    // Expected firings: _absDay 5,10,...,365 → 365/5 = 73 firings
    assert.equal(fiveDayCount, 73, `expected 73 5-day firings by absDay 365, got ${fiveDayCount}`);
  });
});

// ============================================================
// TC-E03: Scheduler tie-breaker _seq (FIFO for same-step events)
// ============================================================
describe('edge: scheduler tie-breaker _seq', () => {
  it('same-step events dispatched FIFO by insertion order (_seq)', () => {
    const state = createInitialState({ seed: 1 });
    state.engine.curStep = 0;

    // Insert 5 events all on step 10
    const ids = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    for (const id of ids) {
      scheduleInsert(state, 10, id);
    }

    const due = scheduleDue(state, 10);
    assert.equal(due.length, 5);
    for (let i = 0; i < ids.length; i++) {
      assert.equal(due[i].id, ids[i], `position ${i}: expected ${ids[i]}, got ${due[i].id}`);
    }
  });

  it('_seq is monotonically increasing after inserts', () => {
    const state = createInitialState({ seed: 1 });
    const seqBefore = state.engine._seq;
    scheduleInsert(state, 0, 'a');
    scheduleInsert(state, 0, 'b');
    scheduleInsert(state, 0, 'c');
    assert.equal(state.engine._seq, seqBefore + 3);
  });

  it('interleaved steps produce correct order across different steps', () => {
    const state = createInitialState({ seed: 1 });
    state.engine.curStep = 0;
    scheduleInsert(state, 5, 'first-at-5');
    scheduleInsert(state, 3, 'only-at-3');
    scheduleInsert(state, 5, 'second-at-5');

    const due3 = scheduleDue(state, 3);
    assert.equal(due3.length, 1);
    assert.equal(due3[0].id, 'only-at-3');

    const due5 = scheduleDue(state, 5);
    assert.equal(due5.length, 2);
    assert.equal(due5[0].id, 'first-at-5');
    assert.equal(due5[1].id, 'second-at-5');
  });
});

// ============================================================
// TC-E04: State serializability (no functions, no Map, no Date)
// ============================================================
describe('edge: state serializability', () => {
  it('createInitialState is fully JSON-serializable', () => {
    const state = createInitialState({ seed: 42 });
    const json = JSON.stringify(state);
    const loaded = JSON.parse(json);
    // Deep equality – no functions, no Map, no Date
    assert.deepEqual(state, loaded);
  });

  it('state after initRng is JSON-serializable', () => {
    const state = createInitialState({ seed: 99 });
    initRng(state);
    const json = JSON.stringify(state);
    const loaded = JSON.parse(json);
    assert.deepEqual(state, loaded);
  });

  it('state after 100 steps is fully JSON-serializable', () => {
    const { state, ctx } = makeBootstrap(7);
    runSteps(state, ctx, 100);
    const json = JSON.stringify(state);
    const loaded = JSON.parse(json);
    assert.deepEqual(state, loaded);
  });

  it('state contains no Map, Date, or function values (deep check)', () => {
    const { state, ctx } = makeBootstrap(5);
    runSteps(state, ctx, 50);

    function checkNoForbidden(val, path) {
      if (val instanceof Map) throw new Error(`Map found at ${path}`);
      if (val instanceof Date) throw new Error(`Date found at ${path}`);
      if (typeof val === 'function') throw new Error(`function found at ${path}`);
      if (val !== null && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          checkNoForbidden(v, `${path}.${k}`);
        }
      }
    }
    assert.doesNotThrow(() => checkNoForbidden(state, 'state'));
  });

  it('schedule heap entries are JSON-serializable with heap property preserved', () => {
    const state = createInitialState({ seed: 1 });
    state.engine.curStep = 0;
    for (const s of [15, 3, 8, 1, 12, 5]) {
      scheduleInsert(state, s, 'ev');
    }
    const json = JSON.stringify(state.engine.schedule);
    state.engine.schedule = JSON.parse(json);
    // Pop all in order – must be non-decreasing
    let last = -1;
    const all = scheduleDue(state, 999);
    for (const e of all) {
      assert.ok(e.step >= last, `out of order: ${e.step} after ${last}`);
      last = e.step;
    }
  });
});

// ============================================================
// TC-E05: Registry – fail-fast behaviors
// ============================================================
describe('edge: registry fail-fast', () => {
  it('register same ID with different handler throws (id collision)', () => {
    const reg = createRegistry();
    const h1 = () => {};
    const h2 = () => {};
    register(reg, 'foo', h1);
    assert.throws(() => register(reg, 'foo', h2), /collision/i);
  });

  it('register same ID with identical handler is idempotent (no throw)', () => {
    const reg = createRegistry();
    const h = () => {};
    register(reg, 'foo', h);
    assert.doesNotThrow(() => register(reg, 'foo', h));
  });

  it('resolve unknown ID throws (DEV fail-fast)', () => {
    const reg = createRegistry();
    assert.throws(() => resolve(reg, 'does-not-exist'), /unknown id/i);
  });

  it('has() returns true for registered, false for unregistered', () => {
    const reg = createRegistry();
    register(reg, 'myhandler', () => {});
    assert.equal(has(reg, 'myhandler'), true);
    assert.equal(has(reg, 'missing'), false);
  });

  it('assertSerializable throws on function in params', () => {
    assert.throws(() => assertSerializable({ fn: () => {} }), /function|serializable/i);
  });

  it('assertSerializable throws on nested function', () => {
    assert.throws(() => assertSerializable({ a: { b: { fn: () => {} } } }), /function|serializable/i);
  });

  it('assertSerializable does not throw on plain data', () => {
    assert.doesNotThrow(() => assertSerializable({ x: 1, y: 'hello', z: [1, 2, 3] }));
  });

  it('assertSerializable does NOT throw on cyclic object (BUG-001 fixed in iter-006)', () => {
    // BUG-001 FIXED: checkNoFunctions now has WeakSet cycle protection.
    // A cyclic object no longer causes Maximum call stack size exceeded.
    // Cycle-only object (no function) should pass assertSerializable cleanly.
    /** @type {Record<string, unknown>} */
    const obj = { a: 1 };
    obj.self = obj; // cycle
    // After BUG-001 fix: cyclic object with no functions does NOT throw.
    assert.doesNotThrow(() => assertSerializable(obj));
  });
});

// ============================================================
// TC-E06: Commands – dispatch and setSpeed
// ============================================================
describe('edge: commands dispatch and setSpeed', () => {
  it('setSpeed 2 → ok:true, state.engine.speed===2', () => {
    const { state } = makeBootstrap();
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    const result = dispatch(creg, state, { type: 'setSpeed', params: { speed: 2 } });
    assert.equal(result.ok, true);
    assert.equal(state.engine.speed, 2);
  });

  it('setSpeed 0 → pause, ok:true', () => {
    const { state } = makeBootstrap();
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    const result = dispatch(creg, state, { type: 'setSpeed', params: { speed: 0 } });
    assert.equal(result.ok, true);
    assert.equal(state.engine.speed, 0);
  });

  it('setSpeed with invalid value → ok:false, no throw', () => {
    const { state } = makeBootstrap();
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    const result = dispatch(creg, state, { type: 'setSpeed', params: { speed: 5 } });
    assert.equal(result.ok, false);
    assert.ok(result.error, 'should have error message');
  });

  it('unknown command type → ok:false, no throw', () => {
    const { state } = makeBootstrap();
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    let result;
    assert.doesNotThrow(() => {
      result = dispatch(creg, state, { type: 'nonExistentCommand', params: {} });
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('nonExistentCommand'), 'error should mention command type');
  });

  it('dispatch with no params field uses empty params (no crash)', () => {
    const { state } = makeBootstrap();
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    // setSpeed with missing speed → should return ok:false (invalid speed)
    const result = dispatch(creg, state, { type: 'setSpeed' });
    assert.equal(result.ok, false);
  });
});

// ============================================================
// TC-E07: Schedule integration – event fires through tickOrder
// ============================================================
describe('edge: schedule integration through tickOrder', () => {
  it('one-shot event fires exactly once at scheduled step', () => {
    const { state, ctx } = makeBootstrap(11);
    let fired = 0;
    register(ctx.registry, 'testEvent', () => { fired++; });

    // Schedule at step 5 (curStep=0, so step 5 is valid)
    scheduleInsert(state, 5, 'testEvent');
    assert.equal(scheduleCountOf(state, 'testEvent'), 1);

    // Run 5 steps → event should fire on step 5
    runSteps(state, ctx, 5);
    assert.equal(fired, 1, 'event should fire exactly once');
    assert.equal(scheduleCountOf(state, 'testEvent'), 0, 'scheduleCount should be 0 after firing');
  });

  it('event does not fire before its scheduled step', () => {
    const { state, ctx } = makeBootstrap(13);
    let fired = 0;
    register(ctx.registry, 'lateEvent', () => { fired++; });

    scheduleInsert(state, 100, 'lateEvent');

    // Run only 50 steps
    runSteps(state, ctx, 50);
    assert.equal(fired, 0, 'event should not fire before its step');
    assert.equal(scheduleCountOf(state, 'lateEvent'), 1, 'event still pending');
  });

  it('multiple events on different steps fire in correct order', () => {
    const { state, ctx } = makeBootstrap(17);
    const log = /** @type {string[]} */ ([]);
    register(ctx.registry, 'ev-first', () => { log.push('first'); });
    register(ctx.registry, 'ev-second', () => { log.push('second'); });

    scheduleInsert(state, 3, 'ev-second'); // inserted first but later step
    scheduleInsert(state, 1, 'ev-first');  // step 1

    runSteps(state, ctx, 5);
    assert.deepEqual(log, ['first', 'second'], 'events must fire in step order');
  });
});

// ============================================================
// TC-E08: State serializability – devFreeze
// ============================================================
describe('edge: devFreeze state immutability', () => {
  it('devFreeze makes state deeply frozen in DEV mode', () => {
    const state = createInitialState({ seed: 1 });
    const frozen = devFreeze(state);
    // In DEV mode, mutation should throw (strict mode) or be silently ignored
    // We test that the value does not change after attempted mutation
    try {
      // @ts-ignore intentional mutation attempt
      frozen.engine.curStep = 9999;
    } catch (_) {
      // Expected in strict mode
    }
    // Either it threw and curStep is still 0, or it was silently ignored
    assert.equal(frozen.engine.curStep, 0, 'frozen state should not allow mutation');
  });

  it('devFreeze handles null battle field without crash', () => {
    const state = createInitialState({ seed: 2 });
    assert.equal(state.battle, null);
    assert.doesNotThrow(() => devFreeze(state));
  });
});

// ============================================================
// TC-E09: Day-boundary edges – step 1 is day 1, step 901 is day 2
// (explicit curStep boundary verification)
// ============================================================
describe('edge: curStep day boundary precision', () => {
  it('step 900 is still day 1 (last step of day 1)', () => {
    const { state, ctx } = makeBootstrap(21);
    runSteps(state, ctx, 900);
    assert.equal(state.season.dayInSeason, 1);
    assert.equal(state.season._absDay, 1);
    assert.equal(state.engine.curStep, 900);
  });

  it('step 901 is day 2 (first step of day 2)', () => {
    const { state, ctx } = makeBootstrap(22);
    runSteps(state, ctx, 901);
    assert.equal(state.season.dayInSeason, 2);
    assert.equal(state.season._absDay, 2);
    assert.equal(state.engine.curStep, 901);
  });

  it('season boundary: step 91*900 is last step of season 0 day 91', () => {
    const { state, ctx } = makeBootstrap(23);
    runSteps(state, ctx, 91 * 900);
    assert.equal(state.season.curSeason, 0);
    assert.equal(state.season.dayInSeason, 91);
  });

  it('season boundary: step 91*900+1 is first step of season 1', () => {
    const { state, ctx } = makeBootstrap(24);
    runSteps(state, ctx, 91 * 900 + 1);
    assert.equal(state.season.curSeason, 1);
    assert.equal(state.season.dayInSeason, 1);
  });

  it('year boundary: step 364*900 is last step of year 1', () => {
    const { state, ctx } = makeBootstrap(25);
    runSteps(state, ctx, 364 * 900);
    assert.equal(state.season.curYear, 1);
  });

  it('year boundary: step 364*900+1 is first step of year 2', () => {
    const { state, ctx } = makeBootstrap(26);
    runSteps(state, ctx, 364 * 900 + 1);
    assert.equal(state.season.curYear, 2);
    assert.equal(state.season.curSeason, 0);
    assert.equal(state.season.dayInSeason, 1);
  });
});
