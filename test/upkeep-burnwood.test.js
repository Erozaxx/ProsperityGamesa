/**
 * upkeep-burnwood.test.js – T2 tests. iter-010 M4a.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { createCouncilState } from '../src/core/state/createCouncilState.js';
import { militaryUpkeep, firewoodNeeds } from '../src/core/balance/formulas.js';
import { upkeepMilitary } from '../src/core/systems/upkeep.js';
import { burnWood } from '../src/core/systems/burnWood.js';
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

describe('militaryUpkeep formula', () => {
  it('warriors×108 + archers×162', () => {
    assert.strictEqual(militaryUpkeep(5, 3, 108, 162), 5*108 + 3*162); // 540+486=1026
    assert.strictEqual(militaryUpkeep(0, 0, 108, 162), 0);
    assert.strictEqual(militaryUpkeep(1, 0, 108, 162), 108);
    assert.strictEqual(militaryUpkeep(0, 1, 108, 162), 162);
  });
});

describe('upkeepMilitary system', () => {
  it('pays upkeep when gold sufficient', () => {
    const state = makeState();
    state.player.gold = 5000;
    state.player.totWarriors = 5;
    state.player.totArchers = 0;
    const txLog = [];
    const ctx = { emitTx: (tx) => txLog.push(tx) };
    upkeepMilitary(state, {}, ctx);
    // 5*108=540 deducted
    assert.strictEqual(state.player.gold, 5000 - 540);
    assert.strictEqual(state.home.notEnoughMilitaryFunding, false);
    assert.ok(txLog.some(tx => tx.cause === 'upkeep:military'));
  });

  it('sets flag without payment when gold insufficient', () => {
    const state = makeState();
    state.player.gold = 0;
    state.player.totWarriors = 5;
    const goldBefore = state.player.gold;
    upkeepMilitary(state, {}, {});
    // no deduction
    assert.strictEqual(state.player.gold, goldBefore);
    assert.strictEqual(state.home.notEnoughMilitaryFunding, true);
  });

  it('no upkeep when no warriors/archers (totWarriors=0, totArchers=0)', () => {
    const state = makeState();
    state.player.gold = 100;
    upkeepMilitary(state, {}, {});
    assert.strictEqual(state.player.gold, 100);
    assert.strictEqual(state.home.notEnoughMilitaryFunding, false);
  });
});

describe('firewoodNeeds formula', () => {
  it('Winter(3): floor(0.5 × curWorkers)', () => {
    assert.strictEqual(firewoodNeeds(20, 3), 10); // 0.5*20=10
    assert.strictEqual(firewoodNeeds(15, 3), 7);  // floor(0.5*15)=7
  });
  it('Summer(1): 0', () => {
    assert.strictEqual(firewoodNeeds(20, 1), 0);
  });
  it('Spring(0) and Autumn(2): floor(0.2 × curWorkers)', () => {
    assert.strictEqual(firewoodNeeds(20, 0), 4); // floor(0.2*20)=4
    assert.strictEqual(firewoodNeeds(20, 2), 4);
    assert.strictEqual(firewoodNeeds(7, 0), 1);  // floor(0.2*7)=1
  });
});

describe('burnWood system', () => {
  it('pays firewood in winter when stock available', () => {
    const state = makeState();
    state.season.curSeason = 3; // Zima
    state.home.store = { firewood: 100 };
    state.home.workforce.assigned = 20;
    const txLog = [];
    const ctx = { emitTx: (tx) => txLog.push(tx) };
    burnWood(state, {}, ctx);
    // needs=floor(0.5*20)=10
    assert.strictEqual(state.home.store.firewood, 90);
    assert.ok(txLog.some(tx => tx.cause === 'burn:firewood'));
  });

  it('increments diseaseFromColdChance when firewood insufficient (winter)', () => {
    const state = makeState();
    state.season.curSeason = 3;
    state.home.store = { firewood: 0 };
    state.home.workforce.assigned = 20;
    state.player.diseaseFromColdChance = 0;
    burnWood(state, {}, {});
    assert.strictEqual(state.player.diseaseFromColdChance, 1);
  });

  it('no firewood consumed in summer', () => {
    const state = makeState();
    state.season.curSeason = 1; // Léto
    state.home.store = { firewood: 100 };
    const storeBefore = state.home.store.firewood;
    burnWood(state, {}, {});
    assert.strictEqual(state.home.store.firewood, storeBefore);
  });
});
