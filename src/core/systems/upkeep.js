/**
 * Military upkeep system (month edge).
 * Source: home.js:767-782. iter-010 M4a.
 * gap G-BUILDING-UPKEEP (M5): building upkeep (taxCenter/cityGuardHQ/hospital/inn) not yet implemented.
 */
import { pay, canAfford } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';
import { militaryUpkeep } from '../balance/formulas.js';
import { logEntry } from '../engine/log.js';

/**
 * upkeep.military – month edge, order 30. Source: home.js:770-782.
 * @param {object} state
 * @param {object} _params
 * @param {object} ctx
 */
export function upkeepMilitary(state, _params, ctx) {
  const w = state.player.totWarriors || 0;
  const a = state.player.totArchers || 0;
  const amt = militaryUpkeep(w, a, BALANCE.army.warriorUpkeep, BALANCE.army.archerUpkeep);
  if (amt <= 0) {
    state.home.notEnoughMilitaryFunding = false;
    return;
  }
  if (canAfford(state, { gold: amt })) {
    pay(state, { gold: amt }, 'upkeep:military', ctx, state.engine.curStep);
    state.home.notEnoughMilitaryFunding = false;
  } else {
    // Originál: no payment, only flag (home.js:780). Do NOT throw.
    state.home.notEnoughMilitaryFunding = true;
    logEntry(state, 'Nedostatek financí na vojsko');
  }
}
