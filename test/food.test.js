/**
 * food.test.js – iter-007 M2a-2 food systems tests.
 * Tests: consumeFood fair-share, 2 meals/day, spoilage, foodVariety, starvation.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { meal1, meal2, foodSpoilage } from '../src/core/systems/food.js';
import { consumeFood, foodVariety, spoilage } from '../src/core/balance/formulas.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function createState() {
  const state = createInitialState();
  initRng(state);
  return state;
}

const MOCK_CTX = { registry: /** @type {any} */ ({}), periodics: [] };
const FOOD_IDS = ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable'];

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

// -----------------------------------------------------------------------
// 1. consumeFood fair-share formula (pure)
// -----------------------------------------------------------------------
describe('consumeFood fair-share', () => {
  it('consumes all from single food type', () => {
    const store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 50, FOOD_IDS);
    assert.strictEqual(result.consumed.bread, 50);
    assert.strictEqual(result.fed, 50);
    assert.strictEqual(result.starved, 0);
  });

  it('distributes proportionally from multiple food types', () => {
    const store = { bread: 100, cheese: 100, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 100, FOOD_IDS);
    assert.strictEqual(result.fed, 100);
    assert.strictEqual(result.starved, 0);
    // Total consumed should equal demand
    const total = Object.values(result.consumed).reduce((s, v) => s + v, 0);
    assert.strictEqual(total, 100);
    // Both bread and cheese should be consumed
    assert.ok(result.consumed.bread > 0, 'bread should be consumed');
    assert.ok(result.consumed.cheese > 0, 'cheese should be consumed');
  });

  it('returns starved when not enough food', () => {
    const store = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 50, FOOD_IDS);
    assert.strictEqual(result.fed, 10);
    assert.strictEqual(result.starved, 40);
    assert.strictEqual(result.consumed.bread, 10);
  });

  it('returns all starved for empty store', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 100, FOOD_IDS);
    assert.strictEqual(result.fed, 0);
    assert.strictEqual(result.starved, 100);
  });

  it('handles demand=0 gracefully', () => {
    const store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 0, FOOD_IDS);
    assert.strictEqual(result.fed, 0);
    assert.strictEqual(result.starved, 0);
  });
});

// -----------------------------------------------------------------------
// 2. foodVariety tiers
// -----------------------------------------------------------------------
describe('foodVariety', () => {
  it('returns 0 for empty store', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    assert.strictEqual(foodVariety(store), 0);
  });

  it('returns tier bonus for 1 food type', () => {
    const store = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const v = foodVariety(store, BALANCE.food.varietyTiers);
    assert.strictEqual(v, 0.05); // tier[1]
  });

  it('returns tier bonus for 3 food types', () => {
    const store = { bread: 10, cheese: 10, fish: 10, fruit: 0, meat: 0, vegetable: 0 };
    const v = foodVariety(store, BALANCE.food.varietyTiers);
    assert.strictEqual(v, 0.15); // tier[3]
  });

  it('returns max bonus for 6 food types', () => {
    const store = { bread: 10, cheese: 10, fish: 10, fruit: 10, meat: 10, vegetable: 10 };
    const v = foodVariety(store, BALANCE.food.varietyTiers);
    assert.strictEqual(v, 0.30); // tier[6]
  });

  it('higher variety gives higher bonus', () => {
    const low = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const high = { bread: 10, cheese: 10, fish: 10, fruit: 10, meat: 10, vegetable: 10 };
    assert.ok(foodVariety(high) > foodVariety(low), 'more food types = higher bonus');
  });
});

// -----------------------------------------------------------------------
// 3. spoilage formula (pure)
// -----------------------------------------------------------------------
describe('spoilage formula', () => {
  it('bread spoils at 8% per month', () => {
    const lost = spoilage(0.08, 100);
    assert.strictEqual(lost, 8); // Math.trunc(0.08 * 100)
  });

  it('fish spoils at 23% per month', () => {
    const lost = spoilage(0.23, 100);
    assert.strictEqual(lost, 23);
  });

  it('returns 0 for empty store', () => {
    assert.strictEqual(spoilage(0.08, 0), 0);
  });
});

// -----------------------------------------------------------------------
// 4. meal1 system function
// -----------------------------------------------------------------------
describe('meal1', () => {
  it('reduces food in store based on population demand', () => {
    const state = createState();
    state.home.population.total = 10;
    state.home.food.store.bread = 200;

    meal1(state, {}, MOCK_CTX);

    // demand = 10 * 2 = 20; should consume 20 bread
    assert.strictEqual(state.home.food.store.bread, 180);
  });

  it('does not go below 0 in store', () => {
    const state = createState();
    state.home.population.total = 50;
    state.home.food.store.bread = 5; // less than demand (50*2=100)

    meal1(state, {}, MOCK_CTX);

    assert.ok(state.home.food.store.bread >= 0, 'food store should not go negative');
  });

  it('no effect when population is 0', () => {
    const state = createState();
    state.home.population.total = 0;
    state.home.food.store.bread = 100;

    meal1(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.food.store.bread, 100, 'food should not change with 0 population');
  });
});

// -----------------------------------------------------------------------
// 5. meal2 system function (same logic as meal1)
// -----------------------------------------------------------------------
describe('meal2', () => {
  it('reduces food in store based on population demand', () => {
    const state = createState();
    state.home.population.total = 10;
    state.home.food.store.bread = 200;

    meal2(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.food.store.bread, 180);
  });
});

// -----------------------------------------------------------------------
// 6. 2 meals per day
// -----------------------------------------------------------------------
describe('2 meals per day behavior', () => {
  it('two meals consume twice as much food as one meal', () => {
    const state1 = createState();
    const state2 = createState();
    state1.home.population.total = 10;
    state2.home.population.total = 10;
    state1.home.food.store.bread = 500;
    state2.home.food.store.bread = 500;

    // One meal
    meal1(state1, {}, MOCK_CTX);
    const afterOneMeal = state1.home.food.store.bread;

    // Two meals
    meal1(state2, {}, MOCK_CTX);
    meal2(state2, {}, MOCK_CTX);
    const afterTwoMeals = state2.home.food.store.bread;

    const oneMealConsumption = 500 - afterOneMeal;
    const twoMealConsumption = 500 - afterTwoMeals;
    assert.strictEqual(twoMealConsumption, oneMealConsumption * 2, 'two meals should consume twice as much');
  });
});

// -----------------------------------------------------------------------
// 7. starvation deaths
// -----------------------------------------------------------------------
describe('starvation', () => {
  it('population dies from starvation when food is empty', () => {
    const state = createState();
    state.home.population.total = 10000; // large population
    // Empty food store → high starvation
    for (const id of FOOD_IDS) {
      state.home.food.store[id] = 0;
    }

    const popBefore = state.home.population.total;
    meal1(state, {}, MOCK_CTX);

    // starved = pop * rate = 10000 * 2 = 20000 → deaths = floor(20000 * 0.001) = 20
    assert.ok(state.home.population.total < popBefore, 'population should decrease from starvation');
  });

  it('no starvation deaths when food is abundant', () => {
    const state = createState();
    state.home.population.total = 100;
    state.home.food.store.bread = 10000;

    const popBefore = state.home.population.total;
    meal1(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.population.total, popBefore, 'population should not change with abundant food');
  });
});

// -----------------------------------------------------------------------
// 8. foodSpoilage system function
// -----------------------------------------------------------------------
describe('foodSpoilage', () => {
  it('applies spoilage to bread at ~8% monthly', () => {
    const state = createState();
    state.home.food.store.bread = 100;

    foodSpoilage(state, {}, MOCK_CTX);

    // Should lose ~8 bread (Math.trunc(0.08 * 100) = 8)
    assert.strictEqual(state.home.food.store.bread, 92);
  });

  it('applies spoilage to fish at ~23% monthly', () => {
    const state = createState();
    state.home.food.store.fish = 100;

    foodSpoilage(state, {}, MOCK_CTX);

    // Should lose ~23 fish (Math.trunc(0.23 * 100) = 23)
    assert.strictEqual(state.home.food.store.fish, 77);
  });

  it('does not make food negative', () => {
    const state = createState();
    for (const id of FOOD_IDS) {
      state.home.food.store[id] = 0;
    }

    foodSpoilage(state, {}, MOCK_CTX);

    for (const id of FOOD_IDS) {
      assert.ok(state.home.food.store[id] >= 0, `${id} should not go negative`);
    }
  });
});
