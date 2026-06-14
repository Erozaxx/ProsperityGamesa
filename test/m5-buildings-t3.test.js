/**
 * M5-1 T3 builder companies tests.
 * iter-013 M5-1 T3.
 *
 * Gate requirements (brief_coder_T-006):
 *   - buyCompany command: validation (missing id, unknown id, already owned, canAfford)
 *   - buyCompany command: happy-path → pay + ownedCompanies entry set
 *   - Effect of company on buildersProcess: company-provided builders advance projects
 *   - persist round-trip: ownedCompanies survives save→load
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { buyCompany, companyBuildersTotal } from '../src/core/commands/buyCompany.js';
import {
  buildersProcess,
  rebuildBuildingDerived,
} from '../src/core/systems/buildings.js';
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
  state.player.gold = 500_000;
  if (!state.home.store) state.home.store = {};
  state.home.store.wood = 100_000;
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

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'buildings', 'goods', 'companies']) {
    try { loadCatalog(name, loadJson(name)); } catch (_e) { /* optional */ }
  }
});

// ---------------------------------------------------------------------------
// 1. buyCompany command — validation
// ---------------------------------------------------------------------------
describe('buyCompany — validation', () => {
  it('rejects missing companyId', () => {
    const state = makeState();
    const res = buyCompany(state, {});
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.includes('companyId'), `error: ${res.error}`);
  });

  it('rejects empty string companyId', () => {
    const state = makeState();
    const res = buyCompany(state, { companyId: '' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error, 'should have error message');
  });

  it('rejects unknown company id', () => {
    const state = makeState();
    const res = buyCompany(state, { companyId: 'nonexistent_xyz' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.includes('nonexistent_xyz'), `error: ${res.error}`);
  });

  it('rejects already owned company', () => {
    const state = makeState();
    if (!state.home.ownedCompanies) state.home.ownedCompanies = {};
    state.home.ownedCompanies['KuttingKorners'] = true;

    const res = buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error && res.error.includes('already owned'), `error: ${res.error}`);
  });

  it('rejects when insufficient gold', () => {
    const state = makeState();
    state.player.gold = 0; // KuttingKorners costs 2000 gold

    const res = buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(res.ok, false);
    assert.ok(
      res.error && (res.error.includes('insufficient') || res.error.includes('gold')),
      `error: ${res.error}`
    );
  });
});

// ---------------------------------------------------------------------------
// 2. buyCompany command — happy path
// ---------------------------------------------------------------------------
describe('buyCompany — happy path', () => {
  it('deducts cost (gold) from player when buying KuttingKorners', () => {
    const state = makeState();
    // KuttingKorners cost: { gold: 2000 }
    const goldBefore = state.player.gold;

    const res = buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(res.ok, true, `Expected ok:true, got: ${res.error}`);
    assert.strictEqual(state.player.gold, goldBefore - 2000, 'gold should be deducted');
  });

  it('sets ownedCompanies entry to true after purchase', () => {
    const state = makeState();

    const res = buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(
      /** @type {any} */ (state.home).ownedCompanies?.['KuttingKorners'],
      true,
      'ownedCompanies should have the company flagged'
    );
  });

  it('can buy multiple companies independently', () => {
    const state = makeState();

    const r1 = buyCompany(state, { companyId: 'KuttingKorners' }); // 2000 gold, 1 builder
    const r2 = buyCompany(state, { companyId: 'BrickingBad' });    // 9000 gold, 2 builders
    assert.strictEqual(r1.ok, true, `KuttingKorners failed: ${r1.error}`);
    assert.strictEqual(r2.ok, true, `BrickingBad failed: ${r2.error}`);

    const owned = /** @type {any} */ (state.home).ownedCompanies;
    assert.strictEqual(owned['KuttingKorners'], true);
    assert.strictEqual(owned['BrickingBad'], true);
    // Gold deducted: 2000 + 9000 = 11000
    assert.strictEqual(state.player.gold, 500_000 - 11_000);
  });

  it('does NOT add company to ownedCompanies if payment fails (no partial state)', () => {
    const state = makeState();
    state.player.gold = 0; // force failure

    const res = buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(res.ok, false);
    const owned = /** @type {any} */ (state.home).ownedCompanies ?? {};
    assert.ok(!owned['KuttingKorners'], 'company should not be owned after failed payment');
  });
});

// ---------------------------------------------------------------------------
// 3. companyBuildersTotal — reflects owned companies
// ---------------------------------------------------------------------------
describe('companyBuildersTotal', () => {
  it('returns 0 when no companies owned', () => {
    const state = makeState();
    assert.strictEqual(companyBuildersTotal(state), 0);
  });

  it('returns buildersProvided for a single owned company', () => {
    const state = makeState();
    // KuttingKorners: buildersProvided=1
    buyCompany(state, { companyId: 'KuttingKorners' });
    assert.strictEqual(companyBuildersTotal(state), 1);
  });

  it('sums buildersProvided across multiple owned companies', () => {
    const state = makeState();
    // KuttingKorners: 1 builder, BrickingBad: 2 builders, total=3
    buyCompany(state, { companyId: 'KuttingKorners' });
    buyCompany(state, { companyId: 'BrickingBad' });
    assert.strictEqual(companyBuildersTotal(state), 3);
  });

  it('counts mineBuilder company builders (StrikeGoldInc)', () => {
    const state = makeState();
    // StrikeGoldInc: buildersProvided=2, cost={gold:10000, wood:2400}
    state.home.store.wood = 100_000;
    buyCompany(state, { companyId: 'StrikeGoldInc' });
    // StrikeGoldInc buildersProvided=2
    assert.strictEqual(companyBuildersTotal(state), 2);
  });
});

// ---------------------------------------------------------------------------
// 4. Effect of company on buildersProcess (capacity integration)
// ---------------------------------------------------------------------------
describe('buyCompany effect on buildersProcess', () => {
  it('company-provided builders advance projects even with no assigned builder job', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // No builder job assigned: state.home.jobs['builder'] = undefined
    // Buy KuttingKorners → provides 1 builder
    buyCompany(state, { companyId: 'KuttingKorners' });

    // Project that needs exactly 1 builder
    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100,
      builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    assert.ok(proj.curProgress > 0, `curProgress should advance; got ${proj.curProgress}`);
    assert.strictEqual(proj.delay, 0, 'delay should remain 0 when builders available');
  });

  it('no progress without company and without builder job', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // No companies, no builder job → no builders

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100,
      builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    const proj = state.home.projectQueue[0];
    assert.strictEqual(proj.curProgress, 0, 'should not advance without any builders');
    assert.ok(proj.delay >= 1, 'delay should increment');
  });

  it('company + job builders are additive', () => {
    const state = makeState();
    // 2 builderHuts → maxActiveProjects=2 (so both projects can be processed)
    addBuilderHut(state, 2);
    // Assign 1 builder job + buy KuttingKorners (1 builder) = total 2
    if (!state.home.jobs) state.home.jobs = {};
    if (!state.home.jobs['builder']) state.home.jobs['builder'] = { number: 0, curStep: 0 };
    state.home.jobs['builder'].number = 1;
    buyCompany(state, { companyId: 'KuttingKorners' });

    // Two projects, each needs 1 builder → both can advance simultaneously (totalBuilders=2)
    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: {}, paid: true, removable: true, delay: 0,
    });
    state.home.projectQueue.push({
      id: 'proj_2', type: 'build', buildingId: 'well',
      curProgress: 0, maxProgress: 100,
      builders: 1, cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // Both projects should have advanced (2 builders available, 2 active slots)
    assert.ok(state.home.projectQueue[0].curProgress > 0, 'proj_1 should advance');
    assert.ok(state.home.projectQueue[1].curProgress > 0, 'proj_2 should advance');
  });

  it('company completes build project when enough builders provided', () => {
    const state = makeState();
    addBuilderHut(state, 1);
    // No builder job, just company
    buyCompany(state, { companyId: 'KuttingKorners' }); // 1 builder

    // Build a well (builders:1): set progress to completion threshold
    const maxProgress = 3;
    const qpd = 4; // quarterDaysPerDay
    const completionUnits = maxProgress * qpd;

    state.home.projectQueue.push({
      id: 'proj_1', type: 'build', buildingId: 'well',
      curProgress: completionUnits - 1, // one masonStep from completion
      maxProgress, builders: 1,
      cost: {}, paid: true, removable: true, delay: 0,
    });

    buildersProcess(state, {}, /** @type {any} */ (mockCtx));

    // Project should complete (no builder job, only company builder)
    assert.strictEqual(state.home.projectQueue.length, 0, 'project should be completed and removed');
    const b = state.home.buildings['well'];
    assert.ok(b && b.created >= 1, 'well should have an instance after completion');
  });
});

// ---------------------------------------------------------------------------
// 5. persist round-trip: ownedCompanies survives save→load
// ---------------------------------------------------------------------------
describe('persist round-trip: ownedCompanies', () => {
  it('ownedCompanies is included in persist payload', () => {
    const state = makeState();
    buyCompany(state, { companyId: 'KuttingKorners' });

    const payload = applyPersist(state);
    assert.ok(payload.home, 'home should be in payload');
    assert.ok(
      /** @type {any} */ (payload.home).ownedCompanies,
      'ownedCompanies should be in payload'
    );
    assert.strictEqual(
      /** @type {any} */ (payload.home).ownedCompanies['KuttingKorners'],
      true,
      'company should be flagged in payload'
    );
  });

  it('ownedCompanies is NOT in payload when no companies owned (empty object ok)', () => {
    const state = makeState();
    // ownedCompanies = {} (empty, no purchases)
    const payload = applyPersist(state);
    // Either absent or empty is fine (no companies to restore)
    const owned = /** @type {any} */ (payload.home)?.ownedCompanies ?? {};
    assert.strictEqual(Object.keys(owned).length, 0, 'should have no owned companies');
  });

  it('ownedCompanies survives save→load round-trip', () => {
    const state = makeState();
    buyCompany(state, { companyId: 'KuttingKorners' });
    buyCompany(state, { companyId: 'BrickingBad' });

    const payload = applyPersist(state);
    const rec = { saveVersion: SAVE_VERSION, payload };
    const loaded = /** @type {any} */ (loadAndReconstruct(rec));

    const owned = loaded.home.ownedCompanies ?? {};
    assert.strictEqual(owned['KuttingKorners'], true, 'KuttingKorners should survive load');
    assert.strictEqual(owned['BrickingBad'], true, 'BrickingBad should survive load');
  });

  it('companyBuildersTotal is correct after round-trip load', () => {
    const state = makeState();
    buyCompany(state, { companyId: 'KuttingKorners' }); // 1 builder
    buyCompany(state, { companyId: 'BrickingBad' });    // 2 builders = total 3

    const payload = applyPersist(state);
    const rec = { saveVersion: SAVE_VERSION, payload };
    const loaded = /** @type {any} */ (loadAndReconstruct(rec));

    // companyBuildersTotal should work correctly on reloaded state
    assert.strictEqual(companyBuildersTotal(loaded), 3, 'company builders total should be 3 after load');
  });

  it('payload does NOT contain derived/_effCache fields (invariant check)', () => {
    const state = makeState();
    buyCompany(state, { companyId: 'KuttingKorners' });

    const payload = applyPersist(state);
    const payloadStr = JSON.stringify(payload);

    assert.ok(!payloadStr.includes('"derived"'), 'payload must not contain derived field');
    assert.ok(!payloadStr.includes('"_effCache"'), 'payload must not contain _effCache');
    assert.ok(!payloadStr.includes('"maxWorkers"'), 'payload must not contain maxWorkers');
  });
});
