/**
 * Export/import game state as a compressed base64 string.
 * Uses lz-string for compression.
 * M2b: export/import string.
 */
import { compressToBase64, decompressFromBase64 } from '../vendor/lzstring.standalone.js';
import { applyPersist } from './persistSchema.js';
import { loadAndReconstruct } from './load.js';

/**
 * Export current game state to a compressed base64 string.
 * @param {import('../core/state/types.js').GameState} state
 * @returns {string} compressed base64-encoded save string
 */
export function exportToString(state) {
  const payload = applyPersist(state);
  const json = JSON.stringify(payload);
  return compressToBase64(json);
}

/**
 * Import a game state from a compressed base64 string.
 * @param {string} str - compressed base64 export string
 * @param {object} [catalog] - catalog (for loadAndReconstruct)
 * @returns {import('../core/state/types.js').GameState}
 */
export function importFromString(str, catalog = {}) {
  const json = decompressFromBase64(str);
  if (!json) throw new Error('export: decompression failed (invalid or corrupt string)');
  let payload;
  try {
    payload = JSON.parse(json);
  } catch (e) {
    throw new Error(`export: JSON parse failed: ${e}`);
  }
  return loadAndReconstruct(payload, catalog);
}
