/**
 * Resource handlers per kind.
 * Each handler: get(state, key), add(state, key, n), remove(state, key, n, allowDeficit)
 * iter-007 M2a-1.
 */

import { byId } from '../catalog/loader.js';

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
