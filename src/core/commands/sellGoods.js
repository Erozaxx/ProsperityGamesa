/**
 * sellGoods command: player sells goods on the client market.
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
import { sellingPrice } from '../systems/market.js';

/**
 * sellGoods command handler.
 * params: { goodsId: string, qty: number }
 * 1. Validate goodsId (string, in marketState)
 * 2. Validate qty (positive integer)
 * 3. Compute totalGain = sellingPrice × qty (rounded to 2dp)
 * 4. canAfford({[goodsId]: qty}) → {ok:false} if not enough goods
 * 5. pay goods, grant gold, clamp available+qty ∈ [0, max] (N-02)
 * @param {GameState} state
 * @param {{ goodsId?: unknown, qty?: unknown }} params
 * @returns {CommandResult}
 */
export function sellGoods(state, params) {
  const goodsId = params.goodsId;
  const qty = params.qty;

  if (typeof goodsId !== 'string' || !goodsId) {
    return { ok: false, error: 'sellGoods: goodsId must be a non-empty string' };
  }

  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);
  if (!ms || !ms[goodsId]) {
    return { ok: false, error: `sellGoods: unknown goods "${goodsId}" (not in marketState)` };
  }

  if (!Number.isInteger(qty) || /** @type {number} */ (qty) <= 0) {
    return { ok: false, error: `sellGoods: qty must be a positive integer, got ${qty}` };
  }

  const q = /** @type {number} */ (qty);

  if (!canAfford(state, { [goodsId]: q })) {
    const owned = (state.player.inventory && state.player.inventory[goodsId]) || 0;
    return { ok: false, error: `sellGoods: nedostatek zboží "${goodsId}" (have ${owned}, need ${q})` };
  }

  const unitPrice = sellingPrice(state, goodsId);
  const totalGain = Math.round(unitPrice * q * 100) / 100;

  // Pay goods, grant gold (DR-011-A: no ctx, no emitTx for tržní směny)
  pay(state, { [goodsId]: q }, 'market:sell');
  grant(state, { gold: totalGain }, 'market:sell');

  // Clamp available [0, max] (N-02)
  const m = ms[goodsId];
  m.available = Math.min(Math.max(m.available + q, 0), m.max);

  return { ok: true };
}

/**
 * Registers sellGoods into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerSellGoods(creg) {
  registerCommand(creg, 'sellGoods', sellGoods);
}
