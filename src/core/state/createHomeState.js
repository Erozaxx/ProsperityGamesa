/**
 * Factory functions for HomeState and PlayerState.
 * iter-007 M2a-1: initial state factories.
 * iter-009 M3: added jobs/skills/workforce/workerEfficiency fields.
 * iter-013 M5-1: added buildings/projectQueue/projectSeq/derived fields (T1).
 * iter-013 M5-1 T3: added ownedCompanies (builder companies state).
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
    // iter-013 M5-1 T1: buildings state + project queue
    // buildings: per buildingId { created, totalMade, instances:[{instId,hp,inRepair}] }
    // Sub-tree is empty in new game; entries are created lazily on first build (like jobs).
    buildings: {},
    // projectQueue: serialisable project array (build/repair). Populated by build command (T2)
    // and repair enqueue (T1 ageBuildings). Required for repair projects even in T1.
    projectQueue: [],
    // projectSeq: monotonic counter for deterministic project IDs (no Date.now).
    projectSeq: 0,
    // derived: non-persistent aggregates rebuilt by rebuildBuildingDerived.
    // _-prefix sub-fields are excluded from persist allowlist (§4.5 design).
    derived: {
      maxWorkers: 0,        // Σ effective(id,'workers') across built buildings
      storageCapacity: {},  // per resource: Σ effective(id,'storage.<resource>')
      attractiveness: 0,    // Σ effective(id,'attractiveness')
    },
    // ownedCompanies: set of company IDs that have been purchased/hired (iter-013 M5-1 T3).
    // Design §3.2: companies are an optional unlock/boost (G-BUILDER-COMPANIES).
    // Key = companyId, value = true (owned). Populated by buyCompany command.
    ownedCompanies: {},
  };
}

/**
 * Creates a fresh PlayerState with default values.
 * @returns {import('./types.js').PlayerState}
 */
export function createPlayerState() {
  return { gold: 0, techPt: 0, inventory: {}, taxRate: 1, totWarriors: 0, totArchers: 0, diseaseFromColdChance: 0 };
}
