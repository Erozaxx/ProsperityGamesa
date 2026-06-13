/**
 * sendCaravan command: send trade caravan to buy/sell goods at remote market.
 * iter-011 M4b T4.
 * DR-011-A: pay/grant without ctx (command vrstva nemá ctx).
 * Gap G-CARAVAN-ROADS: road tech speed bonus (+1/+2) = M5+; in M4b speed=0 (30 days).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay } from '../resources/transactions.js';
import { buyingPrice, sellingPrice } from '../systems/market.js';
import { BALANCE } from '../balance/balance.js';
import { scheduleInsert } from '../engine/scheduler.js';

/**
 * sendCaravan command handler.
 * params: { buy: {goodsId: qty}, sell: {goodsId: qty} }
 * Validates → checks idle → checks capacity → checks affordability
 * → pays sell goods (+ net gold if expenditures>0), sets caravan state, schedules return.
 * @param {GameState} state
 * @param {{ buy?: unknown, sell?: unknown }} params
 * @returns {CommandResult}
 */
export function sendCaravan(state, params) {
  const buy = /** @type {Record<string, number>} */ (params.buy ?? {});
  const sell = /** @type {Record<string, number>} */ (params.sell ?? {});

  // Validate buy/sell are objects with positive integer values
  if (typeof buy !== 'object' || buy === null || Array.isArray(buy)) {
    return { ok: false, error: 'sendCaravan: buy must be an object {goodsId: qty}' };
  }
  if (typeof sell !== 'object' || sell === null || Array.isArray(sell)) {
    return { ok: false, error: 'sendCaravan: sell must be an object {goodsId: qty}' };
  }

  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (state.world.marketState);

  // Validate all goodsIds in buy/sell exist in marketState
  for (const [id, q] of Object.entries(buy)) {
    if (!Number.isInteger(q) || q <= 0) return { ok: false, error: `sendCaravan: buy["${id}"] must be a positive integer` };
    if (!ms || !ms[id]) return { ok: false, error: `sendCaravan: unknown goods "${id}" in buy` };
  }
  for (const [id, q] of Object.entries(sell)) {
    if (!Number.isInteger(q) || q <= 0) return { ok: false, error: `sendCaravan: sell["${id}"] must be a positive integer` };
    if (!ms || !ms[id]) return { ok: false, error: `sendCaravan: unknown goods "${id}" in sell` };
  }

  // Caravan must be idle
  const caravan = /** @type {import('../state/types.js').CaravanState | undefined} */ (state.world.caravan);
  if (!caravan) return { ok: false, error: 'sendCaravan: no caravan state found' };
  if (caravan.sentOut > 0) {
    return { ok: false, error: 'sendCaravan: karavana je na cestě' };
  }

  // Check capacity
  const usedBuyCapacity = Object.values(buy).reduce((s, n) => s + n, 0);
  const usedSellCapacity = Object.values(sell).reduce((s, n) => s + n, 0);
  if (usedBuyCapacity > caravan.capacity) {
    return { ok: false, error: `sendCaravan: překročena kapacita nákupu (${usedBuyCapacity} > ${caravan.capacity})` };
  }
  if (usedSellCapacity > caravan.capacity) {
    return { ok: false, error: `sendCaravan: překročena kapacita prodeje (${usedSellCapacity} > ${caravan.capacity})` };
  }

  // Compute totals
  let buyTotal = 0;
  for (const [id, q] of Object.entries(buy)) {
    buyTotal += buyingPrice(state, id) * q;
  }
  buyTotal = Math.round(buyTotal * 100) / 100;

  let sellTotal = 0;
  for (const [id, q] of Object.entries(sell)) {
    sellTotal += sellingPrice(state, id) * q;
  }
  sellTotal = Math.round(sellTotal * 100) / 100;

  const expenditures = Math.round((buyTotal - sellTotal) * 100) / 100;

  // Check affordability: need goods to sell + gold for net expenditure
  for (const [id, q] of Object.entries(sell)) {
    if (!canAfford(state, { [id]: q })) {
      const owned = (state.player.inventory && state.player.inventory[id]) || 0;
      return { ok: false, error: `sendCaravan: nedostatek zboží "${id}" (have ${owned}, need ${q})` };
    }
  }
  if (expenditures > 0 && !canAfford(state, { gold: expenditures })) {
    return { ok: false, error: `sendCaravan: nedostatek zlata (need ${expenditures}, have ${state.player.gold})` };
  }

  // Pay: remove sell goods immediately (DR-011-A: no ctx)
  for (const [id, q] of Object.entries(sell)) {
    pay(state, { [id]: q }, 'caravan:send');
  }

  // Compute recGoods: bought goods + net income (if expenditures < 0)
  /** @type {Record<string, number>} */
  const recGoods = { ...buy };
  if (expenditures > 0) {
    pay(state, { gold: expenditures }, 'caravan:send');
  } else if (expenditures < 0) {
    // Net income: add gold to recGoods (delivered on return)
    recGoods.gold = Math.round(-expenditures * 100) / 100;
  }

  // Set caravan state and schedule return
  caravan.recGoods = recGoods;
  const speed = caravan.speed; // road tech bonus = M5 gap G-CARAVAN-ROADS
  const sentOut = BALANCE.engine.stepsPerDay * (30 - speed);
  caravan.sentOut = sentOut;

  // Schedule caravanReturns one-shot handler
  scheduleInsert(state, state.engine.curStep + sentOut, 'caravanReturns', {});

  return { ok: true };
}

/**
 * Registers sendCaravan into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerSendCaravan(creg) {
  registerCommand(creg, 'sendCaravan', sendCaravan);
}
