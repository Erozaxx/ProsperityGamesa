/**
 * accounting-invariant.test.js – DA5 accounting invariant test. iter-010 M4a.
 * Invariant: Σ txEvent.amount where key==='gold' == gold_after - gold_before
 */
import { describe, it, before } from 'node:test';
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
import { recordTx } from '../src/core/resources/accounting.js';
import { grant, pay } from '../src/core/resources/transactions.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
function loadJson(name) { return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8')); }

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population', 'skills']) {
    loadCatalog(name, loadJson(name));
  }
});

function makeFullState(overrides = {}) {
  const state = createInitialState({ seed: 0xABC });
  initRng(state);
  state.player.gold = 1000;
  state.player.taxRate = 1;
  state.player.totWarriors = 5;
  state.player.totArchers = 2;
  state.player.diseaseFromColdChance = 0;
  state.home.notEnoughMilitaryFunding = false;
  state.home.population.total = 50;
  state.home.workforce = { total: 50, assigned: 20 };
  state.council = createCouncilState();
  Object.assign(state, overrides);
  return state;
}

describe('Accounting invariant: Σ gold tx == Δ gold', () => {
  it('invariant holds over a series of manual transactions', () => {
    const state = makeFullState();
    const goldBefore = state.player.gold;
    const allTxEvents = [];
    const ctx = { emitTx: (tx) => { allTxEvents.push(tx); recordTx(state, tx); } };

    grant(state, { gold: 100 }, 'tax:local', ctx, 1);
    grant(state, { gold: 200 }, 'tax:monthly', ctx, 2);
    pay(state, { gold: 50 }, 'upkeep:military', ctx, 3);
    pay(state, { gold: 30 }, 'upkeep:military', ctx, 4);

    const goldAfter = state.player.gold;
    const sumGoldTx = allTxEvents
      .filter(tx => tx.key === 'gold')
      .reduce((sum, tx) => sum + tx.amount, 0);

    assert.strictEqual(goldAfter - goldBefore, sumGoldTx,
      `Invariant broken: goldAfter-goldBefore=${goldAfter - goldBefore}, Σtx=${sumGoldTx}`);
  });

  it('invariant holds during full tick run with taxes and upkeep', () => {
    const state = makeFullState();
    state.player.gold = 5000; // enough for upkeep
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const allTxEvents = [];
    const ctx = {
      registry,
      periodics,
      catalog: {},
      emitTx: (tx) => { allTxEvents.push(tx); recordTx(state, tx); },
    };

    const goldBefore = state.player.gold;

    // Run enough steps to trigger month edge (month = 30 days = 27000 steps)
    const stepsToRun = 27000;
    for (let i = 0; i < stepsToRun; i++) {
      step(state, ctx);
    }

    const goldAfter = state.player.gold;
    const sumGoldTx = allTxEvents
      .filter(tx => tx.key === 'gold')
      .reduce((sum, tx) => sum + tx.amount, 0);

    assert.strictEqual(goldAfter - goldBefore, sumGoldTx,
      `Invariant broken after tick run: goldAfter-goldBefore=${goldAfter - goldBefore}, Σtx=${sumGoldTx}`);
  });

  it('council goldEarned - goldSpent == gold delta (per closed month)', () => {
    const state = makeFullState();
    state.player.gold = 5000;
    const ctx = { emitTx: (tx) => recordTx(state, tx) };

    const goldBefore = state.player.gold;
    grant(state, { gold: 300 }, 'tax:local', ctx, 1);
    grant(state, { gold: 200 }, 'tax:monthly', ctx, 2);
    pay(state, { gold: 100 }, 'upkeep:military', ctx, 3);

    // Before closeMonth, current report reflects these
    const report = state.council.current;
    const netFromReport = report.goldEarned - report.goldSpent;
    const goldDelta = state.player.gold - goldBefore;
    assert.strictEqual(netFromReport, goldDelta,
      `Report net=${netFromReport} should equal gold delta=${goldDelta}`);
  });
});
