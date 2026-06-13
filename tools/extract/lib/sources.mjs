import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..', '..');

/**
 * Read and parse config-extract.json
 * @returns {object}
 */
export function readConfigExtract() {
  const p = join(rootDir, 'doc/original_source/extracted/config-extract.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

/**
 * Read and parse rootscope-raw-dump.json
 * @returns {object}
 */
export function readRootScopeDump() {
  const p = join(rootDir, 'doc/original_source/extracted/rootscope-raw-dump.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}
