/**
 * Effects skeleton for M1 - all implementations are validated no-ops with console logging.
 * Real implementations land in later milestones.
 * @module effects
 */

import { register, has } from './registry.js';

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
 * Unlock a map — sets a flag in state.catalogState so the UI can reveal it.
 * MIN-2: Real mutation (was M1 stub).
 * @param {GameState} state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function unlockMap(state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['map'] !== 'string') {
    throw new Error('effects.unlockMap: params.map must be a string');
  }
  const mapId = /** @type {string} */ (p['map']);
  const s = /** @type {any} */ (state);
  if (!s.catalogState) s.catalogState = {};
  if (!s.catalogState.unlockedMaps) s.catalogState.unlockedMaps = {};
  s.catalogState.unlockedMaps[mapId] = true;
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
 * Grant resource — adds amount to state.home.store[resourceId].
 * MIN-2: Real mutation (was M1 stub).
 * @param {GameState} state
 * @param {object} params
 * @param {TickContext} _ctx
 * @returns {void}
 */
function grantResource(state, params, _ctx) {
  const p = /** @type {Record<string, unknown>} */ (params);
  if (typeof p['resourceId'] !== 'string') {
    throw new Error('effects.grantResource: params.resourceId must be a string');
  }
  if (typeof p['amount'] !== 'number') {
    throw new Error('effects.grantResource: params.amount must be a number');
  }
  const resourceId = /** @type {string} */ (p['resourceId']);
  const amount = /** @type {number} */ (p['amount']);
  const s = /** @type {any} */ (state);
  if (!s.home) return;
  if (!s.home.store) s.home.store = {};
  s.home.store[resourceId] = (s.home.store[resourceId] ?? 0) + amount;
}

/**
 * Register all effect handlers into a registry.
 * @param {import('./registry.js').Registry} reg
 * @returns {void}
 */
export function registerEffects(reg) {
  // 'noop' may already be registered by registerCorePeriodics (tickOrder.js) under a different reference.
  // Only register our noop if not yet present to avoid ID collision.
  if (!has(reg, 'noop')) register(reg, 'noop', noop);
  register(reg, 'createScholars', createScholars);
  register(reg, 'unlockBuilding', unlockBuilding);
  register(reg, 'unlockMap', unlockMap);
  register(reg, 'insertInventory', insertInventory);
  register(reg, 'grantResource', grantResource);
}
