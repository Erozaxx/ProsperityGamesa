/**
 * Offline catch-up engine: runs the simulation forward to compensate for missed real time.
 * Pure core module - no DOM, no Date.now, no timers.
 * M2b: offline catch-up batch runner.
 */

import { step, STEP_MS } from './clock.js';

/** Default number of simulation steps to run per chunk before yielding. */
export const CATCHUP_CHUNK_STEPS = 25_000;

/** Minimum steps missed before a progress callback is fired. */
export const CATCHUP_PROGRESS_THRESHOLD_STEPS = 5_000;

/**
 * Compute the number of simulation steps to run for a given offline duration.
 * Clamps missedMs to [0, capRealMs] before converting to steps.
 * @param {number} missedMs - real milliseconds elapsed while offline
 * @param {number} capRealMs - maximum real ms to catch up (prevents excessively long catch-ups)
 * @returns {number} number of simulation steps to run
 */
export function catchupStepCount(missedMs, capRealMs) {
  const clamped = Math.max(0, Math.min(missedMs, capRealMs));
  return Math.floor(clamped / STEP_MS);
}

/**
 * Run a catch-up batch, executing steps in chunks and yielding between chunks.
 * Supports interruption (state.engine.running === false) and progress callbacks.
 *
 * @param {Object} deps
 * @param {import('../state/types.js').GameState} deps.state - game state (mutated in place)
 * @param {import('../state/types.js').TickContext} deps.ctx - engine context (registry + periodics)
 * @param {number} deps.totalSteps - total steps to run
 * @param {boolean} deps.wasCapped - whether the step count was capped at the real-time cap
 * @param {number} [deps.chunkSteps] - steps per chunk (defaults to CATCHUP_CHUNK_STEPS)
 * @param {(done: number, total: number) => Promise<void>} [deps.onChunk] - called after each chunk
 * @returns {Promise<{ stepsRun: number, stepsRequested: number, interrupted: boolean, capped: boolean }>}
 */
export async function runCatchupBatch(deps) {
  const { state, ctx, totalSteps, wasCapped } = deps;
  const chunkSteps = deps.chunkSteps ?? CATCHUP_CHUNK_STEPS;
  let done = 0;
  let interrupted = false;

  while (done < totalSteps) {
    const n = Math.min(chunkSteps, totalSteps - done);
    let i = 0;
    for (; i < n; i++) {
      step(state, ctx);
      if (state.engine.running === false) {
        interrupted = true;
        break;
      }
    }
    done += i;
    if (interrupted) break;
    if (deps.onChunk) await deps.onChunk(done, totalSteps);
  }

  return { stepsRun: done, stepsRequested: totalSteps, interrupted, capped: wasCapped };
}
