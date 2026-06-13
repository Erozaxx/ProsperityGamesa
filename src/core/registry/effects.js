/**
 * Effects skeleton for M1 - all implementations are validated no-ops with console logging.
 * Real implementations land in later milestones.
 * @module effects
 */

import { register } from './registry.js';

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

/**
 * No-op effect handler.
 * @param {GameState} _state
 * @param {object} _params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function noop(_state, _params, _ctx) {
  // intentional no-op
}

/**
 * Create scholars - M1 stub.
 * @param {GameState} _state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function createScholars(_state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['count'] !== 'number' || /** @type {number} */ (p['count']) < 0) {
    throw new Error('effects.createScholars: params.count must be a non-negative number');
  }
  console.log(`[effects] createScholars(${p['count']}) - M1 stub`); // gate-allow
}

/**
 * Unlock a building - M1 stub.
 * @param {GameState} _state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function unlockBuilding(_state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['id'] !== 'string') {
    throw new Error('effects.unlockBuilding: params.id must be a string');
  }
  console.log(`[effects] unlockBuilding(${p['id']}) - M1 stub`); // gate-allow
}

/**
 * Unlock a map - M1 stub.
 * @param {GameState} _state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function unlockMap(_state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['map'] !== 'string') {
    throw new Error('effects.unlockMap: params.map must be a string');
  }
  console.log(`[effects] unlockMap(${p['map']}) - M1 stub`); // gate-allow
}

/**
 * Insert inventory - M1 stub.
 * @param {GameState} _state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function insertInventory(_state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['goodsId'] !== 'string') {
    throw new Error('effects.insertInventory: params.goodsId must be a string');
  }
  if (typeof p['qty'] !== 'number') {
    throw new Error('effects.insertInventory: params.qty must be a number');
  }
  console.log(`[effects] insertInventory(${p['goodsId']}, ${p['qty']}) - M1 stub`); // gate-allow
}

/**
 * Grant resource - M1 stub.
 * @param {GameState} _state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function grantResource(_state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['resourceId'] !== 'string') {
    throw new Error('effects.grantResource: params.resourceId must be a string');
  }
  if (typeof p['amount'] !== 'number') {
    throw new Error('effects.grantResource: params.amount must be a number');
  }
  console.log(`[effects] grantResource(${p['resourceId']}, ${p['amount']}) - M1 stub`); // gate-allow
}

/**
 * Register all effect handlers into a registry.
 * @param {import('./registry.js').Registry} reg
 * @returns {void}
 */
export function registerEffects(reg) {
  register(reg, 'noop', noop);
  register(reg, 'createScholars', createScholars);
  register(reg, 'unlockBuilding', unlockBuilding);
  register(reg, 'unlockMap', unlockMap);
  register(reg, 'insertInventory', insertInventory);
  register(reg, 'grantResource', grantResource);
}
