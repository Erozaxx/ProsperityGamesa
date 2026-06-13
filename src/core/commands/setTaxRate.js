/**
 * setTaxRate command – sets player tax rate (clamped to [rateMin, rateMax]).
 * iter-010 M4a.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { BALANCE } from '../balance/balance.js';

/**
 * @param {GameState} state
 * @param {{ rate?: unknown }} params
 * @returns {CommandResult}
 */
export function setTaxRate(state, params) {
  const rate = params.rate;
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return { ok: false, error: `setTaxRate: rate must be a finite number, got ${rate}` };
  }
  const { rateMin, rateMax } = BALANCE.tax;
  const clamped = Math.min(Math.max(rate, rateMin), rateMax);
  state.player.taxRate = clamped;
  return { ok: true };
}

/**
 * @param {CommandRegistry} creg
 */
export function registerSetTaxRate(creg) {
  registerCommand(creg, 'setTaxRate', setTaxRate);
}
