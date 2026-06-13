/**
 * Housing system: settlement level calculation.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { settlementLevel } from '../balance/formulas.js';
import { getCatalog } from '../catalog/index.js';
import { calcHousingDerivedFromCatalog } from './population.js';

/**
 * Update settlement level based on housing attractiveness - day edge, order 20.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function housingSettlementLevel(state, _params, _ctx) {
  let houseTypes;
  try {
    const cat = /** @type {any} */ (getCatalog('houseTypes'));
    houseTypes = Array.isArray(cat.houseTypes) ? cat.houseTypes : [];
  } catch {
    houseTypes = [];
  }

  const counts = state.home.housing.counts || {};
  const { attractiveness } = calcHousingDerivedFromCatalog(houseTypes, counts);

  state.home.settlementLevel = settlementLevel(
    state.home.population.total,
    attractiveness,
    BALANCE.housing
  );
}
