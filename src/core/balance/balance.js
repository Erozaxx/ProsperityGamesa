/**
 * balance.js – named game constants with source references.
 * All values extracted from rootscope-raw-dump.json and config.js (doc/original_source/).
 * iteration: iter-007 M2a-1: added start, food, health, crime, housing constants.
 * iteration: iter-009 M3: added production, forestStocks, field, mine (extended), space, accidents, skills.
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
    /**
     * Max trees for fire risk denominator. Source: config.js:688 maxTrees=328327.
     * SUGGESTION-1 fix: fire risk = (curTrees / maxTrees)^2 (not forestArea).
     * Using forestArea (~33000) would give ~100× higher risk than the source.
     * In source, forester tech can modify maxTrees, but that is a M5+ tech (G-FOREST-TECHMODS).
     * For M3 (no forester), maxTrees is the static config.js initial value.
     */
    maxTrees: 328327,
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
    /** Daily mean-reversion drift rate toward baseline. provenance: approximated, gap G-MARKET-DRIFT (M9). */
    driftK: 0.2,
  },

  /** Tax building constants. Source: dump.TAXCENTERBASE, dump.CITYGUARDBASE */
  tax: {
    /** Base gold per tax center level. Source: dump.TAXCENTERBASE = 22 */
    centerBase: 22,
    /** Base gold per city guard level. Source: dump.CITYGUARDBASE = 56 */
    cityGuardBase: 56,
    /** Local tax rate per worker per 5-day period. iter-010 M4a. */
    localRate: 2,
    /** Monthly tax rate multiplier. iter-010 M4a. */
    monthlyRate: 1,
    /** Minimum tax rate set by player. iter-010 M4a. */
    rateMin: 0,
    /** Maximum tax rate set by player. iter-010 M4a. */
    rateMax: 5,
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
    /**
     * Global sanity hard-cap on total population (MVP safety, not balance tuning).
     * iter-012 A4 (T-008): prevents runaway growth in tent-only (null-capacity) settlements.
     * Housing capacity takes precedence when higher. provenance: approximated.
     */
    sanityMaxPop: 10000,
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

  /**
   * Production (jobs) constants. iter-009 M3.
   * Default job maxStep calibration:
   *   completionUnits = maxStep * stepsPerDay * number
   *   At eff=1, number=10, 4 quarterDay/day: Σ curStep/day = 4*10 = 40
   *   For ~1 completion/day: maxStep*900*10 ≈ 40 → maxStep ≈ 0.0044
   *   Using 0.005 (slightly faster than ~1/day) as default.
   *   provenance: approximated, gap G-JOB-MAXSTEP, source intent: home.js:1489.
   */
  production: {
    /** Default job maxStep (time factor). provenance: approximated, gap G-JOB-MAXSTEP. */
    defaultJobMaxStep: 0.005,
    /** quarterDay ticks per day (production cadence). Source: home.js:608 STEPSPERDAY/4. */
    quarterDaysPerDay: 4,
  },

  /**
   * Forest start stocks. iter-009 M3.
   * Source: config.js:686-687. provenance: extracted.
   */
  forestStocks: {
    /** Start tree count. Source: config.js:687 curTrees=27173. */
    startTrees: 27173,
    /** Start animal count. Source: config.js:686 curAnimals=3864. */
    startAnimals: 3864,
    /** Sapling queue length (10-day shift queue). Source: forest.js:57. */
    saplingQueueLen: 10,
  },

  /**
   * Field constants. iter-009 M3.
   */
  field: {
    /** Start livestock count. Source: config.js:708 curLivestock=0. */
    startLivestock: 0,
  },

  /**
   * Mine constants. iter-009 M3.
   * Source: config.js:715 curOres, mine.js:8-17 expander.
   */
  mine: {
    /** Start ore count. Source: config.js:715 curOres=20000. */
    startOres: 20000,
    /** Ore threshold for expander event. Source: mine.js:10. */
    expanderThreshold: 300,
    /** Chance of expander event per day when below threshold. Source: mine.js:12. */
    expanderChance: 0.1,
  },

  /**
   * Space / area formulas. iter-009 M3.
   * Source: config.js:3711 (forest), config.js:3709 (field), config.js:3712 (mine).
   */
  space: {
    /** Forest area formula: round(28000 + 1.6^level * 5000). Source: config.js:3711. */
    forestBase: 28000, forestScale: 1.6, forestMul: 5000,
    /** Field area formula: round(450 + 2^level * 1200). Source: config.js:3709. */
    fieldBase: 450, fieldScale: 2, fieldMul: 1200,
    /** Mine area formula: 1000 + level*800. Source: config.js:3712. */
    mineBase: 1000, minePerLevel: 800,
  },

  /**
   * Accident constants. iter-009 M3.
   * Source: home.js:1291 wolfChance, home.js:1313 highLevelFactor, home.js:3926 killChance.
   */
  accidents: {
    /** Wolf attack chance per quarterDay at settlement level<=1. Source: home.js:1291. */
    wolfChance: 0.005,
    /** High-level accident chance factor (× workers/3). Source: home.js:1313. */
    highLevelChanceFactor: 0.0001,
    /** procAccident kill chance (no hospital in M3). Source: home.js:3926 else-branch. */
    procAccidentKillChance: 0.5,
  },

  /**
   * Skills mechanic constants. iter-009 M3.
   * 2× compensation (K4 / architecture §4.3): original Skills.step() ran once per engine step
   * but effectively progressed 2× faster than intended. Rebuild halves threshold.
   * Gap G-SKILL-COMPENSATION – M9 calibration finalizes whether maxStep or maxStep/2 is correct.
   */
  skills: {
    /**
     * 2× compensation multiplier: effective maxStep = maxStep * stepCompensation.
     * Source: architecture §4.3 gap G-SKILL-COMPENSATION (M9 calibration), K4.
     */
    stepCompensation: 0.5,
  },

  /**
   * Buildings mechanic constants. iter-013 M5-1 T1.
   * Source references: design_iter-013_T-001.md §1.2, §1.3, §1.5.
   */
  buildings: {
    /** Daily RNG bias for probabilistic wear. Source: home.js:2320 (rng.next()+0.2 — original used Math.random, replaced with deterministic rng). provenance: extracted. */
    ageBias: 0.2,
    /** HP fraction threshold below which repair is enqueued. Source: home.js:2324. provenance: extracted. */
    repairThreshold: 0.25,
    /** HP lost per day in winter. Source: home.js:2318. provenance: extracted. */
    winterHpLoss: 1,
    /** Divisor applied to getGoldValue(baseCost) to get repair gold cost. Source: home.js:2356. provenance: extracted. */
    repairCostDivisor: 4,
    /** Divisor applied to maxProgress to get repair duration (in days). Source: home.js:2349. provenance: extracted. */
    repairProgressDivisor: 4,
    /** Fallback max HP when building lacks 'resistance' in catalog. provenance: approximated, gap G-BUILD-RESISTANCE. */
    defaultResistance: 100,
    /** Geometric cost-scale factor per additional instance. 1.0 = no scaling (faithful to original). provenance: approximated, gap G-BUILD-COSTSCALE. */
    costScaleFactor: 1.0,
    /** Index of Winter season (0=spring,1=summer,2=autumn,3=winter). Source: types.d.ts. */
    winterSeasonIndex: 3,
  },
});
