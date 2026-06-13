/**
 * Factory functions for HomeState and PlayerState.
 * iter-007 M2a-1: initial state factories.
 */

/**
 * Creates a fresh HomeState with seed defaults.
 * Reads balance.start section from catalog if available; falls back gracefully to hardcoded defaults.
 * @param {object} [catalog] - catalog (may contain balance.start overrides)
 * @returns {import('./types.js').HomeState}
 */
export function createHomeState(catalog) {
  // Try to read seed values from balance.start if provided via catalog
  /** @type {Record<string, unknown>} */
  const balanceCat = /** @type {any} */ (catalog);
  const start = (balanceCat && balanceCat.balance && /** @type {any} */ (balanceCat.balance).start)
    ? /** @type {Record<string, unknown>} */ (/** @type {any} */ (balanceCat.balance).start)
    : null;

  const tentCount = (start && typeof start['startTents'] === 'number') ? start['startTents'] : 5;
  const startPop = (start && typeof start['startPopulation'] === 'number') ? start['startPopulation'] : 0;

  return {
    population: { total: startPop, migrationAcc: 0, bornTotal: 0, diedTotal: 0 },
    housing: { counts: { tent: tentCount } },
    food: { store: { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 } },
    health: { diseaseActive: false, diseaseDaysLeft: 0 },
    crime: { level: 0 },
    settlementLevel: 0,
  };
}

/**
 * Creates a fresh PlayerState with default values.
 * @returns {import('./types.js').PlayerState}
 */
export function createPlayerState() {
  return { gold: 0, techPt: 0, inventory: {} };
}
