/**
 * M3 extended tests – iter-009 T-003 (Tester pass).
 * Covers:
 *  - Tabular forest regen with exact computed values
 *  - Forest 10-day periodicity via full tick loop
 *  - workerEfficiency system writes to state + clamp
 *  - Catch-up-safe invariant per system across day/quarterDay/month edges (live == batch)
 *  - Save round-trip: progPct NOT in payload
 *  - Negative edge cases: mine with 0 ores, no workers → no production, empty stock
 *  - RNG stream determinism: mine/field separate from forest
 *  - Forest area cap: trees do not exceed forestArea
 *  - Jobs: no production when nobody assigned
 *  - Skills: no progress when progressing=false
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng, hashState } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { forestArea, fieldArea, mineArea } from '../src/core/balance/formulas.js';
import { forestRegen } from '../src/core/systems/forest.js';
import { fieldDaily } from '../src/core/systems/field.js';
import { mineDaily } from '../src/core/systems/mine.js';
import { workerEfficiencyDaily } from '../src/core/systems/workerEfficiency.js';
import { workerEfficiency } from '../src/core/balance/formulas.js';
import { skillsProgress } from '../src/core/systems/skills.js';
import { jobsProduction, autoAssignWorkers } from '../src/core/systems/jobs.js';
import { assignJob } from '../src/core/commands/assignJob.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { runCatchupBatch } from '../src/core/engine/catchup.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function createCtxWithCatalog() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const jobsCat = loadJson('jobs');
  const skillsCat = loadJson('skills');
  const houseTypesCat = loadJson('houseTypes');
  return {
    registry,
    periodics,
    catalog: {
      jobs: Array.isArray(jobsCat.jobs) ? jobsCat.jobs : [],
      skills: Array.isArray(skillsCat.skills) ? skillsCat.skills : [],
      houseTypes: Array.isArray(houseTypesCat.houseTypes) ? houseTypesCat.houseTypes : [],
    },
  };
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'skills']) {
    loadCatalog(name, loadJson(name));
  }
});

// ─────────────────────────────────────────────────────────────
// TC-001: forestRegen tabular – exact values
// ─────────────────────────────────────────────────────────────

describe('TC-001: forestRegen tabular – exact expected values (spring, health=100)', () => {
  it('animals increase by ceil(curAnimals*0.0075 + curTrees/(curAnimals*10.5+20)) + 70 in spring', () => {
    // Given: fresh state, season=spring, health=100
    const state = createInitialState({ seed: 0xAAAA1111 });
    initRng(state);
    state.season.curSeason = 0; // spring

    const trees0 = state.world.forest.curTrees;   // 27173
    const animals0 = state.world.forest.curAnimals; // 3864

    // When
    forestRegen(state, {}, {});

    // Then: animal growth formula (no fire check in spring)
    // base growth = ceil(3864*0.0075 + 27173/(3864*10.5+20))
    const baseGrowth = Math.ceil(animals0 * 0.0075 + trees0 / (animals0 * 10.5 + 20));
    const seasonBonus = 70; // spring bonus
    const expectedMinAnimals = animals0 + baseGrowth + seasonBonus;

    // Cull may reduce if curAnimals > curTrees/5
    const afterGrowth = animals0 + baseGrowth + seasonBonus;
    const mayBeCulled = afterGrowth > state.world.forest.curTrees / 5;
    if (!mayBeCulled) {
      assert.strictEqual(state.world.forest.curAnimals, expectedMinAnimals,
        `animals should be ${expectedMinAnimals} (base+${baseGrowth} + spring+70)`);
    } else {
      // Cull: diff = afterGrowth - curTrees/5; animals -= floor(diff/5)
      const diff = afterGrowth - state.world.forest.curTrees / 5;
      const culled = Math.floor(diff / 5);
      const expected = afterGrowth - culled;
      assert.strictEqual(state.world.forest.curAnimals, expected,
        `animals culled: expected ${expected}`);
    }
  });

  it('saplings queue shifts and grows each cycle', () => {
    const state = createInitialState({ seed: 0xBBBB2222 });
    initRng(state);
    state.season.curSeason = 1; // summer – no fire risk

    // saplings start all-zero
    assert.deepEqual(state.world.forest.saplings, new Array(10).fill(0));
    const trees0 = state.world.forest.curTrees;

    // First regen: shift(0), push(trees*0.004), no spring bonus
    forestRegen(state, {}, {});

    // Queue length stays 10
    assert.strictEqual(state.world.forest.saplings.length, 10);
    // First element was shifted (0), new element pushed at tail
    const expectedNew = trees0 * 0.004; // health=100 → no reduction
    // Last element in saplings is the newly pushed sapling count
    const lastSapling = state.world.forest.saplings[9];
    // With health=100, no reduction: saplings[9] ≈ expectedNew
    assert.ok(Math.abs(lastSapling - expectedNew) < 1,
      `last sapling should be ~${expectedNew.toFixed(2)}, got ${lastSapling.toFixed(2)}`);
  });

  it('fire risk triggers at timeSinceLastFire > 23 in autumn (deterministic)', () => {
    // Use seed that forces fire (high tree density → high risk close to 1)
    // Create state with max trees (fills area) to make risk ≈ 1
    const state = createInitialState({ seed: 0xDEAD0001 });
    initRng(state);
    state.season.curSeason = 2; // autumn
    state.world.forest.timeSinceLastFire = 25; // > 23 → fire check active

    const level = state.home.settlementLevel || 0;
    const area = forestArea(level);
    // Set trees to fill area → risk = (curTrees/area)^2 → near 1
    state.world.forest.curTrees = area - 100;
    state.world.forest.curAnimals = Math.floor((area - 100) / 5) - 1; // avoid cull

    const treesBefore = state.world.forest.curTrees;
    forestRegen(state, {}, {});

    // timeSinceLastFire reset to 0 after fire check (regardless of fire happening)
    assert.strictEqual(state.world.forest.timeSinceLastFire, 0,
      'timeSinceLastFire should reset to 0 after fire check');

    // With trees near area, risk=(area-100)/area)^2 ≈ 1 so fire is very likely
    // If fire happened: curTrees = round(original * 0.5)
    const fireHappened = state.world.forest.curTrees < treesBefore * 0.9;
    if (fireHappened) {
      const expected = Math.round(treesBefore * 0.5);
      // trees after fire = round(before * 0.5); small sapling additions may differ slightly
      assert.ok(Math.abs(state.world.forest.curTrees - expected) <= 2,
        `fire: curTrees should be ~round(${treesBefore}*0.5)=${expected}, got ${state.world.forest.curTrees}`);
      assert.strictEqual(state.world.forest.lastFire, state.engine.curStep,
        'lastFire should be set to current step');
    }
    // Either way, timeSinceLastFire is 0
  });
});

// ─────────────────────────────────────────────────────────────
// TC-002: forest.regen runs via tickOrder after exactly 10 days
// ─────────────────────────────────────────────────────────────

describe('TC-002: forest.regen runs on 10days edge via full tick loop', () => {
  it('curTrees unchanged before 9000 steps, can change at step 9000', () => {
    const state = createInitialState({ seed: 0x11110000 });
    initRng(state);
    state.home.food.store = { bread: 99999, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    state.season.curSeason = 1; // summer – no fire, predictable

    const ctx = createCtxWithCatalog();
    const trees0 = state.world.forest.curTrees;

    // Run 8999 steps (just before 10 days)
    for (let i = 0; i < 8999; i++) step(state, ctx);
    // Trees should not have changed yet (no 10days edge hit)
    assert.strictEqual(state.world.forest.curTrees, trees0,
      'trees should not change before 10-day edge');

    // Run 1 more step (step 9000 = 10days edge)
    step(state, ctx);
    // After 10 days, forestRegen has run; trees may increase (saplings start at 0 so matured=0 first cycle)
    // but crucially the state was touched; specifically saplings queue has been shifted/pushed
    // Verify queue has been updated: last element should be non-zero now
    const lastSapling = state.world.forest.saplings[9];
    assert.ok(lastSapling > 0, `after first regen cycle, last sapling should be > 0, got ${lastSapling}`);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-003: workerEfficiency clamp [0.25, 2] via formula
// ─────────────────────────────────────────────────────────────

describe('TC-003: workerEfficiency clamp [0.25, 2]', () => {
  it('clamps below → 0.25', () => {
    assert.strictEqual(workerEfficiency({ base: 1, minWorkerPenalty: -10 }), 0.25);
  });

  it('clamps above → 2', () => {
    assert.strictEqual(workerEfficiency({ base: 1, goodSpiritsBonus: 10 }), 2);
  });

  it('curfew subtracts 0.25 before clamp', () => {
    // base=1, curfew=true → 1-0.25=0.75; not clamped
    assert.strictEqual(workerEfficiency({ base: 1, curfew: true }), 0.75);
  });

  it('curfew + heavy penalty still clamps to 0.25', () => {
    assert.strictEqual(workerEfficiency({ base: 1, minWorkerPenalty: -10, curfew: true }), 0.25);
  });

  it('workerEfficiencyDaily writes to state.home.workerEfficiency', () => {
    const state = createInitialState();
    // Mutate before to check it gets written
    state.home.workerEfficiency = 0.5;
    workerEfficiencyDaily(state, {}, {});
    // M3: all morale parts = 0, curfew=false → efficiency = 1
    assert.strictEqual(state.home.workerEfficiency, 1);
  });

  it('workerEfficiency system writes before jobs.production reads it (tickOrder: day order 5 before quarterDay)', () => {
    // Verify the system writes workerEfficiency=1 at start of each day
    const state = createInitialState({ seed: 0xCAFE1234 });
    initRng(state);
    state.home.population.total = 50;
    state.home.food.store = { bread: 99999, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    state.home.workerEfficiency = 0; // start at 0
    state.home.jobs = { baker: { number: 5, curStep: 0 } };

    const ctx = createCtxWithCatalog();
    // Run exactly 900 steps (1 day): day edge fires at step 900
    for (let i = 0; i < 900; i++) step(state, ctx);

    // After day edge, workerEfficiency should be 1 (written by workerEfficiencyDaily)
    assert.strictEqual(state.home.workerEfficiency, 1,
      'workerEfficiency should be 1 after day tick in M3');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-004: Catch-up-safe invariant – live N == batch N, all M3 systems
// ─────────────────────────────────────────────────────────────

describe('TC-004: Catch-up-safe – live == batch (same hash)', () => {
  function buildBaseState(seed) {
    const s = createInitialState({ seed });
    initRng(s);
    s.home.population.total = 100;
    s.home.food.store = { bread: 99999, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
    s.home.workerEfficiency = 1;
    return s;
  }

  it('5 days (4500 steps) – crosses day/quarterDay edges', async () => {
    const SEED = 0xAABBCCDD;
    const N = 4500; // 5 days

    // Direct run
    const s1 = buildBaseState(SEED);
    const ctx1 = createCtxWithCatalog();
    for (let i = 0; i < N; i++) step(s1, ctx1);

    // Batch run
    const s2 = buildBaseState(SEED);
    const ctx2 = createCtxWithCatalog();
    await runCatchupBatch({ state: s2, ctx: ctx2, totalSteps: N, wasCapped: false });

    assert.strictEqual(hashState(s1), hashState(s2),
      '5-day catch-up must produce same hash as direct run');
  });

  it('30 days (27000 steps) – crosses month and 10days edges (forestRegen)', async () => {
    const SEED = 0x12344321;
    const N = 27000; // 30 days (includes 3× forest.regen on 10days and 1× month)

    const s1 = buildBaseState(SEED);
    const ctx1 = createCtxWithCatalog();
    for (let i = 0; i < N; i++) step(s1, ctx1);

    const s2 = buildBaseState(SEED);
    const ctx2 = createCtxWithCatalog();
    await runCatchupBatch({ state: s2, ctx: ctx2, totalSteps: N, wasCapped: false, chunkSteps: 5000 });

    assert.strictEqual(hashState(s1), hashState(s2),
      '30-day catch-up (forest regen + month edge) must match direct run');
  });

  it('forest: world.forest state identical live vs batch after 10 days', async () => {
    const SEED = 0xF0CACC1A;
    const N = 9000; // exactly 10 days

    const s1 = buildBaseState(SEED);
    const ctx1 = createCtxWithCatalog();
    for (let i = 0; i < N; i++) step(s1, ctx1);

    const s2 = buildBaseState(SEED);
    const ctx2 = createCtxWithCatalog();
    await runCatchupBatch({ state: s2, ctx: ctx2, totalSteps: N, wasCapped: false });

    assert.deepEqual(s1.world.forest, s2.world.forest,
      'world.forest must be identical after 10-day live vs batch');
    assert.deepEqual(s1.world.mine, s2.world.mine,
      'world.mine must be identical after 10-day live vs batch');
    assert.deepEqual(s1.world.field, s2.world.field,
      'world.field must be identical after 10-day live vs batch');
  });

  it('jobs/workerEfficiency/skills: home state identical live vs batch after 5 days', async () => {
    const SEED = 0xFEEDFACE;
    const N = 4500; // 5 days

    const s1 = buildBaseState(SEED);
    s1.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };
    s1.home.jobs = { baker: { number: 5, curStep: 0 } };
    s1.home.workforce = { total: 50, assigned: 5 };
    const ctx1 = createCtxWithCatalog();
    for (let i = 0; i < N; i++) step(s1, ctx1);

    const s2 = buildBaseState(SEED);
    s2.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };
    s2.home.jobs = { baker: { number: 5, curStep: 0 } };
    s2.home.workforce = { total: 50, assigned: 5 };
    const ctx2 = createCtxWithCatalog();
    await runCatchupBatch({ state: s2, ctx: ctx2, totalSteps: N, wasCapped: false });

    assert.strictEqual(hashState(s1), hashState(s2),
      'jobs/skills/workerEfficiency catch-up must match direct run');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-005: Save round-trip – progPct NOT in payload
// ─────────────────────────────────────────────────────────────

describe('TC-005: Save round-trip – progPct NOT serialized', () => {
  it('progPct absent from applyPersist payload for skills', () => {
    const state = createInitialState();
    state.home.skills = {
      woodworking: { progressing: true, curStep: 15, progPct: 60 },
    };

    const payload = applyPersist(state);

    // progPct must NOT be in skills payload
    const skillPayload = /** @type {any} */ (payload).home?.skills?.woodworking;
    assert.ok(skillPayload, 'skills.woodworking should be in payload');
    assert.ok(!('progPct' in skillPayload),
      'progPct must NOT be in the serialized payload (derived field)');
    assert.ok('progressing' in skillPayload, 'progressing must be saved');
    assert.ok('curStep' in skillPayload, 'curStep must be saved');
  });

  it('progPct absent from payload for jobs', () => {
    const state = createInitialState();
    state.home.jobs = { baker: { number: 5, curStep: 30 } };

    const payload = applyPersist(state);
    const jobPayload = /** @type {any} */ (payload).home?.jobs?.baker;
    assert.ok(jobPayload, 'jobs.baker should be in payload');
    // jobs only persist number and curStep
    assert.ok(!('progPct' in jobPayload), 'progPct must not be in jobs payload');
    assert.strictEqual(jobPayload.number, 5);
    assert.strictEqual(jobPayload.curStep, 30);
  });

  it('load reconstructs progPct=0 (re-derived, not persisted)', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 15, progPct: 60 } };

    const payload = applyPersist(state);
    const s2 = loadAndReconstruct(payload);

    // After load, progPct is 0 (re-derived; system recalculates on next step)
    assert.strictEqual((s2.home.skills?.woodworking ?? {}).progPct ?? 0, 0,
      'progPct should be 0 after load (re-derived, not persisted)');
    // But progressing and curStep must survive
    assert.ok(s2.home.skills?.woodworking?.progressing, 'progressing must survive round-trip');
    assert.strictEqual(s2.home.skills?.woodworking?.curStep, 15, 'curStep must survive round-trip');
  });

  it('world.forest – only dynamic fields are in payload (not derived area/used)', () => {
    const state = createInitialState();
    const payload = applyPersist(state);
    const fp = /** @type {any} */ (payload).world?.forest;
    assert.ok(fp, 'world.forest should be in payload');
    // Dynamic fields that should be saved
    assert.ok('curTrees' in fp, 'curTrees must be saved');
    assert.ok('curAnimals' in fp, 'curAnimals must be saved');
    assert.ok('saplings' in fp, 'saplings must be saved');
    assert.ok('health' in fp, 'health must be saved');
    // Derived: area and used must NOT be in payload
    assert.ok(!('area' in fp), 'area must NOT be in payload (derived)');
    assert.ok(!('used' in fp), 'used must NOT be in payload (derived)');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-006: Negative edge – 0 workers → no production
// ─────────────────────────────────────────────────────────────

describe('TC-006: Negative – no workers → no production', () => {
  it('jobsProduction produces nothing when all jobs have number=0', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 0;
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 0, curStep: 0 } };

    const ctx = createCtxWithCatalog();
    const breadBefore = state.home.food.store.bread || 0;

    for (let i = 0; i < 1000; i++) {
      jobsProduction(state, {}, ctx);
    }

    // curStep should stay 0 (no accumulation)
    assert.strictEqual(state.home.jobs.baker.curStep, 0,
      'curStep must stay 0 when number=0');
    // No bread produced
    assert.strictEqual(state.home.food.store.bread || 0, breadBefore,
      'no bread when no workers');
  });

  it('jobsProduction curStep does not change when number=0 even if curStep is non-zero', () => {
    // A job with curStep already at 44 but number=0
    const state = createInitialState();
    initRng(state);
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 0, curStep: 44 } };

    const ctx = createCtxWithCatalog();
    jobsProduction(state, {}, ctx);

    // number=0 → skip job entirely → curStep unchanged
    assert.strictEqual(state.home.jobs.baker.curStep, 44,
      'curStep must not change when number=0 (job is skipped)');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-007: Negative edge – mine with 0 ores (exhausted stock)
// ─────────────────────────────────────────────────────────────

describe('TC-007: Negative – mine curOres = 0 (exhausted)', () => {
  it('mineDaily does not trigger expander when curOres = 0 (stock is below threshold)', () => {
    // When curOres=0 < 300: RNG is consumed but expander is no-op in M3
    const state = createInitialState({ seed: 0xDEAD0002 });
    initRng(state);
    state.world.mine.curOres = 0;

    // Record RNG stream position before
    const rngBefore = state.rng.streams['mine'];

    mineDaily(state, {}, {});

    // curOres stays 0 (M3 expander is no-op)
    assert.strictEqual(state.world.mine.curOres, 0, 'curOres should remain 0 (M3 expander is no-op)');

    // RNG WAS consumed (curOres < threshold → roll happens)
    const rngAfter = state.rng.streams['mine'];
    assert.notStrictEqual(rngBefore, rngAfter,
      'mine RNG stream should be consumed when curOres < expanderThreshold');
  });

  it('mineDaily does NOT consume RNG when curOres >= expanderThreshold (300)', () => {
    const state = createInitialState({ seed: 0xDEAD0003 });
    initRng(state);
    state.world.mine.curOres = 20000; // far above threshold

    const rngBefore = state.rng.streams['mine'];
    mineDaily(state, {}, {});
    const rngAfter = state.rng.streams['mine'];

    assert.strictEqual(rngBefore, rngAfter,
      'mine RNG stream must NOT be consumed when curOres >= 300');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-008: RNG stream determinism – forest/mine/field streams independent
// ─────────────────────────────────────────────────────────────

describe('TC-008: RNG stream determinism – streams are independent', () => {
  it('forest and mine streams are different pointers (separate states)', () => {
    const state = createInitialState({ seed: 0xAAA0001 });
    initRng(state);

    const forestStream0 = state.rng.streams['forest'];
    const mineStream0 = state.rng.streams['mine'];
    const fieldStream0 = state.rng.streams['field'];

    // They should all be initialized to distinct values
    assert.notStrictEqual(forestStream0, mineStream0, 'forest and mine streams must differ');
    assert.notStrictEqual(forestStream0, fieldStream0, 'forest and field streams must differ');
    assert.notStrictEqual(mineStream0, fieldStream0, 'mine and field streams must differ');
  });

  it('consuming mine RNG does not affect forest RNG stream', () => {
    const state = createInitialState({ seed: 0xAAA0002 });
    initRng(state);
    state.world.mine.curOres = 0; // force expander roll

    const forestBefore = state.rng.streams['forest'];
    mineDaily(state, {}, {});
    const forestAfter = state.rng.streams['forest'];

    assert.strictEqual(forestBefore, forestAfter,
      'mineDaily must not affect forest RNG stream');
  });

  it('consuming forest RNG does not affect mine RNG stream', () => {
    const state = createInitialState({ seed: 0xAAA0003 });
    initRng(state);
    state.season.curSeason = 2; // autumn
    state.world.forest.timeSinceLastFire = 25; // trigger fire check

    const mineBefore = state.rng.streams['mine'];
    forestRegen(state, {}, {});
    const mineAfter = state.rng.streams['mine'];

    assert.strictEqual(mineBefore, mineAfter,
      'forestRegen must not affect mine RNG stream');
  });

  it('two runs with same seed produce identical world state (forest determinism)', () => {
    function runForest(seed) {
      const s = createInitialState({ seed });
      initRng(s);
      s.season.curSeason = 2; // autumn with fire chance
      s.world.forest.timeSinceLastFire = 25;
      s.world.forest.curTrees = forestArea(0) - 100; // near capacity → high fire risk
      s.world.forest.curAnimals = 100;
      forestRegen(s, {}, {});
      return { curTrees: s.world.forest.curTrees, curAnimals: s.world.forest.curAnimals, lastFire: s.world.forest.lastFire };
    }

    const r1 = runForest(0xFACEFACE);
    const r2 = runForest(0xFACEFACE);
    assert.deepEqual(r1, r2, 'same seed forest result must be identical');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-009: Forest area cap – trees do not exceed forestArea
// ─────────────────────────────────────────────────────────────

describe('TC-009: Forest area cap – trees capped at forestArea - 100', () => {
  it('when trees near area, matured is clamped so trees do not exceed area-100', () => {
    const state = createInitialState({ seed: 0xCAFECAFE });
    initRng(state);
    state.season.curSeason = 1; // summer, no fire

    const level = state.home.settlementLevel || 0;
    const area = forestArea(level); // 33000

    // Set curTrees to area-50 (very close to cap)
    state.world.forest.curTrees = area - 50;
    // Add a sapling that would mature by shift
    state.world.forest.saplings[0] = 500; // large matured value

    forestRegen(state, {}, {});

    // Trees should not exceed area - 100 (cap logic: if area < used+matured+100 → cap)
    assert.ok(state.world.forest.curTrees <= area,
      `trees ${state.world.forest.curTrees} must not exceed forestArea ${area}`);
    // Specifically should be <= area - 100 + some small addition (from matured cap)
    // The cap formula: matured = max(0, area - used - 100)
    // used = round(curTrees before regen) = area-50; area < used+500+100 → cap applies
    // matured_capped = max(0, area - (area-50) - 100) = max(0, -50) = 0
    // So curTrees += 0 = area-50 still
    assert.strictEqual(state.world.forest.curTrees, area - 50,
      'trees should stay at area-50 when cap prevents maturation');
  });

  it('forestArea formula: level 0 = 33000, level 1 = 36000, level 2 = round(28000+1.6^2*5000)', () => {
    assert.strictEqual(forestArea(0), 33000);
    assert.strictEqual(forestArea(1), Math.round(28000 + 1.6 * 5000));
    assert.strictEqual(forestArea(2), Math.round(28000 + Math.pow(1.6, 2) * 5000));
  });

  it('fieldArea formula: level 0 = 1650, level 2 = round(450+4*1200)', () => {
    assert.strictEqual(fieldArea(0), 1650);
    assert.strictEqual(fieldArea(2), Math.round(450 + Math.pow(2, 2) * 1200));
  });

  it('mineArea: level 0 unlocked = 1000, level 3 = 1000+3*800=3400', () => {
    assert.strictEqual(mineArea(0, true), 1000);
    assert.strictEqual(mineArea(3, true), 3400);
    assert.strictEqual(mineArea(5, false), 0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-010: Skills – no progress when progressing=false
// ─────────────────────────────────────────────────────────────

describe('TC-010: Skills – no progress when progressing=false', () => {
  it('skillsProgress does NOT increment curStep when progressing=false', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: false, curStep: 0, progPct: 0 } };
    const ctx = createCtxWithCatalog();

    for (let i = 0; i < 100; i++) {
      skillsProgress(state, {}, ctx);
    }

    assert.strictEqual(state.home.skills.woodworking.curStep, 0,
      'curStep must stay 0 when progressing=false');
    assert.ok(!state.home.skills.woodworking.progressing,
      'progressing must remain false');
  });

  it('progPct clamps at 100 at completion boundary', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 24, progPct: 96 } };
    const ctx = createCtxWithCatalog();

    // Run 1 more step: curStep becomes 25 which equals effMaxStep=25 (not > 25 yet)
    skillsProgress(state, {}, ctx);
    assert.strictEqual(state.home.skills.woodworking.curStep, 25);
    // progPct = min(round(25*100/25), 100) = 100
    assert.strictEqual(state.home.skills.woodworking.progPct, 100,
      'progPct should be 100 when curStep == effMaxStep');
    assert.ok(state.home.skills.woodworking.progressing,
      'skill should still be progressing at curStep == effMaxStep (needs curStep > effMaxStep)');

    // One more step: curStep=26 > 25 → completion
    skillsProgress(state, {}, ctx);
    assert.ok(!state.home.skills.woodworking.progressing,
      'should complete at step 26');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-011: Jobs production – exact step-by-step table
// ─────────────────────────────────────────────────────────────

describe('TC-011: Jobs production – exact tabular verification', () => {
  it('baker: number=10, eff=1, maxStep=0.005 → completes at quarterDay 5, grants bread=20', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 100;
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 10, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    // completionUnits = 0.005 * 900 * 10 = 45
    // Each QD: curStep += 1 * 10 = 10
    // QD1: 10, QD2: 20, QD3: 30, QD4: 40, QD5: 50 > 45 → completion

    for (let qd = 1; qd <= 4; qd++) {
      jobsProduction(state, {}, ctx);
      assert.strictEqual(state.home.jobs.baker.curStep, qd * 10,
        `after QD ${qd}: curStep should be ${qd * 10}`);
    }

    // QD5: completion
    const breadBefore = state.home.food.store.bread || 0;
    jobsProduction(state, {}, ctx);
    assert.strictEqual(state.home.jobs.baker.curStep, 0, 'curStep resets to 0');

    // baker products: bread=2 per catalog; scaled by number=10 → 20
    const breadGained = (state.home.food.store.bread || 0) - breadBefore;
    assert.strictEqual(breadGained, 20, 'baker should grant 2*10=20 bread on completion');
  });

  it('eff=2 completes faster: curStep += 2*10=20/QD → completes at QD3 (60>45)', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 100;
    state.home.workerEfficiency = 2;
    state.home.jobs = { baker: { number: 10, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    // QD1: 20, QD2: 40, QD3: 60 > 45 → completion
    jobsProduction(state, {}, ctx); // QD1: 20
    assert.strictEqual(state.home.jobs.baker.curStep, 20);

    jobsProduction(state, {}, ctx); // QD2: 40
    assert.strictEqual(state.home.jobs.baker.curStep, 40);

    const breadBefore = state.home.food.store.bread || 0;
    jobsProduction(state, {}, ctx); // QD3: 60 > 45 → completion
    assert.strictEqual(state.home.jobs.baker.curStep, 0, 'should complete at QD3 with eff=2');
    const breadGained = (state.home.food.store.bread || 0) - breadBefore;
    assert.strictEqual(breadGained, 20, 'bread granted at QD3 (eff=2)');
  });

  it('workerEfficiency clamped at 0.25: slow production', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 100;
    state.home.workerEfficiency = 0.25; // clamped minimum
    state.home.jobs = { baker: { number: 10, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    // Each QD: curStep += 0.25 * 10 = 2.5
    // completionUnits = 45; need curStep > 45; 45/2.5 = 18 QDs
    for (let qd = 0; qd < 17; qd++) {
      jobsProduction(state, {}, ctx);
      // Should not have completed yet
      assert.ok(state.home.jobs.baker.curStep > 0 || qd === 0,
        `should not complete before QD18 (got reset at QD${qd})`);
    }

    // After 18 QDs: 18 * 2.5 = 45 (not > 45, so not yet)
    jobsProduction(state, {}, ctx); // QD 18: 18*2.5 = 45 (not > 45)
    assert.ok(state.home.jobs.baker.curStep > 0, 'should not complete at exactly 45 (needs > 45)');

    // QD 19: 19 * 2.5 = 47.5 > 45 → completion
    const breadBefore = state.home.food.store.bread || 0;
    jobsProduction(state, {}, ctx);
    assert.strictEqual(state.home.jobs.baker.curStep, 0, 'should complete at QD19 with eff=0.25');
    const breadGained = (state.home.food.store.bread || 0) - breadBefore;
    assert.strictEqual(breadGained, 20, 'bread granted at QD19 (eff=0.25)');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-012: Skills 2× compensation – exact table
// ─────────────────────────────────────────────────────────────

describe('TC-012: Skills 2× compensation (maxStep·0.5)', () => {
  it('woodworking maxStep=50, stepComp=0.5 → effMaxStep=25; complete at step 26 not step 51', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };
    const ctx = createCtxWithCatalog();

    for (let i = 1; i <= 25; i++) {
      skillsProgress(state, {}, ctx);
      assert.ok(state.home.skills.woodworking.progressing,
        `should still be progressing at step ${i}`);
    }

    // Step 26: curStep becomes 26 > 25 → completion
    skillsProgress(state, {}, ctx);
    assert.ok(!state.home.skills.woodworking.progressing,
      'should complete at step 26 (2× compensation: effMaxStep=25)');
    assert.strictEqual(state.home.skills.woodworking.curStep, 0,
      'curStep resets on completion');
  });

  it('scholarship: maxStep=100, effMaxStep=50 → completes at step 51', () => {
    // scholarship skill (if it exists with maxStep=100)
    const skillsCat = loadJson('skills');
    const scholarshipDef = (skillsCat.skills || []).find((s) => s.id === 'scholarship');
    if (!scholarshipDef) {
      // Skip if scholarship not in catalog
      return;
    }
    assert.strictEqual(scholarshipDef.maxStep, 100, 'scholarship maxStep should be 100');

    const state = createInitialState();
    state.home.skills = { scholarship: { progressing: true, curStep: 0, progPct: 0 } };
    const ctx = createCtxWithCatalog();

    for (let i = 1; i <= 50; i++) {
      skillsProgress(state, {}, ctx);
      assert.ok(state.home.skills.scholarship.progressing,
        `scholarship should still be progressing at step ${i}`);
    }

    skillsProgress(state, {}, ctx); // step 51 > effMaxStep=50 → completion
    assert.ok(!state.home.skills.scholarship.progressing,
      'scholarship completes at step 51 (effMaxStep=50)');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-013: field.daily – no RNG consumed when no farms (M3)
// ─────────────────────────────────────────────────────────────

describe('TC-013: field.daily – no RNG consumed (no farms in M3)', () => {
  it('field RNG stream is NOT consumed each day (chanceOfRodents=0 in M3)', () => {
    const state = createInitialState({ seed: 0xF1E1D1C1 });
    initRng(state);

    const fieldRngBefore = state.rng.streams['field'];
    fieldDaily(state, {}, {});
    const fieldRngAfter = state.rng.streams['field'];

    assert.strictEqual(fieldRngBefore, fieldRngAfter,
      'field RNG must NOT be consumed in M3 (no farms → chanceOfRodents=0)');
  });

  it('inspectTime decrements when > 0', () => {
    const state = createInitialState();
    state.world.field.inspectTime = 5;
    fieldDaily(state, {}, {});
    assert.strictEqual(state.world.field.inspectTime, 4, 'inspectTime should decrement');
  });

  it('inspectTime stays 0 when already 0', () => {
    const state = createInitialState();
    state.world.field.inspectTime = 0;
    fieldDaily(state, {}, {});
    assert.strictEqual(state.world.field.inspectTime, 0, 'inspectTime should stay 0');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-014: assignJob – edge cases
// ─────────────────────────────────────────────────────────────

describe('TC-014: assignJob – edge cases', () => {
  it('assignJob delta=0 is a no-op and returns ok', () => {
    const state = createInitialState();
    state.home.jobs = { baker: { number: 3, curStep: 0 } };
    const result = assignJob(state, { jobId: 'baker', delta: 0 });
    assert.ok(result.ok, 'delta=0 should return ok');
    assert.strictEqual(state.home.jobs.baker.number, 3, 'number unchanged');
  });

  it('assignJob with missing jobId returns error', () => {
    const state = createInitialState();
    const result = assignJob(state, { jobId: '', delta: 1 });
    assert.ok(!result.ok, 'empty jobId should fail');
  });

  it('assignJob with float delta returns error', () => {
    const state = createInitialState();
    const result = assignJob(state, { jobId: 'baker', delta: 2.5 });
    assert.ok(!result.ok, 'float delta should fail');
  });

  it('unassigning (negative delta) decrements number and assigned', () => {
    const state = createInitialState();
    state.home.jobs = { baker: { number: 5, curStep: 10 } };
    state.home.workforce = { total: 50, assigned: 5 };
    const result = assignJob(state, { jobId: 'baker', delta: -3 });
    assert.ok(result.ok, 'negative delta (unassign) should succeed');
    assert.strictEqual(state.home.jobs.baker.number, 2);
    assert.strictEqual(state.home.workforce.assigned, 2);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-015: No Date.now / Math.random in M3 systems (grep-style)
// ─────────────────────────────────────────────────────────────

describe('TC-015: No Date.now / Math.random in M3 systems (runtime check)', () => {
  it('patching Math.random throws inside M3 systems', () => {
    const origRandom = Math.random;
    let called = false;
    Math.random = () => { called = true; return origRandom(); };

    try {
      const state = createInitialState({ seed: 0xFFFFFFF0 });
      initRng(state);
      state.season.curSeason = 2;
      state.world.forest.timeSinceLastFire = 25;
      state.world.mine.curOres = 0;

      forestRegen(state, {}, {});
      mineDaily(state, {}, {});
      fieldDaily(state, {}, {});
      workerEfficiencyDaily(state, {}, {});

      const ctx = createCtxWithCatalog();
      state.home.jobs = { baker: { number: 5, curStep: 0 } };
      state.home.workerEfficiency = 1;
      state.home.population.total = 50;
      jobsProduction(state, {}, ctx);
      state.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };
      skillsProgress(state, {}, ctx);
    } finally {
      Math.random = origRandom;
    }

    assert.ok(!called, 'Math.random must NOT be called by any M3 system (use makeRng)');
  });
});
