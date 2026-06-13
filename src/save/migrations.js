/**
 * Save file migration pipeline.
 * iter-007 M2a-1: initial empty migration table (v1 is baseline).
 */

import { SAVE_VERSION } from './schema.js';

/**
 * @typedef {{ from: number, to: number, migrate: (payload: object) => object }} MigrationStep
 */

/**
 * Ordered list of migration steps.
 * Each step migrates payload from `from` version to `to` version.
 * v1 is the current version; first real migration arrives when SAVE_VERSION bumps.
 * @type {MigrationStep[]}
 */
export const MIGRATIONS = [
  // Example format for future migrations:
  // { from: 1, to: 2, migrate: (payload) => ({ ...payload, newField: defaultValue }) }
];

/**
 * Apply all applicable migrations to bring payload from its saveVersion to SAVE_VERSION.
 * @param {object} payload
 * @returns {object} migrated payload
 */
export function migrate(payload) {
  let current = payload;
  const p = /** @type {Record<string, any>} */ (current);
  let version = (p.meta && p.meta.saveVersion) ? p.meta.saveVersion : 1;

  for (const step of MIGRATIONS) {
    if (version === step.from) {
      current = step.migrate(current);
      version = step.to;
    }
  }

  return current;
}
