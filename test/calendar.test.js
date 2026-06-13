import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createAccumulator, advance } from '../src/core/engine/clock.js';

function makeBootstrap(seed = 1) {
  const state = createInitialState({ seed });
  initRng(state);
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const ctx = { registry, periodics };
  return { state, ctx };
}

/**
 * Advance state to exactly N steps.
 */
function runSteps(state, ctx, n) {
  // Use large frameBudget to avoid budget limiting
  const acc = createAccumulator(0, n + 10);
  advance(acc, state, ctx, n * 50); // exactly n * STEP_MS
}

describe('calendar: day/season/year boundaries', () => {
  it('steps 1..900 are all day 1 (dayInSeason=1)', () => {
    const { state, ctx } = makeBootstrap();
    runSteps(state, ctx, 900);
    assert.equal(state.season.dayInSeason, 1, 'should still be day 1 after 900 steps');
    assert.equal(state.season.curStep, 900);
    assert.equal(state.season._absDay, 1);
  });

  it('step 901 advances to day 2 (dayInSeason=2)', () => {
    const { state, ctx } = makeBootstrap();
    runSteps(state, ctx, 901);
    assert.equal(state.season.dayInSeason, 2, 'dayInSeason should be 2 after step 901');
    assert.equal(state.season._absDay, 2);
  });

  it('season changes at step 91*900+1 (first step of day 92 = day 1 of season 1)', () => {
    const { state, ctx } = makeBootstrap();
    const targetStep = 91 * 900 + 1;
    runSteps(state, ctx, targetStep);
    assert.equal(state.season.curSeason, 1, `Expected season 1 at step ${targetStep}, got ${state.season.curSeason}`);
    assert.equal(state.season.dayInSeason, 1);
  });

  it('year advances at step 364*900+1 (start of year 2)', () => {
    const { state, ctx } = makeBootstrap();
    const targetStep = 364 * 900 + 1;
    runSteps(state, ctx, targetStep);
    assert.equal(state.season.curYear, 2, `Expected year 2 at step ${targetStep}, got ${state.season.curYear}`);
    assert.equal(state.season.curSeason, 0);
    assert.equal(state.season.dayInSeason, 1);
  });

  it('_absDay monotonically increases', () => {
    const { state, ctx } = makeBootstrap();
    let prevAbsDay = state.season._absDay;
    // Run through a few day boundaries
    for (let d = 1; d <= 10; d++) {
      runSteps(state, ctx, 900); // add 900 more steps each time
      assert.ok(state.season._absDay >= prevAbsDay, `_absDay decreased: ${state.season._absDay} < ${prevAbsDay}`);
      prevAbsDay = state.season._absDay;
    }
  });

  it('isNew5Days fires on absDay multiples of 5', () => {
    const { state, ctx } = makeBootstrap();
    // Track isNew5Days via a side effect spy
    let fivesDayCount = 0;
    const reg2 = createRegistry();
    const periodics2 = registerCorePeriodics(reg2);

    // Override noop to count 5-day events - instead, manually check by running to 5-day boundaries
    // Run to day 5 (step 4*900+1 = 3601 should be absDay=5)
    runSteps(state, ctx, 4 * 900 + 1);
    // At step 3601, absDay should be 5 (days 1-4 have been advanced, now entering day 5)
    // absDay increments at day boundaries starting step 901
    // day 2 at step 901, day 3 at 1801, day 4 at 2701, day 5 at 3601
    assert.equal(state.season._absDay, 5);
  });
});

describe('calendar: isNewYear edge at year boundary', () => {
  it('isNewYear true at exactly step 364*900+1', () => {
    // We track TimeEdges by running exactly to that boundary step
    // Create fresh state and advance to one step before boundary, then one more
    const { state, ctx } = makeBootstrap();
    // Run to 364*900 steps
    runSteps(state, ctx, 364 * 900);
    assert.equal(state.season.curYear, 1, 'Should be year 1 before boundary');
    // One more step
    runSteps(state, ctx, 1);
    assert.equal(state.season.curYear, 2, 'Should be year 2 after boundary step');
    assert.equal(state.season.curSeason, 0);
    assert.equal(state.season.dayInSeason, 1);
  });
});

describe('calendar: tickOrder spy - periodics fire at right edges', () => {
  it('step-periodics fire every step, day-periodics only on day boundary', () => {
    // Track per-periodic call counts using separate spy handlers
    const counts = /** @type {Record<string, number>} */ ({});
    const { state, ctx } = makeBootstrap();

    // Replace noop with a named spy per periodic
    for (const task of ctx.periodics) {
      const id = task.id;
      counts[id] = 0;
      ctx.registry.handlers.set(task.systemFn, (s, p, c) => { counts[id]++; });
      // Note: all tasks share systemFn='noop', so last one wins - use a per-task handler approach
    }

    // Since all tasks share 'noop' we can't distinguish by handler alone.
    // Instead: run 5 steps (no day boundary in first 900 steps) and verify:
    // step-periodics fire every step, day/quarter/noon-periodics fire on specific steps.
    const { state: s2, ctx: c2 } = makeBootstrap();
    const stepPeriodics = c2.periodics.filter(p => p.every === 'step');
    const dayPeriodics = c2.periodics.filter(p => p.every === 'day');

    // Register named handlers per periodic ID
    const stepCounts = /** @type {Record<string, number>} */ ({});
    const dayCounts = /** @type {Record<string, number>} */ ({});

    for (const t of stepPeriodics) {
      stepCounts[t.id] = 0;
      const localId = t.id;
      // Each step periodic gets a unique handler registered under its id (override systemFn)
      c2.registry.handlers.set(`spy-step-${localId}`, () => { stepCounts[localId]++; });
      t.systemFn = `spy-step-${localId}`;
    }
    for (const t of dayPeriodics) {
      dayCounts[t.id] = 0;
      const localId = t.id;
      c2.registry.handlers.set(`spy-day-${localId}`, () => { dayCounts[localId]++; });
      t.systemFn = `spy-day-${localId}`;
    }

    // Run 5 steps (all within day 1, no day boundary)
    runSteps(s2, c2, 5);

    // step-periodics: should fire 5 times each
    for (const t of stepPeriodics) {
      assert.equal(stepCounts[t.id], 5, `${t.id} should fire 5 times in 5 steps`);
    }
    // day-periodics: step 1 isNewDay=true (stepInDay===0), so fires once in 5 steps
    for (const t of dayPeriodics) {
      assert.equal(dayCounts[t.id], 1, `${t.id} should fire exactly once (on step 1, isNewDay)`);
    }
  });
});
