/**
 * buyTech command: purchase/unlock a technology from the tech tree.
 * iter-015 M6 T1.
 *
 * Design: design_iter-015.md §1.4, §2.2 (applyTechModifiers).
 *
 * Semantics:
 *   - Validates techId, catalog existence, prereqs, and cost (techPt via techCap).
 *   - Pays techPt (G-TECH-TXAUDIT: same gap as G-BUILD-TXAUDIT — ctx not in command layer).
 *   - Marks tech as unlocked in state.player.unlockedTechs.
 *   - Calls applyTechModifiers (delta re-derivation): modifiers + recalc aggregates.
 *
 * applyTechModifiers is defined in T2 (buildings.js). Wired here via import to avoid dark code.
 * Tech effects via modifiers are NOT applied until T2 is fully implemented (placeholder call is
 * already correct: applyTechModifiers is imported from buildings.js and does the right thing).
 *
 * G-TECH-TXAUDIT: pay() called without ctx — same class as G-BUILD-TXAUDIT.
 * Deferral: ctx wiring into command layer is M9 / separate iteration.
 *
 * @module buyTech
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, pay } from '../resources/transactions.js';
import { techCap } from '../balance/formulas.js';
import { findTech, applyTechModifiers } from '../systems/buildings.js';

/**
 * buyTech command handler.
 * params: { techId: string }
 *
 * Steps:
 * 1. Validate techId (non-empty string)
 * 2. Lookup tech in catalog (findTech)
 * 3. Already-unlocked guard (idempotency)
 * 4. Validate prereqs (all prereqs ⊆ unlockedTechs)
 * 5. Compute cost = { techPt: techCap(tech.level) }
 * 6. canAfford check
 * 7. pay (G-TECH-TXAUDIT: no ctx, same gap as G-BUILD-TXAUDIT)
 * 8. unlockedTechs[techId] = true
 * 9. applyTechModifiers(state) — delta re-derivation (placeholder T2 fills effects)
 *
 * @param {GameState} state
 * @param {{ techId?: unknown }} params
 * @returns {CommandResult}
 */
export function buyTech(state, params) {
  const techId = params.techId;

  // 1. Validate techId
  if (typeof techId !== 'string' || !techId) {
    return { ok: false, error: 'buyTech: techId must be a non-empty string' };
  }

  // 2. Lookup tech in catalog
  const tech = findTech(techId);
  if (!tech) {
    return { ok: false, error: `buyTech: unknown tech "${techId}" (not in catalog or catalog not loaded)` };
  }

  // 3. Already-unlocked guard (idempotency)
  const unlockedTechs = /** @type {Record<string, boolean>} */ (
    /** @type {any} */ (state.player).unlockedTechs ?? {}
  );
  if (unlockedTechs[techId]) {
    return { ok: false, error: `buyTech: tech "${techId}" is already unlocked` };
  }

  // 4. Validate prereqs (all prereqs must be in unlockedTechs)
  const prereqs = Array.isArray(tech.prereqs) ? /** @type {string[]} */ (tech.prereqs) : [];
  for (const prereq of prereqs) {
    if (!unlockedTechs[prereq]) {
      return { ok: false, error: `buyTech: prereq missing: "${prereq}" (must unlock first)` };
    }
  }

  // 5. Compute cost — techCap(tech.level) techPt (design §1.2, M6-D1)
  const level = typeof tech.level === 'number' ? tech.level : 0;
  const cost = { techPt: techCap(level) };

  // 6. canAfford check
  if (!canAfford(state, cost)) {
    return {
      ok: false,
      error: `buyTech: insufficient techPt — need ${cost.techPt}, have ${/** @type {any} */ (state.player).techPt ?? 0}`,
    };
  }

  // 7. pay (G-TECH-TXAUDIT: ctx not available in command layer per arch iter-002 M-4)
  pay(state, cost, 'tech:' + techId);

  // 8. Mark as unlocked
  /** @type {any} */ (state.player).unlockedTechs[techId] = true;

  // 9. Apply tech modifiers (delta re-derivation: removeAllTechSourced + addTech + invalidate + recalc)
  //    T2 placeholder note: applyTechModifiers is already fully implemented in buildings.js.
  //    In T1 with 0 built buildings/structures, it is effectively a no-op on home.derived.
  //    Actual effective() change requires ≥1 built building of the targeted type (§2.7 design).
  applyTechModifiers(state);

  return { ok: true };
}

/**
 * Registers the buyTech command into a command registry.
 * @param {CommandRegistry} creg
 */
export function registerBuyTech(creg) {
  registerCommand(creg, 'buyTech', buyTech);
}
