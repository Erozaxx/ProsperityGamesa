/**
 * @typedef {import('./types.js').GameState} GameState
 * @typedef {import('./types.js').InitOptions} InitOptions
 */

import { createHomeState, createPlayerState } from './createHomeState.js';
import { createCouncilState } from './createCouncilState.js';
import { BALANCE } from '../balance/balance.js';
import { deriveWorkforceTotal } from '../systems/jobs.js';
import { rebuildBuildingDerived } from '../systems/buildings.js';
import { hydrateZones } from '../systems/world.js';

/**
 * Creates the initial world sub-domain state.
 * Source: config.js:686-715 (start values). provenance: extracted.
 * iter-011 M4b: added marketState (empty, filled by marketInit after catalog load) and caravan.
 * @returns {import('./types.js').GameState['world']}
 */
function createWorldState() {
  const bal = BALANCE;
  return {
    forest: {
      curTrees: bal.forestStocks.startTrees,           // config.js:687
      curAnimals: bal.forestStocks.startAnimals,        // config.js:686
      saplings: new Array(bal.forestStocks.saplingQueueLen).fill(0), // 10-element queue
      health: 100,
      timeSinceLastFire: 0,
      lastFire: 0,
      consecutiveNoAnimal: 0,
    },
    field: {
      curLivestock: bal.field.startLivestock,  // config.js:708
      rodentInfestation: 0,
      usedFarmLand: 0,
      inspectTime: 0,
    },
    mine: {
      curOres: bal.mine.startOres, // config.js:715
    },
    /** Client-side market supply (empty – filled by marketInit after goods catalog load). iter-011 M4b. */
    marketState: {},
    /** Caravan trade state. iter-011 M4b. Source: dump.BASECARAVANCAPACITY. */
    caravan: {
      capacity: bal.caravan.baseCapacity, // 10000
      speed: 0,                           // road tech bonus = M5 gap G-CARAVAN-ROADS
      sentOut: 0,                         // 0 = idle
      recGoods: {},                       // delivered on return
    },
    /** Zone list — hydrated by hydrateZones after catalog load. iter-016 M7a-1. */
    zones: [],
    /** Faction map — hydrated by hydrateZones after catalog load. iter-016 M7a-1. */
    factions: {},
  };
}

// Defaults – MOVE TO balance.js @ M1 (source: design_iter-004_T-001 §2.2)
const DEFAULT_SEED = 0x9E3779B9;
const DEFAULT_GAME_VERSION = '0.0.0-m0a';
const DEFAULT_SAVE_VERSION = 3;
const DEFAULT_LOG_CAPACITY = 200;
const DEFAULT_FRAME_BUDGET = 8;

/**
 * Builds a clean initial game state (single source of truth about state shape).
 * No I/O, no catalog (catalog is M1) – just neutral default values.
 * rng.streams is intentionally empty: call initRng(state) after this.
 * @param {InitOptions} [opts]
 * @returns {GameState}
 */
export function createInitialState(opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed >>> 0 : DEFAULT_SEED;
  const gameVersion = opts.gameVersion ?? DEFAULT_GAME_VERSION;
  const logCapacity = opts.logCapacity ?? DEFAULT_LOG_CAPACITY;
  const frameBudget = opts.frameBudget ?? DEFAULT_FRAME_BUDGET;

  const player = createPlayerState();
  const home = createHomeState();

  // A1 (iter-012 T-005): seed start values from BALANCE.start (single source of truth).
  // Factories return neutral defaults; start seeding lives here where BALANCE is imported.
  player.gold = BALANCE.start.gold;
  home.population.total = BALANCE.start.population;
  home.housing.counts = { ...BALANCE.start.housing };
  // R-A1-2: guarantee all 6 food keys exist (UI/selectors depend on them).
  // Factory already returns a zero-filled 6-key store; merge BALANCE.start.food over it.
  home.food.store = { ...home.food.store, ...BALANCE.start.food };

  /** @type {GameState} */
  const state = {
    meta: {
      saveVersion: DEFAULT_SAVE_VERSION,
      gameVersion,
      startedAtStep: 0,
      seed,
    },
    engine: {
      curStep: 0,
      speed: 1,
      running: true,
      frameBudget,
      schedule: [],
      scheduleCount: {},
      _seq: 0,
    },
    rng: {
      seed,
      streams: {},
    },
    season: {
      curStep: 0,
      curDay: 1,
      curMonth: 1,
      curYear: 1,
      curSeason: 0,
      dayInSeason: 1,
      _absDay: 1,
    },
    player,
    home,
    world: createWorldState(),
    catalogState: { modifiers: [] },
    battle: null,
    story: {
      event: null,
      queue: [],
      used: {},
      lines: {},
      tutorials: { done: {}, curId: null, curStep: 0 },
      pendingEffects: [],
    },
    log: {
      entries: [],
      capacity: logCapacity,
      head: 0,
    },
    achievements: { unlocked: {} },
    council: createCouncilState(),
  };

  // T4.6 (iter-013 M5-1): initialize building-derived state via the same shared path as load.js
  // Step 5. This ensures _modVersion/_effCache/derived are in identical state regardless of
  // whether we're starting fresh or loading a save. Without this, hashState differs because
  // load calls rebuildBuildingDerived (which sets _modVersion) but fresh game does not.
  // With 0 buildings, this is a no-op for aggregates but still initializes the cache version.
  rebuildBuildingDerived(/** @type {any} */ (state));

  // iter-016 M7a-1: hydrate zones and factions from catalog (no-op if catalog not loaded).
  hydrateZones(state);

  // A1/T-016 (DR-012-02 dotažení): workforce.total je odvozené pole (NEPERZISTUJE se).
  // Dopočítej ho už při konstrukci přes stejnou kanonickou derivaci jako load.js Step 5
  // a autoAssignWorkers — jinak spojitý sim vstupuje do kroku 1 se stale workforce.total=0
  // a jobsAccidents (order 20, před autoAssign order 30) přeskočí svůj 'population' RNG draw
  // → desync vůči load cestě. Bez ctx → workerSlots použije globální katalog fallback
  // (== chování load); když houseTypes katalog není načten, derivuje 0 (shodné s load i se
  // spojitým simem bez katalogu).
  state.home.workforce.total = deriveWorkforceTotal(/** @type {any} */ (state));

  return state;
}
