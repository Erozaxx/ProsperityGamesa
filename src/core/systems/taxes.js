/**
 * Tax collection systems: localTaxes (5days) and monthlyTaxes (month).
 * Source intent: home.js:825-831 (local), home.js:678-694 (monthly). iter-010 M4a.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { grant } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';
import { localTaxAmount, monthlyTaxAmount } from '../balance/formulas.js';
import { logEntry } from '../engine/log.js';

/**
 * curWorkers proxy: workforce.assigned (gap G-TAX-CURWORKERS).
 * @param {GameState} state
 * @returns {number}
 */
function curWorkers(state) {
  const wf = state.home.workforce;
  return (wf && typeof wf.assigned === 'number') ? wf.assigned : state.home.population.total;
}

/**
 * localTaxes – 5days edge, order 10. Source: home.js:825-831.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function localTaxes(state, _params, ctx) {
  const cw = curWorkers(state);
  const rate = state.player.taxRate ?? 1;
  const amt = localTaxAmount(cw, rate, BALANCE.tax.localRate);
  if (amt > 0) grant(state, { gold: amt }, 'tax:local', ctx, state.engine.curStep);
}

/**
 * monthlyTaxes – month edge, order 20. Source: home.js:678-694,843-848.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function monthlyTaxes(state, _params, ctx) {
  const cw = curWorkers(state);
  const rate = state.player.taxRate ?? 1;
  const amt = monthlyTaxAmount(cw, rate, BALANCE.tax.monthlyRate, BALANCE.tax.centerBase);
  if (amt > 0) {
    grant(state, { gold: amt }, 'tax:monthly', ctx, state.engine.curStep);
    logEntry(state, `Daně: vybráno ${amt} zlata`);
  }
}
