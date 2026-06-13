/**
 * Autosave scheduler: throttled save with flush-on-hide support.
 * App layer - may use Date.now(), setInterval, etc.
 * M2b: autosave.
 */

/**
 * @typedef {{ requestSave: (reason?: string) => void, flush: () => Promise<void> }} Autosave
 */

/**
 * Create an autosave controller.
 * @param {Object} opts
 * @param {() => Promise<void>} opts.doSave - function that performs the actual save
 * @param {number} [opts.minIntervalMs] - minimum ms between saves (default 30000)
 * @param {() => number} [opts.now] - time source (default Date.now)
 * @returns {Autosave}
 */
export function createAutosave(opts) {
  const { doSave } = opts;
  const minIntervalMs = opts.minIntervalMs ?? 30_000;
  const now = opts.now ?? Date.now.bind(Date);

  let lastSaveAt = 0;
  /** @type {Promise<void> | null} */
  let pending = null;

  function save() {
    if (pending) return pending;
    pending = doSave().finally(() => { pending = null; });
    lastSaveAt = now();
    return pending;
  }

  return {
    /**
     * Request a save. If reason is 'hide', bypasses throttle.
     * @param {string} [reason]
     */
    requestSave(reason) {
      const bypass = reason === 'hide';
      const elapsed = now() - lastSaveAt;
      if (bypass || elapsed >= minIntervalMs) {
        save();
      }
    },

    /**
     * Force a save immediately (returns promise).
     * @returns {Promise<void>}
     */
    flush() {
      return save();
    },
  };
}
