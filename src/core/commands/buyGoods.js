/**
 * buyGoods command: player buys goods from the client market.
 * iter-011 M4b T1.
 * DR-011-A: pay/grant without ctx (tržní směny nejsou council položka).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay, grant } from '../resources/transactions.js';
import { buyingPrice } from '../systems/market.js';

/**
 * buyGoods command handler.
 * params: { goodsId: string, qty: number }
 * 1. Validate goodsId (string, in marketState)
 * 2. Validate qty (positive integer)
 * 3. Compute totalCost = buyingPrice × qty (rounded to 2dp)
 * 4. canAfford({gold: totalCost}) → {ok:false} if not
 * 5. pay gold, grant goods, clamp available−qty ∈ [0, max] (N-02)
 * @param {GameState} state
 * @param {{ goodsId?: unknown, qty?: unknown }} params
 * @returns {CommandResult}
 */
export function buyGoods(state, params) {
  const goodsId = params.goodsId;
  const qty = params.qty;

  if (typeof goodsId !== 'string' || !goodsId) {
    return { ok: false, error: 'buyGoods: goodsId must be a non-empty string' };
  }

  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);
  if (!ms || !ms[goodsId]) {
    return { ok: false, error: `buyGoods: unknown goods "${goodsId}" (not in marketState)` };
  }

  if (!Number.isInteger(qty) || /** @type {number} */ (qty) <= 0) {
    return { ok: false, error: `buyGoods: qty must be a positive integer, got ${qty}` };
  }

  const q = /** @type {number} */ (qty);
  const unitPrice = buyingPrice(state, goodsId);
  const totalCost = Math.round(unitPrice * q * 100) / 100;

  if (!canAfford(state, { gold: totalCost })) {
    return { ok: false, error: `buyGoods: nedostatek zlata (need ${totalCost}, have ${state.player.gold})` };
  }

  // Pay gold and grant goods (DR-011-A: no ctx, no emitTx for tržní směny)
  pay(state, { gold: totalCost }, 'market:buy');
  grant(state, { [goodsId]: q }, 'market:buy');

  // Clamp available [0, max] (N-02)
  const m = ms[goodsId];
  m.available = Math.min(Math.max(m.available - q, 0), m.max);

  return { ok: true };
}

/**
 * Registers buyGoods into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerBuyGoods(creg) {
  registerCommand(creg, 'buyGoods', buyGoods);
}
