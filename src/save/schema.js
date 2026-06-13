/** IndexedDB database name */
export const DB_NAME = 'prosperity';
/** DB schema version (bump → onupgradeneeded migration) */
export const DB_VERSION = 1;
/** Object store: slot metadata (pointer to active generation) */
export const STORE_SLOTS = 'slots';
/** Object store: save records (one per slot×generation) */
export const STORE_SAVES = 'saves';
/** Single slot id for M0b (multi-slot is later) */
export const SLOT_ID = 'main';
/** Rotating generations kept per slot */
export const GENERATIONS = 3;
/** Save envelope version (bump for migrations – M2) */
export const SAVE_VERSION = 1;
