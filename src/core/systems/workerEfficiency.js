/**
 * Worker efficiency daily – day edge, order 5.
 * Computes state.home.workerEfficiency from formulas.workerEfficiency().
 * Source: home.js:1901-1911.
 * In M3: all morale parts = 0, result = 1 (gap G-MORALE-M5).
 */

/** @typedef {import('../state/types.js').GameState} GameState */
/** @typedef {import('../state/types.js').TickContext} TickContext */

import { workerEfficiency } from '../balance/formulas.js';

/**
 * Worker efficiency daily – day edge, order 5 (BEFORE meals & production reads).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function workerEfficiencyDaily(state, _params, _ctx) {
  state.home.workerEfficiency = workerEfficiency({
    base: 1,
    // M5+ morale parts: minWorkerPenalty, leaderMorality, entertainmentOffset,
    //   goodSpiritsBonus, workerMorale → all 0 in M3 (gap G-MORALE-M5)
    curfew: false, // curfew tech is M5/M6
  });
}
