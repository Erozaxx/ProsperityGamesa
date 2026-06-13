/**
 * Declarative persist allowlist. Only listed fields are saved.
 * Derived fields (capacity, etc.) are NEVER saved.
 * iter-007 M2a-1.
 */

export const PERSIST_SCHEMA = {
  player:     ['gold', 'techPt', 'inventory'],
  population: ['total', 'migrationAcc', 'bornTotal', 'diedTotal'],
  housing:    ['counts'],
  food:       ['store'],
  health:     ['diseaseActive', 'diseaseDaysLeft'],
  crime:      ['level'],
  home:       ['settlementLevel'],  // + sub-domains
  world:      ['zones', 'factions'],
  battle:     null,  // null = save entire or keep null
};

/**
 * Extract only allowlisted fields from state for persistence.
 * @param {object} state
 * @returns {object}
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

    payload.home = home;
  }

  // world
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

  return payload;
}
