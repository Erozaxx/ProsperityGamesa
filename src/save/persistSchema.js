/**
 * Declarative persist allowlist. Only listed fields are saved.
 * Derived fields (capacity, etc.) are NEVER saved.
 * iter-007 M2a-1.
 * iter-009 M3: added jobs, skills, workforce, workerEfficiency, world.forest/field/mine.
 * Architecture §9.1 (K11): persist schema written simultaneously with systems.
 * NEVER SAVE: progPct (derived), workforce.total (derived), area/used (derived).
 */

export const PERSIST_SCHEMA = {
  player:     ['gold', 'techPt', 'inventory', 'taxRate', 'totWarriors', 'totArchers', 'diseaseFromColdChance'],
  population: ['total', 'migrationAcc', 'bornTotal', 'diedTotal'],
  housing:    ['counts'],
  food:       ['store'],
  health:     ['diseaseActive', 'diseaseDaysLeft'],
  crime:      ['level'],
  home:       ['settlementLevel', 'workerEfficiency'],  // + sub-domains
  // home.jobs: per id { number, curStep }
  // home.workforce: { assigned } (total is derived from housing)
  // home.skills: per id { progressing, curStep } (progPct is DERIVED – not saved)
  world:      ['zones', 'factions', 'forest', 'field', 'mine', 'marketState', 'caravan'],
  // world.forest: { curTrees, curAnimals, saplings, health, timeSinceLastFire, lastFire, consecutiveNoAnimal }
  // world.field:  { curLivestock, rodentInfestation, usedFarmLand, inspectTime }
  // world.mine:   { curOres }
  // world.zones, world.factions: legacy M7 placeholders preserved
  // world.marketState: per goodsId {available, max, baseline}  iter-011 M4b
  // world.caravan: {capacity, speed, sentOut, recGoods}  iter-011 M4b
  battle:     null,  // null = save entire or keep null
};

/**
 * Extract only allowlisted fields from state for persistence.
 * @param {object} state
 * @returns {Record<string, unknown>}
 */
export function applyPersist(state) {
  /** @type {Record<string, unknown>} */
  const payload = {};

  // Infrastructure fields - always save entirely
  for (const key of ['meta', 'season', 'rng', 'log', 'achievements', 'catalogState', 'story']) {
    if (/** @type {Record<string, unknown>} */ (state)[key] !== undefined) {
      payload[key] = /** @type {Record<string, unknown>} */ (state)[key];
    }
  }

  const s = /** @type {Record<string, any>} */ (state);

  // Engine - save specific fields only
  if (s.engine) {
    payload.engine = {
      curStep: s.engine.curStep,
      speed: s.engine.speed,
      running: s.engine.running,
      schedule: s.engine.schedule,
      scheduleCount: s.engine.scheduleCount,
      _seq: s.engine._seq,
      // frameBudget intentionally omitted - will be reset from defaults
    };
  }

  // player
  if (s.player) {
    /** @type {Record<string, unknown>} */
    const player = {};
    for (const field of PERSIST_SCHEMA.player) {
      if (s.player[field] !== undefined) player[field] = s.player[field];
    }
    payload.player = player;
  }

  // home and sub-domains
  if (s.home) {
    /** @type {Record<string, unknown>} */
    const home = {};
    // settlementLevel
    if (s.home.settlementLevel !== undefined) home.settlementLevel = s.home.settlementLevel;

    // population sub-domain
    if (s.home.population) {
      /** @type {Record<string, unknown>} */
      const population = {};
      for (const field of PERSIST_SCHEMA.population) {
        if (s.home.population[field] !== undefined)
          population[field] = s.home.population[field];
      }
      home.population = population;
    }

    // housing sub-domain (counts only, no derivates)
    if (s.home.housing) {
      /** @type {Record<string, unknown>} */
      const housing = {};
      for (const field of PERSIST_SCHEMA.housing) {
        if (s.home.housing[field] !== undefined)
          housing[field] = s.home.housing[field];
      }
      home.housing = housing;
    }

    // food sub-domain
    if (s.home.food) {
      /** @type {Record<string, unknown>} */
      const food = {};
      for (const field of PERSIST_SCHEMA.food) {
        if (s.home.food[field] !== undefined)
          food[field] = s.home.food[field];
      }
      home.food = food;
    }

    // health sub-domain
    if (s.home.health) {
      /** @type {Record<string, unknown>} */
      const health = {};
      for (const field of PERSIST_SCHEMA.health) {
        if (s.home.health[field] !== undefined)
          health[field] = s.home.health[field];
      }
      home.health = health;
    }

    // crime sub-domain
    if (s.home.crime) {
      /** @type {Record<string, unknown>} */
      const crime = {};
      for (const field of PERSIST_SCHEMA.crime) {
        if (s.home.crime[field] !== undefined)
          crime[field] = s.home.crime[field];
      }
      home.crime = crime;
    }

    // workerEfficiency (scalar)
    if (s.home.workerEfficiency !== undefined) {
      home.workerEfficiency = s.home.workerEfficiency;
    }

    // notEnoughMilitaryFunding flag (iter-010 M4a)
    if (s.home.notEnoughMilitaryFunding !== undefined) {
      home.notEnoughMilitaryFunding = s.home.notEnoughMilitaryFunding;
    }

    // workforce (only assigned – total is derived)
    if (s.home.workforce) {
      home.workforce = { assigned: s.home.workforce.assigned || 0 };
    }

    // jobs: per id { number, curStep } (iter-009 M3)
    if (s.home.jobs) {
      /** @type {Record<string, unknown>} */
      const jobs = {};
      for (const [jobId, jobState] of Object.entries(s.home.jobs)) {
        const j = /** @type {any} */ (jobState);
        jobs[jobId] = { number: j.number || 0, curStep: j.curStep || 0 };
      }
      home.jobs = jobs;
    }

    // skills: per id { progressing, curStep } (progPct is DERIVED, not saved; iter-009 M3)
    if (s.home.skills) {
      /** @type {Record<string, unknown>} */
      const skills = {};
      for (const [skillId, skillState] of Object.entries(s.home.skills)) {
        const sk = /** @type {any} */ (skillState);
        skills[skillId] = { progressing: sk.progressing || false, curStep: sk.curStep || 0 };
      }
      home.skills = skills;
    }

    // buildings: per id { created, totalMade, instances:[{instId,hp,inRepair}] } (iter-013 M5-1 T1)
    // NOTE: created is ALSO saved for consistency with original (re-derived from instances.length on load).
    // derived (maxWorkers/storageCapacity/attractiveness) and _effCache are NOT saved (derived on load).
    if (s.home.buildings) {
      /** @type {Record<string, unknown>} */
      const buildings = {};
      for (const [buildingId, bState] of Object.entries(s.home.buildings)) {
        const b = /** @type {any} */ (bState);
        /** @type {Array<{instId:string,hp:number,inRepair:boolean}>} */
        const instances = (b.instances || []).map(/** @param {any} inst */ (inst) => ({
          instId: inst.instId,
          hp: inst.hp,
          inRepair: inst.inRepair || false,
        }));
        buildings[buildingId] = {
          created: b.created || 0,
          totalMade: b.totalMade || 0,
          instances,
        };
      }
      home.buildings = buildings;
    }

    // projectQueue: serialisable repair/build project list (iter-013 M5-1 T1)
    if (s.home.projectQueue !== undefined) {
      home.projectQueue = s.home.projectQueue;
    }

    // projectSeq: monotonic counter for deterministic project IDs (iter-013 M5-1 T1)
    if (s.home.projectSeq !== undefined) {
      home.projectSeq = s.home.projectSeq;
    }

    payload.home = home;
  }

  // world: forest/field/mine sub-domains (iter-009 M3)
  if (s.world) {
    /** @type {Record<string, unknown>} */
    const world = {};
    for (const field of PERSIST_SCHEMA.world) {
      if (s.world[field] !== undefined) world[field] = s.world[field];
    }
    payload.world = world;
  }

  // battle: null or full
  payload.battle = s.battle ?? null;

  // council: accounting state (iter-010 M4a)
  if (s.council) {
    payload.council = { current: s.council.current, history: s.council.history };
  } else {
    payload.council = undefined;
  }

  return payload;
}
