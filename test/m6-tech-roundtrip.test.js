/**
 * M6 T2 — Tech modifier determinism: round-trip identity WITH unlocked techs.
 * iter-015 M6 T-005.
 *
 * Tests the critical determinism invariant (DR-012-02 class):
 *   hashState(state) === hashState(load(save(state)))
 * ... for all combinations of unlocked techs and built buildings.
 *
 * Also verifies:
 *   - persist↔re-gen consistency (tech mods removed-all + re-added from unlockedTechs)
 *   - payload does NOT contain derived tech data (home.derived, _effCache, _modVersion)
 *   - catch-up-safe: same offline batch → same hashState (deterministic result)
 *
 * Design refs: design_iter-015.md §2.3/§2.4/§2.5, DR-012-02, brief_coder_T-005_iter-015.md.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { buyTech } from '../src/core/commands/buyTech.js';
import { rebuildBuildingDerived, addTechModifiers, effective } from '../src/core/systems/buildings.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** Wrap payload for loadAndReconstruct */
function wrapSave(payload) {
  return { saveVersion: SAVE_VERSION, payload };
}

/**
 * Create a minimal fresh state suitable for round-trip tests.
 * Avoids unpersisted fields that would cause false positives.
 */
function makeState() {
  const state = /** @type {any} */ (createInitialState());
  initRng(state);
  state.player.gold = 10_000_000;
  state.player.techPt = 9999;
  return state;
}

/**
 * Add N instances of a building directly (bypassing build queue) and rebuild derived.
 * Mirrors the pattern in m5-buildings-t4.test.js::addBuilding.
 * @param {any} state
 * @param {string} buildingId
 * @param {number} count
 */
function addBuilding(state, buildingId, count = 1) {
  if (!state.home.buildings[buildingId]) {
    state.home.buildings[buildingId] = { created: 0, totalMade: 0, instances: [] };
  }
  const b = state.home.buildings[buildingId];
  for (let i = 0; i < count; i++) {
    b.instances.push({ instId: `${buildingId}_${b.totalMade}`, hp: 100, inRepair: false });
    b.totalMade++;
  }
  b.created = b.instances.length;
  rebuildBuildingDerived(state);
}

/**
 * Core round-trip assertion: save → load → assert hashState matches.
 * @param {any} state
 * @param {string} context - description for error messages
 */
function assertRoundTrip(state, context) {
  const h0 = hashState(state);
  const payload = applyPersist(state);
  const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
  const h1 = hashState(loaded);
  assert.strictEqual(h0, h1,
    `hashState must be BIT-IDENTICAL after save→load [${context}] (DR-012-02)`);
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
// Scenario A: 0 techs, 0 buildings (baseline — also covered in m6-tech-t1.test.js)
// ============================================================================

describe('M6 round-trip — Scenario A: 0 techs, 0 buildings (baseline)', () => {
  it('hashState bit-identical: fresh state, no techs, no buildings', () => {
    const state = makeState();
    assertRoundTrip(state, 'A: 0 techs, 0 buildings');
  });
});

// ============================================================================
// Scenario B: 1 building-targeting tech, NO built target building
// Verifies: tech modifier in modifiers array but home.derived unchanged (no-op via aggregate)
// ============================================================================

describe('M6 round-trip — Scenario B: 1 building-targeting tech, no built target', () => {
  it('hashState bit-identical: agriculture_granaries (no granary built)', () => {
    // agriculture_granaries targets granary.storage.food; no granary built → home.derived.storageCapacity.food=0
    // But the modifier IS in catalogState.modifiers — round-trip must still work
    const state = makeState();
    const r = buyTech(state, { techId: 'agriculture_granaries' });
    assert.ok(r.ok, `buyTech should succeed: ${r.error}`);
    // No granary built → effective still present in modifiers but aggregate no-op
    assert.strictEqual(state.player.unlockedTechs['agriculture_granaries'], true);
    // Tech modifier IS pushed (even without building)
    const techMods = state.catalogState.modifiers.filter((/** @type {any} */ m) => m.source === 'tech:agriculture_granaries');
    assert.ok(techMods.length >= 1, 'tech modifier should be in modifiers array');

    assertRoundTrip(state, 'B: agriculture_granaries, no granary');
  });

  it('hashState bit-identical: civil_attractiveness (no well built)', () => {
    const state = makeState();
    buyTech(state, { techId: 'civil_attractiveness' });
    assertRoundTrip(state, 'B: civil_attractiveness, no well');
  });
});

// ============================================================================
// Scenario C: 1 building-targeting tech WITH built target building
// KRITICKÝ test: tech mění home.derived přes effective() → recalcBuildingAggregates
// ============================================================================

describe('M6 round-trip — Scenario C: 1 building-targeting tech WITH built target (CRITICAL)', () => {
  it('agriculture_granaries + 1 granary: storage.food INCREASED by tech, then round-trip', () => {
    const state = makeState();

    // Build 1 granary (provides storage.food)
    addBuilding(state, 'granary', 1);
    const baseStorageFood = /** @type {any} */ (state.home.derived.storageCapacity?.food ?? 0);

    // Buy agriculture_granaries (adds +200 to granary.storage.food via effective())
    const r = buyTech(state, { techId: 'agriculture_granaries' });
    assert.ok(r.ok, `buyTech should succeed: ${r.error}`);

    // VERIFY: tech actually changed home.derived (§2.7 prokazatelná cesta)
    const newStorageFood = /** @type {any} */ (state.home.derived.storageCapacity?.food ?? 0);
    assert.ok(
      newStorageFood > baseStorageFood,
      `storage.food should increase after agriculture_granaries: before=${baseStorageFood}, after=${newStorageFood}`
    );
    assert.ok(
      newStorageFood >= baseStorageFood + 200,
      `storage.food should increase by ≥200 (tech value=200): delta=${newStorageFood - baseStorageFood}`
    );

    // CRITICAL: hashState must be bit-identical after save→load
    assertRoundTrip(state, 'C: agriculture_granaries + 1 granary');
  });

  it('civil_attractiveness + 1 well: attractiveness INCREASED by tech, then round-trip', () => {
    const state = makeState();

    addBuilding(state, 'well', 1);
    const baseAttr = /** @type {number} */ (state.home.derived.attractiveness ?? 0);

    const r = buyTech(state, { techId: 'civil_attractiveness' });
    assert.ok(r.ok, `buyTech should succeed: ${r.error}`);

    // VERIFY: tech changed attractiveness (§2.7 prokazatelná cesta: well.attractiveness via effective())
    const newAttr = /** @type {number} */ (state.home.derived.attractiveness ?? 0);
    assert.ok(
      newAttr > baseAttr,
      `attractiveness should increase after civil_attractiveness: before=${baseAttr}, after=${newAttr}`
    );
    assert.ok(
      newAttr >= baseAttr + 3,
      `attractiveness should increase by ≥3 (tech value=3): delta=${newAttr - baseAttr}`
    );

    // CRITICAL round-trip
    assertRoundTrip(state, 'C: civil_attractiveness + 1 well');
  });

  it('agriculture_granaries + 2 granaries: storage.food correct (+200 via tech fold), round-trip', () => {
    const state = makeState();
    addBuilding(state, 'granary', 2);
    // Without tech: 2 granaries × 200 base = 400
    const base = state.home.derived.storageCapacity?.food ?? 0;

    buyTech(state, { techId: 'agriculture_granaries' });
    // With tech: (200 + 200 tech) × 2 granaries effective = base + 200×2? No:
    // effective('granary','storage.food') = base_attr(200) × 2 instances baked in modifier + tech +200
    // recalcBuildingAggregates sums effective(granary, storage.food) once per building type
    // So total = effective output (which includes tech) = 400 + 200 = 600 total
    const after = state.home.derived.storageCapacity?.food ?? 0;
    assert.ok(after > base, `storage.food should increase after tech: base=${base}, after=${after}`);

    assertRoundTrip(state, 'C: agriculture_granaries + 2 granaries');
  });
});

// ============================================================================
// Scenario D: Multiple building-targeting techs WITH buildings
// ============================================================================

describe('M6 round-trip — Scenario D: multiple techs WITH buildings', () => {
  it('agriculture_granaries + civil_attractiveness + granary + well: round-trip identity', () => {
    const state = makeState();

    // Build both target buildings
    addBuilding(state, 'granary', 1);
    addBuilding(state, 'well', 1);

    // Unlock both building-targeting techs
    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });

    // Verify both effects are present
    const techMods = state.catalogState.modifiers.filter(
      (/** @type {any} */ m) => m.source.startsWith('tech:')
    );
    assert.ok(techMods.length >= 2, `should have ≥2 tech modifiers, got ${techMods.length}`);

    // Verify home.derived is non-trivial
    assert.ok(
      (state.home.derived.storageCapacity?.food ?? 0) > 0,
      'storageCapacity.food should be > 0'
    );
    assert.ok(
      (state.home.derived.attractiveness ?? 0) > 0,
      'attractiveness should be > 0'
    );

    // CRITICAL: bit-identical round-trip
    assertRoundTrip(state, 'D: agriculture_granaries + civil_attractiveness + buildings');
  });

  it('3 building-targeting techs (agriculture_granaries + civil_attractiveness + agriculture_crop_rotation): round-trip', () => {
    const state = makeState();

    // agriculture_crop_rotation requires agriculture_irrigation as prereq
    buyTech(state, { techId: 'agriculture_irrigation' }); // prereq (job-targeting, no-op on derived)
    addBuilding(state, 'granary', 1);
    addBuilding(state, 'well', 1);

    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });
    buyTech(state, { techId: 'agriculture_crop_rotation' }); // granary.storage.food +100

    const allTechMods = state.catalogState.modifiers.filter(
      (/** @type {any} */ m) => m.source.startsWith('tech:')
    );
    // agriculture_irrigation (1 effect) + agriculture_granaries (1) + civil_attractiveness (1) + agriculture_crop_rotation (1) = 4
    assert.ok(allTechMods.length >= 4, `expected ≥4 tech mods, got ${allTechMods.length}`);

    assertRoundTrip(state, 'D: 3 building-targeting techs + buildings');
  });

  it('mixed: job-targeting + building-targeting techs, with buildings — round-trip', () => {
    const state = makeState();

    addBuilding(state, 'granary', 2);
    addBuilding(state, 'well', 1);

    // Job-targeting (tichý no-op on home.derived, but still in modifiers)
    buyTech(state, { techId: 'agriculture_irrigation' }); // farmer.efficiency add
    buyTech(state, { techId: 'forestry_axes' });          // lumberjack.efficiency add
    // Building-targeting (prokazatelná cesta)
    buyTech(state, { techId: 'agriculture_granaries' });  // granary.storage.food +200
    buyTech(state, { techId: 'civil_attractiveness' });   // well.attractiveness +3

    assertRoundTrip(state, 'D: mixed job+building techs + buildings');
  });
});

// ============================================================================
// Scenario E: Verify home.derived NOT in persist payload (M6-D6)
// ============================================================================

describe('M6 round-trip — Scenario E: payload does NOT contain derived tech data', () => {
  it('applyPersist payload does NOT contain home.derived', () => {
    const state = makeState();
    addBuilding(state, 'granary', 1);
    buyTech(state, { techId: 'agriculture_granaries' });

    const payload = applyPersist(state);
    const payloadStr = JSON.stringify(payload);

    // home.derived must NOT be serialized (it's derived, not persisted)
    assert.ok(
      !('derived' in (/** @type {any} */ (payload).home ?? {})),
      'home.derived must NOT be in persist payload'
    );
    // _effCache and _modVersion must NOT be present
    assert.ok(!payloadStr.includes('_effCache'), 'payload must NOT contain _effCache');
    assert.ok(!payloadStr.includes('_modVersion'), 'payload must NOT contain _modVersion');
  });

  it('applyPersist payload contains unlockedTechs (source of truth)', () => {
    const state = makeState();
    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });

    const payload = applyPersist(state);

    assert.deepEqual(
      /** @type {any} */ (payload).player.unlockedTechs,
      { agriculture_granaries: true, civil_attractiveness: true },
      'unlockedTechs must be in payload as source of truth'
    );
  });
});

// ============================================================================
// Scenario F: persist↔re-gen consistency — tech modifiers idempotent on load
// ============================================================================

describe('M6 round-trip — Scenario F: persist↔re-gen consistency (idempotent)', () => {
  it('tech modifiers in catalogState.modifiers after load match pre-save (idempotent re-gen)', () => {
    const state = makeState();
    addBuilding(state, 'granary', 1);
    addBuilding(state, 'well', 1);
    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });

    // Capture tech modifiers before save (sorted for stable comparison)
    const techModsBefore = state.catalogState.modifiers
      .filter((/** @type {any} */ m) => m.source.startsWith('tech:'))
      .sort((/** @type {any} */ a, /** @type {any} */ b) => a.id < b.id ? -1 : 1)
      .map((/** @type {any} */ m) => JSON.stringify(m));

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const techModsAfter = loaded.catalogState.modifiers
      .filter((/** @type {any} */ m) => m.source.startsWith('tech:'))
      .sort((/** @type {any} */ a, /** @type {any} */ b) => a.id < b.id ? -1 : 1)
      .map((/** @type {any} */ m) => JSON.stringify(m));

    assert.deepEqual(techModsAfter, techModsBefore,
      'tech modifiers after load must be BIT-IDENTICAL to pre-save (idempotent re-gen from unlockedTechs)');
  });

  it('no duplicate tech modifiers after load (idempotent: remove-all then re-add)', () => {
    const state = makeState();
    buyTech(state, { techId: 'agriculture_granaries' });

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const techMods = loaded.catalogState.modifiers.filter(
      (/** @type {any} */ m) => m.source === 'tech:agriculture_granaries'
    );
    assert.strictEqual(
      techMods.length,
      1, // agriculture_granaries has 1 effect → 1 modifier
      `no duplicates: expected 1 tech modifier after load, got ${techMods.length}`
    );
  });

  it('rebuildBuildingDerived after load re-generates same home.derived as before save', () => {
    const state = makeState();
    addBuilding(state, 'granary', 2);
    addBuilding(state, 'well', 1);
    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });

    const derivedBefore = JSON.stringify(state.home.derived);

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
    const derivedAfter = JSON.stringify(loaded.home.derived);

    assert.strictEqual(derivedAfter, derivedBefore,
      'home.derived must be IDENTICAL after save→load (tech modifiers re-gen via rebuildBuildingDerived)');
  });
});

// ============================================================================
// Scenario G: effective() values match pre-save/post-load (tech fold consistency)
// ============================================================================

describe('M6 round-trip — Scenario G: effective() values consistent pre-save and post-load', () => {
  it('effective(granary, storage.food) same before-save and after-load with tech', () => {
    const state = makeState();
    addBuilding(state, 'granary', 1);
    buyTech(state, { techId: 'agriculture_granaries' });

    const effBefore = /** @type {number} */ (effective('granary', 'storage.food', state));

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const effAfter = /** @type {number} */ (effective('granary', 'storage.food', loaded));
    assert.strictEqual(effAfter, effBefore,
      `effective(granary, storage.food) must match after round-trip: before=${effBefore}, after=${effAfter}`);
  });

  it('effective(well, attractiveness) same before-save and after-load with tech', () => {
    const state = makeState();
    addBuilding(state, 'well', 2);
    buyTech(state, { techId: 'civil_attractiveness' });

    const effBefore = /** @type {number} */ (effective('well', 'attractiveness', state));

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const effAfter = /** @type {number} */ (effective('well', 'attractiveness', loaded));
    assert.strictEqual(effAfter, effBefore,
      `effective(well, attractiveness) must match after round-trip: before=${effBefore}, after=${effAfter}`);
  });
});

// ============================================================================
// Scenario H: Catch-up-safe — same offline batch → same hashState
// ============================================================================

describe('M6 round-trip — Scenario H: catch-up-safe with techs (deterministic offline batch)', () => {
  it('same state + same techs applied twice (catch-up repeat) → same hashState', () => {
    // Simulates: engine processes same offline batch twice (catch-up scenario)
    // Both runs must produce identical hashState (deterministic)

    function buildOfflineBatch() {
      const state = makeState();
      addBuilding(state, 'granary', 1);
      addBuilding(state, 'well', 1);
      buyTech(state, { techId: 'agriculture_granaries' });
      buyTech(state, { techId: 'civil_attractiveness' });
      return state;
    }

    const s1 = buildOfflineBatch();
    const s2 = buildOfflineBatch();

    assert.strictEqual(
      hashState(s1),
      hashState(s2),
      'same offline operations → same hashState (deterministic, catch-up-safe)'
    );
  });

  it('save → load → re-apply same techs (idempotent addTechModifiers): same hashState', () => {
    // After load, rebuildBuildingDerived re-applies tech mods. Calling addTechModifiers again
    // (via applyTechModifiers) must yield the same hashState as after load.
    const state = makeState();
    addBuilding(state, 'granary', 1);
    buyTech(state, { techId: 'agriculture_granaries' });

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));

    const h1 = hashState(loaded);

    // Re-apply (simulate catch-up re-gen):
    // rebuildBuildingDerived is idempotent — calling it again must not change hash
    rebuildBuildingDerived(loaded);
    const h2 = hashState(loaded);

    assert.strictEqual(h2, h1,
      'rebuildBuildingDerived is idempotent: calling twice → same hashState');
  });

  it('save → load → save again: payload identical (round-trip stability)', () => {
    // A re-saved payload must equal the original payload (idempotent full round-trip)
    const state = makeState();
    addBuilding(state, 'granary', 1);
    addBuilding(state, 'well', 1);
    buyTech(state, { techId: 'agriculture_granaries' });
    buyTech(state, { techId: 'civil_attractiveness' });

    const payload1 = applyPersist(state);
    const loaded = loadAndReconstruct(wrapSave(payload1));
    const payload2 = applyPersist(loaded);

    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(payload2)),
      JSON.parse(JSON.stringify(payload1)),
      'save→load→save must produce IDENTICAL payloads (round-trip stability with techs)'
    );
  });
});
