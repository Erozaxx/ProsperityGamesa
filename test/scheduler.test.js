import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { scheduleInsert, scheduleDue, scheduleCountOf, scheduleCancel } from '../src/core/engine/scheduler.js';

function freshState() {
  return createInitialState({ seed: 1 });
}

describe('scheduler: heap correctness', () => {
  it('events returned in step order, FIFO tie-breaking', () => {
    const state = freshState();
    state.engine.curStep = 0;
    scheduleInsert(state, 10, 'A');
    scheduleInsert(state, 5, 'B');
    scheduleInsert(state, 5, 'C');
    const due = scheduleDue(state, 5);
    assert.equal(due.length, 2);
    assert.equal(due[0].id, 'B'); // inserted first = lower seq
    assert.equal(due[1].id, 'C');
    // step=10 remains
    assert.equal(state.engine.schedule.length, 1);
    assert.equal(state.engine.schedule[0].step, 10);
  });

  it('scheduleCount tracks inserts and pops', () => {
    const state = freshState();
    state.engine.curStep = 0;
    scheduleInsert(state, 1, 'ev');
    scheduleInsert(state, 2, 'ev');
    assert.equal(scheduleCountOf(state, 'ev'), 2);
    scheduleDue(state, 1);
    assert.equal(scheduleCountOf(state, 'ev'), 1);
    scheduleDue(state, 2);
    assert.equal(scheduleCountOf(state, 'ev'), 0);
    // key should be gone
    assert.equal(state.engine.scheduleCount['ev'], undefined);
  });

  it('serializability: JSON round-trip preserves heap property', () => {
    const state = freshState();
    state.engine.curStep = 0;
    // Insert several events
    for (const s of [7, 3, 9, 1, 5, 2, 8]) {
      scheduleInsert(state, s, 'x');
    }
    // Round-trip
    const json = JSON.stringify(state.engine.schedule);
    state.engine.schedule = JSON.parse(json);
    // Pop all: must be non-decreasing steps
    let lastStep = -1;
    while (state.engine.schedule.length > 0) {
      const due = scheduleDue(state, 999);
      for (const e of due) {
        assert.ok(e.step >= lastStep, `${e.step} < ${lastStep}: not sorted`);
        lastStep = e.step;
      }
    }
  });

  it('scheduleCancel removes matching events', () => {
    const state = freshState();
    state.engine.curStep = 0;
    scheduleInsert(state, 10, 'keep');
    scheduleInsert(state, 20, 'remove');
    scheduleInsert(state, 30, 'remove');
    const n = scheduleCancel(state, e => e.id === 'remove');
    assert.equal(n, 2);
    assert.equal(scheduleCountOf(state, 'remove'), 0);
    assert.equal(scheduleCountOf(state, 'keep'), 1);
  });

  it('insert to past step throws', () => {
    const state = freshState();
    state.engine.curStep = 10;
    assert.throws(() => scheduleInsert(state, 5, 'x'), /past/);
  });
});
