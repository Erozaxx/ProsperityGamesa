/**
 * M6 T1 — Tech tree: techCap reuse, buyTech command, player state init (M-1 determinism),
 *          persist round-trip unlockedTechs, techs.json schema validation, findTech helper.
 * iter-015 M6 T1.
 *
 * Gate requirements (brief_coder_T-004_iter-015 + design §1.2/§1.3a/§1.4/§1.5/§2.6/§4.1-4.2):
 *   techCap tabular test      — techCap(0)=100, (1)=125, (2)=156, (3)=195, (10)=931
 *   buyTech happy path        — pay deducted, tech marked unlocked
 *   buyTech insufficient pts  — rejected, state unchanged
 *   buyTech prereq missing    — rejected
 *   buyTech already unlocked  — rejected (idempotency)
 *   buyTech unknown tech      — rejected
 *   fresh-vs-load determinism — hashState(fresh) === hashState(load(save(fresh))) with 0 techs (M-1)
 *   persist round-trip        — unlockedTechs survives save→load
 *   techs.json schema valid   — assertCatalogValid('techs', ...) passes
 *   findTech helper           — returns tech / null as expected
 *   M6 addTechModifiers       — modifiers pushed for unlocked techs
 *   applyTechModifiers idempotent — calling twice yields same modifier count
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs, assertCatalogValid } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { techCap } from '../src/core/balance/formulas.js';
import { buyTech } from '../src/core/commands/buyTech.js';
import { findTech, addTechModifiers, applyTechModifiers, rebuildBuildingDerived } from '../src/core/systems/buildings.js';
import { applyPersist, PERSIST_SCHEMA } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** @returns {any} */
function makeState() {
  const state = /** @type {any} */ (createInitialState());
  initRng(state);
  return state;
}

/** Wrap payload for loadAndReconstruct */
function wrapSave(payload) {
  return { saveVersion: SAVE_VERSION, payload };
}

// ============================================================================
// Setup: load required catalogs
// ============================================================================

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'techs']) {
    try { loadCatalog(name, loadJson(name)); } catch (_e) { /* optional */ }
  }
});

after(() => {
  // Do NOT clearCatalogs here — other test suites may run after us
});

// ============================================================================
// techCap tabular test (M6-D1, §1.2)
// ============================================================================

describe('techCap — tabular test (M6-D1, formulas.js:31 reuse)', () => {
  it('techCap(0) === 100', () => {
    assert.strictEqual(techCap(0), 100);
  });

  it('techCap(1) === 125', () => {
    assert.strictEqual(techCap(1), 125); // round(100 × 1.25^1 = 125)
  });

  it('techCap(2) === 156', () => {
    assert.strictEqual(techCap(2), 156); // round(100 × 1.25^2 = 156.25)
  });

  it('techCap(3) === 195', () => {
    assert.strictEqual(techCap(3), 195); // round(100 × 1.25^3 = 195.3125)
  });

  it('techCap(10) === 931', () => {
    assert.strictEqual(techCap(10), 931); // round(100 × 1.25^10 = 931.32...)
  });
});

// ============================================================================
// techs.json schema validation (§4.1, M6-D8)
// ============================================================================

describe('techs.json schema validation', () => {
  it('assertCatalogValid passes for techs.json', () => {
    const data = loadJson('techs');
    assert.doesNotThrow(() => assertCatalogValid('techs', data));
  });

  it('techs.json has _meta with provenance:approximated', () => {
    const data = loadJson('techs');
    assert.ok(data._meta, '_meta block missing');
    assert.strictEqual(data._meta.provenance, 'approximated');
  });

  it('techs.json has 6 sectors', () => {
    const data = loadJson('techs');
    assert.strictEqual(data.techs.sectors.length, 6);
  });

  it('techs.json tree has ≥7 entries', () => {
    const data = loadJson('techs');
    assert.ok(data.techs.tree.length >= 7, `expected ≥7 tree entries, got ${data.techs.tree.length}`);
  });

  it('every tree entry has required fields (id, sector, level, prereqs, effects)', () => {
    const data = loadJson('techs');
    for (const tech of data.techs.tree) {
      assert.ok(typeof tech.id === 'string' && tech.id, `tech.id missing or empty`);
      assert.ok(typeof tech.sector === 'string' && tech.sector, `tech.sector missing for ${tech.id}`);
      assert.ok(typeof tech.level === 'number', `tech.level not a number for ${tech.id}`);
      assert.ok(Array.isArray(tech.prereqs), `tech.prereqs not an array for ${tech.id}`);
      assert.ok(Array.isArray(tech.effects), `tech.effects not an array for ${tech.id}`);
    }
  });

  it('at least 2 building-targeted add techs exist (§2.7 demo)', () => {
    const data = loadJson('techs');
    const buildingAddTechs = data.techs.tree.filter(
      (t) => t.effects.some((e) => e.op === 'add' && !['farmer', 'baker', 'lumberjack', 'warrior'].includes(e.target))
    );
    assert.ok(buildingAddTechs.length >= 2, `expected ≥2 building-targeted add techs, got ${buildingAddTechs.length}`);
  });
});

// ============================================================================
// findTech helper (§4.2)
// ============================================================================

describe('findTech helper (§4.2)', () => {
  it('returns the tech entry for a known id', () => {
    const tech = findTech('agriculture_irrigation');
    assert.ok(tech, 'should return tech for agriculture_irrigation');
    assert.strictEqual(tech.id, 'agriculture_irrigation');
    assert.strictEqual(tech.sector, 'agriculture');
  });

  it('returns null for unknown tech id', () => {
    const result = findTech('nonexistent_tech_id_xyz');
    assert.strictEqual(result, null);
  });

  it('returns agriculture_granaries (§2.7 demo tech)', () => {
    const tech = findTech('agriculture_granaries');
    assert.ok(tech, 'agriculture_granaries should exist in tree');
    assert.ok(tech.effects.some((e) => e.target === 'granary' && e.attr === 'storage.food' && e.op === 'add'));
  });

  it('returns civil_attractiveness (§2.7 demo tech — target:well)', () => {
    const tech = findTech('civil_attractiveness');
    assert.ok(tech, 'civil_attractiveness should exist in tree');
    assert.ok(tech.effects.some((e) => e.target === 'well' && e.attr === 'attractiveness' && e.op === 'add'));
  });
});

// ============================================================================
// M-1 player state init: unlockedTechs and research must be present in fresh state
// ============================================================================

describe('M-1 player state init (§1.3a)', () => {
  it('createInitialState() has player.unlockedTechs as empty object', () => {
    const state = makeState();
    assert.ok(state.player.unlockedTechs !== undefined, 'unlockedTechs should be present');
    assert.deepEqual(state.player.unlockedTechs, {}, 'unlockedTechs should be {}');
  });

  it('createInitialState() has player.research.sectors as empty object', () => {
    const state = makeState();
    assert.ok(state.player.research !== undefined, 'research should be present');
    assert.ok(state.player.research.sectors !== undefined, 'research.sectors should be present');
    assert.deepEqual(state.player.research.sectors, {}, 'research.sectors should be {}');
  });
});

// ============================================================================
// fresh-vs-load determinism test (M-1, §1.3a, ZÁVAZNÝ)
// ============================================================================

describe('fresh-vs-load determinism (M-1 §1.3a)', () => {
  it('hashState(fresh) === hashState(load(save(fresh))) — 0 techs, 0 research', () => {
    // fresh state
    const s0 = /** @type {any} */ (createInitialState());
    // (no initRng so both fresh and load use same deterministic base state)

    // save → load round-trip
    const blob = applyPersist(s0);
    const s1 = loadAndReconstruct(wrapSave(blob));

    const h0 = hashState(s0);
    const h1 = hashState(/** @type {any} */ (s1));

    assert.strictEqual(h0, h1,
      'fresh state hashState must equal load(save(fresh)) hashState (M-1 determinism). ' +
      'If this fails, player.unlockedTechs or research is missing from createPlayerState.'
    );
  });
});

// ============================================================================
// persist round-trip for unlockedTechs (§1.5)
// ============================================================================

describe('persist round-trip — unlockedTechs (§1.5)', () => {
  it('unlockedTechs is in PERSIST_SCHEMA.player', () => {
    assert.ok(PERSIST_SCHEMA.player.includes('unlockedTechs'),
      "PERSIST_SCHEMA.player must include 'unlockedTechs'");
  });

  it('unlockedTechs survives save→load round-trip', () => {
    const state = makeState();
    state.player.techPt = 200;
    state.player.unlockedTechs = { agriculture_irrigation: true };

    const payload = applyPersist(/** @type {any} */ (state));
    const restored = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    assert.deepEqual(restored.player.unlockedTechs, { agriculture_irrigation: true },
      'unlockedTechs must be identical after save→load');
  });

  it('old save without unlockedTechs loads as {} (undefined-guard, M6-D11)', () => {
    // Simulate old save: player block without unlockedTechs
    const state = makeState();
    const payload = applyPersist(/** @type {any} */ (state));
    // remove unlockedTechs from the saved payload to simulate old save
    delete /** @type {any} */ (payload).player.unlockedTechs;
    const restored = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
    assert.deepEqual(restored.player.unlockedTechs, {},
      'missing unlockedTechs in save should default to {} after load');
  });

  it('research survives save→load round-trip', () => {
    const state = makeState();
    state.player.research = { sectors: { agriculture: { level: 2, exp: 50 } } };

    const payload = applyPersist(/** @type {any} */ (state));
    const restored = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    assert.deepEqual(restored.player.research, { sectors: { agriculture: { level: 2, exp: 50 } } },
      'research must be identical after save→load');
  });
});

// ============================================================================
// buyTech command (§1.4)
// ============================================================================

describe('buyTech command (§1.4)', () => {
  it('happy path: deducts techPt, marks tech unlocked', () => {
    const state = makeState();
    state.player.techPt = 200; // enough for level 0 tech (cost = 100)
    const result = buyTech(state, { techId: 'agriculture_irrigation' });
    assert.ok(result.ok, `expected ok, got: ${result.error}`);
    assert.strictEqual(state.player.unlockedTechs['agriculture_irrigation'], true);
    // techCap(0) = 100; 200 - 100 = 100
    assert.strictEqual(state.player.techPt, 100, 'techPt should be deducted by techCap(level)');
  });

  it('insufficient techPt: rejected, state unchanged', () => {
    const state = makeState();
    state.player.techPt = 50; // not enough for level 0 (need 100)
    const result = buyTech(state, { techId: 'agriculture_irrigation' });
    assert.ok(!result.ok, 'should fail when insufficient techPt');
    assert.ok(result.error && result.error.includes('insufficient'), `error should mention insufficient: ${result.error}`);
    assert.strictEqual(state.player.unlockedTechs['agriculture_irrigation'], undefined, 'tech should NOT be unlocked');
    assert.strictEqual(state.player.techPt, 50, 'techPt should NOT be deducted on failure');
  });

  it('prereq missing: rejected', () => {
    const state = makeState();
    state.player.techPt = 200;
    // agriculture_crop_rotation requires agriculture_irrigation
    const result = buyTech(state, { techId: 'agriculture_crop_rotation' });
    assert.ok(!result.ok, 'should fail when prereq is missing');
    assert.ok(result.error && result.error.includes('prereq'), `error should mention prereq: ${result.error}`);
    assert.strictEqual(state.player.unlockedTechs['agriculture_crop_rotation'], undefined);
  });

  it('prereq satisfied: success after unlocking prerequisite', () => {
    const state = makeState();
    state.player.techPt = 500;
    // First unlock the prereq
    const r1 = buyTech(state, { techId: 'agriculture_irrigation' });
    assert.ok(r1.ok, `prereq unlock failed: ${r1.error}`);
    // Now unlock the dependent tech (level 1, cost = 125)
    const r2 = buyTech(state, { techId: 'agriculture_crop_rotation' });
    assert.ok(r2.ok, `dep tech should succeed after prereq: ${r2.error}`);
    assert.strictEqual(state.player.unlockedTechs['agriculture_crop_rotation'], true);
  });

  it('already unlocked: rejected (idempotency guard)', () => {
    const state = makeState();
    state.player.techPt = 500;
    const r1 = buyTech(state, { techId: 'agriculture_irrigation' });
    assert.ok(r1.ok, `first unlock failed: ${r1.error}`);
    const ptAfterFirst = state.player.techPt;
    const r2 = buyTech(state, { techId: 'agriculture_irrigation' });
    assert.ok(!r2.ok, 'second unlock should fail (already unlocked)');
    assert.ok(r2.error && r2.error.includes('already'), `error should mention already: ${r2.error}`);
    assert.strictEqual(state.player.techPt, ptAfterFirst, 'techPt should NOT change on duplicate unlock');
  });

  it('unknown tech: rejected', () => {
    const state = makeState();
    state.player.techPt = 9999;
    const result = buyTech(state, { techId: 'nonexistent_tech_xyz' });
    assert.ok(!result.ok, 'should fail for unknown tech');
    assert.ok(result.error && result.error.includes('unknown'), `error should mention unknown: ${result.error}`);
  });

  it('invalid techId (empty string): rejected', () => {
    const state = makeState();
    const result = buyTech(state, { techId: '' });
    assert.ok(!result.ok, 'should fail for empty techId');
  });

  it('invalid techId (non-string): rejected', () => {
    const state = makeState();
    const result = buyTech(state, { techId: 42 });
    assert.ok(!result.ok, 'should fail for non-string techId');
  });
});

// ============================================================================
// addTechModifiers / applyTechModifiers (§2.2)
// ============================================================================

describe('addTechModifiers + applyTechModifiers (§2.2)', () => {
  it('addTechModifiers pushes modifiers for each unlocked tech effect', () => {
    const state = makeState();
    state.player.unlockedTechs = { agriculture_irrigation: true };
    // mods starts empty; addTechModifiers should push modifier for farmer.efficiency.add
    addTechModifiers(state);
    const techMods = state.catalogState.modifiers.filter((m) => m.source === 'tech:agriculture_irrigation');
    assert.ok(techMods.length >= 1, 'should push at least 1 modifier for agriculture_irrigation');
    const mod = techMods[0];
    assert.strictEqual(mod.target, 'farmer');
    assert.strictEqual(mod.attr, 'efficiency');
    assert.strictEqual(mod.op, 'add');
    assert.strictEqual(mod.value, 0.1);
  });

  it('addTechModifiers id includes target (unique per tech,target,attr,op)', () => {
    const state = makeState();
    state.player.unlockedTechs = { agriculture_irrigation: true };
    addTechModifiers(state);
    const mod = state.catalogState.modifiers.find((m) => m.source === 'tech:agriculture_irrigation');
    assert.ok(mod, 'modifier should exist');
    // id should include techId, target, attr, op
    assert.ok(mod.id.includes('agriculture_irrigation'), `id should include techId: ${mod.id}`);
    assert.ok(mod.id.includes('farmer'), `id should include target: ${mod.id}`);
  });

  it('applyTechModifiers is idempotent: calling twice yields same modifier count', () => {
    const state = makeState();
    state.player.unlockedTechs = { civil_attractiveness: true };
    applyTechModifiers(state);
    const count1 = state.catalogState.modifiers.filter((m) => m.source.startsWith('tech:')).length;
    applyTechModifiers(state);
    const count2 = state.catalogState.modifiers.filter((m) => m.source.startsWith('tech:')).length;
    assert.strictEqual(count1, count2, 'applyTechModifiers should be idempotent (no duplicate modifiers)');
    assert.ok(count1 >= 1, 'should have at least 1 tech modifier');
  });

  it('rebuildBuildingDerived includes tech modifiers in step (b2)', () => {
    const state = makeState();
    state.player.unlockedTechs = { civil_attractiveness: true };
    rebuildBuildingDerived(state);
    const techMods = state.catalogState.modifiers.filter((m) => m.source.startsWith('tech:'));
    assert.ok(techMods.length >= 1, 'rebuildBuildingDerived should include tech modifiers via step (b2)');
  });

  it('addTechModifiers is no-op when catalog not loaded (M-2 guard)', () => {
    const state = makeState();
    state.player.unlockedTechs = { some_tech: true };
    // Temporarily clear catalogs for this test
    clearCatalogs();
    assert.doesNotThrow(() => addTechModifiers(state), 'addTechModifiers should not throw without catalog');
    const techMods = state.catalogState.modifiers.filter((m) => m.source.startsWith('tech:'));
    assert.strictEqual(techMods.length, 0, 'no tech mods should be added when catalog not loaded');
    // Restore catalogs for subsequent tests
    for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'techs']) {
      try { loadCatalog(name, loadJson(name)); } catch (_e) { /* optional */ }
    }
  });

  it('addTechModifiers skips missing tech id gracefully (M-2 null guard)', () => {
    const state = makeState();
    state.player.unlockedTechs = { nonexistent_tech_xyz: true };
    assert.doesNotThrow(() => addTechModifiers(state), 'should not throw for missing tech id in catalog');
    // No modifiers should be added for nonexistent tech
    const techMods = state.catalogState.modifiers.filter((m) => m.source === 'tech:nonexistent_tech_xyz');
    assert.strictEqual(techMods.length, 0, 'no modifier for missing tech');
  });
});

// ============================================================================
// buyTech + hashState round-trip (M-1 second variant: after N buyTechs)
// ============================================================================

describe('round-trip after buyTech — hashState identity', () => {
  it('hashState(state after buyTech) === hashState(load(save(state after buyTech)))', () => {
    const state = makeState();
    state.player.techPt = 9999;
    buyTech(state, { techId: 'agriculture_irrigation' });
    buyTech(state, { techId: 'civil_attractiveness' });

    const payload = applyPersist(/** @type {any} */ (state));
    const restored = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const h0 = hashState(/** @type {any} */ (state));
    const h1 = hashState(restored);

    assert.strictEqual(h0, h1,
      'hashState must be identical after save→load with non-zero unlockedTechs'
    );
  });
});
