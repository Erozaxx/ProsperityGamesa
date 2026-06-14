/**
 * Declarative persist allowlist. Only listed fields are saved.
 * Derived fields (capacity, etc.) are NEVER saved.
 * iter-007 M2a-1.
 * iter-009 M3: added jobs, skills, workforce, workerEfficiency, world.forest/field/mine.
 * Architecture §9.1 (K11): persist schema written simultaneously with systems.
 * NEVER SAVE: progPct (derived), workforce.total (derived), area/used (derived).
 */

export const PERSIST_SCHEMA = {
  // iter-015 M6 T1: added 'unlockedTechs' and 'research' to player allowlist (M6-D6, §1.5).
  // unlockedTechs: plain {[techId]:true} — serialisable as-is; derivates (modifiers) re-gen on load.
  // research: {sectors:{[sectorId]:{level,exp}}} — only level/exp saved; cap/progPct are derived.
  player:     ['gold', 'techPt', 'inventory', 'taxRate', 'totWarriors', 'totArchers', 'diseaseFromColdChance', 'unlockedTechs', 'research'],
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
  for (const key of ['meta', 'season', 'rng', 'log', 'achievements', 'story']) {
    if (/** @type {Record<string, unknown>} */ (state)[key] !== undefined) {
      payload[key] = /** @type {Record<string, unknown>} */ (state)[key];
    }
  }

  const s = /** @type {Record<string, any>} */ (state);

  // catalogState: save ONLY modifiers (never _effCache / _modVersion — those are derived).
  // Design §4.2/§4.5/T4.6 invariant 1: "Save = JEN catalogState.modifiers".
  // _effCache and _modVersion are rebuilt lazily on load via rebuildBuildingDerived (load Step 5).
  if (s.catalogState) {
    payload.catalogState = { modifiers: s.catalogState.modifiers ?? [] };
  }

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

    // store: general resource stockpile (ore/stone/wood/etc. from jobs/mines/forest)
    // iter-016 M7a-1: added to persist schema to fix round-trip determinism (M-2 gate)
    if (s.home.store !== undefined) {
      home.store = s.home.store;
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

    // ownedCompanies: set of purchased/hired builder company IDs (iter-013 M5-1 T3)
    // Key = companyId, value = true. Persisted as-is (plain serialisable object).
    if (s.home.ownedCompanies !== undefined) {
      home.ownedCompanies = s.home.ownedCompanies;
    }

    // contractQueue: serialisable contract list (iter-014 M5-2 T5)
    // Stored: id/type/status/cost/reward/deadlineStep/title/onComplete/onExpire/onReject (plain-data).
    // NOT stored: canComplete/daysLeft (derivates — computed in selectors).
    if (s.home.contractQueue !== undefined) {
      home.contractQueue = s.home.contractQueue;
    }

    // contractSeq: monotonic counter for deterministic contract IDs (iter-014 M5-2 T5)
    if (s.home.contractSeq !== undefined) {
      home.contractSeq = s.home.contractSeq;
    }

    payload.home = home;
  }

  // world: forest/field/mine sub-domains (iter-009 M3)
  // iter-016 M7a-1: zones and factions handled specially — save only dynamic state fields.
  if (s.world) {
    /** @type {Record<string, unknown>} */
    const world = {};
    for (const field of PERSIST_SCHEMA.world) {
      if (s.world[field] !== undefined) {
        if (field === 'zones') {
          // Save only dynamic state per zone (static fields re-hydrated from catalog on load)
          world.zones = Array.isArray(s.world.zones) ? s.world.zones.map((/** @type {any} */ z) => ({
            id:           z.id,
            liege:        z.liege,
            policy:       z.policy,
            numWorkers:   z.numWorkers,
            warriors:     z.warriors,
            archers:      z.archers,
            resources:    z.resources  || {},
            tribute:      z.tribute    || {},
            favour:       z.favour     || 0,
            goldStore:    z.goldStore   || 0,
            notEnoughGold:z.notEnoughGold || 0,
            curQuest:     z.curQuest   || null,
            // goldDemand/goldProduction: persisted despite design §8 classifying them as derived (re-derivable).
            // Intentional deviation (G-WORLD-PERSIST-DERIVED, severity:low, M9): pre-policy snapshot values must
            // survive save/load so fresh-vs-load hashState matches (M-2 hash stability). Removing persist would
            // require recalculating them identically on both create and load paths before hash comparison, which
            // adds complexity. Decision: keep persisted; revisit during M9 persist audit.
            goldDemand:    z.goldDemand    ?? 0,
            goldProduction:z.goldProduction ?? 0,
          })) : [];
        } else if (field === 'factions') {
          // Save only dynamic faction state (static fields re-hydrated from catalog on load).
          // If factions is an array (legacy/test format), save as-is.
          if (Array.isArray(s.world.factions)) {
            world.factions = s.world.factions;
          } else {
            /** @type {Record<string, any>} */
            const factionsSave = {};
            if (s.world.factions && typeof s.world.factions === 'object') {
              for (const [fid, f] of Object.entries(s.world.factions)) {
                const ff = /** @type {any} */ (f);
                factionsSave[fid] = {
                  state:        ff.state        ?? 0,
                  wantToAttack: ff.wantToAttack ?? false,
                  nextTarget:   ff.nextTarget   ?? null,
                };
              }
            }
            world.factions = factionsSave;
          }
        } else {
          world[field] = s.world[field];
        }
      }
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
