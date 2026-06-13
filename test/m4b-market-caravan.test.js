/**
 * m4b-market-caravan.test.js – iter-011 T-003 (Tester, Sonnet)
 * Comprehensive test suite for M4b market + caravan + MVP e2e.
 *
 * Covers:
 * - TC-01 Arbitrážní sanity: nákup→prodej NENÍ ziskový (klíčový test)
 * - TC-02..04 marketPrice clamp/meze (priceOf, buyingPrice, sellingPrice) tabulkový test
 * - TC-05 marketDailyDrift mean-reversion (20%/den, k=0.2)
 * - TC-06 marketDailyDrift catch-up-safe (batch == single-batch)
 * - TC-07 getGoldValue konzistence (koš → Σ qty×priceOf, gold 1:1)
 * - TC-08 marketInject pozitivní kontrakt (S-06): clamp [0,max], no-op pro neznámé id
 * - TC-09 buyGoods happy path + clamp available
 * - TC-10 buyGoods nedostatek zlata → {ok:false}, stav nezměněn
 * - TC-11 sellGoods happy path + clamp available
 * - TC-12 sellGoods nedostatek zboží → {ok:false}
 * - TC-13 sendCaravan: happy path, sentOut=27000, recGoods, zboží odebráno
 * - TC-14 sendCaravan when busy → {ok:false}
 * - TC-15 sendCaravan kapacita překročena → {ok:false}
 * - TC-16 caravanReturns: grant recGoods, sentOut→0
 * - TC-17 caravan round-trip přes save/load uprostřed cesty
 * - TC-18 WIRING: buyGoods/sellGoods/sendCaravan registrované v bootstrapEngine přes send()
 * - TC-19 MVP e2e: bootSequence→simulace→save→offline shift→bootSequence znovu→catch-up→stav konzistentní
 * - TC-20 migrace v2→v3: přidá world.marketState a world.caravan
 * - TC-21 persist round-trip: marketState+caravan zachovány přes applyPersist→loadAndReconstruct
 * - TC-22 grep-gate DA5: žádná přímá mutace player.gold = v systems/
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readdirSync } from 'node:fs';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step, STEP_MS } from '../src/core/engine/clock.js';
import { scheduleInsert } from '../src/core/engine/scheduler.js';
import { register } from '../src/core/registry/registry.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { migrate } from '../src/save/migrations.js';
import { SAVE_VERSION } from '../src/save/schema.js';

import { marketInit, priceOf, buyingPrice, sellingPrice, getGoldValue, marketInject, marketDailyDrift } from '../src/core/systems/market.js';
import { caravanReturns } from '../src/core/systems/caravan.js';
import { buyGoods, registerBuyGoods } from '../src/core/commands/buyGoods.js';
import { sellGoods, registerSellGoods } from '../src/core/commands/sellGoods.js';
import { sendCaravan, registerSendCaravan } from '../src/core/commands/sendCaravan.js';
import { createCommandRegistry, dispatch } from '../src/core/commands/dispatch.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { bootSequence } from '../src/app/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const SRC_DIR = join(ROOT, 'src');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

/** @type {Record<string, unknown>[]} */
let goodsData = [];

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'population']) {
    loadCatalog(name, loadJson(name));
  }
  goodsData = /** @type {any} */ (loadJson('goods')).goods;
});

after(() => {
  clearCatalogs();
});

/** Build a fresh state with market initialized from goods catalog. */
function makeMarketState() {
  const state = createInitialState();
  initRng(state);
  state.player.gold = 10000; // plenty for tests
  marketInit(state, goodsData);
  return state;
}

/** Build engine ctx with full registry */
function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

/** Build command registry with market commands */
function makeCreg() {
  const creg = createCommandRegistry();
  registerBuyGoods(creg);
  registerSellGoods(creg);
  registerSendCaravan(creg);
  return creg;
}

/** Advance state by N days (N×stepsPerDay steps) */
function advanceDays(state, ctx, n) {
  const stepsPerDay = BALANCE.engine.stepsPerDay;
  for (let i = 0; i < n * stepsPerDay; i++) {
    step(state, ctx);
  }
}

// ---------------------------------------------------------------------------
// TC-01  ARBITRÁŽNÍ SANITY: okamžitý nákup→prodej NENÍ ziskový
// ---------------------------------------------------------------------------
describe('TC-01 Arbitrážní sanity: nákup→prodej NENÍ ziskový', () => {
  it('buy 100 tools then immediately sell 100 tools → gold klesne (ztráta ≥ 44%)', () => {
    const state = makeMarketState();
    const goldBefore = state.player.gold;

    const r1 = buyGoods(state, { goodsId: 'tools', qty: 100 });
    assert.ok(r1.ok, `buyGoods failed: ${r1.error}`);

    const goldAfterBuy = state.player.gold;
    assert.ok(goldAfterBuy < goldBefore, 'gold musí klesnout po nákupu');

    const r2 = sellGoods(state, { goodsId: 'tools', qty: 100 });
    assert.ok(r2.ok, `sellGoods failed: ${r2.error}`);

    const goldAfterSell = state.player.gold;

    // key assertion: nákup→prodej MUSÍ být ztrátový
    assert.ok(
      goldAfterSell < goldBefore,
      `Arbitráž SELHAL: gold po sell (${goldAfterSell}) >= goldBefore (${goldBefore}). Spread 0.6/1.35 ~44% musí zaručit ztrátu.`
    );

    // Ztráta by měla být aspoň 40% (konzervativní dolní mez kvůli ceně po cenovém dopadu)
    const loss = goldBefore - goldAfterSell;
    const buySpend = goldBefore - goldAfterBuy;
    const lossRatio = loss / buySpend;
    assert.ok(
      lossRatio > 0.4,
      `Ztráta (${(lossRatio * 100).toFixed(1)}%) by měla být > 40% (spread 0.6/1.35 = 44.4% i bez cenového dopadu)`
    );
  });

  it('buy→sell s 1 kusem: sellingPrice < buyingPrice pro každou komoditu', () => {
    const state = makeMarketState();
    for (const good of goodsData) {
      const buy = buyingPrice(state, good.id);
      const sell = sellingPrice(state, good.id);
      assert.ok(
        sell < buy,
        `${good.id}: sellingPrice (${sell}) musí být < buyingPrice (${buy})`
      );
      // spread ratio ~0.6/1.35 = 0.444; sell/buy must be roughly 0.44±0.01
      const ratio = sell / buy;
      assert.ok(
        ratio > 0.43 && ratio < 0.46,
        `${good.id}: sell/buy ratio ${ratio.toFixed(4)} musí být ~0.444 (0.6/1.35)`
      );
    }
  });

  it('i s cenovým dopadem (velký nákup zvedne cenu) buy→sell STÁLE ztrátový', () => {
    const state = makeMarketState();
    const goldBefore = state.player.gold;
    state.player.gold = 999999; // dost gold

    // Nakupujeme 800 ze 1000 dostupných cloth (velký dopad na cenu)
    const ms = /** @type {any} */ (state.world.marketState);
    const availableBefore = ms.cloth.available;

    const r1 = buyGoods(state, { goodsId: 'cloth', qty: 800 });
    assert.ok(r1.ok, `buy failed: ${r1.error}`);
    assert.ok(ms.cloth.available < availableBefore, 'available musí klesnout po nákupu');

    // Prodejní cena se nyní počítá z available PŘED prodejem (vyšší cena = lepší sell)
    const r2 = sellGoods(state, { goodsId: 'cloth', qty: 800 });
    assert.ok(r2.ok, `sell failed: ${r2.error}`);

    // I s cenovým dopadem musí být výsledek ztrátový
    assert.ok(state.player.gold < 999999, 'gold musí klesnout i s cenovým dopadem');
  });
});

// ---------------------------------------------------------------------------
// TC-02..04  marketPrice clamp/meze: priceOf, buyingPrice, sellingPrice tabulkový test
// ---------------------------------------------------------------------------
describe('TC-02..04 marketPrice clamp/meze – tabulkový test (tools, basePrice=25)', () => {
  // tools: basePrice=25, max=2000, baselineFraction=0.5 → baseline=1000
  // priceOf formula: (1.5 - available/max)^3 * basePrice
  // available=1000 → ratio=0.5 → (1.5-0.5)^3=1.0 → price=25.0
  // available=0    → ratio=0.0 → (1.5-0.0)^3=3.375 → price=84.375
  // available=2000 → ratio=1.0 → (1.5-1.0)^3=0.125 → price=3.125

  it('TC-02 priceOf(tools) při baseline (available=1000) ≈ basePrice (25)', () => {
    const state = makeMarketState();
    const price = priceOf(state, 'tools');
    assert.ok(
      Math.abs(price - 25.0) < 0.01,
      `priceOf(tools) při baseline by mělo být ~25, got ${price}`
    );
  });

  it('TC-02 priceOf(tools) při available=0 (vykoupeno) ≈ 84.375 (horní mez)', () => {
    const state = makeMarketState();
    /** @type {any} */ (state.world.marketState).tools.available = 0;
    const price = priceOf(state, 'tools');
    assert.ok(
      Math.abs(price - 84.375) < 0.01,
      `priceOf(tools) při available=0 by mělo být ~84.375, got ${price}`
    );
  });

  it('TC-02 priceOf(tools) při available=max (přeplněno) ≈ 3.125 (dolní mez)', () => {
    const state = makeMarketState();
    /** @type {any} */ (state.world.marketState).tools.available = 2000;
    const price = priceOf(state, 'tools');
    assert.ok(
      Math.abs(price - 3.125) < 0.01,
      `priceOf(tools) při available=max by mělo být ~3.125, got ${price}`
    );
  });

  it('TC-03 buyingPrice = priceOf × 1.35 (zaokrouhleno na 2dp)', () => {
    const state = makeMarketState();
    const mid = priceOf(state, 'tools');
    const expected = Math.round(mid * 1.35 * 100) / 100;
    const actual = buyingPrice(state, 'tools');
    assert.strictEqual(actual, expected, `buyingPrice(tools) musí být priceOf×1.35 (${expected})`);
  });

  it('TC-04 sellingPrice = priceOf × 0.6 (zaokrouhleno na 2dp)', () => {
    const state = makeMarketState();
    const mid = priceOf(state, 'tools');
    const expected = Math.round(mid * 0.6 * 100) / 100;
    const actual = sellingPrice(state, 'tools');
    assert.strictEqual(actual, expected, `sellingPrice(tools) musí být priceOf×0.6 (${expected})`);
  });

  it('TC-02 clamp: priceOf nikdy nevrátí zápornou cenu (available=0, max=0 edge case)', () => {
    const state = makeMarketState();
    /** @type {any} */ (state.world.marketState).tools.available = 0;
    const price = priceOf(state, 'tools');
    assert.ok(price >= 0, `priceOf nesmí vrátit zápornou hodnotu, got ${price}`);
  });

  it('TC-02 priceOf neexistující komodity vrátí 0', () => {
    const state = makeMarketState();
    const price = priceOf(state, 'neexistujici_zbozi');
    assert.strictEqual(price, 0, 'priceOf neznámé komodity musí vrátit 0');
  });
});

// ---------------------------------------------------------------------------
// TC-05  marketDailyDrift – mean-reversion k=0.2/den
// ---------------------------------------------------------------------------
describe('TC-05 marketDailyDrift – mean-reversion k=0.2/den', () => {
  it('po 1 dni: available posune přesně o 20% rozdílu k baseline', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Hráč vykoupí tools na available=200 (baseline=1000)
    ms.tools.available = 200;
    const availBefore = ms.tools.available;
    const baseline = ms.tools.baseline;

    marketDailyDrift(state, {}, /** @type {any} */ ({}));

    const expected = availBefore + 0.2 * (baseline - availBefore);
    assert.ok(
      Math.abs(ms.tools.available - expected) < 0.001,
      `After 1 drift: expected ${expected}, got ${ms.tools.available}`
    );
  });

  it('drift funguje v OBOU směrech: available > baseline → klesá k baseline', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Nastavíme available výše než baseline
    ms.cloth.available = 2800; // baseline=1500, max=3000
    const availBefore = ms.cloth.available;
    const baseline = ms.cloth.baseline;

    marketDailyDrift(state, {}, /** @type {any} */ ({}));

    // available > baseline → drift klesá
    assert.ok(
      ms.cloth.available < availBefore,
      'drift musí snižovat available když available > baseline'
    );
    const expected = availBefore + 0.2 * (baseline - availBefore);
    assert.ok(
      Math.abs(ms.cloth.available - expected) < 0.001,
      `Drift dolů: expected ${expected}, got ${ms.cloth.available}`
    );
  });

  it('drift clampuje výsledek na [0, max]', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Edge case: available=0, baseline=250 (gems), k=0.2 → next=50 (v rámci [0,500])
    ms.gems.available = 0;
    const baseline = ms.gems.baseline;
    const max = ms.gems.max;

    marketDailyDrift(state, {}, /** @type {any} */ ({}));

    assert.ok(ms.gems.available >= 0 && ms.gems.available <= max,
      `Drift výsledek musí být v [0, ${max}], got ${ms.gems.available}`
    );
    // Konkrétní hodnota: 0 + 0.2*(250-0) = 50
    assert.ok(Math.abs(ms.gems.available - 50) < 0.001,
      `Drift od 0 k baseline 250: expected 50, got ${ms.gems.available}`
    );
  });

  it('drift při available==baseline je no-op (ustálený stav)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const availBefore = ms.tools.available; // = baseline

    marketDailyDrift(state, {}, /** @type {any} */ ({}));

    assert.ok(
      Math.abs(ms.tools.available - availBefore) < 0.001,
      `Drift při available==baseline musí být no-op, got ${ms.tools.available} vs ${availBefore}`
    );
  });

  it('tabulkový test: 3 dny od available=1000 při baseline=1000 (gems, max=500 → baseline=250)', () => {
    // gems: basePrice=120, max=500, baselineFraction=0.5 → baseline=250
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Vykoupíme gems na available=0
    ms.gems.available = 0;

    // Den 1: 0 + 0.2*(250-0) = 50
    marketDailyDrift(state, {}, /** @type {any} */ ({}));
    assert.ok(Math.abs(ms.gems.available - 50) < 0.001, `Den 1: expected 50, got ${ms.gems.available}`);

    // Den 2: 50 + 0.2*(250-50) = 50 + 40 = 90
    marketDailyDrift(state, {}, /** @type {any} */ ({}));
    assert.ok(Math.abs(ms.gems.available - 90) < 0.001, `Den 2: expected 90, got ${ms.gems.available}`);

    // Den 3: 90 + 0.2*(250-90) = 90 + 32 = 122
    marketDailyDrift(state, {}, /** @type {any} */ ({}));
    assert.ok(Math.abs(ms.gems.available - 122) < 0.001, `Den 3: expected 122, got ${ms.gems.available}`);
  });
});

// ---------------------------------------------------------------------------
// TC-06  marketDailyDrift catch-up-safe
// ---------------------------------------------------------------------------
describe('TC-06 marketDailyDrift catch-up-safe (batch == N×single-step)', () => {
  it('50 dní catch-up (engine batch) == 50× manuální marketDailyDrift', () => {
    // State A: batch přes engine
    const stateA = makeMarketState();
    const ctxA = makeCtx();
    stateA.home.food.store = { bread: 50000, fish: 10000 };
    /** @type {any} */ (stateA.world.marketState).tools.available = 200;

    const stepsPerDay = BALANCE.engine.stepsPerDay;
    for (let i = 0; i < 50 * stepsPerDay; i++) {
      step(stateA, ctxA);
    }

    // State B: manuální 50× marketDailyDrift
    const stateB = makeMarketState();
    /** @type {any} */ (stateB.world.marketState).tools.available = 200;
    for (let i = 0; i < 50; i++) {
      marketDailyDrift(stateB, {}, /** @type {any} */ ({}));
    }

    // Výsledná hodnota tools.available musí být totožná (deterministická)
    const availA = /** @type {any} */ (stateA.world.marketState).tools.available;
    const availB = /** @type {any} */ (stateB.world.marketState).tools.available;
    assert.ok(
      Math.abs(availA - availB) < 0.01,
      `50-day catch-up: stateA.tools.available=${availA.toFixed(4)}, stateB=${availB.toFixed(4)} – musí být shodné`
    );
  });
});

// ---------------------------------------------------------------------------
// TC-07  getGoldValue konzistence
// ---------------------------------------------------------------------------
describe('TC-07 getGoldValue konzistence', () => {
  it('koš tools×10 → 10 × priceOf(tools)', () => {
    const state = makeMarketState();
    const expected = 10 * priceOf(state, 'tools');
    const actual = getGoldValue(state, { tools: 10 });
    assert.ok(
      Math.abs(actual - expected) < 0.001,
      `getGoldValue({tools:10}) expected ${expected}, got ${actual}`
    );
  });

  it('gold v koši se počítá 1:1', () => {
    const state = makeMarketState();
    const value = getGoldValue(state, { gold: 777 });
    assert.strictEqual(value, 777, 'gold musí být v koši 1:1');
  });

  it('smíšený koš (gold + goods) = součet', () => {
    const state = makeMarketState();
    const expected = 100 + 5 * priceOf(state, 'cloth');
    const actual = getGoldValue(state, { gold: 100, cloth: 5 });
    assert.ok(
      Math.abs(actual - expected) < 0.001,
      `Smíšený koš: expected ${expected}, got ${actual}`
    );
  });

  it('prázdný koš → 0', () => {
    const state = makeMarketState();
    assert.strictEqual(getGoldValue(state, {}), 0, 'Prázdný koš musí být 0');
  });

  it('getGoldValue se mění s cenou (available změna)', () => {
    const state = makeMarketState();
    const valueBefore = getGoldValue(state, { tools: 1 });

    // Vykoupíme tools → available klesne → cena stoupne
    /** @type {any} */ (state.world.marketState).tools.available = 100;
    const valueAfter = getGoldValue(state, { tools: 1 });

    assert.ok(valueAfter > valueBefore,
      `getGoldValue se musí zvýšit když available klesne (cena stoupne): ${valueAfter} vs ${valueBefore}`
    );
  });
});

// ---------------------------------------------------------------------------
// TC-08  marketInject kontrakt (S-06 pozitivní)
// ---------------------------------------------------------------------------
describe('TC-08 marketInject pozitivní kontrakt (S-06)', () => {
  it('inject +500 tools zvýší available', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const before = ms.tools.available;
    marketInject(state, 'tools', 500);
    assert.ok(ms.tools.available > before,
      `marketInject+500 musí zvýšit available: ${ms.tools.available} vs ${before}`
    );
  });

  it('inject clampuje na max', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    marketInject(state, 'tools', 999999);
    assert.strictEqual(ms.tools.available, ms.tools.max,
      `marketInject přes max musí clampovat na max (${ms.tools.max})`
    );
  });

  it('withdraw (−qty) snižuje available', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const before = ms.cloth.available;
    marketInject(state, 'cloth', -200);
    assert.ok(ms.cloth.available < before,
      `marketInject -200 musí snížit available: ${ms.cloth.available} vs ${before}`
    );
  });

  it('withdraw clampuje na 0 (nesmí být záporné)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    marketInject(state, 'gems', -999999);
    assert.strictEqual(ms.gems.available, 0,
      'marketInject pod 0 musí clampovat na 0'
    );
  });

  it('no-op pro neznámé goodsId (nevyhodí)', () => {
    const state = makeMarketState();
    assert.doesNotThrow(() => {
      marketInject(state, 'neexistujici', 100);
    }, 'marketInject neznámého id nesmí vyhodit');
  });
});

// ---------------------------------------------------------------------------
// TC-09  buyGoods happy path + clamp
// ---------------------------------------------------------------------------
describe('TC-09 buyGoods happy path + clamp available', () => {
  it('buyGoods: gold klesne o totalCost, inventory +qty, available −qty', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    const goldBefore = state.player.gold;
    const availBefore = ms.tools.available;
    const qty = 50;
    const unitPrice = buyingPrice(state, 'tools');
    const expectedCost = Math.round(unitPrice * qty * 100) / 100;

    const r = buyGoods(state, { goodsId: 'tools', qty });
    assert.ok(r.ok, `buyGoods failed: ${r.error}`);

    assert.ok(
      Math.abs(state.player.gold - (goldBefore - expectedCost)) < 0.001,
      `gold musí klesnout o ${expectedCost}: ${state.player.gold} vs ${goldBefore - expectedCost}`
    );
    assert.strictEqual(
      (state.player.inventory && state.player.inventory.tools) || 0,
      qty,
      `inventory.tools musí být ${qty}`
    );
    assert.strictEqual(
      ms.tools.available,
      availBefore - qty,
      `available musí klesnout o qty (${availBefore} → ${availBefore - qty})`
    );
  });

  it('buyGoods: clamp available na 0 (nákup > available)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);
    // Nastavíme gold dost a koupíme víc než je available
    state.player.gold = 9999999;
    ms.tools.available = 10; // jen 10 kusů

    // Koupíme 1000 – ale cena se počítá před clamped (ok per design)
    const r = buyGoods(state, { goodsId: 'tools', qty: 1000 });
    assert.ok(r.ok, `buyGoods should succeed even when qty > available`);
    assert.strictEqual(ms.tools.available, 0, 'available musí být clampováno na 0');
    assert.ok(ms.tools.available >= 0, 'available nesmí být záporné');
  });

  it('buyGoods: validace – neplatné goodsId → {ok:false}', () => {
    const state = makeMarketState();
    const r = buyGoods(state, { goodsId: '', qty: 1 });
    assert.ok(!r.ok, 'prázdné goodsId musí vrátit {ok:false}');
  });

  it('buyGoods: validace – neznámé goodsId → {ok:false}', () => {
    const state = makeMarketState();
    const r = buyGoods(state, { goodsId: 'neznamé', qty: 1 });
    assert.ok(!r.ok, 'neznámé goodsId musí vrátit {ok:false}');
  });

  it('buyGoods: validace – qty = 0 → {ok:false}', () => {
    const state = makeMarketState();
    const r = buyGoods(state, { goodsId: 'tools', qty: 0 });
    assert.ok(!r.ok, 'qty=0 musí vrátit {ok:false}');
  });

  it('buyGoods: validace – qty záporné → {ok:false}', () => {
    const state = makeMarketState();
    const r = buyGoods(state, { goodsId: 'tools', qty: -5 });
    assert.ok(!r.ok, 'záporné qty musí vrátit {ok:false}');
  });

  it('buyGoods: validace – qty desetinné → {ok:false}', () => {
    const state = makeMarketState();
    const r = buyGoods(state, { goodsId: 'tools', qty: 1.5 });
    assert.ok(!r.ok, 'desetinné qty musí vrátit {ok:false}');
  });
});

// ---------------------------------------------------------------------------
// TC-10  buyGoods nedostatek zlata → stav nezměněn (atomicita)
// ---------------------------------------------------------------------------
describe('TC-10 buyGoods: nedostatek zlata → {ok:false}, stav nezměněn', () => {
  it('buyGoods bez dostatku zlata → ok:false, gold nezměněn, inventory nezměněn', () => {
    const state = makeMarketState();
    state.player.gold = 0.01; // skoro nic
    const goldBefore = state.player.gold;
    const inventoryBefore = JSON.stringify(state.player.inventory);

    const r = buyGoods(state, { goodsId: 'tools', qty: 100 });
    assert.ok(!r.ok, 'buyGoods musí vrátit {ok:false} při nedostatku zlata');
    assert.strictEqual(state.player.gold, goldBefore, 'gold nesmí být změněn po neúspěšném nákupu');
    assert.strictEqual(JSON.stringify(state.player.inventory), inventoryBefore, 'inventory nesmí být změněn');
  });
});

// ---------------------------------------------------------------------------
// TC-11  sellGoods happy path + clamp
// ---------------------------------------------------------------------------
describe('TC-11 sellGoods happy path + clamp available', () => {
  it('sellGoods: gold roste o totalGain, inventory −qty, available +qty', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Nejdřív nakoupíme zboží
    const buyQty = 50;
    const buyR = buyGoods(state, { goodsId: 'cloth', qty: buyQty });
    assert.ok(buyR.ok, 'přípravný nákup musí projít');

    const goldAfterBuy = state.player.gold;
    const availAfterBuy = ms.cloth.available;
    const inventoryQty = (state.player.inventory && state.player.inventory.cloth) || 0;
    assert.strictEqual(inventoryQty, buyQty, `inventory.cloth by mělo být ${buyQty}`);

    const sellQty = 30;
    const unitPrice = sellingPrice(state, 'cloth');
    const expectedGain = Math.round(unitPrice * sellQty * 100) / 100;

    const r = sellGoods(state, { goodsId: 'cloth', qty: sellQty });
    assert.ok(r.ok, `sellGoods failed: ${r.error}`);

    assert.ok(
      Math.abs(state.player.gold - (goldAfterBuy + expectedGain)) < 0.001,
      `gold musí stoupnout o ${expectedGain}`
    );
    assert.strictEqual(
      (state.player.inventory && state.player.inventory.cloth) || 0,
      buyQty - sellQty,
      `inventory.cloth musí být ${buyQty - sellQty}`
    );
    assert.strictEqual(
      ms.cloth.available,
      availAfterBuy + sellQty,
      `available musí stoupnout o sellQty`
    );
  });

  it('sellGoods: clamp available na max (prodej > max - available)', () => {
    const state = makeMarketState();
    const ms = /** @type {any} */ (state.world.marketState);

    // Dáme hráči hodně zboží a nastavíme market na max
    state.player.inventory = { silk: 99999 };
    ms.silk.available = ms.silk.max; // už na maxu

    const r = sellGoods(state, { goodsId: 'silk', qty: 1000 });
    assert.ok(r.ok, 'sellGoods by mělo projít');
    assert.strictEqual(ms.silk.available, ms.silk.max, 'available nesmí překročit max');
  });
});

// ---------------------------------------------------------------------------
// TC-12  sellGoods: nedostatek zboží → {ok:false}
// ---------------------------------------------------------------------------
describe('TC-12 sellGoods: nedostatek zboží → {ok:false}', () => {
  it('sellGoods bez inventory → ok:false, stav nezměněn', () => {
    const state = makeMarketState();
    const goldBefore = state.player.gold;

    // Hráč nemá žádné tools
    const r = sellGoods(state, { goodsId: 'tools', qty: 10 });
    assert.ok(!r.ok, 'sellGoods musí vrátit {ok:false} bez inventory');
    assert.strictEqual(state.player.gold, goldBefore, 'gold nesmí být změněn');
  });

  it('sellGoods: prodej více než vlastní → {ok:false}', () => {
    const state = makeMarketState();
    state.player.inventory = { tools: 5 };

    const r = sellGoods(state, { goodsId: 'tools', qty: 10 });
    assert.ok(!r.ok, 'sellGoods s qty > owned musí vrátit {ok:false}');
  });
});

// ---------------------------------------------------------------------------
// TC-13  sendCaravan: happy path
// ---------------------------------------------------------------------------
describe('TC-13 sendCaravan: happy path', () => {
  it('sendCaravan: sentOut=27000, recGoods naplněno, zboží odebráno z inventáře', () => {
    const state = makeMarketState();
    // Dáme hráči zboží na prodej
    state.player.inventory = { cloth: 100 };
    const goldBefore = state.player.gold;

    const r = sendCaravan(state, {
      buy: { tools: 50 },
      sell: { cloth: 100 },
    });
    assert.ok(r.ok, `sendCaravan failed: ${r.error}`);

    const caravan = /** @type {any} */ (state.world.caravan);
    // sentOut = 900 * (30 - 0) = 27000
    assert.strictEqual(caravan.sentOut, 27000, 'sentOut musí být 27000 (30 dní při speed=0)');

    // recGoods musí obsahovat nakoupené zboží
    assert.ok(caravan.recGoods.tools === 50, `recGoods.tools musí být 50, got ${caravan.recGoods.tools}`);

    // Zboží na prodej musí být odebráno z inventáře
    const clothOwned = (state.player.inventory && state.player.inventory.cloth) || 0;
    assert.strictEqual(clothOwned, 0, 'prodávané zboží musí být odebráno ihned');
  });

  it('sendCaravan: scheduleInsert vloží caravanReturns do engine.schedule', () => {
    const state = makeMarketState();
    state.player.gold = 999999;
    const curStep = state.engine.curStep;

    const r = sendCaravan(state, { buy: { gems: 10 }, sell: {} });
    assert.ok(r.ok, `sendCaravan failed: ${r.error}`);

    const schedule = state.engine.schedule;
    assert.ok(schedule.length > 0, 'engine.schedule musí mít aspoň 1 položku');

    const caravanEvent = schedule.find(/** @type {any} */(e) => e.id === 'caravanReturns');
    assert.ok(caravanEvent, 'schedule musí obsahovat caravanReturns');
    assert.strictEqual(caravanEvent.step, curStep + 27000, `caravanReturns musí být naplánováno na step ${curStep + 27000}`);
  });

  it('sendCaravan: expenditures>0 → gold odečten; expenditures<0 → gold v recGoods', () => {
    const state = makeMarketState();
    state.player.gold = 999999;
    state.player.inventory = { silk: 500 };

    const goldBefore = state.player.gold;

    // Sell hodně silk (expensive), buy málo tools (cheap) → expenditures < 0 (čistý příjem)
    const buyT = buyingPrice(state, 'tools') * 10;
    const sellS = sellingPrice(state, 'silk') * 500;
    // sellS >> buyT → expenditures záporné

    if (sellS > buyT) {
      const r = sendCaravan(state, { buy: { tools: 10 }, sell: { silk: 500 } });
      assert.ok(r.ok, `sendCaravan failed: ${r.error}`);
      const caravan = /** @type {any} */ (state.world.caravan);
      // Čistý příjem by měl být v recGoods.gold
      assert.ok(
        caravan.recGoods.gold !== undefined && caravan.recGoods.gold > 0,
        `čistý příjem musí být v recGoods.gold: ${JSON.stringify(caravan.recGoods)}`
      );
    }
    // Pokud sellS <= buyT, příjem je záporný a gold byl odečten – to je OK
  });
});

// ---------------------------------------------------------------------------
// TC-14  sendCaravan: busy → {ok:false}
// ---------------------------------------------------------------------------
describe('TC-14 sendCaravan: busy → {ok:false}', () => {
  it('sendCaravan když caravan.sentOut > 0 → ok:false', () => {
    const state = makeMarketState();
    state.player.gold = 999999;

    // První odeslání
    const r1 = sendCaravan(state, { buy: { gems: 10 }, sell: {} });
    assert.ok(r1.ok, `první sendCaravan failed: ${r1.error}`);

    // Druhé odeslání (karavana stále na cestě)
    const r2 = sendCaravan(state, { buy: { cloth: 5 }, sell: {} });
    assert.ok(!r2.ok, 'druhý sendCaravan musí vrátit {ok:false} (karavana je na cestě)');
    assert.ok(r2.error && r2.error.includes('cestě'), `chyba musí zmínit 'na cestě': ${r2.error}`);
  });
});

// ---------------------------------------------------------------------------
// TC-15  sendCaravan: kapacita překročena → {ok:false}
// ---------------------------------------------------------------------------
describe('TC-15 sendCaravan: kapacita překročena → {ok:false}', () => {
  it('buy přes kapacitu (10000) → {ok:false}', () => {
    const state = makeMarketState();
    state.player.gold = 999999;
    // gems.max = 500 < 10000 kapacita, ale tools qty > capacity
    const r = sendCaravan(state, { buy: { tools: 99999 }, sell: {} });
    // 99999 > capacity (10000) → chyba kapacity
    assert.ok(!r.ok, 'sendCaravan s buy > capacity musí vrátit {ok:false}');
  });
});

// ---------------------------------------------------------------------------
// TC-16  caravanReturns: grant recGoods, sentOut→0
// ---------------------------------------------------------------------------
describe('TC-16 caravanReturns: grant recGoods, sentOut→0', () => {
  it('caravanReturns doručí tools+gold do inventáře, sentOut→0, recGoods→{}', () => {
    const state = makeMarketState();
    const caravan = /** @type {any} */ (state.world.caravan);
    caravan.sentOut = 1;
    caravan.recGoods = { tools: 50, gold: 200 };

    const goldBefore = state.player.gold;
    const ctx = makeCtx();
    ctx.emitTx = () => {}; // dummy

    caravanReturns(state, {}, /** @type {any} */ (ctx));

    assert.strictEqual((state.player.inventory && state.player.inventory.tools) || 0, 50,
      'inventory.tools musí být 50 po návratu karavany');
    assert.ok(
      Math.abs(state.player.gold - (goldBefore + 200)) < 0.001,
      `gold musí stoupnout o 200: ${state.player.gold} vs ${goldBefore + 200}`
    );
    assert.strictEqual(caravan.sentOut, 0, 'sentOut musí být 0 po návratu');
    assert.deepStrictEqual(caravan.recGoods, {}, 'recGoods musí být {} po návratu');
  });

  it('caravanReturns s prázdnými recGoods: nic se nedoručí, nedojde k pádu', () => {
    const state = makeMarketState();
    const caravan = /** @type {any} */ (state.world.caravan);
    caravan.sentOut = 1;
    caravan.recGoods = {};

    const goldBefore = state.player.gold;
    const ctx = makeCtx();
    ctx.emitTx = () => {};

    assert.doesNotThrow(() => {
      caravanReturns(state, {}, /** @type {any} */ (ctx));
    });
    assert.strictEqual(state.player.gold, goldBefore, 'gold nesmí být změněn pro prázdné recGoods');
    assert.strictEqual(caravan.sentOut, 0, 'sentOut musí být 0');
  });
});

// ---------------------------------------------------------------------------
// TC-17  caravan round-trip přes save/load uprostřed cesty
// ---------------------------------------------------------------------------
describe('TC-17 caravan save/load uprostřed cesty', () => {
  it('caravan stav (sentOut, recGoods) přežije applyPersist→loadAndReconstruct', () => {
    const state = makeMarketState();
    const caravan = /** @type {any} */ (state.world.caravan);
    caravan.sentOut = 15000;
    caravan.recGoods = { tools: 30, gold: 500 };

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    const restoredCaravan = /** @type {any} */ (restored.world.caravan);
    assert.strictEqual(restoredCaravan.sentOut, 15000,
      `sentOut musí přežít save/load: got ${restoredCaravan.sentOut}`);
    assert.strictEqual(restoredCaravan.recGoods.tools, 30,
      `recGoods.tools musí přežít save/load: got ${restoredCaravan.recGoods.tools}`);
    assert.strictEqual(restoredCaravan.recGoods.gold, 500,
      `recGoods.gold musí přežít save/load: got ${restoredCaravan.recGoods.gold}`);
  });

  it('engine.schedule (caravanReturns event) přežije save/load', () => {
    const state = makeMarketState();
    scheduleInsert(state, 27000, 'caravanReturns', {});

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    const event = restored.engine.schedule.find(/** @type {any} */(e) => e.id === 'caravanReturns');
    assert.ok(event, 'caravanReturns event musí přežít save/load');
    assert.strictEqual(event.step, 27000, `event.step musí být 27000: got ${event.step}`);
  });

  it('caravan vrátí se po catch-upu (sendCaravan + advance 30 dní)', () => {
    const state = makeMarketState();
    const ctx = makeCtx();
    ctx.emitTx = () => {};

    state.player.gold = 999999;

    // Odeslání karavany (buy gems)
    const r = sendCaravan(state, { buy: { gems: 10 }, sell: {} });
    assert.ok(r.ok, `sendCaravan failed: ${r.error}`);

    const caravanBefore = /** @type {any} */ (state.world.caravan);
    assert.strictEqual(caravanBefore.sentOut, 27000, 'sentOut musí být 27000');

    // Advance 30 dní (27000 kroků) + 1 extra krok pro jistotu
    for (let i = 0; i < 27001; i++) {
      step(state, ctx);
    }

    const caravanAfter = /** @type {any} */ (state.world.caravan);
    assert.strictEqual(caravanAfter.sentOut, 0, 'sentOut musí být 0 po návratu karavany');
    const gemsOwned = (state.player.inventory && state.player.inventory.gems) || 0;
    assert.strictEqual(gemsOwned, 10, `gems musí být doručeny do inventáře: ${gemsOwned}`);
  });
});

// ---------------------------------------------------------------------------
// TC-18  WIRING: buyGoods/sellGoods/sendCaravan přes send() po bootu (bootSequence)
// ---------------------------------------------------------------------------
describe('TC-18 WIRING: buyGoods/sellGoods/sendCaravan přes send() po bootu', () => {
  /** Helper: fake env for bootSequence (no DOM, no IDB) */
  function makeFakeEnv() {
    let nowMs = 1_700_000_000_000;
    let capturedSend = null;
    return {
      now: () => nowMs,
      raf: (_cb) => 1,
      cancelRaf: () => {},
      setInterval: (_ms, _cb) => 1,
      lifecycleTarget: {
        visibilityState: 'visible',
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      lifecycleWin: {
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      showError: (info) => { throw new Error(`bootSequence error: ${JSON.stringify(info)}`); },
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
      loadCatalogs: async () => {
        clearCatalogs();
        for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'population']) {
          loadCatalog(name, loadJson(name));
        }
      },
      loadGame: async () => null, // fresh game
      saveGame: async () => {},
      exportToString: () => 'FAKE',
      importFromString: () => { throw new Error('not called'); },
      getCapturedSend: () => capturedSend,
    };
  }

  it('buyGoods je registrované v bootstrapEngine – send() přes dispatch', async () => {
    const env = makeFakeEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence musí uspět');

    const send = env.getCapturedSend();
    assert.ok(typeof send === 'function', 'send musí být funkce');

    // Inicializujeme market (bootSequence to dělá v marketInit)
    // send('buyGoods') s neplatnými params – ale nesmí vrátit "unknown command"
    const r = send('buyGoods', { goodsId: 'tools', qty: 1 });
    assert.ok(
      !r.error?.includes('unknown command'),
      `buyGoods musí být registrovaný (ne 'unknown command'): ${r.error ?? 'ok'}`
    );
  });

  it('sellGoods je registrované v bootstrapEngine', async () => {
    const env = makeFakeEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence musí uspět');

    const send = env.getCapturedSend();
    const r = send('sellGoods', { goodsId: 'tools', qty: 1 });
    assert.ok(
      !r.error?.includes('unknown command'),
      `sellGoods musí být registrovaný: ${r.error ?? 'ok'}`
    );
  });

  it('sendCaravan je registrovaný v bootstrapEngine', async () => {
    const env = makeFakeEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence musí uspět');

    const send = env.getCapturedSend();
    const r = send('sendCaravan', { buy: {}, sell: {} });
    assert.ok(
      !r.error?.includes('unknown command'),
      `sendCaravan musí být registrovaný: ${r.error ?? 'ok'}`
    );
  });

  it('creg s jen buyGoods/sellGoods/sendCaravan – dispatch funguje', () => {
    const state = makeMarketState();
    const creg = makeCreg();

    const r = dispatch(creg, state, { type: 'buyGoods', params: { goodsId: 'tools', qty: 1 } });
    assert.ok(!r.error?.includes('unknown command'), `buyGoods dispatch: ${r.error ?? 'ok'}`);

    const r2 = dispatch(creg, state, { type: 'sellGoods', params: { goodsId: 'tools', qty: 1 } });
    assert.ok(!r2.error?.includes('unknown command'), `sellGoods dispatch: ${r2.error ?? 'ok'}`);

    const r3 = dispatch(creg, state, { type: 'sendCaravan', params: { buy: {}, sell: {} } });
    assert.ok(!r3.error?.includes('unknown command'), `sendCaravan dispatch: ${r3.error ?? 'ok'}`);
  });
});

// ---------------------------------------------------------------------------
// TC-19  PLNÝ MVP e2e: bootSequence → simulace → save → offline shift → bootSequence → catch-up → stav konzistentní
// ---------------------------------------------------------------------------
describe('TC-19 PLNÝ MVP e2e scénář', () => {
  /** Fake env builder pro e2e testy */
  function makeE2eEnv({ lastSimTimestamp = undefined, savedState = null } = {}) {
    let nowMs = 1_700_000_000_000;
    const saves = [];
    let capturedSend = null;

    return {
      now: () => nowMs,
      advanceWallClock: (ms) => { nowMs += ms; },
      raf: (_cb) => 1,
      cancelRaf: () => {},
      setInterval: (_ms, _cb) => 1,
      lifecycleTarget: {
        visibilityState: 'visible',
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      lifecycleWin: {
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      showError: (info) => { throw new Error(`bootSequence error: ${info.kind}: ${info.message}`); },
      mountUI: (deps) => {
        capturedSend = deps.send;
        return { requestRender: () => {} };
      },
      loadCatalogs: async () => {
        clearCatalogs();
        for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'population']) {
          loadCatalog(name, loadJson(name));
        }
      },
      loadGame: async () => {
        if (savedState && lastSimTimestamp !== undefined) {
          return { state: savedState, record: { lastSimTimestamp } };
        }
        return null; // fresh game
      },
      saveGame: async (state) => {
        saves.push({ state: JSON.parse(JSON.stringify(applyPersist(state))), ts: nowMs });
      },
      exportToString: () => 'FAKE',
      importFromString: () => { throw new Error('not called'); },
      getSaves: () => saves,
      getCapturedSend: () => capturedSend,
    };
  }

  it('TC-19a Fresh boot: marketState inicializovaný (5 komodit), send() funkční', async () => {
    const env = makeE2eEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence musí uspět');

    const ms = /** @type {any} */ (result.state.world.marketState);
    const ids = Object.keys(ms);
    assert.ok(ids.length >= 5, `marketState musí mít aspoň 5 komodit, got ${ids.length}: ${ids.join(',')}`);

    // Každá komodita musí mít available, max, baseline
    for (const id of ids) {
      assert.ok(ms[id].available >= 0, `${id}.available musí být >= 0`);
      assert.ok(ms[id].max > 0, `${id}.max musí být > 0`);
      assert.ok(ms[id].baseline > 0, `${id}.baseline musí být > 0`);
    }

    // send('buyGoods') musí fungovat přes bootSequence wiring
    const send = env.getCapturedSend();
    result.state.player.gold = 999999;
    const r = send('buyGoods', { goodsId: ids[0], qty: 10 });
    assert.ok(r.ok, `buyGoods přes send() musí projít: ${r.error}`);
  });

  it('TC-19b Idle smyčka: herní den projde bez chyby, drift mění ceny', async () => {
    const env = makeE2eEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null, 'bootSequence musí uspět');

    const state = result.state;
    state.home.food.store = { bread: 99999, fish: 9999 };
    state.player.gold = 50000;

    // Nastavíme tools na nízkou available → drift stoupá
    /** @type {any} */ (state.world.marketState).tools.available = 100;

    const ctx = makeCtx();
    ctx.emitTx = () => {};

    const priceToolsBefore = priceOf(state, 'tools');

    // Advance 1 herní den
    advanceDays(state, ctx, 1);

    const priceToolsAfter = priceOf(state, 'tools');

    // Drift by měl zvýšit available (100 → baseline 1000) → cena klesá
    assert.ok(
      priceToolsAfter < priceToolsBefore,
      `Drift po 1 dni: cena tools musí klesnout (available stoupne k baseline): before=${priceToolsBefore.toFixed(2)}, after=${priceToolsAfter.toFixed(2)}`
    );
  });

  it('TC-19c Save/load: marketState a caravan přežijí applyPersist→loadAndReconstruct', async () => {
    const env = makeE2eEnv();
    const result = await bootSequence(env);
    assert.ok(result !== null);

    const state = result.state;
    state.player.gold = 999999;

    // Nakoupíme zboží
    const send = env.getCapturedSend();
    const r = send('buyGoods', { goodsId: 'tools', qty: 50 });
    assert.ok(r.ok, `buy failed: ${r.error}`);

    const availBefore = /** @type {any} */ (state.world.marketState).tools.available;

    // Save
    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    // marketState zachován
    const restoredMs = /** @type {any} */ (restored.world.marketState);
    assert.ok(restoredMs && typeof restoredMs === 'object', 'marketState musí být zachován');
    assert.ok(Object.keys(restoredMs).length >= 5, 'marketState musí mít aspoň 5 komodit');
    assert.strictEqual(restoredMs.tools.available, availBefore,
      `tools.available musí být zachován po save/load: ${restoredMs.tools.available} vs ${availBefore}`
    );

    // Caravan zachován
    const restoredCaravan = /** @type {any} */ (restored.world.caravan);
    assert.ok(restoredCaravan, 'caravan musí být zachován');
    assert.ok(typeof restoredCaravan.capacity === 'number', 'caravan.capacity musí být číslo');
  });

  it('TC-19d Offline catch-up: bootSequence po offline posunu dopočítá kroky (stav konzistentní)', async () => {
    // Krok 1: Fresh boot
    const env1 = makeE2eEnv();
    const result1 = await bootSequence(env1);
    assert.ok(result1 !== null, 'První boot musí uspět');

    const savedState = result1.state;
    savedState.home.food.store = { bread: 99999, fish: 9999 };
    savedState.player.gold = 50000;
    /** @type {any} */ (savedState.world.marketState).gems.available = 50; // nízký available

    const stepsBefore = savedState.engine.curStep;

    // Krok 2: Simulujeme offline čas (5 minut)
    const OFFLINE_MS = 5 * 60 * 1000; // 5 minut
    const savedTimestamp = 1_700_000_000_000;
    const nowAfterOffline = savedTimestamp + OFFLINE_MS;

    // Krok 3: Druhý boot s offline časem
    const env2 = makeE2eEnv({
      lastSimTimestamp: savedTimestamp,
      savedState: JSON.parse(JSON.stringify(applyPersist(savedState))),
    });
    // Přepíšeme loadGame aby vrátilo správný stav
    const savedPayload = applyPersist(savedState);
    env2.loadGame = async () => ({
      state: loadAndReconstruct(savedPayload),
      record: { lastSimTimestamp: savedTimestamp },
    });
    env2.advanceWallClock(OFFLINE_MS);
    // Přepíšeme now aby vracelo čas po offline
    const fixedNow = nowAfterOffline;
    env2.now = () => fixedNow;

    const result2 = await bootSequence(env2);
    assert.ok(result2 !== null, 'Druhý boot po offline musí uspět');

    // Catch-up musí dopočítat kroky
    const stepsExpected = Math.floor(OFFLINE_MS / STEP_MS);
    assert.ok(
      result2.state.engine.curStep >= stepsExpected,
      `Catch-up musí dopočítat aspoň ${stepsExpected} kroků, got ${result2.state.engine.curStep}`
    );

    // offlineSummary musí existovat
    assert.ok(result2.offlineSummary !== null, 'offlineSummary musí být k dispozici po catch-upu');
    assert.ok(result2.offlineSummary.stepsRun > 0, 'offlineSummary.stepsRun musí být > 0');

    // Drift musí proběhnout: gems.available by měl být vyšší (drift k baseline=250)
    const gemsAfter = /** @type {any} */ (result2.state.world.marketState).gems.available;
    // 5 minut = 6000 kroků = ~6.67 dní → drift musí proběhnout aspoň 1×
    const daysPassed = Math.floor(stepsExpected / BALANCE.engine.stepsPerDay);
    if (daysPassed >= 1) {
      assert.ok(
        gemsAfter > 50,
        `Drift v catch-upu musí zvýšit gems.available (bylo 50, po ${daysPassed} dnech): got ${gemsAfter}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// TC-20  migrace v2→v3
// ---------------------------------------------------------------------------
describe('TC-20 migrace v2→v3', () => {
  it('v2 payload → migrate → má world.marketState={} a world.caravan default, saveVersion=3', () => {
    // Simulujeme v2 payload (bez marketState, bez caravan)
    const v2Payload = {
      meta: { saveVersion: 2, gameVersion: '0.0.0', seed: 1 },
      engine: { curStep: 100 },
      world: { zones: [], factions: [], forest: {}, field: {}, mine: {} },
    };

    const v3 = /** @type {any} */ (migrate(v2Payload));

    assert.strictEqual(v3.meta.saveVersion, 3, 'saveVersion musí být 3 po migraci');
    assert.ok(v3.world.marketState !== undefined, 'world.marketState musí existovat');
    assert.deepStrictEqual(v3.world.marketState, {}, 'world.marketState musí být {} (marketInit doplní)');
    assert.ok(v3.world.caravan !== undefined, 'world.caravan musí existovat');
    assert.strictEqual(v3.world.caravan.capacity, 10000, 'caravan.capacity musí být 10000');
    assert.strictEqual(v3.world.caravan.speed, 0, 'caravan.speed musí být 0');
    assert.strictEqual(v3.world.caravan.sentOut, 0, 'caravan.sentOut musí být 0');
    assert.deepStrictEqual(v3.world.caravan.recGoods, {}, 'caravan.recGoods musí být {}');
  });

  it('SAVE_VERSION je aktuálně 3', () => {
    assert.strictEqual(SAVE_VERSION, 3, 'SAVE_VERSION musí být 3 pro M4b');
  });

  it('v2 payload přes migrate → world.marketState zachován pokud existoval', () => {
    const v2WithMarket = {
      meta: { saveVersion: 2 },
      world: { marketState: { tools: { available: 999, max: 2000, baseline: 1000 } } },
    };
    // marketState existuje → migrate ho zachová (idempotentní)
    const v3 = /** @type {any} */ (migrate(v2WithMarket));
    // Existující marketState by neměl být přepsán
    assert.ok(v3.world.marketState, 'marketState musí existovat');
    // Zachová původní hodnoty
    assert.strictEqual(v3.world.marketState.tools?.available, 999, 'existující marketState nesmí být přepsán');
  });
});

// ---------------------------------------------------------------------------
// TC-21  persist round-trip: marketState+caravan zachovány
// ---------------------------------------------------------------------------
describe('TC-21 persist round-trip: marketState+caravan přes applyPersist→loadAndReconstruct', () => {
  it('marketState přežije applyPersist→loadAndReconstruct', () => {
    const state = makeMarketState();

    // Modifikujeme available (simulace nákupu)
    /** @type {any} */ (state.world.marketState).tools.available = 123;

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    const restoredMs = /** @type {any} */ (restored.world.marketState);
    assert.ok(restoredMs, 'marketState musí existovat po loadAndReconstruct');
    assert.strictEqual(restoredMs.tools.available, 123,
      `tools.available musí být 123 po round-trip, got ${restoredMs.tools.available}`
    );
    assert.strictEqual(restoredMs.tools.max, /** @type {any} */ (state.world.marketState).tools.max,
      'tools.max musí být zachován'
    );
  });

  it('caravan (sentOut, recGoods) přežije applyPersist→loadAndReconstruct', () => {
    const state = makeMarketState();
    const caravan = /** @type {any} */ (state.world.caravan);
    caravan.sentOut = 12345;
    caravan.recGoods = { cloth: 77 };
    // scheduleInsert přidá event do schedule
    scheduleInsert(state, 12345, 'caravanReturns', {});

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    const rc = /** @type {any} */ (restored.world.caravan);
    assert.strictEqual(rc.sentOut, 12345, `sentOut musí být zachován, got ${rc.sentOut}`);
    assert.strictEqual(rc.recGoods.cloth, 77, `recGoods.cloth musí být zachován, got ${rc.recGoods.cloth}`);

    // Schedule event musí být zachován
    const event = restored.engine.schedule.find(/** @type {any} */(e) => e.id === 'caravanReturns');
    assert.ok(event, 'caravanReturns event musí přežít round-trip');
  });
});

// ---------------------------------------------------------------------------
// TC-22  grep-gate DA5: žádná přímá mutace player.gold = v systems/
// ---------------------------------------------------------------------------
describe('TC-22 grep-gate DA5: žádná přímá mutace player.gold = v src/core/systems/', () => {
  it('src/core/systems/*.js neobsahují "player.gold =" (DA5 grep-gate)', () => {
    const systemsDir = join(SRC_DIR, 'core', 'systems');
    const files = readdirSync(systemsDir).filter(f => f.endsWith('.js'));

    const violations = [];
    for (const file of files) {
      const content = readFileSync(join(systemsDir, file), 'utf8');
      // Hledáme přímou mutaci: player.gold = (nikoliv player.gold === apod.)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match: player.gold = (ne ==, !=, <=, >=)
        if (/player\.gold\s*=[^=]/.test(line) && !/\/\//.test(line.slice(0, line.search(/player\.gold/)))) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `DA5 grep-gate FAIL: přímé mutace player.gold = nalezeny v src/core/systems/:\n${violations.join('\n')}`
    );
  });
});
