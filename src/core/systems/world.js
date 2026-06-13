/**
 * World system stub - no-op until M7.
 * iter-007 M2a-2 T5.
 *
 * S-06 CONTRACT: This module must NOT reference market pricing APIs before M4.
 * Activation thresholds (from BALANCE.world) are present in data but
 * world mechanics are no-op until M7.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

/**
 * World tick - day edge, order 30. No-op stub until M7.
 * @param {GameState} _state
 * @param {object} _params
 * @param {TickContext} _ctx
 * @returns {void}
 */
export function worldTick(_state, _params, _ctx) {
  // no-op stub - M7 implementation
}
