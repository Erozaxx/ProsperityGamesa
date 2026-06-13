/**
 * Accounting observer (K5/§7.2). Pure aggregation of txEvents into monthly report.
 * Does NOT mutate payment logic – called from ctx.emitTx which pay/grant emit.
 * iter-010 M4a.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TxEvent} TxEvent
 */

import { emptyReport } from '../state/createCouncilState.js';

/**
 * Record a single txEvent into the current monthly report.
 * @param {GameState} state
 * @param {TxEvent} tx
 */
export function recordTx(state, tx) {
  if (!state.council) return; // defensive (old save without council → migration will add it)
  const r = state.council.current;
  // categorize by cause
  r.byCause[tx.cause] = (r.byCause[tx.cause] || 0) + tx.amount;
  if (tx.key === 'gold') {
    if (tx.amount >= 0) r.goldEarned += tx.amount;
    else r.goldSpent += -tx.amount;
  }
  if (tx.amount >= 0) r.produced[tx.key] = (r.produced[tx.key] || 0) + tx.amount;
  else r.consumed[tx.key] = (r.consumed[tx.key] || 0) + (-tx.amount);
}

/**
 * Close current month (month edge, LAST order=40). Push current into history, open new.
 * @param {GameState} state
 * @param {object} _params
 * @param {object} _ctx
 */
export function closeMonth(state, _params, _ctx) {
  if (!state.council) return;
  state.council.history.unshift(state.council.current);
  const CAP = 12;
  if (state.council.history.length > CAP) state.council.history.length = CAP;
  state.council.current = emptyReport(state.season.curMonth, state.season.curYear);
}
