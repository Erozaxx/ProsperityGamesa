/**
 * Tests for M6 T4 UI selectors (iter-015):
 *   selectTechTree  — unlock status, cost (techCap), prereqs, canAfford, available
 *   selectResearchProgress — per-sector level/exp/cap/progPct derivates
 *   selectTechPoints — techPt balance
 *
 * Gate requirements (brief_coder_T-007_iter-015):
 *   selectTechs: odemcene/dostupne/zamcene, cena (techCap(level)), prereqs, canAfford(techPt)
 *   selectResearch: progres/level per sektor, pctProgress derivat
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { techCap } from '../src/core/balance/formulas.js';
import {
  selectTechTree,
  selectResearchProgress,
  selectTechPoints,
} from '../src/ui/selectors.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @returns {any} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** @returns {any} */
function makeState() {
  const state = /** @type {any} */ (createInitialState());
  initRng(state);
  return state;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'techs']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
});

after(() => {
  clearCatalogs();
});

// ---------------------------------------------------------------------------
// selectTechPoints
// ---------------------------------------------------------------------------

describe('selectTechPoints', () => {
  it('returns 0 for fresh state', () => {
    const state = makeState();
    assert.strictEqual(selectTechPoints(state), 0);
  });

  it('returns current techPt value', () => {
    const state = makeState();
    state.player.techPt = 250;
    assert.strictEqual(selectTechPoints(state), 250);
  });

  it('returns 0 when techPt is undefined (defenziva)', () => {
    const state = makeState();
    delete state.player.techPt;
    assert.strictEqual(selectTechPoints(state), 0);
  });
});

// ---------------------------------------------------------------------------
// selectTechTree — unlock status, cost, prereqs, canAfford, available
// ---------------------------------------------------------------------------

describe('selectTechTree', () => {
  it('returns array when techs catalog is loaded', () => {
    const state = makeState();
    const result = selectTechTree(state);
    assert.ok(Array.isArray(result), 'should return array');
    assert.ok(result.length > 0, 'should have at least one tech');
  });

  it('returns [] when techs catalog not loaded (defenziva)', () => {
    const state = makeState();
    // temporarily clear catalogs
    clearCatalogs();
    const result = selectTechTree(state);
    assert.deepEqual(result, []);
    // restore
    for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'techs']) {
      try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
    }
  });

  it('tech cost = techCap(tech.level) — level 0 costs 100', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const level0Tech = result.find(t => t.level === 0);
    assert.ok(level0Tech, 'should have a level-0 tech');
    assert.strictEqual(level0Tech.cost, techCap(0), 'cost should be techCap(0) = 100');
    assert.strictEqual(level0Tech.cost, 100);
  });

  it('tech cost = techCap(tech.level) — level 1 costs 125', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const level1Tech = result.find(t => t.level === 1);
    assert.ok(level1Tech, 'should have a level-1 tech');
    assert.strictEqual(level1Tech.cost, techCap(1), 'cost should be techCap(1) = 125');
    assert.strictEqual(level1Tech.cost, 125);
  });

  it('fresh state: all techs are locked (not unlocked, not available if have prereqs)', () => {
    const state = makeState();
    const result = selectTechTree(state);
    // All techs should be not unlocked
    for (const t of result) {
      assert.strictEqual(t.unlocked, false, `tech ${t.id} should not be unlocked in fresh state`);
    }
  });

  it('fresh state: no-prereq techs are available', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const noPrerequTechs = result.filter(t => t.prereqs.length === 0);
    assert.ok(noPrerequTechs.length > 0, 'should have at least one no-prereq tech');
    for (const t of noPrerequTechs) {
      assert.strictEqual(t.available, true, `tech ${t.id} with no prereqs should be available`);
    }
  });

  it('fresh state: tech with prereqs is not available (prereqs not met)', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const withPrereqs = result.filter(t => t.prereqs.length > 0);
    if (withPrereqs.length > 0) {
      for (const t of withPrereqs) {
        assert.strictEqual(t.available, false, `tech ${t.id} with unmet prereqs should not be available`);
      }
    }
  });

  it('unlocked tech shows unlocked:true, available:false', () => {
    const state = makeState();
    state.player.unlockedTechs = { agriculture_irrigation: true };
    const result = selectTechTree(state);
    const tech = result.find(t => t.id === 'agriculture_irrigation');
    assert.ok(tech, 'agriculture_irrigation should be in tree');
    assert.strictEqual(tech.unlocked, true, 'should be marked unlocked');
    assert.strictEqual(tech.available, false, 'unlocked tech should NOT be available (no re-unlock)');
  });

  it('after unlocking prereq, dependent tech becomes available', () => {
    const state = makeState();
    // agriculture_crop_rotation requires agriculture_irrigation
    state.player.unlockedTechs = { agriculture_irrigation: true };
    const result = selectTechTree(state);
    const dep = result.find(t => t.id === 'agriculture_crop_rotation');
    assert.ok(dep, 'agriculture_crop_rotation should be in tree');
    assert.strictEqual(dep.available, true, 'dependent tech should be available after prereq unlocked');
    assert.strictEqual(dep.unlocked, false, 'dependent tech should not be unlocked yet');
  });

  it('canAfford: true when techPt >= cost', () => {
    const state = makeState();
    state.player.techPt = 9999;
    const result = selectTechTree(state);
    for (const t of result) {
      assert.strictEqual(t.canAfford, true, `tech ${t.id} should be affordable with 9999 techPt`);
    }
  });

  it('canAfford: false when techPt < cost', () => {
    const state = makeState();
    state.player.techPt = 0;
    const result = selectTechTree(state);
    for (const t of result) {
      assert.strictEqual(t.canAfford, false, `tech ${t.id} should NOT be affordable with 0 techPt`);
    }
  });

  it('each tech item has required fields (id, name, sector, level, cost, prereqs, unlocked, available, canAfford, effects)', () => {
    const state = makeState();
    const result = selectTechTree(state);
    for (const t of result) {
      assert.ok(typeof t.id === 'string' && t.id, `id missing for tech`);
      assert.ok(typeof t.name === 'string', `name missing for ${t.id}`);
      assert.ok(typeof t.sector === 'string', `sector missing for ${t.id}`);
      assert.ok(typeof t.level === 'number', `level missing for ${t.id}`);
      assert.ok(typeof t.cost === 'number', `cost missing for ${t.id}`);
      assert.ok(Array.isArray(t.prereqs), `prereqs should be array for ${t.id}`);
      assert.ok(typeof t.unlocked === 'boolean', `unlocked should be boolean for ${t.id}`);
      assert.ok(typeof t.available === 'boolean', `available should be boolean for ${t.id}`);
      assert.ok(typeof t.canAfford === 'boolean', `canAfford should be boolean for ${t.id}`);
      assert.ok(Array.isArray(t.effects), `effects should be array for ${t.id}`);
    }
  });

  it('agriculture_granaries: effects include granary storage.food add 200 (§2.7 demo)', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const tech = result.find(t => t.id === 'agriculture_granaries');
    assert.ok(tech, 'agriculture_granaries should be in tree');
    const effect = tech.effects.find(e => e.target === 'granary' && e.attr === 'storage.food' && e.op === 'add');
    assert.ok(effect, 'should have granary storage.food add effect');
    assert.strictEqual(effect.value, 200);
  });

  it('civil_attractiveness: effects include well attractiveness add (§2.7 demo)', () => {
    const state = makeState();
    const result = selectTechTree(state);
    const tech = result.find(t => t.id === 'civil_attractiveness');
    assert.ok(tech, 'civil_attractiveness should be in tree');
    const effect = tech.effects.find(e => e.target === 'well' && e.attr === 'attractiveness' && e.op === 'add');
    assert.ok(effect, 'should have well attractiveness add effect');
    assert.ok(typeof effect.value === 'number' && effect.value > 0, 'effect.value should be positive number');
  });
});

// ---------------------------------------------------------------------------
// selectResearchProgress — per-sector level/exp/cap/progPct
// ---------------------------------------------------------------------------

describe('selectResearchProgress', () => {
  it('returns array with one entry per sector when techs catalog loaded', () => {
    const state = makeState();
    const result = selectResearchProgress(state);
    assert.ok(Array.isArray(result), 'should return array');
    // techs.json has 6 sectors
    assert.strictEqual(result.length, 6, 'should have one entry per sector (6)');
  });

  it('returns [] when techs catalog not loaded', () => {
    const state = makeState();
    clearCatalogs();
    const result = selectResearchProgress(state);
    assert.deepEqual(result, []);
    // restore
    for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'techs']) {
      try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
    }
  });

  it('fresh state: all sectors start at level 0, exp 0, progPct 0', () => {
    const state = makeState();
    const result = selectResearchProgress(state);
    for (const sec of result) {
      assert.strictEqual(sec.level, 0, `sector ${sec.id} level should be 0`);
      assert.strictEqual(sec.exp, 0, `sector ${sec.id} exp should be 0`);
      assert.strictEqual(sec.progPct, 0, `sector ${sec.id} progPct should be 0`);
    }
  });

  it('cap = techCap(level) for each sector', () => {
    const state = makeState();
    const result = selectResearchProgress(state);
    for (const sec of result) {
      assert.strictEqual(sec.cap, techCap(sec.level), `cap should equal techCap(level) for sector ${sec.id}`);
    }
  });

  it('progPct = round(exp * 100 / cap)', () => {
    const state = makeState();
    // Set some exp for agriculture sector
    state.player.research.sectors.agriculture = { level: 0, exp: 50 };
    const result = selectResearchProgress(state);
    const agri = result.find(s => s.id === 'agriculture');
    assert.ok(agri, 'agriculture sector should be present');
    assert.strictEqual(agri.level, 0);
    assert.strictEqual(agri.exp, 50);
    const expectedCap = techCap(0); // 100
    assert.strictEqual(agri.cap, expectedCap);
    const expectedPct = Math.min(100, Math.round(50 * 100 / expectedCap)); // 50
    assert.strictEqual(agri.progPct, expectedPct);
  });

  it('progPct = 100 when exp >= cap (level-up pending)', () => {
    const state = makeState();
    state.player.research.sectors.civil = { level: 1, exp: 125 }; // exp = cap for level 1 (techCap(1)=125)
    const result = selectResearchProgress(state);
    const civil = result.find(s => s.id === 'civil');
    assert.ok(civil, 'civil sector should be present');
    assert.strictEqual(civil.level, 1);
    assert.strictEqual(civil.cap, techCap(1)); // 125
    assert.strictEqual(civil.progPct, 100, 'progPct capped at 100');
  });

  it('higher level sector has higher cap', () => {
    const state = makeState();
    state.player.research.sectors.crafts = { level: 3, exp: 0 };
    const result = selectResearchProgress(state);
    const crafts = result.find(s => s.id === 'crafts');
    assert.ok(crafts, 'crafts sector should be present');
    assert.strictEqual(crafts.level, 3);
    assert.strictEqual(crafts.cap, techCap(3)); // 195
  });

  it('each item has required fields (id, name, level, exp, cap, progPct)', () => {
    const state = makeState();
    const result = selectResearchProgress(state);
    for (const sec of result) {
      assert.ok(typeof sec.id === 'string' && sec.id, `id missing`);
      assert.ok(typeof sec.name === 'string', `name missing for ${sec.id}`);
      assert.ok(typeof sec.level === 'number', `level missing for ${sec.id}`);
      assert.ok(typeof sec.exp === 'number', `exp missing for ${sec.id}`);
      assert.ok(typeof sec.cap === 'number', `cap missing for ${sec.id}`);
      assert.ok(typeof sec.progPct === 'number', `progPct missing for ${sec.id}`);
      assert.ok(sec.progPct >= 0 && sec.progPct <= 100, `progPct should be 0-100 for ${sec.id}`);
    }
  });

  it('includes all 6 sectors from techs.json', () => {
    const state = makeState();
    const result = selectResearchProgress(state);
    const ids = result.map(s => s.id);
    for (const expected of ['agriculture', 'civil', 'crafts', 'forestry', 'medicine', 'military']) {
      assert.ok(ids.includes(expected), `sector ${expected} should be present`);
    }
  });
});
