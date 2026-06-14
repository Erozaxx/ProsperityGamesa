/**
 * buyCompany command: purchase/hire a builder company.
 * iter-013 M5-1 T3.
 *
 * Design: design_iter-013_T-001.md §3.1, §3.2 (G-BUILDER-COMPANIES).
 *
 * Semantics (design §3.2):
 *   - houseBuilder companies unlock housing-type builds AND provide additional builder capacity
 *     (buildersProvided) and optional mason capacity (masonProvided, i.e. +maxActiveProjects).
 *   - mineBuilder companies provide builder capacity for mine-type buildings.
 *   - Companies are an optional enhancement: min-hratelné M5 does NOT require firms.
 *
 * G-BUILD-TXAUDIT: same gap as build command — ctx not available in command layer (arch iter-002),
 *   pay() called without ctx, emitTx audit skipped (intentional, deferral M5-2/M9).
 *
 * @module buyCompany
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay } from '../resources/transactions.js';
import { hasCatalog, getCatalog } from '../catalog/index.js';

/**
 * Look up a company entry by id across all company sections (houseBuilder, mineBuilder, explorer).
 * companies.json structure: { companies: { houseBuilder:[...], mineBuilder:[...], explorer:[...] } }
 *
 * @param {string} companyId
 * @returns {{ entry: Record<string, any>, section: string } | null}
 */
function findCompany(companyId) {
  if (!hasCatalog('companies')) return null;
  const cat = /** @type {Record<string, any>} */ (getCatalog('companies'));
  const data = /** @type {Record<string, any[]>} */ (cat.companies ?? cat);
  for (const [section, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      if (entry.id === companyId) {
        return { entry: /** @type {Record<string, any>} */ (entry), section };
      }
    }
  }
  return null;
}

/**
 * buyCompany command handler.
 * params: { companyId: string }
 *
 * Steps:
 * 1. Validate companyId (non-empty string, exists in catalog)
 * 2. Reject if already owned (idempotency guard)
 * 3. Validate cost (entry.cost map)
 * 4. canAfford check
 * 5. pay (G-BUILD-TXAUDIT: no ctx, same gap as build command)
 * 6. Mark company as owned in state.home.ownedCompanies
 *
 * @param {GameState} state
 * @param {{ companyId?: unknown }} params
 * @returns {CommandResult}
 */
export function buyCompany(state, params) {
  const companyId = params.companyId;

  // 1. Validate companyId
  if (typeof companyId !== 'string' || !companyId) {
    return { ok: false, error: 'buyCompany: companyId must be a non-empty string' };
  }

  const found = findCompany(companyId);
  if (!found) {
    return { ok: false, error: `buyCompany: unknown company "${companyId}" (not in catalog)` };
  }
  const { entry } = found;

  // 2. Already owned guard
  const ownedCompanies = /** @type {Record<string, boolean>} */ (
    /** @type {any} */ (state.home).ownedCompanies ?? {}
  );
  if (ownedCompanies[companyId]) {
    return { ok: false, error: `buyCompany: company "${companyId}" is already owned` };
  }

  // 3. Validate cost (must be present and non-empty for purchase)
  const cost = /** @type {Record<string, number> | undefined} */ (entry.cost);
  if (!cost || typeof cost !== 'object' || Object.keys(cost).length === 0) {
    return { ok: false, error: `buyCompany: company "${companyId}" has no cost defined` };
  }
  // NaN guard on cost values
  for (const [k, v] of Object.entries(cost)) {
    if (!Number.isFinite(v) || v < 0) {
      return { ok: false, error: `buyCompany: company "${companyId}" cost.${k} is invalid (${v})` };
    }
  }

  // 4. canAfford check
  if (!canAfford(state, cost)) {
    const have = Object.entries(cost)
      .map(([k, n]) => `${k} (need ${n})`)
      .join(', ');
    return { ok: false, error: `buyCompany: insufficient resources — ${have}` };
  }

  // 5. pay (G-BUILD-TXAUDIT: ctx is not available in command layer per arch iter-002 M-4)
  pay(state, cost, 'buyCompany:' + companyId);

  // 6. Mark as owned
  if (!/** @type {any} */ (state.home).ownedCompanies) {
    /** @type {any} */ (state.home).ownedCompanies = {};
  }
  /** @type {any} */ (state.home).ownedCompanies[companyId] = true;

  return { ok: true };
}

/**
 * Registers the buyCompany command into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerBuyCompany(creg) {
  registerCommand(creg, 'buyCompany', buyCompany);
}

/**
 * Get the total extra builder capacity from all owned companies.
 * Reads buildersProvided from houseBuilder and mineBuilder companies.
 * Called by buildersProcess to supplement the basic builder job count.
 *
 * Design §3.2: firms optionally add to totalBuilders in buildersProcess.
 * provenance: approximated, gap G-BUILDER-CAP (buildersProvided not in original extract).
 *
 * @param {GameState} state
 * @returns {number} total extra builders from owned companies
 */
export function companyBuildersTotal(state) {
  const ownedCompanies = /** @type {Record<string, boolean>} */ (
    /** @type {any} */ (state.home).ownedCompanies ?? {}
  );
  const ownedIds = Object.keys(ownedCompanies).filter((id) => ownedCompanies[id]);
  if (ownedIds.length === 0) return 0;

  if (!hasCatalog('companies')) return 0;
  const cat = /** @type {Record<string, any>} */ (getCatalog('companies'));
  const data = /** @type {Record<string, any[]>} */ (cat.companies ?? cat);

  let total = 0;
  for (const items of Object.values(data)) {
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      if (ownedIds.includes(entry.id)) {
        const bp = typeof entry.buildersProvided === 'number' ? entry.buildersProvided : 0;
        total += bp;
      }
    }
  }
  return total;
}

/**
 * Get the total extra mason capacity (maxActiveProjects bonus) from all owned companies.
 * masonProvided per company → adds to maxActiveProjects in buildersProcess (G-BUILDER-MASON, T4.5).
 * Called by buildersProcess to supplement builderHut-derived maxActiveProjects.
 *
 * Design §3.2: masonProvided from companies = additional active build slots.
 * provenance: approximated, gap G-BUILDER-MASON (masonProvided not in original extract).
 *
 * @param {GameState} state
 * @returns {number} total extra maxActiveProjects from owned companies
 */
export function companyMasonTotal(state) {
  const ownedCompanies = /** @type {Record<string, boolean>} */ (
    /** @type {any} */ (state.home).ownedCompanies ?? {}
  );
  const ownedIds = Object.keys(ownedCompanies).filter((id) => ownedCompanies[id]);
  if (ownedIds.length === 0) return 0;

  if (!hasCatalog('companies')) return 0;
  const cat = /** @type {Record<string, any>} */ (getCatalog('companies'));
  const data = /** @type {Record<string, any[]>} */ (cat.companies ?? cat);

  let total = 0;
  for (const items of Object.values(data)) {
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      if (ownedIds.includes(entry.id)) {
        const mp = typeof entry.masonProvided === 'number' ? entry.masonProvided : 0;
        total += mp;
      }
    }
  }
  return total;
}
