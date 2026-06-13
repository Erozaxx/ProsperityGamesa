/**
 * Food systems: meal consumption and monthly spoilage.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { foodDemand, consumeFood, spoilage } from '../balance/formulas.js';
import { getCatalog } from '../catalog/index.js';
import { pay } from '../resources/transactions.js';

/**
 * Get food ids from catalog, falling back to default list.
 * @returns {string[]}
 */
function getFoodIds() {
  try {
    const cat = /** @type {any} */ (getCatalog('food'));
    if (Array.isArray(cat.food)) {
      return cat.food.map(/** @param {any} f */ (f) => f.id);
    }
  } catch {
    // fall through
  }
  return ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable'];
}

/**
 * Get spoilage rates from population catalog.
 * @returns {Record<string, number>}
 */
function getSpoilageRates() {
  try {
    const cat = /** @type {any} */ (getCatalog('population'));
    if (cat.population && cat.population.spoilage) {
      return cat.population.spoilage;
    }
  } catch {
    // fall through
  }
  return { bread: 0.08, cheese: 0.08, fish: 0.23, fruit: 0.22, meat: 0.18, vegetable: 0.14 };
}

/**
 * Process a single meal. Shared logic for meal1 and meal2.
 * @param {GameState} state
 * @param {TickContext} _ctx
 */
function processMeal(state, _ctx) {
  const demand = foodDemand(state.home.population.total, BALANCE.food.consumeFoodRate);
  const foodIds = getFoodIds();
  const store = state.home.food.store || {};

  const { consumed, starved } = consumeFood(store, demand, foodIds);

  // Deduct consumed food from store
  for (const [id, amount] of Object.entries(consumed)) {
    if (amount > 0) {
      state.home.food.store[id] = Math.max(0, (state.home.food.store[id] || 0) - amount);
    }
  }

  // Starvation deaths: fractional (0.001 per starved unit)
  if (starved > 0) {
    const deaths = Math.floor(starved * 0.001);
    if (deaths > 0) {
      state.home.population.total = Math.max(0, state.home.population.total - deaths);
    }
  }
}

/**
 * Meal 1 - day edge, order 10.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function meal1(state, _params, ctx) {
  processMeal(state, ctx);
}

/**
 * Meal 2 - noon edge, order 50.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function meal2(state, _params, ctx) {
  processMeal(state, ctx);
}

/**
 * Monthly food spoilage - month edge, order 10.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function foodSpoilage(state, _params, ctx) {
  const rates = getSpoilageRates();
  const store = state.home.food.store || {};

  for (const [foodId, rate] of Object.entries(rates)) {
    const current = store[foodId] || 0;
    if (current > 0) {
      const lost = spoilage(rate, current);
      if (lost > 0) {
        // pay via food handler → emit txEvent
        pay(state, { [foodId]: lost }, 'spoilage:food', ctx, state.engine.curStep);
      }
    }
  }
}
