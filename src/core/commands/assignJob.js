/**
 * assignJob command: move `delta` workers to/from a job.
 * Source intent: home.js:2165 assignJob (+ unassign as negative delta).
 * Hire cost (home.js:2169) is M5 → not implemented (gap G-BUILDER-M5 partial).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { hasCatalog, getCatalog } from '../catalog/index.js';

/**
 * Look up a job definition by id.
 * @param {string} jobId
 * @returns {Record<string, any> | null}
 */
function findJobDef(jobId) {
  if (!hasCatalog('jobs')) return null;
  const cat = /** @type {any} */ (getCatalog('jobs'));
  const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
  return jobs.find((/** @type {any} */ j) => j.id === jobId) ?? null;
}

/**
 * Total assigned workers across all jobs.
 * @param {GameState} state
 * @returns {number}
 */
function totalAssigned(state) {
  const jobs = state.home.jobs;
  if (!jobs) return 0;
  return Object.values(jobs).reduce((s, j) => s + (j.number || 0), 0);
}

/**
 * assignJob command handler.
 * params: { jobId: string, delta: number }
 * Validates: job exists, delta integer, resulting number in [0, job.max],
 *   enough unemployed (delta>0) or enough assigned (delta<0).
 * @param {GameState} state
 * @param {{ jobId?: unknown, delta?: unknown }} params
 * @returns {CommandResult}
 */
export function assignJob(state, params) {
  const jobId = params.jobId;
  const delta = params.delta;

  if (typeof jobId !== 'string' || !jobId) {
    return { ok: false, error: 'assignJob: jobId must be a non-empty string' };
  }
  if (!Number.isInteger(delta)) {
    return { ok: false, error: `assignJob: delta must be an integer, got ${delta}` };
  }
  if (delta === 0) {
    return { ok: true }; // no-op
  }

  // Look up job definition
  const def = findJobDef(jobId);
  if (!def) {
    return { ok: false, error: `assignJob: unknown job "${jobId}"` };
  }

  // Ensure jobs state exists for this job
  if (!state.home.jobs) state.home.jobs = {};
  if (!state.home.jobs[jobId]) {
    state.home.jobs[jobId] = { number: 0, curStep: 0 };
  }

  const jobState = state.home.jobs[jobId];
  const currentNumber = jobState.number || 0;
  const newNumber = currentNumber + /** @type {number} */ (delta);

  // Validate resulting number >= 0
  if (newNumber < 0) {
    return { ok: false, error: `assignJob: cannot unassign ${Math.abs(/** @type {number} */ (delta))} workers from "${jobId}" (only ${currentNumber} assigned)` };
  }

  // Validate resulting number <= job.max (if defined)
  const max = def.max != null ? def.max : Infinity;
  if (newNumber > max) {
    return { ok: false, error: `assignJob: cannot assign ${newNumber} workers to "${jobId}" (max is ${max})` };
  }

  // For positive delta: check enough unemployed workers available
  if (/** @type {number} */ (delta) > 0) {
    const workforce = state.home.workforce;
    const totalWorkers = workforce ? workforce.total : state.home.population.total;
    const assigned = totalAssigned(state);
    const unemployed = totalWorkers - assigned;
    if (/** @type {number} */ (delta) > unemployed) {
      return { ok: false, error: `assignJob: not enough unemployed workers (have ${unemployed}, need ${delta})` };
    }
  }

  // Apply mutation
  jobState.number = newNumber;

  // Update workforce.assigned
  if (state.home.workforce) {
    state.home.workforce.assigned = totalAssigned(state);
  }

  return { ok: true };
}

/**
 * Registers assignJob into a command registry.
 * @param {CommandRegistry} creg
 * @returns {void}
 */
export function registerAssignJob(creg) {
  registerCommand(creg, 'assignJob', assignJob);
}
