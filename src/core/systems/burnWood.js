/**
 * burnWood – daily firewood consumption (day edge, order 60).
 * Source: home.js:470-498. iter-010 M4a.
 * gap G-FIREWOOD-SOURCE (M5): no firewood producer in M4a; canAfford will mostly be false.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { pay, canAfford } from '../resources/transactions.js';
import { firewoodNeeds } from '../balance/formulas.js';

/**
 * burnWood – day edge, order 60 (after meal1).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function burnWood(state, _params, ctx) {
  const cw = (state.home.workforce && state.home.workforce.assigned) || state.home.population.total;
  const season = state.season.curSeason;
  const needs = firewoodNeeds(cw, season);
  if (needs <= 0) {
    if (state.player.diseaseFromColdChance > 0) state.player.diseaseFromColdChance = 0;
    return;
  }
  if (canAfford(state, { firewood: needs })) {
    pay(state, { firewood: needs }, 'burn:firewood', ctx, state.engine.curStep);
    // cold disease relief (home.js:488-492)
    const c = state.player.diseaseFromColdChance || 0;
    state.player.diseaseFromColdChance = c >= 3 ? c - 3 : 0;
  } else {
    state.player.diseaseFromColdChance = (state.player.diseaseFromColdChance || 0) + 1;
  }
}
