/**
 * taxes.test.js – T1 tabular tests for tax formulas and systems. iter-010 M4a.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { createCouncilState } from '../src/core/state/createCouncilState.js';
import { recordTx } from '../src/core/resources/accounting.js';
import { localTaxAmount, monthlyTaxAmount } from '../src/core/balance/formulas.js';
import { localTaxes, monthlyTaxes } from '../src/core/systems/taxes.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
function loadJson(name) { return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8')); }

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
    loadCatalog(name, loadJson(name));
  }
});

function makeState(overrides = {}) {
  const state = createInitialState();
  state.player.taxRate = 1;
  state.player.totWarriors = 0;
  state.player.totArchers = 0;
  state.player.diseaseFromColdChance = 0;
  state.home.notEnoughMilitaryFunding = false;
  state.council = createCouncilState();
  state.home.workforce = { total: 50, assigned: 20 };
  state.home.population.total = 50;
  Object.assign(state, overrides);
  return state;
}

describe('localTaxAmount formula', () => {
  it('floor(localRate × curWorkers × taxRate)', () => {
    // localRate=2, curWorkers=20, taxRate=1 → 2*20*1=40
    assert.strictEqual(localTaxAmount(20, 1, 2), 40);
    // taxRate=2 → 80
    assert.strictEqual(localTaxAmount(20, 2, 2), 80);
    // curWorkers=0 → 0
    assert.strictEqual(localTaxAmount(0, 1, 2), 0);
    // floor: 3*7*1=21
    assert.strictEqual(localTaxAmount(7, 1, 3), 21);
    // floor: 2*7*1.5=21
    assert.strictEqual(localTaxAmount(7, 1.5, 2), 21);
  });
});

describe('monthlyTaxAmount formula', () => {
  it('floor(monthlyRate × curWorkers × taxRate × centerBase)', () => {
    // monthlyRate=1, curWorkers=20, taxRate=1, centerBase=22 → 1*20*1*22=440
    assert.strictEqual(monthlyTaxAmount(20, 1, 1, 22), 440);
    // taxRate=2 → 880
    assert.strictEqual(monthlyTaxAmount(20, 2, 1, 22), 880);
    // curWorkers=0 → 0
    assert.strictEqual(monthlyTaxAmount(0, 1, 1, 22), 0);
    // taxCenterLevel=2 → 880
    assert.strictEqual(monthlyTaxAmount(20, 1, 1, 22, 2), 880);
  });
});

describe('localTaxes system', () => {
  it('grants gold to player via ctx.emitTx', () => {
    const state = makeState();
    state.home.workforce.assigned = 20;
    const txLog = [];
    const ctx = { emitTx: (tx) => { txLog.push(tx); recordTx(state, tx); } };
    const goldBefore = state.player.gold;
    localTaxes(state, {}, ctx);
    // floor(2*20*1)=40
    assert.strictEqual(state.player.gold, goldBefore + 40);
    assert.strictEqual(txLog.length, 1);
    assert.strictEqual(txLog[0].cause, 'tax:local');
    assert.strictEqual(txLog[0].amount, 40);
    assert.strictEqual(txLog[0].key, 'gold');
  });

  it('uses taxRate from state.player.taxRate', () => {
    const state = makeState();
    state.player.taxRate = 2;
    state.home.workforce.assigned = 10;
    const goldBefore = state.player.gold;
    localTaxes(state, {}, {});
    // floor(2*10*2)=40
    assert.strictEqual(state.player.gold, goldBefore + 40);
  });

  it('does nothing when curWorkers=0', () => {
    const state = makeState();
    state.home.workforce.assigned = 0;
    const goldBefore = state.player.gold;
    localTaxes(state, {}, {});
    assert.strictEqual(state.player.gold, goldBefore);
  });
});

describe('monthlyTaxes system', () => {
  it('grants monthly tax gold', () => {
    const state = makeState();
    state.home.workforce.assigned = 10;
    state.player.taxRate = 1;
    const goldBefore = state.player.gold;
    monthlyTaxes(state, {}, {});
    // floor(1*10*1*22)=220
    assert.strictEqual(state.player.gold, goldBefore + 220);
  });

  it('emits txEvent with cause tax:monthly', () => {
    const state = makeState();
    state.home.workforce.assigned = 10;
    const txLog = [];
    const ctx = { emitTx: (tx) => { txLog.push(tx); recordTx(state, tx); } };
    monthlyTaxes(state, {}, ctx);
    assert.ok(txLog.some(tx => tx.cause === 'tax:monthly'));
    assert.ok(state.council.current.goldEarned > 0);
  });
});
