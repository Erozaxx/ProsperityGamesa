/**
 * Clock module: single step execution and accumulator-based game loop.
 * advance() is called by app/ each frame with a nowMs timestamp from outside.
 * Core never reads time directly (no Date.now / performance.now in core).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { runTick } from './tickOrder.js';

// MOVE TO balance.js @ M1 (source: design_iter-004_T-001 §3.1)
/** One step = 0.05 s game time */
export const STEP_SECONDS = 0.05;
/** One step in milliseconds */
export const STEP_MS = 50;
/** Steps per game day */
export const STEPS_PER_DAY = 900;
/** Speed multiplier map */
export const SPEED_FACTOR = /** @type {Record<number, number>} */ ({ 0: 0, 1: 1, 2: 2 });

/**
 * @typedef {{ accMs: number, lastTimeMs: number, frameBudget: number }} Accumulator
 */

/**
 * Creates a new accumulator for the game loop.
 * @param {number} nowMs - current time from app/ (performance.now)
 * @param {number} frameBudget - max steps per advance call
 * @returns {Accumulator}
 */
export function createAccumulator(nowMs, frameBudget) {
  return { accMs: 0, lastTimeMs: nowMs, frameBudget };
}

/**
 * Executes ONE simulation step. Increments curStep then runs tickOrder.
 * @param {GameState} state
 * @param {TickContext} ctx
 * @returns {void}
 */
export function step(state, ctx) {
  state.engine.curStep += 1;
  runTick(state, ctx);
}

/**
 * Advances the simulation by elapsed real time, respecting speed and frame budget.
 * Pass nowMs from app/ (performance.now) – core never reads time itself.
 * On pause (speed=0): accMs is zeroed (no debt accumulation during pause).
 * @param {Accumulator} acc
 * @param {GameState} state
 * @param {TickContext} ctx
 * @param {number} nowMs - current real time ms (from app/)
 * @returns {{ stepsRun: number, dirty: boolean }}
 */
export function advance(acc, state, ctx, nowMs) {
  const factor = SPEED_FACTOR[state.engine.speed] ?? 1;
  const elapsed = nowMs - acc.lastTimeMs;
  acc.lastTimeMs = nowMs;

  if (factor === 0) {
    // Pause: discard accumulated time (no catch-up after unpause)
    acc.accMs = 0;
    return { stepsRun: 0, dirty: false };
  }

  acc.accMs += elapsed * factor;
  const stepsDue = Math.floor(acc.accMs / STEP_MS);
  const steps = Math.min(stepsDue, acc.frameBudget);

  let i = 0;
  for (; i < steps; i++) {
    step(state, ctx);
    if (state.engine.running === false) break; // stopPending slot (M2+)
  }

  // Only deduct actually performed steps
  acc.accMs -= i * STEP_MS;
  return { stepsRun: i, dirty: i > 0 };
}