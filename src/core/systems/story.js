/**
 * Story system: importantEvent trigger checking, loading, and effect application.
 * iter-019 M8 T1.
 * Design: design_iter-019.md §3.
 */
import { evalPredicate } from './predicate.js';
import { resolve } from '../registry/registry.js';
import { logEntry } from '../engine/log.js';

/**
 * Check story event triggers and load the first matching, unfired event.
 * Periodik: every:'day', order:90.
 * @param {import('../state/types.js').GameState} state
 * @param {object} params
 * @param {import('../state/types.js').TickContext} ctx
 */
export function storyCheck(state, params, ctx) {
  const s = /** @type {any} */ (state);
  // If an event is already active, don't trigger more inline
  if (s.story.event) return;

  const catalog = ctx.catalog && ctx.catalog.story;
  if (!catalog || !catalog.events) return;

  for (const [id, def] of Object.entries(catalog.events)) {
    // Skip already-used events (idempotence)
    if (s.story.used[id]) continue;
    // Skip events with null/undefined triggers (chained events, no standalone trigger)
    if (!def.trigger) continue;
    // calendar:every:year is checked via edge detection
    if (def.trigger.kind === 'calendar' && def.trigger.every === 'year') {
      // Only fire on year edge - check via ctx.catalog.storyEdges or use state.season
      // We need to know if it's a year edge - this is called from tickOrder day edge
      // "survivedWinter" fires on year edge - we approximate: fire when curYear changes
      // Check if curYear >= 2 (year 2 means we completed year 1)
      if ((s.season.curYear || 1) < 2) continue;
      // Additional check: only on year edge (isNewYear) - but storyCheck is on 'day' edge
      // We can't access edges here directly; we use a flag to track years
      // Actually: evalPredicate for calendar returns false, so we need special handling
      // Use: fire only when season.curYear >= 2 AND last year we fired it was different
      // Simple: check flag 'survivedWinter_year' in used
      const yearKey = `calendar_year_${s.season.curYear}`;
      if (s.story.used[yearKey]) continue;
      // Only fire on day 1 of year (curDay would have reset) — approximation:
      // storyCheck runs every day; fire survivedWinter once per year when year >= 2
      // Mark this year as checked
      s.story.used[yearKey] = true;
    } else if (def.trigger.kind === 'calendar') {
      continue; // other calendar kinds not supported yet
    } else if (!evalPredicate(def.trigger, state)) {
      continue;
    }
    loadStoryEvent(state, ctx, id);
    return; // only one event per check
  }
}

/**
 * Load a story event: mark used, apply onShow effects (to pendingEffects), set engine-stopping state.
 * @param {import('../state/types.js').GameState} state
 * @param {import('../state/types.js').TickContext} ctx
 * @param {string} id
 */
export function loadStoryEvent(state, ctx, id) {
  const s = /** @type {any} */ (state);
  const catalog = ctx.catalog && ctx.catalog.story;
  if (!catalog || !catalog.events) return;
  const def = catalog.events[id];
  if (!def) return;

  // Mark as used (idempotence)
  s.story.used[id] = true;

  // Queue onShow effects for pending application (Var A: no ctx in command layer)
  if (def.onShow && def.onShow.length > 0) {
    for (const eff of def.onShow) {
      s.story.pendingEffects.push(eff);
    }
  }

  if (def.stopsEngine !== false) {
    if (s.story.event) {
      // Already have an active event - enqueue
      s.story.queue.push(id);
      return;
    }
    s.story.event = { id, acked: false };
    s.engine.running = false; // ENGINE-STOPPING
    ctx.emitEvent?.({ type: 'storyEventShown', id });
  }

  logEntry(state, `story:${id}`);
}

/**
 * Apply pending story effects (from pendingEffects queue).
 * Periodik: every:'step', order:5.
 * @param {import('../state/types.js').GameState} state
 * @param {object} params
 * @param {import('../state/types.js').TickContext} ctx
 */
export function storyApplyEffects(state, params, ctx) {
  const s = /** @type {any} */ (state);
  if (!s.story.pendingEffects || s.story.pendingEffects.length === 0) return;

  const effects = s.story.pendingEffects.splice(0);
  for (const eff of effects) {
    try {
      const fn = resolve(ctx.registry, eff.effect);
      fn(state, eff.params ?? {}, ctx);
    } catch (_e) {
      // non-fatal: effect may not be registered yet
    }
  }
}
