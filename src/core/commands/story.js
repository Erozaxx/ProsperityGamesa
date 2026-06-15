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
 * Advance the current tutorial to the next step.
 * If the last step is reached, the tutorial is completed and moved to done.
 * params: { tutorialId?: string } — if provided, only advances if curId matches.
 * T2 (iter-019 M8).
 * @param {import('../state/types.js').GameState} state
 * @param {{ tutorialId?: unknown }} params
 * @returns {{ ok: boolean, error?: string }}
 */
export function advanceTutorial(state, params) {
  const s = /** @type {any} */ (state);
  if (!s.story || !s.story.tutorials) {
    return { ok: false, error: 'advanceTutorial: no tutorial state' };
  }
  const t = s.story.tutorials;
  if (!t.curId) {
    return { ok: false, error: 'advanceTutorial: no active tutorial' };
  }

  // Optional guard: only advance if tutorialId matches
  if (params.tutorialId !== undefined && params.tutorialId !== t.curId) {
    return { ok: false, error: 'advanceTutorial: tutorialId mismatch' };
  }

  // Find the tutorial from state (tutorials catalog not in command layer — count steps via state)
  // We need to know the total steps to decide completion. Use the tutorials catalog if available.
  let totalSteps = null;
  if (hasCatalog('tutorials')) {
    const cat = /** @type {any} */ (getCatalog('tutorials'));
    const tutorials = Array.isArray(cat.tutorials) ? cat.tutorials : [];
    const def = tutorials.find((/** @type {any} */ tut) => tut.id === t.curId);
    if (def && Array.isArray(def.steps)) {
      totalSteps = def.steps.length;
    }
  }

  const nextStep = t.curStep + 1;
  if (totalSteps !== null && nextStep >= totalSteps) {
    // Tutorial complete
    if (!t.done) t.done = {};
    t.done[t.curId] = true;
    t.curId = null;
    t.curStep = 0;
  } else {
    t.curStep = nextStep;
  }

  return { ok: true };
}

/**
 * Dismiss the current tutorial immediately (marks it done).
 * T2 (iter-019 M8).
 * @param {import('../state/types.js').GameState} state
 * @param {object} _params
 * @returns {{ ok: boolean, error?: string }}
 */
export function dismissTutorial(state, _params) {
  const s = /** @type {any} */ (state);
  if (!s.story || !s.story.tutorials) {
    return { ok: false, error: 'dismissTutorial: no tutorial state' };
  }
  const t = s.story.tutorials;
  if (!t.curId) {
    return { ok: false, error: 'dismissTutorial: no active tutorial' };
  }

  if (!t.done) t.done = {};
  t.done[t.curId] = true;
  t.curId = null;
  t.curStep = 0;

  return { ok: true };
}

/**
 * Registers story commands into a command registry.
 * @param {import('./dispatch.js').CommandRegistry} creg
 */
export function registerStoryCommands(creg) {
  registerCommand(creg, 'acknowledgeEvent', acknowledgeEvent);
  // iter-019 M8 T2: tutorial commands
  registerCommand(creg, 'advanceTutorial', advanceTutorial);
  registerCommand(creg, 'dismissTutorial', dismissTutorial);
}
