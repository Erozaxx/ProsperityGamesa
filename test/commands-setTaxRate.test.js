/**
 * commands-setTaxRate.test.js – setTaxRate command tests. iter-010 M4a.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { createCommandRegistry, dispatch } from '../src/core/commands/dispatch.js';
import { setTaxRate, registerSetTaxRate } from '../src/core/commands/setTaxRate.js';
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

describe('setTaxRate command', () => {
  it('sets taxRate in valid range', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const result = setTaxRate(state, { rate: 3 });
    assert.ok(result.ok);
    assert.strictEqual(state.player.taxRate, 3);
  });

  it('clamps to rateMax', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const result = setTaxRate(state, { rate: 99 });
    assert.ok(result.ok);
    assert.strictEqual(state.player.taxRate, BALANCE.tax.rateMax);
  });

  it('clamps to rateMin', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const result = setTaxRate(state, { rate: -5 });
    assert.ok(result.ok);
    assert.strictEqual(state.player.taxRate, BALANCE.tax.rateMin);
  });

  it('returns error for non-number', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const result = setTaxRate(state, { rate: 'x' });
    assert.strictEqual(result.ok, false);
    assert.ok(result.error);
  });

  it('returns error for NaN', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const result = setTaxRate(state, { rate: NaN });
    assert.strictEqual(result.ok, false);
  });

  it('dispatch via creg works', () => {
    const state = createInitialState();
    state.player.taxRate = 1;
    const creg = createCommandRegistry();
    registerSetTaxRate(creg);
    const r = dispatch(creg, state, { type: 'setTaxRate', params: { rate: 2 } });
    assert.ok(r.ok);
    assert.strictEqual(state.player.taxRate, 2);
  });
});
