/**
 * Skills progress – step edge, order 20.
 * Source: skills.js:10-28.
 * 2× COMPENSATION (K4 / architecture §4.3): threshold = maxStep * stepCompensation (= maxStep/2).
 * Original Skills.step() ran once per engine step (game.js:18, after World.step).
 * stepCompensation = 0.5 → effMaxStep = maxStep/2 (gap G-SKILL-COMPENSATION, M9 calibration).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { grant } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';

/**
 * Skills progress – step edge, order 20.
 * Runs every step after production/world (original game.js:18 order: Engine→World→Skills).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function skillsProgress(state, _params, ctx) {
  const skillsState = state.home.skills;
  if (!skillsState) return;

  /** @type {Array<any>} */
  const skillDefs = (ctx.catalog && ctx.catalog.skills) ? ctx.catalog.skills : [];

  for (const def of skillDefs) {
    const s = skillsState[def.id];
    if (!s || !s.progressing) continue;

    s.curStep++;

    // 2× compensation: effMaxStep = maxStep * stepCompensation (= maxStep/2)
    // Source: architecture §4.3/§5.5 (K4)
    // Gap: G-SKILL-COMPENSATION – both maxStep and maxStep/2 are valid; M9 calibration decides.
    const stepCompensation = BALANCE.skills ? BALANCE.skills.stepCompensation : 0.5;
    const effMaxStep = (def.maxStep || 50) * stepCompensation;
    s.progPct = Math.min(Math.round(s.curStep * 100 / effMaxStep), 100);

    if (s.curStep > effMaxStep) {
      // Grant products (→ inventory via goods/resource handler)
      // onFull effects (M5/M6 → not implemented, gap G-SKILL-EFFECTS)
      if (def.products && Object.keys(def.products).length > 0) {
        grant(state, def.products, 'skill:' + def.id, ctx, state.engine.curStep);
      }
      s.progressing = false;
      s.curStep = 0;
      s.progPct = 0;
    }
  }
}
