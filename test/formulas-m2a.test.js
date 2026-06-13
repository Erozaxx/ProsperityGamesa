/**
 * formulas-m2a.test.js – iter-007 M2a-1 new formula tests.
 * Tests: foodDemand, consumeFood, foodVariety, diseaseChance, crimeCount, settlementLevel.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  foodDemand,
  consumeFood,
  foodVariety,
  diseaseChance,
  crimeCount,
  settlementLevel,
} from '../src/core/balance/formulas.js';

// -----------------------------------------------------------------------
// 1. foodDemand
// -----------------------------------------------------------------------
describe('foodDemand', () => {
  it('returns population * rate', () => {
    assert.strictEqual(foodDemand(100, 2), 200);
  });

  it('returns 0 for 0 population', () => {
    assert.strictEqual(foodDemand(0, 2), 0);
  });

  it('scales with different rates', () => {
    assert.strictEqual(foodDemand(50, 3), 150);
  });
});

// -----------------------------------------------------------------------
// 2. consumeFood
// -----------------------------------------------------------------------
describe('consumeFood', () => {
  const FOODS = ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable'];

  it('consumes proportionally from available types', () => {
    const store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 50, FOODS);
    assert.strictEqual(result.fed, 50);
    assert.strictEqual(result.starved, 0);
    assert.strictEqual(result.consumed.bread, 50);
  });

  it('starves when store is empty', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 100, FOODS);
    assert.strictEqual(result.fed, 0);
    assert.strictEqual(result.starved, 100);
  });

  it('partially feeds when store < demand', () => {
    const store = { bread: 20, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 50, FOODS);
    assert.strictEqual(result.fed, 20);
    assert.strictEqual(result.starved, 30);
  });

  it('distributes across multiple food types', () => {
    const store = { bread: 50, cheese: 50, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 50, FOODS);
    assert.strictEqual(result.fed, 50);
    assert.strictEqual(result.starved, 0);
    const totalConsumed = Object.values(result.consumed).reduce((s, v) => s + v, 0);
    assert.strictEqual(totalConsumed, 50);
  });

  it('demand=0 returns all zeros', () => {
    const store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const result = consumeFood(store, 0, FOODS);
    assert.strictEqual(result.fed, 0);
    assert.strictEqual(result.starved, 0);
  });
});

// -----------------------------------------------------------------------
// 3. foodVariety
// -----------------------------------------------------------------------
describe('foodVariety', () => {
  it('returns 0 for empty store', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    assert.strictEqual(foodVariety(store), 0);
  });

  it('returns first tier for 1 food type', () => {
    const store = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const variety = foodVariety(store);
    assert.ok(variety > 0, 'one food type should give variety bonus');
  });

  it('returns higher bonus for more food types', () => {
    const store1 = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const store2 = { bread: 10, cheese: 10, fish: 10, fruit: 10, meat: 10, vegetable: 10 };
    assert.ok(foodVariety(store2) > foodVariety(store1), 'more types should give higher bonus');
  });

  it('uses custom tiers if provided', () => {
    const store = { bread: 10, cheese: 10 };
    const customTiers = [0, 0.1, 0.2, 0.3];
    const variety = foodVariety(store, customTiers);
    assert.strictEqual(variety, 0.2); // index 2 = 2 food types
  });
});

// -----------------------------------------------------------------------
// 4. diseaseChance
// -----------------------------------------------------------------------
describe('diseaseChance', () => {
  it('returns 0 for 0 population', () => {
    assert.strictEqual(diseaseChance(0, {}), 0);
  });

  it('returns proportional chance to population', () => {
    const chance1 = diseaseChance(10000, {});
    const chance2 = diseaseChance(20000, {});
    assert.ok(chance2 > chance1, 'larger population should have higher disease chance');
  });

  it('uses custom base rate', () => {
    const chance = diseaseChance(20000, { diseaseBaseChancePer20kPop: 0.05 });
    assert.strictEqual(chance, 0.05);
  });
});

// -----------------------------------------------------------------------
// 5. crimeCount
// -----------------------------------------------------------------------
describe('crimeCount', () => {
  it('returns 0 for crimeLevel 0', () => {
    assert.strictEqual(crimeCount(1000, 0, {}), 0);
  });

  it('returns positive for high population and crime', () => {
    const crimes = crimeCount(10000, 5, { basePerDay: 0.001, povertyFactor: 0.5 });
    assert.ok(crimes > 0, 'high population + crime should produce crime count');
  });

  it('scales with crime level', () => {
    const opts = { basePerDay: 0.001, povertyFactor: 0 };
    const low = crimeCount(10000, 1, opts);
    const high = crimeCount(10000, 5, opts);
    assert.ok(high > low, 'higher crime level should produce more crimes');
  });
});

// -----------------------------------------------------------------------
// 6. settlementLevel
// -----------------------------------------------------------------------
describe('settlementLevel', () => {
  it('returns 0 for 0 attractiveness', () => {
    const level = settlementLevel(0, 0, { levelThresholds: [0, 10, 50] });
    assert.strictEqual(level, 0);
  });

  it('returns higher level for higher attractiveness', () => {
    const thresholds = { levelThresholds: [0, 10, 50, 200] };
    const l1 = settlementLevel(0, 5, thresholds);
    const l2 = settlementLevel(0, 50, thresholds);
    assert.ok(l2 >= l1, 'higher attractiveness should give >= settlement level');
  });

  it('uses default thresholds when not provided', () => {
    const level = settlementLevel(100, 0, {});
    assert.ok(typeof level === 'number', 'should return a number');
  });
});
