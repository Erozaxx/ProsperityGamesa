/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

/**
 * @typedef {(state: GameState, params: object, ctx: TickContext) => void} HandlerFn
 */

/**
 * @typedef {{ handlers: Map<string, HandlerFn> }} Registry
 */

/**
 * Creates an empty fns registry.
 * @returns {Registry}
 */
export function createRegistry() {
  return { handlers: new Map() };
}

/**
 * Registers a handler under a string ID.
 * Idempotent for identical handler; re-registering a DIFFERENT handler under same ID throws (ID collision).
 * @param {Registry} reg
 * @param {string} id
 * @param {HandlerFn} handler
 * @returns {void}
 */
export function register(reg, id, handler) {
  if (reg.handlers.has(id) && reg.handlers.get(id) !== handler) {
    throw new Error(`registry: id collision: ${id}`);
  }
  reg.handlers.set(id, handler);
}

/**
 * Resolves a handler by ID. Unknown ID throws in DEV (fail-fast); in prod returns no-op.
 * In iter-004 DEV=true so always throws on unknown.
 * @param {Registry} reg
 * @param {string} id
 * @returns {HandlerFn}
 */
export function resolve(reg, id) {
  const handler = reg.handlers.get(id);
  if (!handler) {
    // DEV: fail-fast (iter-004 always DEV)
    throw new Error(`registry: unknown id: ${id}`);
  }
  return handler;
}

/**
 * Returns true if ID exists in registry.
 * @param {Registry} reg
 * @param {string} id
 * @returns {boolean}
 */
export function has(reg, id) {
  return reg.handlers.has(id);
}

/**
 * Validates that params are serializable (plain data, no functions, no cycles).
 * Throws in DEV if params contain functions or non-serializable values.
 * Uses structuredClone for cycle detection (structuredClone is safe - not DOM/IO).
 * BUG-001 fix (iter-006): added WeakSet seen to prevent stack overflow on cyclic objects.
 * @param {object} params
 * @returns {void}
 */
export function assertSerializable(params) {
  // Check for functions recursively (structuredClone doesn't catch all edge cases)
  checkNoFunctions(params, new WeakSet());
  // structuredClone catches cycles and non-transferable types
  try {
    structuredClone(params);
  } catch (e) {
    throw new Error(`registry: params not serializable: ${String(e)}`);
  }
}

/**
 * @param {unknown} val
 * @param {WeakSet<object>} seen
 */
function checkNoFunctions(val, seen) {
  if (typeof val === 'function') {
    throw new Error('registry: params must not contain functions');
  }
  if (val !== null && typeof val === 'object') {
    if (seen.has(/** @type {object} */ (val))) return; // cycle – already visited
    seen.add(/** @type {object} */ (val));
    for (const v of Object.values(/** @type {object} */ (val))) {
      checkNoFunctions(v, seen);
    }
  }
}
