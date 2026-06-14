/**
 * Buildings system: ageBuildings (daily wear), repair enqueueing, rebuildBuildingDerived,
 * buildersProcess (quarterDay builder advancement), completeBuild, applyRepair.
 * iter-013 M5-1 T1+T2+T4.
 *
 * Design source: design_iter-013_T-001.md §1, §2, §4.1–4.7 (M-1/M-2/M-3).
 *
 * Key invariants:
 *   - state.home.buildings[id].created === state.home.buildings[id].instances.length
 *   - rebuildBuildingDerived is the ONLY derivation path (called from load Step 5 AND mutations)
 *   - No Date.now / Math.random in core; RNG via rng.stream('buildings')
 *   - effective() uses deterministc sort by (source,id) before fold (M-3)
 *   - Save = ONLY catalogState.modifiers; home.derived/_effCache/_modVersion are NOT persisted
 *   - ONE canonical aggregates path: Σ effective(id, attr) — multiplicty baked into modifier.value
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { makeRng } from '../engine/rng.js';
import { getGoldValue } from './market.js';
import { byId, hasId } from '../catalog/loader.js';
import { canAfford, pay } from '../resources/transactions.js';
import { companyBuildersTotal, companyMasonTotal } from '../commands/buyCompany.js';
import { deriveWorkforceTotal } from './jobs.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAL = /** @type {any} */ (BALANCE).buildings;

// ---------------------------------------------------------------------------
// T4.1 — effective(itemId, attr, state) + fold with deterministic sort (M-3)
// ---------------------------------------------------------------------------

/**
 * Comparator for deterministic modifier sort.
 * Sort by (source, id) lexicographically — M-3, §4.1 design.
 * This ensures fold results are independent of insertion order.
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
function cmpModifier(a, b) {
  if (a.source !== b.source) return a.source < b.source ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Fold a set of modifiers onto a base value.
 * Operation order: add → mul → set.
 * Deterministc sort applied BEFORE fold (M-3): sort by (source, id) so that
 * 'set' picks the last modifier by that order, NOT by insertion order.
 *
 * @param {number} base
 * @param {any[]} mods
 * @returns {number}
 */
function fold(base, mods) {
  if (!mods.length) return base;

  // M-3: deterministic sort before fold — result independent of insertion order
  const sorted = mods.slice().sort(cmpModifier);

  // Step 1: add
  let result = base;
  for (const m of sorted) {
    if (m.op === 'add') result += m.value;
  }

  // Step 2: mul (each multiplier applied in sorted order)
  for (const m of sorted) {
    if (m.op === 'mul') result *= m.value;
  }

  // Step 3: set — last after sort wins (M-3)
  for (const m of sorted) {
    if (m.op === 'set') result = m.value;
  }

  return result;
}

/**
 * Get the base attribute value for a building from the catalog.
 * Supports dot-path for map attributes (e.g. 'baseCost.wood').
 * @param {string} itemId
 * @param {string} attr
 * @returns {any}
 */
function baseAttr(itemId, attr) {
  if (!hasId(itemId)) return 0;
  const entry = /** @type {Record<string, any>} */ (byId(itemId).entry);
  const parts = attr.split('.');
  let val = /** @type {any} */ (entry);
  for (const p of parts) {
    if (val == null || typeof val !== 'object') return 0;
    val = val[p];
  }
  return val !== undefined ? val : 0;
}

/**
 * Effective attribute value for a building item (with modifier fold).
 * T4.1: Full modifier fold (add→mul→set, deterministc sort by (source,id), memoized).
 *
 * For map attributes without dot-path (e.g. 'baseCost'), returns a reconstructed map:
 *   { k: effective(id, 'baseCost.k', state) } for each key in the base map.
 *
 * @param {string} itemId
 * @param {string} attr
 * @param {GameState} state
 * @returns {number | Record<string, number>}
 */
export function effective(itemId, attr, state) {
  const base = baseAttr(itemId, attr);

  // Map attribute (no dot-path) → reconstruct map via dot-path per key
  if (typeof base === 'object' && base !== null) {
    /** @type {Record<string, number>} */
    const result = {};
    for (const k of Object.keys(base)) {
      result[k] = /** @type {number} */ (effective(itemId, `${attr}.${k}`, state));
    }
    return result;
  }

  const numBase = typeof base === 'number' ? base : 0;

  // T4.2: memoization cache (plain object, JSON-serializable)
  const cs = /** @type {any} */ (state.catalogState);

  // Ensure cache is initialized (lazy: first call after load/invalidate re-initializes)
  ensureCache(cs);

  const cacheKey = `${itemId}:${attr}`;
  const cached = cs._effCache.map[cacheKey];
  if (cached !== undefined) return cached;

  // Filter relevant modifiers
  const mods = /** @type {any[]} */ (cs.modifiers).filter(
    (m) => m.target === itemId && m.attr === attr
  );

  const result = fold(numBase, mods);

  // Store in cache
  cs._effCache.map[cacheKey] = result;

  return result;
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
    result[k] = /** @type {number} */ (effective(buildingId, `${attr}.${k}`, state));
  }
  return result;
}

// ---------------------------------------------------------------------------
// T4.2 — Memoization + invalidation
// ---------------------------------------------------------------------------

/**
 * Bump the modifier version to invalidate the effective() cache.
 * Called every time catalogState.modifiers changes.
 * _modVersion and _effCache are NOT persisted (underscore prefix, not in allowlist).
 *
 * Note: _effCache.map uses a plain object (not Map) for JSON-serializability.
 * JSON.stringify includes _effCache/{_modVersion in hashState — both paths must agree.
 * @param {GameState} state
 */
export function invalidateModifiers(state) {
  const cs = /** @type {any} */ (state.catalogState);
  // Initialize _modVersion if not present
  if (typeof cs._modVersion !== 'number') {
    cs._modVersion = 0;
  }
  cs._modVersion += 1;

  // Rebuild cache: plain object for JSON-serializability (not Map — Maps serialize as {})
  // Using plain object for map: cacheKey → value
  cs._effCache = {
    version: cs._modVersion,
    /** @type {Record<string, number>} */
    map: /** @type {Record<string, number>} */ ({}),
  };
}

/**
 * Ensure cache is initialized and valid. Called at the start of effective().
 * If version mismatch, resets the cache.
 * @param {any} cs - catalogState
 */
function ensureCache(cs) {
  if (typeof cs._modVersion !== 'number') {
    cs._modVersion = 0;
  }
  if (!cs._effCache || cs._effCache.version !== cs._modVersion) {
    cs._effCache = {
      version: cs._modVersion,
      map: /** @type {Record<string, number>} */ ({}),
    };
  }
}

// ---------------------------------------------------------------------------
// effectFromCatalog — read scalar effect values directly from effects[] (T2 helper, still used by buildersProcess)
// ---------------------------------------------------------------------------

/**
 * Read the sum of all 'add' effect values for the given attr from the building's effects array.
 * This is a T2 helper still used by buildersProcess for maxProjectQueue (which is not aggregated
 * in home.derived). For T4 modifier-fold use effective() instead.
 *
 * @param {string} buildingId
 * @param {string} attr
 * @returns {number}
 */
export function effectFromCatalog(buildingId, attr) {
  if (!hasId(buildingId)) return 0;
  const entry = /** @type {Record<string, any>} */ (byId(buildingId).entry);
  const effects = /** @type {any[]} */ (Array.isArray(entry.effects) ? entry.effects : []);
  let total = 0;
  for (const fx of effects) {
    if (fx.attr === attr && (fx.op === 'add' || fx.op === undefined)) {
      total += (fx.value ?? 0);
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// T4.3 — addBuildingModifiers / removeBuildingModifiers (effects → modifier mapping)
// ---------------------------------------------------------------------------

/**
 * Normalize building.effects to canonical atom array.
 * Supports:
 *   - Array form: [{ attr, op, value }, ...]  (canonical)
 *   - Object form: { workers: 5, attractiveness: 3 }  (legacy → default op='add')
 *
 * @param {any} effects
 * @returns {Array<{attr:string, op:'add'|'mul'|'set', value:number}>}
 */
function normalizeEffects(effects) {
  if (!effects) return [];
  if (Array.isArray(effects)) {
    return effects
      .filter((e) => e && typeof e.attr === 'string')
      .map((e) => ({
        attr: e.attr,
        op: e.op === 'mul' ? 'mul' : e.op === 'set' ? 'set' : 'add',
        value: typeof e.value === 'number' ? e.value : 0,
      }));
  }
  if (typeof effects === 'object') {
    return Object.entries(effects).map(([attr, val]) => ({
      attr,
      op: /** @type {'add'} */ ('add'),
      value: typeof val === 'number' ? val : 0,
    }));
  }
  return [];
}

/**
 * Add modifier entries for a building type based on its effects[].
 * Per-type aggregate (M-1): ONE modifier per (buildingId, attr, op), not per instance.
 * Multiplicty is baked into modifier.value according to op (§4.3 design):
 *   op='add' → value = atom.value * created
 *   op='mul' → value = atom.value  (mul is NOT stacked per instance, gap G-BUILD-MULSTACK)
 *   op='set' → value = atom.value  (set is absolute, independent of count)
 *
 * Called from rebuildBuildingDerived (idempotent: remove-all then re-add).
 * ALSO called directly from completeBuild/destroyInstance via rebuildBuildingDerived.
 *
 * @param {GameState} state
 * @param {string} buildingId
 */
export function addBuildingModifiers(state, buildingId) {
  if (!hasId(buildingId)) return;

  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);
  const b = buildings[buildingId];
  if (!b || b.created <= 0) return;

  const entry = /** @type {Record<string, any>} */ (byId(buildingId).entry);
  const atoms = normalizeEffects(entry.effects);
  if (atoms.length === 0) return;

  const created = b.created;
  const mods = /** @type {any[]} */ (state.catalogState.modifiers);

  for (const atom of atoms) {
    // Per-type modifier: one per (buildingId, attr, op)
    // id and source are deterministic (no instId) → stable across save/load
    let value;
    if (atom.op === 'add') {
      value = atom.value * created;
    } else if (atom.op === 'mul') {
      // G-BUILD-MULSTACK: mul NOT stacked per instance (BALANCE.buildings.mulPerInstance=false default)
      // Each building type provides the same mul regardless of count.
      value = atom.value;
    } else {
      // op='set': absolute value, independent of count
      value = atom.value;
    }

    mods.push({
      id: `bld:${buildingId}:${atom.attr}:${atom.op}`,
      source: `building:${buildingId}`,
      target: buildingId,
      attr: atom.attr,
      op: atom.op,
      value,
    });
  }
}

/**
 * Remove all modifier entries sourced from a given building type.
 * @param {GameState} state
 * @param {string} buildingId
 */
export function removeBuildingModifiers(state, buildingId) {
  const source = `building:${buildingId}`;
  const mods = /** @type {any[]} */ (state.catalogState.modifiers);
  let wi = 0;
  for (let ri = 0; ri < mods.length; ri++) {
    if (mods[ri].source === source) continue;
    mods[wi++] = mods[ri];
  }
  mods.length = wi;
}

/**
 * Remove ALL modifier entries with source starting with 'building:'.
 * Used by rebuildBuildingDerived to do a clean re-gen (idempotent).
 * @param {GameState} state
 */
function removeAllBuildingSourcedModifiers(state) {
  const mods = /** @type {any[]} */ (state.catalogState.modifiers);
  let wi = 0;
  for (let ri = 0; ri < mods.length; ri++) {
    if (typeof mods[ri].source === 'string' && mods[ri].source.startsWith('building:')) {
      continue; // drop
    }
    mods[wi++] = mods[ri];
  }
  mods.length = wi;
}

// ---------------------------------------------------------------------------
// T4.4 — recalcBuildingAggregates — ONE canonical path (M-1)
// ---------------------------------------------------------------------------

/**
 * Recalculate building aggregate derived fields.
 * ONE canonical path (M-1): Σ effective(id, attr) — multiplicty is already in modifier.value (§4.3).
 * NEVER multiply by created here → eliminates risk of double-counting.
 *
 * Updates state.home.derived.{maxWorkers, storageCapacity, attractiveness}.
 *
 * Called ONLY via rebuildBuildingDerived (from load Step 5 and from mutations §4.7).
 * Never call directly from load.js (reviewer grep: must go through rebuildBuildingDerived — M5-R1).
 *
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
    if (!hasId(buildingId)) continue;

    // T4.4: ONE path — effective() already includes multiplicty (created baked into modifier.value §4.3)
    // Do NOT multiply by created here.
    const entry = /** @type {Record<string, any>} */ (byId(buildingId).entry);
    const atoms = normalizeEffects(entry.effects);

    for (const atom of atoms) {
      // Only aggregate add-type effects (mul/set are modifiers on specific attrs, not counted here)
      if (atom.op !== 'add') continue;

      const attr = atom.attr;
      // effective() reads the modifier fold (which has created × value for 'add')
      const val = /** @type {number} */ (effective(buildingId, attr, state));

      if (attr === 'workers') {
        maxWorkers += val;
      } else if (attr === 'attractiveness') {
        attractiveness += val;
      } else if (attr.startsWith('storage.')) {
        const resource = attr.slice('storage.'.length);
        storageCapacity[resource] = (storageCapacity[resource] ?? 0) + val;
      }
      // maxActiveProjects / maxProjectQueue are read via effectFromCatalog in buildersProcess
      // (they're not aggregated into home.derived — they're per-buildingType capacity)
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
// T4.5 — Aggregate napojení (G-BUILDER-MASON: masonProvided → maxActiveProjects)
// ---------------------------------------------------------------------------

/**
 * Compute the total masonProvided from all owned builder companies.
 * Exposed so buildersProcess can add this to the builderHut-derived maxActiveProjects.
 * Design §3.2: masonProvided = extra maxActiveProjects from companies (G-BUILDER-MASON).
 * Re-exported via buyCompany.js; kept here as a proxy call.
 *
 * Note: workerSlots (T4.5) reads state.home.derived.maxWorkers in jobs.js.
 * Housing settlementLevel reads state.home.derived.attractiveness in housing.js.
 * Both are updated by recalcBuildingAggregates via rebuildBuildingDerived.
 *
 * @param {GameState} state
 * @returns {number}
 */
function getMasonProvided(state) {
  return companyMasonTotal(state);
}

// ---------------------------------------------------------------------------
// T4.6 — Shared derivation (M-2, §4.6)
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
 *   (b) Re-gen building modifiers into catalogState.modifiers (idempotent: remove-all then re-add)
 *   (c) Invalidate effective() cache (bump _modVersion)
 *   (d) Recalc aggregates via ONE canonical path (§4.4)
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
  //     Modifiers from other sources (M6 techs, events — source != 'building:*') stay untouched.
  removeAllBuildingSourcedModifiers(state);
  for (const buildingId of Object.keys(buildings)) {
    const b = buildings[buildingId];
    if (b && b.created > 0) {
      addBuildingModifiers(state, buildingId);
    }
  }

  // (c) Reset _modVersion to 0 then invalidate → always version=1 after full rebuild.
  // This ensures that hashState is IDENTICAL whether this is the N-th rebuild (mutation path)
  // or the 1st rebuild (load path). The absolute value of _modVersion does not affect
  // cache correctness (only the _effCache.version===_modVersion check matters).
  // Without this reset, _modVersion would differ between "fresh game after N mutations"
  // and "load after N mutations" → hashState mismatch.
  const cs = /** @type {any} */ (state.catalogState);
  cs._modVersion = 0; // reset to canonical base so next invalidateModifiers → version=1
  invalidateModifiers(state); // now _modVersion = 1, _effCache = { version:1, map:{} }

  // (d) Recalculate aggregates (ONE canonical path, M-1)
  // Note: effective() is memoized; ensureCache is called lazily inside effective()
  recalcBuildingAggregates(state);

  // (e) Keep workforce.total in sync with derived.maxWorkers (T4.5).
  // Since derived.maxWorkers contributes to workerSlots (jobs.js T4.5), workforce.total
  // must be re-derived here to keep the state self-consistent.
  // This mirrors load.js Step 5b but is called on every mutation too → single derivation path.
  if (state.home && state.home.workforce) {
    state.home.workforce.total = deriveWorkforceTotal(state);
  }
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

// ---------------------------------------------------------------------------
// completeBuild — finish a 'build' project (§2.2, §4.7)
// ---------------------------------------------------------------------------

/**
 * Complete a build project: create new instance, update totalMade, rebuild derived.
 * Called by buildersProcess when curProgress >= completionUnits.
 * Design §2.2: instances.push + created++ + totalMade++ → addBuildingModifiers (T4.3)
 *   + invalidateModifiers + recalcBuildingAggregates.
 *
 * Uses rebuildBuildingDerived (shared derivation path, M-2 §4.7) for idempotency.
 *
 * @param {GameState} state
 * @param {any} project
 * @param {TickContext} _ctx
 */
export function completeBuild(state, project, _ctx) {
  const { buildingId } = project;
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);

  // Ensure building slot exists
  if (!buildings[buildingId]) {
    buildings[buildingId] = { created: 0, totalMade: 0, instances: [] };
  }
  const b = buildings[buildingId];

  // instId = deterministc: `${buildingId}_${totalMade}` (home.js:284, no Date.now)
  const instId = `${buildingId}_${b.totalMade}`;

  // Get starting HP = effective resistance (uses modifier fold post-T4)
  const resistance = /** @type {number} */ (effective(buildingId, 'resistance', state)) || BAL.defaultResistance;

  b.instances.push({ instId, hp: resistance, inRepair: false });
  b.created = b.instances.length;
  b.totalMade += 1;

  // Shared derivation path (M-2 §4.7): re-derive modifiers + aggregates
  rebuildBuildingDerived(state);
}

// ---------------------------------------------------------------------------
// applyRepair — finish a 'repair' project (§2.2, §4.7)
// ---------------------------------------------------------------------------

/**
 * Apply a completed repair project: restore HP, clear inRepair flag.
 * Called by buildersProcess when curProgress >= completionUnits.
 * Design §2.2: inst.hp += resistance; inst.inRepair = false → recalcBuildingAggregates.
 *
 * @param {GameState} state
 * @param {any} project
 * @param {TickContext} _ctx
 */
export function applyRepair(state, project, _ctx) {
  const { buildingId, instId } = project;
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);
  const b = buildings[buildingId];
  if (!b) return;

  const inst = b.instances.find(/** @param {any} i */ (i) => i.instId === instId);
  if (!inst) return; // instance may have been destroyed while repair was in progress

  const resistance = /** @type {number} */ (effective(buildingId, 'resistance', state)) || BAL.defaultResistance;
  inst.hp = Math.min(inst.hp + resistance, resistance); // restore to full (capped at max)
  inst.inRepair = false;

  // Shared derivation path (M-2 §4.7): aggregates (repair does not change created/modifiers)
  recalcBuildingAggregates(state);
}

// ---------------------------------------------------------------------------
// buildersProcess — quarterDay builder advancement (§2.2, M5-D5)
// ---------------------------------------------------------------------------

/**
 * Builder system: advance building/repair projects each quarterDay.
 * Registered as 'buildings.builders', edge 'quarterDay', order 40 (after jobs.autoAssign order 30).
 *
 * Design §2.2, home.js:1720-1840 (port, determinized):
 *   - totalBuilders = state.home.jobs['builder']?.number ?? 0  (from M3 jobs)
 *   - maxActiveProjects from builderHut.created × effective('builderHut','maxActiveProjects')
 *     + masonProvided from owned builder companies (G-BUILDER-MASON, T4.5)
 *   - masonStep = BALANCE.buildings.masonStep (progress per quarterDay)
 *   - completionUnits = maxProgress × quarterDaysPerDay
 *   - for each active project (up to maxActiveProjects):
 *       if repair + !paid → try pay; else delay++
 *       if builders <= totalBuilders → progress += masonStep; totalBuilders -= builders
 *       else delay++
 *       if delay > requeueDelay → move to end of queue
 *       if progress >= completionUnits → completeBuild / applyRepair, remove from queue
 *
 * Catch-up-safe: no RNG, deterministic, runs cheaply 4×/day.
 * T3 (iter-013): builder company capacity (companyBuildersTotal) added to totalBuilders.
 * T4.5 (iter-013): masonProvided (companyMasonTotal) adds to maxActiveProjects (G-BUILDER-MASON).
 *
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function buildersProcess(state, _params, ctx) {
  const queue = /** @type {any[]} */ (state.home.projectQueue);
  if (!queue || queue.length === 0) return;

  const BAL_B = BAL;
  const masonStep = BAL_B.masonStep;
  const quarterDaysPerDay = BAL_B.quarterDaysPerDay;
  const requeueDelay = BAL_B.requeueDelay;

  // Total available builders from jobs (M3 builder job slot)
  // T3: builder companies supplement the basic job count (design §3.2, G-BUILDER-CAP).
  let totalBuilders = 0;
  const builderJob = /** @type {any} */ (state.home.jobs?.['builder']);
  if (builderJob) totalBuilders = builderJob.number || 0;
  // T3: add capacity from owned builder companies (buildersProvided per company)
  totalBuilders += companyBuildersTotal(state);

  // maxActiveProjects from builderHut (builderHut.effects: maxActiveProjects per hut)
  // G-BUILDER-MASON: add masonProvided from owned companies to maxActiveProjects
  const builderHut = /** @type {any} */ (state.home.buildings?.['builderHut']);
  const hutCreated = builderHut?.created ?? 0;
  let maxActiveProjects = BAL_B.maxActiveProjects; // fallback: 0
  if (hutCreated > 0) {
    // effectFromCatalog is the permanent helper for maxActiveProjects/maxProjectQueue:
    // these attrs have no top-level catalog base field and are not aggregated into home.derived,
    // so effective() (which reads baseAttr + modifier fold) returns 0 for them.
    // Per-hut capacity is read directly from effects[] and multiplied by instance count here.
    // This is NOT a T2 workaround — it is the correct read path for non-aggregated effect attrs.
    const perHut = effectFromCatalog('builderHut', 'maxActiveProjects');
    maxActiveProjects = perHut * hutCreated;
  }
  // T4.5 G-BUILDER-MASON: companies with masonProvided add extra active project slots
  maxActiveProjects += getMasonProvided(state);

  if (maxActiveProjects <= 0) return; // no builder hut → nothing to process

  // maxProjectQueue: only for the build command validation (not needed here)
  // (build.js checks projectQueue.length < maxProjectQueue before adding)

  // Process up to maxActiveProjects projects (rest wait)
  let activeSlot = 0;
  let qi = 0;

  while (qi < queue.length && activeSlot < maxActiveProjects) {
    const project = queue[qi];
    const completionUnits = project.maxProgress * quarterDaysPerDay;

    // Repair: pay cost before progressing (deferred payment, home.js:1732)
    if (project.type === 'repair' && !project.paid) {
      if (canAfford(state, project.cost)) {
        pay(state, project.cost, 'repair:' + project.buildingId);
        project.paid = true;
        project.delay = 0;
      } else {
        project.delay = (project.delay || 0) + 1;
        if (project.delay > requeueDelay) {
          // Move to end of queue
          queue.splice(qi, 1);
          queue.push({ ...project, delay: 0 });
          // Don't advance qi — next element is now at qi
          continue;
        }
        qi++;
        activeSlot++;
        continue;
      }
    }

    // Check if enough builders for this project
    if (project.builders <= totalBuilders) {
      project.curProgress = (project.curProgress || 0) + masonStep;
      totalBuilders -= project.builders;
      project.delay = 0;
    } else {
      project.delay = (project.delay || 0) + 1;
      if (project.delay > requeueDelay) {
        // Move to end of queue
        queue.splice(qi, 1);
        queue.push({ ...project, delay: 0 });
        continue; // next element is now at qi
      }
      qi++;
      activeSlot++;
      continue;
    }

    // Check completion
    if (project.curProgress >= completionUnits) {
      // Remove project from queue first, then complete
      queue.splice(qi, 1);
      if (project.type === 'build') {
        completeBuild(state, project, ctx);
      } else {
        applyRepair(state, project, ctx);
      }
      // Don't increment qi — element at qi is now the next project
      // Don't increment activeSlot — slot freed by completion
      continue;
    }

    qi++;
    activeSlot++;
  }
}
