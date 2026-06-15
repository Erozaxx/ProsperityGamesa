/**
 * marketHarness.mjs – deterministic headless market simulation helper (iter-020 C-020-A).
 *
 * Test-only helper (lives outside src/core → does NOT violate lint:core gate).
 * Builds strictly on the existing engine:
 *   createInitialState({seed}) + initRng(state) + marketInit(state, goods)
 *   marketDailyDrift / priceOf / buyingPrice / sellingPrice from systems/market.js
 *
 * NO Date.now, NO Math.random, NO DOM. Drift is purely deterministic (no RNG),
 * but state is still initRng'd for consistency and future extension (DR-020-01 §2.1).
 *
 * This is NOT a second market implementation – it only orchestrates existing core fns.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../../src/core/catalog/index.js';
import { createInitialState } from '../../src/core/state/createInitialState.js';
import { initRng } from '../../src/core/engine/rng.js';
import { marketInit, marketDailyDrift } from '../../src/core/systems/market.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');

/** @param {string} name */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/**
 * Load the goods catalog (and minimal companions byId needs) from disk.
 * priceOf → byId(goodsId) requires the 'goods' catalog to be registered.
 * Idempotent re-load is safe (loadCatalog overwrites).
 * @returns {Array<{id:string, basePrice:number, max:number, baselineFraction:number}>}
 */
export function loadGoods() {
  clearCatalogs();
  // 'goods' is the only catalog priceOf needs; load it so byId() resolves basePrice.
  loadCatalog('goods', loadJson('goods'));
  return /** @type {any} */ (loadJson('goods')).goods;
}

/**
 * Build a deterministic market state from a seed.
 * @param {number} [seed]
 * @returns {{ state: import('../../src/core/state/types.js').GameState,
 *             ctx: object,
 *             goods: Array<{id:string, basePrice:number, max:number, baselineFraction:number}> }}
 */
export function makeMarketState(seed = 0xCA11B) {
  const goods = loadGoods();
  const state = createInitialState({ seed });
  initRng(state);
  marketInit(state, goods);
  // Drift takes (state, params, ctx); ctx is unused by drift but kept for signature parity.
  const ctx = {};
  return { state, ctx, goods };
}

/** Typed accessor for the marketState record. */
export function marketOf(state) {
  return /** @type {Record<string, {available:number,max:number,baseline:number}>} */ (
    state.world.marketState
  );
}

/**
 * Run n deterministic drift days, returning a snapshot per good after each day.
 * Snapshot[i] is the state AFTER day (i+1). snapshots[i][id] = { available, baseline, max, dev }
 * where dev = |available - baseline| / baseline (relative deviation).
 * @param {import('../../src/core/state/types.js').GameState} state
 * @param {object} ctx
 * @param {number} n
 * @returns {Array<Record<string, {available:number,baseline:number,max:number,dev:number}>>}
 */
export function driftDays(state, ctx, n) {
  const ms = marketOf(state);
  /** @type {Array<Record<string, {available:number,baseline:number,max:number,dev:number}>>} */
  const snapshots = [];
  for (let d = 0; d < n; d++) {
    marketDailyDrift(state, {}, /** @type {any} */ (ctx));
    /** @type {Record<string, {available:number,baseline:number,max:number,dev:number}>} */
    const snap = {};
    for (const id in ms) {
      const m = ms[id];
      const dev = m.baseline === 0 ? 0 : Math.abs(m.available - m.baseline) / m.baseline;
      snap[id] = { available: m.available, baseline: m.baseline, max: m.max, dev };
    }
    snapshots.push(snap);
  }
  return snapshots;
}

/**
 * Empirically count drift days until |dev| ≤ tol for a single good (NOT a formula).
 * Mutates state. Returns Infinity-equivalent (maxDays+1) if not reached within maxDays.
 * @param {import('../../src/core/state/types.js').GameState} state
 * @param {object} ctx
 * @param {string} id
 * @param {number} tol  relative tolerance (e.g. 0.05)
 * @param {number} [maxDays]
 * @returns {number} number of drift days needed (1-based), or maxDays+1 if not reached
 */
export function recoveryDays(state, ctx, id, tol, maxDays = 200) {
  const ms = marketOf(state);
  for (let d = 1; d <= maxDays; d++) {
    marketDailyDrift(state, {}, /** @type {any} */ (ctx));
    const m = ms[id];
    const dev = m.baseline === 0 ? 0 : Math.abs(m.available - m.baseline) / m.baseline;
    if (dev <= tol) return d;
  }
  return maxDays + 1;
}

/**
 * Set every good to maximum sell-off: available = max (price floor, max deviation from baseline).
 * baseline = 0.5·max → initial gap = 0.5·max.
 * @param {import('../../src/core/state/types.js').GameState} state
 */
export function maxSellOff(state) {
  const ms = marketOf(state);
  for (const id in ms) {
    ms[id].available = ms[id].max;
  }
}
