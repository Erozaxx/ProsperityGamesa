import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Write a catalog JSON file with sorted keys.
 * @param {string} outPath
 * @param {object} data
 */
export function writeCatalog(outPath, data) {
  mkdirSync(dirname(outPath), { recursive: true });
  const json = JSON.stringify(data, sortedReplacer, 2);
  writeFileSync(outPath, json + '\n', 'utf8');
}

/**
 * JSON replacer that sorts object keys alphabetically.
 * @param {string} _key
 * @param {unknown} value
 * @returns {unknown}
 */
function sortedReplacer(_key, value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  }
  return value;
}
