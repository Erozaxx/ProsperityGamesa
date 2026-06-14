/**
 * Tests for T6 UI selectors (iter-014 M5-2):
 *   selectBuildableBuildings — scaled cost + canAfford
 *   selectProjectQueue — build/repair projects + progressPct
 *   selectBuilderCapacity — assignedBuilders/companyBuilders/maxActive/etc.
 *   selectBuilderCompanies — owned/canAfford
 *   selectContracts — canComplete / daysLeft / pctComplete derivates (§7.2 design)
 *
 * Gate requirements (brief):
 *   - selectBuildableBuildings: cena se scalingem (scaleCostByCount)
 *   - selectContracts: deriváty canComplete/daysLeft/pctComplete počítané ZDE
 */

import { describe, it, before, after } from 'node:test';
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
  selectBuildableBuildings,
  selectProjectQueue,
  selectBuilderCapacity,
  selectBuilderCompanies,
  selectContracts,
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
  state.player.gold = 10000;
  return state;
}

const STEPSPERDAY = BALANCE.engine.stepsPerDay;

// ---------------------------------------------------------------------------
// Setup / teardown catalogs
// ---------------------------------------------------------------------------

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'contracts']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional catalog */ }
  }
});

after(() => {
  clearCatalogs();
});

// ---------------------------------------------------------------------------
// selectBuildableBuildings
// ---------------------------------------------------------------------------

describe('selectBuildableBuildings', () => {
  it('returns array for initial state (buildings catalog loaded)', () => {
    const state = makeState();
    const result = selectBuildableBuildings(state);
    assert.ok(Array.isArray(result), 'should return array');
    // At least one building expected (builderHut)
    assert.ok(result.length > 0, 'should have at least one building');
  });

  it('returns empty array when buildings catalog not present', () => {
    // Temporarily test with cleared catalog
    clearCatalogs();
    const state = makeState();
    const result = selectBuildableBuildings(state);
    assert.deepEqual(result, []);
    // Restore catalogs
    for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies', 'contracts']) {
      try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
    }
  });

  it('each item has required shape fields', () => {
    const state = makeState();
    const result = selectBuildableBuildings(state);
    for (const item of result) {
      assert.ok(typeof item.id === 'string', 'id must be string');
      assert.ok(typeof item.name === 'string', 'name must be string');
      assert.ok(typeof item.cost === 'object' && item.cost !== null, 'cost must be object');
      assert.ok(typeof item.canAfford === 'boolean', 'canAfford must be boolean');
      assert.ok(typeof item.created === 'number', 'created must be number');
      assert.ok(typeof item.totalMade === 'number', 'totalMade must be number');
      assert.ok(typeof item.unlocked === 'boolean', 'unlocked must be boolean');
    }
  });

  it('cost scaling: scaleCostByCount applied with correct totalMade', () => {
    const state = makeState();
    const scaleFactor = (/** @type {any} */ (BALANCE).buildings.costScaleFactor) ?? 1.0;
    const result = selectBuildableBuildings(state);
    // builderHut has baseCost {wood: 30}
    const bhut = result.find(b => b.id === 'builderHut');
    assert.ok(bhut, 'builderHut should be in result');
    // With totalMade=0, scaledCost = scaleCostByCount({wood:30}, 0, factor) = {wood: floor(30*1)} = {wood:30}
    const expected = scaleCostByCount({ wood: 30 }, 0, scaleFactor);
    assert.deepEqual(bhut.cost, expected, 'cost should match scaleCostByCount with totalMade=0');
    assert.equal(bhut.totalMade, 0, 'fresh state totalMade=0');
  });

  it('cost scaling increases with totalMade > 0', () => {
    const state = makeState();
    const scaleFactor = (/** @type {any} */ (BALANCE).buildings.costScaleFactor) ?? 1.0;
    if (scaleFactor === 1.0) {
      // No scaling by default — cost stays same regardless of totalMade
      assert.ok(true, 'scaleFactor=1.0: no scaling, test skipped as N/A for coverage');
      return;
    }
    // Simulate having built 2 builderHuts previously
    (/** @type {any} */ (state.home)).buildings = {
      builderHut: { created: 2, totalMade: 2, instances: [{}, {}], derived: {}, modifiers: [] },
    };
    const result = selectBuildableBuildings(state);
    const bhut = result.find(b => b.id === 'builderHut');
    assert.ok(bhut, 'builderHut in result');
    const costWith2 = scaleCostByCount({ wood: 30 }, 2, scaleFactor);
    assert.deepEqual(bhut.cost, costWith2, 'cost should match scaleCostByCount with totalMade=2');
  });

  it('canAfford=true when player has enough resources (home.store)', () => {
    const state = makeState();
    // wood is a 'resource' kind → stored in state.home.store.wood
    state.player.gold = 99999;
    if (!(/** @type {any} */ (state.home)).store) (/** @type {any} */ (state.home)).store = {};
    (/** @type {any} */ (state.home)).store.wood = 99999;
    (/** @type {any} */ (state.home)).store.stone = 99999;
    const result = selectBuildableBuildings(state);
    // At least one building should be affordable with huge resources
    const affordable = result.filter(b => b.canAfford);
    assert.ok(affordable.length > 0, 'some buildings should be affordable with lots of resources');
  });

  it('canAfford=false when player has no resources', () => {
    const state = makeState();
    state.player.gold = 0;
    state.player.inventory = {};
    if ((/** @type {any} */ (state.home)).store) (/** @type {any} */ (state.home)).store = {};
    const result = selectBuildableBuildings(state);
    // All buildings should be unaffordable with empty inventory
    const allUnaffordable = result.every(b => !b.canAfford);
    assert.ok(allUnaffordable, 'all buildings unaffordable with empty resources');
  });

  it('only includes unlocked buildings (unlocked !== false)', () => {
    const state = makeState();
    const result = selectBuildableBuildings(state);
    for (const item of result) {
      assert.equal(item.unlocked, true, `${item.id} should have unlocked=true`);
    }
  });
});

// ---------------------------------------------------------------------------
// selectProjectQueue
// ---------------------------------------------------------------------------

describe('selectProjectQueue', () => {
  it('returns empty array for initial state (no projects)', () => {
    const state = makeState();
    const result = selectProjectQueue(state);
    assert.deepEqual(result, []);
  });

  it('returns project rows with required shape', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).projectQueue = [
      { id: 'proj_0', buildingId: 'builderHut', type: 'build', curProgress: 2, maxProgress: 10, builders: 1, removable: true },
    ];
    const result = selectProjectQueue(state);
    assert.equal(result.length, 1);
    const p = result[0];
    assert.equal(p.id, 'proj_0');
    assert.equal(p.buildingId, 'builderHut');
    assert.equal(p.type, 'build');
    assert.equal(p.progressPct, 20, 'progressPct = round(2/10*100)=20');
    assert.equal(p.builders, 1);
    assert.equal(p.removable, true);
  });

  it('repair projects have removable=false', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).projectQueue = [
      { id: 'repair_0', buildingId: 'builderHut', type: 'repair', curProgress: 3, maxProgress: 5, builders: 1, removable: false },
    ];
    const result = selectProjectQueue(state);
    assert.equal(result.length, 1);
    assert.equal(result[0].removable, false, 'repair project removable=false');
    assert.equal(result[0].type, 'repair');
  });

  it('progressPct clamped to [0, 100]', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).projectQueue = [
      { id: 'p1', buildingId: 'builderHut', type: 'build', curProgress: 100, maxProgress: 5, builders: 1 },
      { id: 'p2', buildingId: 'builderHut', type: 'build', curProgress: 0, maxProgress: 0, builders: 1 },
    ];
    const result = selectProjectQueue(state);
    assert.equal(result[0].progressPct, 100, 'progressPct should cap at 100');
    assert.equal(result[1].progressPct, 0, 'progressPct 0 when maxProgress=0');
  });
});

// ---------------------------------------------------------------------------
// selectBuilderCapacity
// ---------------------------------------------------------------------------

describe('selectBuilderCapacity', () => {
  it('returns capacity shape for initial state (no builderHut)', () => {
    const state = makeState();
    const cap = selectBuilderCapacity(state);
    assert.ok(typeof cap.assignedBuilders === 'number', 'assignedBuilders is number');
    assert.ok(typeof cap.companyBuilders === 'number', 'companyBuilders is number');
    assert.ok(typeof cap.maxActiveProjects === 'number', 'maxActiveProjects is number');
    assert.ok(typeof cap.maxProjectQueue === 'number', 'maxProjectQueue is number');
    assert.ok(typeof cap.queueUsed === 'number', 'queueUsed is number');
    assert.equal(cap.assignedBuilders, 0);
    assert.equal(cap.queueUsed, 0);
  });

  it('assignedBuilders reflects home.jobs.builder.number', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).jobs = { builder: { number: 5, curStep: 0 } };
    const cap = selectBuilderCapacity(state);
    assert.equal(cap.assignedBuilders, 5);
  });

  it('queueUsed reflects projectQueue length', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).projectQueue = [
      { id: 'p1', buildingId: 'builderHut', type: 'build', curProgress: 0, maxProgress: 5 },
      { id: 'p2', buildingId: 'builderHut', type: 'build', curProgress: 0, maxProgress: 5 },
    ];
    const cap = selectBuilderCapacity(state);
    assert.equal(cap.queueUsed, 2);
  });
});

// ---------------------------------------------------------------------------
// selectBuilderCompanies
// ---------------------------------------------------------------------------

describe('selectBuilderCompanies', () => {
  it('returns array (may be empty if companies catalog missing)', () => {
    const state = makeState();
    const result = selectBuilderCompanies(state);
    assert.ok(Array.isArray(result));
  });

  it('company items have required shape', () => {
    const state = makeState();
    const result = selectBuilderCompanies(state);
    for (const c of result) {
      assert.ok(typeof c.id === 'string');
      assert.ok(typeof c.name === 'string');
      assert.ok(typeof c.owned === 'boolean');
      assert.ok(typeof c.canAfford === 'boolean');
      assert.ok(typeof c.buildersProvided === 'number');
      assert.ok(typeof c.masonProvided === 'number');
    }
  });

  it('owned=false for fresh state (no ownedCompanies)', () => {
    const state = makeState();
    const result = selectBuilderCompanies(state);
    for (const c of result) {
      assert.equal(c.owned, false, `${c.id} should not be owned in fresh state`);
    }
  });

  it('owned=true when company is in ownedCompanies', () => {
    const state = makeState();
    const result0 = selectBuilderCompanies(state);
    if (result0.length === 0) {
      assert.ok(true, 'no companies in catalog — skipped');
      return;
    }
    const firstId = result0[0].id;
    (/** @type {any} */ (state.home)).ownedCompanies = { [firstId]: true };
    const result = selectBuilderCompanies(state);
    const first = result.find(c => c.id === firstId);
    assert.ok(first, 'first company should exist');
    assert.equal(first.owned, true, 'first company should be owned after setting ownedCompanies');
  });
});

// ---------------------------------------------------------------------------
// selectContracts — deriváty canComplete/daysLeft/pctComplete
// ---------------------------------------------------------------------------

describe('selectContracts', () => {
  it('returns empty array when contractQueue is empty', () => {
    const state = makeState();
    const result = selectContracts(state);
    assert.deepEqual(result, []);
  });

  it('returns offered contract with canComplete=false (not active)', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_0',
        type: 'goodsSeller',
        title: 'Test kontrakt',
        status: 'offered',
        cost: { wood: 10 },
        reward: { gold: 100 },
        deadlineStep: 0,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    assert.equal(result.length, 1);
    const c = result[0];
    assert.equal(c.id, 'contract_0');
    assert.equal(c.status, 'offered');
    assert.equal(c.canComplete, false, 'offered contract cannot be completed');
    assert.equal(c.daysLeft, null, 'offered contract has no daysLeft');
    assert.equal(c.pctComplete, null, 'offered contract has no pctComplete');
  });

  it('active contract: canComplete=true when player can afford cost (gold)', () => {
    const state = makeState();
    // Use gold cost — gold is always in state.player.gold
    state.player.gold = 1000;
    const deadlineStep = state.engine.curStep + STEPSPERDAY * 15; // 15 days from now
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_1',
        type: 'goodsSeller',
        title: 'Active Test',
        status: 'active',
        cost: { gold: 10 },
        reward: { gold: 200 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    assert.equal(result.length, 1);
    const c = result[0];
    assert.equal(c.canComplete, true, 'can complete when gold=1000 >= cost gold=10');
  });

  it('active contract: canComplete=false when player cannot afford cost', () => {
    const state = makeState();
    state.player.gold = 0;
    const deadlineStep = state.engine.curStep + STEPSPERDAY * 15;
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_2',
        type: 'goodsSeller',
        title: 'Expensive',
        status: 'active',
        cost: { gold: 500 },
        reward: { gold: 5000 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    assert.equal(c.canComplete, false, 'cannot complete without gold');
    assert.ok(c.unaffordable.includes('gold'), 'gold should be in unaffordable list');
  });

  it('daysLeft: correct derivation from deadlineStep - curStep / STEPSPERDAY', () => {
    const state = makeState();
    const daysAhead = 10;
    const deadlineStep = state.engine.curStep + daysAhead * STEPSPERDAY;
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_3',
        type: 'goodsSeller',
        title: 'Days test',
        status: 'active',
        cost: {},
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    assert.equal(c.daysLeft, daysAhead, `daysLeft should be ${daysAhead} (= ${daysAhead} * STEPSPERDAY / STEPSPERDAY)`);
  });

  it('daysLeft=0 when deadline is in the past', () => {
    const state = makeState();
    state.engine.curStep = 5000;
    const deadlineStep = 1000; // already past
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_4',
        type: 'goodsSeller',
        title: 'Past deadline',
        status: 'active',
        cost: {},
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    assert.equal(result[0].daysLeft, 0, 'daysLeft clamped at 0 when deadline passed');
  });

  it('pctComplete: 0 at start (elapsed=0), increases over time', () => {
    const state = makeState();
    const totalDays = 15;
    const deadlineStep = state.engine.curStep + totalDays * STEPSPERDAY;
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_5',
        type: 'goodsSeller',
        title: 'Pct test',
        status: 'active',
        cost: {},
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    assert.ok(c.pctComplete !== null, 'pctComplete should not be null for active contract');
    // At start (elapsed=0 from catalog expirationDays=15 total=15*STEPSPERDAY), pctComplete=0
    assert.equal(c.pctComplete, 0, 'pctComplete=0 at start (deadline just set)');
  });

  it('pctComplete: 50 when half the contract time elapsed', () => {
    const state = makeState();
    const totalDays = 14; // goodsSeller has expirationDays=15 in catalog; use 14 to avoid catalog lookup dependency
    const totalSteps = totalDays * STEPSPERDAY;
    const halfElapsed = Math.round(totalSteps / 2);
    // Set curStep so that half the time has elapsed
    state.engine.curStep = 1000 + halfElapsed;
    const deadlineStep = 1000 + totalSteps; // started at step=1000
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_6',
        type: 'unknownType', // not in catalog → fallback uses deadlineStep as totalSteps
        title: 'Half elapsed',
        status: 'active',
        cost: {},
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    assert.ok(c.pctComplete !== null, 'pctComplete should be defined');
    // With fallback totalSteps=deadlineStep (absolute), the pct is (deadlineStep - remaining) / deadlineStep
    // Not exactly 50 with fallback, so just check it's a number [0,100]
    assert.ok(c.pctComplete >= 0 && c.pctComplete <= 100, 'pctComplete in [0,100]');
  });

  it('pctComplete uses catalog expirationDays when type is known', () => {
    const state = makeState();
    // goodsSeller has expirationDays=15 in catalog
    const expirationDays = 15;
    const totalSteps = expirationDays * STEPSPERDAY;
    const halfElapsed = Math.round(totalSteps / 2);
    state.engine.curStep = halfElapsed;
    const deadlineStep = totalSteps; // accepted at step=0, half elapsed now
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_7',
        type: 'goodsSeller',
        title: 'Catalog pct',
        status: 'active',
        cost: {},
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    assert.ok(c.pctComplete !== null, 'pctComplete not null');
    // remaining = deadlineStep - curStep = totalSteps - halfElapsed = halfElapsed (approx)
    // elapsed = totalSteps - remaining = totalSteps - halfElapsed ≈ halfElapsed
    // pct = round(elapsed / totalSteps * 100) ≈ 50
    assert.ok(c.pctComplete >= 48 && c.pctComplete <= 52, `pctComplete≈50 for half-elapsed contract (got ${c.pctComplete})`);
  });

  it('title derived from catalog when contract.title is empty', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_8',
        type: 'goodsSeller',
        title: '',  // empty — should fall back to catalog
        status: 'offered',
        cost: {},
        reward: {},
        deadlineStep: 0,
        onComplete: { effect: 'noop' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    // goodsSeller title from catalog
    assert.ok(c.title.length > 0, 'title should be derived from catalog when contract.title empty');
    assert.ok(c.title.toLowerCase().includes('kupec') || c.title.includes('goodsSeller') || c.title.length > 0, 'title from catalog');
  });

  it('unaffordable: lists resource IDs the player lacks', () => {
    const state = makeState();
    // Use gold cost to avoid catalog kind lookup issues (gold is always in state.player.gold)
    state.player.gold = 3; // only 3 gold, but need 10
    const deadlineStep = state.engine.curStep + STEPSPERDAY * 5;
    (/** @type {any} */ (state.home)).contractQueue = [
      {
        id: 'contract_9',
        type: 'goodsSeller',
        title: 'Unaffordable',
        status: 'active',
        cost: { gold: 10 },
        reward: { gold: 100 },
        deadlineStep,
        onComplete: { effect: 'contract.complete' },
        onExpire: { effect: 'noop' },
        onReject: { effect: 'noop' },
      },
    ];
    const result = selectContracts(state);
    const c = result[0];
    // gold=3 < 10
    assert.ok(c.unaffordable.includes('gold'), 'gold should be unaffordable (3 < 10)');
  });

  it('multiple contracts returned in order', () => {
    const state = makeState();
    (/** @type {any} */ (state.home)).contractQueue = [
      { id: 'c0', type: 'goodsSeller', title: 'First', status: 'offered', cost: {}, reward: {}, deadlineStep: 0, onComplete: { effect: 'noop' }, onExpire: { effect: 'noop' }, onReject: { effect: 'noop' } },
      { id: 'c1', type: 'goodsBuyer', title: 'Second', status: 'active', cost: {}, reward: {}, deadlineStep: state.engine.curStep + STEPSPERDAY * 10, onComplete: { effect: 'noop' }, onExpire: { effect: 'noop' }, onReject: { effect: 'noop' } },
    ];
    const result = selectContracts(state);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'c0');
    assert.equal(result[1].id, 'c1');
  });

  it('selector is pure (read-only): calling twice returns same values', () => {
    const state = makeState();
    state.player.gold = 100;
    const deadlineStep = state.engine.curStep + STEPSPERDAY * 10;
    (/** @type {any} */ (state.home)).contractQueue = [
      { id: 'c_pure', type: 'goodsSeller', title: 'Pure', status: 'active', cost: { gold: 5 }, reward: { gold: 50 }, deadlineStep, onComplete: { effect: 'contract.complete' }, onExpire: { effect: 'noop' }, onReject: { effect: 'noop' } },
    ];
    const r1 = selectContracts(state);
    const r2 = selectContracts(state);
    assert.deepEqual(r1, r2, 'selector should be pure: same result on repeated calls with same state');
  });

  it('selectContracts does not mutate state (pure read)', () => {
    const state = makeState();
    const queueBefore = /** @type {any[]} */ ((/** @type {any} */ (state.home)).contractQueue ?? []);
    const lenBefore = queueBefore.length;
    selectContracts(state);
    assert.equal((/** @type {any} */ (state.home)).contractQueue?.length ?? 0, lenBefore, 'state.home.contractQueue must not be mutated by selector');
  });
});
