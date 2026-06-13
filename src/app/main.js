/**
 * App entrypoint: SW registration, storage persist, engine bootstrap, UI mount, game loop.
 * This is the ONLY place where app/ui/save layers meet (§3.1 glue).
 */

import { createInitialState } from '../core/state/createInitialState.js';
import { initRng, createAccumulator, registerCorePeriodics } from '../core/engine/index.js';
import { createRegistry } from '../core/registry/registry.js';
import { createCommandRegistry, dispatch } from '../core/commands/dispatch.js';
import { registerSetSpeed } from '../core/commands/setSpeed.js';
import { requestPersistentStorage } from './persist.js';
import { registerServiceWorker } from './sw-register.js';
import { createGameLoop } from './loop.js';
import { attachLifecycle } from './lifecycle.js';
import { mountUI } from '../ui/render.js';
import { showErrorScreen } from '../ui/ErrorScreen.js';
import { saveGame, loadGame } from '../save/saveStore.js';
import { SLOT_ID } from '../save/schema.js';

const DEFAULT_SEED = 0x9E3779B9;

/**
 * Bootstraps a fresh game state.
 * @param {number} seed
 * @returns {import('../core/state/types.js').GameState}
 */
function bootstrapNewState(seed) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

/**
 * Bootstraps engine context (registry + periodics + commands).
 * Called both on fresh start and after load (registry is not part of save).
 * @returns {{ ctx: import('../core/state/types.js').TickContext, creg: import('../core/commands/dispatch.js').CommandRegistry }}
 */
function bootstrapEngine() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const creg = createCommandRegistry();
  registerSetSpeed(creg);
  return { ctx: { registry, periodics }, creg };
}

/**
 * Main boot sequence.
 */
export async function boot() {
  const root = /** @type {HTMLElement} */ (document.getElementById('app'));

  // 1. Request persistent storage (best-effort, non-blocking)
  requestPersistentStorage();

  // 2. Register service worker (best-effort)
  await registerServiceWorker();

  // 3. Load or create state
  /** @type {import('../core/state/types.js').GameState} */
  let state;
  try {
    const loaded = await loadGame(SLOT_ID);
    state = loaded?.state ?? bootstrapNewState(DEFAULT_SEED);
  } catch (e) {
    showErrorScreen(root, {
      kind: 'save',
      message: 'Nepodařilo se načíst uloženou hru.',
      error: e instanceof Error ? e : new Error(String(e)),
      onNewGame: () => { boot(); },
    });
    return;
  }

  try {
    // 4. Bootstrap engine
    const { ctx, creg } = bootstrapEngine();

    // 5. Create accumulator
    const acc = createAccumulator(performance.now(), state.engine.frameBudget);

    // 6. Send function (UI → commands)
    const send = (/** @type {string} */ type, /** @type {Record<string, unknown>|undefined} */ params) =>
      dispatch(creg, state, { type, params });

    // 7. Mount UI
    const { requestRender } = mountUI({
      state,
      send,
      root,
      raf: requestAnimationFrame.bind(globalThis),
    });

    // 8. Create game loop
    const loop = createGameLoop({
      state,
      ctx,
      acc,
      nowFn: () => performance.now(),
      raf: requestAnimationFrame.bind(globalThis),
      cancelRaf: cancelAnimationFrame.bind(globalThis),
      onDirty: requestRender,
    });

    // 9. Attach autosave on hide
    attachLifecycle({
      target: document,
      win: window,
      onHide: () => { saveGame(state); },
    });

    // 10. Start loop
    loop.start();
  } catch (e) {
    showErrorScreen(root, {
      kind: 'boot',
      message: 'Nepodařilo se spustit hru.',
      error: e instanceof Error ? e : new Error(String(e)),
    });
  }
}

// Auto-start
boot();
