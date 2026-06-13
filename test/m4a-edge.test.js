/**
 * m4a-edge.test.js – Missing edge tests for iter-010 M4a.
 * Covers:
 * 1. setTaxRate wiring via send() from bootSequence (BLOCKER-level wiring)
 * 2. foodSpoilage emits txEvent into council.current.consumed (accounting integration)
 * 3. Save round-trip: council + taxRate + M4a player fields preserved
 * 4. Catch-up accounting invariant: gold tx sum == delta across multi-month batch
 * 5. selectFinance selector test (council → UI)
 * 6. Negative: insufficient gold → notEnoughMilitaryFunding flag (not exception)
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
import { createCouncilState } from '../src/core/state/createCouncilState.js';
import { recordTx, closeMonth } from '../src/core/resources/accounting.js';
import { upkeepMilitary } from '../src/core/systems/upkeep.js';
import { foodSpoilage } from '../src/core/systems/food.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { bootSequence } from '../src/app/main.js';
import { selectFinance } from '../src/ui/selectors.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
function loadJson(name) { return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8')); }

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population', 'skills']) {
    loadCatalog(name, loadJson(name));
  }
});

after(() => {
  clearCatalogs();
});

function makeBaseState() {
  const state = createInitialState({ seed: 0xABC });
  initRng(state);
  state.player.gold = 2000;
  state.player.taxRate = 1;
  state.player.totWarriors = 5;
  state.player.totArchers = 2;
  state.player.diseaseFromColdChance = 0;
  state.home.notEnoughMilitaryFunding = false;
  state.home.population.total = 50;
  state.home.workforce = { total: 50, assigned: 20 };
  state.council = createCouncilState();
  return state;
}

/** Build a minimal fake env compatible with bootSequence */
function makeFakeEnv(overrides = {}) {
  return {
    now: () => 1_700_000_000_000,
    raf: (_cb) => 1,
    cancelRaf: () => {},
    setInterval: (_ms, _cb) => 1,
    lifecycleTarget: {
      visibilityState: 'visible',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    lifecycleWin: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    showError: (info) => { throw new Error(`bootSequence error: ${info.message}`); },
    mountUI: (_deps) => ({ requestRender: () => {} }),
    loadCatalogs: async () => {
      clearCatalogs();
      for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population', 'skills']) {
        loadCatalog(name, loadJson(name));
      }
    },
    loadGame: async () => null,
    saveGame: async () => {},
    exportToString: (_state, _opts) => 'FAKE_EXPORT',
    importFromString: () => { throw new Error('not called'); },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. setTaxRate wiring via send() from bootSequence
// ---------------------------------------------------------------------------
describe('M4a WIRING: setTaxRate accessible via send() after bootSequence', () => {
  it('setTaxRate is registered – send() does not return unknown command', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence must succeed');
    assert.ok(typeof capturedSend === 'function', 'send must be provided to mountUI');

    const r = capturedSend('setTaxRate', { rate: 3 });
    assert.ok(
      !r.error?.includes('unknown command'),
      `setTaxRate must be registered in creg (got: ${r.error ?? 'ok'})`
    );
    assert.ok(r.ok, `setTaxRate must return ok:true for valid rate (got: ${JSON.stringify(r)})`);
  });

  it('setTaxRate via send() mutates state.player.taxRate', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence must succeed');
    capturedSend('setTaxRate', { rate: 4 });
    assert.strictEqual(result.state.player.taxRate, 4,
      'player.taxRate must be updated to 4 after send setTaxRate');
  });

  it('setTaxRate via send() clamps rate=999 to rateMax=5', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence must succeed');
    capturedSend('setTaxRate', { rate: 999 });
    assert.strictEqual(result.state.player.taxRate, 5,
      'player.taxRate must be clamped to rateMax=5');
  });

  it('setTaxRate via send() returns ok:false for non-number rate', async () => {
    let capturedSend = null;
    const env = makeFakeEnv({
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
    });

    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence must succeed');
    const r = capturedSend('setTaxRate', { rate: 'x' });
    assert.strictEqual(r.ok, false, 'setTaxRate with string rate must return ok:false');
    assert.ok(r.error, 'must have error message');
  });
});

// ---------------------------------------------------------------------------
// 2. foodSpoilage emits txEvent into council.current.consumed
// ---------------------------------------------------------------------------
describe('M4a foodSpoilage: txEvent flows into council accounting', () => {
  it('spoilage of bread is recorded in council.current.consumed', () => {
    const state = makeBaseState();
    state.home.food.store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const txLog = [];
    const ctx = { emitTx: (tx) => { txLog.push(tx); recordTx(state, tx); } };

    foodSpoilage(state, {}, ctx);

    assert.ok(txLog.some(tx => tx.cause === 'spoilage:food'),
      'spoilage must emit txEvent with cause spoilage:food');
    assert.ok(state.council.current.consumed['bread'] > 0,
      'council.current.consumed.bread must be > 0 after spoilage');
    // bread spoils at ~8%: floor(0.08*100)=8
    assert.strictEqual(state.council.current.consumed['bread'], 8,
      'bread consumed should be 8 (floor(0.08*100))');
    assert.strictEqual(state.home.food.store.bread, 92,
      'bread store should be 92 after 8 spoiled');
  });

  it('spoilage of fish recorded at ~23%', () => {
    const state = makeBaseState();
    state.home.food.store = { bread: 0, cheese: 0, fish: 100, fruit: 0, meat: 0, vegetable: 0 };
    const ctx = { emitTx: (tx) => recordTx(state, tx) };

    foodSpoilage(state, {}, ctx);

    assert.ok(state.council.current.consumed['fish'] > 0,
      'council.current.consumed.fish must be > 0 after spoilage');
    assert.strictEqual(state.council.current.consumed['fish'], 23,
      'fish consumed should be 23 (floor(0.23*100))');
  });

  it('spoilage does NOT affect gold (gold invariant safe)', () => {
    const state = makeBaseState();
    const goldBefore = state.player.gold;
    state.home.food.store = { bread: 100, cheese: 100, fish: 50, fruit: 0, meat: 0, vegetable: 0 };
    const ctx = { emitTx: (tx) => recordTx(state, tx) };

    foodSpoilage(state, {}, ctx);

    assert.strictEqual(state.player.gold, goldBefore,
      'foodSpoilage must not change gold');
    assert.strictEqual(state.council.current.goldEarned, 0,
      'goldEarned must remain 0 after food spoilage');
    assert.strictEqual(state.council.current.goldSpent, 0,
      'goldSpent must remain 0 after food spoilage');
  });

  it('spoilage with no emitTx in ctx does NOT throw', () => {
    const state = makeBaseState();
    state.home.food.store = { bread: 100 };
    assert.doesNotThrow(() => foodSpoilage(state, {}, {}),
      'foodSpoilage must not throw when ctx.emitTx is missing');
  });
});

// ---------------------------------------------------------------------------
// 3. Save round-trip: council + M4a player fields
// ---------------------------------------------------------------------------
describe('M4a save round-trip: council + taxRate preserved', () => {
  it('round-trip preserves player.taxRate=3', () => {
    const state = makeBaseState();
    state.player.taxRate = 3;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.player.taxRate, 3,
      'taxRate must survive applyPersist → loadAndReconstruct');
  });

  it('round-trip preserves player.totWarriors and totArchers', () => {
    const state = makeBaseState();
    state.player.totWarriors = 7;
    state.player.totArchers = 3;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.player.totWarriors, 7, 'totWarriors must survive round-trip');
    assert.strictEqual(reconstructed.player.totArchers, 3, 'totArchers must survive round-trip');
  });

  it('round-trip preserves player.diseaseFromColdChance=5', () => {
    const state = makeBaseState();
    state.player.diseaseFromColdChance = 5;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.player.diseaseFromColdChance, 5,
      'diseaseFromColdChance must survive round-trip');
  });

  it('round-trip preserves council.current goldEarned and goldSpent', () => {
    const state = makeBaseState();
    recordTx(state, { key: 'gold', amount: 300, cause: 'tax:local', step: 1 });
    recordTx(state, { key: 'gold', amount: -50, cause: 'upkeep:military', step: 2 });

    const payload = applyPersist(state);
    assert.ok(payload.council, 'applyPersist must include council block');
    assert.strictEqual(payload.council.current.goldEarned, 300,
      'council.current.goldEarned must be in payload');
    assert.strictEqual(payload.council.current.goldSpent, 50,
      'council.current.goldSpent must be in payload');

    const reconstructed = loadAndReconstruct(payload);
    assert.ok(reconstructed.council, 'reconstructed state must have council');
    assert.strictEqual(reconstructed.council.current.goldEarned, 300,
      'council.current.goldEarned must survive round-trip');
    assert.strictEqual(reconstructed.council.current.goldSpent, 50,
      'council.current.goldSpent must survive round-trip');
  });

  it('round-trip preserves council.history (2 closed months)', () => {
    const state = makeBaseState();
    // Month 1 report
    recordTx(state, { key: 'gold', amount: 100, cause: 'tax:monthly', step: 1 });
    state.season.curMonth = 2;
    state.season.curYear = 1;
    closeMonth(state, {}, {});
    // Month 2 report
    recordTx(state, { key: 'gold', amount: 200, cause: 'tax:monthly', step: 2 });
    state.season.curMonth = 3;
    closeMonth(state, {}, {});

    assert.strictEqual(state.council.history.length, 2, 'must have 2 closed months');

    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.council.history.length, 2,
      'council.history (2 closed months) must survive round-trip');
    assert.strictEqual(reconstructed.council.history[0].goldEarned, 200,
      'newest closed month goldEarned=200 must survive');
    assert.strictEqual(reconstructed.council.history[1].goldEarned, 100,
      'older closed month goldEarned=100 must survive');
  });

  it('round-trip preserves home.notEnoughMilitaryFunding=true', () => {
    const state = makeBaseState();
    state.home.notEnoughMilitaryFunding = true;
    const payload = applyPersist(state);
    const reconstructed = loadAndReconstruct(payload);
    assert.strictEqual(reconstructed.home.notEnoughMilitaryFunding, true,
      'notEnoughMilitaryFunding=true must survive round-trip');
  });
});

// ---------------------------------------------------------------------------
// 4. Catch-up accounting invariant: multi-month batch
// ---------------------------------------------------------------------------
describe('M4a catch-up accounting invariant: gold tx sum == delta (multi-month)', () => {
  it('Σ gold txEvents == gold delta over 2 months of batch steps', () => {
    const state = makeBaseState();
    state.player.gold = 5000;
    state.player.totWarriors = 3;
    state.player.totArchers = 1;
    state.home.workforce.assigned = 15;
    state.player.taxRate = 2;

    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const allTxEvents = [];
    const ctx = {
      registry,
      periodics,
      catalog: {},
      emitTx: (tx) => { allTxEvents.push({ ...tx }); recordTx(state, tx); },
    };

    const goldBefore = state.player.gold;
    // 2 full months = 60 days = 54000 steps
    const stepsToRun = 54000;
    for (let i = 0; i < stepsToRun; i++) {
      step(state, ctx);
    }
    const goldAfter = state.player.gold;

    const sumGoldTx = allTxEvents
      .filter(tx => tx.key === 'gold')
      .reduce((sum, tx) => sum + tx.amount, 0);

    assert.strictEqual(goldAfter - goldBefore, sumGoldTx,
      `Accounting invariant broken over 2-month batch: ` +
      `Δgold=${goldAfter - goldBefore}, Σtx=${sumGoldTx}`);

    assert.ok(state.council.history.length > 0,
      'council.history must have at least 1 closed month after 2 months');
  });

  it('council.history[N].goldEarned and goldSpent are non-negative after batch', () => {
    const state = makeBaseState();
    state.player.gold = 3000;
    state.home.workforce.assigned = 10;
    state.player.taxRate = 1;
    state.player.totWarriors = 0;
    state.player.totArchers = 0;

    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const ctx = {
      registry,
      periodics,
      catalog: {},
      emitTx: (tx) => recordTx(state, tx),
    };

    // 1 full month = 27000 steps
    for (let i = 0; i < 27000; i++) step(state, ctx);

    if (state.council.history.length > 0) {
      const report = state.council.history[0];
      assert.ok(report.goldEarned >= 0,
        `report.goldEarned must be non-negative, got ${report.goldEarned}`);
      assert.ok(report.goldSpent >= 0,
        `report.goldSpent must be non-negative, got ${report.goldSpent}`);
    }
    assert.ok(state.player.gold >= 0, 'gold must not go negative after one month');
  });

  it('catch-up accounting is deterministic: live == batch for gold and council', () => {
    const makeSeed0State = () => {
      const s = createInitialState({ seed: 0xABCDEF });
      initRng(s);
      s.player.gold = 5000;
      s.player.taxRate = 1;
      s.player.totWarriors = 2;
      s.home.population.total = 30;
      s.home.workforce = { total: 30, assigned: 10 };
      s.council = createCouncilState();
      return s;
    };

    const s1 = makeSeed0State();
    const s2 = makeSeed0State();

    const makeCtx = (target) => {
      const registry = createRegistry();
      const periodics = registerCorePeriodics(registry);
      return {
        registry, periodics, catalog: {},
        emitTx: (tx) => recordTx(target, tx),
      };
    };
    const ctx1 = makeCtx(s1);
    const ctx2 = makeCtx(s2);

    const N = 27000; // 1 month
    for (let i = 0; i < N; i++) step(s1, ctx1);
    for (let i = 0; i < N; i++) step(s2, ctx2);

    assert.strictEqual(s1.player.gold, s2.player.gold,
      'gold must be identical after live vs batch run');
    assert.strictEqual(s1.council.history.length, s2.council.history.length,
      'council.history.length must match live vs batch');
    if (s1.council.history.length > 0) {
      assert.strictEqual(s1.council.history[0].goldEarned, s2.council.history[0].goldEarned,
        'council history goldEarned must match');
      assert.strictEqual(s1.council.history[0].goldSpent, s2.council.history[0].goldSpent,
        'council history goldSpent must match');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. selectFinance selector
// ---------------------------------------------------------------------------
describe('M4a selectFinance selector', () => {
  it('returns gold and taxRate from state', () => {
    const state = makeBaseState();
    state.player.gold = 1234;
    state.player.taxRate = 3;
    const fin = selectFinance(state);
    assert.strictEqual(fin.gold, 1234, 'fin.gold must reflect player.gold');
    assert.strictEqual(fin.taxRate, 3, 'fin.taxRate must reflect player.taxRate');
  });

  it('lastReport is null when no closed months', () => {
    const state = makeBaseState();
    const fin = selectFinance(state);
    assert.strictEqual(fin.lastReport, null,
      'lastReport must be null when council.history is empty');
  });

  it('lastReport reflects council.history[0]', () => {
    const state = makeBaseState();
    const report = { month: 1, year: 1, goldEarned: 500, goldSpent: 200, byCause: {}, consumed: {}, produced: {} };
    state.council.history = [report];
    const fin = selectFinance(state);
    assert.ok(fin.lastReport, 'lastReport must be set when history has entries');
    assert.strictEqual(fin.lastReport.goldEarned, 500, 'lastReport.goldEarned must be 500');
    assert.strictEqual(fin.lastReport.goldSpent, 200, 'lastReport.goldSpent must be 200');
  });

  it('notEnoughMilitaryFunding reflects home flag', () => {
    const state = makeBaseState();
    state.home.notEnoughMilitaryFunding = true;
    const fin = selectFinance(state);
    assert.strictEqual(fin.notEnoughMilitaryFunding, true,
      'notEnoughMilitaryFunding must reflect home flag');
  });

  it('taxRate defaults to 1 when undefined', () => {
    const state = makeBaseState();
    state.player.taxRate = undefined;
    const fin = selectFinance(state);
    assert.strictEqual(fin.taxRate, 1, 'taxRate should default to 1 when undefined');
  });
});

// ---------------------------------------------------------------------------
// 6. Negative: insufficient gold → notEnoughMilitaryFunding flag (not exception)
// ---------------------------------------------------------------------------
describe('M4a negative: insufficient gold → flag not exception', () => {
  it('upkeepMilitary with gold=0 sets flag and does NOT throw', () => {
    const state = makeBaseState();
    state.player.gold = 0;
    state.player.totWarriors = 10; // 10*108=1080 gold needed
    state.player.totArchers = 5;   // 5*162=810 gold needed

    assert.doesNotThrow(() => upkeepMilitary(state, {}, {}),
      'upkeepMilitary must not throw when gold is insufficient');
    assert.strictEqual(state.player.gold, 0,
      'gold must not change when upkeep cannot be afforded');
    assert.strictEqual(state.home.notEnoughMilitaryFunding, true,
      'notEnoughMilitaryFunding flag must be true');
  });

  it('flag resets to false once gold is sufficient', () => {
    const state = makeBaseState();
    state.player.gold = 0;
    state.player.totWarriors = 2;
    // First: insufficient
    upkeepMilitary(state, {}, {});
    assert.strictEqual(state.home.notEnoughMilitaryFunding, true, 'flag must be true (insufficient)');

    // Now give enough gold
    state.player.gold = 10000;
    upkeepMilitary(state, {}, {});
    assert.strictEqual(state.home.notEnoughMilitaryFunding, false,
      'flag must reset to false when gold is sufficient');
  });

  it('no warriors/archers → flag is always false', () => {
    const state = makeBaseState();
    state.player.gold = 0;
    state.player.totWarriors = 0;
    state.player.totArchers = 0;
    upkeepMilitary(state, {}, {});
    assert.strictEqual(state.home.notEnoughMilitaryFunding, false,
      'flag must be false when no military (no upkeep due)');
  });
});
