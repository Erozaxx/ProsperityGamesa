/**
 * Forest regeneration – 10days edge, order 10.
 * Source: forest.js:48-170 (10-day block).
 * Deterministic: RNG via makeRng(state,'forest'), no Date.now/Math.random.
 */

/** @typedef {import('../state/types.js').GameState} GameState */
/** @typedef {import('../state/types.js').TickContext} TickContext */

import { makeRng } from '../engine/rng.js';
import { BALANCE } from '../balance/balance.js';
import { forestArea, forestUsed } from '../balance/formulas.js';
import { logEntry } from '../engine/log.js';

/**
 * Forest regeneration – 10days edge, order 10.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function forestRegen(state, _params, _ctx) {
  const f = state.world.forest;
  if (!f) return;
  const season = state.season.curSeason; // 0=spring,1=summer,2=autumn,3=winter

  // 1. Saplings queue (forest.js:56-88)
  let matured = f.saplings.shift() || 0;
  let newSaplings = f.curTrees * 0.004;
  if (season === 0) {
    // Spring: extra saplings (pollinationService tech M5/M6 → vynechán, gap G-FOREST-TECHMODS)
    if (f.curTrees < 500) {
      newSaplings += 120;
    } else {
      newSaplings += 20;
    }
  }
  f.saplings.push(newSaplings);

  // Health loss: for each sapling reduce by health penalty
  for (let i = 0; i < f.saplings.length; i++) {
    f.saplings[i] -= f.saplings[i] * (100 - f.health) / 5;
  }

  // Cap matured according to area
  const level = state.home.settlementLevel || 0;
  const area = forestArea(level);
  const used = forestUsed(f.curTrees);
  if (area < used + matured + 100) {
    matured = Math.max(0, area - used - 100);
  }
  f.curTrees += Math.floor(matured);

  // 2. Autumn fire risk (forest.js:90-113)
  if (season === 2) {
    f.timeSinceLastFire++;
    if (f.timeSinceLastFire > 23) {
      const rng = makeRng(state, 'forest');
      const risk = Math.pow(f.curTrees / area, 2);
      if (rng.next() < risk) {
        f.curTrees = Math.round(f.curTrees * 0.5);
        f.lastFire = state.engine.curStep;
        logEntry(state, 'Forest fire!');
      }
      f.timeSinceLastFire = 0;
    }
  }

  // 3. Animal regen (forest.js:116-152)
  if (f.curAnimals <= 20) {
    f.consecutiveNoAnimal++;
    if (f.consecutiveNoAnimal > 10 && season === 0) {
      const rng = makeRng(state, 'forest');
      f.consecutiveNoAnimal = 0;
      f.curAnimals += 600 + Math.ceil(rng.next() * 450);
    }
  } else {
    f.curAnimals += Math.ceil(f.curAnimals * 0.0075 + f.curTrees / (f.curAnimals * 10.5 + 20));
    f.consecutiveNoAnimal = 0;
  }
  // Seasonal bonus
  if (season === 0) {
    f.curAnimals += 70;
  } else if (season === 1) {
    f.curAnimals += 30;
  }
  // animalGrowth tech bonus (M6) → 0 in M3 (gap G-FOREST-TECHMODS)

  // Excess cull
  if (f.curAnimals > f.curTrees / 5) {
    const diff = f.curAnimals - f.curTrees / 5;
    f.curAnimals -= Math.floor(diff / 5);
  }
}
