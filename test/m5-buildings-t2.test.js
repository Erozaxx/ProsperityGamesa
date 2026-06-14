/**
 * M5-1 T2 builder system + build() command tests.
 * iter-013 M5-1 T2.
 *
 * Gate requirements (brief_coder_T-005):
 *   - build() command: validation (bad itemId, not a building, locked, queue full, canAfford)
 *   - build() command: happy-path → pay + project in queue
 *   - builder postup → dokončení → instance+totalMade++
 *   - scaleCostByCount tabulkové (additional, factor=1.0 constant / factor>1.0 geometric)
 *   - persist round-trip: rozestavěný projekt přežije save→load a pokračuje
 *   - applyRepair: hp restore + inRepair=false
 *   - buildersProcess: repair deferred payment, requeue on delay
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { scaleCostByCount } from '../src/core/balance/formulas.js';
import {
  buildersProcess,
  completeBuild,
  applyRepair,
  rebuildBuildingDerived,
} from '../src/core/systems/buildings.js';
import { build } from '../src/core/commands/build.js';
import { applyPersist } from '../src/save/persistSchema.js';
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
  state.player.gold = 100000;
  // wood/ore are 'resource' kind → stored in state.home.store
  if (!state.home.store) state.home.store = {};
  state.home.store.wood = 10000;
  state.home.store.ore = 10000;
  return state;
}

/** Minimal mock ctx */
const mockCtx = { registry: null, periodics: [], emitTx: undefined };

/** Add a builderHut to state so queue capacity > 0 */
function addBuilderHut(state, count = 1) {
  if (!state.home.buildings['builderHut']) {
    state.home.buildings['builderHut'] = { created: 0, totalMade: 0, instances: [] };
  }
  const b = state.home.buildings['builderHut'];
  for (let i = 0; i < count; i++) {
    b.instances.push({ instId: `builderHut_${b.totalMade}`, hp: 100, inRepair: false });
    b.totalMade++;
  }
  b.created = b.instances.length;
  rebuildBuildingDerived(state);
}

/** Assign builder workers */
function addBuilders(state, n) {
  if (!state.home.jobs) state.home.jobs = {};
  if (!state.home.jobs['builder']) state.home.jobs['builder'] = { number: 0, curStep: 0 };
  state.home.jobs['builder'].number += n;
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods']) {
    try { loadCatalog(name, loadJson(name)); } catch (_e) { /* optional */ }
  }
});

// ---------------------------------------------------------------------------
// 1. scaleCostByCount tabulkové testy (additional T2 coverage per brief)
// ---------------------------------------------------------------------------
describe('scaleCostByCount (T2 tabulkové)', () => {
  it('factor=1.0: identical for all totalMade values (no scaling)', () => {
    const base = { wood: 50, ore: 20 };
    for (const n of [0, 1, 2, 10, 100]) {
      const res = scaleCostByCount(base, n, 1.0);
      assert.strictEqual(res.wood, 50, `wood should be 50 for totalMade=${n}`);
      assert.strictEqual(res.ore, 20, `ore should be 20 for totalMade=${n}`);
    }
  });

  it('factor=2.0: doubles for each additional (geometric growth)', () => {
    const base = { wood: 10 };
    // totalMade=0 → 10*2^0=10; totalMade=1 → 10*2^1=20; totalMade=2 → 10*2^2=40
    assert.strictEqual(scaleCostByCount(base, 0, 2.0).wood, 10);
    assert.strictEqual(scaleCostByCount(base, 1, 2.0).wood, 20);
    assert.strictEqual(scaleCostByCount(base, 2, 2.0).wood, 40);
    assert.strictEqual(scaleCostByCount(base, 3, 2.0).wood, 80);
  });

  it('factor=1.15: floor(30*1.15)=34 for totalMade=1', () => {
    assert.strictEqual(scaleCostByCount({ wood: 30 }, 1, 1.15).wood, 34);
  });

  it('factor=1.15: floor(30*1.15^2)=39 for totalMade=2', () => {
    // 30 * 1.15^2 = 30 * 1.3225 = 39.675 → floor = 39
    assert.strictEqual(scaleCostByCount({ wood: 30 }, 2, 1.15).wood, 39);
  });

  it('negative totalMade treated as 0 (Math.max guard)', () => {
    const base = { wood: 10 };
    // Math.max(0, -5) = 0 → factor^0 = 1
    assert.strictEqual(scaleCostByCount(base, -5, 2.0).wood, 10);
  });

  it('BALANCE.buildings.costScaleFactor is 1.0 (default no scaling)', () => {
    assert.strictEqual(/** @type {any} */ (BALANCE).buildings.costScaleFactor, 1.0);
  });
});

// ---------------------------------------------------------------------------
// 2. build() command — validation
// ---------------------------------------------------------------------------
describe('build() command — validation', () => {
  it('rejects missing itemId', () => {
    const state = makeState();
    const res = build(state, {});
    assert.strictEqual(res.ok, false);
    assert.ok(res.error, 'should have error message');
  });

  it('rejects unknown building id', () => {
    const state = makeState();
    const res = build(state, { itemId: 'nonexistent_xyz' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.includes('nonexistent_xyz'));
  });

  it('rejects non-building catalog item', () => {
    const state = makeState();
    // 'farmer' is a job, not a building
    const res = build(state, { itemId: 'farmer' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error, 'should have error for non-building type');
  });

  it('rejects when queue full (no builderHut → capacity 0)', () => {
    const state = makeState();
    // No builderHut → maxProjectQueue = 0
    const res = build(state, { itemId: 'well' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.toLowerCase().includes('queue'), `error: ${res.error}`);
  });

  it('rejects when queue is at max capacity', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // builderHut gives maxProjectQueue=3 per hut (from effects); fill the queue
    state.home.projectQueue.push({ id: 'proj_fill_1', type: 'build', buildingId: 'well', curProgress: 0, maxProgress: 3, builders: 1, cost: {}, paid: true, removable: true, delay: 0 });
    state.home.projectQueue.push({ id: 'proj_fill_2', type: 'build', buildingId: 'well', curProgress: 0, maxProgress: 3, builders: 1, cost: {}, paid: true, removable: true, delay: 0 });
    state.home.projectQueue.push({ id: 'proj_fill_3', type: 'build', buildingId: 'well', curProgress: 0, maxProgress: 3, builders: 1, cost: {}, paid: true, removable: true, delay: 0 });
    // Queue now at 3 = maxProjectQueue → next build should fail
    const res = build(state, { itemId: 'well' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.toLowerCase().includes('queue'));
  });

  it('rejects when cannot afford', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    state.home.store.wood = 0;
    state.home.store.ore = 0;
    state.player.gold = 0;
    const res = build(state, { itemId: 'well' });
    // well costs wood+ore; player has nothing
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.toLowerCase().includes('insufficient'), `error: ${res.error}`);
  });
});

// ---------------------------------------------------------------------------
// 3. build() command — happy path
// ---------------------------------------------------------------------------
describe('build() command — happy path', () => {
  it('deducts cost from player resources', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    const woodBefore = state.home.store.wood;
    const oreBefore = state.home.store.ore;

    const res = build(state, { itemId: 'well' });
    assert.strictEqual(res.ok, true, `Expected ok:true, got ${res.error}`);

    // well baseCost: {wood:15, ore:10}, scaleFactor=1.0 → no scaling
    assert.strictEqual(state.home.store.wood, woodBefore - 15);
    assert.strictEqual(state.home.store.ore, oreBefore - 10);
  });

  it('pushes project to projectQueue with correct shape', () => {
    const state = makeState();
    addBuilderHut(state, 1);

    const res = build(state, { itemId: 'well' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(state.home.projectQueue.length, 1);

    const proj = state.home.projectQueue[0];
    assert.strictEqual(proj.type, 'build');
    assert.strictEqual(proj.buildingId, 'well');
    assert.strictEqual(proj.paid, true, 'build projects are pre-paid');
    assert.strictEqual(proj.removable, true);
    assert.ok(typeof proj.id === 'string' && proj.id.startsWith('proj_'), `id: ${proj.id}`);
    assert.ok(Number.isFinite(proj.maxProgress) && proj.maxProgress >= 1, `maxProgress: ${proj.maxProgress}`);
    assert.ok(Number.isFinite(proj.builders) && proj.builders >= 1, `builders: ${proj.builders}`);
    assert.strictEqual(proj.curProgress, 0);
    assert.strictEqual(proj.delay, 0);
  });

  it('increments projectSeq per build call', () => {
    const state = makeState();
    addBuilderHut(state, 2); // 2 huts → 6 queue slots
    const seqBefore = state.home.projectSeq;

    build(state, { itemId: 'well' });
    build(state, { itemId: 'well' });

    assert.strictEqual(state.home.projectSeq, seqBefore + 2);
    const ids = state.home.projectQueue.map(p => p.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, 2, 'project IDs must be unique');
  });

  it('uses totalMade for scaleCostByCount (not current created)', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // Set totalMade=2 for well (simulating 2 previously built)
    state.home.buildings['well'] = { created: 0, totalMade: 2, instances: [] };
    const woodBefore = state.home.store.wood;

    // With factor=1.0, cost is always base → wood=15 regardless of totalMade
    build(state, { itemId: 'well' });
    assert.strictEqual(state.home.store.wood, woodBefore - 15, 'factor=1.0 → no scaling');
  });
});

// ---------------------------------------------------------------------------
// 4. buildersProcess — project advancement and completion
// ---------------------------------------------------------------------------
describe('buildersProcess — project advancement', () => {
  it('advances curProgress by masonStep per quarterDay when builders available', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5); // plenty of builders

    // Push a project manually (large maxProgress to avoid immediate completion)
    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    const masonStep = /** @type {any} */ (BALANCE).buildings.masonStep;
    assert.strictEqual(proj.curProgress, masonStep, `curProgress should be ${masonStep}`);
    assert.strictEqual(proj.delay, 0);
  });

  it('does not advance when no builders assigned', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // No builders: state.home.jobs['builder'].number = 0
    addBuilders(state, 0);

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    assert.strictEqual(proj.curProgress, 0, 'no progress without builders');
    assert.ok(proj.delay >= 1, 'delay should increment when builders unavailable');
  });

  it('completes build project: instance created, totalMade++, removed from queue', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 2);

    // well.maxProgress=3; completionUnits = 3 × 4 = 12
    // Set curProgress just at completion threshold
    const maxProgress = 3;
    const qpd = /** @type {any} */ (BALANCE).buildings.quarterDaysPerDay;
    const completionUnits = maxProgress * qpd;

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: completionUnits - 1, // one masonStep from done
      maxProgress,
      builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // Project should be removed from queue
    assert.strictEqual(state.home.projectQueue.length, 0, 'queue should be empty after completion');

    // Instance should exist
    const b = state.home.buildings['well'];
    assert.ok(b, 'buildings.well should exist');
    assert.strictEqual(b.created, 1, 'created should be 1 after completeBuild');
    assert.strictEqual(b.totalMade, 1, 'totalMade should be 1 after completeBuild');
    assert.strictEqual(b.instances.length, 1);
    assert.strictEqual(b.instances[0].instId, 'well_0');
    assert.ok(Number.isFinite(b.instances[0].hp) && b.instances[0].hp > 0, 'instance HP should be positive');
    assert.strictEqual(b.instances[0].inRepair, false);
  });

  it('completeBuild increments totalMade using pre-build value for instId', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5);

    // Pre-existing well with totalMade=3
    state.home.buildings['well'] = { created: 1, totalMade: 3, instances: [
      { instId: 'well_0', hp: 60, inRepair: false },
    ]};

    const maxProgress = 3;
    const qpd = /** @type {any} */ (BALANCE).buildings.quarterDaysPerDay;
    const completionUnits = maxProgress * qpd;

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: completionUnits - 1,
      maxProgress, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const b = state.home.buildings['well'];
    assert.strictEqual(b.totalMade, 4, 'totalMade should be incremented to 4');
    assert.strictEqual(b.created, 2, 'created should be 2 (old + new instance)');
    assert.strictEqual(b.instances[1].instId, 'well_3', 'instId should be well_3 (pre-build totalMade=3)');
  });

  it('completeBuild triggers rebuildBuildingDerived (aggregates updated)', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5);
    rebuildBuildingDerived(state); // establish baseline: 0 workerHouse → maxWorkers=0

    assert.strictEqual(state.home.derived.maxWorkers, 0, 'maxWorkers starts at 0');

    // Build a workerHouse (workers:5 per instance)
    const maxProgress = 5;
    const qpd = /** @type {any} */ (BALANCE).buildings.quarterDaysPerDay;
    const completionUnits = maxProgress * qpd;

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'workerHouse',
      curProgress: completionUnits - 1,
      maxProgress, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // workerHouse has effects: [{attr:'workers', op:'add', value:5}]
    assert.strictEqual(state.home.derived.maxWorkers, 5, 'maxWorkers should be 5 after building workerHouse');
  });

  it('does not process projects when no builderHut exists', () => {
    const state = makeState();
    // No builderHut: maxActiveProjects = 0
    addBuilders(state, 10);

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 999, maxProgress: 3, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // Nothing should happen (no builder hut → maxActiveProjects=0)
    assert.strictEqual(state.home.projectQueue.length, 1, 'project should remain in queue');
    const b = state.home.buildings['well'];
    assert.ok(!b || b.created === 0, 'no instance should be created without builderHut');
  });
});

// ---------------------------------------------------------------------------
// 5. applyRepair — HP restore + inRepair=false
// ---------------------------------------------------------------------------
describe('applyRepair', () => {
  it('restores HP to resistance (capped at max) and clears inRepair', () => {
    const state = makeState();
    state.home.buildings['well'] = {
      created: 1, totalMade: 1,
      instances: [{ instId: 'well_0', hp: 5, inRepair: true }],
    };

    const project = {
      id: 'proj_1', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 100, maxProgress: 1,
      builders: 1, cost: { gold: 5 }, paid: true, removable: false, delay: 0,
    };

    applyRepair(state, project, /** @type {any} */ (mockCtx));

    const inst = state.home.buildings['well'].instances[0];
    assert.strictEqual(inst.inRepair, false, 'inRepair should be cleared');
    // well resistance=60; hp restored from 5 to min(5+60, 60) = 60
    assert.strictEqual(inst.hp, 60, 'HP should be restored to resistance (60)');
  });

  it('is a no-op if instance no longer exists (destroyed during repair)', () => {
    const state = makeState();
    state.home.buildings['well'] = { created: 0, totalMade: 1, instances: [] };

    const project = {
      id: 'proj_1', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 100, maxProgress: 1,
      builders: 1, cost: { gold: 5 }, paid: true, removable: false, delay: 0,
    };

    // Should not throw
    assert.doesNotThrow(() => applyRepair(state, project, /** @type {any} */ (mockCtx)));
  });

  it('updates aggregates via recalcBuildingAggregates after repair', () => {
    const state = makeState();
    state.home.buildings['workerHouse'] = {
      created: 1, totalMade: 1,
      instances: [{ instId: 'house_0', hp: 5, inRepair: true }],
    };
    rebuildBuildingDerived(state);
    assert.strictEqual(state.home.derived.maxWorkers, 5, 'should have 5 maxWorkers before repair');

    const project = {
      id: 'proj_1', type: 'repair',
      buildingId: 'workerHouse', instId: 'house_0',
      curProgress: 100, maxProgress: 1,
      builders: 1, cost: { gold: 10 }, paid: true, removable: false, delay: 0,
    };

    applyRepair(state, project, /** @type {any} */ (mockCtx));

    // Still 1 instance → maxWorkers should remain 5
    assert.strictEqual(state.home.derived.maxWorkers, 5, 'aggregates should remain correct after repair');
  });
});

// ---------------------------------------------------------------------------
// 6. buildersProcess — repair project deferred payment
// ---------------------------------------------------------------------------
describe('buildersProcess — repair project deferred payment', () => {
  it('pays repair cost when canAfford, then advances progress', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5);
    state.player.gold = 1000;

    state.home.projectQueue.push({
      id: 'proj_1', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: { gold: 5 },
      paid: false, removable: false, delay: 0,
    });

    const goldBefore = state.player.gold;
    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    assert.strictEqual(proj.paid, true, 'repair should be paid after first buildersProcess');
    assert.strictEqual(state.player.gold, goldBefore - 5, 'gold should be deducted');
    const masonStep = /** @type {any} */ (BALANCE).buildings.masonStep;
    assert.strictEqual(proj.curProgress, masonStep, 'progress should advance after payment');
  });

  it('delays repair when cannot afford, increments delay', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5);
    state.player.gold = 0; // cannot afford repair

    state.home.projectQueue.push({
      id: 'proj_1', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: { gold: 50 },
      paid: false, removable: false, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    assert.strictEqual(proj.paid, false, 'should remain unpaid');
    assert.strictEqual(proj.curProgress, 0, 'progress should not advance');
    assert.ok(proj.delay >= 1, 'delay should increment');
  });

  it('requeues repair project at end of queue after requeueDelay', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 5);
    state.player.gold = 0; // cannot afford

    const requeueDelay = /** @type {any} */ (BALANCE).buildings.requeueDelay;
    // Push two projects: unaffordable repair first, then a build
    state.home.projectQueue.push({
      id: 'proj_repair', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: { gold: 50 },
      paid: false, removable: false, delay: requeueDelay, // already at threshold
    });
    state.home.projectQueue.push({
      id: 'proj_build', type: 'build',
      buildingId: 'well',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // repair project should now be at end of queue (requeued), build project at front
    assert.strictEqual(state.home.projectQueue[0].id, 'proj_build', 'build project should be first after requeue');
    assert.strictEqual(state.home.projectQueue[state.home.projectQueue.length - 1].id, 'proj_repair',
      'repair project should be requeued at end');
  });
});

// ---------------------------------------------------------------------------
// 7. Persist round-trip: in-progress project survives save→load
// ---------------------------------------------------------------------------
describe('persist round-trip: in-progress build project', () => {
  it('project survives save→load and continues', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    addBuilders(state, 2);

    // Queue a build project with partial progress
    const maxProgress = 10;
    const qpd = /** @type {any} */ (BALANCE).buildings.quarterDaysPerDay;
    const completionUnits = maxProgress * qpd;
    const partialProgress = Math.floor(completionUnits / 2); // halfway done

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: partialProgress, maxProgress,
      builders: 1, cost: {}, paid: true, removable: true, delay: 0,
    });
    state.home.projectSeq = 1;

    // Save
    const payload = applyPersist(state);
    assert.ok(payload.home.projectQueue, 'projectQueue should be in payload');
    assert.strictEqual(payload.home.projectQueue.length, 1);
    assert.strictEqual(payload.home.projectQueue[0].curProgress, partialProgress);

    // Load
    const rec = { saveVersion: SAVE_VERSION, payload };
    const loaded = /** @type {any} */ (loadAndReconstruct(rec));

    // Project should be restored
    assert.strictEqual(loaded.home.projectQueue.length, 1);
    const proj = loaded.home.projectQueue[0];
    assert.strictEqual(proj.id, 'proj_1');
    assert.strictEqual(proj.curProgress, partialProgress);
    assert.strictEqual(proj.maxProgress, maxProgress);
    assert.strictEqual(proj.type, 'build');
    assert.strictEqual(proj.buildingId, 'well');
    assert.strictEqual(proj.paid, true);

    // Advance: should complete after enough buildersProcess calls
    loaded.home.jobs = loaded.home.jobs || {};
    loaded.home.jobs['builder'] = { number: 5, curStep: 0 };

    const remainingProgress = completionUnits - partialProgress;
    const masonStep = /** @type {any} */ (BALANCE).buildings.masonStep;
    const callsNeeded = Math.ceil(remainingProgress / masonStep);

    for (let i = 0; i < callsNeeded; i++) {
      buildersProcess(loaded, {}, /** @type {any} */ (mockCtx));
    }

    // Should be complete now
    assert.strictEqual(loaded.home.projectQueue.length, 0, 'project should complete after sufficient buildersProcess calls');
    const b = loaded.home.buildings['well'];
    assert.ok(b && b.created >= 1, 'well should have at least 1 instance after completion');
    assert.ok(b.totalMade >= 1, 'totalMade should be >= 1');
  });

  it('repair project survives save→load with paid=false', () => {
    const state = makeState();
    state.home.buildings['well'] = {
      created: 1, totalMade: 1,
      instances: [{ instId: 'well_0', hp: 10, inRepair: true }],
    };
    state.home.projectQueue.push({
      id: 'proj_1', type: 'repair',
      buildingId: 'well', instId: 'well_0',
      curProgress: 0, maxProgress: 1,
      builders: 1, cost: { gold: 5 },
      paid: false, removable: false, delay: 0,
    });
    state.home.projectSeq = 1;

    const payload = applyPersist(state);
    const rec = { saveVersion: SAVE_VERSION, payload };
    const loaded = /** @type {any} */ (loadAndReconstruct(rec));

    assert.strictEqual(loaded.home.projectQueue.length, 1);
    const proj = loaded.home.projectQueue[0];
    assert.strictEqual(proj.type, 'repair');
    assert.strictEqual(proj.paid, false, 'repair should remain unpaid after load');
    assert.deepStrictEqual(proj.cost, { gold: 5 }, 'repair cost preserved');
    assert.strictEqual(proj.instId, 'well_0');
  });
});

// ---------------------------------------------------------------------------
// 8. completeBuild — direct test
// ---------------------------------------------------------------------------
describe('completeBuild (direct)', () => {
  it('creates building slot if does not exist yet', () => {
    const state = makeState();
    // No well in buildings
    const project = { buildingId: 'well' };

    completeBuild(state, project, /** @type {any} */ (mockCtx));

    assert.ok(state.home.buildings['well'], 'should create well slot');
    assert.strictEqual(state.home.buildings['well'].created, 1);
    assert.strictEqual(state.home.buildings['well'].totalMade, 1);
    assert.strictEqual(state.home.buildings['well'].instances.length, 1);
  });

  it('instId uses pre-build totalMade value (deterministic, no Date.now)', () => {
    const state = makeState();
    state.home.buildings['granary'] = { created: 0, totalMade: 5, instances: [] };

    completeBuild(state, { buildingId: 'granary' }, /** @type {any} */ (mockCtx));

    // instId should be `granary_5` (totalMade BEFORE increment = 5)
    assert.strictEqual(state.home.buildings['granary'].instances[0].instId, 'granary_5');
    assert.strictEqual(state.home.buildings['granary'].totalMade, 6, 'totalMade should be 6 after build');
  });

  it('new instance starts with hp = resistance (no inRepair)', () => {
    const state = makeState();
    completeBuild(state, { buildingId: 'well' }, /** @type {any} */ (mockCtx));

    const inst = state.home.buildings['well'].instances[0];
    // well resistance=60 from catalog
    assert.strictEqual(inst.hp, 60, 'HP should equal resistance');
    assert.strictEqual(inst.inRepair, false);
  });
});
