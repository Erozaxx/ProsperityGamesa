/**
 * Achievement evaluator system — T3 (K18, C4 fix).
 * iter-019 M8 T3.
 *
 * Design: design_iter-019.md §6.
 *
 * C4 invariant: `state.achievements.unlocked[id]` is ONLY written in `unlockAchievement`.
 * No imperative hooks anywhere else in the codebase.
 *
 * Periodik: every:'day', order:95 (after story.check order:90 so event rewards propagate first).
 */

import { evalPredicate } from './predicate.js';
import { resolve } from '../registry/registry.js';
import { logEntry } from '../engine/log.js';

/**
 * Central achievement evaluator.
 * Runs every day (order 95, after story.check).
 * Evaluates all achievement `when` predicates; unlocks any that are newly satisfied.
 *
 * @param {import('../state/types.js').GameState} state
 * @param {object} _params
 * @param {import('../state/types.js').TickContext} ctx
 * @returns {void}
 */
export function achievementsEval(state, _params, ctx) {
  const catalog = ctx.catalog && /** @type {any} */ (ctx.catalog).achievements;
  if (!catalog || !Array.isArray(catalog.achievements)) return;

  const unlocked = /** @type {any} */ (state).achievements.unlocked;

  for (const def of catalog.achievements) {
    if (!def.id) continue;
    if (unlocked[def.id]) continue;      // already unlocked — idempotence
    if (!def.when) continue;             // no predicate defined
    if (evalPredicate(def.when, state)) {
      unlockAchievement(state, ctx, def.id);
    }
  }
}

/**
 * Unlock a single achievement by ID.
 *
 * C4 INVARIANT: This is the ONLY place that writes `state.achievements.unlocked[id] = true`.
 * Do NOT write `unlocked[id]` anywhere else — grep gate enforces this.
 *
 * @param {import('../state/types.js').GameState} state
 * @param {import('../state/types.js').TickContext} ctx
 * @param {string} id
 * @returns {void}
 */
export function unlockAchievement(state, ctx, id) {
  const s = /** @type {any} */ (state);

  // Guard: do not re-unlock (idempotence)
  if (s.achievements.unlocked[id]) return;

  // The single authoritative write (C4 grep gate target)
  s.achievements.unlocked[id] = true;

  // Log to ring buffer (deterministic, persist — step-based, not wall-clock)
  logEntry(state, `achievement:${id}`);

  // Emit ephemeral UI event (outside state — T4 bus, optional)
  ctx.emitEvent?.({ type: 'achievementUnlocked', id });

  // Apply optional K14 onUnlock effects (e.g. unlockMap, grantResource)
  const catalog = ctx.catalog && /** @type {any} */ (ctx.catalog).achievements;
  if (catalog && Array.isArray(catalog.achievements)) {
    const def = catalog.achievements.find((/** @type {any} */ a) => a.id === id);
    if (def && Array.isArray(def.onUnlock) && def.onUnlock.length > 0) {
      for (const eff of def.onUnlock) {
        try {
          const fn = resolve(ctx.registry, eff.effect);
          fn(state, eff.params ?? {}, ctx);
        } catch (_e) {
          // non-fatal: unknown effect — log but continue
        }
      }
    }
  }
}
