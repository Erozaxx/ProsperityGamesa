import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..', '..');

/**
 * @typedef {Record<string, unknown>} RawJSON
 */

/**
 * Read and parse config-extract.json
 * @returns {RawJSON}
 */
export function readConfigExtract() {
  const p = join(rootDir, 'doc/original_source/extracted/config-extract.json');
  return /** @type {RawJSON} */ (JSON.parse(readFileSync(p, 'utf8')));
}

/**
 * Read and parse rootscope-raw-dump.json
 * @returns {RawJSON}
 */
export function readRootScopeDump() {
  const p = join(rootDir, 'doc/original_source/extracted/rootscope-raw-dump.json');
  return /** @type {RawJSON} */ (JSON.parse(readFileSync(p, 'utf8')));
}
