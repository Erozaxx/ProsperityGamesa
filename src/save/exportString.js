/**
 * Export/import game state as a compressed base64 string.
 * Uses lz-string for compression.
 * M2b: export/import string.
 * S-6: export as envelope {saveVersion, gameVersion, lastSimTimestamp, payload}
 *   to preserve offline time across export/import and support cross-version migration.
 */
import { compressToBase64, decompressFromBase64 } from '../vendor/lzstring.standalone.js';
import { applyPersist } from './persistSchema.js';
import { loadAndReconstruct } from './load.js';
import { SAVE_VERSION } from './schema.js';

/**
 * @typedef {{ saveVersion: number, gameVersion: string, lastSimTimestamp: number, payload: Record<string, unknown> }} ExportEnvelope
 */

/**
 * Export current game state to a compressed base64 string.
 * S-6: wraps payload in envelope with saveVersion, gameVersion, lastSimTimestamp.
 * @param {import('../core/state/types.js').GameState} state
 * @param {Object} [opts]
 * @param {number} [opts.lastSimTimestamp] - wall-clock at export time (defaults to Date.now())
 * @returns {string} compressed base64-encoded save string
 */
export function exportToString(state, opts = {}) {
  const lastSimTimestamp = opts.lastSimTimestamp ?? Date.now();
  const payload = applyPersist(state);
  /** @type {ExportEnvelope} */
  const envelope = {
    saveVersion: SAVE_VERSION,
    gameVersion: /** @type {any} */ (state).meta?.gameVersion ?? '',
    lastSimTimestamp,
    payload,
  };
  const json = JSON.stringify(envelope);
  return compressToBase64(json);
}

/**
 * Import a game state from a compressed base64 string.
 * S-6: reads envelope; returns both reconstructed state and lastSimTimestamp.
 * @param {string} str - compressed base64 export string
 * @param {object} [catalog] - catalog (for loadAndReconstruct)
 * @returns {{ state: import('../core/state/types.js').GameState, lastSimTimestamp: number }}
 */
export function importFromString(str, catalog = {}) {
  const json = decompressFromBase64(str);
  if (!json) throw new Error('export: decompression failed (invalid or corrupt string)');
  /** @type {ExportEnvelope | Record<string, unknown>} */
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`export: JSON parse failed: ${e}`);
  }
  const envelope = /** @type {ExportEnvelope} */ (parsed);
  // Support both envelope format and legacy bare-payload format
  const isEnvelope = envelope && typeof envelope === 'object' && 'payload' in envelope && 'saveVersion' in envelope;
  const rawPayload = isEnvelope ? envelope.payload : /** @type {Record<string, unknown>} */ (parsed);
  const lastSimTimestamp = isEnvelope && typeof envelope.lastSimTimestamp === 'number'
    ? envelope.lastSimTimestamp
    : Date.now();
  const state = loadAndReconstruct(rawPayload, catalog);
  return { state, lastSimTimestamp };
}
