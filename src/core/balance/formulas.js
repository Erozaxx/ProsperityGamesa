/**
 * formulas.js – pure game computation functions.
 * All formulas verified against source: market.js, config.js, home.js (doc/original_source/).
 * Functions are pure: no state mutation, no randomness, no timestamps.
 * iteration: iter-007 M2a-1: added foodDemand, consumeFood, foodVariety, diseaseChance,
 *   crimeCount, settlementLevel.
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

/**
 * Food demand per meal: population × consumeFoodRate.
 * @param {number} population
 * @param {number} consumeFoodRate
 * @returns {number}
 */
export function foodDemand(population, consumeFoodRate) {
  return population * consumeFoodRate;
}

/**
 * Fair-share food consumption. PURE - does not mutate store.
 * @param {Record<string, number>} store - {foodId: amount}
 * @param {number} demand - total food demanded (persons × rate)
 * @param {string[]} foods - list of food ids
 * @returns {{ consumed: Record<string, number>, fed: number, starved: number }}
 */
export function consumeFood(store, demand, foods) {
  // Find available food types
  const available = foods.filter(id => (store[id] || 0) > 0);
  const total = available.reduce((s, id) => s + (store[id] || 0), 0);

  if (total === 0 || demand === 0) {
    /** @type {Record<string, number>} */
    const consumed = {};
    for (const id of foods) consumed[id] = 0;
    return { consumed, fed: 0, starved: demand };
  }

  // Fair-share: take proportionally from each available type
  /** @type {Record<string, number>} */
  const consumed = {};
  for (const id of foods) consumed[id] = 0;

  const actuallyConsumed = Math.min(demand, total);

  if (total >= demand) {
    // Enough food - distribute demand proportionally
    for (const id of available) {
      const share = (store[id] / total) * demand;
      consumed[id] = Math.floor(share);
    }
    // Assign remainder to first available food type
    const assigned = Object.values(consumed).reduce((s, v) => s + v, 0);
    if (assigned < actuallyConsumed && available.length > 0) {
      consumed[available[0]] += actuallyConsumed - assigned;
    }
    return { consumed, fed: actuallyConsumed, starved: 0 };
  } else {
    // Not enough food - consume everything available proportionally
    for (const id of available) {
      consumed[id] = store[id];
    }
    return { consumed, fed: total, starved: demand - total };
  }
}

/**
 * Food variety bonus (0..1 bonus to efficiency/satisfaction).
 * Based on number of non-zero food types.
 * @param {Record<string, number>} store
 * @param {number[]} [varietyTiers]
 * @returns {number}
 */
export function foodVariety(store, varietyTiers) {
  const nonZeroCount = Object.values(store).filter(v => v > 0).length;
  const tiers = varietyTiers || [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
  const idx = Math.min(nonZeroCount, tiers.length - 1);
  return tiers[idx];
}

/**
 * Disease chance per day based on population.
 * @param {number} population
 * @param {{ diseaseBaseChancePer20kPop?: number }} balanceHealth
 * @returns {number}
 */
export function diseaseChance(population, balanceHealth) {
  const { diseaseBaseChancePer20kPop = 0.01 } = balanceHealth;
  return (population / 20000) * diseaseBaseChancePer20kPop;
}

/**
 * Crime incidents per day.
 * @param {number} population
 * @param {number} crimeLevel
 * @param {{ basePerDay?: number, povertyFactor?: number }} balanceCrime
 * @returns {number}
 */
export function crimeCount(population, crimeLevel, balanceCrime) {
  const { basePerDay = 0.001, povertyFactor = 0.5 } = balanceCrime;
  return Math.floor(population * crimeLevel * basePerDay * (1 + povertyFactor));
}

/**
 * Forest area capacity based on settlement level.
 * Source: config.js:3711. Formula: round(28000 + 1.6^level * 5000).
 * Note: M3 maps home.level to settlementLevel proxy (gap G-HOME-LEVEL M5).
 * @param {number} level - Settlement level (0-based proxy for home.level)
 * @returns {number} max tree area units
 */
export function forestArea(level) {
  return Math.round(28000 + Math.pow(1.6, level) * 5000);
}

/**
 * Field area capacity based on settlement level.
 * Source: config.js:3709. Formula: round(450 + 2^level * 1200).
 * @param {number} level - Settlement level
 * @returns {number}
 */
export function fieldArea(level) {
  return Math.round(450 + Math.pow(2, level) * 1200);
}

/**
 * Mine area capacity based on settlement level.
 * Source: config.js:3712. Formula: 1000 + level*800 (if mine unlocked).
 * mineUnlocked = true in M3 (explorer unlock is M5, gap G-HOME-LEVEL).
 * @param {number} level - Settlement level
 * @param {boolean} [mineUnlocked] - Whether mine is unlocked (default true in M3)
 * @returns {number}
 */
export function mineArea(level, mineUnlocked = true) {
  return mineUnlocked ? (1000 + level * 800) : 0;
}

/**
 * Forest area used by current trees.
 * Source: config.js:3769-3770: building forestSpace + curTrees. M3: only curTrees (no buildings).
 * @param {number} curTrees
 * @returns {number}
 */
export function forestUsed(curTrees) {
  return Math.round(curTrees);
}

/**
 * Settlement level from population + attractiveness.
 * @param {number} population
 * @param {number} housingAttractiveness
 * @param {{ levelThresholds?: number[] }} balanceHousing
 * @returns {number}
 */
export function settlementLevel(population, housingAttractiveness, balanceHousing) {
  const thresholds = balanceHousing.levelThresholds || [0, 10, 50, 200, 500, 1000, 5000];
  // Simple score = attractiveness (population affects future expansion)
  const score = housingAttractiveness;
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (score >= thresholds[i]) level = i;
  }
  return level;
}

/**
 * Local tax amount (5-day collection).
 * Formula: floor(localRate × curWorkers × taxRate). iter-010 M4a.
 * @param {number} curWorkers
 * @param {number} taxRate
 * @param {number} localRate
 * @returns {number}
 */
export function localTaxAmount(curWorkers, taxRate, localRate) {
  return Math.floor(localRate * curWorkers * taxRate);
}

/**
 * Monthly tax amount.
 * Formula: floor(monthlyRate × curWorkers × taxRate × centerBase × taxCenterLevel). iter-010 M4a.
 * @param {number} curWorkers
 * @param {number} taxRate
 * @param {number} monthlyRate
 * @param {number} centerBase
 * @param {number} [taxCenterLevel]
 * @returns {number}
 */
export function monthlyTaxAmount(curWorkers, taxRate, monthlyRate, centerBase, taxCenterLevel = 1) {
  return Math.floor(monthlyRate * curWorkers * taxRate * centerBase * taxCenterLevel);
}

/**
 * Cost of the (totalMade+1)-th building instance. Geometric growth per additional built.
 * scaleFactor=1.0 → no scaling (faithful to original; original buildings have fixed cost).
 * Source: design M5 §2.4 (original buildings have fixed cost; scaling is an approximated progression addition).
 * provenance: approximated, gap G-BUILD-COSTSCALE (M9 calibration).
 * @param {Record<string, number>} baseCost - Base cost map {resourceId: amount}
 * @param {number} totalMade - Cumulative buildings built so far (use totalMade, NOT created)
 * @param {number} scaleFactor - Geometric factor (e.g. 1.15); use BALANCE.buildings.costScaleFactor
 * @returns {Record<string, number>}
 */
export function scaleCostByCount(baseCost, totalMade, scaleFactor) {
  const pct = Math.pow(scaleFactor, Math.max(0, totalMade));
  return scaleCost(baseCost, pct);
}

/**
 * Military upkeep cost.
 * Formula: warriors × warriorUpkeep + archers × archerUpkeep. iter-010 M4a.
 * @param {number} warriors
 * @param {number} archers
 * @param {number} warriorUpkeep
 * @param {number} archerUpkeep
 * @returns {number}
 */
export function militaryUpkeep(warriors, archers, warriorUpkeep, archerUpkeep) {
  return warriors * warriorUpkeep + archers * archerUpkeep;
}

/**
 * Firewood needs per day based on season.
 * Winter(3): floor(0.5 × curWorkers), Spring(0)/Autumn(2): floor(0.2 × curWorkers), Summer(1): 0.
 * iter-010 M4a.
 * @param {number} curWorkers
 * @param {number} seasonIndex - 0=Spring, 1=Summer, 2=Autumn, 3=Winter
 * @returns {number}
 */
export function firewoodNeeds(curWorkers, seasonIndex) {
  if (seasonIndex === 3) return Math.floor(0.5 * curWorkers);
  if (seasonIndex === 0 || seasonIndex === 2) return Math.floor(0.2 * curWorkers);
  return 0;
}
