/**
 * AC3 supplement: prove the sanity cap genuinely holds under explosive growth.
 * Seed a near-cap / high-growth scenario and run long; population must clamp at sanityMaxPop,
 * not the pre-fix 50->~8749/year explosion, and never go negative/NaN.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialState } from '../../../../src/core/state/createInitialState.js';
import { initRng } from '../../../../src/core/engine/rng.js';
import { step } from '../../../../src/core/engine/index.js';
import { createRegistry } from '../../../../src/core/registry/registry.js';
import { registerCorePeriodics } from '../../../../src/core/engine/tickOrder.js';
import { loadCatalog, clearCatalogs, getCatalog, hasCatalog, buildById } from '../../../../src/core/catalog/index.js';
import { BALANCE } from '../../../../src/core/balance/balance.js';
import { populationSanityCap } from '../../../../src/core/systems/population.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..', '..', '..', '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const loadJson = (n) => JSON.parse(readFileSync(join(DATA_DIR, `${n}.json`), 'utf8'));
clearCatalogs();
for (const n of ['achievements','buildings','food','goods','houseTypes','jobs','military','resources','companies','skills','population']) {
  try { loadCatalog(n, loadJson(n)); } catch {}
}
buildById();
function buildCtxCatalog() {
  const c = {};
  for (const n of ['jobs','skills','houseTypes','food','goods']) if (hasCatalog(n)) { const cat = getCatalog(n); c[n] = Array.isArray(cat[n]) ? cat[n] : []; }
  return c;
}
function makeCtx() { const r = createRegistry(); return { registry: r, periodics: registerCorePeriodics(r), catalog: buildCtxCatalog() }; }

const cap = BALANCE.population.sanityMaxPop;
const STEPS_PER_DAY = 900;

// Scenario: lots of housing + abundant food + pop already high -> births should push toward cap.
const state = createInitialState({ seed: 0x5EED5 });
initRng(state);
state.home.population.total = cap - 5;          // start just below cap
state.home.housing.counts = { tent: 5000 };      // huge housing capacity (so cap, not housing, is the limiter)
state.home.food.store = { bread: 500, fish: 500, meat: 500, vegetable: 500, fruit: 500, cheese: 500 };
const ctx = makeCtx();

let maxPop = state.home.population.total;
let overshoot = 0;
let bad = null;
const DAYS = 200;
for (let i = 0; i < DAYS * STEPS_PER_DAY; i++) {
  // keep food topped up so births aren't starved-limited
  if (i % STEPS_PER_DAY === 0) state.home.food.store = { bread: 500, fish: 500, meat: 500, vegetable: 500, fruit: 500, cheese: 500 };
  step(state, ctx);
  const p = state.home.population.total;
  if (!Number.isFinite(p) || p < 0) { bad = `invalid pop ${p} at step ${i}`; break; }
  if (p > maxPop) maxPop = p;
  if (p > cap) overshoot = Math.max(overshoot, p - cap);
}
const housingCap = 5000 * (getCatalog('houseTypes').houseTypes.find(h => h.id === 'tent')?.capacity ?? 0);
const sanity = populationSanityCap(housingCap);
const held = overshoot === 0 && maxPop <= cap && bad === null;
console.log(`cap=${cap} populationSanityCap(housingCap=${housingCap})=${sanity} maxPop=${maxPop} finalPop=${state.home.population.total} overshoot=${overshoot} bad=${bad||'none'}`);
console.log(`AC3-cap-stress: ${held ? 'PASS (cap holds, no explosion/overshoot)' : 'FAIL'}`);
process.exit(held ? 0 : 1);
