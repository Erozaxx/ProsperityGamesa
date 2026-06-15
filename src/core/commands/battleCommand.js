/**
 * battleCommand — hráčské bojové akce pro battle queue.
 * iter-018 M7b T3. Design DESIGN-018-001 §7.1.
 *
 * UI posílá intent {side, action} → validace → state.battle.queue.push({side, action}).
 * Žádná mutace bitvy v command handleru (jen enqueue). battleStep krok 3 commandy konzumuje.
 * Determinismus: command vkládá jen serializovatelná plain data do queue (žádné RNG, žádný Date.now).
 *
 * Anti-dark-code (B1 poučení): registrace přes registerBattleCommands() v main.js bootstrapEngine().
 *
 * Validní akce per unit type (1:1 orig battle.js ř.586-629, §5 designu):
 *   warriors: charge | shieldWall | flank
 *   archers:  volley | fireArrows
 *
 * CD se kontroluje až v battleStep (step 3) — command jen enqueue; cooldown check zde není záměrný
 * (design §7.1: „cd se kontroluje až v battleStep"). Validace v command: akce musí patřit k side,
 * side musí existovat, bitva musí být aktivní ('running').
 *
 * @module battleCommand
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';

/** Validní akce per unit type (source: military.json _battle.attacks, §5 designu) */
const VALID_ACTIONS = Object.freeze({
  warriors: Object.freeze(new Set(['charge', 'shieldWall', 'flank'])),
  archers:  Object.freeze(new Set(['volley', 'fireArrows'])),
});

/** Validní unit typy (player sides) */
const VALID_SIDES = Object.freeze(new Set(['warriors', 'archers']));

/**
 * battleCommand handler.
 * params: { side: 'warriors' | 'archers', action: 'charge' | 'shieldWall' | 'flank' | 'volley' | 'fireArrows' }
 *
 * Validace:
 * 1. Bitva musí být aktivní (state.battle exists && state.battle.state === 'running')
 * 2. side musí být 'warriors' nebo 'archers'
 * 3. action musí patřit k danému side
 *
 * Cooldown se NEkontroluje zde — battleStep krok 3 ignoruje command pokud cd > 0
 * (design §7.1, zachování 1:1 orig chování).
 *
 * Enqueue: state.battle.queue.push({ side, action }) — plain data, serializovatelné (F-1).
 *
 * @param {GameState} state
 * @param {{ side?: unknown, action?: unknown }} params
 * @returns {CommandResult}
 */
export function battleCommand(state, params) {
  const st = /** @type {any} */ (state);

  // 1. Validace: bitva musí být aktivní
  if (!st.battle || st.battle.state !== 'running') {
    return {
      ok: false,
      error: 'battleCommand: no active battle (state.battle is null or not running)',
    };
  }

  // 2. Validace: side
  const side = params.side;
  if (typeof side !== 'string' || !VALID_SIDES.has(/** @type {any} */ (side))) {
    return {
      ok: false,
      error: `battleCommand: invalid side "${side}" — must be 'warriors' or 'archers'`,
    };
  }

  // 3. Validace: action patří k danému side
  const action = params.action;
  if (typeof action !== 'string') {
    return {
      ok: false,
      error: `battleCommand: action must be a string, got ${typeof action}`,
    };
  }

  const validActionsForSide = VALID_ACTIONS[/** @type {'warriors'|'archers'} */ (side)];
  if (!validActionsForSide.has(action)) {
    const allowed = [...validActionsForSide].join(', ');
    return {
      ok: false,
      error: `battleCommand: action "${action}" is not valid for side "${side}" — allowed: ${allowed}`,
    };
  }

  // Enqueue: plain data only (serializovatelné, F-1); battleStep krok 3 konzumuje
  // Žádná mutace bitvy zde — determinismus C3 ("žádné click-mutace")
  st.battle.queue.push({ side, action });

  return { ok: true };
}

/**
 * Registruje battleCommand handler do command registry.
 * Volá se z bootstrapEngine (main.js) — anti-dark-code (B1 poučení).
 * @param {CommandRegistry} creg
 */
export function registerBattleCommands(creg) {
  registerCommand(creg, 'battleCommand', battleCommand);
}
