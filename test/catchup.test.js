/**
 * catchup.test.js – iter-008 T-003
 * Tests for the catch-up engine: catchupStepCount, runCatchupBatch.
 * Covers: T1 (chunked==single-batch==live determinism, cap), T2 (interrupt/resume).
 */

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
import { step, STEP_MS } from '../src/core/engine/clock.js';
import {
  catchupStepCount,
  runCatchupBatch,
  CATCHUP_CHUNK_STEPS,
  CATCHUP_PROGRESS_THRESHOLD_STEPS,
} from '../src/core/engine/catchup.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
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

/** Create a fresh seeded state with some population to make simulation interesting */
function makeFreshState(seed = 0xCAFEBABE) {
  const state = createInitialState({ seed });
  initRng(state);
  state.home.population.total = 50;
  state.home.housing.counts = { tent: 3 };
  state.home.food.store = { bread: 500, fish: 100 };
  state.player.gold = 500;
  return state;
}

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

// ---------------------------------------------------------------------------
// catchupStepCount
// ---------------------------------------------------------------------------
describe('catchupStepCount', () => {
  it('missedMs = 0 → 0 steps', () => {
    assert.equal(catchupStepCount(0, 8 * 3600 * 1000), 0);
  });

  it('missedMs < capRealMs → correct steps', () => {
    const missedMs = 3600 * 1000; // 1 hour
    const capMs = 8 * 3600 * 1000;
    const expected = Math.floor(missedMs / STEP_MS);
    assert.equal(catchupStepCount(missedMs, capMs), expected);
  });

  it('missedMs > capRealMs → capped at capRealMs/STEP_MS', () => {
    const capMs = 8 * 3600 * 1000;
    const missedMs = 100 * 3600 * 1000; // 100 hours
    const expectedSteps = Math.floor(capMs / STEP_MS); // 576 000
    assert.equal(catchupStepCount(missedMs, capMs), expectedSteps);
    assert.equal(expectedSteps, 576_000);
  });

  it('missedMs = capRealMs → exactly capRealMs/STEP_MS steps', () => {
    const capMs = 8 * 3600 * 1000;
    const expected = Math.floor(capMs / STEP_MS);
    assert.equal(catchupStepCount(capMs, capMs), expected);
  });

  it('negative missedMs → 0 steps', () => {
    assert.equal(catchupStepCount(-1000, 8 * 3600 * 1000), 0);
  });

  it('8h cap → 576 000 steps', () => {
    const capMs = 8 * 3600 * 1000;
    assert.equal(catchupStepCount(100 * 3600 * 1000, capMs), 576_000);
  });
});

// ---------------------------------------------------------------------------
// runCatchupBatch – basic
// ---------------------------------------------------------------------------
describe('runCatchupBatch – basic', () => {
  it('stepsRun == totalSteps when not interrupted', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const result = await runCatchupBatch({ state, ctx, totalSteps: 1000, wasCapped: false });
    assert.equal(result.stepsRun, 1000);
    assert.equal(result.stepsRequested, 1000);
    assert.equal(result.interrupted, false);
    assert.equal(result.capped, false);
  });

  it('totalSteps = 0 → stepsRun = 0, no steps run', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const initialStep = state.engine.curStep;
    const result = await runCatchupBatch({ state, ctx, totalSteps: 0, wasCapped: false });
    assert.equal(result.stepsRun, 0);
    assert.equal(state.engine.curStep, initialStep, 'curStep should not change when totalSteps=0');
  });

  it('capped flag is passed through to result', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const result = await runCatchupBatch({ state, ctx, totalSteps: 100, wasCapped: true });
    assert.equal(result.capped, true);
  });

  it('curStep advances by stepsRun', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const before = state.engine.curStep;
    const result = await runCatchupBatch({ state, ctx, totalSteps: 500, wasCapped: false });
    assert.equal(state.engine.curStep, before + result.stepsRun);
  });

  it('onChunk called correct number of times', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const totalSteps = 300;
    const chunkSteps = 100;
    let chunkCount = 0;
    await runCatchupBatch({
      state, ctx, totalSteps, wasCapped: false, chunkSteps,
      onChunk: async () => { chunkCount++; },
    });
    // 300 steps / 100 chunkSize = 3 onChunk calls
    assert.equal(chunkCount, 3);
  });
});

// ---------------------------------------------------------------------------
// T1: Determinism G1 – chunked == single-batch == live N steps
// ---------------------------------------------------------------------------
describe('T1: Determinism G1 – chunked == single-batch == live', () => {
  it('chunked (chunkSteps=100) == single-batch (1 chunk) for 1000 steps', async () => {
    const N = 1000;

    const stateA = makeFreshState(0xAABBCC);
    const ctxA = makeCtx();
    const stateB = makeFreshState(0xAABBCC);
    const ctxB = makeCtx();

    // A: chunked (10 chunks of 100)
    await runCatchupBatch({ state: stateA, ctx: ctxA, totalSteps: N, wasCapped: false, chunkSteps: 100 });
    // B: single chunk (all at once)
    await runCatchupBatch({ state: stateB, ctx: ctxB, totalSteps: N, wasCapped: false, chunkSteps: N });

    assert.equal(hashState(stateA), hashState(stateB),
      'Chunked and single-batch must produce identical hash (G1)');
  });

  it('chunked == live step-by-step for 1 game day (900 steps)', async () => {
    const N = 900;

    // Live: step-by-step
    const stateLive = makeFreshState(0x12345678);
    const ctxLive = makeCtx();
    for (let i = 0; i < N; i++) {
      step(stateLive, ctxLive);
    }

    // Catch-up: batch with default chunk size
    const stateBatch = makeFreshState(0x12345678);
    const ctxBatch = makeCtx();
    await runCatchupBatch({ state: stateBatch, ctx: ctxBatch, totalSteps: N, wasCapped: false });

    assert.equal(hashState(stateLive), hashState(stateBatch),
      'Catch-up batch must produce identical hash to live run (G1)');
  });

  it('chunked == live for 5 game days (4500 steps)', async () => {
    const N = 4500;

    const stateLive = makeFreshState(0xDEAD1234);
    const ctxLive = makeCtx();
    for (let i = 0; i < N; i++) step(stateLive, ctxLive);

    const stateBatch = makeFreshState(0xDEAD1234);
    const ctxBatch = makeCtx();
    await runCatchupBatch({ state: stateBatch, ctx: ctxBatch, totalSteps: N, wasCapped: false, chunkSteps: 1000 });

    assert.equal(hashState(stateLive), hashState(stateBatch),
      '5-day batch must produce identical hash to live run (G1)');
  });
});

// ---------------------------------------------------------------------------
// T1: Short outage and over-cap scenarios
// ---------------------------------------------------------------------------
describe('T1: Catch-up scenarios', () => {
  it('short outage (1 minute = 1200 steps)', async () => {
    const missedMs = 60_000; // 1 minute
    const capMs = 8 * 3600 * 1000;
    const totalSteps = catchupStepCount(missedMs, capMs);
    assert.equal(totalSteps, 1_200);

    const state = makeFreshState();
    const ctx = makeCtx();
    const result = await runCatchupBatch({ state, ctx, totalSteps, wasCapped: false });
    assert.equal(result.stepsRun, 1_200);
    assert.equal(result.interrupted, false);
  });

  it('over-cap: 100h outage → capped at 8h (576 000 steps)', async () => {
    const missedMs = 100 * 3600 * 1000;
    const capMs = 8 * 3600 * 1000;
    const totalSteps = catchupStepCount(missedMs, capMs);
    assert.equal(totalSteps, 576_000, 'Should cap at 576 000 steps');

    // Don't run full 576k steps in a unit test – just verify the count
    const state = makeFreshState();
    const ctx = makeCtx();
    // Run a small subset to verify machinery works
    const result = await runCatchupBatch({ state, ctx, totalSteps: 100, wasCapped: true });
    assert.equal(result.capped, true);
  });

  it('event in middle of batch: wasCapped flag carried correctly', async () => {
    // Simulate an over-cap scenario metadata
    const result = await runCatchupBatch({
      state: makeFreshState(),
      ctx: makeCtx(),
      totalSteps: 500,
      wasCapped: true,
    });
    assert.equal(result.capped, true);
    assert.equal(result.stepsRun, 500);
  });
});

// ---------------------------------------------------------------------------
// T2: Interrupt / stopPending / resume
// ---------------------------------------------------------------------------
describe('T2: Interrupt and resume', () => {
  it('state.engine.running=false stops batch mid-run', async () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    const totalSteps = 1000;
    const stopAt = 200;

    // Schedule stop: inject a handler that sets running=false at stopAt'th step
    let callCount = 0;
    // We'll wrap by using a small chunkSteps so we can monitor progress
    // Inject stop by registering a step-edge periodic that sets running=false
    const origStep = state.engine.curStep;
    let stopped = false;

    const result = await runCatchupBatch({
      state, ctx, totalSteps,
      wasCapped: false,
      chunkSteps: 50,
      onChunk: async (done) => {
        // Stop after first chunk (50 steps) by setting running=false from outside
        if (!stopped && done >= 50) {
          state.engine.running = false;
          stopped = true;
        }
        callCount++;
      },
    });

    // After setting running=false in onChunk, the next chunk will notice on 1st step
    assert.equal(result.interrupted, true, 'Should be interrupted when running=false');
    assert.ok(result.stepsRun < totalSteps, `stepsRun (${result.stepsRun}) should be < totalSteps (${totalSteps})`);
    assert.ok(result.stepsRun > 0, 'Some steps should have run before interruption');
  });

  it('resume (interrupted + continue) == single uninterrupted run (G1)', async () => {
    const N = 2000;
    const stopAt = 700; // stop after first 700 steps (simulated via chunk counting)

    // Path A: single uninterrupted run
    const stateA = makeFreshState(0xABCD1234);
    const ctxA = makeCtx();
    await runCatchupBatch({ state: stateA, ctx: ctxA, totalSteps: N, wasCapped: false });

    // Path B: interrupted at 700, then resumed for remaining 1300
    const stateB = makeFreshState(0xABCD1234);
    const ctxB = makeCtx();
    const resultB1 = await runCatchupBatch({
      state: stateB, ctx: ctxB,
      totalSteps: stopAt,
      wasCapped: false,
    });
    assert.equal(resultB1.stepsRun, stopAt, 'First leg should run exactly stopAt steps');
    // Resume: reset running (simulate user resuming)
    stateB.engine.running = true;
    const remainingSteps = N - stopAt;
    const resultB2 = await runCatchupBatch({
      state: stateB, ctx: ctxB,
      totalSteps: remainingSteps,
      wasCapped: false,
    });
    assert.equal(resultB2.stepsRun, remainingSteps, 'Second leg should complete remaining steps');

    // Both paths must produce identical hash
    assert.equal(hashState(stateA), hashState(stateB),
      'Interrupted+resumed must produce identical hash to single run (G1)');
  });
});

// ---------------------------------------------------------------------------
// Constants sanity
// ---------------------------------------------------------------------------
describe('catchup constants', () => {
  it('CATCHUP_CHUNK_STEPS is a positive number', () => {
    assert.ok(typeof CATCHUP_CHUNK_STEPS === 'number' && CATCHUP_CHUNK_STEPS > 0);
  });

  it('CATCHUP_PROGRESS_THRESHOLD_STEPS is a positive number', () => {
    assert.ok(typeof CATCHUP_PROGRESS_THRESHOLD_STEPS === 'number' && CATCHUP_PROGRESS_THRESHOLD_STEPS > 0);
  });

  it('CATCHUP_CHUNK_STEPS >= CATCHUP_PROGRESS_THRESHOLD_STEPS', () => {
    assert.ok(CATCHUP_CHUNK_STEPS >= CATCHUP_PROGRESS_THRESHOLD_STEPS);
  });
});
