/**
 * Battle system stub - no-op until M7.
 * iter-007 M2a-2 T5.
 *
 * state.battle is null in M2a (no active battles).
 * battleStep is a pure function callable from tests.
 * BattleState contract (§8.1) is established here for M7 to implement.
 */

/**
 * @typedef {{ zoneId: string, sides: {player: object, opponent: object}, state: 'setup'|'running'|'done', tick: number, log: any[], summary: any }} BattleState
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 * @typedef {import('../engine/rng.js').Rng} Rng
 */

/**
 * Execute one battle tick. Pure function - does not mutate shared state.
 * Empty battle stub: returns structurally valid state with incremented tick.
 * Auto-resolve (catch-up): same function called without commands for AI.
 * @param {BattleState} bs
 * @param {object[]} commands
 * @param {Rng} rng
 * @returns {BattleState}
 */
export function battleStep(bs, commands, rng) {
  if (!bs || bs.state === 'done') return bs;
  // Advance RNG to maintain deterministic stream position
  rng.next();
  return { ...bs, tick: bs.tick + 1 };
}

/**
 * Battle tick system function - step edge, order 30.
 * No-op: state.battle is null in M2a, no active battles.
 * @param {GameState} _state
 * @param {object} _params
 * @param {TickContext} _ctx
 * @returns {void}
 */
export function battleTick(_state, _params, _ctx) {
  // no-op: state.battle is null in M2a
  // M7 will check state.battle and call battleStep if active
}
