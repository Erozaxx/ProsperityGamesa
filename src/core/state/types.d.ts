/**
 * Shared type declarations for the Prosperity rebuild engine core (M0a).
 * All types are plain-data / serializable unless noted otherwise.
 * iter-007 M2a-1: added PlayerState, HomeState, sub-domain states, TxEvent, emitTx.
 */

/** Speed level: 0=paused, 1=normal, 2=fast */
export type Speed = 0 | 1 | 2;

/** Named RNG stream identifiers */
export type StreamName =
  | 'population'
  | 'forest'
  | 'mine'
  | 'field'
  | 'market'
  | 'world'
  | 'battle'
  | 'events'
  | 'buildings';

/** One building instance */
export interface BuildingInstance {
  instId: string;
  hp: number;
  inRepair: boolean;
}

/** Per-building-type dynamic state */
export interface BuildingState {
  created: number;    // invariant: === instances.length (re-derived on load)
  totalMade: number;  // cumulative builds; never decreases; input to scaleCost + instId
  instances: BuildingInstance[];
}

/** One project in the projectQueue */
export interface ProjectState {
  id: string;
  type: 'build' | 'repair';
  buildingId: string;
  instId?: string;       // only for 'repair'
  curProgress: number;
  maxProgress: number;
  builders: number;
  cost: Record<string, number>;
  paid: boolean;
  removable: boolean;
  delay: number;
}

/** Derived (non-persisted) building aggregates */
export interface BuildingDerived {
  maxWorkers: number;
  attractiveness: number;
  storageCapacity: Record<string, number>;
}

/** One scheduled one-shot event in the scheduler heap. Serializable. */
export interface ScheduleEntry {
  /** Absolute step at which this event fires */
  step: number;
  /** String ID of the handler in the fns registry */
  id: string;
  /** Plain-data params (serializable) */
  params: Record<string, unknown>;
  /** Monotonic insertion sequence for FIFO tie-breaking */
  seq: number;
}

/** Engine runtime state (inside GameState) */
export interface EngineState {
  curStep: number;
  speed: Speed;
  running: boolean;
  frameBudget: number;
  /** Min-heap of scheduled one-shot events */
  schedule: ScheduleEntry[];
  /** Index: id → count of scheduled occurrences */
  scheduleCount: Record<string, number>;
  /** Monotonic insertion counter for scheduler tie-breaker (FIFO within same step) */
  _seq: number;
}

/** Calendar / season state */
export interface SeasonState {
  /** Mirrors engine.curStep for calendar use */
  curStep: number;
  /** Absolute day in current year (1..364) */
  curDay: number;
  /** Month number (1..12, provisional 30d/month) */
  curMonth: number;
  /** Current year (starts at 1) */
  curYear: number;
  /** Current season index (0=spring,1=summer,2=autumn,3=winter) */
  curSeason: number;
  /** Day within current season (1..91) */
  dayInSeason: number;
  /** Monotonically increasing day counter from game start (starts at 1) */
  _absDay: number;
}

/** RNG state: streams keyed by StreamName, values are uint32 PRNG state */
export interface RngState {
  /** Master seed */
  seed: number;
  /** Per-stream PRNG state (uint32 per stream) */
  streams: Partial<Record<StreamName, number>>;
}

/** One log entry */
export interface LogEntry {
  step: number;
  msg: string;
}

/** Circular-buffer log */
export interface LogState {
  entries: LogEntry[];
  capacity: number;
  head: number;
}

/** Population sub-domain state */
export interface PopulationState {
  total: number;
  migrationAcc: number;
  bornTotal: number;
  diedTotal: number;
}

/** Housing sub-domain state */
export interface HousingState {
  counts: Record<string, number>;
}

/** Food sub-domain state */
export interface FoodState {
  store: Record<string, number>;
}

/** Health sub-domain state */
export interface HealthState {
  diseaseActive: boolean;
  diseaseDaysLeft: number;
}

/** Crime sub-domain state */
export interface CrimeState {
  level: number;
}

/** Per-job dynamic state */
export interface JobState {
  number: number;   // assigned workers
  curStep: number;  // production progress accumulator
}

/** Per-skill dynamic state */
export interface SkillState {
  progressing: boolean;
  curStep: number;
  progPct: number;  // 0..100 (derived, not persisted)
}

/** Market entry for one good: available supply, max, and mean-reversion baseline. iter-011 M4b. */
export interface MarketEntry {
  available: number;
  max: number;
  baseline: number;
}

/** Caravan state (under state.world). iter-011 M4b. */
export interface CaravanState {
  capacity: number;
  speed: number;
  sentOut: number;
  recGoods: Record<string, number>;
}

/** Workforce summary */
export interface WorkforceState {
  total: number;    // derived from housing workerSlots (not persisted directly)
  assigned: number; // Σ jobs[*].number
}

/** Forest sub-domain state (under state.world) */
export interface ForestState {
  curTrees: number;
  curAnimals: number;
  saplings: number[];         // 10-element sapling queue
  health: number;             // 0..100
  timeSinceLastFire: number;
  lastFire: number;           // step of last fire (0=never)
  consecutiveNoAnimal: number;
}

/** Field sub-domain state (under state.world) */
export interface FieldState {
  curLivestock: number;
  rodentInfestation: number;
  usedFarmLand: number;
  inspectTime: number;
}

/** Mine sub-domain state (under state.world) */
export interface MineState {
  curOres: number;
}

/** Home settlement state */
export interface HomeState {
  population: PopulationState;
  housing: HousingState;
  food: FoodState;
  health: HealthState;
  crime: CrimeState;
  settlementLevel: number;
  /** Jobs dynamic state – per jobId { number, curStep }. iter-009 M3. */
  jobs: Record<string, JobState>;
  /** Skills dynamic state – per skillId { progressing, curStep, progPct }. iter-009 M3. */
  skills: Record<string, SkillState>;
  /** Workforce summary. iter-009 M3. */
  workforce: WorkforceState;
  /** Worker efficiency (0.25..2). Computed daily by workerEfficiency.daily. iter-009 M3. */
  workerEfficiency: number;
  /** Auto-assign policy (default true). iter-009 M3. */
  autoAssign?: boolean;
  /** Flag: insufficient funds for military upkeep. iter-010 M4a. */
  notEnoughMilitaryFunding?: boolean;
  /** Firewood/resources stockpile (general). iter-010 M4a. */
  store?: Record<string, number>;
  /** Buildings dynamic state – per buildingId. Lazy (empty until first build). iter-013 M5-1. */
  buildings: Record<string, BuildingState>;
  /** Serialisable project queue for build + repair. iter-013 M5-1. */
  projectQueue: ProjectState[];
  /** Monotonic counter for deterministic project IDs. iter-013 M5-1. */
  projectSeq: number;
  /** Non-persisted building aggregates. Rebuilt by rebuildBuildingDerived. iter-013 M5-1. */
  derived: BuildingDerived;
  /**
   * Purchased/hired builder companies. Key = companyId, value = true.
   * Optional enhancement (design §3.2, G-BUILDER-COMPANIES). iter-013 M5-1 T3.
   */
  ownedCompanies?: Record<string, boolean>;
}

/** Player resource state */
export interface PlayerState {
  gold: number;
  techPt: number;
  inventory: Record<string, number>;
  /** Tax rate set by player. Default 1. iter-010 M4a. */
  taxRate: number;
  /** Warrior count (upkeep). M4a placeholder – filling M7; default 0. */
  totWarriors: number;
  /** Archer count (upkeep). M4a placeholder – filling M7; default 0. */
  totArchers: number;
  /** Disease-from-cold accumulator. iter-010 M4a. */
  diseaseFromColdChance: number;
}

/** Transaction event emitted by resource handlers */
export interface TxEvent {
  key: string;
  amount: number;
  cause: string;
  step: number;
}

/** One monthly financial report. iter-010 M4a. */
export interface MonthlyReport {
  month: number;
  year: number;
  goldEarned: number;
  goldSpent: number;
  byCause: Record<string, number>;
  consumed: Record<string, number>;
  produced: Record<string, number>;
}

/** Council domain – accounting. iter-010 M4a. */
export interface CouncilState {
  current: MonthlyReport;
  history: MonthlyReport[];
}

/** Full game state tree – plain-data, serializable, single source of truth */
export interface GameState {
  meta: {
    saveVersion: number;
    gameVersion: string;
    startedAtStep: number;
    seed: number;
  };
  engine: EngineState;
  rng: RngState;
  season: SeasonState;
  /** Player resource state */
  player: PlayerState;
  /** Home settlement state */
  home: HomeState;
  /** World sub-domains: forest, field, mine, market, caravan. iter-009 M3, iter-011 M4b. */
  world: {
    forest?: ForestState;
    field?: FieldState;
    mine?: MineState;
    /** Client-side market supply per good. iter-011 M4b. */
    marketState?: Record<string, MarketEntry>;
    /** Caravan trade state. iter-011 M4b. */
    caravan?: CaravanState;
    [key: string]: unknown;
  };
  /** Slot: filled in M5/M6 */
  catalogState: { modifiers: unknown[] };
  /** Slot: filled in M7 */
  battle: null | Record<string, unknown>;
  /** Slot: filled in M8 */
  story: Record<string, unknown>;
  log: LogState;
  /** Slot: filled in M8 */
  achievements: { unlocked: Record<string, unknown> };
  /** Council accounting state. iter-010 M4a. */
  council: CouncilState;
}

/** Options for createInitialState */
export interface InitOptions {
  seed?: number;
  gameVersion?: string;
  logCapacity?: number;
  frameBudget?: number;
}

/** Time edge flags produced by calendar for a single step */
export interface TimeEdges {
  isNewDay: boolean;
  isQuarterDay: boolean;
  isNoon: boolean;
  isNewMonth: boolean;
  isNew5Days: boolean;
  isNew10Days: boolean;
  isNewSeason: boolean;
  isNewYear: boolean;
}

/** A periodic task declaration (data, not in state) */
export interface PeriodicTask {
  id: string;
  every: EdgeName | number;
  order: number;
  systemFn: string;
}

/** Named time edge identifiers */
export type EdgeName =
  | 'step'
  | 'quarterDay'
  | 'noon'
  | 'day'
  | '5days'
  | '10days'
  | 'month'
  | 'season'
  | 'year';

/** Pre-loaded catalog cache for hot-path systems (BL-3). iter-009 M3. */
export interface CatalogCache {
  jobs?: Array<Record<string, any>>;
  houseTypes?: Array<Record<string, any>>;
  food?: Array<Record<string, any>>;
  skills?: Array<Record<string, any>>;
  /** Goods catalog for market init. iter-011 M4b. */
  goods?: Array<Record<string, any>>;
}

/** Tick execution context passed to handlers */
export interface TickContext {
  registry: import('../registry/registry.js').Registry;
  periodics: PeriodicTask[];
  emitTx?: (tx: TxEvent) => void;
  /** Pre-loaded catalog arrays for BL-3 hot-path (optional). iter-009 M3. */
  catalog?: CatalogCache;
}

/** RNG interface returned by makeRng */
export interface Rng {
  /** Returns float in [0, 1) */
  next: () => number;
  /** Returns integer in [0, maxExclusive) */
  int: (maxExclusive: number) => number;
  /** Returns float in [min, max) */
  range: (min: number, max: number) => number;
  /** Returns true with probability p */
  chance: (p: number) => boolean;
}
