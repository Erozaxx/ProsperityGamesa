/**
 * Tick order declaration (living artifact §4.3) and runTick implementation.
 * Phases: calendar → schedule → periodics → devInvariants
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 * @typedef {import('../state/types.js').PeriodicTask} PeriodicTask
 * @typedef {import('../state/types.js').EdgeName} EdgeName
 * @typedef {import('../state/types.js').TimeEdges} TimeEdges
 * @typedef {import('../registry/registry.js').Registry} Registry
 */

import { advanceCalendar } from '../systems/calendar.js';
import { scheduleDue } from './scheduler.js';
import { register, resolve } from '../registry/registry.js';

/**
 * Tick execution phases (living artefact – single source of truth for tickOrder.md).
 * @type {ReadonlyArray<{phase: string, note: string}>}
 */
export const TICK_ORDER = Object.freeze([
  { phase: 'calendar',   note: 'posun dne/měsíce/roku/sezóny – produkuje TimeEdges' },
  { phase: 'schedule',   note: 'one-shot události se step<=curStep přes fns registr' },
  { phase: 'periodics',  note: 'periodika dle hran v deklarovaném order (viz registerCorePeriodics)' },
  { phase: 'eventFlush', note: 'dev-invarianty (NaN/záporné zásoby) – v iter-004 jen NaN guard na curStep' },
]);

/** Edge priority order for sorting periodics (lower index = higher priority). */
const EDGE_PRIORITY = /** @type {Record<string, number>} */ ({
  step: 0,
  quarterDay: 1,
  noon: 2,
  day: 3,
  '5days': 4,
  '10days': 5,
  month: 6,
  season: 7,
  year: 8,
});

/**
 * Returns edge priority for sorting.
 * @param {EdgeName | number} every
 * @returns {number}
 */
function edgePriority(every) {
  if (typeof every === 'number') return -1; // numeric intervals run before named edges
  return EDGE_PRIORITY[every] ?? 99;
}

/**
 * Returns true if a periodic task's edge is active this step.
 * @param {EdgeName | number} every
 * @param {TimeEdges} edges
 * @param {number} curStep
 * @returns {boolean}
 */
function edgeActive(every, edges, curStep) {
  if (typeof every === 'number') return curStep % every === 0;
  switch (every) {
    case 'step':       return true;
    case 'quarterDay': return edges.isQuarterDay;
    case 'noon':       return edges.isNoon;
    case 'day':        return edges.isNewDay;
    case '5days':      return edges.isNew5Days;
    case '10days':     return edges.isNew10Days;
    case 'month':      return edges.isNewMonth;
    case 'season':     return edges.isNewSeason;
    case 'year':       return edges.isNewYear;
    default:           return false;
  }
}

/**
 * Dev invariant checks. In iter-004: guard curStep is finite integer.
 * @param {GameState} state
 */
function devInvariants(state) {
  if (!Number.isFinite(state.engine.curStep)) {
    throw new Error(`devInvariants: curStep is not finite: ${state.engine.curStep}`);
  }
}

/**
 * Executes one tick in declared order.
 * @param {GameState} state
 * @param {TickContext} ctx
 * @returns {void}
 */
export function runTick(state, ctx) {
  // Phase 1: calendar
  const edges = advanceCalendar(state);

  // Phase 2: schedule – fire due one-shot events
  const due = scheduleDue(state, state.engine.curStep);
  for (const entry of due) {
    const handler = resolve(ctx.registry, entry.id);
    handler(state, entry.params, ctx);
  }

  // Phase 3: periodics
  for (const task of ctx.periodics) {
    if (edgeActive(task.every, edges, state.engine.curStep)) {
      resolve(ctx.registry, task.systemFn)(state, {}, ctx);
    }
  }

  // Phase 4: dev invariants
  devInvariants(state);
}

/**
 * Idempotently registers core periodic tasks (iter-004 = no-op slots, real logic in M2+).
 * Returns sorted periodics array for ctx.periodics.
 * @param {Registry} registry
 * @returns {PeriodicTask[]}
 */
export function registerCorePeriodics(registry) {
  // Register shared no-op handler (idempotent: same function reference)
  register(registry, 'noop', () => {});

  /** @type {PeriodicTask[]} */
  const periodics = [
    { id: 'population.migration', every: 'step',       order: 10, systemFn: 'noop' },
    { id: 'skills.progress',      every: 'step',       order: 20, systemFn: 'noop' },
    { id: 'jobs.production',      every: 'quarterDay', order: 10, systemFn: 'noop' },
    { id: 'health.births',        every: 'noon',       order: 10, systemFn: 'noop' },
    { id: 'meal.daily',           every: 'day',        order: 10, systemFn: 'noop' },
    { id: 'forest.regen',         every: '10days',     order: 10, systemFn: 'noop' },
    { id: 'localTaxes',           every: '5days',      order: 10, systemFn: 'noop' },
    { id: 'taxes.monthly',        every: 'month',      order: 10, systemFn: 'noop' },
    { id: 'season.change',        every: 'season',     order: 10, systemFn: 'noop' },
  ];

  return periodics.sort((a, b) => {
    const pa = edgePriority(a.every);
    const pb = edgePriority(b.every);
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
}
