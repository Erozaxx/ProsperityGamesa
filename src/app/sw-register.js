/**
 * Service-worker registration + update flow (iter-021 T2, DR-021-01 §1).
 *
 * The SW no longer auto-skipWaiting(); a new version sits in `waiting` until the user opts in.
 * This module:
 *   1. registers the SW,
 *   2. watches for an installed-but-waiting worker (an update is ready),
 *   3. surfaces an "update ready" prompt (injected `onUpdateReady`),
 *   4. on accept: flushes the save (autosave.requestSave('hide')) BEFORE telling the waiting
 *      worker to skipWaiting, then reloads once `controllerchange` fires (guarded against loops).
 *
 * Save safety (invariant 3): the save lives in IndexedDB, outside `caches`; we force a flush
 * before reload so no in-flight progress is lost across the version swap.
 */

/**
 * Wires the update-ready prompt + accept flow for a registration. Pure logic, fully injectable
 * for Node tests (no real ServiceWorker / location needed).
 *
 * @param {Object} deps
 * @param {ServiceWorkerRegistration} deps.registration
 * @param {ServiceWorker | null | undefined} deps.controller - navigator.serviceWorker.controller
 * @param {EventTarget & { addEventListener: Function }} deps.swContainer - navigator.serviceWorker
 * @param {(accept: () => void) => void} deps.onUpdateReady - show banner; calls accept() on click
 * @param {() => (void | Promise<void>)} [deps.flushSave] - autosave.requestSave('hide') wrapper
 * @param {() => void} [deps.reload] - location.reload (injectable)
 * @returns {void}
 */
export function wireUpdateFlow(deps) {
  const { registration, swContainer, onUpdateReady } = deps;
  const flushSave = deps.flushSave ?? (() => {});
  const reload = deps.reload ?? (() => {
    if (typeof location !== 'undefined') location.reload();
  });

  let reloading = false;

  // When the new worker takes control, reload exactly once so the fresh module set is used.
  swContainer.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    reload();
  });

  /** Accept handler: flush save → tell the waiting worker to activate. */
  function accept() {
    const waiting = registration.waiting;
    if (!waiting) return;
    // Flush the save to IndexedDB BEFORE the swap/reload (invariant 3).
    Promise.resolve(flushSave()).finally(() => {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  /** If a worker is already waiting (and we're controlled), it's an update — prompt now. */
  function maybePrompt() {
    if (registration.waiting && deps.controller) {
      onUpdateReady(accept);
    }
  }

  // Case A: update already waiting at registration time.
  maybePrompt();

  // Case B: an update is found after load → wait until it's installed, then prompt.
  registration.addEventListener?.('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && deps.controller) {
        // New worker installed while an old one controls the page → update ready.
        onUpdateReady(accept);
      }
    });
  });
}

/**
 * Registers the service worker if supported, then wires the update-ready flow.
 * Best-effort: failure only warns.
 * @param {Object} [opts]
 * @param {(accept: () => void) => void} [opts.onUpdateReady] - UI prompt callback
 * @param {() => (void | Promise<void>)} [opts.flushSave]    - flush save before reload
 * @returns {Promise<void>}
 */
export async function registerServiceWorker(opts = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('service-worker.js', { scope: './', type: 'module' });
    if (opts.onUpdateReady) {
      wireUpdateFlow({
        registration,
        controller: navigator.serviceWorker.controller,
        swContainer: navigator.serviceWorker,
        onUpdateReady: opts.onUpdateReady,
        flushSave: opts.flushSave,
      });
    }
  } catch (e) {
    console.warn('[sw] registration failed:', e);
  }
}
