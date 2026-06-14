/**
 * m7a-world-t5.test.js — iter-016 M7a-1 T5: zone→market inject wiring.
 *
 * Design source of truth: design_iter-016.md §6 (T5 – napojení trhu na zóny).
 * Contract §8.2: marketInject/getGoldValue signatures UNCHANGED (just called from world).
 *
 * Tests:
 *   T5-1  S-06 positive contract (flipped from negative): world NOW calls marketInject
 *          — productive zone inject increases market available (+qty)
 *   T5-2  Warring zone (liege!=originalLiege) drains market available (−warConsumption)
 *   T5-3  Clamp [0,max]: inject never exceeds max, drain never goes below 0
 *   T5-4  Arbitrage sanity: injection does not break market invariants (buy→sell still lossy)
 *   T5-5  Tick order: world.tick (order 30) runs before market.drift (order 35)
 *   T5-6  Determinism: same rng seed → same marketState after processZone
 *   T5-7  No-op for unknown goodsIds: inject of non-market resource keys is safe
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { processZone } from '../src/core/systems/world.js';
import { marketInit, marketInject } from '../src/core/systems/market.js';
import { buyGoods } from '../src/core/commands/buyGoods.js';
import { sellGoods } from '../src/core/commands/sellGoods.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

/** @type {any[]} */
let goodsData = [];

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'zones']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
  loadCatalog('population', loadJson('population'));
  goodsData = loadJson('goods').goods;
});

/**
 * Build a fresh state with marketState initialized from goods catalog.
 * @param {number} [seed]
 */
function makeMarketState(seed = 0xDEADBEEF) {
  const state = createInitialState({ seed });
  initRng(state);
  state.player.gold = 99999;
  marketInit(state, goodsData);
  return state;
}

/**
 * Build a zone that is "productive" (policy 0, liege==originalLiege) with known resources.
 * @param {{ id?: string, resources?: Record<string,number>, liege?: string, originalLiege?: string }} opts
 */
function makeProductiveZone({
  id = 'prodZone',
  resources = {},
  liege = 'theWarlord',
  originalLiege = 'theWarlord',
} = {}) {
  return /** @type {any} */ ({
    id,
    name: 'Prod Zone',
    originalLiege,
    liege,
    policy: 0,
    numWorkers: 500,
    targetWorkerNum: 1000,
    warriors: 0,
    archers: 0,
    warriorGrowth: 3,
    archerGrowth: 2,
    resources,
    tribute: {},
    favour: 0,
    goldStore: 99999,
    notEnoughGold: 0,
    curQuest: null,
    immunity: false,
  });
}

/**
 * Build a zone that is "warring" (policy 0, liege != originalLiege) with known resources.
 * @param {{ id?: string, resources?: Record<string,number>, liege?: string, originalLiege?: string }} opts
 */
function makeWarringZone({
  id = 'warZone',
  resources = {},
  liege = 'theWarlord',
  originalLiege = 'thePrincess',
} = {}) {
  return /** @type {any} */ ({
    id,
    name: 'War Zone',
    originalLiege,
    liege,
    policy: 0,
    numWorkers: 500,
    targetWorkerNum: 1000,
    warriors: 50,
    archers: 30,
    warriorGrowth: 3,
    archerGrowth: 2,
    resources,
    tribute: {},
    favour: 0,
    goldStore: 5000,
    notEnoughGold: 0,
    curQuest: null,
    immunity: false,
  });
}

// ─── T5-1: S-06 positive — productive zone injects into market ───────────────
describe('T5-1 S-06 positive: productive zone injects market supply', () => {
  it('processZone (policy 0, liege==originalLiege) with market goods increases available', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Use 'tools' which IS in market catalog
    const beforeTools = ms.tools.available;

    state.world.zones = [makeProductiveZone({ resources: { tools: 100 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    // inject qty = floor(100 * injectFraction=0.1) = 10
    // available should increase by 10 (clamped to max)
    const expectedInject = Math.floor(100 * BALANCE.world.injectFraction);
    const expectedAvail = Math.min(beforeTools + expectedInject, ms.tools.max);
    assert.strictEqual(ms.tools.available, expectedAvail,
      `productive zone inject: available must increase by ${expectedInject} (or clamp to max). Before: ${beforeTools}, expected: ${expectedAvail}, got: ${ms.tools.available}`);
  });

  it('marketInject is called from world (S-06 positive contract): available changes after processZone with market goods in resources', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Set tools to a low value to clearly see the inject
    ms.tools.available = 0;

    state.world.zones = [makeProductiveZone({ resources: { tools: 200 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    // Should have injected floor(200 * 0.1) = 20
    const expectedInject = Math.floor(200 * BALANCE.world.injectFraction);
    assert.strictEqual(ms.tools.available, expectedInject,
      `S-06 positive: world must call marketInject: available must be ${expectedInject} after inject, got ${ms.tools.available}`);
  });

  it('inject with qty 0 is a no-op (injectFraction * small qty rounds to 0)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const beforeTools = ms.tools.available;

    // tools qty = 5 → floor(5 * 0.1) = 0 → no inject
    state.world.zones = [makeProductiveZone({ resources: { tools: 5 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    // available must be unchanged (no inject)
    assert.strictEqual(ms.tools.available, beforeTools,
      `inject qty=0 must be a no-op: available must stay ${beforeTools}, got ${ms.tools.available}`);
  });
});

// ─── T5-2: Warring zone drains market supply ─────────────────────────────────
describe('T5-2: warring zone (liege!=originalLiege) drains market supply', () => {
  it('processZone (policy 0, liege!=originalLiege) with market goods decreases available', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Set cloth to mid-level so drain is visible
    ms.cloth.available = 500;
    const beforeCloth = ms.cloth.available;

    state.world.zones = [makeWarringZone({ resources: { cloth: 100 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'warZone', rng);

    // warDrain = BALANCE.world.warConsumption = 5
    const warDrain = BALANCE.world.warConsumption;
    const expectedAvail = Math.max(beforeCloth - warDrain, 0);
    assert.strictEqual(ms.cloth.available, expectedAvail,
      `warring zone drain: available must decrease by warConsumption (${warDrain}). Before: ${beforeCloth}, expected: ${expectedAvail}, got: ${ms.cloth.available}`);
  });

  it('warring zone drain: available decreases (not increases)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const beforeTools = ms.tools.available;

    state.world.zones = [makeWarringZone({ resources: { tools: 50 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'warZone', rng);

    assert.ok(ms.tools.available <= beforeTools,
      `warring zone drain: available (${ms.tools.available}) must be ≤ before (${beforeTools})`);
  });
});

// ─── T5-3: Clamp [0,max] ─────────────────────────────────────────────────────
describe('T5-3: clamp [0,max] maintained by marketInject', () => {
  it('inject never exceeds max (huge productive zone resources)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Set available near max
    ms.tools.available = ms.tools.max;
    const maxTools = ms.tools.max;

    // Large resource qty: inject would exceed max without clamp
    state.world.zones = [makeProductiveZone({ resources: { tools: 999999 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    assert.strictEqual(ms.tools.available, maxTools,
      `inject must clamp to max (${maxTools}): got ${ms.tools.available}`);
  });

  it('drain never goes below 0 (huge warConsumption drain)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Set available to very low
    ms.gems.available = 1;

    // Warring zone with gems resource — drain will be BALANCE.world.warConsumption (5)
    // With available=1, clamped to 0
    state.world.zones = [makeWarringZone({ resources: { gems: 100 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'warZone', rng);

    assert.strictEqual(ms.gems.available, 0,
      `drain must clamp to 0 (not negative): got ${ms.gems.available}`);
    assert.ok(ms.gems.available >= 0,
      'available must never go negative');
  });

  it('productive zone inject with available at baseline → increases correctly', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // tools baseline = 1000, max = 2000
    ms.tools.available = 1000;
    const before = ms.tools.available;
    const max = ms.tools.max;

    state.world.zones = [makeProductiveZone({ resources: { tools: 500 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    // inject = floor(500 * 0.1) = 50
    const expectedInject = Math.floor(500 * BALANCE.world.injectFraction);
    const expectedAvail = Math.min(before + expectedInject, max);

    assert.ok(ms.tools.available >= before, 'available must not decrease from inject');
    assert.ok(ms.tools.available <= max, 'available must not exceed max');
    assert.strictEqual(ms.tools.available, expectedAvail,
      `inject from baseline: expected ${expectedAvail}, got ${ms.tools.available}`);
  });
});

// ─── T5-4: Arbitrage sanity — inject does not break market invariants ─────────
describe('T5-4: arbitrage sanity after zone inject', () => {
  it('buy→sell still lossy after productive zone inject (spread 0.6/1.35 maintained)', () => {
    const state = makeMarketState();
    state.player.gold = 99999;

    // Run a productive zone inject first
    state.world.zones = [makeProductiveZone({ resources: { tools: 1000 } })];
    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    const goldBefore = state.player.gold;
    const r1 = buyGoods(state, { goodsId: 'tools', qty: 50 });
    assert.ok(r1.ok, `buyGoods failed: ${r1.error}`);

    const r2 = sellGoods(state, { goodsId: 'tools', qty: 50 });
    assert.ok(r2.ok, `sellGoods failed: ${r2.error}`);

    assert.ok(state.player.gold < goldBefore,
      `Arbitrage must still be lossy after zone inject: gold before=${goldBefore}, after=${state.player.gold}`);
  });

  it('market invariants hold after warring zone drain', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Run a warring zone drain first
    state.world.zones = [makeWarringZone({ resources: { cloth: 300, gems: 100 } })];
    const rng = makeRng(state, 'world');
    processZone(state, 'warZone', rng);

    // Verify all market invariants: available in [0, max]
    for (const [id, entry] of Object.entries(ms)) {
      const e = /** @type {any} */ (entry);
      assert.ok(e.available >= 0,
        `${id}.available must be >= 0 after war drain, got ${e.available}`);
      assert.ok(e.available <= e.max,
        `${id}.available must be <= max after war drain: ${e.available} > ${e.max}`);
    }
  });
});

// ─── T5-5: Tick order — world.tick (30) before market.drift (35) ──────────────
describe('T5-5: tick order — world.tick order 30 before market.drift order 35', () => {
  it('world.tick periodic is registered with order 30, market.drift with order 35', () => {
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);

    const worldPeriodic = periodics.find(p => p.id === 'world.tick');
    const driftPeriodic = periodics.find(p => p.id === 'market.drift');

    assert.ok(worldPeriodic, 'world.tick must be registered as a periodic');
    assert.ok(driftPeriodic, 'market.drift must be registered as a periodic');

    assert.strictEqual(worldPeriodic.every, 'day', 'world.tick must run on day edge');
    assert.strictEqual(driftPeriodic.every, 'day', 'market.drift must run on day edge');

    assert.ok(worldPeriodic.order < driftPeriodic.order,
      `world.tick order (${worldPeriodic.order}) must be < market.drift order (${driftPeriodic.order}) — inject affects drift same day`);
  });

  it('sorted periodics: world.tick comes before market.drift in execution order', () => {
    const registry = createRegistry();
    const periodics = registerCorePeriodics(registry);

    const worldIdx = periodics.findIndex(p => p.id === 'world.tick');
    const driftIdx = periodics.findIndex(p => p.id === 'market.drift');

    assert.ok(worldIdx !== -1, 'world.tick must be in sorted periodics');
    assert.ok(driftIdx !== -1, 'market.drift must be in sorted periodics');

    assert.ok(worldIdx < driftIdx,
      `world.tick (idx ${worldIdx}) must come before market.drift (idx ${driftIdx}) in sorted periodics execution`);
  });
});

// ─── T5-6: Determinism — same rng seed → same marketState ────────────────────
describe('T5-6: determinism — same rng seed → same marketState after processZone', () => {
  it('processZone with same seed → identical marketState (tools, cloth)', () => {
    function runAndGetMarket(seed = 0xBEEF) {
      const state = makeMarketState(seed);
      state.world.zones = [makeProductiveZone({ resources: { tools: 200, cloth: 150 } })];
      const rng = makeRng(state, 'world');
      processZone(state, 'prodZone', rng);
      return JSON.stringify(state.world.marketState);
    }

    const ms1 = runAndGetMarket(0xABCD1234);
    const ms2 = runAndGetMarket(0xABCD1234);
    assert.strictEqual(ms1, ms2,
      'processZone must produce identical marketState with same rng seed (determinism)');
  });
});

// ─── T5-7: No-op for unknown goodsIds ─────────────────────────────────────────
describe('T5-7: no-op for unknown goodsIds (non-market resource keys)', () => {
  it('productive zone with non-market resource keys (stone, wood) does not crash', () => {
    const state = makeMarketState();
    // stone/wood are NOT in the goods.json market catalog → inject is safe no-op
    state.world.zones = [makeProductiveZone({ resources: { stone: 100, wood: 200 } })];

    const rng = makeRng(state, 'world');
    assert.doesNotThrow(() => processZone(state, 'prodZone', rng),
      'processZone with non-market resource keys must not throw');
  });

  it('warring zone with non-market resource keys does not crash or affect market', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Record all market values before
    const before = JSON.stringify(ms);

    state.world.zones = [makeWarringZone({ resources: { stone: 100, wood: 200, iron: 50 } })];

    const rng = makeRng(state, 'world');
    assert.doesNotThrow(() => processZone(state, 'warZone', rng),
      'processZone with non-market war resources must not throw');

    // Market state must be unchanged (all no-ops)
    assert.strictEqual(JSON.stringify(ms), before,
      'market must not change when warring zone has only non-market resource keys');
  });

  it('mixed resources: market goods inject + non-market keys no-op', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    ms.tools.available = 500;
    const beforeTools = ms.tools.available;

    // Mix: tools (market good) + stone (non-market)
    state.world.zones = [makeProductiveZone({ resources: { tools: 100, stone: 500 } })];

    const rng = makeRng(state, 'world');
    processZone(state, 'prodZone', rng);

    // tools should be injected (floor(100 * 0.1) = 10)
    const expectedInject = Math.floor(100 * BALANCE.world.injectFraction);
    assert.strictEqual(ms.tools.available, Math.min(beforeTools + expectedInject, ms.tools.max),
      'tools (market good) must be injected; stone (non-market) is no-op');
  });
});
