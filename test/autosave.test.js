/**
 * autosave.test.js – iter-008 T-003
 * Tests for src/app/autosave.js: throttle, flush, hide-bypass triggers.
 * Covers T4 spec from design_iter-008_T-001.md.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAutosave } from '../src/app/autosave.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fake save spy that records calls.
 * The doSave returns a resolved promise so awaiting works properly.
 */
function makeSaveSpy() {
  let calls = 0;
  const doSave = async () => { calls++; };
  return {
    doSave,
    get calls() { return calls; },
  };
}

/** Create a fake clock starting at t0 */
function makeFakeClock(startMs = 0) {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms) => { current += ms; },
    set: (ms) => { current = ms; },
  };
}

// ---------------------------------------------------------------------------
// Throttle behavior
// Note: requestSave() is fire-and-forget (returns void). We use flush() or
// direct save inspection after awaiting to verify save count.
// ---------------------------------------------------------------------------
describe('autosave throttle', () => {
  it('first requestSave triggers a save', async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(1000);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    autosave.requestSave('periodic');
    await autosave.flush(); // flush ensures pending save completes
    assert.ok(spy.calls >= 1, `Expected at least 1 save call, got ${spy.calls}`);
  });

  it('second requestSave within minInterval is throttled (only 1 save)', async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(1000);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    await autosave.flush(); // first save
    const countAfterFirst = spy.calls;

    clock.advance(30_000); // 30 seconds later (within throttle)
    autosave.requestSave('periodic');
    // Give it a moment to potentially run
    await new Promise(res => setTimeout(res, 10));
    assert.equal(spy.calls, countAfterFirst, 'Second save within minInterval should be throttled');
  });

  it('second requestSave after minInterval triggers another save', async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(1000);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    await autosave.flush(); // first save
    const countAfterFirst = spy.calls;

    clock.advance(60_001); // just over 60 seconds
    autosave.requestSave('periodic');
    await new Promise(res => setTimeout(res, 20)); // let async doSave run
    assert.ok(spy.calls > countAfterFirst, 'Second save after minInterval should trigger');
  });

  it('multiple rapid calls within throttle window → only one save initiated', async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(0);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    // First save triggers
    autosave.requestSave('periodic');
    await new Promise(res => setTimeout(res, 10));
    const after1 = spy.calls;

    // More calls within window
    clock.advance(1_000);
    autosave.requestSave('periodic');
    clock.advance(1_000);
    autosave.requestSave('periodic');
    await new Promise(res => setTimeout(res, 10));
    assert.equal(spy.calls, after1, 'Additional calls within throttle should not trigger more saves');
  });
});

// ---------------------------------------------------------------------------
// Hide bypass
// ---------------------------------------------------------------------------
describe('autosave hide bypass', () => {
  it("reason='hide' triggers save even within minInterval", async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(1000);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    await autosave.flush(); // first save
    const after1 = spy.calls;

    clock.advance(1_000); // 1 second later (well within throttle)
    autosave.requestSave('hide');
    await new Promise(res => setTimeout(res, 20));
    assert.ok(spy.calls > after1, "reason='hide' should bypass throttle and trigger save");
  });

  it("reason='event' respects throttle like 'periodic'", async () => {
    const spy = makeSaveSpy();
    const clock = makeFakeClock(0);
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000, now: clock.now });

    await autosave.flush(); // first save
    const after1 = spy.calls;

    clock.advance(1_000); // within throttle
    autosave.requestSave('event');
    await new Promise(res => setTimeout(res, 10));
    assert.equal(spy.calls, after1, "reason='event' should be throttled like 'periodic'");
  });
});

// ---------------------------------------------------------------------------
// flush()
// ---------------------------------------------------------------------------
describe('autosave flush', () => {
  it('flush() returns a Promise', () => {
    const spy = makeSaveSpy();
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000 });
    const result = autosave.flush();
    assert.ok(result instanceof Promise, 'flush() should return a Promise');
  });

  it('flush() triggers save and resolves', async () => {
    let saveCompleted = false;
    const doSave = async () => { saveCompleted = true; };
    const autosave = createAutosave({ doSave, minIntervalMs: 60_000 });
    await autosave.flush();
    assert.equal(saveCompleted, true, 'flush() save should complete when awaited');
  });

  it('flush() can be called multiple times', async () => {
    const spy = makeSaveSpy();
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000 });
    await autosave.flush();
    await autosave.flush();
    assert.ok(spy.calls >= 1, 'flush() should have triggered at least one save');
  });
});

// ---------------------------------------------------------------------------
// Default behavior
// ---------------------------------------------------------------------------
describe('autosave defaults', () => {
  it('createAutosave without minIntervalMs defaults work (no throw)', () => {
    const spy = makeSaveSpy();
    assert.doesNotThrow(() => {
      createAutosave({ doSave: spy.doSave });
    });
  });

  it('createAutosave without now option defaults work (no throw)', async () => {
    const spy = makeSaveSpy();
    const autosave = createAutosave({ doSave: spy.doSave, minIntervalMs: 60_000 });
    await autosave.flush();
    assert.ok(spy.calls >= 1, 'Default now (Date.now) should work for triggering saves');
  });
});
