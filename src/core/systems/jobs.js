/**
 * Jobs system: production tick.
 * iter-007 M2a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { getCatalog } from '../catalog/index.js';
import { grant } from '../resources/transactions.js';
import { resourceKindOf } from '../resources/handlers.js';

/** Fixed worker count per job (M2a approximation; real workers assigned in M3). */
const WORKERS_PER_JOB = 5;

/**
 * Jobs production - quarterDay edge, order 10.
 * Grants food products from food-type jobs.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function jobsProduction(state, _params, ctx) {
  let jobs;
  try {
    const cat = /** @type {any} */ (getCatalog('jobs'));
    jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
  } catch {
    jobs = [];
  }

  for (const job of jobs) {
    if (!job.products) continue;
    /** @type {Record<string, number>} */
    const foodProducts = {};
    for (const [resourceId, amount] of Object.entries(job.products)) {
      const kind = resourceKindOf(resourceId);
      if (kind === 'food') {
        foodProducts[resourceId] = /** @type {number} */ (amount) * WORKERS_PER_JOB;
      }
    }
    if (Object.keys(foodProducts).length > 0) {
      grant(state, foodProducts, 'job:' + job.id, ctx, state.engine.curStep);
    }
  }
}
