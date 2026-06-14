/**
 * Contract commands: acceptContract, rejectContract, completeContract.
 * iter-014 M5-2 T5.
 *
 * Design: design_iter-014.md §6.1, M52-D6.
 *
 * G-BUILD-TXAUDIT: ctx není dostupný v command vrstvě (dispatch.js volá handler(state,params)).
 * pay/grant volány bez ctx → emitTx audit skip (stejné rozhodnutí jako M5-1 build/buyCompany).
 * Completion přes exportovanou applyContractComplete (import, ne runtime registry — §6.1).
 *
 * @module contracts-commands
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford } from '../resources/transactions.js';
import { scheduleInsert } from '../engine/scheduler.js';
import { byId, hasCatalog } from '../catalog/loader.js';
import {
  findContract,
  removeContract,
  applyContractComplete,
} from '../systems/contracts.js';
import { BALANCE } from '../balance/balance.js';

const STEPSPERDAY = BALANCE.engine.stepsPerDay;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get expirationDays for a contract type from the catalog.
 * Graceful fallback to 15 days if catalog not loaded or type not found.
 * @param {string} type
 * @returns {number}
 */
function getExpirationDaysForType(type) {
  try {
    if (!hasCatalog('contracts')) return 15;
    const entry = /** @type {any} */ (byId(type).entry);
    return typeof entry.expirationDays === 'number' ? entry.expirationDays : 15;
  } catch (_) {
    return 15; // graceful fallback
  }
}

// ---------------------------------------------------------------------------
// acceptContract
// ---------------------------------------------------------------------------

/**
 * acceptContract command handler.
 * params: { contractId: string }
 *
 * Transitions 'offered' → 'active'.
 * Sets deadlineStep = curStep + expirationDays * STEPSPERDAY.
 * Schedules contract.expire at deadlineStep (K17, M52-D4).
 *
 * @param {GameState} state
 * @param {{ contractId?: unknown }} params
 * @returns {CommandResult}
 */
export function acceptContract(state, params) {
  const contractId = params.contractId;
  if (typeof contractId !== 'string' || !contractId) {
    return { ok: false, error: 'acceptContract: contractId must be a non-empty string' };
  }
  const c = findContract(state, contractId);
  if (!c) {
    return { ok: false, error: `acceptContract: contract "${contractId}" not found` };
  }
  if (c.status !== 'offered') {
    return { ok: false, error: `acceptContract: contract "${contractId}" is not in offered status (status=${c.status})` };
  }

  const expirationDays = getExpirationDaysForType(c.type);
  c.status = 'active';
  c.deadlineStep = state.engine.curStep + expirationDays * STEPSPERDAY;

  // Schedule one-shot expiration at absolute deadlineStep (M52-D4, K17)
  scheduleInsert(state, c.deadlineStep, 'contract.expire', { contractId: c.id });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// rejectContract
// ---------------------------------------------------------------------------

/**
 * rejectContract command handler.
 * params: { contractId: string }
 *
 * Transitions 'offered'|'active' → 'rejected', fires onReject (noop for min. sada), removes.
 * §4.2 design.
 *
 * @param {GameState} state
 * @param {{ contractId?: unknown }} params
 * @returns {CommandResult}
 */
export function rejectContract(state, params) {
  const contractId = params.contractId;
  if (typeof contractId !== 'string' || !contractId) {
    return { ok: false, error: 'rejectContract: contractId must be a non-empty string' };
  }
  const c = findContract(state, contractId);
  if (!c) {
    return { ok: false, error: `rejectContract: contract "${contractId}" not found` };
  }
  if (c.status !== 'offered' && c.status !== 'active') {
    return { ok: false, error: `rejectContract: contract "${contractId}" cannot be rejected (status=${c.status})` };
  }

  c.status = 'rejected';
  // onReject efekt: min. sada = 'noop'. Command nemá ctx/registry → marker jen v datech (K14).
  // Speciální onReject efekty pro M6+ typy by potřebovaly ctx — viz §6.1 design.
  removeContract(state, c.id);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// completeContract
// ---------------------------------------------------------------------------

/**
 * completeContract command handler.
 * params: { contractId: string }
 *
 * Guard: status==='active' && canAfford(cost).
 * Volá applyContractComplete (pay cost + grant reward) přes přímý import (ne registry).
 * home.js:2455 ekvivalent.
 *
 * @param {GameState} state
 * @param {{ contractId?: unknown }} params
 * @returns {CommandResult}
 */
export function completeContract(state, params) {
  const contractId = params.contractId;
  if (typeof contractId !== 'string' || !contractId) {
    return { ok: false, error: 'completeContract: contractId must be a non-empty string' };
  }
  const c = findContract(state, contractId);
  if (!c) {
    return { ok: false, error: `completeContract: contract "${contractId}" not found` };
  }
  if (c.status !== 'active') {
    return { ok: false, error: `completeContract: contract "${contractId}" is not active (status=${c.status})` };
  }
  if (!canAfford(state, c.cost)) {
    const insufficient = Object.entries(/** @type {Record<string, number>} */ (c.cost))
      .map(([k, n]) => `${k} (need ${n})`)
      .join(', ');
    return { ok: false, error: `completeContract: insufficient resources — ${insufficient}` };
  }

  // Atomic: canAfford checked above; applyContractComplete also guards via pay internals
  applyContractComplete(state, c);
  c.status = 'completed';
  removeContract(state, c.id);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers contract commands into a command registry.
 * Volat z bootstrapEngine za registerBuyCompany (§14.1 B1).
 * @param {CommandRegistry} creg
 * @returns {void}
 */
export function registerContractCommands(creg) {
  registerCommand(creg, 'acceptContract', acceptContract);
  registerCommand(creg, 'rejectContract', rejectContract);
  registerCommand(creg, 'completeContract', completeContract);
}
