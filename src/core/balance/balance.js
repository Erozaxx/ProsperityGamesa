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
    aiMechanicStart: 567000,      // Source: dump.AIMechanicStart = 567000
    revoltMechanicStart: 630000,  // Source: dump.revoltMechanicStart = 630000
    /** Zone processing period in days. Source: world.js:580 "period = STEPSPERDAY*5" converted to day-index. provenance: extracted. */
    zonePeriodDays: 5,
    /** Gold demand per military unit per zone tick. Source: world.js:38 goldDemand = 150 * (warriors+archers). provenance: extracted. */
    goldDemandPerUnit: 150,
    /** Gold production per worker per zone tick. Source: world.js:39 goldProduction = 50 * numWorkers. provenance: extracted. */
    goldProdPerWorker: 50,
    /** Worker growth base percentage for growth policy. Source: world.js:51 numWorkers*0.01+3. provenance: extracted. */
    growthBasePct: 0.01,
    /** Worker growth base addend for growth policy. Source: world.js:51. provenance: extracted. */
    growthBaseAdd: 3,
    /** Worker growth cap (numWorkers > this → random shrink). Source: world.js:48. provenance: extracted. */
    growthWorkerCap: 3800,
    /** Military policy minimum workers threshold. Source: world.js:97 numWorkers > 100. provenance: extracted. */
    militaryWorkerThreshold: 100,
    /** Faction-specific military growth multipliers. Source: world.js:108-120. provenance: extracted. */
    factionGrowth: {
      theWarlord:   { w: 1.5, a: 1.3 },
      thePrincess:  { w: 0.6, a: 1.6 },
      thePsychopath:{ w: 2.0, a: 0.5 },
    },
    /** Chance for non-player zone to buy additional units (military policy). Source: world.js:144. provenance: extracted. */
    aiBuyUnitChance: 0.25,
    /** Tribute growth divisor (growth policy). Source: world.js:86 amount*numWorkers/2. provenance: extracted. */
    tributeGrowthDivisor: 2,
    /** Base military rating offset. Source: world.js:610 baseMilitaryRating=10. provenance: extracted. */
    baseMilitaryRating: 10,
    /** Non-player worker bonus when below targetWorkerNum/3 (growth policy). Source: world.js:55. provenance: extracted. */
    growthUnderTargetBonus: 15,
    /**
     * War consumption: qty drained from market per resource key per zone tick for warring zones
     * (liege != originalLiege). Injected as marketInject(state, goodsId, -warConsumption).
     * Unknown goodsIds (not in market) are no-ops (marketInject guard).
     * provenance: approximated (server-side not in dump), gap G-WORLD-INJECT-QTY, calibration M9.
     */
    warConsumption: 5,
    /**
     * Production inject fraction: productive zones (policy 0, liege==originalLiege) inject
     * a fraction of their accumulated resources into market supply after tribute accumulation.
     * qty injected = floor(goodsQty * injectFraction). provenance: approximated, calibration M9.
     */
    injectFraction: 0.1,
    /**
     * Faction AI turn period in steps. ~5 in-game days = 5 * 900 = 4500 steps.
     * provenance: approximated (orig has no explicit AI period, called from events/UI), gap G-WORLD-AITURN, M9 calibration.
     */
    aiTurnPeriod: 4500,
    /**
     * Quest settlement level minimum. Replacement for home.level >= 2 (m-4 §5.1).
     * home.settlementLevel >= questSettlementMin (default 1) gates quest generation.
     * provenance: approximated, gap G-QUEST-SETTLEMENT, M9 calibration.
     */
    questSettlementMin: 1,
    /**
     * Quest generation chance per zone-tick. Original world.js ř.386 had < 1.20 (effectively 100%).
     * provenance: extracted (orig = always true), gap G-QUEST-CHANCE.
     */
    questChance: 1.0,
    /**
     * Favour limits for fixFavourLimits clamping.
     * provenance: approximated, gap G-FAVOUR-LIMITS, M9 calibration.
     */
    favourLimits: { min: -100, max: 100 },
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
    /**
     * Builder progress per quarterDay per project.
     * Original: masonStep ran per-step; rebuilt on quarterDay (4×/day).
     * Value = 1 quarterDay unit of progress (project.maxProgress is in days × quarterDaysPerDay).
     * provenance: approximated, gap G-BUILD-TECHBONUS (M6 tech bonuses not included yet).
     */
    masonStep: 1,
    /** Number of quarterDay slots per day (cadence with jobs system). */
    quarterDaysPerDay: 4,
    /**
     * Default max concurrent active projects (overridden by builderHut effects).
     * 0 = no projects possible without a builderHut. provenance: approximated.
     */
    maxActiveProjects: 0,
    /**
     * Default max project queue capacity (overridden by builderHut effects).
     * 0 = cannot queue without builderHut. provenance: approximated.
     */
    maxProjectQueue: 0,
    /**
     * Number of consecutive quarterDay delay ticks before project is moved to end of queue.
     * Source: home.js:1773 ~STEPSPERDAY/3 steps → 1 day / 3 ≈ 1.33 quarterDays → use 1.
     * provenance: approximated.
     */
    requeueDelay: 2,
  },

  /**
   * Research mechanic constants. iter-015 M6 T3.
   * Source: doc/original_source/services/techs.js:46-138 (step fn); design §3.2.
   * provenance: approximated (sector mapping, academy/university exp values); gap G-RESEARCH-ACADEMY.
   */
  research: {
    /**
     * Sector IDs for research progress accumulation.
     * Source: techs.js:70 scholarLevels = ['agriculture','civil','crafts','forestry','medicine','military'].
     * provenance: extracted.
     */
    sectorIds: ['agriculture', 'civil', 'crafts', 'forestry', 'medicine', 'military'],
    /**
     * Job category → research sector mapping.
     * Source: techs.js:55-60 (expPoints['sector_'+job.category]); provenance: approximated.
     * 'builder' excluded (noProduction); categories not in map produce 0 exp.
     * Gap G-JOB-SECTOR-MAP: exact mapping not in extracted dump, calibration M9.
     */
    jobSectorMap: {
      agriculture: 'agriculture',
      forestry: 'forestry',
      crafts: 'crafts',
      civil: 'civil',
      medicine: 'medicine',
      military: 'military',
    },
  },

  /**
   * Battle mechanic constants. iter-018 M7b T1+T2.
   * Source references: doc/original_source/modules/prosperity/services/battle.js ř.1-629.
   * provenance: extracted (tick=30, reaction=60, endCheckPeriod=80, cooldowns 1:1 orig §5)
   * provenance: approximated (baseRevivalDefault=0.25, critChanceDefault=0.1, banditPeriod — gap, kalibrace M9 R-F)
   */
  battle: {
    /** Battle tick duration in ms. Source: orig battle.js ř.1 `var tick = 30`. provenance: extracted. */
    battleTickMs: 30,
    /** Default reaction (ticks before opponent first attacks). Source: orig ř.175 `opponent.reaction || 60`. provenance: extracted. */
    reactionDefault: 60,
    /** End-check modulo (check every 80 ticks at phase 30). Source: orig ř.231 `cB.curStep % 80 == 30`. provenance: extracted. */
    endCheckPeriod: 80,
    /** End-check phase offset. Source: orig ř.231. provenance: extracted. */
    endCheckPhase: 30,
    /** Archers react 20 ticks after warriors. Source: orig ř.281 `opponent.reaction + 20`. provenance: extracted. */
    archerReactionOffset: 20,
    /**
     * Base revival rate for player troops (fraction of casualties revived).
     * Source: orig ř.311 `$rootScope.player.baseRevival` — field DOES NOT EXIST in repo (grep=0).
     * POVINNÝ fallback: state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault.
     * provenance: approximated (=0.25 approx from orig context), kalibrace M9 (R-F).
     */
    baseRevivalDefault: 0.25,
    /**
     * Default crit chance for AI units (player crit from military.json combat.critChance).
     * Source: orig ř.129/138 `critChance: 0.1` for opponent. provenance: extracted.
     */
    critChanceDefault: 0.1,
    /**
     * Bandit raid period in steps (~15 in-game days). provenance: approximated, gap G-BANDIT-PERIOD, calibration M9.
     */
    banditPeriod: 13500,
  },

  /**
   * Contracts mechanic constants. iter-014 M5-2 T5.
   * Source: events.js + home.js:2407 + config.js:3248. See design_iter-014.md §5.3.
   */
  contracts: {
    /**
     * Max contracts offered/active at once.
     * Source: home.js:2414 maxContracts gate. provenance: approximated (orig. dynamic), gap G-CONTRACTS-CATALOG.
     */
    maxContracts: 5,
    /**
     * Offer generation period in days.
     * Source: events.js:305 STEPSPERDAY*15. provenance: approximated, gap G-CONTRACT-GEN.
     */
    offerPeriodDays: 15,
    /**
     * Offer period jitter in days (±). provenance: approximated.
     */
    offerJitterDays: 5,
    /**
     * First offer scheduled at this absolute step (>= 1 quarterDay). §14.5 MINOR-4.
     * Guarantees generátor fires AFTER marketInit (main.js:180). provenance: approximated.
     */
    firstOfferStep: 1,
    /**
     * Reward multiplier: reward = getGoldValue(cost) × rewardMult.
     * Source: events.js:252 goodsSeller. provenance: derived.
     */
    rewardMult: 1.4,
    /**
     * Goods quantity range for supply contracts [min, max].
     * provenance: approximated (orig. uses Math.random ranges), gap G-CONTRACT-GEN, calibration M9.
     */
    supplyQtyMin: 5,
    supplyQtyMax: 30,
  },
});
