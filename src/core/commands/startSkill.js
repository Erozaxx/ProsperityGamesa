/**
 * startSkill command: begin progressing a skill slot.
 * Source intent: skills.js:startSkill (home.js:2200-2220).
 * Cost payment (M5) → not implemented in M3 (gap G-SKILL-COST-M5).
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { hasCatalog, getCatalog } from '../catalog/index.js';

/**
 * Look up a skill definition by id.
 * @param {string} skillId
 * @returns {Record<string, any> | null}
 */
function findSkillDef(skillId) {
  if (!hasCatalog('skills')) return null;
  const cat = /** @type {any} */ (getCatalog('skills'));
  const skills = Array.isArray(cat.skills) ? cat.skills : [];
  return skills.find((/** @type {any} */ s) => s.id === skillId) ?? null;
}

/**
 * startSkill command handler.
 * params: { skillId: string }
 * Starts a skill slot progressing (sets progressing=true, resets curStep/progPct if not already in progress).
 * Returns ok:false if skill is already progressing or unknown.
 * @param {GameState} state
 * @param {{ skillId?: unknown }} params
 * @returns {CommandResult}
 */
export function startSkill(state, params) {
  const skillId = params.skillId;

  if (typeof skillId !== 'string' || !skillId) {
    return { ok: false, error: 'startSkill: skillId must be a non-empty string' };
  }

  // Look up skill definition (optional catalog validation)
  const def = findSkillDef(skillId);
  // If skills catalog is not loaded, allow any skillId (graceful degradation)
  if (hasCatalog('skills') && !def) {
    return { ok: false, error: `startSkill: unknown skill "${skillId}"` };
  }

  // Ensure skills state exists
  if (!state.home.skills) state.home.skills = {};

  const skillState = state.home.skills[skillId];

  // If already progressing, return error
  if (skillState && skillState.progressing) {
    return { ok: false, error: `startSkill: skill "${skillId}" is already in progress` };
  }

  // Start or reset skill progress
  state.home.skills[skillId] = {
    progressing: true,
    curStep: skillState ? (skillState.curStep || 0) : 0,
    progPct: skillState ? (skillState.progPct || 0) : 0,
  };

  return { ok: true };
}

/**
 * Registers startSkill into a command registry.
 * @param {CommandRegistry} creg
 * @returns {void}
 */
export function registerStartSkill(creg) {
  registerCommand(creg, 'startSkill', startSkill);
}
