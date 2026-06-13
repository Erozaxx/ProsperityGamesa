/**
 * Population systems: migration accumulator and retirement.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { natality } from '../balance/formulas.js';
import { getCatalog } from '../catalog/index.js';

/**
 * Days per game year. iter-012 A4 (T-008): 4 seasons × seasonDays (= 364),
 * consistent with stepsPerSeason (81900 = 900 × 91) and stepsPerDay (900).
 * Used to convert annual birth/retirement rates to per-day rates (systems run daily).
 * @type {number}
 */
export const DAYS_PER_YEAR = 4 * BALANCE.season.seasonDays;

/**
 * Global sanity hard-cap on population given current housing capacity.
 * Housing capacity wins when it exceeds the MVP sanity ceiling.
 * @param {number} housingCapacity
 * @returns {number}
 */
export function populationSanityCap(housingCapacity) {
  return Math.max(housingCapacity, BALANCE.population.sanityMaxPop);
}

/**
 * Compute housing-derived values from a houseTypes catalog and housing counts.
 * @param {Array<{id: string, capacity: number|null, workers: number, attractiveness: number}>} catalog
 * @param {Record<string, number>} counts
 * @returns {{ capacity: number, workerSlots: number, attractiveness: number }}
 */
export function calcHousingDerivedFromCatalog(catalog, counts) {
  let capacity = 0;
  let workerSlots = 0;
  let attractiveness = 0;
  for (const entry of catalog) {
    const count = counts[entry.id] || 0;
    if (count === 0) continue;
    if (entry.capacity != null) {
      capacity += entry.capacity * count;
    }
    workerSlots += (entry.workers || 0) * count;
    attractiveness += (entry.attractiveness || 0) * count;
  }
  return { capacity, workerSlots, attractiveness };
}

/**
 * Get houseTypes catalog entries, returning empty array if not loaded.
 * @returns {Array<any>}
 */
function getHouseTypesCatalog() {
  try {
    const cat = /** @type {any} */ (getCatalog('houseTypes'));
    return Array.isArray(cat.houseTypes) ? cat.houseTypes : [];
  } catch {
    return [];
  }
}

/**
 * Migration accumulator - step edge, order 10.
 * Fractional accumulation; when acc >= 1 add floor'd amount to population (capped by housing).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function populationMigration(state, _params, _ctx) {
  const houseTypes = getHouseTypesCatalog();
  const counts = state.home.housing.counts || {};
  const { capacity, attractiveness } = calcHousingDerivedFromCatalog(houseTypes, counts);

  const stepsPerDay = BALANCE.engine.stepsPerDay;
  const migrationRatePerStep = attractiveness / (stepsPerDay * 10);

  state.home.population.migrationAcc = (state.home.population.migrationAcc || 0) + migrationRatePerStep;

  const toAdd = Math.floor(state.home.population.migrationAcc);
  if (toAdd >= 1) {
    state.home.population.migrationAcc -= toAdd;
    const pop = state.home.population.total;
    // Limit by housing capacity (0 capacity means no limit from capacity field)
    const limit = capacity > 0 ? capacity - pop : Number.MAX_SAFE_INTEGER;
    const actualAdd = Math.max(0, Math.min(toAdd, limit));
    // iter-012 A4 (T-008): apply the global sanity hard-cap uniformly (symmetric with births).
    // R-A4-3: the cap only prevents NEW growth past it; an already-over-cap loaded
    // ("exploded") save must never be shrunk back down — only future growth is stopped.
    const sanityCap = populationSanityCap(capacity);
    state.home.population.total = pop >= sanityCap ? pop : Math.min(pop + actualAdd, sanityCap);
  }
}

/**
 * Population retirement - noon edge, order 20.
 * Applies the annual retirement/attrition rate converted to a daily rate (system runs daily).
 * iter-012 A4 (T-008): annual retRate ÷ DAYS_PER_YEAR. No RNG → deterministic.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function populationRetirement(state, _params, _ctx) {
  const died = natality(state.home.population.total, BALANCE.population.retRate / DAYS_PER_YEAR);
  state.home.population.total = Math.max(0, state.home.population.total - died);
  state.home.population.diedTotal = (state.home.population.diedTotal || 0) + died;
}
