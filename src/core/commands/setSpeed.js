/**
 * setSpeed command handler – sets engine speed (0=pause, 1=normal, 2=fast).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';

/** Valid speed values */
const VALID_SPEEDS = /** @type {const} */ ([0, 1, 2]);

/**
 * Command handler for setSpeed.
 * @param {GameState} state
 * @param {{ speed?: unknown }} params
 * @returns {CommandResult}
 */
export function setSpeed(state, params) {
  const speed = params.speed;
  if (speed !== 0 && speed !== 1 && speed !== 2) {
    return { ok: false, error: `invalid speed: ${speed}` };
  }
  state.engine.speed = /** @type {import('../state/types.js').Speed} */ (speed);
  return { ok: true };
}

/**
 * Registers setSpeed into a command registry.
 * @param {CommandRegistry} creg
 * @returns {void}
 */
export function registerSetSpeed(creg) {
  registerCommand(creg, 'setSpeed', setSpeed);
}
