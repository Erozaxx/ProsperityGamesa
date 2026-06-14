/**
 * 7-step load pipeline: validate → migrate → construct → apply → recalculate → invariants → return.
 * iter-007 M2a-1.
 */

import { createInitialState } from '../core/state/createInitialState.js';
import { PERSIST_SCHEMA } from './persistSchema.js';
import { migrate } from './migrations.js';
import { SAVE_VERSION } from './schema.js';
import { deriveWorkforceTotal } from '../core/systems/jobs.js';
import { rebuildBuildingDerived } from '../core/systems/buildings.js';

/**
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

/**
 * Validates envelope.
 * @param {{ saveVersion: number, payload: Record<string, any> }} rec
 */
function validateEnvelope(rec) {
  if (rec.saveVersion !== SAVE_VERSION) {
    throw new Error(`save: version mismatch ${rec.saveVersion} !== ${SAVE_VERSION}`);
  }
  const p = rec.payload;
  if (!p || typeof p !== 'object') throw new Error('save: payload missing or not an object');
  if (!p.meta || !p.engine || !p.season || !p.rng) {
    throw new Error('save: payload missing required fields (meta/engine/season/rng)');
  }
  if (!Number.isFinite(p.engine.curStep)) {
    throw new Error('save: engine.curStep is not finite');
  }
}

/**
 * Validates game state invariants after load.
 * @param {Record<string, any>} state
 */
function validateInvariants(state) {
  if (state.home && state.home.food && state.home.food.store) {
    for (const [id, val] of Object.entries(state.home.food.store)) {
      const v = /** @type {number} */ (val);
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`save: invariant violation: food.store.${id} = ${v} (must be >= 0)`);
      }
    }
  }
  if (state.home && state.home.population && state.home.population.total !== undefined) {
    const t = state.home.population.total;
    if (!Number.isFinite(t) || t < 0) {
      throw new Error(`save: invariant violation: population.total = ${t} (must be >= 0)`);
    }
  }
  if (state.player && state.player.gold !== undefined) {
    const g = state.player.gold;
    if (!Number.isFinite(g) || g < 0) {
      throw new Error(`save: invariant violation: player.gold = ${g} (must be >= 0)`);
    }
  }
}

/**
 * Apply a saved payload onto a fresh state using the PERSIST_SCHEMA allowlist.
 * @param {Record<string, any>} state
 * @param {Record<string, any>} payload
 */
function applyPayload(state, payload) {
  for (const key of ['meta', 'season', 'rng', 'log', 'achievements', 'catalogState', 'story']) {
    if (payload[key] !== undefined) state[key] = payload[key];
  }

  if (payload.engine) {
    state.engine.curStep = payload.engine.curStep ?? 0;
    state.engine.speed = payload.engine.speed ?? 1;
    state.engine.running = payload.engine.running ?? true;
    state.engine.schedule = payload.engine.schedule ?? [];
    state.engine.scheduleCount = payload.engine.scheduleCount ?? {};
    state.engine._seq = payload.engine._seq ?? 0;
  }

  if (payload.player) {
    for (const field of PERSIST_SCHEMA.player) {
      if (payload.player[field] !== undefined) state.player[field] = payload.player[field];
    }
  }

  if (payload.home) {
    if (payload.home.settlementLevel !== undefined)
      state.home.settlementLevel = payload.home.settlementLevel;

    if (payload.home.population) {
      for (const field of PERSIST_SCHEMA.population) {
        if (payload.home.population[field] !== undefined)
          state.home.population[field] = payload.home.population[field];
      }
    }
    if (payload.home.housing) {
      for (const field of PERSIST_SCHEMA.housing) {
        if (payload.home.housing[field] !== undefined)
          state.home.housing[field] = payload.home.housing[field];
      }
    }
    if (payload.home.food) {
      for (const field of PERSIST_SCHEMA.food) {
        if (payload.home.food[field] !== undefined)
          state.home.food[field] = payload.home.food[field];
      }
    }
    if (payload.home.health) {
      for (const field of PERSIST_SCHEMA.health) {
        if (payload.home.health[field] !== undefined)
          state.home.health[field] = payload.home.health[field];
      }
    }
    if (payload.home.crime) {
      for (const field of PERSIST_SCHEMA.crime) {
        if (payload.home.crime[field] !== undefined)
          state.home.crime[field] = payload.home.crime[field];
      }
    }

    // workerEfficiency (iter-009 M3)
    if (payload.home.workerEfficiency !== undefined) {
      state.home.workerEfficiency = payload.home.workerEfficiency;
    }

    // workforce (iter-009 M3) – only assigned; total is derived
    if (payload.home.workforce) {
      state.home.workforce = state.home.workforce || { total: 0, assigned: 0 };
      if (payload.home.workforce.assigned !== undefined)
        state.home.workforce.assigned = payload.home.workforce.assigned;
    }

    // jobs: per id { number, curStep } (iter-009 M3)
    if (payload.home.jobs) {
      state.home.jobs = state.home.jobs || {};
      for (const [jobId, jobData] of Object.entries(payload.home.jobs)) {
        const jd = /** @type {any} */ (jobData);
        state.home.jobs[jobId] = { number: jd.number || 0, curStep: jd.curStep || 0 };
      }
    }

    // skills: per id { progressing, curStep } – progPct is derived, not persisted (iter-009 M3)
    if (payload.home.skills) {
      state.home.skills = state.home.skills || {};
      for (const [skillId, skillData] of Object.entries(payload.home.skills)) {
        const sd = /** @type {any} */ (skillData);
        state.home.skills[skillId] = {
          progressing: sd.progressing || false,
          curStep: sd.curStep || 0,
          progPct: 0, // re-derived after load
        };
      }
    }

    // buildings: per id { created, totalMade, instances:[{instId,hp,inRepair}] } (iter-013 M5-1 T1)
    // created is re-derived in rebuildBuildingDerived (Step 5) from instances.length.
    if (payload.home.buildings) {
      state.home.buildings = state.home.buildings || {};
      for (const [buildingId, bData] of Object.entries(payload.home.buildings)) {
        const bd = /** @type {any} */ (bData);
        state.home.buildings[buildingId] = {
          created: bd.created || 0,
          totalMade: bd.totalMade || 0,
          instances: (bd.instances || []).map(/** @param {any} inst */ (inst) => ({
            instId: inst.instId || '',
            hp: typeof inst.hp === 'number' ? inst.hp : 0,
            inRepair: inst.inRepair || false,
          })),
        };
      }
    }

    // projectQueue: serialisable list of repair/build projects (iter-013 M5-1 T1)
    if (payload.home.projectQueue !== undefined) {
      state.home.projectQueue = payload.home.projectQueue;
    }

    // projectSeq: deterministic project ID counter (iter-013 M5-1 T1)
    if (payload.home.projectSeq !== undefined) {
      state.home.projectSeq = payload.home.projectSeq;
    }

    // ownedCompanies: purchased/hired builder companies (iter-013 M5-1 T3)
    if (payload.home.ownedCompanies !== undefined) {
      state.home.ownedCompanies = payload.home.ownedCompanies;
    }
  }

  if (payload.world) {
    // world.forest / world.field / world.mine (iter-009 M3)
    // Use merge: take saved values but ensure initial state provides defaults for missing fields
    for (const field of PERSIST_SCHEMA.world) {
      if (payload.world[field] !== undefined) {
        // Deep merge: initial state has default values; saved values overwrite
        if (state.world[field] && typeof state.world[field] === 'object' && typeof payload.world[field] === 'object') {
          Object.assign(state.world[field], payload.world[field]);
        } else {
          state.world[field] = payload.world[field];
        }
      }
    }
  }

  state.battle = payload.battle ?? null;

  // council: accounting state (iter-010 M4a)
  if (payload.council) {
    state.council = { current: payload.council.current, history: payload.council.history || [] };
  }

  // home.notEnoughMilitaryFunding (iter-010 M4a)
  if (payload.home && payload.home.notEnoughMilitaryFunding !== undefined) {
    state.home.notEnoughMilitaryFunding = payload.home.notEnoughMilitaryFunding;
  }
}

/**
 * Load and reconstruct a game state from a raw save payload.
 * Applies migrations, then merges into a fresh initial state to fill missing fields.
 * @param {Record<string, any>} rawPayload - The raw saved payload (may be outdated version)
 * @param {object} [_catalog] - Catalog (retained for signature compatibility; state is seeded by createInitialState)
 * @returns {GameState}
 */
export function loadAndReconstruct(rawPayload, _catalog) {
  // Wrap as rec for validateEnvelope (it expects {saveVersion, payload})
  // If rawPayload already has saveVersion at top level, wrap it; otherwise assume it IS the payload
  const rec = /** @type {{ saveVersion: number, payload: Record<string, any> }} */ (
    rawPayload.saveVersion !== undefined
      ? rawPayload
      : { saveVersion: SAVE_VERSION, payload: rawPayload }
  );

  // Step 1: validate envelope
  validateEnvelope(rec);

  // Step 2: migrate to current version
  const payload = /** @type {Record<string, any>} */ (migrate(rec.payload));

  // Step 3: clean construction
  const state = /** @type {Record<string, any>} */ (createInitialState({
    seed: payload.meta && payload.meta.seed,
    gameVersion: payload.meta && payload.meta.gameVersion,
  }));
  // A1 (iter-012 T-005): keep the seeded state from createInitialState (single seed path);
  // applyPayload (allowlist) overwrites persisted fields below, so old saves load correctly.

  // Step 4: apply payload via allowlist
  applyPayload(state, payload);

  // Step 5: recalculate derived fields (architecture §9.1 K11 — derived, NEVER persisted).
  //
  // Order matters: rebuildBuildingDerived FIRST (may populate derived.maxWorkers which
  // workforce derivation may eventually read), then deriveWorkforceTotal.
  //
  // (a) Buildings: re-derive created=instances.length, re-gen modifiers (TODO T4), recalc aggregates.
  //     Design M5-R1: MUST call the SAME fn as mutations — no load-only derivation branch.
  //     Reviewer gate: recalcBuildingAggregates/addBuildingModifiers must NOT be called
  //     directly from load.js — only through rebuildBuildingDerived.
  if (state.home) {
    rebuildBuildingDerived(/** @type {any} */ (state));
  }

  // (b) workforce.total is derived from population + housing.counts + houseTypes catalog.
  // It is NOT persisted (persistSchema.js); applyPayload restores only workforce.assigned.
  // Without this rebuild the first post-load quarterDay tick reads a stale workforce.total=0,
  // making jobsAccidents skip its 'population' RNG draw → desync vs the continuous sim
  // (DR-012-02). Rebuild here so the first post-load tick matches the uninterrupted run.
  if (state.home && state.home.workforce) {
    state.home.workforce.total = deriveWorkforceTotal(/** @type {any} */ (state));
  }

  // Step 6: validate invariants
  validateInvariants(state);

  // Step 7: return state
  return /** @type {GameState} */ (/** @type {unknown} */ (state));
}
