/**
 * Crime system: daily crime level adjustment and gold loss from incidents.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { crimeCount } from '../balance/formulas.js';
import { makeRng } from '../engine/rng.js';

/**
 * Crime daily - noon edge, order 40.
 * Adjusts crime level and applies gold loss from incidents.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function crimeDaily(state, _params, _ctx) {
  // Consume RNG to advance stream (keeps determinism even if no crime yet)
  makeRng(state, 'population');

  const pop = state.home.population.total;
  if (pop <= 0) return;

  const crime = state.home.crime;
  const basePerDay = BALANCE.crime.basePerDay;

  // City guard dampening (approximated - full city guard M4)
  // In M2a, no city guard → just baseline crime
  const guardDampening = 0.0005; // approximated: small constant reduction from guard presence

  // Crime level adjusts slowly
  const delta = basePerDay - guardDampening;
  crime.level = Math.min(1, Math.max(0, crime.level + delta));

  // Gold loss from crime incidents
  const incidents = crimeCount(pop, crime.level, BALANCE.crime);
  if (incidents > 0 && state.player && state.player.gold > 0) {
    const goldLoss = Math.min(Math.floor(incidents * 0.5), state.player.gold);
    state.player.gold = Math.max(0, state.player.gold - goldLoss);
  }
}
