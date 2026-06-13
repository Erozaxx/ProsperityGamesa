/**
 * Transaction functions for resource management.
 * iter-007 M2a-1.
 */

import { handlerFor } from './handlers.js';

/**
 * Check if state can afford the given cost map.
 * @param {object} state
 * @param {Record<string, number>} cost
 * @returns {boolean}
 */
export function canAfford(state, cost) {
  return Object.entries(cost).every(([k, n]) => {
    if (!Number.isFinite(n)) return false;
    return handlerFor(k).get(state, k) >= n;
  });
}

/**
 * Atomically pay a cost map. Throws if cannot afford (without modifying state).
 * @param {object} state
 * @param {Record<string, number>} cost
 * @param {string} cause
 * @param {{ emitTx?: (tx: import('../state/types.js').TxEvent) => void }} [ctx]
 * @param {number} [step]
 */
export function pay(state, cost, cause, ctx, step = 0) {
  // NaN guard
  for (const [k, n] of Object.entries(cost)) {
    if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf cost for key "${k}"`);
  }
  // Atomicity: check all before mutating
  if (!canAfford(state, cost)) {
    const insufficient = Object.entries(cost)
      .filter(([k, n]) => handlerFor(k).get(state, k) < n)
      .map(([k, n]) => `${k} (have ${handlerFor(k).get(state, k)}, need ${n})`)
      .join(', ');
    throw new Error(`resources: insufficient funds: ${insufficient}`);
  }
  // Apply all removals
  for (const [k, n] of Object.entries(cost)) {
    handlerFor(k).remove(state, k, n);
    if (ctx && ctx.emitTx) ctx.emitTx({ key: k, amount: -n, cause, step });
  }
}

/**
 * Grant resources to state.
 * @param {object} state
 * @param {Record<string, number>} prod
 * @param {string} cause
 * @param {{ emitTx?: (tx: import('../state/types.js').TxEvent) => void }} [ctx]
 * @param {number} [step]
 */
export function grant(state, prod, cause, ctx, step = 0) {
  for (const [k, n] of Object.entries(prod)) {
    if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf grant for key "${k}"`);
    handlerFor(k).add(state, k, n);
    if (ctx && ctx.emitTx) ctx.emitTx({ key: k, amount: +n, cause, step });
  }
}
