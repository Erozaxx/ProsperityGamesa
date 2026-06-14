/**
 * Quest commands: acceptQuest, rejectQuest.
 * iter-017 M7a-2 T3.
 *
 * Design: design_iter-017.md §5.3.
 *
 * G-BUILD-TXAUDIT: ctx není dostupný v command vrstvě (dispatch.js volá handler(state,params)).
 * pay/grant volány bez ctx (stejné rozhodnutí jako contracts, build commands).
 *
 * @module quests-commands
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('./dispatch.js').CommandRegistry} CommandRegistry
 * @typedef {import('./dispatch.js').CommandResult} CommandResult
 */

import { registerCommand } from './dispatch.js';
import { canAfford, grant } from '../resources/transactions.js';
import { findQuest, removeQuest } from '../systems/world.js';
import { BALANCE } from '../balance/balance.js';

// ---------------------------------------------------------------------------
// acceptQuest
// ---------------------------------------------------------------------------

/**
 * acceptQuest command handler.
 * params: { questId: string }
 *
 * Validates quest exists and player can afford req (warriors/archers).
 * Fulfills req by deducting player.totWarriors/totArchers.
 * Grants reward (gold + zone.favour.player).
 * Removes quest from world.quests and clears zone.curQuest.
 *
 * @param {GameState} state
 * @param {{ questId?: unknown }} params
 * @returns {CommandResult}
 */
export function acceptQuest(state, params) {
  const questId = params.questId;
  if (typeof questId !== 'string' || !questId) {
    return { ok: false, error: 'acceptQuest: questId must be a non-empty string' };
  }

  const q = findQuest(state, questId);
  if (!q) {
    return { ok: false, error: `acceptQuest: quest "${questId}" not found` };
  }

  // Validate from-zone still exists (not required to have player as liege — quest can be from any zone)
  const zones = /** @type {any[]} */ (state.world.zones || []);
  const fromZone = zones.find((/** @type {any} */ z) => z.id === q.from);
  if (!fromZone) {
    return { ok: false, error: `acceptQuest: from-zone "${q.from}" not found` };
  }

  const s = /** @type {any} */ (state);

  // Build cost from req (warriors/archers come from player.totWarriors/totArchers)
  const req = q.req || {};
  const neededWarriors = req.warriors || 0;
  const neededArchers  = req.archers  || 0;

  if (neededWarriors > 0 && (s.player.totWarriors || 0) < neededWarriors) {
    return {
      ok: false,
      error: `acceptQuest: insufficient warriors — need ${neededWarriors}, have ${s.player.totWarriors || 0}`,
    };
  }
  if (neededArchers > 0 && (s.player.totArchers || 0) < neededArchers) {
    return {
      ok: false,
      error: `acceptQuest: insufficient archers — need ${neededArchers}, have ${s.player.totArchers || 0}`,
    };
  }

  // canAfford gold cost if any
  const goldReq = req.gold || 0;
  if (goldReq > 0 && !canAfford(state, { gold: goldReq })) {
    return {
      ok: false,
      error: `acceptQuest: insufficient gold — need ${goldReq}, have ${s.player.gold}`,
    };
  }

  // Deduct warriors/archers (reverse of recruitUnit)
  if (neededWarriors > 0) {
    s.player.totWarriors = (s.player.totWarriors || 0) - neededWarriors;
  }
  if (neededArchers > 0) {
    s.player.totArchers = (s.player.totArchers || 0) - neededArchers;
  }

  // Deduct gold req if any (G-QUEST-TXAUDIT: no ctx, same gap as build/contracts)
  if (goldReq > 0) {
    s.player.gold = (s.player.gold || 0) - goldReq;
  }

  // Grant reward
  const reward = q.reward || {};
  if (reward.gold && reward.gold > 0) {
    grant(state, { gold: reward.gold }, 'quest:reward:' + questId);
  }

  // Grant favour to zone
  if (reward.favour && reward.favour > 0) {
    if (!fromZone.favour || typeof fromZone.favour !== 'object') fromZone.favour = {};
    fromZone.favour.player = (fromZone.favour.player || 0) + reward.favour;
    // Clamp to limits (BALANCE.world.favourLimits)
    const { min: favMin, max: favMax } = BALANCE.world.favourLimits;
    if (fromZone.favour.player > favMax) fromZone.favour.player = favMax;
    if (fromZone.favour.player < favMin) fromZone.favour.player = favMin;
  }

  // Remove quest
  removeQuest(state, questId);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// rejectQuest
// ---------------------------------------------------------------------------

/**
 * rejectQuest command handler.
 * params: { questId: string }
 *
 * Removes quest from world.quests, clears zone.curQuest.
 * No penalty (min. sada, §5.3).
 *
 * @param {GameState} state
 * @param {{ questId?: unknown }} params
 * @returns {CommandResult}
 */
export function rejectQuest(state, params) {
  const questId = params.questId;
  if (typeof questId !== 'string' || !questId) {
    return { ok: false, error: 'rejectQuest: questId must be a non-empty string' };
  }

  const q = findQuest(state, questId);
  if (!q) {
    return { ok: false, error: `rejectQuest: quest "${questId}" not found` };
  }

  removeQuest(state, questId);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers quest commands into a command registry.
 * Volat z bootstrapEngine (anti-dark-code B1, §5.3 design).
 * @param {CommandRegistry} creg
 * @returns {void}
 */
export function registerQuestCommands(creg) {
  registerCommand(creg, 'acceptQuest', acceptQuest);
  registerCommand(creg, 'rejectQuest', rejectQuest);
}
