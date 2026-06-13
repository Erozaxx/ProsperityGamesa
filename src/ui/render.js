/**
 * Mounts the UI and provides a requestRender() that coalesces re-renders to one per rAF.
 * B-4: accepts getExtraProps for offlineSummary, catchupProgress, onExport, onImport.
 */
import { render } from '../vendor/preact.standalone.js';
import { html } from '../vendor/preact.standalone.js';
// devFreeze enabled at M2 (needs decoupled snapshot) – ENABLE @ M2
// import { devFreeze } from '../core/state/freeze.js';
import { App } from './App.js';

/**
 * @param {Object} deps
 * @param {import('../core/state/types.js').GameState} deps.state
 * @param {(type: string, params?: Record<string, unknown>) => {ok: boolean, error?: string}} deps.send
 * @param {HTMLElement} deps.root
 * @param {(cb: FrameRequestCallback) => number} deps.raf
 * @param {() => object} [deps.getExtraProps] - optional: returns extra App props (offlineSummary, catchupProgress, etc.)
 * @returns {{ requestRender: () => void }}
 */
export function mountUI(deps) {
  let scheduled = false;

  function doRender() {
    scheduled = false;
    // M0b: render live state directly (devFreeze on live state would break advance() – §1.4.3 design note)
    // ENABLE @ M2 (needs decoupled snapshot): const snapshot = APP_DEV ? devFreeze(deps.state) : deps.state;
    const snapshot = deps.state;
    const extraProps = deps.getExtraProps ? deps.getExtraProps() : {};
    render(html`<${App} snapshot=${snapshot} send=${deps.send} ...${extraProps} />`, deps.root);
  }

  function requestRender() {
    if (scheduled) return;
    scheduled = true;
    deps.raf(doRender);
  }

  // Initial paint
  doRender();

  return { requestRender };
}
