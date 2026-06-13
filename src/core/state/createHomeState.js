/**
 * Factory functions for HomeState and PlayerState.
 * iter-007 M2a-1: initial state factories.
 * iter-009 M3: added jobs/skills/workforce/workerEfficiency fields.
 */

/**
 * Creates a fresh HomeState with neutral defaults (no catalog, no start seed).
 * A1 (iter-012 T-005): start values are seeded centrally in createInitialState from BALANCE.start.
 * @returns {import('./types.js').HomeState}
 */
export function createHomeState() {
  return {
    population: { total: 0, migrationAcc: 0, bornTotal: 0, diedTotal: 0 },
    housing: { counts: {} },
    food: { store: { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 } },
    health: { diseaseActive: false, diseaseDaysLeft: 0 },
    crime: { level: 0 },
    settlementLevel: 0,
    // iter-009 M3: production sub-domains
    jobs: {},           // per jobId: { number, curStep } – populated on first assignment
    skills: {},         // per skillId: { progressing, curStep, progPct }
    workforce: { total: 0, assigned: 0 },
    workerEfficiency: 1, // computed daily by workerEfficiency.daily (day order 5)
    // iter-010 M4a: economics
    notEnoughMilitaryFunding: false,
    store: {},
  };
}

/**
 * Creates a fresh PlayerState with default values.
 * @returns {import('./types.js').PlayerState}
 */
export function createPlayerState() {
  return { gold: 0, techPt: 0, inventory: {}, taxRate: 1, totWarriors: 0, totArchers: 0, diseaseFromColdChance: 0 };
}
