/**
 * boot-integration.test.js – iter-008 T-002 (RE-RUN 1)
 * Integration test for the boot sequence wiring (B-1..B-4).
 *
 * Tests bootSequence(env) with a fake env (no DOM, no browser APIs).
 * Each test verifies that a specific wiring is in place by checking that:
 * - removing/breaking the wiring causes the test to FAIL
 * - correct wiring causes the test to PASS
 *
 * Covers:
 * - B-1: catalogs loaded before loadGame; loadGame called with catalog
 * - B-2: catch-up runs when lastSimTimestamp indicates offline time
 * - B-3: createAutosave wired (periodic requestSave + hide bypass via lifecycle)
 * - B-4: export/import + OfflineSummary/CatchupProgress accessible after boot
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { bootSequence } from '../src/app/main.js';
import { createCommandRegistry, dispatch } from '../src/core/commands/dispatch.js';
import { registerSetSpeed } from '../src/core/commands/setSpeed.js';
import { registerAssignJob } from '../src/core/commands/assignJob.js';
import { registerStartSkill } from '../src/core/commands/startSkill.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create fake EventTarget for lifecycle testing */
function makeFakeEventTarget() {
  const listeners = /** @type {Map<string, Function[]>} */ (new Map());
  return {
    visibilityState: 'visible',
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = listeners.get(type) ?? [];
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    },
    /** Simulate event firing */
    fire(type) {
      (listeners.get(type) ?? []).forEach(fn => fn());
    },
    /** Get listener count for a type */
    listenerCount(type) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

/** Create a minimal fake loop (no rAF needed) */
function makeFakeLoop() {
  let started = false;
  return {
    start: () => { started = true; },
    stop: () => { started = false; },
    get started() { return started; },
  };
}

/** Create fresh initial state with some population */
function makeFreshState(seed = 0xB001234) {
  const state = createInitialState({ seed });
  initRng(state);
  state.home.population.total = 50;
  state.home.housing.counts = { tent: 3 };
  state.home.food.store = { bread: 300, fish: 50 };
  state.player.gold = 500;
  return state;
}

/**
 * Build a minimal fake env for bootSequence.
 * Overrides can patch specific parts.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function makeFakeEnv(overrides = {}) {
  let nowMs = 1_700_000_000_000;
  const saveLog = [];
  const renderLog = [];
  const errorLog = [];
  let setIntervalCb = null;
  const lifecycleTarget = makeFakeEventTarget();
  const lifecycleWin = makeFakeEventTarget();
  let catalogsLoaded = false;
  let loadGameCalledWithCatalog = false;

  const env = {
    now: () => nowMs,
    advanceTime: (ms) => { nowMs += ms; },
    // Non-recursive fake raf: stores the callback but does NOT call it immediately.
    // The loop will never run in tests, which is fine - we only test boot wiring, not loop execution.
    raf: (_cb) => 1,
    cancelRaf: () => {},
    setInterval: (ms, cb) => { setIntervalCb = cb; return 1; },
    triggerInterval: () => { if (setIntervalCb) setIntervalCb(); },
    lifecycleTarget,
    lifecycleWin,
    showError: (info) => { errorLog.push(info); },
    mountUI: (deps) => ({
      requestRender: () => { renderLog.push({ ts: nowMs }); },
    }),
    loadCatalogs: async () => {
      // Load real catalogs into the global store
      clearCatalogs();
      for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
        loadCatalog(name, loadJson(name));
      }
      catalogsLoaded = true;
    },
    // Default: no save exists (fresh game)
    loadGame: async (_slotId, catalog) => {
      loadGameCalledWithCatalog = catalog !== undefined;
      return null;
    },
    // Default: no-op save (avoid real IDB in unit tests)
    saveGame: async (_state) => {
      saveLog.push({ ts: nowMs });
    },
    exportToString: (state, opts) => {
      const { exportToString: realExport } = /** @type {any} */ ({ exportToString: (...args) => args });
      // Use dynamic import (sync fake: just return a marker)
      return 'FAKE_EXPORT_' + nowMs;
    },
    importFromString: (str, catalog) => {
      throw new Error('importFromString not called in this test');
    },
    // Inspection helpers
    get catalogsLoaded() { return catalogsLoaded; },
    get loadGameCalledWithCatalog() { return loadGameCalledWithCatalog; },
    get saveLog() { return saveLog; },
    get renderLog() { return renderLog; },
    get errorLog() { return errorLog; },
    get triggerInterval_() { return setIntervalCb; },
    ...overrides,
  };

  return env;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

before(() => {
  // Pre-load catalogs for state creation helpers (makeFreshState, etc.)
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
    loadCatalog(name, loadJson(name));
  }
});

after(() => {
  clearCatalogs();
});

// ---------------------------------------------------------------------------
// B-1: Catalogs loaded before loadGame; loadGame called with catalog
// ---------------------------------------------------------------------------
describe('B-1: catalog loading wiring', () => {
  it('bootSequence calls loadCatalogs before loadGame', async () => {
    const callOrder = [];
    const env = makeFakeEnv({
      loadCatalogs: async () => {
        callOrder.push('loadCatalogs');
        clearCatalogs();
        for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
          loadCatalog(name, loadJson(name));
        }
      },
      loadGame: async (_slotId, _catalog) => {
        callOrder.push('loadGame');
        return null; // fresh game (no IDB needed to test call order)
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(callOrder.includes('loadCatalogs'), 'loadCatalogs must be called');
    assert.ok(callOrder.includes('loadGame'), 'loadGame must be called');
    const catalogIdx = callOrder.indexOf('loadCatalogs');
    const loadGameIdx = callOrder.indexOf('loadGame');
    assert.ok(catalogIdx < loadGameIdx, 'loadCatalogs must be called BEFORE loadGame (B-1 wiring)');
  });

  it('loadGame is called with a catalog argument (not undefined)', async () => {
    let capturedCatalogArg;
    const env = makeFakeEnv({
      loadGame: async (_slotId, catalog) => {
        capturedCatalogArg = catalog;
        return null; // fresh game (no IDB needed to test catalog argument)
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.notEqual(capturedCatalogArg, undefined, 'loadGame must receive a catalog argument (B-1 fix: not undefined)');
  });

  it('bootSequence returns null and calls showError when loadCatalogs fails', async () => {
    const errorLog = [];
    const env = makeFakeEnv({
      loadCatalogs: async () => { throw new Error('catalog fetch failure'); },
      showError: (info) => errorLog.push(info),
    });

    const result = await bootSequence(env);
    assert.equal(result, null, 'Should return null on catalog failure');
    assert.equal(errorLog.length, 1, 'showError should be called');
    assert.equal(errorLog[0].kind, 'catalog', 'Error kind should be catalog');
  });
});

// ---------------------------------------------------------------------------
// B-2: Catch-up runs when offline time detected
// ---------------------------------------------------------------------------
describe('B-2: offline catch-up wiring', () => {
  it('catch-up runs when lastSimTimestamp indicates offline time', async () => {
    // Use a fixed "current time" and simulate a save with a timestamp 2 minutes before it.
    // Inject loadGame to return a pre-built state with the right lastSimTimestamp (no real IDB needed).
    const FIXED_NOW = 1_700_000_000_000;
    const TWO_MINUTES_AGO = FIXED_NOW - 2 * 60 * 1000;

    const savedState = makeFreshState();
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const ctx = { registry, periodics };
    for (let i = 0; i < 100; i++) step(savedState, ctx);

    const env = makeFakeEnv({
      now: () => FIXED_NOW,
      loadGame: async () => ({
        state: savedState,
        record: { lastSimTimestamp: TWO_MINUTES_AGO },
      }),
    });
    const result = await bootSequence(env);

    assert.ok(result !== null, 'bootSequence should succeed');

    // After boot, state.engine.curStep should have advanced (catch-up ran)
    // 2 minutes = 120,000 ms → 120,000 / 50 ms = 2400 steps minimum
    assert.ok(result.state.engine.curStep > 100,
      `catch-up should have advanced curStep beyond initial 100 steps (got ${result.state.engine.curStep})`);
  });

  it('offline summary is available when catch-up ran', async () => {
    // Simulate a save with a timestamp 1 minute before FIXED_NOW via injected loadGame
    const FIXED_NOW = 1_700_000_000_000;
    const ONE_MINUTE_AGO = FIXED_NOW - 60 * 1000;

    const savedState = makeFreshState();

    const result = await bootSequence(makeFakeEnv({
      now: () => FIXED_NOW,
      loadGame: async () => ({
        state: savedState,
        record: { lastSimTimestamp: ONE_MINUTE_AGO },
      }),
    }));

    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(result.offlineSummary !== null,
      'offlineSummary should be set after catch-up (B-2/B-4 wiring)');
    assert.ok(result.offlineSummary.stepsRun > 0,
      'offlineSummary.stepsRun should be > 0');
    assert.ok(typeof result.offlineSummary.missedMs === 'number',
      'offlineSummary.missedMs should be a number');
  });

  it('no catch-up runs when no save exists (fresh game)', async () => {
    // Simulate no save by overriding loadGame to return null
    const env = makeFakeEnv({
      loadGame: async () => null,  // no save → fresh game
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed on fresh game');
    assert.equal(result.offlineSummary, null,
      'offlineSummary should be null when no offline time elapsed (fresh game)');
  });
});

// ---------------------------------------------------------------------------
// B-3: Autosave wiring
// ---------------------------------------------------------------------------
describe('B-3: autosave wiring', () => {
  it('autosave is returned from bootSequence (wired)', async () => {
    const result = await bootSequence(makeFakeEnv());
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(result.autosave, 'autosave should be returned from bootSequence');
    assert.ok(typeof result.autosave.requestSave === 'function',
      'autosave.requestSave should be a function');
    assert.ok(typeof result.autosave.flush === 'function',
      'autosave.flush should be a function');
  });

  it('hide event triggers autosave via lifecycle (B-3: not raw saveGame)', async () => {
    const saveLog = [];
    const lifecycleTarget = makeFakeEventTarget();
    lifecycleTarget.visibilityState = 'visible';

    const env = makeFakeEnv({
      lifecycleTarget,
      // Spy save (no real IDB needed – we only test that save IS called)
      saveGame: async (_state) => { saveLog.push('save'); },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');

    // Simulate visibilitychange to hidden
    lifecycleTarget.visibilityState = 'hidden';
    lifecycleTarget.fire('visibilitychange');

    // Allow microtasks to run
    await new Promise(res => setTimeout(res, 20));

    assert.ok(saveLog.length >= 1,
      'hide event should trigger an autosave (B-3: lifecycle wired to autosave)');
  });

  it('periodic setInterval is wired for autosave (B-3)', async () => {
    let intervalRegistered = false;
    let intervalCallback = null;
    const saveLog = [];

    const env = makeFakeEnv({
      setInterval: (ms, cb) => {
        intervalRegistered = true;
        intervalCallback = cb;
        return 1;
      },
      // Spy save (no real IDB needed – we only test that save IS called)
      saveGame: async (_state) => { saveLog.push('save'); },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(intervalRegistered, 'setInterval must be called for periodic autosave (B-3)');
    assert.ok(intervalCallback !== null, 'interval callback must be registered');

    // Trigger the interval
    intervalCallback();
    await new Promise(res => setTimeout(res, 20));
    assert.ok(saveLog.length >= 1, 'Periodic interval should trigger a save (B-3)');
  });
});

// ---------------------------------------------------------------------------
// B-4: Export/import and OfflineSummary/CatchupProgress accessible
// ---------------------------------------------------------------------------
describe('B-4: export/import and UI components wiring', () => {
  it('mountUI is called with getExtraProps (provides offlineSummary, catchupProgress, onExport, onImport)', async () => {
    let capturedGetExtraProps = null;

    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedGetExtraProps = deps.getExtraProps;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(typeof capturedGetExtraProps === 'function',
      'mountUI must receive getExtraProps function (B-4 wiring)');

    const extraProps = capturedGetExtraProps();
    assert.ok('onExport' in extraProps,
      'getExtraProps must include onExport (B-4: export wired)');
    assert.ok('onImport' in extraProps,
      'getExtraProps must include onImport (B-4: import wired)');
    assert.ok('onDismissOfflineSummary' in extraProps,
      'getExtraProps must include onDismissOfflineSummary (B-4: summary wired)');
    assert.ok('offlineSummary' in extraProps,
      'getExtraProps must include offlineSummary (B-4: summary wired)');
    assert.ok('catchupProgress' in extraProps,
      'getExtraProps must include catchupProgress (B-4: progress wired)');
  });

  it('exportToString is called from onExport handler', async () => {
    let exportCalled = false;
    let exportCalledWithState = null;

    const env = makeFakeEnv({
      exportToString: (state, opts) => {
        exportCalled = true;
        exportCalledWithState = state;
        return 'EXPORT_STR';
      },
    });

    let capturedOnExport = null;
    env.mountUI = (deps) => {
      const { requestRender } = { requestRender: () => {} };
      // Capture the getExtraProps to get onExport later
      const origGetExtraProps = deps.getExtraProps;
      if (origGetExtraProps) {
        capturedOnExport = () => origGetExtraProps().onExport && origGetExtraProps().onExport();
      }
      return { requestRender };
    };

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(capturedOnExport !== null, 'onExport should be captured');

    // Call onExport (simulate user clicking Export)
    capturedOnExport();
    assert.ok(exportCalled, 'exportToString must be called when onExport is triggered (B-4)');
    assert.ok(exportCalledWithState !== null, 'exportToString must receive game state');
  });
});

// ---------------------------------------------------------------------------
// Full boot path integration test (wiring check: FAILS if any wiring is missing)
// ---------------------------------------------------------------------------
describe('full boot path: catalogs→save→catch-up→autosave→summary', () => {
  it('complete boot sequence with offline time: all wiring in place', async () => {
    // Use a fixed "current time" and simulate a save from 90 seconds ago via injected loadGame
    const FIXED_NOW = 1_700_000_000_000;
    const NINETY_SECONDS_AGO = FIXED_NOW - 90 * 1000;

    const savedState = makeFreshState(0xB007E57);
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const ctx = { registry, periodics };
    for (let i = 0; i < 50; i++) step(savedState, ctx);

    // Track all wiring events
    const wiringEvents = {
      catalogsLoaded: false,
      loadGameCalledWithCatalog: false,
      catchupProgressed: false,
      autosaveWired: false,
      mountUICalledWithExtraProps: false,
    };

    const env = makeFakeEnv({
      now: () => FIXED_NOW,
      loadCatalogs: async () => {
        wiringEvents.catalogsLoaded = true;
        clearCatalogs();
        for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
          loadCatalog(name, loadJson(name));
        }
      },
      loadGame: async (slotId, catalog) => {
        wiringEvents.loadGameCalledWithCatalog = catalog !== undefined;
        return { state: savedState, record: { lastSimTimestamp: NINETY_SECONDS_AGO } };
      },
      setInterval: (ms, cb) => {
        wiringEvents.autosaveWired = true;
        return 1;
      },
      mountUI: (deps) => {
        if (deps.getExtraProps) wiringEvents.mountUICalledWithExtraProps = true;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);

    // Verify all wiring is present
    assert.ok(result !== null, 'bootSequence should succeed with full wiring');
    assert.ok(wiringEvents.catalogsLoaded,
      'B-1: catalogs must be loaded during boot');
    assert.ok(wiringEvents.loadGameCalledWithCatalog,
      'B-1: loadGame must be called with catalog (loadAndReconstruct path)');
    assert.ok(result.state.engine.curStep > 50,
      `B-2: catch-up must have advanced curStep (got ${result.state.engine.curStep}, expected > 50)`);
    assert.ok(result.offlineSummary !== null,
      'B-2/B-4: offlineSummary must be set after catch-up');
    assert.ok(wiringEvents.autosaveWired,
      'B-3: setInterval must be called for periodic autosave');
    assert.ok(wiringEvents.mountUICalledWithExtraProps,
      'B-4: mountUI must receive getExtraProps (for OfflineSummary/CatchupProgress/export/import)');
  });
});

// ---------------------------------------------------------------------------
// BLOCKER-1: Command registration bootstrap test
// These tests fail if bootstrapEngine does NOT register assignJob/startSkill.
// ---------------------------------------------------------------------------
describe('BLOCKER-1: command registration bootstrap (assignJob + startSkill + ctx.catalog)', () => {
  it('assignJob and startSkill are registered in creg after bootSequence', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        // bootSequence wires send = dispatch(creg, state, ...) – but we need to test creg directly.
        // We cannot access creg from outside, so we test via send() dispatch: dispatch returns
        // ok:false with error "unknown command" if the command is NOT registered.
        capturedSend = deps.send ?? null;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');
    assert.ok(typeof capturedSend === 'function', 'send must be provided to mountUI');

    // assignJob: if not registered, dispatch returns {ok:false, error:"unknown command: assignJob"}
    const assignJobResult = capturedSend('assignJob', { jobId: 'baker', delta: 0 });
    assert.ok(
      !assignJobResult.error?.includes('unknown command'),
      `assignJob must be registered in creg (got: ${assignJobResult.error ?? 'ok'})`
    );

    // startSkill: if not registered, dispatch returns {ok:false, error:"unknown command: startSkill"}
    const startSkillResult = capturedSend('startSkill', { skillId: 'woodworking' });
    assert.ok(
      !startSkillResult.error?.includes('unknown command'),
      `startSkill must be registered in creg (got: ${startSkillResult.error ?? 'ok'})`
    );
  });

  it('assignJob with delta=0 returns ok (no-op, proves registration works)', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedSend = deps.send ?? null;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence should succeed');

    // delta=0 is a no-op in assignJob and always returns ok:true if command IS registered
    const r = capturedSend('assignJob', { jobId: 'baker', delta: 0 });
    assert.ok(r.ok, `assignJob delta=0 no-op should return ok:true (command registered). Got: ${JSON.stringify(r)}`);
  });

  it('regression: if creg only has setSpeed, assignJob dispatch returns unknown-command error', () => {
    // This test directly verifies the regression scenario (what the bug looked like before the fix).
    // If someone accidentally removes registerAssignJob from bootstrapEngine, this test catches it.
    const creg = createCommandRegistry();
    registerSetSpeed(creg); // only setSpeed, NOT assignJob/startSkill

    const state = createInitialState();

    const r1 = dispatch(creg, state, { type: 'assignJob', params: { jobId: 'baker', delta: 0 } });
    assert.ok(!r1.ok, 'without registerAssignJob, dispatch must return ok:false');
    assert.ok(r1.error?.includes('unknown command'), 'error must say "unknown command"');

    const r2 = dispatch(creg, state, { type: 'startSkill', params: { skillId: 'woodworking' } });
    assert.ok(!r2.ok, 'without registerStartSkill, dispatch must return ok:false');
    assert.ok(r2.error?.includes('unknown command'), 'error must say "unknown command"');
  });

  it('regression: with all three registered, all commands are reachable', () => {
    const creg = createCommandRegistry();
    registerSetSpeed(creg);
    registerAssignJob(creg);
    registerStartSkill(creg);

    const state = createInitialState();

    // setSpeed
    const r0 = dispatch(creg, state, { type: 'setSpeed', params: { speed: 1 } });
    assert.ok(!r0.error?.includes('unknown command'), 'setSpeed must be reachable');

    // assignJob delta=0 no-op
    const r1 = dispatch(creg, state, { type: 'assignJob', params: { jobId: 'baker', delta: 0 } });
    assert.ok(!r1.error?.includes('unknown command'), 'assignJob must be reachable after registration');

    // startSkill (catalog not loaded → graceful degradation: unknown skillId still not "unknown command")
    const r2 = dispatch(creg, state, { type: 'startSkill', params: { skillId: 'woodworking' } });
    assert.ok(!r2.error?.includes('unknown command'), 'startSkill must be reachable after registration');
  });
});
