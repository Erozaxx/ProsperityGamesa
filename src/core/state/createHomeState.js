/**
 * Factory functions for HomeState and PlayerState.
 * iter-007 M2a-1: initial state factories.
 */

/**
 * Creates a fresh HomeState with seed defaults.
 * Seed values from BALANCE.start (approximated).
 * @param {object} [_catalog] - catalog (reserved for future use; unused in M2a-1)
 * @returns {import('./types.js').HomeState}
 */
export function createHomeState(_catalog) {
  return {
    population: { total: 0, migrationAcc: 0, bornTotal: 0, diedTotal: 0 },
    housing: { counts: { tent: 5 } }, // seed: 5 tents (provenance: approximated)
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
