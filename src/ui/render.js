/**
 * Mounts the UI and provides a requestRender() that throttles re-renders to a UI-layer
 * frame cap (RENDER_MIN_INTERVAL_MS) with a guaranteed trailing render.
 *
 * iter-021 T1 (UX-3): the loop signals dirty ~every frame (~60/s); painting at that rate is
 * pure render tax (architecture §3.4 caps at ~10–15 re-renders/s). We time-gate requestRender()
 * in the UI layer only — `now()` (performance.now) is read HERE, never in core/clock.js. The
 * simulation frequency stays decoupled from the paint frequency. A trailing render is mandatory
 * so the final state after a burst is always painted.
 *
 * B-4: accepts getExtraProps for offlineSummary, catchupProgress, onExport, onImport.
 */
import { render } from '../vendor/preact.standalone.js';
import { html } from '../vendor/preact.standalone.js';
// devFreeze enabled at M2 (needs decoupled snapshot) – ENABLE @ M2
// import { devFreeze } from '../core/state/freeze.js';
import { App } from './App.js';

/**
 * Minimum interval between paints (ms). ~15 fps cap. UI-layer constant — NOT balance.js
 * (this is not game balance; it never enters core or hashState).
 */
export const RENDER_MIN_INTERVAL_MS = 66;

/**
 * @param {Object} deps
 * @param {import('../core/state/types.js').GameState} deps.state
 * @param {(type: string, params?: Record<string, unknown>) => {ok: boolean, error?: string}} deps.send
 * @param {HTMLElement} deps.root
 * @param {(cb: FrameRequestCallback) => number} deps.raf
 * @param {() => object} [deps.getExtraProps] - optional: returns extra App props (offlineSummary, catchupProgress, etc.)
 * @param {() => number} [deps.now] - UI clock (performance.now); injectable for tests. Never used in core.
 * @param {(cb: () => void, ms: number) => unknown} [deps.setTimeoutFn] - trailing-render scheduler (injectable)
 * @param {(id: unknown) => void} [deps.clearTimeoutFn] - cancels a pending trailing render (injectable)
 * @param {(vnode: unknown, root: HTMLElement) => void} [deps.renderFn] - preact render (injectable; tests count paints DOM-free)
 * @returns {{ requestRender: () => void }}
 */
export function mountUI(deps) {
  let scheduled = false;
  const renderFn = deps.renderFn ?? render;

  // UI-layer time source: performance.now() in the browser, Date.now()/injected in tests.
  // Read ONLY here (UI), never in core — keeps determinism invariant intact.
  const now = deps.now
    ?? ((typeof performance !== 'undefined' && performance.now)
      ? performance.now.bind(performance)
      : Date.now.bind(Date));
  const setTimeoutFn = deps.setTimeoutFn
    ?? ((typeof setTimeout !== 'undefined') ? setTimeout : (cb) => { cb(); return 0; });
  const clearTimeoutFn = deps.clearTimeoutFn
    ?? ((typeof clearTimeout !== 'undefined')
      ? (/** @type {unknown} */ id) => clearTimeout(/** @type {any} */ (id))
      : () => {});

  let lastRenderMs = -Infinity;
  /** @type {unknown} pending trailing-render timer id (null = none scheduled) */
  let trailingTimer = null;

  function doRender() {
    scheduled = false;
    lastRenderMs = now();
    // M0b: render live state directly (devFreeze on live state would break advance() – §1.4.3 design note)
    // ENABLE @ M2 (needs decoupled snapshot): const snapshot = APP_DEV ? devFreeze(deps.state) : deps.state;
    const snapshot = deps.state;
    const extraProps = deps.getExtraProps ? deps.getExtraProps() : {};
    renderFn(html`<${App} snapshot=${snapshot} send=${deps.send} ...${extraProps} />`, deps.root);
  }

  /** Cancel any pending trailing render and paint immediately via rAF. */
  function scheduleImmediate() {
    if (trailingTimer !== null) {
      clearTimeoutFn(trailingTimer);
      trailingTimer = null;
    }
    if (scheduled) return;
    scheduled = true;
    deps.raf(doRender);
  }

  function requestRender() {
    // If a paint is already queued (rAF or trailing), coalesce into it.
    if (scheduled || trailingTimer !== null) return;

    const elapsed = now() - lastRenderMs;
    if (elapsed >= RENDER_MIN_INTERVAL_MS) {
      // Enough time has passed — paint on the next frame.
      scheduled = true;
      deps.raf(doRender);
    } else {
      // Too soon: schedule a single trailing render for the remaining time so the
      // latest state is always painted (trailing-edge throttle, mandatory per §3.4).
      const wait = RENDER_MIN_INTERVAL_MS - elapsed;
      trailingTimer = setTimeoutFn(() => {
        trailingTimer = null;
        scheduleImmediate();
      }, wait);
    }
  }

  // Initial paint
  doRender();

  return { requestRender };
}
