/**
 * Market system: client-side market state, pricing, drift, getGoldValue, marketInject.
 * iter-011 M4b: T1 (pricing+marketInit), T2 (drift), T3 (getGoldValue/marketInject).
 * All functions are pure over state – no DOM, no RNG, deterministic.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { marketPrice, goldValue } from '../balance/formulas.js';
import { byId } from '../catalog/loader.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize marketState from goods catalog (idempotent: skips ids already present).
 * available = max = round(max * baselineFraction); baseline = same.
 * @param {GameState} state
 * @param {Array<{id:string, max:number, baselineFraction:number}>} goods
 */
export function marketInit(state, goods) {
  if (!state.world.marketState) state.world.marketState = {};
  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}>} */ (state.world.marketState);
  for (const good of goods) {
    if (ms[good.id]) continue; // idempotent: skip existing
    const baseline = Math.round(good.max * good.baselineFraction);
    ms[good.id] = {
      available: baseline,
      max: good.max,
      baseline,
    };
  }
}

// ---------------------------------------------------------------------------
// Price helpers (pure functions)
// ---------------------------------------------------------------------------

/**
 * Mid-market price for a good (before spread).
 * Uses formulas.marketPrice (cubic) with available/max from marketState.
 * @param {GameState} state
 * @param {string} goodsId
 * @returns {number}
 */
export function priceOf(state, goodsId) {
  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);
  const m = ms && ms[goodsId];
  if (!m) return 0;
  const entry = /** @type {any} */ (byId(goodsId).entry);
  return marketPrice(entry.basePrice, m.available, m.max);
}

/**
 * Price the player PAYS to buy 1 unit (mid × haggleBuy, rounded to 2 dp).
 * Gap G-HAGGLE-MODS: bookKeeping/tradingHouse ±0.1 modifiers are M5+.
 * @param {GameState} state
 * @param {string} goodsId
 * @returns {number}
 */
export function buyingPrice(state, goodsId) {
  return Math.round(priceOf(state, goodsId) * BALANCE.market.haggleBuy * 100) / 100;
}

/**
 * Price the player GETS when selling 1 unit (mid × haggleSell, rounded to 2 dp).
 * @param {GameState} state
 * @param {string} goodsId
 * @returns {number}
 */
export function sellingPrice(state, goodsId) {
  return Math.round(priceOf(state, goodsId) * BALANCE.market.haggleSell * 100) / 100;
}

// ---------------------------------------------------------------------------
// T3 – getGoldValue (single valuation API) + marketInject
// ---------------------------------------------------------------------------

/**
 * Single valuation API (§8.2). Values a basket at current market prices.
 * Gold counted 1:1. Wraps pure formulas.goldValue with priceOf bound to marketState.
 * @param {GameState} state
 * @param {Record<string, number>} basket  // {goodsId: qty}, may include 'gold'
 * @returns {number}
 */
export function getGoldValue(state, basket) {
  return goldValue(basket, (id) => id === 'gold' ? 1 : priceOf(state, id));
}

/**
 * Inject (positive) or withdraw (negative) supply into the client market.
 * From M7 AI zones will feed this; until M7 only marketDailyDrift moves available.
 * Clamps [0, max]. No-op for unknown goods.
 * @param {GameState} state
 * @param {string} goodsId
 * @param {number} qty  // positive = inject supply, negative = withdraw
 */
export function marketInject(state, goodsId, qty) {
  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);
  const m = ms && ms[goodsId];
  if (!m) return; // unknown good – no-op
  m.available = Math.min(Math.max(m.available + qty, 0), m.max);
}

// ---------------------------------------------------------------------------
// T2 – Daily mean-reversion drift
// ---------------------------------------------------------------------------

/**
 * Daily mean-reversion drift toward baseline (simulates surrounding world supply).
 * available += k × (baseline − available), then clamp [0, max].
 * Day edge, order 35. Deterministic, no RNG, catch-up-safe (S-05).
 * G-MARKET-DRIFT closed (iter-020 M9a): driftK=0.2 calibrated against playability goals
 * CÍL-1/CÍL-3 (admissible range [0.10,0.40]). See balance.js market.driftK + test/m9a-market.test.js.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function marketDailyDrift(state, _params, _ctx) {
  const k = BALANCE.market.driftK;
  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);
  if (!ms) return;
  for (const id in ms) {
    const m = ms[id];
    const next = m.available + k * (m.baseline - m.available);
    m.available = Math.min(Math.max(next, 0), m.max);
  }
}
