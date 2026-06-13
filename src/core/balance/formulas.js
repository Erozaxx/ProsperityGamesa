/**
 * formulas.js – pure game computation functions.
 * All formulas verified against source: market.js, config.js, home.js (doc/original_source/).
 * Functions are pure: no state mutation, no Math.random(), no Date.now().
 * iteration: iter-006 M1
 */

/**
 * Market price of a good based on supply/demand.
 * Source: market.js:124
 * Formula: round(basePrice * (1.5 - min(clamp(available,0,max), max)/max)^3 * 1000) / 1000
 * @param {number} basePrice - Base price of the good
 * @param {number} available - Current available quantity (clamped to [0, max])
 * @param {number} max - Maximum stock / reference quantity
 * @returns {number}
 */
export function marketPrice(basePrice, available, max) {
  const clamped = Math.min(Math.max(available, 0), max);
  const ratio = clamped / max;
  return Math.round(basePrice * Math.pow(1.5 - ratio, 3) * 1000) / 1000;
}

/**
 * Technology cost cap at a given level.
 * Source: config.js:1393-1394, source doc §6
 * Formula: round(100 * 1.25^level)
 * @param {number} level - Tech level (0-based)
 * @returns {number}
 */
export function techCap(level) {
  return Math.round(100 * Math.pow(1.25, level));
}

/**
 * Scholar level cap at a given level.
 * Source: config.js:3826 getScholarLevelCap
 * Formula: round(300 * 1.25^level)
 * @param {number} level - Scholar level (0-based)
 * @returns {number}
 */
export function scholarLevelCap(level) {
  return Math.round(300 * Math.pow(1.25, level));
}

/**
 * Scale a cost map by a percentage (returns new map, pure).
 * Source: config.js:1170 scaleCost
 * Formula: each field = floor(amt * pct)
 * @param {Record<string, number>} baseCost - Original cost map {resourceId: amount}
 * @param {number} pct - Scale factor (e.g. 1.15 for +15%)
 * @returns {Record<string, number>}
 */
export function scaleCost(baseCost, pct) {
  /** @type {Record<string, number>} */
  const result = {};
  for (const [key, amt] of Object.entries(baseCost)) {
    result[key] = Math.floor(amt * pct);
  }
  return result;
}

/**
 * Worker efficiency calculation.
 * Source: home.js:1901-1910
 * Formula:
 *   e = 1 + minWorkerPenalty + leaderMorality + entertainmentOffset + goodSpiritsBonus + workerMorale
 *   if (curfew) e -= 0.25
 *   return clamp(e, 0.25, 2)
 * @param {{ base?: number, minWorkerPenalty?: number, leaderMorality?: number,
 *           entertainmentOffset?: number, goodSpiritsBonus?: number, workerMorale?: number,
 *           curfew?: boolean }} p
 * @returns {number}
 */
export function workerEfficiency(p) {
  const base = p.base !== undefined ? p.base : 1;
  let e = base +
    (p.minWorkerPenalty || 0) +
    (p.leaderMorality || 0) +
    (p.entertainmentOffset || 0) +
    (p.goodSpiritsBonus || 0) +
    (p.workerMorale || 0);
  if (p.curfew) {
    e -= 0.25;
  }
  return Math.min(Math.max(e, 0.25), 2);
}

/**
 * Daily food spoilage amount.
 * Source: home.js:641-642 (~~ = Math.trunc towards zero)
 * Formula: Math.trunc(pct * amount)
 * @param {number} pct - Spoilage rate (e.g. 0.18 for meat)
 * @param {number} amount - Current food quantity
 * @returns {number}
 */
export function spoilage(pct, amount) {
  return Math.trunc(pct * amount);
}

/**
 * Annual births or retirements (used for both matRate and retRate).
 * Source: config.js nat.matRate/retRate
 * Formula: Math.floor(population * rate)
 * @param {number} population - Current population count
 * @param {number} rate - Annual rate (fraction, e.g. 0.04)
 * @returns {number}
 */
export function natality(population, rate) {
  return Math.floor(population * rate);
}

/**
 * Gold value of a basket of goods.
 * Source: source doc §4 getGoldValue; gold is counted 1:1.
 * Formula: Σ qty * priceOf(id)
 * @param {Record<string, number>} basket - Map of {goodsId: quantity}
 * @param {(id: string) => number} priceOf - Price lookup function
 * @returns {number}
 */
export function goldValue(basket, priceOf) {
  let total = 0;
  for (const [id, qty] of Object.entries(basket)) {
    total += qty * priceOf(id);
  }
  return total;
}
