/**
 * Jobs system: production, accidents, autoAssign.
 * iter-009 M3 – progress model rewrite.
 *
 * Progress model (source: home.js:1510-1547):
 *   quarterDay: job.curStep += workerEfficiency * job.number
 *   completion when curStep > completionUnits = maxStep * STEPS_PER_DAY * number
 *   → grant products scaled by number, reset curStep = 0
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { hasCatalog, getCatalog } from '../catalog/index.js';
import { grant } from '../resources/transactions.js';
import { makeRng } from '../engine/rng.js';
import { BALANCE } from '../balance/balance.js';
import { logEntry } from '../engine/log.js';

const STEPS_PER_DAY = 900; // Source: balance.engine.stepsPerDay

/**
 * Get jobs catalog array. Uses ctx.catalog if available (BL-3), else hasCatalog fallback.
 * @param {TickContext} ctx
 * @returns {Array<any>}
 */
function getJobsCatalog(ctx) {
  // BL-3 Variante A: přednačtený ctx.catalog
  if (ctx.catalog && ctx.catalog.jobs) return ctx.catalog.jobs;
  // BL-3 Variante B fallback: hasCatalog místo try/catch
  if (!hasCatalog('jobs')) return [];
  const cat = /** @type {any} */ (getCatalog('jobs'));
  return Array.isArray(cat.jobs) ? cat.jobs : [];
}

/**
 * Compute total worker slots from housing catalog.
 * ctx is optional: when absent (load path), falls back to the module-global catalog.
 * @param {GameState} state
 * @param {TickContext} [ctx]
 * @returns {number}
 */
function workerSlots(state, ctx) {
  // Use ctx.catalog.houseTypes if available, else fallback
  const houseTypes = (ctx && ctx.catalog && ctx.catalog.houseTypes) ? ctx.catalog.houseTypes : (() => {
    if (!hasCatalog('houseTypes')) return [];
    const cat = /** @type {any} */ (getCatalog('houseTypes'));
    return Array.isArray(cat.houseTypes) ? cat.houseTypes : [];
  })();

  const counts = state.home.housing.counts || {};
  let slots = 0;
  for (const ht of houseTypes) {
    slots += (ht.workers || 0) * (counts[ht.id] || 0);
  }

  // T4.5 (iter-013 M5-1): add maxWorkers from buildings (derived aggregate, §4.4).
  // derived.maxWorkers = Σ effective(buildingId,'workers',state) across built buildings.
  // Gap G-POP-WORKFORCE: buildings add extra worker capacity on top of houseTypes slots.
  const derivedMaxWorkers = /** @type {any} */ (state.home).derived?.maxWorkers ?? 0;
  slots += derivedMaxWorkers;

  return slots;
}

/**
 * Canonical derivation of workforce.total (derived field, NEVER persisted).
 * Single source of truth shared by autoAssignWorkers (tick) and load.js (rebuild-on-load).
 * ctx is optional: workerSlots falls back to the module-global catalog when ctx is absent.
 * @param {GameState} state
 * @param {TickContext} [ctx]
 * @returns {number}
 */
export function deriveWorkforceTotal(state, ctx) {
  const slots = workerSlots(state, ctx);
  return Math.min(state.home.population.total, slots);
}

/**
 * Total assigned workers across all jobs.
 * @param {GameState} state
 * @returns {number}
 */
function totalAssigned(state) {
  const jobs = state.home.jobs;
  if (!jobs) return 0;
  return Object.values(jobs).reduce((s, j) => s + (j.number || 0), 0);
}

/**
 * Jobs production – quarterDay edge, order 10.
 * Progress model: curStep += eff * number; completion → grant products, reset.
 * BL-3: reads from ctx.catalog.jobs (no getCatalog/try/catch in hot-path).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function jobsProduction(state, _params, ctx) {
  const jobs = getJobsCatalog(ctx);
  if (!state.home.jobs) state.home.jobs = {};

  const eff = (state.home.workerEfficiency != null) ? state.home.workerEfficiency : 1;
  const defaultMaxStep = BALANCE.production ? BALANCE.production.defaultJobMaxStep : 0.005;

  for (const def of jobs) {
    if (!def.products || Object.keys(def.products).length === 0) continue;
    // builder / noProduction jobs are skipped
    if (def.noProduction === true || def.category === 'builder') continue;

    if (!state.home.jobs[def.id]) {
      state.home.jobs[def.id] = { number: 0, curStep: 0 };
    }
    const jobState = state.home.jobs[def.id];
    if (jobState.number <= 0) continue;

    const maxStep = (def.maxStep != null) ? def.maxStep : defaultMaxStep;
    const completionUnits = maxStep * STEPS_PER_DAY * jobState.number;

    jobState.curStep += eff * jobState.number;

    if (jobState.curStep > completionUnits) {
      // Scale products by number of workers (home.js:1380-1382)
      /** @type {Record<string, number>} */
      const scaled = {};
      for (const [id, amt] of Object.entries(def.products)) {
        scaled[id] = Math.round(/** @type {number} */ (amt) * jobState.number);
      }
      grant(state, scaled, 'job:' + def.id, ctx, state.engine.curStep);
      jobState.curStep = 0;
    }
  }
}

/**
 * Kill one worker from one of the specified job types (or any job if none specified).
 * @param {GameState} state
 * @param {string[]} jobIds - preferred job ids to kill from
 * @param {import('../state/types.js').Rng} rng
 */
function killOneWorker(state, jobIds, rng) {
  if (!state.home.jobs) return;

  // Prefer specified jobs first, fall back to any job with workers
  const targets = jobIds.filter(id => (state.home.jobs[id] && state.home.jobs[id].number > 0));
  if (targets.length === 0) {
    // Fall back to any job
    const all = Object.keys(state.home.jobs).filter(id => (state.home.jobs[id].number > 0));
    if (all.length === 0) return;
    targets.push(...all);
  }

  const idx = rng.int(targets.length);
  const jobId = targets[idx];
  state.home.jobs[jobId].number--;
  if (state.home.population.total > 0) state.home.population.total--;
  if (state.home.workforce) {
    state.home.workforce.assigned = totalAssigned(state);
  }
  logEntry(state, `Accident killed a worker (${jobId})`);
}

/**
 * Job accidents – quarterDay edge, order 20 (after production).
 * Source: home.js:1290-1316, config.js:3913 procAccident.
 * level<=1: wolf attack chance 0.005. level>=3 & workers>200: industrial accident.
 * Uses rng stream 'population' (shared with crime, deterministic ordering).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function jobsAccidents(state, _params, _ctx) {
  const level = state.home.settlementLevel || 0;
  const workers = state.home.workforce
    ? Math.min(state.home.population.total, state.home.workforce.total || 0)
    : state.home.population.total;

  if (workers <= 0) return;

  const rng = makeRng(state, 'population');
  const wolfChance = BALANCE.accidents ? BALANCE.accidents.wolfChance : 0.005;
  const highLevelFactor = BALANCE.accidents ? BALANCE.accidents.highLevelChanceFactor : 0.0001;
  const killChance = BALANCE.accidents ? BALANCE.accidents.procAccidentKillChance : 0.5;

  if (level <= 1) {
    // Wolf attack (home.js:1291)
    if (rng.next() < wolfChance) {
      killOneWorker(state, ['hunter', 'woodcutter', 'farmer'], rng);
    }
  } else if (level >= 3 && workers > 200) {
    // Industrial accident (home.js:1313)
    if (rng.next() < highLevelFactor * workers / 3) {
      // procAccident: hospital/nurse dampening is M5 → 50% kill chance (home.js:3926 else-branch)
      if (rng.next() < killChance) {
        killOneWorker(state, [], rng);
      }
    }
  }
}

/**
 * Auto-assign unemployed workers – quarterDay edge, order 30.
 * Distributes unemployed round-robin over auto-assignable jobs, respecting job.max.
 * Deterministic (no RNG): stable job order from catalog.
 * Only assigns if state.home.autoAssign !== false (default true).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function autoAssignWorkers(state, _params, ctx) {
  if (state.home.autoAssign === false) return;
  if (!state.home.jobs) return;

  const jobs = getJobsCatalog(ctx);
  if (jobs.length === 0) return;

  // Available workers = min(population, workerSlots) (gap G-POP-WORKFORCE M5).
  // deriveWorkforceTotal is the single source of truth (shared with load.js rebuild-on-load).
  const availableWorkers = deriveWorkforceTotal(state, ctx);
  const assigned = totalAssigned(state);
  let free = availableWorkers - assigned;

  // Always update workforce.total (derived, but must stay consistent with persist)
  if (state.home.workforce) {
    state.home.workforce.total = availableWorkers;
  }

  if (free <= 0) return;

  // Auto-assignable jobs in catalog order (deterministic, no RNG)
  const autoJobs = jobs.filter(def =>
    def.autoAssignable !== false &&
    def.noProduction !== true &&
    def.category !== 'builder'
  );

  // Round-robin: keep iterating until no free workers or no capacity
  let changed = true;
  while (free > 0 && changed) {
    changed = false;
    for (const def of autoJobs) {
      if (free <= 0) break;
      if (!state.home.jobs[def.id]) {
        state.home.jobs[def.id] = { number: 0, curStep: 0 };
      }
      const j = state.home.jobs[def.id];
      const max = def.max != null ? def.max : Infinity;
      if (j.number < max) {
        j.number++;
        free--;
        changed = true;
      }
    }
  }

  if (state.home.workforce) {
    state.home.workforce.assigned = totalAssigned(state);
  }
}
