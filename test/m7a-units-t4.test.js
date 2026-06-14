/**
 * M7a-1 T4 — recruitUnit command tests (iter-016).
 *
 * Gate requirements (brief_coder_T-005 + design §5.2):
 *   T4-1  Validation: unknown unitType → error; count ≤ 0 → error; missing params → error
 *   T4-2  Gold cost: warrior 1080/unit, archer 1620/unit (military.json / BALANCE.army)
 *   T4-3  Cannot recruit without gold (canAfford guard)
 *   T4-4  pay() executed: gold decremented by goldCost * count
 *   T4-5  player.totWarriors incremented on warrior recruit
 *   T4-6  player.totArchers incremented on archer recruit
 *   T4-7  upkeep.military correct with recruited units (upkeep = warriors×108 + archers×162)
 *   T4-8  persist round-trip: totWarriors/totArchers survive save→load
 *   T4-9  no Math.random / Date.now / DOM in recruitUnit (determinism G1)
 *   T4-10 BALANCE.army.warriorCost=1080, BALANCE.army.archerCost=1620 (source: military.json)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { recruitUnit } from '../src/core/commands/recruitUnit.js';
import { upkeepMilitary } from '../src/core/systems/upkeep.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// ─── Setup ────────────────────────────────────────────────────────────────────
before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'zones']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
  loadCatalog('population', loadJson('population'));
});

/** Fresh state with gold and RNG */
function makeState(gold = 100_000) {
  const state = /** @type {any} */ (createInitialState({ seed: 0xABCD1234 }));
  initRng(state);
  state.player.gold = gold;
  return state;
}

// ─── T4-10: Balance constants ─────────────────────────────────────────────────
describe('T4-10 — balance constants (military.json extracted)', () => {
  it('BALANCE.army.warriorCost === 1080 (source: dump.GOLDCOSTPERWARRIOR, military.json goldCost)', () => {
    assert.strictEqual(BALANCE.army.warriorCost, 1080,
      'BALANCE.army.warriorCost must equal 1080 (extracted from military.json / dump)');
  });

  it('BALANCE.army.archerCost === 1620 (source: dump.GOLDCOSTPERARCHER, military.json goldCost)', () => {
    assert.strictEqual(BALANCE.army.archerCost, 1620,
      'BALANCE.army.archerCost must equal 1620 (extracted from military.json / dump)');
  });

  it('military.json contains warrior goldCost=1080 and archer goldCost=1620', () => {
    const data = loadJson('military');
    const units = data.military;
    assert.ok(Array.isArray(units), 'military.json must have a military array');
    const warrior = units.find((/** @type {any} */ u) => u.id === 'warrior');
    const archer  = units.find((/** @type {any} */ u) => u.id === 'archer');
    assert.ok(warrior, 'warrior entry must exist in military.json');
    assert.ok(archer,  'archer entry must exist in military.json');
    assert.strictEqual(warrior.goldCost, 1080, 'warrior goldCost must be 1080');
    assert.strictEqual(archer.goldCost,  1620, 'archer goldCost must be 1620');
  });
});

// ─── T4-1: Validation ─────────────────────────────────────────────────────────
describe('T4-1 — validation: unknown unitType / bad count / missing params', () => {
  it('missing unitType → ok:false with descriptive error', () => {
    const state = makeState();
    const result = recruitUnit(state, {});
    assert.strictEqual(result.ok, false, 'missing unitType must fail');
    assert.ok(typeof result.error === 'string' && result.error.length > 0,
      'error message must be non-empty string');
  });

  it('empty string unitType → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: '' });
    assert.strictEqual(result.ok, false, 'empty unitType must fail');
  });

  it('unknown unitType "knight" → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: 'knight' });
    assert.strictEqual(result.ok, false, 'unknown unitType must fail');
    assert.ok(result.error && result.error.includes('knight'),
      'error must mention the unknown unitType');
  });

  it('count=0 → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: 'warrior', count: 0 });
    assert.strictEqual(result.ok, false, 'count=0 must fail');
  });

  it('count=-1 → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: 'warrior', count: -1 });
    assert.strictEqual(result.ok, false, 'negative count must fail');
  });

  it('count=1.5 (non-integer) → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: 'warrior', count: 1.5 });
    assert.strictEqual(result.ok, false, 'fractional count must fail');
  });

  it('numeric unitType → ok:false', () => {
    const state = makeState();
    const result = recruitUnit(state, { unitType: /** @type {any} */ (42) });
    assert.strictEqual(result.ok, false, 'numeric unitType must fail');
  });
});

// ─── T4-3: Cannot recruit without gold ────────────────────────────────────────
describe('T4-3 — cannot recruit without gold', () => {
  it('warrior recruit fails when gold < 1080', () => {
    const state = makeState(100); // less than warrior cost 1080
    const before = state.player.totWarriors;
    const result = recruitUnit(state, { unitType: 'warrior', count: 1 });
    assert.strictEqual(result.ok, false, 'recruit must fail when gold insufficient');
    assert.ok(result.error && result.error.toLowerCase().includes('gold'),
      'error must mention gold');
    assert.strictEqual(state.player.totWarriors, before,
      'totWarriors must NOT change when recruit fails');
    assert.strictEqual(state.player.gold, 100,
      'gold must NOT change when recruit fails');
  });

  it('archer recruit fails when gold < 1620', () => {
    const state = makeState(1000); // less than archer cost 1620
    const before = state.player.totArchers;
    const result = recruitUnit(state, { unitType: 'archer', count: 1 });
    assert.strictEqual(result.ok, false, 'archer recruit must fail when gold insufficient');
    assert.strictEqual(state.player.totArchers, before,
      'totArchers must NOT change when recruit fails');
  });

  it('multi-unit recruit fails when gold < total cost', () => {
    const state = makeState(1080); // only enough for 1 warrior, not 2
    const result = recruitUnit(state, { unitType: 'warrior', count: 2 });
    assert.strictEqual(result.ok, false, 'multi-unit recruit must fail when gold insufficient');
    assert.strictEqual(state.player.gold, 1080,
      'gold must NOT be spent when recruit fails');
  });
});

// ─── T4-2 / T4-4: Gold cost and pay ──────────────────────────────────────────
describe('T4-2/T4-4 — gold cost and pay', () => {
  it('warrior recruit: costs 1080 gold per unit', () => {
    const state = makeState(10_000);
    const goldBefore = state.player.gold;
    const result = recruitUnit(state, { unitType: 'warrior', count: 1 });
    assert.strictEqual(result.ok, true, 'warrior recruit must succeed');
    assert.strictEqual(state.player.gold, goldBefore - 1080,
      'warrior must cost exactly 1080 gold');
  });

  it('archer recruit: costs 1620 gold per unit', () => {
    const state = makeState(10_000);
    const goldBefore = state.player.gold;
    const result = recruitUnit(state, { unitType: 'archer', count: 1 });
    assert.strictEqual(result.ok, true, 'archer recruit must succeed');
    assert.strictEqual(state.player.gold, goldBefore - 1620,
      'archer must cost exactly 1620 gold');
  });

  it('warrior recruit count=3: costs 3×1080=3240 gold', () => {
    const state = makeState(10_000);
    const goldBefore = state.player.gold;
    const result = recruitUnit(state, { unitType: 'warrior', count: 3 });
    assert.strictEqual(result.ok, true, 'multi-warrior recruit must succeed');
    assert.strictEqual(state.player.gold, goldBefore - 3 * 1080,
      'cost must be 3×1080=3240 gold');
  });

  it('archer recruit count=2: costs 2×1620=3240 gold', () => {
    const state = makeState(10_000);
    const goldBefore = state.player.gold;
    const result = recruitUnit(state, { unitType: 'archer', count: 2 });
    assert.strictEqual(result.ok, true, 'multi-archer recruit must succeed');
    assert.strictEqual(state.player.gold, goldBefore - 2 * 1620,
      'cost must be 2×1620=3240 gold');
  });

  it('count defaults to 1 when omitted', () => {
    const state = makeState(10_000);
    const goldBefore = state.player.gold;
    const result = recruitUnit(state, { unitType: 'warrior' });
    assert.strictEqual(result.ok, true, 'omitting count must default to 1');
    assert.strictEqual(state.player.gold, goldBefore - 1080,
      'default count=1: cost must be 1080');
  });
});

// ─── T4-5/T4-6: Increment totWarriors / totArchers ────────────────────────────
describe('T4-5/T4-6 — player.totWarriors / player.totArchers increment', () => {
  it('warrior recruit: player.totWarriors incremented by count', () => {
    const state = makeState(10_000);
    state.player.totWarriors = 5;
    const result = recruitUnit(state, { unitType: 'warrior', count: 3 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.player.totWarriors, 8,
      'totWarriors must be incremented by 3 (5+3=8)');
  });

  it('archer recruit: player.totArchers incremented by count', () => {
    const state = makeState(10_000);
    state.player.totArchers = 2;
    const result = recruitUnit(state, { unitType: 'archer', count: 4 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.player.totArchers, 6,
      'totArchers must be incremented by 4 (2+4=6)');
  });

  it('warrior recruit does NOT change totArchers', () => {
    const state = makeState(10_000);
    state.player.totArchers = 7;
    recruitUnit(state, { unitType: 'warrior', count: 2 });
    assert.strictEqual(state.player.totArchers, 7,
      'warrior recruit must not touch totArchers');
  });

  it('archer recruit does NOT change totWarriors', () => {
    const state = makeState(10_000);
    state.player.totWarriors = 3;
    recruitUnit(state, { unitType: 'archer', count: 1 });
    assert.strictEqual(state.player.totWarriors, 3,
      'archer recruit must not touch totWarriors');
  });

  it('starting from 0: recruit 1 warrior → totWarriors=1', () => {
    const state = makeState(10_000);
    assert.strictEqual(state.player.totWarriors, 0);
    const result = recruitUnit(state, { unitType: 'warrior', count: 1 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.player.totWarriors, 1);
  });

  it('starting from 0: recruit 1 archer → totArchers=1', () => {
    const state = makeState(10_000);
    assert.strictEqual(state.player.totArchers, 0);
    const result = recruitUnit(state, { unitType: 'archer', count: 1 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.player.totArchers, 1);
  });
});

// ─── T4-7: upkeep.military correct with recruited units ───────────────────────
describe('T4-7 — upkeep.military correct with recruited units', () => {
  it('after recruit, upkeep.military correctly charges warriorUpkeep×count', () => {
    const state = makeState(50_000);

    // Recruit 5 warriors
    recruitUnit(state, { unitType: 'warrior', count: 5 });
    assert.strictEqual(state.player.totWarriors, 5);

    const goldBeforeUpkeep = state.player.gold;
    const expectedUpkeep = 5 * BALANCE.army.warriorUpkeep; // 5 * 108 = 540

    const ctx = /** @type {any} */ ({ emitTx: () => {} });
    upkeepMilitary(state, {}, ctx);

    assert.strictEqual(state.player.gold, goldBeforeUpkeep - expectedUpkeep,
      `upkeep for 5 warriors = 5×${BALANCE.army.warriorUpkeep} = ${expectedUpkeep}`);
    assert.strictEqual(state.home.notEnoughMilitaryFunding, false,
      'notEnoughMilitaryFunding must be false when gold is sufficient');
  });

  it('after recruit, upkeep.military correctly charges archerUpkeep×count', () => {
    const state = makeState(50_000);

    // Recruit 3 archers
    recruitUnit(state, { unitType: 'archer', count: 3 });
    assert.strictEqual(state.player.totArchers, 3);

    const goldBeforeUpkeep = state.player.gold;
    const expectedUpkeep = 3 * BALANCE.army.archerUpkeep; // 3 * 162 = 486

    const ctx = /** @type {any} */ ({ emitTx: () => {} });
    upkeepMilitary(state, {}, ctx);

    assert.strictEqual(state.player.gold, goldBeforeUpkeep - expectedUpkeep,
      `upkeep for 3 archers = 3×${BALANCE.army.archerUpkeep} = ${expectedUpkeep}`);
  });

  it('after recruiting warriors+archers, upkeep covers both', () => {
    const state = makeState(100_000);

    recruitUnit(state, { unitType: 'warrior', count: 10 }); // 10 warriors
    recruitUnit(state, { unitType: 'archer',  count: 5  }); // 5 archers

    const goldBeforeUpkeep = state.player.gold;
    const expectedUpkeep = 10 * BALANCE.army.warriorUpkeep + 5 * BALANCE.army.archerUpkeep;
    // 10*108 + 5*162 = 1080 + 810 = 1890

    const ctx = /** @type {any} */ ({ emitTx: () => {} });
    upkeepMilitary(state, {}, ctx);

    assert.strictEqual(state.player.gold, goldBeforeUpkeep - expectedUpkeep,
      `combined upkeep = ${expectedUpkeep}`);
  });

  it('upkeep sets notEnoughMilitaryFunding when gold < upkeep after recruit', () => {
    const state = makeState(1080); // just enough for 1 warrior recruit
    recruitUnit(state, { unitType: 'warrior', count: 1 }); // costs 1080 → gold = 0

    assert.strictEqual(state.player.gold, 0, 'gold should be 0 after recruit');

    const ctx = /** @type {any} */ ({ emitTx: () => {} });
    upkeepMilitary(state, {}, ctx);

    // 1 warrior upkeep = 108, but gold = 0 → notEnoughMilitaryFunding
    assert.strictEqual(state.home.notEnoughMilitaryFunding, true,
      'notEnoughMilitaryFunding must be set when gold < upkeep after recruit');
    assert.strictEqual(state.player.gold, 0,
      'gold must NOT be deducted when player cannot afford upkeep');
  });
});

// ─── T4-8: Persist round-trip: totWarriors/totArchers ─────────────────────────
describe('T4-8 — persist round-trip: player.totWarriors / player.totArchers', () => {
  it('totWarriors survives save → load round-trip', () => {
    const state = makeState(50_000);
    recruitUnit(state, { unitType: 'warrior', count: 7 });
    assert.strictEqual(state.player.totWarriors, 7);

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    assert.strictEqual(loaded.player.totWarriors, 7,
      'totWarriors must be preserved after save→load round-trip');
  });

  it('totArchers survives save → load round-trip', () => {
    const state = makeState(50_000);
    recruitUnit(state, { unitType: 'archer', count: 4 });
    assert.strictEqual(state.player.totArchers, 4);

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    assert.strictEqual(loaded.player.totArchers, 4,
      'totArchers must be preserved after save→load round-trip');
  });

  it('hashState identical after recruit + round-trip (G1 determinism)', () => {
    const state = makeState(50_000);
    recruitUnit(state, { unitType: 'warrior', count: 3 });
    recruitUnit(state, { unitType: 'archer',  count: 2 });

    const hashBefore = hashState(state);
    const payload = applyPersist(state);
    const loaded = loadAndReconstruct({ saveVersion: SAVE_VERSION, payload });
    const hashAfter = hashState(loaded);

    assert.strictEqual(hashAfter, hashBefore,
      'hashState must be identical after recruit + save→load (G1 determinism, M-2 class)');
  });

  it('zone warriors/archers (from catalog) survive round-trip (M7a T1+T4 combined)', () => {
    const state = makeState(50_000);

    // Mutate a zone's warriors field
    const zone = /** @type {any[]} */ (state.world.zones).find(
      (/** @type {any} */ z) => z.id !== 'homeZone'
    );
    if (!zone) return; // no zones in catalog = skip

    zone.warriors = 42;
    zone.archers  = 17;

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    const loadedZone = loaded.world.zones.find((/** @type {any} */ z) => z.id === zone.id);
    assert.ok(loadedZone, `zone ${zone.id} must survive round-trip`);
    assert.strictEqual(loadedZone.warriors, 42,
      'zone.warriors must survive save→load (persist allowlist: dynamic zone state)');
    assert.strictEqual(loadedZone.archers, 17,
      'zone.archers must survive save→load');
  });
});
