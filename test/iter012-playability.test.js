/**
 * iter012-playability.test.js – iter-012 playability hardening (T-005..T-009).
 * Covers:
 *  - A1 (T-005): fresh start is seeded from BALANCE.start (pop 50, gold 500, tent 5, bread 20)
 *  - A2 (T-006): resourceKindOf('gold'/'techPt') invariance with AND without the catalog loaded
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { resourceKindOf, handlerFor, resourceHandlers } from '../src/core/resources/handlers.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// -----------------------------------------------------------------------
// A1 (T-005): start seed from BALANCE.start
// -----------------------------------------------------------------------
describe('A1 fresh start seed (T-005)', () => {
  it('createInitialState seeds gold, population, housing and food from BALANCE.start', () => {
    const state = createInitialState();
    assert.strictEqual(state.player.gold, BALANCE.start.gold, 'gold should be seeded (500)');
    assert.strictEqual(state.player.gold, 500);
    assert.strictEqual(state.home.population.total, BALANCE.start.population, 'population should be seeded (50)');
    assert.strictEqual(state.home.population.total, 50);
    assert.deepStrictEqual(state.home.housing.counts, { tent: 5 }, 'housing should be seeded { tent: 5 }');
    assert.strictEqual(state.home.food.store.bread, 20, 'bread should be seeded (20)');
  });

  it('food store always has all 6 keys (R-A1-2)', () => {
    const state = createInitialState();
    const store = state.home.food.store;
    for (const key of ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable']) {
      assert.ok(key in store, `food.store must contain key "${key}"`);
      assert.strictEqual(typeof store[key], 'number', `food.store.${key} must be a number`);
    }
  });

  it('housing.counts is a fresh copy, not a shared reference to BALANCE.start.housing', () => {
    const a = createInitialState();
    a.home.housing.counts.tent = 99;
    const b = createInitialState();
    assert.strictEqual(b.home.housing.counts.tent, 5, 'mutating one state must not leak into BALANCE.start');
  });

  describe('old saves load correctly (allowlist overwrites the seed)', () => {
    before(() => {
      clearCatalogs();
      for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
        loadCatalog(name, loadJson(name));
      }
      loadCatalog('population', loadJson('population'));
    });

    it('persisted values from an old save override the fresh seed', () => {
      // Build a state with non-default values and persist it.
      const original = createInitialState({ seed: 0xABCD });
      original.player.gold = 1234;
      original.home.population.total = 7;
      original.home.housing.counts = { tent: 2 };
      original.home.food.store = { bread: 1, cheese: 2, fish: 3, fruit: 4, meat: 5, vegetable: 6 };

      const payload = applyPersist(original);
      const loaded = loadAndReconstruct(JSON.parse(JSON.stringify(payload)));

      assert.strictEqual(loaded.player.gold, 1234, 'loaded gold should match the save, not the seed');
      assert.strictEqual(loaded.home.population.total, 7);
      assert.deepStrictEqual(loaded.home.housing.counts, { tent: 2 });
      assert.strictEqual(loaded.home.food.store.bread, 1);
    });

    it('a save missing home fields keeps the seeded default (R-A1-1)', () => {
      // Full valid payload, then strip the home sub-domain to mimic an old save that
      // predates population/housing persistence.
      const original = createInitialState({ seed: 1 });
      original.player.gold = 42;
      const payload = /** @type {any} */ (applyPersist(original));
      delete payload.home; // simulate a save missing population/housing/food

      const loaded = loadAndReconstruct(JSON.parse(JSON.stringify(payload)));

      assert.strictEqual(loaded.player.gold, 42, 'persisted gold applied');
      // home absent in save → seeded defaults remain (desired fallback, not a bug).
      assert.strictEqual(loaded.home.population.total, BALANCE.start.population, 'population falls back to seed');
      assert.deepStrictEqual(loaded.home.housing.counts, { tent: 5 }, 'housing falls back to seed');
    });
  });
});

// -----------------------------------------------------------------------
// A2 (T-006): resolver invariance for gold/techPt with and without catalog
// -----------------------------------------------------------------------
describe('A2 resourceKindOf invariance (T-006)', () => {
  it("resolves gold/techPt to their own kind WITHOUT the catalog loaded", () => {
    clearCatalogs(); // catalog-less harness
    assert.strictEqual(resourceKindOf('gold'), 'gold');
    assert.strictEqual(resourceKindOf('techPt'), 'techPt');
    // handlerFor must return the dedicated currency handlers even catalog-less.
    assert.strictEqual(handlerFor('gold'), resourceHandlers.gold);
    assert.strictEqual(handlerFor('techPt'), resourceHandlers.techPt);
  });

  describe('with the catalog loaded', () => {
    before(() => {
      clearCatalogs();
      loadCatalog('resources', loadJson('resources'));
    });
    after(() => {
      clearCatalogs();
    });

    it('resolves gold/techPt identically (Option A is a no-op with catalog)', () => {
      assert.strictEqual(resourceKindOf('gold'), 'gold');
      assert.strictEqual(resourceKindOf('techPt'), 'techPt');
      assert.strictEqual(handlerFor('gold'), resourceHandlers.gold);
      assert.strictEqual(handlerFor('techPt'), resourceHandlers.techPt);
    });

    it('grep-gate: gold/techPt are in resources.json with kind == id', () => {
      const resources = /** @type {{ resources: Array<{id:string, kind:string}> }} */ (loadJson('resources'));
      const arr = resources.resources;
      for (const id of ['gold', 'techPt']) {
        const entry = arr.find(r => r.id === id);
        assert.ok(entry, `resources.json must contain "${id}"`);
        assert.strictEqual(entry.kind, id, `${id}.kind must equal its id (early-return invariant)`);
      }
    });
  });

  it('gold handler reads player.gold (not home.store)', () => {
    clearCatalogs();
    const handler = handlerFor('gold');
    const state = /** @type {any} */ ({ player: { gold: 500 }, home: { store: {} } });
    assert.strictEqual(handler.get(state, 'gold'), 500);
  });
});
