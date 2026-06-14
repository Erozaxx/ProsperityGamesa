/**
 * M6 T3 — Research system: daily exp accumulation, level-up, techPt production.
 * iter-015 M6 T-006.
 *
 * Gate requirements (brief_coder_T-006_iter-015 + design §3):
 *   - research.daily exp accumulation from jobs per category
 *   - research.daily exp accumulation from academy/university buildings via effective()
 *   - level-up: while(exp>=techCap(level)) → exp-=cap, level++, grant(techPt:1)
 *   - multi-level-up in single tick (catch-up-safe while-loop)
 *   - determinism: same seed → same research state (no Math.random)
 *   - persist round-trip: research.sectors (level+exp) survive save→load
 *   - fresh-vs-load determinism with research progress (DR-012-02 class)
 *   - catch-up-safe: research batch offline → deterministic result
 *   - order 75 declared (after buildings.age 70)
 *
 * Design refs: design_iter-015.md §3.2 (M6-D7), balance.js research constants.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { techCap } from '../src/core/balance/formulas.js';
import { researchDaily } from '../src/core/systems/research.js';
import { rebuildBuildingDerived } from '../src/core/systems/buildings.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { createRegistry } from '../src/core/registry/registry.js';

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
  state.home.population.total = 100;
  state.player.gold = 10_000_000;
  return state;
}

/** Wrap payload for loadAndReconstruct */
function wrapSave(payload) {
  return { saveVersion: SAVE_VERSION, payload };
}

/** Minimal tick context with emitTx log */
function makeCtx() {
  /** @type {Array<any>} */
  const txLog = [];
  return {
    emitTx: (/** @type {any} */ tx) => txLog.push(tx),
    txLog,
    registry: null,
    periodics: [],
    catalog: null,
  };
}

/**
 * Add N instances of a building directly (bypassing build queue) and rebuild derived.
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
 * Set N workers for a job (direct state mutation for test setup).
 * @param {any} state
 * @param {string} jobId
 * @param {number} n
 */
function setWorkers(state, jobId, n) {
  if (!state.home.jobs[jobId]) {
    state.home.jobs[jobId] = { number: 0, curStep: 0 };
  }
  state.home.jobs[jobId].number = n;
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
// Sector IDs sanity
// ============================================================================

describe('research — BALANCE.research.sectorIds', () => {
  it('contains all 6 sectors from original techs.js:70', () => {
    const sectors = /** @type {any} */ (BALANCE).research.sectorIds;
    assert.ok(Array.isArray(sectors), 'sectorIds must be an array');
    const expected = ['agriculture', 'civil', 'crafts', 'forestry', 'medicine', 'military'];
    for (const s of expected) {
      assert.ok(sectors.includes(s), `sectorIds must contain '${s}'`);
    }
    assert.strictEqual(sectors.length, 6, 'sectorIds must have exactly 6 entries');
  });
});

// ============================================================================
// Exp from jobs
// ============================================================================

describe('research.daily — exp from jobs per category', () => {
  it('0 workers → no exp accumulated', () => {
    const state = makeState();
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sectors = /** @type {any} */ (state.player.research.sectors);
    // no exp → sectors empty (lazy init: sector only created when exp>0 and sectorId is in SECTOR_IDS)
    assert.strictEqual(Object.keys(sectors).length, 0, 'No sectors should be created with 0 workers');
  });

  it('10 farmers (agriculture) → agriculture gets 10 exp per tick', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 10);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sec = /** @type {any} */ (state.player.research.sectors?.agriculture);
    assert.ok(sec, 'agriculture sector should exist after farmers work');
    assert.ok(sec.exp >= 10, `agriculture exp should be >= 10 (got ${sec.exp})`);
  });

  it('10 woodcutters (forestry) → forestry gets 10 exp per tick', () => {
    const state = makeState();
    setWorkers(state, 'woodcutter', 10);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sec = /** @type {any} */ (state.player.research.sectors?.forestry);
    assert.ok(sec, 'forestry sector should exist after woodcutters work');
    assert.ok(sec.exp >= 10, `forestry exp should be >= 10 (got ${sec.exp})`);
  });

  it('10 miners (crafts) → crafts gets 10 exp per tick', () => {
    const state = makeState();
    setWorkers(state, 'miner', 10);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sec = /** @type {any} */ (state.player.research.sectors?.crafts);
    assert.ok(sec, 'crafts sector should exist after miners work');
    assert.ok(sec.exp >= 10, `crafts exp should be >= 10 (got ${sec.exp})`);
  });

  it('multiple job categories accumulate exp independently', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 5);     // agriculture
    setWorkers(state, 'woodcutter', 7); // forestry
    setWorkers(state, 'baker', 3);      // crafts
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);

    const agric = /** @type {any} */ (state.player.research.sectors?.agriculture);
    const forest = /** @type {any} */ (state.player.research.sectors?.forestry);
    const crafts = /** @type {any} */ (state.player.research.sectors?.crafts);

    assert.ok(agric && agric.exp >= 5, `agriculture exp should be >=5 (got ${agric?.exp})`);
    assert.ok(forest && forest.exp >= 7, `forestry exp should be >=7 (got ${forest?.exp})`);
    assert.ok(crafts && crafts.exp >= 3, `crafts exp should be >=3 (got ${crafts?.exp})`);
  });

  it('builder workers (category "builder") do NOT contribute exp', () => {
    const state = makeState();
    setWorkers(state, 'builder', 20);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sectors = /** @type {any} */ (state.player.research.sectors);
    // builder has category 'builder' not in JOB_SECTOR_MAP → no exp
    assert.strictEqual(Object.keys(sectors).length, 0, 'builder workers should produce no research exp');
  });
});

// ============================================================================
// Exp from academy/university buildings
// ============================================================================

describe('research.daily — exp from academy/university buildings via effective()', () => {
  it('1 academy → all sectors get researchExp bonus per tick', () => {
    const state = makeState();
    addBuilding(state, 'academy', 1);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sectors = /** @type {any} */ (state.player.research.sectors);
    // academy has researchExp=2 in buildings.json → 2*1=2 exp to ALL sectors
    // All 6 sectors should have exp>0
    const sectorIds = /** @type {any} */ (BALANCE).research.sectorIds;
    let countWithExp = 0;
    for (const sid of sectorIds) {
      if (sectors[sid] && sectors[sid].exp > 0) countWithExp++;
    }
    assert.ok(countWithExp >= 6, `All 6 sectors should have exp from academy (got ${countWithExp})`);
    // Each sector should have exp = researchExp * 1 building = 2
    for (const sid of sectorIds) {
      assert.ok(sectors[sid] && sectors[sid].exp >= 2,
        `${sid} should have exp>=2 from 1 academy (got ${sectors[sid]?.exp ?? 0})`);
    }
  });

  it('2 universities → all sectors get 2× university researchExp per tick', () => {
    const state = makeState();
    addBuilding(state, 'university', 2);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const sectors = /** @type {any} */ (state.player.research.sectors);
    // university researchExp=5 per instance; addBuildingModifiers bakes created into modifier
    // value (buildings.js §4.3: value = 5 * 2 = 10). effective() returns 10 (aggregate, not
    // per-instance). research.daily uses effective() directly — no extra ×created multiply.
    // Expected: exactly 10 per sector (5 * 2 instances = 10).
    const sectorIds = /** @type {any} */ (BALANCE).research.sectorIds;
    for (const sid of sectorIds) {
      assert.strictEqual(sectors[sid]?.exp ?? 0, 10,
        `${sid} should have exp===10 from 2 universities (got ${sectors[sid]?.exp ?? 0})`);
    }
  });

  it('combined: farmers + 1 academy → agriculture gets job+building exp', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 5); // agriculture +5
    addBuilding(state, 'academy', 1); // all +2
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const agric = /** @type {any} */ (state.player.research.sectors?.agriculture);
    // agriculture should get 5 (farmers) + 2 (academy) = 7
    assert.ok(agric && agric.exp >= 7,
      `agriculture should have exp>=7 (5 farmers + 2 academy) — got ${agric?.exp ?? 0}`);
  });
});

// ============================================================================
// Level-up + techPt production
// ============================================================================

describe('research.daily — level-up and techPt production', () => {
  it('level-up when exp >= techCap(0)=100: level becomes 1, techPt granted', () => {
    const state = makeState();
    // Set agriculture exp just below cap to verify no-level-up first
    state.player.research.sectors['agriculture'] = { level: 0, exp: 90 };
    // Add 15 farmers → +15 exp → total 105 >= techCap(0)=100 → level-up
    setWorkers(state, 'farmer', 15);
    const ctx = makeCtx();
    const ptBefore = state.player.techPt;
    researchDaily(state, {}, ctx);
    const agric = state.player.research.sectors['agriculture'];
    assert.strictEqual(agric.level, 1, 'agriculture should be at level 1 after level-up');
    assert.ok(agric.exp < techCap(1), 'remaining exp should be less than techCap(1)');
    assert.strictEqual(state.player.techPt, ptBefore + 1, 'should have granted 1 techPt');
  });

  it('multi-level-up in single tick (catch-up-safe while-loop)', () => {
    const state = makeState();
    // Set agriculture exp to 0, add enough workers to force 3 level-ups in one tick
    // techCap(0)=100, techCap(1)=125, techCap(2)=156 → need 100+125+156=381 exp in one tick
    // 400 farmers → 400 exp in one tick → 3 level-ups
    setWorkers(state, 'farmer', 400);
    const ctx = makeCtx();
    const ptBefore = state.player.techPt;
    researchDaily(state, {}, ctx);
    const agric = state.player.research.sectors['agriculture'];
    assert.ok(agric.level >= 3, `agriculture should be at level >=3 (got ${agric.level})`);
    assert.ok(state.player.techPt >= ptBefore + 3,
      `should have granted >=3 techPt (got ${state.player.techPt - ptBefore})`);
  });

  it('exact level-up boundary: exp==techCap triggers level-up', () => {
    const state = makeState();
    // Set to exactly techCap(0) - 1 = 99 exp, then add 1 exp
    state.player.research.sectors['forestry'] = { level: 0, exp: 99 };
    setWorkers(state, 'woodcutter', 1);
    const ctx = makeCtx();
    const ptBefore = state.player.techPt;
    researchDaily(state, {}, ctx);
    const forest = state.player.research.sectors['forestry'];
    assert.strictEqual(forest.level, 1, 'forestry should level up at exact cap boundary');
    assert.strictEqual(state.player.techPt, ptBefore + 1, '1 techPt should be granted on level-up');
  });

  it('exp accumulates without level-up when below cap', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 5);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const agric = state.player.research.sectors['agriculture'];
    // 5 exp → no level-up (5 < 100)
    assert.strictEqual(agric.level, 0, 'level should stay 0 with only 5 exp');
    assert.ok(agric.exp >= 5, 'exp should accumulate without level-up');
    assert.strictEqual(state.player.techPt, 0, 'no techPt granted without level-up');
  });

  it('techPt grant emits tx audit via ctx.emitTx', () => {
    const state = makeState();
    // Force level-up: add 100+ exp
    setWorkers(state, 'baker', 120); // crafts sector
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    // Should have emitted a tx for techPt grant
    const techPtTx = ctx.txLog.filter((/** @type {any} */ tx) =>
      tx.key === 'techPt' && tx.amount > 0 && tx.cause && tx.cause.startsWith('research:')
    );
    assert.ok(techPtTx.length >= 1,
      `ctx.emitTx should have been called with techPt grant (got ${ctx.txLog.length} tx total)`);
    assert.ok(techPtTx[0].cause.includes('crafts'),
      `cause should include sector 'crafts' (got ${techPtTx[0].cause})`);
  });
});

// ============================================================================
// Determinism
// ============================================================================

describe('research.daily — determinism (no Math.random)', () => {
  it('same initial state + same workers → same research state after tick', () => {
    const state1 = makeState();
    const state2 = makeState();
    setWorkers(state1, 'farmer', 10);
    setWorkers(state2, 'farmer', 10);
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    researchDaily(state1, {}, ctx1);
    researchDaily(state2, {}, ctx2);
    assert.deepStrictEqual(
      state1.player.research.sectors,
      state2.player.research.sectors,
      'research sectors must be identical for same inputs (no RNG)'
    );
    assert.strictEqual(state1.player.techPt, state2.player.techPt,
      'techPt must be identical for same inputs');
  });

  it('batch of N ticks gives same result as N individual ticks (catch-up-safe)', () => {
    // Simulate 3 days of research in 3 separate ticks
    const stateA = makeState();
    const stateB = makeState();
    setWorkers(stateA, 'farmer', 10);
    setWorkers(stateB, 'farmer', 10);

    // State A: 3 separate ticks
    for (let i = 0; i < 3; i++) {
      researchDaily(stateA, {}, makeCtx());
    }
    // State B: 1 tick with 3× the exp (simulating catch-up: 30 farmers for 1 tick = 3×10)
    setWorkers(stateB, 'farmer', 30);
    researchDaily(stateB, {}, makeCtx());

    // Both should produce same total exp/levels (catch-up invariant)
    const agricA = stateA.player.research.sectors?.agriculture;
    const agricB = stateB.player.research.sectors?.agriculture;
    const totalExpA = (agricA?.level ?? 0) * 1000 + (agricA?.exp ?? 0) + (stateA.player.techPt ?? 0) * 1000;
    const totalExpB = (agricB?.level ?? 0) * 1000 + (agricB?.exp ?? 0) + (stateB.player.techPt ?? 0) * 1000;
    // Note: catch-up via batch workers is equivalent to per-day accumulation
    // The while-loop ensures correct level-ups in both paths
    assert.strictEqual(totalExpA, totalExpB,
      `Catch-up: 3 ticks of 10 workers vs 1 tick of 30 workers should yield same result`);
  });
});

// ============================================================================
// Persist round-trip
// ============================================================================

describe('research — persist round-trip (level+exp survive save→load)', () => {
  it('research.sectors level+exp survive save→load', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 5);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    // Mutate some exp for a clear test value
    state.player.research.sectors['agriculture'] = { level: 1, exp: 42 };
    state.player.research.sectors['forestry'] = { level: 0, exp: 17 };

    const payload = applyPersist(state);
    // Verify research is in payload
    assert.ok(payload.player, 'payload.player must exist');
    const pp = /** @type {any} */ (payload.player);
    assert.ok(pp.research, 'payload.player.research must exist');
    assert.ok(pp.research.sectors, 'payload.player.research.sectors must exist');
    assert.deepStrictEqual(pp.research.sectors['agriculture'], { level: 1, exp: 42 },
      'agriculture sector must survive persist');
    assert.deepStrictEqual(pp.research.sectors['forestry'], { level: 0, exp: 17 },
      'forestry sector must survive persist');

    // Load and verify
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
    assert.ok(loaded.player.research, 'loaded state must have research');
    assert.deepStrictEqual(loaded.player.research.sectors['agriculture'], { level: 1, exp: 42 },
      'agriculture sector must survive load');
    assert.deepStrictEqual(loaded.player.research.sectors['forestry'], { level: 0, exp: 17 },
      'forestry sector must survive load');
  });

  it('payload contains only level+exp per sector (system only writes those fields)', () => {
    // The researchDaily system only ever writes {level, exp} to sectors (never cap/progPct).
    // This test verifies that a normal usage path produces a payload with only level+exp.
    const state = makeState();
    setWorkers(state, 'farmer', 10);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    const payload = applyPersist(state);
    const pp = /** @type {any} */ (payload.player);
    assert.ok(pp.research?.sectors, 'payload.player.research.sectors must exist');
    for (const [sid, sec] of Object.entries(pp.research.sectors)) {
      const s = /** @type {any} */ (sec);
      assert.ok('level' in s, `sector ${sid} must have level in payload`);
      assert.ok('exp' in s, `sector ${sid} must have exp in payload`);
      // cap and progPct are NEVER written by researchDaily → should not be in payload
      assert.ok(!('cap' in s), `sector ${sid} must NOT have cap in payload (derived field)`);
      assert.ok(!('progPct' in s), `sector ${sid} must NOT have progPct in payload (derived field)`);
    }
  });

  it('fresh-vs-load determinism with research progress (DR-012-02)', () => {
    // After some research progress: fresh state and load(save(fresh)) should be bit-identical
    const state = makeState();
    setWorkers(state, 'farmer', 10);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);

    const h0 = hashState(state);
    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
    const h1 = hashState(loaded);
    assert.strictEqual(h0, h1,
      'hashState must be BIT-IDENTICAL after save→load with research progress (DR-012-02)');
  });

  it('multiple ticks of research + save→load: hashState bit-identical', () => {
    const state = makeState();
    setWorkers(state, 'farmer', 10);
    setWorkers(state, 'woodcutter', 5);
    addBuilding(state, 'academy', 1);
    const ctx = makeCtx();
    // Run 3 research ticks
    for (let i = 0; i < 3; i++) {
      researchDaily(state, {}, ctx);
    }
    const h0 = hashState(state);
    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct(wrapSave(payload)));
    const h1 = hashState(loaded);
    assert.strictEqual(h0, h1,
      'hashState must be BIT-IDENTICAL after 3 research ticks + save→load');
  });
});

// ============================================================================
// tickOrder registration check (order 75, after buildings.age 70)
// ============================================================================

describe('research.daily — tickOrder registration', () => {
  it('research.daily is registered as a periodic with edge=day, order=75', () => {
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const researchPeriodic = periodics.find((/** @type {any} */ p) => p.id === 'research.daily');
    assert.ok(researchPeriodic, 'research.daily must be registered as a periodic');
    assert.strictEqual(researchPeriodic.every, 'day', 'research.daily must run on day edge');
    assert.strictEqual(researchPeriodic.order, 75, 'research.daily must have order 75');
  });

  it('research.daily order is > buildings.age order (75 > 70)', () => {
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);
    const research = periodics.find((/** @type {any} */ p) => p.id === 'research.daily');
    const buildings = periodics.find((/** @type {any} */ p) => p.id === 'buildings.age');
    assert.ok(research && buildings, 'both research.daily and buildings.age must be registered');
    assert.ok(research.order > buildings.order,
      `research.daily order (${research.order}) must be > buildings.age order (${buildings.order})`);
  });
});

// ============================================================================
// Lazy sector init
// ============================================================================

describe('research.daily — lazy sector init', () => {
  it('sector created lazily on first accumulation (not pre-created)', () => {
    const state = makeState();
    // Fresh state: no sectors
    assert.deepStrictEqual(state.player.research.sectors, {}, 'No sectors pre-created');
    setWorkers(state, 'farmer', 5);
    const ctx = makeCtx();
    researchDaily(state, {}, ctx);
    // Only agriculture should exist (from farmer)
    const sectors = state.player.research.sectors;
    assert.ok('agriculture' in sectors, 'agriculture sector created after farmer tick');
    // Sectors with no exp source should not exist
    assert.ok(!('medicine' in sectors), 'medicine sector should not be created without workers');
    assert.ok(!('military' in sectors), 'military sector should not be created without workers');
    assert.ok(!('civil' in sectors), 'civil sector should not be created without workers');
  });

  it('fresh state research.sectors is {} (from createPlayerState)', () => {
    const state = /** @type {any} */ (createInitialState());
    assert.ok(state.player.research, 'research must exist in fresh state');
    assert.deepStrictEqual(state.player.research, { sectors: {} },
      'research must be {sectors:{}} in fresh state (M-1 determinism)');
  });
});
