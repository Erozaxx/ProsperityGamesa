/**
 * Dev-mode deep freeze utility for state snapshots.
 * In prod (DEV=false) is a no-op – no copy, no overhead.
 *
 * NOTE: DEV is hardcoded true in iter-004.
 * app/ (M0b) will override this via a separate env.js module mechanism.
 */

/** @type {boolean} Dev flag – hardcoded true for iter-004; app/ will override in M0b */
export const DEV = true;

/**
 * Deeply freezes a value for UI read boundaries in dev mode (catches accidental mutations outside systems).
 * In prod (DEV===false) returns the input unchanged (no copy, no penalty).
 * Uses WeakSet to guard against cycles.
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function devFreeze(value) {
  if (!DEV) return value;
  deepFreeze(value, new WeakSet());
  return /** @type {Readonly<T>} */ (value);
}

/**
 * Internal recursive freeze.
 * @param {unknown} val
 * @param {WeakSet<object>} visited
 */
function deepFreeze(val, visited) {
  if (val === null || typeof val !== 'object') return;
  if (visited.has(val)) return;
  visited.add(val);
  Object.freeze(val);
  for (const key of Object.keys(val)) {
    deepFreeze(/** @type {Record<string,unknown>} */ (val)[key], visited);
  }
}
