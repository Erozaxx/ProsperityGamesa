/**
 * transactions.test.js – iter-007 M2a-1 resource transaction tests.
 */

import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { canAfford, pay, grant } from '../src/core/resources/transactions.js';
import { createInitialState } from '../src/core/state/createInitialState.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'jobs', 'buildings', 'houseTypes', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
});

// -----------------------------------------------------------------------
// 1. canAfford
// -----------------------------------------------------------------------
describe('canAfford', () => {
  it('returns true when player has enough gold', () => {
    const state = createInitialState();
    state.player.gold = 100;
    assert.strictEqual(canAfford(state, { gold: 100 }), true);
  });

  it('returns false when player has insufficient gold', () => {
    const state = createInitialState();
    state.player.gold = 50;
    assert.strictEqual(canAfford(state, { gold: 100 }), false);
  });

  it('returns true for empty cost', () => {
    const state = createInitialState();
    assert.strictEqual(canAfford(state, {}), true);
  });

  it('returns true for gold=0 cost', () => {
    const state = createInitialState();
    assert.strictEqual(canAfford(state, { gold: 0 }), true);
  });

  it('checks multiple resources (all sufficient)', () => {
    const state = createInitialState();
    state.player.gold = 200;
    state.player.techPt = 50;
    assert.strictEqual(canAfford(state, { gold: 100, techPt: 25 }), true);
  });

  it('checks multiple resources (one insufficient)', () => {
    const state = createInitialState();
    state.player.gold = 200;
    state.player.techPt = 10;
    assert.strictEqual(canAfford(state, { gold: 100, techPt: 25 }), false);
  });
});

// -----------------------------------------------------------------------
// 2. pay
// -----------------------------------------------------------------------
describe('pay', () => {
  it('deducts gold correctly', () => {
    const state = createInitialState();
    state.player.gold = 500;
    pay(state, { gold: 200 }, 'test');
    assert.strictEqual(state.player.gold, 300);
  });

  it('deducts techPt correctly', () => {
    const state = createInitialState();
    state.player.techPt = 100;
    pay(state, { techPt: 40 }, 'test');
    assert.strictEqual(state.player.techPt, 60);
  });

  it('throws when insufficient gold', () => {
    const state = createInitialState();
    state.player.gold = 50;
    assert.throws(() => pay(state, { gold: 100 }, 'test'), /insufficient/);
  });

  it('does not partially mutate on failure (atomicity)', () => {
    const state = createInitialState();
    state.player.gold = 500;
    state.player.techPt = 5; // not enough
    const goldBefore = state.player.gold;
    assert.throws(() => pay(state, { gold: 100, techPt: 50 }, 'test'));
    // Gold should NOT have been deducted since techPt check fails first
    assert.strictEqual(state.player.gold, goldBefore);
  });

  it('emits tx events when ctx.emitTx is provided', () => {
    const state = createInitialState();
    state.player.gold = 300;
    /** @type {Array<{key: string, amount: number, cause: string}>} */
    const txLog = [];
    const ctx = { emitTx: (tx) => txLog.push(tx) };
    pay(state, { gold: 100 }, 'buy_building', ctx, 42);
    assert.strictEqual(txLog.length, 1);
    assert.strictEqual(txLog[0].key, 'gold');
    assert.strictEqual(txLog[0].amount, -100);
    assert.strictEqual(txLog[0].cause, 'buy_building');
    assert.strictEqual(txLog[0].step, 42);
  });

  it('throws on NaN amount', () => {
    const state = createInitialState();
    assert.throws(() => pay(state, { gold: NaN }, 'test'), /NaN/);
  });
});

// -----------------------------------------------------------------------
// 3. grant
// -----------------------------------------------------------------------
describe('grant', () => {
  it('adds gold correctly', () => {
    const state = createInitialState();
    state.player.gold = 100;
    grant(state, { gold: 50 }, 'earn');
    assert.strictEqual(state.player.gold, 150);
  });

  it('adds food to home.food.store', () => {
    const state = createInitialState();
    grant(state, { bread: 10 }, 'harvest');
    assert.strictEqual(state.home.food.store.bread, 10);
  });

  it('accumulates grants', () => {
    const state = createInitialState();
    grant(state, { gold: 100 }, 'earn');
    grant(state, { gold: 50 }, 'earn2');
    assert.strictEqual(state.player.gold, 150);
  });

  it('emits tx event for grant', () => {
    const state = createInitialState();
    /** @type {Array<{key: string, amount: number}>} */
    const txLog = [];
    const ctx = { emitTx: (tx) => txLog.push(tx) };
    grant(state, { gold: 100 }, 'tax', ctx, 10);
    assert.strictEqual(txLog.length, 1);
    assert.strictEqual(txLog[0].amount, 100);
    assert.strictEqual(txLog[0].key, 'gold');
  });

  it('throws on Infinity amount', () => {
    const state = createInitialState();
    assert.throws(() => grant(state, { gold: Infinity }, 'test'), /NaN|Inf/);
  });
});
