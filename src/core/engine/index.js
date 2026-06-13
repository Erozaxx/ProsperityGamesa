/**
 * Public engine API re-export.
 */

export { step, advance, createAccumulator, STEP_MS, STEP_SECONDS, STEPS_PER_DAY, SPEED_FACTOR } from './clock.js';
export { scheduleInsert, scheduleDue, scheduleCancel, scheduleCountOf } from './scheduler.js';
export { stepInDay, isDayBoundary } from './timeEdges.js';
export { initRng, makeRng, hashState } from './rng.js';
export { runTick, registerCorePeriodics, TICK_ORDER } from './tickOrder.js';
export { catchupStepCount, runCatchupBatch, CATCHUP_CHUNK_STEPS, CATCHUP_PROGRESS_THRESHOLD_STEPS } from './catchup.js';
