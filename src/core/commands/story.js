/**
 * Story commands: acknowledgeEvent.
 * iter-019 M8 T1.
 * Anti-dark-code B1: registered in bootstrapEngine, not inline.
 * G-STORY-CTXGAP: effects queued to pendingEffects (Var A) — no ctx in command layer.
 */
import { registerCommand } from './dispatch.js';
import { getCatalog, hasCatalog } from '../catalog/index.js';

/**
 * acknowledgeEvent command.
 * params: { optionIndex?: number }
 * @param {import('../state/types.js').GameState} state
 * @param {{ optionIndex?: unknown }} params
 * @returns {{ ok: boolean, error?: string }}
 */
export function acknowledgeEvent(state, params) {
  const s = /** @type {any} */ (state);
  if (!s.story.event) {
    return { ok: false, error: 'acknowledgeEvent: no active event' };
  }

  const eventId = s.story.event.id;
  // Get catalog
  let def = null;
  if (s._storyCatalog) {
    def = s._storyCatalog.events?.[eventId];
  }
  if (!def && hasCatalog('story')) {
    const cat = /** @type {any} */ (getCatalog('story'));
    def = cat.events?.[eventId];
  }
  if (!def) {
    // Unknown event ID — still unblock engine (defensive)
    s.story.event = null;
    if (s.story.queue.length === 0) {
      s.engine.running = true;
    } else {
      const nextId = s.story.queue.shift();
      s.story.event = { id: nextId, acked: false };
    }
    return { ok: false, error: `acknowledgeEvent: event def not found for "${eventId}"` };
  }

  const optionIndex = typeof params.optionIndex === 'number' ? params.optionIndex : 0;
  const opt = def.options?.[optionIndex];
  if (!opt) {
    return { ok: false, error: `acknowledgeEvent: invalid optionIndex ${optionIndex}` };
  }

  // 1. Queue effects of chosen option (Var A: pendingEffects applied next step)
  if (opt.effects && opt.effects.length > 0) {
    for (const eff of opt.effects) {
      s.story.pendingEffects.push(eff);
    }
  }

  // 2. Unload current event
  s.story.event = null;

  // 3. Handle chaining (next)
  if (opt.next) {
    s.story.queue.unshift(opt.next);
  }

  // 4. Resume or next from queue
  if (s.story.queue.length > 0) {
    const nextId = s.story.queue.shift();
    // Load next event — stay engine-stopped
    s.story.event = { id: nextId, acked: false };
    // Don't resume engine — next event keeps it stopped
  } else {
    // Resume engine
    s.engine.running = true;
  }

  return { ok: true };
}

/**
 * Registers story commands into a command registry.
 * @param {import('./dispatch.js').CommandRegistry} creg
 */
export function registerStoryCommands(creg) {
  registerCommand(creg, 'acknowledgeEvent', acknowledgeEvent);
}
