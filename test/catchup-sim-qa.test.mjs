/**
 * QA T-007: Empirical catch-up simulation test
 * Tests: long sim no-crash, determinism, faction transitions, batch==incremental, arm after load.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { registerWorldEffects, armFactionAI } from '../src/core/systems/world.js';
import { step, STEPS_PER_DAY } from '../src/core/engine/clock.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'zones']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) {}
  }
  loadCatalog('population', loadJson('population'));
});

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  registerWorldEffects(registry);
  return { registry, periodics, catalog: {} };
}

function makeState(seed = 0xDEADBEEF) {
  const state = createInitialState({ seed });
  initRng(state);
  // Start just before aiMechanicStart so AI will trigger soon
  state.engine.curStep = BALANCE.world.aiMechanicStart - 100;
  armFactionAI(state);
  return state;
}

/** Run n steps synchronously */
function runSteps(state, ctx, n) {
  for (let i = 0; i < n; i++) {
    step(state, ctx);
  }
}

const GAME_YEAR_STEPS = 365 * STEPS_PER_DAY;

// ─── Test 1: Long sim >= 1 game year — no crash ───────────────────────────────
describe('QA-CATCHUP-1: long sim >= 1 year no crash', () => {
  it('runs >= 1 game year without throwing', () => {
    const state = makeState(0xC0DE);
    const ctx = makeCtx();
    assert.doesNotThrow(() => runSteps(state, ctx, GAME_YEAR_STEPS));
    assert.ok(state.engine.curStep >= BALANCE.world.aiMechanicStart - 100 + GAME_YEAR_STEPS,
      `curStep should have advanced by ${GAME_YEAR_STEPS}, got ${state.engine.curStep}`);
  });
});

// ─── Test 2: Determinism — same seed → same hashState ────────────────────────
describe('QA-CATCHUP-2: determinism same seed same hashState', () => {
  it('same seed produces same hashState after 1-year sim', () => {
    function runSim(seed) {
      const state = makeState(seed);
      const ctx = makeCtx();
      runSteps(state, ctx, GAME_YEAR_STEPS);
      return hashState(state);
    }
    const h1 = runSim(0xDEAD);
    const h2 = runSim(0xDEAD);
    assert.strictEqual(h1, h2, 'same seed must produce same hashState (determinism)');
  });
});

// ─── Test 3: Faction state transitions — not no-op ────────────────────────────
describe('QA-CATCHUP-3: faction state transitions not no-op', () => {
  it('at least one faction changes state after AI mechanics activate', () => {
    const state = makeState(0xBEEF);
    const ctx = makeCtx();
    
    const factions = /** @type {any} */ (state.world?.factions) || {};
    const initialStates = {};
    for (const [fid, f] of Object.entries(factions)) {
      initialStates[fid] = (/** @type {any} */ (f)).state;
    }
    
    // Run 5 aiTurnPeriods past the gate
    const stepsToRun = BALANCE.world.aiTurnPeriod * 5 + STEPS_PER_DAY;
    runSteps(state, ctx, stepsToRun + 200); // +200 to cross the gate
    
    let anyChanged = false;
    for (const [fid, f] of Object.entries((/** @type {any} */ (state.world?.factions)) || {})) {
      if ((/** @type {any} */ (f)).state !== initialStates[fid]) {
        anyChanged = true;
        break;
      }
    }
    
    assert.ok(anyChanged,
      `No faction changed state. Initial: ${JSON.stringify(initialStates)}, ` +
      `final: ${JSON.stringify(Object.fromEntries(Object.entries((/** @type {any} */ (state.world?.factions)) || {}).map(([k,v]) => [k, (/** @type {any} */ (v)).state])))}`
    );
  });
});

// ─── Test 4: Batch == incremental ────────────────────────────────────────────
describe('QA-CATCHUP-4: batch == incremental', () => {
  it('1-year batch vs 7-day incremental chunks produce same hashState', () => {
    const CHUNK = 7 * STEPS_PER_DAY;
    
    // Batch
    const stateA = makeState(0x1234);
    const ctxA = makeCtx();
    runSteps(stateA, ctxA, GAME_YEAR_STEPS);
    const hashA = hashState(stateA);
    
    // Incremental (7-day chunks)
    const stateB = makeState(0x1234);
    const ctxB = makeCtx();
    let remaining = GAME_YEAR_STEPS;
    while (remaining > 0) {
      const n = Math.min(CHUNK, remaining);
      runSteps(stateB, ctxB, n);
      remaining -= n;
    }
    const hashB = hashState(stateB);
    
    assert.strictEqual(hashA, hashB,
      `batch hash ${hashA} != incremental hash ${hashB}`);
  });
});

// ─── Test 5: armFactionAI after save/load — no duplicates ────────────────────
describe('QA-CATCHUP-5: armFactionAI after load no duplicates', () => {
  it('armFactionAI after load produces exactly 3 unique processFaction entries', () => {
    const state = makeState(0xABCD);
    const ctx = makeCtx();
    runSteps(state, ctx, 10 * STEPS_PER_DAY);
    
    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));
    armFactionAI(loaded);
    
    const entries = (loaded.engine?.schedule || [])
      .filter((/** @type {any} */ e) => e.id === 'world.processFaction')
      .map((/** @type {any} */ e) => e.params?.factionId);
    
    const unique = new Set(entries);
    assert.strictEqual(entries.length, 3,
      `Expected 3 processFaction entries, got ${entries.length}: ${JSON.stringify(entries)}`);
    assert.ok(unique.has('theWarlord'), 'theWarlord must be present');
    assert.ok(unique.has('thePrincess'), 'thePrincess must be present');
    assert.ok(unique.has('thePsychopath'), 'thePsychopath must be present');
  });
});
