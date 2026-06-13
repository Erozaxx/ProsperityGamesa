/**
 * Mine daily – day edge, order 50.
 * Source: mine.js:7-18.
 * Deterministic: RNG via makeRng(state,'mine'), only when curOres < 300.
 */

/** @typedef {import('../state/types.js').GameState} GameState */
/** @typedef {import('../state/types.js').TickContext} TickContext */

import { makeRng } from '../engine/rng.js';
import { BALANCE } from '../balance/balance.js';
import { logEntry } from '../engine/log.js';

/**
 * Mine daily tick – day edge, order 50.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function mineDaily(state, _params, _ctx) {
  const m = state.world.mine;
  if (!m) return;

  // Mine expander (mine.js:8-17)
  if (m.curOres < BALANCE.mine.expanderThreshold) {
    const rng = makeRng(state, 'mine');
    if (rng.next() < BALANCE.mine.expanderChance) {
      // eventMineExpander is M8 content event → no-op in M3 (gap G-MINE-EXPANDER)
      logEntry(state, 'Mine expander event triggered (no-op in M3)');
    }
  }
}
