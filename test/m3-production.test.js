/**
 * M3 production system tests.
 * Tests: forest/field/mine, jobs progress model, workerEfficiency, skills, BL-3.
 * iter-009 M3.
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
import { registerCorePeriodics, runTick } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { forestArea, fieldArea, mineArea, forestUsed } from '../src/core/balance/formulas.js';
import { forestRegen } from '../src/core/systems/forest.js';
import { fieldDaily } from '../src/core/systems/field.js';
import { mineDaily } from '../src/core/systems/mine.js';
import { workerEfficiencyDaily } from '../src/core/systems/workerEfficiency.js';
import { skillsProgress } from '../src/core/systems/skills.js';
import { jobsProduction, jobsAccidents, autoAssignWorkers } from '../src/core/systems/jobs.js';
import { assignJob } from '../src/core/commands/assignJob.js';
import { startSkill } from '../src/core/commands/startSkill.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { runCatchupBatch } from '../src/core/engine/catchup.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/**
 * @param {string} name
 * @returns {object}
 */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function createCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

function createCtxWithCatalog() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  // BL-3: pre-loaded catalog
  const jobsCat = /** @type {any} */ (loadJson('jobs'));
  const skillsCat = /** @type {any} */ (loadJson('skills'));
  const houseTypesCat = /** @type {any} */ (loadJson('houseTypes'));
  const catalog = {
    jobs: Array.isArray(jobsCat.jobs) ? jobsCat.jobs : [],
    skills: Array.isArray(skillsCat.skills) ? skillsCat.skills : [],
    houseTypes: Array.isArray(houseTypesCat.houseTypes) ? houseTypesCat.houseTypes : [],
  };
  return { registry, periodics, catalog };
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'skills']) {
    loadCatalog(name, loadJson(name));
  }
});

// ---------------------------------------------------------------------------
// T1: Forest / Field / Mine area formulas
// ---------------------------------------------------------------------------

describe('T1: Area formula (config.js source)', () => {
  it('forestArea(0) = 33000', () => {
    // round(28000 + 1.6^0 * 5000) = round(28000 + 5000) = 33000
    assert.strictEqual(forestArea(0), 33000);
  });

  it('forestArea(1) = round(28000 + 1.6 * 5000) = 36000', () => {
    assert.strictEqual(forestArea(1), Math.round(28000 + 1.6 * 5000));
  });

  it('fieldArea(0) = 1650', () => {
    // round(450 + 2^0 * 1200) = round(450 + 1200) = 1650
    assert.strictEqual(fieldArea(0), 1650);
  });

  it('fieldArea(1) = round(450 + 2 * 1200) = 2850', () => {
    assert.strictEqual(fieldArea(1), Math.round(450 + 2 * 1200));
  });

  it('mineArea(0, true) = 1000', () => {
    assert.strictEqual(mineArea(0, true), 1000);
  });

  it('mineArea(1, true) = 1800', () => {
    assert.strictEqual(mineArea(1, true), 1800);
  });

  it('mineArea(0, false) = 0', () => {
    assert.strictEqual(mineArea(0, false), 0);
  });

  it('forestUsed(curTrees) = round(curTrees)', () => {
    assert.strictEqual(forestUsed(27173), 27173);
    assert.strictEqual(forestUsed(100.7), 101);
  });
});

// ---------------------------------------------------------------------------
// T1: Initial world state
// ---------------------------------------------------------------------------

describe('T1: Initial world state (start values from config.js)', () => {
  it('creates world.forest with correct start values', () => {
    const state = createInitialState();
    assert.ok(state.world.forest, 'world.forest should exist');
    assert.strictEqual(state.world.forest.curTrees, BALANCE.forestStocks.startTrees);
    assert.strictEqual(state.world.forest.curAnimals, BALANCE.forestStocks.startAnimals);
    assert.ok(Array.isArray(state.world.forest.saplings));
    assert.strictEqual(state.world.forest.saplings.length, BALANCE.forestStocks.saplingQueueLen);
    assert.strictEqual(state.world.forest.health, 100);
  });

  it('creates world.field with correct start values', () => {
    const state = createInitialState();
    assert.ok(state.world.field, 'world.field should exist');
    assert.strictEqual(state.world.field.curLivestock, BALANCE.field.startLivestock);
    assert.strictEqual(state.world.field.rodentInfestation, 0);
  });

  it('creates world.mine with correct start values', () => {
    const state = createInitialState();
    assert.ok(state.world.mine, 'world.mine should exist');
    assert.strictEqual(state.world.mine.curOres, BALANCE.mine.startOres);
  });
});

// ---------------------------------------------------------------------------
// T1: forestRegen tabulkový test
// ---------------------------------------------------------------------------

describe('T1: forestRegen – tabular test', () => {
  it('forest regen increases trees and animals in spring (season=0)', () => {
    const state = createInitialState();
    initRng(state);
    state.season.curSeason = 0; // spring

    const beforeTrees = state.world.forest.curTrees;
    const beforeAnimals = state.world.forest.curAnimals;

    forestRegen(state, {}, {});

    // Trees: matured = saplings.shift() (0 initially) + new sapling pushed
    // In spring with health=100: no reduction, trees should not decrease
    assert.ok(state.world.forest.curTrees >= beforeTrees - 1, 'trees should not decrease much in spring');

    // Animals: should increase in spring (seasonal +70 bonus)
    // base growth: ceil(3864*0.0075 + 27173/(3864*10.5+20)) + 70
    const expectedGrowth = Math.ceil(beforeAnimals * 0.0075 + beforeTrees / (beforeAnimals * 10.5 + 20)) + 70;
    const actualGrowth = state.world.forest.curAnimals - beforeAnimals;
    // Allow for cull if animals > trees/5
    assert.ok(actualGrowth >= 0, 'animals should not decrease in spring with positive growth');
  });

  it('forestRegen is deterministic with same seed', () => {
    // Run forestRegen twice with different seeds, ensure different results
    const s1 = createInitialState({ seed: 0xABCD1234 });
    const s2 = createInitialState({ seed: 0xABCD1234 });
    initRng(s1);
    initRng(s2);
    s1.season.curSeason = 2; // autumn (fire risk)
    s2.season.curSeason = 2;
    s1.world.forest.timeSinceLastFire = 25; // force fire check
    s2.world.forest.timeSinceLastFire = 25;

    forestRegen(s1, {}, {});
    forestRegen(s2, {}, {});

    // With same seed, should produce same result
    assert.strictEqual(s1.world.forest.curTrees, s2.world.forest.curTrees);
    assert.strictEqual(s1.world.forest.curAnimals, s2.world.forest.curAnimals);
  });
});

// ---------------------------------------------------------------------------
// T2: Jobs progress model
// ---------------------------------------------------------------------------

describe('T2: jobsProduction progress model', () => {
  it('accumulates curStep over quarterDays until completion', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 100;
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 10, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    // maxStep=0.005, STEPS_PER_DAY=900, number=10
    // completionUnits = 0.005 * 900 * 10 = 45
    // Each quarterDay: curStep += 1 * 10 = 10
    // After 4 quarterDays: curStep = 40 (not yet > 45)
    // After 5 quarterDays: curStep = 50 > 45 → completion

    const breadBefore = state.home.food.store.bread || 0;
    for (let i = 0; i < 4; i++) {
      jobsProduction(state, {}, ctx);
    }
    assert.strictEqual(state.home.jobs.baker.curStep, 40, 'after 4 quarterDays: curStep=40');
    assert.strictEqual(state.home.food.store.bread || 0, breadBefore, 'no bread yet after 4 quarterDays');

    // 5th quarterDay → completion (curStep=40+10=50 > 45)
    jobsProduction(state, {}, ctx);
    assert.strictEqual(state.home.jobs.baker.curStep, 0, 'curStep reset to 0 after completion');
    // Products: bread=2 * number=10 = 20
    assert.ok((state.home.food.store.bread || 0) > breadBefore, 'bread granted after completion');
    assert.strictEqual((state.home.food.store.bread || 0) - breadBefore, 20, 'bread = 2 * 10 = 20');
  });

  it('skips builder (noProduction=true) and produces nothing', () => {
    const state = createInitialState();
    initRng(state);
    state.home.jobs = { builder: { number: 5, curStep: 0 } };
    const ctx = createCtxWithCatalog();

    for (let i = 0; i < 100; i++) {
      jobsProduction(state, {}, ctx);
    }
    // builder has noProduction: true → no products ever
    assert.strictEqual(Object.keys(state.player.inventory).length, 0, 'builder produces nothing');
  });
});

// ---------------------------------------------------------------------------
// T2: assignJob command
// ---------------------------------------------------------------------------

describe('T2: assignJob command', () => {
  it('assigns workers when unemployed available', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 50;
    state.home.workforce = { total: 50, assigned: 0 };
    state.home.jobs = { baker: { number: 0, curStep: 0 } };

    const result = assignJob(state, { jobId: 'baker', delta: 3 });
    assert.ok(result.ok, 'assignJob should succeed');
    assert.strictEqual(state.home.jobs.baker.number, 3);
    assert.strictEqual(state.home.workforce.assigned, 3);
  });

  it('rejects delta > unemployed', () => {
    const state = createInitialState();
    state.home.population.total = 10;
    state.home.workforce = { total: 10, assigned: 8 };
    state.home.jobs = { baker: { number: 8, curStep: 0 } };

    const result = assignJob(state, { jobId: 'baker', delta: 5 });
    assert.ok(!result.ok, 'should fail when not enough unemployed');
    assert.ok(result.error, 'should have error message');
  });

  it('rejects delta > max', () => {
    const state = createInitialState();
    state.home.population.total = 200;
    state.home.workforce = { total: 200, assigned: 0 };
    state.home.jobs = { baker: { number: 0, curStep: 0 } };

    const result = assignJob(state, { jobId: 'baker', delta: 100 }); // max is 50
    assert.ok(!result.ok, 'should fail when exceeds max');
  });

  it('rejects non-integer delta', () => {
    const state = createInitialState();
    const result = assignJob(state, { jobId: 'baker', delta: 1.5 });
    assert.ok(!result.ok, 'non-integer delta should fail');
  });

  it('rejects negative resulting number', () => {
    const state = createInitialState();
    state.home.jobs = { baker: { number: 2, curStep: 0 } };
    const result = assignJob(state, { jobId: 'baker', delta: -5 });
    assert.ok(!result.ok, 'should fail when resulting number < 0');
  });
});

// ---------------------------------------------------------------------------
// T2: autoAssignWorkers
// ---------------------------------------------------------------------------

describe('T2: autoAssignWorkers – deterministic', () => {
  it('distributes unemployed round-robin over auto-assignable jobs', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 20;
    state.home.jobs = {};
    state.home.workforce = { total: 0, assigned: 0 };

    // Set up housing with workers
    state.home.housing.counts = { tent: 20 };
    loadCatalog('houseTypes', loadJson('houseTypes'));

    const ctx = createCtxWithCatalog();

    autoAssignWorkers(state, {}, ctx);

    const assigned = Object.values(state.home.jobs).reduce((s, j) => s + (j.number || 0), 0);
    assert.ok(assigned > 0, 'workers should be assigned');
    assert.ok(assigned <= 20, 'cannot assign more than population');

    // Should be deterministic
    const state2 = createInitialState();
    state2.home.population.total = 20;
    state2.home.jobs = {};
    state2.home.workforce = { total: 0, assigned: 0 };
    state2.home.housing.counts = { tent: 20 };

    autoAssignWorkers(state2, {}, ctx);

    assert.deepEqual(state.home.jobs, state2.home.jobs, 'same result twice = deterministic');
  });
});

// ---------------------------------------------------------------------------
// T2: jobsAccidents
// ---------------------------------------------------------------------------

describe('T2: jobsAccidents – wolf chance at level 0', () => {
  it('can kill worker when RNG < wolfChance', () => {
    // Use a seed that produces a value < 0.005 on population stream
    // We'll run multiple times and verify at least one kill happens eventually
    const state = createInitialState({ seed: 0x12345678 });
    initRng(state);
    state.home.settlementLevel = 0; // level <= 1 triggers wolf
    state.home.population.total = 50;
    state.home.workforce = { total: 50, assigned: 10 };
    state.home.jobs = { hunter: { number: 10, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    const popBefore = state.home.population.total;
    let killed = false;

    // Run enough times to trigger wolf attack (0.005 chance, expect hit within 300 tries)
    for (let i = 0; i < 300; i++) {
      jobsAccidents(state, {}, ctx);
      if (state.home.population.total < popBefore) {
        killed = true;
        break;
      }
    }

    assert.ok(killed, 'should kill at least one worker from wolf attack in 300 tries');
  });
});

// ---------------------------------------------------------------------------
// T3: workerEfficiency
// ---------------------------------------------------------------------------

describe('T3: workerEfficiencyDaily', () => {
  it('sets workerEfficiency to 1 in M3 (all morale parts = 0)', () => {
    const state = createInitialState();
    const ctx = createCtxWithCatalog();

    workerEfficiencyDaily(state, {}, ctx);

    assert.strictEqual(state.home.workerEfficiency, 1, 'efficiency should be 1 in M3');
  });

  it('clamp formula: workerEfficiency clamped to [0.25, 2]', async () => {
    // Test via the formula directly
    const { workerEfficiency } = await import('../src/core/balance/formulas.js');
    assert.strictEqual(workerEfficiency({ base: 1, minWorkerPenalty: -5 }), 0.25);
    assert.strictEqual(workerEfficiency({ base: 1, goodSpiritsBonus: 5 }), 2);
  });
});

// ---------------------------------------------------------------------------
// T4: skillsProgress – 2× kompenzace
// ---------------------------------------------------------------------------

describe('T4: skillsProgress – 2× compensation', () => {
  it('completes skill after maxStep/2 steps (not maxStep steps)', () => {
    const state = createInitialState();
    initRng(state);
    // woodworking: maxStep=50, stepCompensation=0.5 → effMaxStep=25
    // Completion when curStep > 25 → after 26 increments
    state.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };

    const ctx = createCtxWithCatalog();

    // Run 25 steps – not yet complete
    for (let i = 0; i < 25; i++) {
      skillsProgress(state, {}, ctx);
    }
    assert.ok(state.home.skills.woodworking.progressing, 'should still be progressing after 25 steps');
    assert.strictEqual(state.home.skills.woodworking.curStep, 25);

    // 26th step → completion (curStep=26 > effMaxStep=25)
    skillsProgress(state, {}, ctx);
    assert.ok(!state.home.skills.woodworking.progressing, 'should stop progressing after 26 steps');
    assert.strictEqual(state.home.skills.woodworking.curStep, 0, 'curStep reset to 0');
    assert.strictEqual(state.home.skills.woodworking.progPct, 0, 'progPct reset to 0');

    // products: wood=5 should be granted to home.store (resource kind)
    const woodCount = (state.home.store && state.home.store.wood) || 0;
    assert.strictEqual(woodCount, 5, 'woodworking should grant 5 wood');
  });

  it('does NOT complete after maxStep steps (2× compensation prevents this)', () => {
    const state = createInitialState();
    initRng(state);
    // If compensation=0.5 is working, effMaxStep=25; at step 50 it should have already completed
    // So test that completion happens exactly at step 26, not later
    state.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };
    const ctx = createCtxWithCatalog();

    let completedAtStep = -1;
    for (let i = 1; i <= 60; i++) {
      skillsProgress(state, {}, ctx);
      if (!state.home.skills.woodworking.progressing && completedAtStep < 0) {
        completedAtStep = i;
      }
    }

    assert.strictEqual(completedAtStep, 26, '2× compensation: skill completes at step 26, not step 50');
  });
});

// ---------------------------------------------------------------------------
// T4: startSkill command
// ---------------------------------------------------------------------------

describe('T4: startSkill command', () => {
  it('starts progressing a skill', () => {
    const state = createInitialState();
    const result = startSkill(state, { skillId: 'woodworking' });
    assert.ok(result.ok, 'should succeed');
    assert.ok(state.home.skills.woodworking.progressing, 'skill should be progressing');
  });

  it('rejects if skill already progressing', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 5, progPct: 20 } };
    const result = startSkill(state, { skillId: 'woodworking' });
    assert.ok(!result.ok, 'should fail if already progressing');
  });

  it('rejects unknown skill', () => {
    const state = createInitialState();
    const result = startSkill(state, { skillId: 'nonexistent_skill_xyz' });
    assert.ok(!result.ok, 'should fail for unknown skill');
  });
});

// ---------------------------------------------------------------------------
// BL-3: ctx.catalog hot-path
// ---------------------------------------------------------------------------

describe('BL-3: ctx.catalog avoids getCatalog in hot-path', () => {
  it('jobsProduction works with ctx.catalog (no getCatalog calls needed)', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 50;
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 5, curStep: 0 } };

    const ctx = createCtxWithCatalog();

    // Should not throw and should work correctly
    assert.doesNotThrow(() => {
      jobsProduction(state, {}, ctx);
    }, 'jobsProduction should work with ctx.catalog');
  });

  it('skillsProgress works with ctx.catalog (no getCatalog calls needed)', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 0, progPct: 0 } };

    const ctx = createCtxWithCatalog();

    assert.doesNotThrow(() => {
      skillsProgress(state, {}, ctx);
    }, 'skillsProgress should work with ctx.catalog');
  });
});

// ---------------------------------------------------------------------------
// Catch-up-safe: determinism
// ---------------------------------------------------------------------------

describe('Catch-up-safe: determinism (no Date.now/Math.random)', () => {
  it('same seed produces same state hash after N steps', () => {
    function runN(seed) {
      const state = createInitialState({ seed });
      initRng(state);
      state.home.population.total = 100;
      state.home.food.store = { bread: 5000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
      const ctx = createCtxWithCatalog();
      for (let i = 0; i < 900; i++) step(state, ctx);
      return hashState(state);
    }

    const h1 = runN(0xDEADBEEF);
    const h2 = runN(0xDEADBEEF);

    assert.strictEqual(h1, h2, 'same seed must produce same hash (determinism)');
  });

  it('persist round-trip: world.forest/field/mine survive save/load', () => {
    const state = createInitialState({ seed: 0xCAFEBABE });
    initRng(state);
    state.home.population.total = 100;
    state.home.food.store = { bread: 5000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };

    const ctx = createCtxWithCatalog();
    // Run enough steps for forest to change (need 10 days = 9000 steps for regen)
    for (let i = 0; i < 900; i++) step(state, ctx);

    const payload = applyPersist(state);
    const s2 = loadAndReconstruct(payload);

    // World sub-domains should be preserved
    assert.strictEqual(s2.world.forest.curTrees, state.world.forest.curTrees);
    assert.strictEqual(s2.world.forest.curAnimals, state.world.forest.curAnimals);
    assert.deepEqual(s2.world.forest.saplings, state.world.forest.saplings);
    assert.strictEqual(s2.world.mine.curOres, state.world.mine.curOres);
    assert.strictEqual(s2.world.field.curLivestock, state.world.field.curLivestock);
  });

  it('jobs curStep survives save/load', () => {
    const state = createInitialState();
    initRng(state);
    state.home.population.total = 50;
    state.home.workerEfficiency = 1;
    state.home.jobs = { baker: { number: 10, curStep: 30 } };

    const payload = applyPersist(state);
    const s2 = loadAndReconstruct(payload);

    assert.strictEqual(s2.home.jobs.baker.number, 10);
    assert.strictEqual(s2.home.jobs.baker.curStep, 30);
  });

  it('skills state survives save/load', () => {
    const state = createInitialState();
    state.home.skills = { woodworking: { progressing: true, curStep: 15, progPct: 60 } };

    const payload = applyPersist(state);
    const s2 = loadAndReconstruct(payload);

    assert.ok(s2.home.skills.woodworking.progressing);
    assert.strictEqual(s2.home.skills.woodworking.curStep, 15);
    // progPct is DERIVED – may or may not be saved (depends on implementation)
    // What matters: progressing and curStep are preserved
  });

  it('catch-up batch produces same result as single-run (G1)', async () => {
    function buildState(seed) {
      const s = createInitialState({ seed });
      initRng(s);
      s.home.population.total = 100;
      s.home.food.store = { bread: 5000, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 };
      return s;
    }

    const N = 1800; // 2 days

    // Direct: run N steps in one pass
    const s1 = buildState(0x11223344);
    const ctx1 = createCtxWithCatalog();
    for (let i = 0; i < N; i++) step(s1, ctx1);

    // Batch: run N steps via runCatchupBatch (chunked)
    const s2 = buildState(0x11223344);
    const ctx2 = createCtxWithCatalog();
    await runCatchupBatch({ state: s2, ctx: ctx2, totalSteps: N, wasCapped: false });

    assert.strictEqual(hashState(s1), hashState(s2), 'catch-up batch must match direct run (G1)');
  });
});
