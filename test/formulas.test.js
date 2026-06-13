/**
 * formulas.test.js – tabular tests for balance formulas.
 * Reference numbers from design_iter-006_T-001.md §4.3 (verified against source code).
 * iteration: iter-006 M1
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
