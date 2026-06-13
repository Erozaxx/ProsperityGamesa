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
  | 'events';

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

/** Home settlement state */
export interface HomeState {
  population: PopulationState;
  housing: HousingState;
  food: FoodState;
  health: HealthState;
  crime: CrimeState;
  settlementLevel: number;
}

/** Player resource state */
export interface PlayerState {
  gold: number;
  techPt: number;
  inventory: Record<string, number>;
}

/** Transaction event emitted by resource handlers */
export interface TxEvent {
  key: string;
  amount: number;
  cause: string;
  step: number;
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
  /** Slot: filled in M2/M7 */
  world: Record<string, unknown>;
  /** Slot: filled in M5/M6 */
  catalogState: { modifiers: unknown[] };
  /** Slot: filled in M7 */
  battle: null | Record<string, unknown>;
  /** Slot: filled in M8 */
  story: Record<string, unknown>;
  log: LogState;
  /** Slot: filled in M8 */
  achievements: { unlocked: Record<string, unknown> };
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

/** Tick execution context passed to handlers */
export interface TickContext {
  registry: import('../registry/registry.js').Registry;
  periodics: PeriodicTask[];
  emitTx?: (tx: TxEvent) => void;
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
