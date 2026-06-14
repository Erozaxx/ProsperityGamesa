/**
 * build command: player queues a new building project.
 * iter-013 M5-1 T2.
 *
 * Design: design_iter-013_T-001.md §2.3, §2.4, M5-D6, M5-D11.
 *
 * G-BUILD-TXAUDIT (M5-D11 / M-4): ctx is not passed to build command (dispatch.js only
 * calls handler(state, params), not handler(state, params, ctx) — arch iter-002 constraint).
 * pay() is called without ctx → emitTx audit is skipped (intentional gap, deferral M5-2/M9).
 * Gold IS correctly deducted; only the tx audit log entry is missing.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay } from '../resources/transactions.js';
import { hasId, byId } from '../catalog/loader.js';
import { scaleCostByCount } from '../balance/formulas.js';
import { effective, effectFromCatalog } from '../systems/buildings.js';
import { BALANCE } from '../balance/balance.js';

const BAL = /** @type {any} */ (BALANCE).buildings;

/**
 * Compute max project queue capacity from builderHut instances and catalog effects.
 * Home.js:84: mason.maxProjectQueue * mason.number (builder hut provides queue slots).
 * effectFromCatalog is the permanent helper for maxProjectQueue/maxActiveProjects: these attrs
 * have no top-level catalog base field and are not aggregated into home.derived, so effective()
 * (baseAttr + modifier fold) returns 0 for them. Per-hut value is read directly from effects[].
 * @param {GameState} state
 * @returns {number}
 */
function getMaxProjectQueue(state) {
  const b = /** @type {any} */ (state.home.buildings['builderHut']);
  if (!b || b.created <= 0) return BAL.maxProjectQueue; // 0 = no builderHut → cannot queue
  // builderHut effect: {attr:'maxProjectQueue', op:'add', value:3}
  const perHut = effectFromCatalog('builderHut', 'maxProjectQueue');
  return perHut * b.created;
}
// NOTE: getMaxActiveProjects is intentionally not defined here — maxActiveProjects enforcement
// happens in buildersProcess (buildings.js), which includes the masonProvided company bonus.
// build.js only enforces the queue length gate (getMaxProjectQueue above).

/**
 * build command handler.
 * params: { itemId: string }
 *
 * Steps (design §2.3):
 * 1. Validate existence (catalog, type === 'buildings')
 * 2. Unlock gate (building.unlocked default true; G-BUILD-UNLOCK: all unlocked until M6 techs)
 * 3. Space gate (G-BUILD-SPACE: simplified — skipped in M5-1, gap)
 * 4. Queue capacity: projectQueue.length < maxProjectQueue
 * 5. Cost = scaleCostByCount(baseCost, totalMade, scaleFactor)
 * 6. canAfford check
 * 7. pay (without ctx — G-BUILD-TXAUDIT, M-4)
 * 8. Push build project to projectQueue
 *
 * @param {GameState} state
 * @param {{ itemId?: unknown }} params
 * @returns {CommandResult}
 */
export function build(state, params) {
  const itemId = params.itemId;

  // 1. Validate existence
  if (typeof itemId !== 'string' || !itemId) {
    return { ok: false, error: 'build: itemId must be a non-empty string' };
  }
  if (!hasId(itemId)) {
    return { ok: false, error: `build: unknown building "${itemId}" (not in catalog)` };
  }
  const entry = /** @type {Record<string, any>} */ (byId(itemId).entry);
  if (byId(itemId).type !== 'buildings') {
    return { ok: false, error: `build: "${itemId}" is not a building (type="${byId(itemId).type}")` };
  }

  // 2. Unlock gate (G-BUILD-UNLOCK: default true in M5-1, all buildings unlocked until M6 techs)
  if (entry.unlocked === false) {
    return { ok: false, error: `build: "${itemId}" is locked` };
  }

  // 3. Space gate (G-BUILD-SPACE: approximated — skipped in M5-1, all space available)
  // TODO M5-2: spaceAvailable(spaceType) >= effective(itemId, spaceType)

  // 4. Queue capacity: projectQueue.length < maxProjectQueue
  const queue = /** @type {any[]} */ (state.home.projectQueue);
  const maxQueue = getMaxProjectQueue(state);
  if (queue.length >= maxQueue) {
    return {
      ok: false,
      error: `build: project queue full (${queue.length}/${maxQueue}). Build a Builder Hut to increase capacity.`,
    };
  }

  // 5. Cost = scaleCostByCount(baseCost, totalMade, scaleFactor)
  const buildings = /** @type {Record<string, any>} */ (state.home.buildings);
  const totalMade = buildings[itemId]?.totalMade ?? 0;
  const baseCost = /** @type {Record<string, number>} */ (entry.baseCost || {});
  const scaleFactor = BAL.costScaleFactor;
  const cost = scaleCostByCount(baseCost, totalMade, scaleFactor);

  // 6. canAfford check
  if (!canAfford(state, cost)) {
    const have = Object.entries(cost)
      .map(([k, n]) => `${k} (need ${n})`)
      .join(', ');
    return { ok: false, error: `build: insufficient resources — ${have}` };
  }

  // 7. pay (G-BUILD-TXAUDIT: no ctx → no emitTx; intentional gap per M-4/DR-013-01 §2.3)
  pay(state, cost, 'build:' + itemId);

  // 8. Push build project to projectQueue
  const h = /** @type {any} */ (state.home);
  h.projectSeq = (h.projectSeq ?? 0) + 1;
  const projectId = `proj_${h.projectSeq}`;

  const maxProgress = /** @type {number} */ (effective(itemId, 'maxProgress', state)) || 1;
  const builders = /** @type {number} */ (effective(itemId, 'builders', state)) || 1;

  /** @type {any} */
  const project = {
    id: projectId,
    type: 'build',
    buildingId: itemId,
    curProgress: 0,
    maxProgress,
    builders,
    cost: {},   // already paid; cost kept as {} (audit copy omitted per G-BUILD-TXAUDIT)
    paid: true,
    removable: true,
    delay: 0,
  };
  queue.push(project);

  return { ok: true };
}

/**
 * Registers the build command into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerBuild(creg) {
  registerCommand(creg, 'build', build);
}
