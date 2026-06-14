/**
 * Buildings system: ageBuildings (daily wear), repair enqueueing, rebuildBuildingDerived.
 * iter-013 M5-1 T1.
 *
 * Design source: design_iter-013_T-001.md §1, §4.6, §4.7 (M-2).
 *
 * Key invariants:
 *   - state.home.buildings[id].created === state.home.buildings[id].instances.length
 *   - rebuildBuildingDerived is the ONLY derivation path (called from load Step 5 AND mutations)
 *   - No Date.now / Math.random in core; RNG via rng.stream('buildings')
 *   - Modifier/aggregate parts (T4) are stubbed as TODO placeholders here
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { makeRng } from '../engine/rng.js';
import { getGoldValue } from './market.js';
import { byId, hasId } from '../catalog/loader.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAL = /** @type {any} */ (BALANCE).buildings;

// ---------------------------------------------------------------------------
// Modifier helpers (T4 placeholder)
// ---------------------------------------------------------------------------

/**
 * Get the base attribute value for a building from the catalog.
 * Supports dot-path for map attributes (e.g. 'baseCost.wood').
 * @param {string} buildingId
 * @param {string} attr
 * @returns {number | Record<string, number>}
 */
function baseAttr(buildingId, attr) {
  if (!hasId(buildingId)) return 0;
  const entry = /** @type {Record<string, any>} */ (byId(buildingId).entry);
  const parts = attr.split('.');
  let val = /** @type {any} */ (entry);
  for (const p of parts) {
    if (val == null || typeof val !== 'object') return 0;
    val = val[p];
  }
  return val !== undefined ? val : 0;
}

/**
 * Effective attribute value for a building instance (with modifier fold).
 * TODO T4: Full modifier fold (add→mul→set, deterministc sort, memoization).
 * For T1, returns base catalog value only (no modifiers yet).
 * @param {string} buildingId
 * @param {string} attr
 * @param {GameState} _state
 * @returns {number}
 */
export function effective(buildingId, attr, _state) {
  const val = baseAttr(buildingId, attr);
  if (typeof val === 'number') return val;
  // Map attr (e.g. baseCost) without dot-path → return 0 (caller should use dot-path)
  return 0;
}

/**
 * Get effective map attribute (e.g. baseCost) as a full Record.
 * For each key in the base map, calls effective(id, 'attr.key', state).
 * @param {string} buildingId
 * @param {string} attr
 * @param {GameState} state
 * @returns {Record<string, number>}
 */
export function effectiveMap(buildingId, attr, state) {
  const base = baseAttr(buildingId, attr);
  if (typeof base !== 'object' || base === null) return {};
  /** @type {Record<string, number>} */
  const result = {};
  for (const k of Object.keys(base)) {
    result[k] = effective(buildingId, `${attr}.${k}`, state);
  }
  // For T1, just return base values since no modifiers yet
  for (const k of Object.keys(base)) {
    result[k] = /** @type {number} */ (base[k]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Modifier management (T4 placeholder)
// ---------------------------------------------------------------------------

/**
 * TODO T4.3: Add modifier entries for a building type based on its effects[].
 * Per-type aggregate: one modifier per (buildingId, attr, op), value = atom.value * created.
 * Currently a no-op placeholder — T4 implements the full mapping.
 * @param {GameState} _state
 * @param {string} _buildingId
 */
export function addBuildingModifiers(_state, _buildingId) {
  // TODO T4.3: implement effects → modifier mapping per design §4.3
  // modifier.id = `bld:${buildingId}:${attr}:${op}`
  // modifier.source = `building:${buildingId}`
  // value for op='add': atom.value * created
  // value for op='mul': atom.value ^ created
  // value for op='set': atom.value
}

/**
 * TODO T4.3: Remove all modifier entries sourced from a given building type.
 * @param {GameState} _state
 * @param {string} _buildingId
 */
export function removeBuildingModifiers(_state, _buildingId) {
  // TODO T4.3: filter state.catalogState.modifiers removing source === `building:${buildingId}`
}

/**
 * Remove ALL modifier entries with source starting with 'building:'.
 * Used by rebuildBuildingDerived to do a clean re-gen (idempotent).
 * @param {GameState} state
 */
function removeAllBuildingSourcedModifiers(state) {
  const mods = /** @type {any[]} */ (state.catalogState.modifiers);
  // Filter in-place
  let wi = 0;
  for (let ri = 0; ri < mods.length; ri++) {
    if (typeof mods[ri].source === 'string' && mods[ri].source.startsWith('building:')) {
      continue; // drop
    }
    mods[wi++] = mods[ri];
  }
  mods.length = wi;
}

/**
 * Bump the modifier version to invalidate the effective() cache.
 * TODO T4.2: full cache invalidation; for T1 this is a no-op since effective() doesn't cache yet.
 * @param {GameState} _state
 */
export function invalidateModifiers(_state) {
  // TODO T4.2: bump state.catalogState._modVersion
}

// ---------------------------------------------------------------------------
// Aggregate recalculation (T4 placeholder)
// ---------------------------------------------------------------------------

/**
 * Recalculate building aggregate derived fields.
 * ONE canonical path (M-1): Σ effective(id, attr) — multiplicty is in modifier value.
 * TODO T4.4: Full implementation with effective() fold. For T1, only iterates built buildings
 *   and reads base catalog values (no modifier fold yet).
 * @param {GameState} state
 */
export function recalcBuildingAggregates(state) {
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);

  let maxWorkers = 0;
  let attractiveness = 0;
  /** @type {Record<string, number>} */
  const storageCapacity = {};

  for (const buildingId of Object.keys(buildings)) {
    const b = buildings[buildingId];
    if (!b || b.created <= 0) continue;

    // TODO T4.4: replace base reads below with effective(buildingId, attr, state)
    // For T1, read directly from catalog (no modifier fold yet)
    if (!hasId(buildingId)) continue;
    const entry = /** @type {Record<string, any>} */ (byId(buildingId).entry);
    const effects = /** @type {any[]} */ (Array.isArray(entry.effects) ? entry.effects : []);

    for (const fx of effects) {
      const attr = /** @type {string} */ (fx.attr);
      const value = /** @type {number} */ (fx.value ?? 0);
      const op = fx.op ?? 'add';
      if (op !== 'add') continue; // T1: only add effects for now

      // Multiplicty: value * created (as T4.3 will embed into modifier value)
      const total = value * b.created;

      if (attr === 'workers') {
        maxWorkers += total;
      } else if (attr === 'attractiveness') {
        attractiveness += total;
      } else if (attr.startsWith('storage.')) {
        const resource = attr.slice('storage.'.length);
        storageCapacity[resource] = (storageCapacity[resource] ?? 0) + total;
      }
      // maxActiveProjects / maxProjectQueue → not in derived (used directly by builder)
    }
  }

  if (!state.home.derived) {
    /** @type {any} */ (state.home).derived = { maxWorkers: 0, storageCapacity: {}, attractiveness: 0 };
  }
  state.home.derived.maxWorkers = maxWorkers;
  state.home.derived.storageCapacity = storageCapacity;
  state.home.derived.attractiveness = attractiveness;
}

// ---------------------------------------------------------------------------
// Shared derivation (M-2, §4.6)
// ---------------------------------------------------------------------------

/**
 * SINGLE shared derivation path for all building-derived state.
 * Called from BOTH:
 *   (1) load.js Step 5 (after applyPayload)
 *   (2) every building mutation: completeBuild / destroyInstance / applyRepair (§4.7)
 *
 * NO load-only derivation logic allowed (M5-R1 / M-2).
 *
 * Steps:
 *   (a) Re-derive created = instances.length per building (drift protection)
 *   (b) Re-gen building modifiers into catalogState.modifiers  [TODO T4.3 — stub]
 *   (c) Recalc aggregates via ONE canonical path               [TODO T4.4 — partial T1]
 *
 * @param {GameState} state
 */
export function rebuildBuildingDerived(state) {
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);

  // (a) Re-derive created from instances (invariant: created === instances.length)
  for (const buildingId of Object.keys(buildings)) {
    const b = buildings[buildingId];
    if (!b) continue;
    const instances = Array.isArray(b.instances) ? b.instances : [];
    b.instances = instances;
    b.created = instances.length;
  }

  // (b) Re-gen building modifiers (idempotent: remove-all then re-add)
  //     TODO T4.3: addBuildingModifiers will populate catalogState.modifiers once implemented
  removeAllBuildingSourcedModifiers(state);
  for (const buildingId of Object.keys(buildings)) {
    const b = buildings[buildingId];
    if (b && b.created > 0) {
      addBuildingModifiers(state, buildingId); // no-op placeholder until T4
    }
  }
  invalidateModifiers(state); // no-op until T4.2

  // (c) Recalculate aggregates (ONE canonical path, M-1)
  recalcBuildingAggregates(state);
}

// ---------------------------------------------------------------------------
// Instance mutation helpers
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic project ID using state.home.projectSeq.
 * Replaces home.js:2344 Date.getTime() (which is non-deterministic).
 * @param {GameState} state
 * @returns {string}
 */
function deterministicProjectId(state) {
  const h = /** @type {any} */ (state.home);
  h.projectSeq = (h.projectSeq ?? 0) + 1;
  return `proj_${h.projectSeq}`;
}

/**
 * Destroy a building instance (HP <= 0 while already in repair → total loss).
 * Removes instance from array, decrements created, then calls rebuildBuildingDerived.
 * Source: design §1.2 destroyInstance.
 * @param {GameState} state
 * @param {string} buildingId
 * @param {string} instId
 * @param {TickContext} _ctx
 */
export function destroyInstance(state, buildingId, instId, _ctx) {
  const b = /** @type {any} */ (state.home.buildings[buildingId]);
  if (!b) return;
  const idx = b.instances.findIndex(/** @param {any} i */ (i) => i.instId === instId);
  if (idx === -1) return;
  b.instances.splice(idx, 1);
  b.created = b.instances.length;
  // Shared derivation path (M-2, §4.7): re-derive modifiers + aggregates
  rebuildBuildingDerived(state);
}

/**
 * Enqueue a repair project for a damaged instance.
 * Source: design §1.3, home.js:2328-2359. Platba je v builderu (paid:false).
 * Repair cost = round(getGoldValue(baseCost) / repairCostDivisor).
 * @param {GameState} state
 * @param {string} buildingId
 * @param {{ instId: string, hp: number }} inst
 * @param {TickContext} _ctx
 */
function enqueueRepair(state, buildingId, inst, _ctx) {
  const baseCostMap = effectiveMap(buildingId, 'baseCost', state);
  const repairGold = Math.round(getGoldValue(state, baseCostMap) / BAL.repairCostDivisor);
  const maxProgress = /** @type {number} */ (effective(buildingId, 'maxProgress', state));
  const builders = /** @type {number} */ (effective(buildingId, 'builders', state));

  /** @type {any} */
  const project = {
    id: deterministicProjectId(state),
    type: 'repair',
    buildingId,
    instId: inst.instId,
    curProgress: 0,
    maxProgress: Math.max(1, Math.round((maxProgress || 1) / BAL.repairProgressDivisor)),
    builders: builders || 1,
    cost: { gold: repairGold },
    paid: false,
    removable: false,
    delay: 0,
  };
  /** @type {any} */ (state.home).projectQueue.push(project);
}

// ---------------------------------------------------------------------------
// ageBuildings — daily wear system (M5-D2, §1.2)
// ---------------------------------------------------------------------------

/**
 * Daily building wear system. Registered as 'buildings.age', edge 'day', order 70.
 * Source: home.js:2309-2368, determinized (RNG via stream 'buildings', no Math.random).
 * Catch-up-safe: runs once per herní-day edge, no DOM, no Date.now.
 *
 * Algorithm per instance:
 *   - NaN guard HP
 *   - Winter: hp -= winterHpLoss
 *   - Probabilistic wear: if (rng.next() + ageBias) > hp/resistance → hp -= 1
 *   - If hp/resistance <= repairThreshold && !inRepair → enqueueRepair, inRepair=true
 *   - If inRepair && hp <= 0 → destroyInstance
 *
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function ageBuildings(state, _params, ctx) {
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);
  if (!buildings || Object.keys(buildings).length === 0) return;

  const rng = makeRng(state, /** @type {any} */ ('buildings'));
  const isWinter = state.season.curSeason === BAL.winterSeasonIndex;
  const ageBias = BAL.ageBias;
  const repairThreshold = BAL.repairThreshold;
  const winterHpLoss = BAL.winterHpLoss;
  const defaultResistance = BAL.defaultResistance;

  for (const buildingId of Object.keys(buildings)) {
    const b = buildings[buildingId];
    if (!b || !Array.isArray(b.instances) || b.instances.length === 0) continue;

    const resistance = /** @type {number} */ (effective(buildingId, 'resistance', state)) || defaultResistance;

    // Iterate over a copy of instance indices (destroyInstance mutates array)
    // Collect instIds to process (safe iteration even if array shrinks)
    const instIds = b.instances.map(/** @param {any} i */ (i) => i.instId);

    for (const instId of instIds) {
      // Re-fetch instance (may have been destroyed by a prior iteration)
      const inst = b.instances.find(/** @param {any} i */ (i) => i.instId === instId);
      if (!inst) continue;

      // NaN guard (home.js:2314)
      if (!Number.isFinite(inst.hp)) {
        inst.hp = resistance;
      }

      // Winter wear (home.js:2317-2318)
      if (isWinter) {
        inst.hp -= winterHpLoss;
      }

      // Probabilistic wear (home.js:2320)
      if ((rng.next() + ageBias) > inst.hp / resistance) {
        inst.hp -= 1;
      }

      // Repair trigger (home.js:2324)
      if (inst.hp / resistance <= repairThreshold && !inst.inRepair) {
        enqueueRepair(state, buildingId, inst, ctx);
        inst.inRepair = true;
      }

      // Destruction (inRepair + hp exhausted)
      if (inst.inRepair && inst.hp <= 0) {
        destroyInstance(state, buildingId, instId, ctx);
        // rebuildBuildingDerived is called inside destroyInstance
      }
    }
  }
}
