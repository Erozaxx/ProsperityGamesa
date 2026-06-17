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
import { registerBuyCompany } from '../core/commands/buyCompany.js';
import { registerBuild } from '../core/commands/build.js';
import { registerBuyTech } from '../core/commands/buyTech.js';
import { registerRecruitUnit } from '../core/commands/recruitUnit.js';
import { registerContractCommands } from '../core/commands/contracts.js';
import { registerQuestCommands } from '../core/commands/quests.js';
import { registerBattleCommands } from '../core/commands/battleCommand.js';
import { registerStoryCommands } from '../core/commands/story.js';
import { registerEffects } from '../core/registry/effects.js';
import { registerContractEffects, armContractOffer } from '../core/systems/contracts.js';
import { registerWorldEffects, armFactionAI } from '../core/systems/world.js';
import { armBanditRaid } from '../core/systems/battle.js';
import { marketInit } from '../core/systems/market.js';
import { BALANCE } from '../core/balance/balance.js';
import { recordTx } from '../core/resources/accounting.js';
import { getCatalog, hasCatalog } from '../core/catalog/index.js';
import { requestPersistentStorage, isStoragePersisted, getLastExportAt, setLastExportAt, evaluateExportReminder } from './persist.js';
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
import { createUiEventBus, aggregateUiEvents } from './uiEventBus.js';

const DEFAULT_SEED = 0x9E3779B9;

/** Default autosave interval: 60 s (design §5.2). */
const AUTOSAVE_INTERVAL_MS = 60_000;

/**
 * Cap for offline catch-up, in ms. iter-020 M9a T3 (MINOR-1, DR-020-01 §2):
 * DERIVED from BALANCE — effective cap = min(tech, balance) — NOT a hardcoded literal.
 * Tech cap = engine survivability (M0 benchmark); balance cap = healthy-progress UX value.
 * Without this wiring capBalanceRealHours would be a latent no-op (firstStarve-class trap).
 */
export const CATCHUP_CAP_MS =
  Math.min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * 3600 * 1000;

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
 * @returns {import('../core/state/types.js').CatalogCache}
 */
function buildCtxCatalog() {
  /** @type {Record<string, unknown>} */
  const catalog = {};
  for (const name of ['jobs', 'skills', 'houseTypes', 'food', 'goods']) {
    if (hasCatalog(name)) {
      const cat = /** @type {Record<string, unknown>} */ (getCatalog(name));
      // Each catalog stores items under the same key as the catalog name
      const items = cat[name];
      catalog[name] = Array.isArray(items) ? items : [];
    }
  }
  // iter-019 M8 T1: story catalog uses an events map (not array)
  if (hasCatalog('story')) {
    const cat = getCatalog('story');
    catalog['story'] = cat; // entire catalog object (events map)
  }
  // iter-019 M8 T3: achievements catalog (entire object for achievementsEval)
  if (hasCatalog('achievements')) {
    const cat = getCatalog('achievements');
    catalog['achievements'] = cat;
  }
  return /** @type {import('../core/state/types.js').CatalogCache} */ (catalog);
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
  // iter-014 M5-2 T5 B1: register contract schedule handlers (§14.1)
  registerContractEffects(registry);
  // iter-017 M7a-2 T2: world AI schedule handlers
  registerWorldEffects(registry);
  const creg = createCommandRegistry();
  registerSetSpeed(creg);
  registerAssignJob(creg);
  registerStartSkill(creg);
  registerSetTaxRate(creg);
  // iter-011 M4b: market + caravan commands
  registerBuyGoods(creg);
  registerSellGoods(creg);
  registerSendCaravan(creg);
  // iter-013 M5-1 T3: builder companies
  registerBuyCompany(creg);
  // iter-014 M5-2 T5 B1: build command wired (was dark code M5-1) + contract commands (§14.1)
  registerBuild(creg);
  registerContractCommands(creg);
  // iter-015 M6 T1: buyTech command (anti-dark-code B1 lesson)
  registerBuyTech(creg);
  // iter-016 M7a-1 T4: recruitUnit command (anti-dark-code B1 — registered here, not dark code)
  registerRecruitUnit(creg);
  // iter-017 M7a-2 T3: quest commands (acceptQuest/rejectQuest)
  registerQuestCommands(creg);
  // iter-018 M7b T3: battleCommand (hráčské bojové akce → battle queue; anti-dark-code B1)
  registerBattleCommands(creg);
  // iter-019 M8 T1: story commands (acknowledgeEvent)
  registerStoryCommands(creg);
  // iter-019 M8 T3: register K14 effects (unlockMap, grantResource real mutations — MIN-2)
  registerEffects(registry);
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
 * @param {() => (boolean | Promise<boolean>)} [env.getPersisted] - navigator.storage.persisted() (R-F)
 * @param {() => (number | null)} [env.getLastExportAt] - sidecar lastExportAt reader (R-F)
 * @param {(now: number) => void} [env.setLastExportAt] - sidecar lastExportAt writer (R-F)
 * @returns {Promise<{
 *   state: import('../core/state/types.js').GameState,
 *   autosave: import('./autosave.js').Autosave,
 *   offlineSummary: import('../ui/OfflineSummary.js').OfflineSummaryModel | null,
 *   loop: { start: () => void, stop: () => void },
 *   onUpdateReady: (accept: () => void) => void,
 *   flushSave: () => Promise<void>
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

    // iter-019 M8 T4: Wire ephemeral UI event bus (OUTSIDE state — zero hashState impact).
    // ctx.emitEvent pushes to bus; UI drains each render; catch-up aggregates to summary.
    const uiEvents = createUiEventBus();
    ctx.emitEvent = (ev) => uiEvents.push(ev);

    // iter-011 M4b: Initialize market supply from goods catalog (idempotent – skips existing entries).
    // Runs after catalog load and after state is set, so works for fresh start and loaded save.
    marketInit(state, /** @type {any} */ ((ctx.catalog && ctx.catalog.goods) || []));

    // iter-014 M5-2 T5 B2: Arm contract offer generator (idempotent re-arm, §14.2).
    // Mirror of marketInit: runs fresh+after load, guard scheduleCountOf===0 prevents duplicates.
    // Deterministické (žádný RNG/Date při armování), pokrývá fresh+M5-2 save+starý save.
    armContractOffer(state);

    // iter-017 M7a-2 T2: Arm faction AI schedulers (per-faction set-difference guard).
    armFactionAI(state);

    // iter-018 M7b T4: Arm bandit raid scheduler (idempotent, anti-DR-012-02).
    // Mirror of armContractOffer/armFactionAI: guard scheduleCountOf===0, covers fresh+old saves.
    armBanditRaid(state);

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

    // iter-021 T2 (R-F): export-reminder state (sidecar `lastExportAt`, OUTSIDE hashState).
    /** @type {{ reason: string } | null} */
    let exportReminder = null;
    /** @type {boolean} a new SW version is waiting */
    let updateReady = false;
    /** @type {(() => void) | null} accept handler supplied by the SW update flow */
    let acceptUpdate = null;

    // B-4: export/import handlers
    const onExport = () => {
      const str = env.exportToString(state, { lastSimTimestamp: now() });
      // Copy to clipboard if available (best-effort)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(str).catch(() => {});
      }
      // iter-021 T2 (R-F): record sidecar timestamp + clear the reminder.
      if (env.setLastExportAt) env.setLastExportAt(now());
      exportReminder = null;
      requestRender();
    };

    const onDismissExportReminder = () => {
      exportReminder = null;
      requestRender();
    };

    const onApplyUpdate = () => {
      if (acceptUpdate) acceptUpdate();
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

    // iter-019 M8 T4: Ephemeral UI events drained each render.
    // pendingUiEvents is set each render by draining the bus; UI shows toasts etc.
    // During catch-up we drain into catchupUiEventCounts (aggregate, not spam).
    /** @type {import('./uiEventBus.js').UiEvent[]} */
    let pendingUiEvents = [];
    /** @type {Record<string, number> | null} */
    let catchupUiEventCounts = null;

    // 7. Mount UI (render function forward-declared for use in callbacks)
    let requestRender = () => {};
    const mounted = env.mountUI({
      state,
      send,
      getExtraProps: () => {
        // Drain bus on every render (ephemeral — not stored in state)
        const drained = uiEvents.drain();
        if (drained.length > 0) {
          pendingUiEvents = drained;
        } else {
          pendingUiEvents = [];
        }
        return {
          offlineSummary,
          catchupProgress,
          onDismissOfflineSummary,
          onExport,
          onImport,
          pendingUiEvents,
          catchupUiEventCounts,
          exportReminder,
          onDismissExportReminder,
          updateReady,
          onApplyUpdate,
        };
      },
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

      let result = await runCatchupBatch({
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

      // MAJ-1: re-entry while-loop for engine-stopping events during catch-up
      while (result.interrupted && /** @type {any} */ (state).story && /** @type {any} */ (state).story.event) {
        // Engine stopped on a story event mid-catch-up
        requestRender(); // UI shows the event
        // Wait for player to acknowledge (engine.running becomes true)
        await new Promise(res => {
          const check = () => {
            if (!state.engine || state.engine.running !== false) { res(undefined); }
            else { setTimeout(check, 50); }
          };
          check();
        });
        // dotočit zbytek
        const remaining = result.stepsRequested - result.stepsRun;
        if (remaining <= 0) break;
        result = await runCatchupBatch({
          state,
          ctx,
          totalSteps: remaining,
          wasCapped,
          onChunk: async (done, _total) => {
            catchupProgress = { done: result.stepsRun + done, total: result.stepsRequested };
            requestRender();
            await new Promise(res => setTimeout(res, 0));
          },
        });
      }

      // B-3: Autosave after completed catch-up (§3.2: only when complete)
      if (!result.interrupted) {
        autosave.requestSave('event');
      }

      // iter-019 M8 T4: Aggregate UI events emitted during catch-up (§7.3).
      // Do NOT spam individual toasts — drain into aggregate counts for offline summary.
      const catchupEvents = uiEvents.drain();
      if (catchupEvents.length > 0) {
        catchupUiEventCounts = aggregateUiEvents(catchupEvents);
      }

      // Build and store offline summary
      // iter-018 M7b T-006: pass state + startStep for battleLog integration (§9.3)
      offlineSummary = buildOfflineSummary({
        missedMs,
        wasCapped: result.capped,
        stepsRun: result.stepsRun,
        interrupted: result.interrupted,
        state,
        startStep: state.engine.curStep - result.stepsRun,
        uiEventCounts: catchupUiEventCounts ?? undefined,
      });
      catchupProgress = null;
      requestRender();
    }

    // 10. Start live loop
    loop.start();

    // iter-021 T2 (R-F): evaluate the export reminder once at boot (non-blocking, best-effort).
    // persisted()/lastExportAt are injected; Date.now() is read in the app layer only.
    if (env.getPersisted && env.getLastExportAt) {
      const getPersisted = env.getPersisted;
      const readLastExportAt = env.getLastExportAt;
      Promise.resolve(getPersisted()).then((persisted) => {
        const decision = evaluateExportReminder({
          persisted,
          lastExportAt: readLastExportAt(),
          now: now(),
        });
        if (decision.show) {
          exportReminder = { reason: decision.reason ?? 'stale' };
          requestRender();
        }
      }).catch(() => {});
    }

    // iter-021 T2 (SW update): the boot caller wires the SW flow and calls this when an update
    // is ready, handing us the accept() action; we flip the banner on.
    const onUpdateReady = (/** @type {() => void} */ accept) => {
      acceptUpdate = accept;
      updateReady = true;
      requestRender();
    };

    // flushSave bridge for the SW flow: force an autosave to IndexedDB before the reload.
    const flushSave = () => autosave.flush();

    return { state, autosave, offlineSummary, loop, onUpdateReady, flushSave };
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

  const booted = await bootSequence({
    now: Date.now.bind(Date),
    raf: requestAnimationFrame.bind(globalThis),
    cancelRaf: cancelAnimationFrame.bind(globalThis),
    setInterval: (ms, cb) => setInterval(cb, ms),
    lifecycleTarget: document,
    lifecycleWin: window,
    showError: (info) => showErrorScreen(root, /** @type {any} */ (info)),
    // iter-021 T2 (R-F): inject app-layer eviction/export-reminder deps (Date.now/localStorage
    // read HERE only, never in core; lastExportAt is a sidecar outside the save payload).
    getPersisted: () => isStoragePersisted(),
    getLastExportAt: () => getLastExportAt(),
    setLastExportAt: (now) => setLastExportAt(now),
    mountUI: (deps) => mountUI({
      state: deps.state,
      send: deps.send,
      root,
      raf: requestAnimationFrame.bind(globalThis),
      getExtraProps: deps.getExtraProps,
      // iter-021 T1 UX-3: UI-layer clock for render throttle (performance.now, never core).
      now: (typeof performance !== 'undefined' && performance.now)
        ? performance.now.bind(performance)
        : Date.now.bind(Date),
      setTimeoutFn: (cb, ms) => setTimeout(cb, ms),
      clearTimeoutFn: (id) => clearTimeout(/** @type {any} */ (id)),
    }),
    loadCatalogs: () => loadAllCatalogs(),
    loadGame: (slotId, catalog) => loadGame(slotId, catalog),
    saveGame: (state) => saveGame(state),
    exportToString,
    importFromString,
  });

  // 2. Register service worker AFTER boot so the update flow can flush the save before reload
  //    (invariant 3). Best-effort: failure only warns.
  await registerServiceWorker({
    onUpdateReady: booted ? booted.onUpdateReady : undefined,
    flushSave: booted ? booted.flushSave : undefined,
  });
}

// Auto-start (only in browser environment)
if (typeof document !== 'undefined') {
  boot();
}
