/**
 * App entrypoint: SW registration, storage persist, engine bootstrap, UI mount, game loop.
 * This is the ONLY place where app/ui/save layers meet (§3.1 glue).
 *
 * B-1: loadAllCatalogs() → loadGame(SLOT_ID, catalog) → loadAndReconstruct
 * B-2: missedMs from lastSimTimestamp → runCatchupBatch → offline summary
 * B-3: createAutosave wired (periodic + hide bypass), replaces raw saveGame in onHide
 * B-4: export/import + OfflineSummary/CatchupProgress wired into UI
 */

import { createInitialState } from '../core/state/createInitialState.js';
import { initRng, createAccumulator, registerCorePeriodics } from '../core/engine/index.js';
import { catchupStepCount, runCatchupBatch } from '../core/engine/catchup.js';
import { createRegistry } from '../core/registry/registry.js';
import { createCommandRegistry, dispatch } from '../core/commands/dispatch.js';
import { registerSetSpeed } from '../core/commands/setSpeed.js';
import { registerAssignJob } from '../core/commands/assignJob.js';
import { registerStartSkill } from '../core/commands/startSkill.js';
import { registerSetTaxRate } from '../core/commands/setTaxRate.js';
import { registerBuyGoods } from '../core/commands/buyGoods.js';
import { registerSellGoods } from '../core/commands/sellGoods.js';
import { registerSendCaravan } from '../core/commands/sendCaravan.js';
import { marketInit } from '../core/systems/market.js';
import { recordTx } from '../core/resources/accounting.js';
import { getCatalog, hasCatalog } from '../core/catalog/index.js';
import { requestPersistentStorage } from './persist.js';
import { registerServiceWorker } from './sw-register.js';
import { createGameLoop } from './loop.js';
import { attachLifecycle } from './lifecycle.js';
import { mountUI } from '../ui/render.js';
import { showErrorScreen } from '../ui/ErrorScreen.js';
import { saveGame, loadGame } from '../save/saveStore.js';
import { SLOT_ID } from '../save/schema.js';
import { loadAllCatalogs } from './catalogs.js';
import { createAutosave } from './autosave.js';
import { exportToString, importFromString } from '../save/exportString.js';
import { buildOfflineSummary } from '../ui/OfflineSummary.js';

const DEFAULT_SEED = 0x9E3779B9;

/** Default autosave interval: 60 s (design §5.2). */
const AUTOSAVE_INTERVAL_MS = 60_000;

/** Cap for offline catch-up (8 real hours in ms). */
const CATCHUP_CAP_MS = 8 * 3600 * 1000;

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
 * Builds the ctx.catalog preload from the global catalog store (BL-3 Variant A).
 * Reads jobs/skills/houseTypes/food catalogs into a plain object so tick systems
 * can use ctx.catalog instead of getCatalog() on every hot-path step.
 * @returns {Record<string, unknown[]>}
 */
function buildCtxCatalog() {
  /** @type {Record<string, unknown[]>} */
  const catalog = {};
  for (const name of ['jobs', 'skills', 'houseTypes', 'food', 'goods']) {
    if (hasCatalog(name)) {
      const cat = /** @type {Record<string, unknown>} */ (getCatalog(name));
      // Each catalog stores items under the same key as the catalog name
      const items = cat[name];
      catalog[name] = Array.isArray(items) ? items : [];
    }
  }
  return catalog;
}

/**
 * Bootstraps engine context (registry + periodics + commands).
 * Called both on fresh start and after load (registry is not part of save).
 * BLOCKER-1 fix: registers assignJob + startSkill (in addition to setSpeed)
 * and builds ctx.catalog from the globally loaded catalogs (BL-3 Var. A preload).
 * @returns {{ ctx: import('../core/state/types.js').TickContext, creg: import('../core/commands/dispatch.js').CommandRegistry }}
 */
function bootstrapEngine() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const creg = createCommandRegistry();
  registerSetSpeed(creg);
  registerAssignJob(creg);
  registerStartSkill(creg);
  registerSetTaxRate(creg);
  // iter-011 M4b: market + caravan commands
  registerBuyGoods(creg);
  registerSellGoods(creg);
  registerSendCaravan(creg);
  // BL-3 Var. A: preload catalog into ctx so tick systems avoid getCatalog() in hot-path
  const catalog = buildCtxCatalog();
  return { ctx: { registry, periodics, catalog }, creg };
}

/**
 * Core boot sequence: pure orchestration logic, testable with injected env.
 * All browser/DOM access injected via `env`, so this function runs in Node tests.
 *
 * @param {Object} env
 * @param {() => number} env.now - wall-clock (Date.now)
 * @param {(cb: FrameRequestCallback) => number} env.raf - requestAnimationFrame
 * @param {(id: number) => void} env.cancelRaf - cancelAnimationFrame
 * @param {(ms: number, cb: () => void) => unknown} env.setInterval - setInterval
 * @param {EventTarget & { visibilityState?: string }} env.lifecycleTarget - document
 * @param {EventTarget} [env.lifecycleWin] - window (for pagehide)
 * @param {(info: object) => void} env.showError - show error screen
 * @param {(deps: { state: import('../core/state/types.js').GameState, send: (type: string, params?: Record<string,unknown>) => {ok: boolean, error?: string}, getExtraProps?: () => object }) => { requestRender: () => void }} env.mountUI - mount UI
 * @param {() => Promise<void>} env.loadCatalogs - load all catalogs
 * @param {(slotId: string, catalog: object) => Promise<{state: import('../core/state/types.js').GameState, record: {lastSimTimestamp: number}} | null>} env.loadGame - load game
 * @param {(state: import('../core/state/types.js').GameState) => Promise<unknown>} env.saveGame - save game
 * @param {(state: import('../core/state/types.js').GameState, opts?: object) => string} env.exportToString
 * @param {(str: string, catalog: object) => {state: import('../core/state/types.js').GameState, lastSimTimestamp: number}} env.importFromString
 * @returns {Promise<{
 *   state: import('../core/state/types.js').GameState,
 *   autosave: import('./autosave.js').Autosave,
 *   offlineSummary: import('../ui/OfflineSummary.js').OfflineSummaryModel | null,
 *   loop: { start: () => void, stop: () => void }
 * } | null>}
 */
export async function bootSequence(env) {
  const { now } = env;

  // B-1: Load catalogs first (before any game load)
  try {
    await env.loadCatalogs();
  } catch (e) {
    env.showError({
      kind: 'catalog',
      message: 'Nepodařilo se načíst herní katalogy.',
      error: e instanceof Error ? e : new Error(String(e)),
    });
    return null;
  }

  // B-1: loadGame with catalog → goes through loadAndReconstruct (7-step pipeline)
  /** @type {import('../core/state/types.js').GameState} */
  let state;
  /** @type {number} */
  let lastSimTimestamp;

  try {
    const CATALOG = {};
    const loaded = await env.loadGame(SLOT_ID, CATALOG);
    if (loaded) {
      state = loaded.state;
      lastSimTimestamp = loaded.record.lastSimTimestamp;
    } else {
      state = bootstrapNewState(DEFAULT_SEED);
      lastSimTimestamp = now();
    }
  } catch (e) {
    env.showError({
      kind: 'save',
      message: 'Nepodařilo se načíst uloženou hru.',
      error: e instanceof Error ? e : new Error(String(e)),
    });
    return null;
  }

  try {
    // 4. Bootstrap engine
    const { ctx, creg } = bootstrapEngine();

    // M4a: Wire accounting observer – ctx.emitTx records all txEvents into council.
    // Must be set AFTER state is known so the closure captures the correct state reference.
    ctx.emitTx = (tx) => recordTx(state, tx);

    // iter-011 M4b: Initialize market supply from goods catalog (idempotent – skips existing entries).
    // Runs after catalog load and after state is set, so works for fresh start and loaded save.
    marketInit(state, /** @type {any} */ ((ctx.catalog && ctx.catalog.goods) || []));

    // B-3: Create autosave coordinator (periodic + hide bypass)
    const autosave = createAutosave({
      doSave: async () => { await env.saveGame(state); },
      minIntervalMs: AUTOSAVE_INTERVAL_MS,
      now,
    });

    // B-2: Compute offline catch-up
    const missedMs = now() - lastSimTimestamp;
    const capMs = CATCHUP_CAP_MS;
    const totalSteps = catchupStepCount(missedMs, capMs);
    const wasCapped = missedMs > capMs;

    /** @type {import('../ui/OfflineSummary.js').OfflineSummaryModel | null} */
    let offlineSummary = null;
    /** @type {{ done: number, total: number } | null} */
    let catchupProgress = null;

    // 5. Create accumulator
    const acc = createAccumulator(
      now(),
      state.engine.frameBudget
    );

    // 6. Send function (UI → commands)
    const send = (/** @type {string} */ type, /** @type {Record<string, unknown>|undefined} */ params) =>
      dispatch(creg, state, { type, params });

    // B-4: export/import handlers
    const onExport = () => {
      const str = env.exportToString(state, { lastSimTimestamp: now() });
      // Copy to clipboard if available (best-effort)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(str).catch(() => {});
      }
    };

    const onImport = () => {
      const str = typeof prompt !== 'undefined' ? prompt('Vložte exportovaný řetězec:') : null;
      if (!str) return;
      try {
        const result = env.importFromString(str, {});
        Object.assign(state, result.state);
        lastSimTimestamp = result.lastSimTimestamp;
        requestRender();
      } catch (_e) {
        // silent – in real app show error screen
      }
    };

    // B-4: dismiss handler
    const onDismissOfflineSummary = () => {
      offlineSummary = null;
      requestRender();
    };

    // 7. Mount UI (render function forward-declared for use in callbacks)
    let requestRender = () => {};
    const mounted = env.mountUI({
      state,
      send,
      getExtraProps: () => ({
        offlineSummary,
        catchupProgress,
        onDismissOfflineSummary,
        onExport,
        onImport,
      }),
    });
    requestRender = mounted.requestRender;

    // 8. Create game loop
    const loop = createGameLoop({
      state,
      ctx,
      acc,
      nowFn: now,
      raf: env.raf,
      cancelRaf: env.cancelRaf,
      onDirty: requestRender,
    });

    // B-3: Wire lifecycle (visibilitychange / pagehide → autosave with 'hide' bypass)
    attachLifecycle({
      target: env.lifecycleTarget,
      win: env.lifecycleWin,
      onHide: () => { autosave.requestSave('hide'); },
    });

    // B-3: Wire periodic autosave
    env.setInterval(AUTOSAVE_INTERVAL_MS, () => { autosave.requestSave('periodic'); });

    // B-2: Run catch-up BEFORE starting live loop (§2.4)
    if (totalSteps > 0) {
      catchupProgress = { done: 0, total: totalSteps };
      requestRender();

      const result = await runCatchupBatch({
        state,
        ctx,
        totalSteps,
        wasCapped,
        onChunk: async (done, total) => {
          catchupProgress = { done, total };
          requestRender();
          // Yield to allow UI to update
          await new Promise(res => setTimeout(res, 0));
        },
      });

      // B-3: Autosave after completed catch-up (§3.2: only when complete)
      if (!result.interrupted) {
        autosave.requestSave('event');
      }

      // Build and store offline summary
      offlineSummary = buildOfflineSummary({
        missedMs,
        wasCapped: result.capped,
        stepsRun: result.stepsRun,
        interrupted: result.interrupted,
      });
      catchupProgress = null;
      requestRender();
    }

    // 10. Start live loop
    loop.start();

    return { state, autosave, offlineSummary, loop };
  } catch (e) {
    env.showError({
      kind: 'boot',
      message: 'Nepodařilo se spustit hru.',
      error: e instanceof Error ? e : new Error(String(e)),
    });
    return null;
  }
}

/**
 * Main boot sequence (browser entry point).
 */
export async function boot() {
  const root = /** @type {HTMLElement} */ (document.getElementById('app'));

  // 1. Request persistent storage (best-effort, non-blocking)
  requestPersistentStorage();

  // 2. Register service worker (best-effort)
  await registerServiceWorker();

  await bootSequence({
    now: Date.now.bind(Date),
    raf: requestAnimationFrame.bind(globalThis),
    cancelRaf: cancelAnimationFrame.bind(globalThis),
    setInterval: (ms, cb) => setInterval(cb, ms),
    lifecycleTarget: document,
    lifecycleWin: window,
    showError: (info) => showErrorScreen(root, /** @type {any} */ (info)),
    mountUI: (deps) => mountUI({
      state: deps.state,
      send: deps.send,
      root,
      raf: requestAnimationFrame.bind(globalThis),
      getExtraProps: deps.getExtraProps,
    }),
    loadCatalogs: () => loadAllCatalogs(),
    loadGame: (slotId, catalog) => loadGame(slotId, catalog),
    saveGame: (state) => saveGame(state),
    exportToString,
    importFromString,
  });
}

// Auto-start (only in browser environment)
if (typeof document !== 'undefined') {
  boot();
}
