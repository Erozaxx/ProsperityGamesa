/**
 * balance.js – named game constants with source references.
 * All values extracted from rootscope-raw-dump.json and config.js (doc/original_source/).
 * iteration: iter-007 M2a-1: added start, food, health, crime, housing constants.
 */

export const BALANCE = Object.freeze({
  /** Engine timing constants. Source: dump.engine, dump.season */
  engine: {
    /** Seconds per simulation step. Source: dump.engine.normalRate = 0.05 */
    stepSeconds: 0.05,
    /** Steps per in-game day. Source: dump.STEPSPERDAY = 900 */
    stepsPerDay: 900,
    /** Steps per season (91 days). Source: dump.season.stepsPerSeason = 81900 */
    stepsPerSeason: 81900,
    /** Max simulation step before game end. Source: dump.engine.maxStep = 5e8 */
    maxStep: 5e8,
    /** Slow-mode multiplier. Source: dump.engine.slowRate = 2.8 */
    slowRate: 2.8,
    /** Base engine rate (seconds per step). Source: dump.BASEENGINERATE = 0.05 */
    baseRate: 0.05,
  },

  /** Season / calendar constants. Source: dump.season */
  season: {
    /** Number of days per season. Source: dump.season.seasonLength.Spring = 91 */
    seasonDays: 91,
    /** Starting season. Source: dump.season.curSeason */
    startSeason: 'Winter',
    /** Starting day. Source: dump.season.curDay */
    startDay: 16,
    /** Starting month. Source: dump.season.curMonth */
    startMonth: 12,
    /** Starting year. Source: dump.season.curYear */
    startYear: 922,
  },

  /** Forest / tree constants. */
  forest: {
    /** Steps for a tree to mature. Source: dump.TREEMATURETIME = 36 */
    treeMatureTime: 36,
  },

  /** Technology cost scaling. Source: dump.techBase=100, dump.techScale=1.25 */
  tech: {
    /** Base tech cost at level 0. Source: dump.techBase */
    base: 100,
    /** Per-level scale factor. Source: dump.techScale */
    scale: 1.25,
  },

  /** Scholar level cap scaling. Source: config.js:3826 getScholarLevelCap */
  scholar: {
    /** Base scholar cap at level 0. */
    capBase: 300,
    /** Per-level scale factor (same as tech). */
    capScale: 1.25,
  },

  /** Market price constants. Source: market.js:124, config.js:416-417 */
  market: {
    /** Exponent in price formula (1.5 - ratio)^3. Source: market.js:124 */
    priceExponent: 3,
    /** Price factor offset. Source: market.js:124 */
    priceFactor: 1.5,
    /** Haggle multiplier for buying. Source: config.js:416 */
    haggleBuy: 1.35,
    /** Haggle multiplier for selling. Source: config.js:417 */
    haggleSell: 0.6,
  },

  /** Tax building constants. Source: dump.TAXCENTERBASE, dump.CITYGUARDBASE */
  tax: {
    /** Base gold per tax center level. Source: dump.TAXCENTERBASE = 22 */
    centerBase: 22,
    /** Base gold per city guard level. Source: dump.CITYGUARDBASE = 56 */
    cityGuardBase: 56,
  },

  /** Caravan constants. Source: dump.BASECARAVANCAPACITY */
  caravan: {
    /** Base caravan cargo capacity. Source: dump.BASECARAVANCAPACITY = 10000 */
    baseCapacity: 10000,
  },

  /** Army unit constants. Source: dump.GOLDCOSTPERWARRIOR, dump.WARRIORUPKEEP, etc. */
  army: {
    /** Gold cost per warrior. Source: dump.GOLDCOSTPERWARRIOR = 1080 */
    warriorCost: 1080,
    /** Monthly upkeep per warrior. Source: dump.WARRIORUPKEEP = 108 */
    warriorUpkeep: 108,
    /** Gold cost per archer. Source: dump.GOLDCOSTPERARCHER = 1620 */
    archerCost: 1620,
    /** Monthly upkeep per archer. Derived: round(108*1.5)=162. Source: config.js:28 */
    archerUpkeep: 162,
  },

  /** Population / worker constants. Source: config.js world.home block ~615-664 */
  population: {
    /** Food units consumed per worker per cycle. Source: config.js consumeFoodRate = 2 */
    consumeFoodRate: 2,
    /** Annual birth rate (fraction of population). Source: config.js nat.matRate = 0.04 */
    matRate: 0.04,
    /** Annual retirement/attrition rate. Source: config.js nat.retRate = 0.02 */
    retRate: 0.02,
    /** Minimum worker efficiency clamp. Source: home.js:1907 */
    workerEffMin: 0.25,
    /** Maximum worker efficiency clamp. Source: home.js:1909-1910 */
    workerEffMax: 2,
  },

  /** World/game mechanic activation thresholds. Source: dump constants */
  world: {
    /** Step at which AI mechanic activates. Source: dump.AIMechanicStart = 567000 */
    aiMechanicStart: 567000,
    /** Step at which revolt mechanic activates. Source: dump.revoltMechanicStart = 630000 */
    revoltMechanicStart: 630000,
  },

  /** Offline simulation cap. Source: architecture §9.2a, confirmed M0 benchmark */
  offline: {
    /** Max real hours of offline progress to simulate. */
    capTechRealHours: 8,
  },

  /** Starting values for a new game. provenance: approximated */
  start: {
    population: 50,
    gold: 500,
    food: { bread: 20, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 },
    housing: { tent: 5 },
  },

  /** Food mechanic constants. provenance: approximated / population.json */
  food: {
    /** Same as population.consumeFoodRate (unified source). */
    consumeFoodRate: 2,
    mealsPerDay: 2,
    /** Bonus per number of food types (0..6 types → 0..0.30). provenance: approximated */
    varietyTiers: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
    /** From population.json maxFood. */
    maxFood: 500,
  },

  /** Health mechanic constants. provenance: approximated */
  health: {
    diseaseBaseChancePer20kPop: 0.01,
    diseaseDurationDays: 14,
    diseaseDeathFraction: 0.05,
  },

  /** Crime mechanic constants. provenance: approximated */
  crime: {
    basePerDay: 0.001,
    povertyFactor: 0.5,
  },

  /** Housing mechanic constants. provenance: approximated */
  housing: {
    /** Settlement level thresholds based on attractiveness sum. */
    levelThresholds: [0, 10, 50, 200, 500, 1000, 5000],
  },
});
