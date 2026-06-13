/**
 * accounting-observer.test.js – T3 observer tests. iter-010 M4a.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { createCouncilState, emptyReport } from '../src/core/state/createCouncilState.js';
import { recordTx, closeMonth } from '../src/core/resources/accounting.js';
import { grant, pay } from '../src/core/resources/transactions.js';

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

function makeState() {
  const state = createInitialState();
  state.player.taxRate = 1;
  state.player.totWarriors = 0;
  state.player.totArchers = 0;
  state.player.diseaseFromColdChance = 0;
  state.home.notEnoughMilitaryFunding = false;
  state.council = createCouncilState();
  return state;
}

describe('recordTx observer', () => {
  it('records gold income (positive amount) into goldEarned', () => {
    const state = makeState();
    recordTx(state, { key: 'gold', amount: 100, cause: 'tax:local', step: 1 });
    assert.strictEqual(state.council.current.goldEarned, 100);
    assert.strictEqual(state.council.current.goldSpent, 0);
    assert.strictEqual(state.council.current.byCause['tax:local'], 100);
    assert.strictEqual(state.council.current.produced['gold'], 100);
  });

  it('records gold expense (negative amount) into goldSpent', () => {
    const state = makeState();
    recordTx(state, { key: 'gold', amount: -50, cause: 'upkeep:military', step: 1 });
    assert.strictEqual(state.council.current.goldSpent, 50);
    assert.strictEqual(state.council.current.goldEarned, 0);
    assert.strictEqual(state.council.current.byCause['upkeep:military'], -50);
    assert.strictEqual(state.council.current.consumed['gold'], 50);
  });

  it('accumulates multiple events', () => {
    const state = makeState();
    recordTx(state, { key: 'gold', amount: 100, cause: 'tax:local', step: 1 });
    recordTx(state, { key: 'gold', amount: 200, cause: 'tax:monthly', step: 2 });
    recordTx(state, { key: 'gold', amount: -50, cause: 'upkeep:military', step: 3 });
    assert.strictEqual(state.council.current.goldEarned, 300);
    assert.strictEqual(state.council.current.goldSpent, 50);
  });

  it('is defensive when state.council is missing', () => {
    const state = makeState();
    delete state.council;
    // Should not throw
    assert.doesNotThrow(() => recordTx(state, { key: 'gold', amount: 100, cause: 'test', step: 1 }));
  });
});

describe('closeMonth', () => {
  it('moves current to history[0] and opens new report', () => {
    const state = makeState();
    recordTx(state, { key: 'gold', amount: 100, cause: 'tax:local', step: 1 });
    state.season.curMonth = 2;
    state.season.curYear = 1;
    closeMonth(state, {}, {});
    assert.strictEqual(state.council.history.length, 1);
    assert.strictEqual(state.council.history[0].goldEarned, 100);
    assert.strictEqual(state.council.current.goldEarned, 0);
    assert.strictEqual(state.council.current.month, 2);
  });

  it('caps history at 12 reports', () => {
    const state = makeState();
    for (let i = 0; i < 15; i++) {
      recordTx(state, { key: 'gold', amount: i, cause: 'tax:local', step: i });
      closeMonth(state, {}, {});
    }
    assert.strictEqual(state.council.history.length, 12);
  });

  it('history is newest first (unshift)', () => {
    const state = makeState();
    // month 1 report
    recordTx(state, { key: 'gold', amount: 10, cause: 'tax:local', step: 1 });
    state.season.curMonth = 2;
    closeMonth(state, {}, {});
    // month 2 report
    recordTx(state, { key: 'gold', amount: 20, cause: 'tax:local', step: 2 });
    state.season.curMonth = 3;
    closeMonth(state, {}, {});
    // history[0] should be last closed (month 2 report with goldEarned=20)
    assert.strictEqual(state.council.history[0].goldEarned, 20);
    assert.strictEqual(state.council.history[1].goldEarned, 10);
  });
});

describe('accounting via pay/grant with ctx.emitTx wired to recordTx', () => {
  it('grant gold flows into council report', () => {
    const state = makeState();
    state.player.gold = 0;
    const ctx = { emitTx: (tx) => recordTx(state, tx) };
    grant(state, { gold: 100 }, 'tax:local', ctx, 1);
    assert.strictEqual(state.council.current.goldEarned, 100);
  });

  it('pay gold flows into council report as expense', () => {
    const state = makeState();
    state.player.gold = 200;
    const ctx = { emitTx: (tx) => recordTx(state, tx) };
    pay(state, { gold: 50 }, 'upkeep:military', ctx, 1);
    assert.strictEqual(state.council.current.goldSpent, 50);
  });
});
