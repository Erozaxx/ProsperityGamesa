/**
 * Caravan system: caravanReturns schedule handler.
 * iter-011 M4b T4.
 * Schedule handlers receive (state, params, ctx) from runTick→scheduleDue,
 * so ctx IS available here → grant emits txEvent (catch-up-safe one-shot).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { grant } from '../resources/transactions.js';

/**
 * Caravan return handler: deliver recGoods (bought goods + net-income gold) to player.
 * Registered as schedule handler (one-shot, fires when caravan.sentOut steps pass).
 * ctx IS available (schedule handlers get it from runTick), so grant emits txEvent.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function caravanReturns(state, _params, ctx) {
  const caravan = /** @type {import('../state/types.js').CaravanState | undefined} */ (state.world.caravan);
  if (!caravan) return;

  const goods = caravan.recGoods || {};
  if (Object.keys(goods).length > 0) {
    // Grant gold + goods; gold→gold handler, others→goods handler (kind:'goods').
    // ctx has emitTx so the caravan return is recorded in council accounting.
    grant(state, goods, 'caravan:return', ctx, state.engine.curStep);
  }

  caravan.recGoods = {};
  caravan.sentOut = 0;
}
