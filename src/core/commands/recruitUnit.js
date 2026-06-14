/**
 * recruitUnit command: recruit warriors or archers for the player.
 * iter-016 M7a-1 T4.
 *
 * Design: design_iter-016.md §5.2 (T4 jednostky).
 * Cost from military.json (warrior goldCost 1080, archer goldCost 1620); BALANCE.army mirrors these.
 * Reuses existing player.totWarriors/totArchers (createHomeState.js:71) and upkeep.military (upkeep.js).
 *
 * Gap G-RECRUIT-TXAUDIT: pay() called without ctx (same gap as build/buyCompany commands,
 *   DR-013-01 M-4 / arch iter-002 — intentional, audit M9).
 *
 * @module recruitUnit
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay } from '../resources/transactions.js';
import { hasCatalog, getCatalog } from '../catalog/index.js';
import { BALANCE } from '../balance/balance.js';

/**
 * Look up a unit entry by id in military.json catalog.
 * military.json structure: { military: [{ id, goldCost, upkeep, name }, ...] }
 *
 * Falls back to BALANCE.army when catalog not loaded (tests / offline).
 *
 * @param {string} unitId  'warrior' | 'archer'
 * @returns {{ id: string, goldCost: number } | null}
 */
function findUnit(unitId) {
  if (hasCatalog('military')) {
    const cat = /** @type {Record<string, any>} */ (getCatalog('military'));
    const items = /** @type {any[]} */ (Array.isArray(cat.military) ? cat.military : []);
    const entry = items.find((u) => u.id === unitId);
    if (entry && typeof entry.goldCost === 'number') return entry;
  }

  // Fallback: BALANCE.army (same extracted values, same provenance)
  if (unitId === 'warrior') return { id: 'warrior', goldCost: BALANCE.army.warriorCost };
  if (unitId === 'archer')  return { id: 'archer',  goldCost: BALANCE.army.archerCost  };
  return null;
}

/**
 * recruitUnit command handler.
 * params: { unitType: 'warrior' | 'archer', count?: number }
 *   count defaults to 1 when omitted.
 *
 * Steps:
 * 1. Validate unitType (non-empty string, known in catalog/balance)
 * 2. Validate count (positive integer, finite)
 * 3. Compute gold cost = entry.goldCost * count
 * 4. canAfford check
 * 5. pay (G-RECRUIT-TXAUDIT: no ctx, same gap as build/buyCompany)
 * 6. Increment player.totWarriors or player.totArchers
 *
 * @param {GameState} state
 * @param {{ unitType?: unknown, count?: unknown }} params
 * @returns {CommandResult}
 */
export function recruitUnit(state, params) {
  const unitType = params.unitType;

  // 1. Validate unitType
  if (typeof unitType !== 'string' || !unitType) {
    return { ok: false, error: 'recruitUnit: unitType must be a non-empty string ("warrior" or "archer")' };
  }

  const entry = findUnit(unitType);
  if (!entry) {
    return { ok: false, error: `recruitUnit: unknown unitType "${unitType}" (not in military catalog)` };
  }

  // 2. Validate count
  const rawCount = params.count !== undefined ? params.count : 1;
  const count = Number(rawCount);
  if (!Number.isInteger(count) || count <= 0) {
    return { ok: false, error: `recruitUnit: count must be a positive integer, got ${rawCount}` };
  }

  // 3. Gold cost
  const goldCost = entry.goldCost * count;
  if (!Number.isFinite(goldCost) || goldCost < 0) {
    return { ok: false, error: `recruitUnit: computed gold cost is invalid (${goldCost})` };
  }

  // 4. canAfford
  if (!canAfford(state, { gold: goldCost })) {
    return {
      ok: false,
      error: `recruitUnit: insufficient gold — need ${goldCost}, have ${state.player.gold}`,
    };
  }

  // 5. pay (G-RECRUIT-TXAUDIT: ctx not available in command layer per arch iter-002 M-4)
  pay(state, { gold: goldCost }, 'recruit:' + unitType);

  // 6. Increment player unit count (totWarriors/totArchers from createHomeState.js:71)
  if (unitType === 'warrior') {
    state.player.totWarriors = (state.player.totWarriors || 0) + count;
  } else {
    state.player.totArchers = (state.player.totArchers || 0) + count;
  }

  return { ok: true };
}

/**
 * Registers the recruitUnit command into a command registry.
 * Called from bootstrapEngine (main.js) — anti-dark-code (B1 lesson).
 * @param {CommandRegistry} creg
 */
export function registerRecruitUnit(creg) {
  registerCommand(creg, 'recruitUnit', recruitUnit);
}
