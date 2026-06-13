/**
 * Wires visibilitychange→hidden and pagehide to an autosave callback (§6.2 trigger 2).
 * Dependency-injected target/win for testability in Node (fake EventTarget).
 */

/**
 * @param {Object} deps
 * @param {EventTarget & { visibilityState?: string }} deps.target - document (injected)
 * @param {EventTarget} [deps.win]                                  - window for pagehide (injected)
 * @param {() => (void | Promise<void>)} deps.onHide               - autosave callback
 * @returns {() => void} detach function (removes listeners)
 */
export function attachLifecycle(deps) {
  const visHandler = () => {
    if (deps.target.visibilityState === 'hidden') {
      deps.onHide();
    }
  };

  const pageHideHandler = () => {
    deps.onHide();
  };

  deps.target.addEventListener('visibilitychange', visHandler);
  deps.win?.addEventListener('pagehide', pageHideHandler);

  return function detach() {
    deps.target.removeEventListener('visibilitychange', visHandler);
    deps.win?.removeEventListener('pagehide', pageHideHandler);
  };
}
