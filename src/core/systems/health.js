/**
 * Health systems: births and disease lifecycle.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { natality, diseaseChance } from '../balance/formulas.js';
import { makeRng } from '../engine/rng.js';
import { getCatalog } from '../catalog/index.js';
import { calcHousingDerivedFromCatalog, DAYS_PER_YEAR } from './population.js';

/**
 * Get housing capacity (for birth cap).
 * @param {GameState} state
 * @returns {number} 0 means no capacity limit from counts
 */
function getHousingCapacity(state) {
  try {
    const cat = /** @type {any} */ (getCatalog('houseTypes'));
    const houseTypes = Array.isArray(cat.houseTypes) ? cat.houseTypes : [];
    const counts = state.home.housing.counts || {};
    return calcHousingDerivedFromCatalog(houseTypes, counts).capacity;
  } catch {
    return 0;
  }
}

/**
 * Health births - noon edge, order 10.
 * Births from the annual birth rate converted to a daily rate (applied daily at noon).
 * iter-012 A4 (T-008): annual matRate ÷ DAYS_PER_YEAR; result clamped by housing capacity
 * and by a global sanity hard-cap. No RNG → deterministic.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function healthBirths(state, _params, _ctx) {
  const born = natality(state.home.population.total, BALANCE.population.matRate / DAYS_PER_YEAR);
  if (born <= 0) return;

  const capacity = getHousingCapacity(state);
  const pop = state.home.population.total;
  // If capacity > 0 (tents have null capacity = no limit from their field), limit births
  const actualBorn = capacity > 0 ? Math.min(born, Math.max(0, capacity - pop)) : born;

  // Global sanity hard-cap: housing capacity wins when higher than sanityMaxPop.
  const sanityCap = Math.max(capacity, BALANCE.population.sanityMaxPop);
  const newTotal = Math.min(pop + actualBorn, sanityCap);
  const cappedBorn = newTotal - pop;

  state.home.population.total = newTotal;
  state.home.population.bornTotal = (state.home.population.bornTotal || 0) + Math.max(0, cappedBorn);
}

/**
 * Health disease - noon edge, order 30.
 * Disease check and lifecycle: start → countdown → end.
 * Uses 'population' RNG stream for determinism.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function healthDisease(state, _params, _ctx) {
  const rng = makeRng(state, 'population');
  const health = state.home.health;
  const pop = state.home.population.total;

  if (!health.diseaseActive) {
    // Check if disease starts
    const chance = diseaseChance(pop, BALANCE.health);
    if (rng.chance(chance)) {
      health.diseaseActive = true;
      health.diseaseDaysLeft = BALANCE.health.diseaseDurationDays;
    }
  } else {
    // Disease is active: apply deaths
    const deaths = Math.floor(pop * BALANCE.health.diseaseDeathFraction);
    if (deaths > 0) {
      state.home.population.total = Math.max(0, pop - deaths);
      state.home.population.diedTotal = (state.home.population.diedTotal || 0) + deaths;
    }
    health.diseaseDaysLeft = (health.diseaseDaysLeft || 1) - 1;
    if (health.diseaseDaysLeft <= 0) {
      health.diseaseActive = false;
      health.diseaseDaysLeft = 0;
    }
  }
}
