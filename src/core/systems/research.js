/**
 * Research system: researchDaily — per-sector exp accumulation + techPt production.
 * iter-015 M6 T3.
 *
 * Design source: design_iter-015.md §3 (M6-D7).
 * Port of original: doc/original_source/services/techs.js:46-138, determinized (no Math.random).
 *
 * Key invariants:
 *   - Runs on 'day' edge, order 75 (after buildings.age 70, before season; registered in tickOrder.js).
 *   - DETERMINISTIC: no Math.random, no Date.now, no DOM. (University RNG scholar bonus vynechán — G-RESEARCH-UNIV-RNG.)
 *   - CATCH-UP-SAFE: while(exp>=cap) loop handles multi-level-up in one batch tick.
 *   - exp sources: (1) jobs per category → sectorId, (2) academy/university via effective('academy','researchExp',state).
 *   - techPt production: grant(state, {techPt:1}, 'research:<sector>', ctx, step) per level-up.
 *   - No new RNG stream. State mutations only on state.player.research.sectors and state.player.techPt.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { techCap } from '../balance/formulas.js';
import { grant } from '../resources/transactions.js';
import { hasCatalog, getCatalog } from '../catalog/loader.js';
import { effective } from './buildings.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {string[]} */
const SECTOR_IDS = /** @type {any} */ (BALANCE).research.sectorIds;

/** @type {Record<string, string>} */
const JOB_SECTOR_MAP = /** @type {any} */ (BALANCE).research.jobSectorMap;

/** Research buildings that contribute researchExp per instance. */
const RESEARCH_BUILDINGS = /** @type {const} */ (['academy', 'university']);

// ---------------------------------------------------------------------------
// researchDaily — periodic system (day edge, order 75)
// ---------------------------------------------------------------------------

/**
 * Daily research tick: accumulate exp per sector from jobs + research buildings,
 * then level-up sectors where exp >= techCap(level) and grant techPt per level.
 *
 * Called by tickOrder.js registerCorePeriodics as a registered periodic.
 * ctx is always present here (tick fn, not command) → grant emits full tx audit.
 *
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function researchDaily(state, _params, ctx) {
  // (1) Accumulate exp from jobs per category (techs.js:54-60)
  //     For each active job (number>0), look up its category from the jobs catalog.
  //     Category maps to research sector via JOB_SECTOR_MAP.
  //     Design §3.2 step 1: expPoints[sectorId] += job.number

  /** @type {Record<string, number>} */
  const expPoints = {};
  for (const id of SECTOR_IDS) {
    expPoints[id] = 0;
  }

  const jobsCat = _getJobsCatalog(ctx);
  const jobsState = /** @type {Record<string, any>} */ (state.home.jobs ?? {});

  for (const def of jobsCat) {
    if (!def.category) continue;                       // 'bum' / uncategorized jobs (techs.js:56)
    if (def.category === 'builder') continue;          // builders excluded — noProduction
    const sectorId = JOB_SECTOR_MAP[def.category];
    if (!sectorId) continue;                           // unknown sector mapping → skip
    const jobSt = jobsState[def.id];
    if (!jobSt || jobSt.number <= 0) continue;
    expPoints[sectorId] += jobSt.number;
  }

  // (2) Academy/university buildings → bonus exp per built instance via effective()
  //     effective(buildingId, 'researchExp', state) reads catalog base + modifier fold.
  //     Distributed evenly to ALL sectors (min. sada — gap G-RESEARCH-ACADEMY-SECTOR).
  //     Design §3.2 step 2: for each researchBuilding in ['academy','university'] where created>0:
  //       perBuilding = effective(buildingId,'researchExp',state)
  //       for sectorId in SECTOR_IDS: expPoints[sectorId] += perBuilding * created

  const buildings = /** @type {Record<string, any>} */ (state.home.buildings ?? {});
  for (const buildingId of RESEARCH_BUILDINGS) {
    const bSt = buildings[buildingId];
    if (!bSt || bSt.created <= 0) continue;
    // effective() reads catalog base (researchExp) + any modifier (e.g. tech add on researchExp)
    // Returns 0 if catalog not loaded or attribute missing (safe by design).
    const perBuilding = /** @type {number} */ (effective(buildingId, 'researchExp', state));
    if (perBuilding <= 0) continue;
    const totalBonus = perBuilding * bSt.created;
    for (const sectorId of SECTOR_IDS) {
      expPoints[sectorId] += totalBonus;
    }
  }

  // (3) Accumulate exp + level-up + grant techPt (techs.js:104-134, determinized)
  //     while (exp >= techCap(level)): exp -= cap, level++, grant(techPt:1)
  //     Handles multiple level-ups in a single day tick (catch-up-safe).

  const research = /** @type {any} */ (state.player).research ?? { sectors: {} };
  if (!research.sectors) research.sectors = {};
  /** @type {any} */ (state.player).research = research;

  const curStep = state.engine.curStep;

  for (const sectorId of SECTOR_IDS) {
    const p = expPoints[sectorId];
    if (p <= 0) continue;

    // Lazy init per sector (design §3.1: sectors created lazily on first accumulation)
    let sec = research.sectors[sectorId];
    if (!sec) {
      sec = { level: 0, exp: 0 };
      research.sectors[sectorId] = sec;
    }

    sec.exp += p;

    // while-loop: catch-up-safe, handles multi-level-up in batch
    let cap = techCap(sec.level);
    while (sec.exp >= cap) {
      sec.exp -= cap;
      sec.level += 1;
      // Grant 1 techPt per sector level-up. ctx is always present (periodic fn).
      grant(state, { techPt: 1 }, 'research:' + sectorId, ctx, curStep);
      cap = techCap(sec.level);
    }
  }
}

// ---------------------------------------------------------------------------
// Catalog helper
// ---------------------------------------------------------------------------

/**
 * Get jobs catalog array. Uses ctx.catalog if available (BL-3), else hasCatalog fallback.
 * Mirrors pattern from jobs.js getJobsCatalog.
 * @param {TickContext} ctx
 * @returns {Array<any>}
 */
function _getJobsCatalog(ctx) {
  if (ctx && ctx.catalog && ctx.catalog.jobs) return ctx.catalog.jobs;
  if (!hasCatalog('jobs')) return [];
  const cat = /** @type {any} */ (getCatalog('jobs'));
  return Array.isArray(cat.jobs) ? cat.jobs : [];
}
