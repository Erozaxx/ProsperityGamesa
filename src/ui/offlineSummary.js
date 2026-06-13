/**
 * Pure model for the offline catch-up summary.
 * No DOM, no Preact - just data transformation.
 * M2b: offline summary model.
 */

import { STEP_MS } from '../core/engine/clock.js';

/** Number of steps per game day (matches balance.engine.stepsPerDay). */
const STEPS_PER_DAY = 900;

/**
 * @typedef {Object} OfflineSummaryModel
 * @property {number} missedMs - real milliseconds elapsed while offline
 * @property {boolean} wasCapped - whether the catch-up was capped
 * @property {number} stepsRun - number of simulation steps that were run
 * @property {number} gameDaysSimulated - approximate game days simulated
 * @property {number} realSecondsElapsed - real seconds elapsed while offline
 * @property {boolean} interrupted - whether the catch-up was interrupted
 */

/**
 * Build the offline summary model from catch-up result data.
 * @param {Object} opts
 * @param {number} opts.missedMs - real ms elapsed while offline
 * @param {boolean} opts.wasCapped - whether the total steps were capped
 * @param {number} opts.stepsRun - steps actually run during catch-up
 * @param {boolean} opts.interrupted - whether catch-up was interrupted
 * @returns {OfflineSummaryModel}
 */
export function buildOfflineSummary(opts) {
  const { missedMs, wasCapped, stepsRun, interrupted } = opts;
  const gameDaysSimulated = stepsRun / STEPS_PER_DAY;
  const realSecondsElapsed = missedMs / 1000;

  return {
    missedMs,
    wasCapped,
    stepsRun,
    gameDaysSimulated,
    realSecondsElapsed,
    interrupted,
  };
}

/**
 * Format the offline summary into a human-readable string.
 * @param {OfflineSummaryModel} model
 * @returns {string}
 */
export function formatOfflineSummary(model) {
  const days = model.gameDaysSimulated.toFixed(1);
  const hours = (model.realSecondsElapsed / 3600).toFixed(1);
  const cappedNote = model.wasCapped ? ' (zkráceno)' : '';
  const interruptedNote = model.interrupted ? ' (přerušeno)' : '';
  return `Byli jste offline ${hours}h. Dohnáno ${days} herních dní${cappedNote}${interruptedNote}.`;
}
