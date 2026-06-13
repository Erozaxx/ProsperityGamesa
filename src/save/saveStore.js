/**
 * Domain save logic: saveGame / loadGame / rotating generations / fallback.
 * Implements §6.1 (rotating N=3 generations, kill-safe tx), §6.4 (validateEnvelope asserts).
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

import { openDB, tx, get, put } from './idb.js';
import {
  DB_NAME, DB_VERSION, STORE_SLOTS, STORE_SAVES,
  SLOT_ID, GENERATIONS, SAVE_VERSION
} from './schema.js';
import { assertSerializable } from '../core/registry/registry.js';
import { loadAndReconstruct } from './load.js';
import { applyPersist } from './persistSchema.js';

/**
 * @typedef {{ slotId: string, activeGen: number, updatedAt: number }} SlotRecord
 * @typedef {{ key: string, slotId: string, generation: number, savedAt: number,
 *             lastSimTimestamp: number, saveVersion: number, gameVersion: string,
 *             payload: GameState }} SaveRecord
 */

/**
 * Upgrade handler – creates stores if they don't exist.
 * @param {IDBDatabase} db
 */
function onUpgrade(db) {
  if (!db.objectStoreNames.contains(STORE_SLOTS)) {
    db.createObjectStore(STORE_SLOTS, { keyPath: 'slotId' });
  }
  if (!db.objectStoreNames.contains(STORE_SAVES)) {
    db.createObjectStore(STORE_SAVES, { keyPath: 'key' });
  }
}

/** Cached db reference to avoid repeated opens. @type {IDBDatabase|null} */
let _db = null;

/** @returns {Promise<IDBDatabase>} */
async function getDB() {
  if (!_db) {
    _db = await openDB(DB_NAME, DB_VERSION, onUpgrade);
  }
  return _db;
}

/**
 * Validates the minimum invariants of a save record's envelope.
 * Throws if invalid (caller falls back to next generation).
 * @param {SaveRecord} rec
 */
function validateEnvelope(rec) {
  if (rec.saveVersion !== SAVE_VERSION) {
    throw new Error(`save: version mismatch ${rec.saveVersion} !== ${SAVE_VERSION}`);
  }
  if (!rec.payload || typeof rec.payload !== 'object') {
    throw new Error('save: payload missing or not an object');
  }
  const p = rec.payload;
  if (!p.meta || !p.engine || !p.season || !p.rng) {
    throw new Error('save: payload missing required fields (meta/engine/season/rng)');
  }
  if (!Number.isFinite(p.engine.curStep)) {
    throw new Error('save: engine.curStep is not finite');
  }
  if (!p.rng.streams || typeof p.rng.streams !== 'object') {
    throw new Error('save: rng.streams missing or not an object');
  }
}

/**
 * Persists the full game state to the next rotating generation, then advances the slot pointer.
 * @param {GameState} state
 * @param {Object} [opts]
 * @param {string} [opts.slotId]
 * @param {number} [opts.now] - wall-clock (Date.now()) injected from app/; defaults to Date.now()
 * @returns {Promise<{ generation: number, savedAt: number }>}
 */
export async function saveGame(state, opts = {}) {
  const slotId = opts.slotId ?? SLOT_ID;
  const now = opts.now ?? Date.now();

  // Fail-fast: validates no functions/cycles in state
  assertSerializable(state);

  const db = await getDB();

  // Get current slot or create default
  const slotStore = db.transaction(STORE_SLOTS, 'readonly').objectStore(STORE_SLOTS);
  const existingSlot = /** @type {SlotRecord|undefined} */ (await get(slotStore, slotId));
  const slot = existingSlot ?? { slotId, activeGen: -1, updatedAt: 0 };

  const nextGen = (slot.activeGen + 1) % GENERATIONS;

  /** @type {SaveRecord} */
  const record = {
    key: `${slotId}:${nextGen}`,
    slotId,
    generation: nextGen,
    savedAt: now,
    lastSimTimestamp: now,
    saveVersion: SAVE_VERSION,
    gameVersion: state.meta.gameVersion,
    payload: applyPersist(state),
  };

  await tx(db, [STORE_SAVES, STORE_SLOTS], 'readwrite', (t) => {
    put(t.objectStore(STORE_SAVES), record);
    put(t.objectStore(STORE_SLOTS), { slotId, activeGen: nextGen, updatedAt: now });
  });

  return { generation: nextGen, savedAt: now };
}

/**
 * Loads the active generation for a slot. Falls back to previous generations on corruption.
 * @param {string} [slotId]
 * @param {object} [catalog]
 * @returns {Promise<{ state: GameState, record: SaveRecord } | null>}
 */
export async function loadGame(slotId = SLOT_ID, catalog) {
  const db = await getDB();

  const slotStore = db.transaction(STORE_SLOTS, 'readonly').objectStore(STORE_SLOTS);
  const slot = /** @type {SlotRecord|undefined} */ (await get(slotStore, slotId));

  if (!slot || slot.activeGen < 0) return null;

  const GEN = GENERATIONS;
  const order = [
    slot.activeGen,
    (slot.activeGen - 1 + GEN) % GEN,
    (slot.activeGen - 2 + GEN) % GEN,
  ];

  for (const gen of order) {
    const savesStore = db.transaction(STORE_SAVES, 'readonly').objectStore(STORE_SAVES);
    const rec = /** @type {SaveRecord|undefined} */ (await get(savesStore, `${slotId}:${gen}`));
    if (!rec) continue;
    try {
      validateEnvelope(rec);
      // Use 7-step pipeline if catalog available
      const state = catalog ? loadAndReconstruct(rec.payload, catalog) : rec.payload;
      return { state, record: rec };
    } catch {
      // Corrupted generation – try next
      continue;
    }
  }

  return null;
}

/**
 * Resets cached db (for testing).
 * @returns {void}
 */
export function _resetDB() {
  _db = null;
}
