/**
 * Resource handlers per kind.
 * Each handler: get(state, key), add(state, key, n), remove(state, key, n, allowDeficit)
 * iter-007 M2a-1.
 * iter-009 M3: added 'stock' handler for world stockpiles (trees/animals/ores/livestock/farmland).
 */

import { byId } from '../catalog/loader.js';

/**
 * Path map for stock resources. Each value is a dot-separated path into state.
 * Source: design §3.5.
 */
const STOCK_PATH = {
  trees:     ['world', 'forest', 'curTrees'],
  animals:   ['world', 'forest', 'curAnimals'],
  ores:      ['world', 'mine', 'curOres'],
  livestock: ['world', 'field', 'curLivestock'],
  farmland:  ['world', 'field', 'usedFarmLand'],
};

/**
 * Read a nested path from state.
 * @param {any} obj
 * @param {string[]} path
 * @returns {number}
 */
function readPath(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return 0;
    cur = cur[key];
  }
  return typeof cur === 'number' ? cur : 0;
}

/**
 * Write a nested path in state.
 * @param {any} obj
 * @param {string[]} path
 * @param {number} value
 */
function writePath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) cur[path[i]] = {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

/**
 * @typedef {{ get(state:any,key:string):number, add(state:any,key:string,n:number):void, remove(state:any,key:string,n:number,allowDeficit?:boolean):number }} ResourceHandler
 */

const MAX_FOOD = 500; // from population.json maxFood

/** @type {Record<string, ResourceHandler>} */
export const resourceHandlers = {
  gold: {
    get(state, _key) { return state.player.gold || 0; },
    add(state, _key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for gold`);
      state.player.gold = (state.player.gold || 0) + n;
    },
    remove(state, _key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for gold`);
      const have = state.player.gold || 0;
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient gold (have ${have}, need ${n})`);
      state.player.gold = Math.max(0, have - n);
      return Math.min(n, have);
    },
  },
  techPt: {
    get(state, _key) { return state.player.techPt || 0; },
    add(state, _key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for techPt`);
      state.player.techPt = (state.player.techPt || 0) + n;
    },
    remove(state, _key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for techPt`);
      const have = state.player.techPt || 0;
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient techPt (have ${have}, need ${n})`);
      state.player.techPt = Math.max(0, have - n);
      return Math.min(n, have);
    },
  },
  goods: {
    get(state, key) { return (state.player.inventory && state.player.inventory[key]) || 0; },
    add(state, key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for goods/${key}`);
      if (!state.player.inventory) state.player.inventory = {};
      state.player.inventory[key] = (state.player.inventory[key] || 0) + n;
    },
    remove(state, key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for goods/${key}`);
      const have = (state.player.inventory && state.player.inventory[key]) || 0;
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient goods/${key} (have ${have}, need ${n})`);
      if (!state.player.inventory) state.player.inventory = {};
      state.player.inventory[key] = Math.max(0, have - n);
      return Math.min(n, have);
    },
  },
  food: {
    get(state, key) { return (state.home.food && state.home.food.store && state.home.food.store[key]) || 0; },
    add(state, key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for food/${key}`);
      if (!state.home.food) state.home.food = { store: {} };
      if (!state.home.food.store) state.home.food.store = {};
      const current = state.home.food.store[key] || 0;
      state.home.food.store[key] = Math.min(current + n, MAX_FOOD); // cap at maxFood
    },
    remove(state, key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for food/${key}`);
      const have = (state.home.food && state.home.food.store && state.home.food.store[key]) || 0;
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient food/${key} (have ${have}, need ${n})`);
      if (!state.home.food) state.home.food = { store: {} };
      if (!state.home.food.store) state.home.food.store = {};
      const actual = Math.min(n, have);
      state.home.food.store[key] = Math.max(0, have - n);
      return actual; // returns how much was actually removed
    },
  },
  resource: {
    get(state, key) { return (state.home.store && state.home.store[key]) || 0; },
    add(state, key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for resource/${key}`);
      if (!state.home.store) state.home.store = {};
      state.home.store[key] = (state.home.store[key] || 0) + n;
    },
    remove(state, key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for resource/${key}`);
      const have = (state.home.store && state.home.store[key]) || 0;
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient resource/${key} (have ${have}, need ${n})`);
      if (!state.home.store) state.home.store = {};
      state.home.store[key] = Math.max(0, have - n);
      return Math.min(n, have);
    },
  },

  /**
   * Stock handler for world stockpiles (trees/animals/ores/livestock/farmland).
   * Source: design §3.5 – iter-009 M3.
   * In M3 stocks are read-only from jobs (no job.cost yet, M5).
   * Writes only from forest/field/mine systems.
   */
  stock: {
    get(state, key) {
      const path = STOCK_PATH[/** @type {keyof typeof STOCK_PATH} */ (key)];
      if (!path) return 0;
      return readPath(state, path);
    },
    add(state, key, n) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for stock/${key}`);
      const path = STOCK_PATH[/** @type {keyof typeof STOCK_PATH} */ (key)];
      if (!path) throw new Error(`resources: unknown stock key "${key}"`);
      const cur = readPath(state, path);
      writePath(state, path, cur + n);
    },
    remove(state, key, n, allowDeficit = false) {
      if (!Number.isFinite(n)) throw new Error(`resources: NaN/Inf amount for stock/${key}`);
      const path = STOCK_PATH[/** @type {keyof typeof STOCK_PATH} */ (key)];
      if (!path) throw new Error(`resources: unknown stock key "${key}"`);
      const have = readPath(state, path);
      if (!allowDeficit && have - n < 0) throw new Error(`resources: insufficient stock/${key} (have ${have}, need ${n})`);
      writePath(state, path, Math.max(0, have - n));
      return Math.min(n, have);
    },
  },
};

/**
 * Get the resource kind for a key, using the catalog byId index.
 * Falls back to 'resource' if not found.
 * @param {string} key
 * @returns {string}
 */
export function resourceKindOf(key) {
  try {
    const entry = byId(key);
    const item = /** @type {Record<string, unknown>} */ (entry.entry);
    return /** @type {string} */ (item['kind'] || entry.type);
  } catch {
    // If not in byId, default to 'resource'
    return 'resource';
  }
}

/**
 * Get the handler for a resource key.
 * @param {string} key
 * @returns {ResourceHandler}
 */
export function handlerFor(key) {
  const kind = resourceKindOf(key);
  const handler = resourceHandlers[kind];
  if (!handler) throw new Error(`resources: no handler for kind "${kind}" (key="${key}")`);
  return handler;
}
