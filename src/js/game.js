// Čistá herní logika – žádný DOM. Snadno testovatelné a vyměnitelné.

import { GENERATORS, CLICK_VALUE } from './state.js';

const GENERATOR_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));

// Cena dalšího kusu daného generátoru při aktuálním počtu vlastněných.
export function generatorCost(generator, owned) {
  return Math.ceil(generator.baseCost * Math.pow(generator.costGrowth, owned));
}

// Celková produkce 💰/s ze všech vlastněných generátorů.
export function productionPerSecond(state) {
  return GENERATORS.reduce((sum, g) => {
    const count = state.owned[g.id] || 0;
    return sum + count * g.baseProduction;
  }, 0);
}

// Ruční výdělek kliknutím.
export function work(state) {
  state.money += CLICK_VALUE;
  state.totalEarned += CLICK_VALUE;
  return state;
}

// Pokus o koupi jednoho kusu generátoru. Vrací true při úspěchu.
export function buyGenerator(state, generatorId) {
  const generator = GENERATOR_BY_ID[generatorId];
  if (!generator) return false;

  const owned = state.owned[generatorId] || 0;
  const cost = generatorCost(generator, owned);
  if (state.money < cost) return false;

  state.money -= cost;
  state.owned[generatorId] = owned + 1;
  return true;
}

// Posun herního času o `seconds` sekund (sdíleno aktivním tickem i offline progresem).
export function advance(state, seconds) {
  const earned = productionPerSecond(state) * seconds;
  state.money += earned;
  state.totalEarned += earned;
  return earned;
}
