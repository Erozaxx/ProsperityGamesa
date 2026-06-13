/**
 * @typedef {import('./types.js').GameState} GameState
 * @typedef {import('./types.js').InitOptions} InitOptions
 */

import { createHomeState, createPlayerState } from './createHomeState.js';
import { createCouncilState } from './createCouncilState.js';
import { BALANCE } from '../balance/balance.js';

/**
 * Creates the initial world sub-domain state.
 * Source: config.js:686-715 (start values). provenance: extracted.
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
  };
}

// Defaults – MOVE TO balance.js @ M1 (source: design_iter-004_T-001 §2.2)
const DEFAULT_SEED = 0x9E3779B9;
const DEFAULT_GAME_VERSION = '0.0.0-m0a';
const DEFAULT_SAVE_VERSION = 2;
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

  return {
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
    player: createPlayerState(),
    home: createHomeState(),
    world: createWorldState(),
    catalogState: { modifiers: [] },
    battle: null,
    story: {},
    log: {
      entries: [],
      capacity: logCapacity,
      head: 0,
    },
    achievements: { unlocked: {} },
    council: createCouncilState(),
  };
}
