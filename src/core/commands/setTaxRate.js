/**
 * setTaxRate command – sets player tax rate (clamped to [rateMin, rateMax]).
 * iter-010 M4a.
 */
import { registerCommand } from './dispatch.js';
import { BALANCE } from '../balance/balance.js';

/**
 * @param {object} state
 * @param {{ rate?: unknown }} params
 * @returns {{ ok: boolean, error?: string }}
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
 * @param {object} creg
 */
export function registerSetTaxRate(creg) {
  registerCommand(creg, 'setTaxRate', setTaxRate);
}
