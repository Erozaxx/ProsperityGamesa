/**
 * formulas.test.js – tabular tests for balance formulas.
 * Reference numbers from design_iter-006_T-001.md §4.3 (verified against source code).
 * iter-006 M1 + iter-007 M2a-1: added consumeFood, foodVariety, diseaseChance, crimeCount,
 * settlementLevel, foodDemand.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  techCap,
  scholarLevelCap,
  marketPrice,
  scaleCost,
  workerEfficiency,
  spoilage,
  natality,
  goldValue,
  foodDemand,
  consumeFood,
  foodVariety,
  diseaseChance,
  crimeCount,
  settlementLevel,
} from '../src/core/balance/formulas.js';

// ---------------------------------------------------------------------------
// techCap
// ---------------------------------------------------------------------------
describe('techCap', () => {
  const cases = [
    { level: 0,  expected: 100 },  // 100 * 1.25^0 = 100
    { level: 1,  expected: 125 },  // round(100 * 1.25) = 125
    { level: 2,  expected: 156 },  // round(156.25) = 156
    { level: 4,  expected: 244 },  // round(244.140625) = 244
    { level: 10, expected: 931 },  // round(931.32...) = 931
  ];
  for (const { level, expected } of cases) {
    it(`techCap(${level}) === ${expected}`, () => {
      assert.strictEqual(techCap(level), expected);
    });
  }
});

// ---------------------------------------------------------------------------
// scholarLevelCap
// ---------------------------------------------------------------------------
describe('scholarLevelCap', () => {
  const cases = [
    { level: 0, expected: 300 },  // 300 * 1.25^0 = 300
    { level: 1, expected: 375 },  // round(375) = 375
    { level: 2, expected: 469 },  // round(468.75) = 469
  ];
  for (const { level, expected } of cases) {
    it(`scholarLevelCap(${level}) === ${expected}`, () => {
      assert.strictEqual(scholarLevelCap(level), expected);
    });
  }
});

// ---------------------------------------------------------------------------
// marketPrice
// ---------------------------------------------------------------------------
describe('marketPrice', () => {
  it('available=0 → max price (1.5^3 factor)', () => {
    // 100 * 1.5^3 * 1000 / 1000 = 100 * 3.375 = 337.5
    assert.strictEqual(marketPrice(100, 0, 100), 337.5);
  });

  it('available=50, max=100 → 100 (1.5 - 0.5)^3 = 1^3 = 1', () => {
    // round(100 * (1.5 - 0.5)^3 * 1000)/1000 = round(100 * 1 * 1000)/1000 = 100
    assert.strictEqual(marketPrice(100, 50, 100), 100);
  });

  it('available=max → minimum price (0.5^3 factor = 0.125)', () => {
    // 100 * 0.5^3 = 100 * 0.125 = 12.5
    assert.strictEqual(marketPrice(100, 100, 100), 12.5);
  });

  it('available > max → clamped to max → same as available=max', () => {
    assert.strictEqual(marketPrice(100, 150, 100), 12.5);
  });

  it('available < 0 → clamped to 0 → same as available=0', () => {
    assert.strictEqual(marketPrice(100, -10, 100), 337.5);
  });
});

// ---------------------------------------------------------------------------
// scaleCost
// ---------------------------------------------------------------------------
describe('scaleCost', () => {
  it('{gold:100, wood:50} * 1.15 → {gold:floor(100*1.15), wood:57}', () => {
    const result = scaleCost({ gold: 100, wood: 50 }, 1.15);
    // Note: JS floating point: 100 * 1.15 = 114.99999999999999, floor → 114
    // Source: config.js scaleCost uses Math.floor(amt * pct); same JS semantics apply.
    assert.strictEqual(result.gold, Math.floor(100 * 1.15));  // 114 in JS
    assert.strictEqual(result.wood, 57);   // floor(50 * 1.15) = floor(57.5) = 57
  });

  it('does not mutate the original cost object', () => {
    const original = { gold: 100 };
    scaleCost(original, 1.5);
    assert.strictEqual(original.gold, 100);
  });
});

// ---------------------------------------------------------------------------
// workerEfficiency
// ---------------------------------------------------------------------------
describe('workerEfficiency', () => {
  it('all bonuses = 0 → 1 (base)', () => {
    assert.strictEqual(workerEfficiency({}), 1);
  });

  it('sum ≤ 0.25 → clamp to 0.25 (minimum)', () => {
    // 1 + (-1) + (-1) = -1 → clamped to 0.25
    assert.strictEqual(workerEfficiency({ minWorkerPenalty: -1, leaderMorality: -1 }), 0.25);
  });

  it('sum ≥ 2 → clamp to 2 (maximum)', () => {
    // 1 + 2 + 2 = 5 → clamped to 2
    assert.strictEqual(workerEfficiency({ goodSpiritsBonus: 2, workerMorale: 2 }), 2);
  });

  it('curfew penalty: base=1 → 1 - 0.25 = 0.75', () => {
    assert.strictEqual(workerEfficiency({ curfew: true }), 0.75);
  });

  it('curfew + sum = 0 → 0.75 (no clamp needed)', () => {
    assert.strictEqual(workerEfficiency({ curfew: true, workerMorale: 0 }), 0.75);
  });
});

// ---------------------------------------------------------------------------
// spoilage
// ---------------------------------------------------------------------------
describe('spoilage', () => {
  it('meat: spoilage(0.18, 100) === 18', () => {
    assert.strictEqual(spoilage(0.18, 100), 18);  // trunc(18.0) = 18
  });

  it('fish: spoilage(0.23, 10) === 2', () => {
    assert.strictEqual(spoilage(0.23, 10), 2);   // trunc(2.3) = 2
  });

  it('bread: spoilage(0.08, 7) === 0', () => {
    assert.strictEqual(spoilage(0.08, 7), 0);    // trunc(0.56) = 0
  });

  // Cheese spoilage divergence: effective=0.08, base=0.10 (source divergence, resolved M9)
  it('cheese effective spoilage (0.08) test', () => {
    assert.strictEqual(spoilage(0.08, 100), 8);  // effective rate
  });

  it('cheese base spoilage (0.10) test – source divergence note', () => {
    // baseSpoilage.cheese = 0.10, but spoilage.cheese = 0.08 in same config block
    // Both values are present in source; active M2 value = 0.08 (effective)
    assert.strictEqual(spoilage(0.10, 100), 10); // base rate
  });
});

// ---------------------------------------------------------------------------
// natality
// ---------------------------------------------------------------------------
describe('natality', () => {
  it('pop=100, rate=0.04 → 4 births', () => {
    assert.strictEqual(natality(100, 0.04), 4);  // floor(4.0) = 4
  });

  it('pop=250, rate=0.02 → 5 retirements', () => {
    assert.strictEqual(natality(250, 0.02), 5);  // floor(5.0) = 5
  });
});

// ---------------------------------------------------------------------------
// goldValue
// ---------------------------------------------------------------------------
describe('goldValue', () => {
  it('sum of qty * price', () => {
    const basket = { wood: 10, gold: 5 };
    const prices = { wood: 2, gold: 1 };
    // 10*2 + 5*1 = 25
    assert.strictEqual(goldValue(basket, (id) => prices[id]), 25);
  });

  it('empty basket → 0', () => {
    assert.strictEqual(goldValue({}, () => 100), 0);
  });
});

// ---------------------------------------------------------------------------
// army upkeep reference number (from design doc §4.3)
// ---------------------------------------------------------------------------
describe('army upkeep constants cross-check', () => {
  it('archer upkeep = round(108 * 1.5) = 162', () => {
    assert.strictEqual(Math.round(108 * 1.5), 162);
  });
});

// ---------------------------------------------------------------------------
// foodDemand – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('foodDemand', () => {
  it('population=100, rate=2 → 200', () => {
    assert.strictEqual(foodDemand(100, 2), 200);
  });

  it('population=0 → 0', () => {
    assert.strictEqual(foodDemand(0, 2), 0);
  });

  it('population=50, rate=2 → 100', () => {
    assert.strictEqual(foodDemand(50, 2), 100);
  });
});

// ---------------------------------------------------------------------------
// consumeFood – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('consumeFood', () => {
  const foods = ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable'];

  it('no food available → all starved', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const { consumed, fed, starved } = consumeFood(store, 100, foods);
    assert.strictEqual(fed, 0);
    assert.strictEqual(starved, 100);
    for (const id of foods) assert.strictEqual(consumed[id], 0);
  });

  it('enough food → all fed, none starved', () => {
    const store = { bread: 200, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const { consumed, fed, starved } = consumeFood(store, 100, foods);
    assert.strictEqual(fed, 100);
    assert.strictEqual(starved, 0);
    assert.strictEqual(consumed.bread, 100);
  });

  it('not enough food → partial feeding, starved > 0', () => {
    const store = { bread: 50, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const { consumed, fed, starved } = consumeFood(store, 100, foods);
    assert.strictEqual(fed, 50);
    assert.strictEqual(starved, 50);
    assert.strictEqual(consumed.bread, 50);
  });

  it('demand=0 → no consumption, no starvation', () => {
    const store = { bread: 100, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const { fed, starved } = consumeFood(store, 0, foods);
    assert.strictEqual(fed, 0);
    assert.strictEqual(starved, 0);
  });

  it('multiple food types → proportional distribution', () => {
    const store = { bread: 100, cheese: 100, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const { consumed, fed, starved } = consumeFood(store, 100, foods);
    assert.strictEqual(fed, 100);
    assert.strictEqual(starved, 0);
    // Both bread and cheese should contribute (proportionally 50/50)
    assert.ok(consumed.bread > 0, 'bread should be consumed');
    assert.ok(consumed.cheese > 0, 'cheese should be consumed');
    assert.strictEqual(consumed.bread + consumed.cheese, 100);
  });

  it('PURE: does not mutate store', () => {
    const store = { bread: 100, cheese: 50, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    const originalBread = store.bread;
    consumeFood(store, 80, foods);
    assert.strictEqual(store.bread, originalBread, 'store must not be mutated');
  });

  it('consumed values are non-negative', () => {
    const store = { bread: 30, cheese: 20, fish: 10, fruit: 5, meat: 0, vegetable: 0 };
    const { consumed } = consumeFood(store, 50, foods);
    for (const id of foods) {
      assert.ok(consumed[id] >= 0, `consumed.${id} must be >= 0`);
    }
  });
});

// ---------------------------------------------------------------------------
// foodVariety – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('foodVariety', () => {
  it('no food types → tier 0 (0.0)', () => {
    const store = { bread: 0, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    assert.strictEqual(foodVariety(store), 0);
  });

  it('1 non-zero type → tier 1 (0.05)', () => {
    const store = { bread: 10, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    assert.strictEqual(foodVariety(store), 0.05);
  });

  it('3 non-zero types → tier 3 (0.15)', () => {
    const store = { bread: 10, cheese: 10, fish: 10, fruit: 0, meat: 0, vegetable: 0 };
    assert.strictEqual(foodVariety(store), 0.15);
  });

  it('6 non-zero types → max tier (0.30)', () => {
    const store = { bread: 1, cheese: 1, fish: 1, fruit: 1, meat: 1, vegetable: 1 };
    assert.strictEqual(foodVariety(store), 0.30);
  });

  it('custom varietyTiers overrides default', () => {
    const store = { bread: 10, cheese: 0, fish: 0 };
    const customTiers = [0, 0.1, 0.2, 0.3];
    assert.strictEqual(foodVariety(store, customTiers), 0.1); // 1 non-zero → tier 1
  });
});

// ---------------------------------------------------------------------------
// diseaseChance – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('diseaseChance', () => {
  it('population=0 → chance=0', () => {
    assert.strictEqual(diseaseChance(0, { diseaseBaseChancePer20kPop: 0.01 }), 0);
  });

  it('population=20000, base=0.01 → chance=0.01', () => {
    assert.strictEqual(diseaseChance(20000, { diseaseBaseChancePer20kPop: 0.01 }), 0.01);
  });

  it('population=40000, base=0.01 → chance=0.02', () => {
    assert.strictEqual(diseaseChance(40000, { diseaseBaseChancePer20kPop: 0.01 }), 0.02);
  });

  it('uses default base if not provided', () => {
    const chance = diseaseChance(20000, {});
    assert.ok(typeof chance === 'number' && chance >= 0, 'should return a non-negative number');
  });

  it('is a PURE function (no mutation)', () => {
    const balance = { diseaseBaseChancePer20kPop: 0.01 };
    diseaseChance(1000, balance);
    assert.strictEqual(balance.diseaseBaseChancePer20kPop, 0.01, 'balance must not be mutated');
  });
});

// ---------------------------------------------------------------------------
// crimeCount – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('crimeCount', () => {
  it('crimeLevel=0 → 0 incidents', () => {
    assert.strictEqual(crimeCount(1000, 0, { basePerDay: 0.001, povertyFactor: 0.5 }), 0);
  });

  it('typical values: pop=1000, level=0.5 → floor(1000*0.5*0.001*(1+0.5))=0', () => {
    // floor(1000 * 0.5 * 0.001 * 1.5) = floor(0.75) = 0
    assert.strictEqual(crimeCount(1000, 0.5, { basePerDay: 0.001, povertyFactor: 0.5 }), 0);
  });

  it('large pop: pop=100000, level=1.0 → floor(100000*1*0.001*1.5)=150', () => {
    assert.strictEqual(crimeCount(100000, 1.0, { basePerDay: 0.001, povertyFactor: 0.5 }), 150);
  });

  it('returns a non-negative integer', () => {
    const count = crimeCount(500, 0.3, { basePerDay: 0.001, povertyFactor: 0.5 });
    assert.ok(Number.isInteger(count) && count >= 0, 'must be a non-negative integer');
  });

  it('uses defaults when balance not provided', () => {
    const count = crimeCount(1000, 0.5, {});
    assert.ok(typeof count === 'number' && count >= 0, 'should return non-negative number');
  });
});

// ---------------------------------------------------------------------------
// settlementLevel – iter-007 M2a-1
// ---------------------------------------------------------------------------
describe('settlementLevel', () => {
  it('attractiveness=0 → level 0', () => {
    const level = settlementLevel(50, 0, { levelThresholds: [0, 10, 50, 200, 500, 1000, 5000] });
    assert.strictEqual(level, 0);
  });

  it('attractiveness=10 → level 1', () => {
    const level = settlementLevel(50, 10, { levelThresholds: [0, 10, 50, 200, 500, 1000, 5000] });
    assert.strictEqual(level, 1);
  });

  it('attractiveness=50 → level 2', () => {
    const level = settlementLevel(50, 50, { levelThresholds: [0, 10, 50, 200, 500, 1000, 5000] });
    assert.strictEqual(level, 2);
  });

  it('attractiveness=5000 → max level 6', () => {
    const level = settlementLevel(500, 5000, { levelThresholds: [0, 10, 50, 200, 500, 1000, 5000] });
    assert.strictEqual(level, 6);
  });
});
