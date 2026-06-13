/**
 * Log utility: appends a message to the circular-buffer log in state.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 */

/**
 * Appends a log entry to the circular log buffer.
 * Uses circular-buffer semantics: once at capacity, overwrites oldest entry.
 * @param {GameState} state
 * @param {string} msg
 * @returns {void}
 */
export function logEntry(state, msg) {
  const log = state.log;
  if (!log) return;
  const entry = { step: state.engine.curStep, msg };
  if (log.entries.length < log.capacity) {
    log.entries.push(entry);
  } else {
    log.entries[log.head % log.capacity] = entry;
    log.head = (log.head + 1) % log.capacity;
  }
}
