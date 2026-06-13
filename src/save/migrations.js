/**
 * Save file migration pipeline.
 * iter-007 M2a-1: initial empty migration table (v1 is baseline).
 * iter-010 M4a: v1→v2 migration adds economics fields.
 */

import { SAVE_VERSION } from './schema.js';
import { createCouncilState } from '../core/state/createCouncilState.js';

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
  {
    from: 1,
    to: 2,
    /**
     * v1→v2: adds economics fields (taxRate, totWarriors, totArchers, diseaseFromColdChance,
     * notEnoughMilitaryFunding, council). iter-010 M4a.
     * @param {Record<string, any>} payload
     * @returns {Record<string, any>}
     */
    migrate: (payload) => {
      const p = /** @type {Record<string, any>} */ ({ ...payload });
      // player fields
      if (p.player) {
        p.player = { ...p.player };
        if (p.player.taxRate === undefined) p.player.taxRate = 1;
        if (p.player.totWarriors === undefined) p.player.totWarriors = 0;
        if (p.player.totArchers === undefined) p.player.totArchers = 0;
        if (p.player.diseaseFromColdChance === undefined) p.player.diseaseFromColdChance = 0;
      }
      // home fields
      if (p.home) {
        p.home = { ...p.home };
        if (p.home.notEnoughMilitaryFunding === undefined) p.home.notEnoughMilitaryFunding = false;
      }
      // council
      if (!p.council) {
        p.council = createCouncilState();
      }
      // bump saveVersion
      if (p.meta) {
        p.meta = { ...p.meta, saveVersion: 2 };
      }
      return p;
    },
  },
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
