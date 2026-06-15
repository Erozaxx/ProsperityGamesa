/**
 * m9a-market.test.js – iter-020 C-020-A (Trh — hratelnostní cíle + driftK kalibrace).
 *
 * Implementuje T1 cíle z design_iter-020_T-001.md §1 jako MĚŘITELNÉ deterministické testy:
 *   - CÍL-1 recovery (mean-reversion): ≤5% odchylka od baseline za N=14 dní; ≥48% mezery za 3 dny.
 *   - CÍL-2 arbitráž neztrátová: sellingPrice < buyingPrice vždy + round-trip buy→sell ztrátový.
 *   - CÍL-3 impact persistence: drift zachová ≥60% hráčova dopadu za 1 den.
 *
 * T2 (§2): driftK sweep jako audit trail — potvrzuje, že driftK=0.2 leží v okně [0.10, 0.40]
 * a splňuje všechny tři cíle (G-MARKET-DRIFT closure, provenance approximated→calibrated).
 *
 * Determinismus: seedovaný headless běh přes test/helpers/marketHarness.mjs.
 * Žádný Date.now / Math.random / DOM. Cenový/drift vzorec se NEMĚNÍ (kalibrace = data/komentář).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeMarketState,
  marketOf,
  maxSellOff,
  driftDays,
  recoveryDays,
} from './helpers/marketHarness.mjs';
import { priceOf, buyingPrice, sellingPrice, marketDailyDrift } from '../src/core/systems/market.js';
import { buyGoods } from '../src/core/commands/buyGoods.js';
import { sellGoods } from '../src/core/commands/sellGoods.js';
import { clearCatalogs } from '../src/core/catalog/index.js';
import { BALANCE } from '../src/core/balance/balance.js';

after(() => {
  clearCatalogs();
});

const SEED = 0xCA11B;

// ---------------------------------------------------------------------------
// CÍL-1 — Návrat k baseline po velkém výprodeji (mean-reversion recovery)
// ---------------------------------------------------------------------------
// Po naplnění available=max (maximální výprodej, baseline=0.5·max, mezera=0.5·max):
//   - po N=14 dní čistého driftu: |available−baseline|/baseline ≤ 0.05  (0.8^14≈0.044).
//   - po 3 dnech: obnoveno ≥48% počáteční mezery (1−0.8³=0.488).
// Citlivé jen na driftK; baselineFraction/max nemění relativní poměr.
describe('CÍL-1 recovery: drift vrátí available k baseline po max výprodeji', () => {
  it('po N=14 dní je odchylka ≤5% baseline (čistě z driftu) pro všechna goods', () => {
    const { state, ctx, goods } = makeMarketState(SEED);
    maxSellOff(state); // available = max pro všechna goods

    const snaps = driftDays(state, ctx, 14);
    const day14 = snaps[13];

    for (const good of goods) {
      assert.ok(
        day14[good.id].dev <= 0.05,
        `${good.id}: po 14 dnech musí být odchylka ≤5% baseline, got ${(day14[good.id].dev * 100).toFixed(2)}%`
      );
    }
  });

  it('po 3 dnech je obnoveno ≥48% počáteční mezery (cena se zjevně hýbe zpět, ne skokem)', () => {
    const { state, ctx, goods } = makeMarketState(SEED);
    const ms = marketOf(state);

    // Počáteční mezera = |max − baseline| pro každé good.
    /** @type {Record<string, number>} */
    const gap0 = {};
    maxSellOff(state);
    for (const good of goods) {
      gap0[good.id] = Math.abs(ms[good.id].available - ms[good.id].baseline);
    }

    const snaps = driftDays(state, ctx, 3);
    const day3 = snaps[2];

    for (const good of goods) {
      const gapNow = Math.abs(day3[good.id].available - day3[good.id].baseline);
      const recovered = 1 - gapNow / gap0[good.id];
      assert.ok(
        recovered >= 0.48,
        `${good.id}: po 3 dnech musí být obnoveno ≥48% mezery, got ${(recovered * 100).toFixed(1)}%`
      );
      // a zároveň NE skokem (drift je viditelný, ne okamžitý — chrání CÍL-3)
      assert.ok(
        recovered < 1.0,
        `${good.id}: drift po 3 dnech NESMÍ obnovit 100% (jinak je neviditelný), got ${(recovered * 100).toFixed(1)}%`
      );
    }
  });

  it('empiricky: recoveryDays(tol=5%) = 14 dní pro tools (kalibrovaný cíl driftK=0.2)', () => {
    const { state, ctx } = makeMarketState(SEED);
    maxSellOff(state);
    const days = recoveryDays(state, ctx, 'tools', 0.05);
    assert.strictEqual(days, 14, `recoveryDays(tools, 5%) musí být 14 (0.8^14≈0.044<0.05, 0.8^13≈0.055), got ${days}`);
  });
});

// ---------------------------------------------------------------------------
// CÍL-2 — Arbitráž okamžitý nákup→prodej NENÍ zisková (spread invariant)
// ---------------------------------------------------------------------------
// sellingPrice < buyingPrice pro libovolné available ∈ [0, max] a všechna goods.
// Round-trip buy K → sell K skončí čistou ztrátou gold. Invariant (haggleSell 0.6 < haggleBuy 1.35).
describe('CÍL-2 arbitráž neztrátová: sell<buy invariant + round-trip ztrátový', () => {
  it('sellingPrice < buyingPrice napříč available ∈ {0, .25, .5, .75, 1}·max × všechna goods', () => {
    const { state, goods } = makeMarketState(SEED);
    const ms = marketOf(state);

    const fractions = [0, 0.25, 0.5, 0.75, 1];
    for (const good of goods) {
      for (const f of fractions) {
        ms[good.id].available = Math.round(good.max * f);
        const buy = buyingPrice(state, good.id);
        const sell = sellingPrice(state, good.id);
        assert.ok(
          sell < buy,
          `${good.id} @available=${(f * 100)}%·max: sellingPrice (${sell}) musí být < buyingPrice (${buy})`
        );
      }
    }
  });

  it('round-trip buy K → sell K je vždy ztrátový (gold klesne) napříč goods', () => {
    const { state, goods } = makeMarketState(SEED);
    const K = 10;

    for (const good of goods) {
      state.player.gold = 10_000_000;
      state.player.inventory = {};
      const goldBefore = state.player.gold;

      const rb = buyGoods(state, { goodsId: good.id, qty: K });
      assert.ok(rb.ok, `${good.id}: buyGoods selhal: ${rb.error}`);

      const rs = sellGoods(state, { goodsId: good.id, qty: K });
      assert.ok(rs.ok, `${good.id}: sellGoods selhal: ${rs.error}`);

      assert.ok(
        state.player.gold < goldBefore,
        `${good.id}: round-trip buy→sell MUSÍ být ztrátový — gold po (${state.player.gold}) < před (${goldBefore})`
      );
    }
  });

  it('velký round-trip s cenovým dopadem zůstává ostře ztrátový (návratnost výrazně < 1)', () => {
    // Velký nákup (K=100 z baseline=1500 cloth) posune available → cenový dopad je reálný.
    // Round-trip MUSÍ být ztrátový i s dopadem; spread 0.6/1.35 drží návratnost hluboko pod 1.
    const { state } = makeMarketState(SEED);
    const K = 100;
    state.player.gold = 10_000_000;
    state.player.inventory = {};

    const goldBefore = state.player.gold;
    const rb = buyGoods(state, { goodsId: 'cloth', qty: K });
    assert.ok(rb.ok, `buy selhal: ${rb.error}`);
    const spent = goldBefore - state.player.gold;

    const rs = sellGoods(state, { goodsId: 'cloth', qty: K });
    assert.ok(rs.ok, `sell selhal: ${rs.error}`);
    const got = state.player.gold - (goldBefore - spent);

    const ratio = got / spent;
    // Spread strop: i kdyby cenový dopad hrál ve prospěch prodeje, návratnost nesmí překročit
    // haggleSell/haggleBuy = 0.6/1.35 ≈ 0.444 (sell běží proti vyšší ceně, ale stejný poměr spreadu).
    // Konzervativní invariant: ztráta je výrazná (návratnost < 0.55, tj. ztráta > 45% vynaloženého gold).
    assert.ok(
      ratio < 0.55,
      `round-trip s dopadem musí být výrazně ztrátový: návratnost ${ratio.toFixed(4)} musí být < 0.55`
    );
    assert.ok(got < spent, `round-trip MUSÍ být ztrátový: got ${got.toFixed(2)} < spent ${spent.toFixed(2)}`);
  });
});

// ---------------------------------------------------------------------------
// CÍL-3 — Drift NEVYHLADÍ hráčův cenový dopad během jednoho dne (impact persistence)
// ---------------------------------------------------------------------------
// Po dopadu Δ₀ od baseline jeden den driftu zachová ≥60% dopadu (1−driftK=0.80 ≥ 0.60).
describe('CÍL-3 impact persistence: drift zachová ≥60% hráčova dopadu za 1 den', () => {
  it('po max výprodeji (Δ₀=0.5·max) zůstane ≥60% dopadu po 1 dni driftu', () => {
    const { state, ctx, goods } = makeMarketState(SEED);
    const ms = marketOf(state);

    /** @type {Record<string, number>} */
    const delta0 = {};
    maxSellOff(state);
    for (const good of goods) {
      delta0[good.id] = Math.abs(ms[good.id].available - ms[good.id].baseline);
    }

    marketDailyDrift(state, {}, /** @type {any} */ (ctx));

    for (const good of goods) {
      const remaining = Math.abs(ms[good.id].available - ms[good.id].baseline);
      assert.ok(
        remaining >= 0.60 * delta0[good.id],
        `${good.id}: po 1 dni musí zůstat ≥60% dopadu (${(0.60 * delta0[good.id]).toFixed(1)}), got ${remaining.toFixed(1)}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// T2 — driftK kalibrace: potvrzení driftK=0.2 (G-MARKET-DRIFT closure)
// ---------------------------------------------------------------------------
// Sweep driftK ∈ {0.10, 0.15, 0.20, 0.25, 0.30, 0.40}: tabuluj N(recovery 5%) a impact-retention(1 den).
// 0.2 = bezpečný střed okna [0.10, 0.40] splňující CÍL-1 i CÍL-3. Cenový/drift vzorec se NEMĚNÍ —
// sweep simuluje drift čistě analyticky (zbytkový faktor (1−k)^n), bez mutace BALANCE.
describe('T2 driftK kalibrace: 0.2 potvrzeno proti CÍL-1/CÍL-3 (okno [0.10, 0.40])', () => {
  // Analytický model driftu (1:1 s marketDailyDrift bez clampu na neclampovaném pásmu):
  //   po n dnech zůstává faktor (1−k)^n počáteční odchylky.
  // Recovery N = nejmenší n kde (1−k)^n ≤ tol. Retention(1 den) = 1−k.
  function recoveryN(k, tol) {
    let gap = 1, n = 0;
    while (gap > tol && n < 1000) { gap *= (1 - k); n++; }
    return n;
  }

  it('audit sweep: tabulka N(5%) a retention(1 den) pro driftK kandidáty', () => {
    const candidates = [0.10, 0.15, 0.20, 0.25, 0.30, 0.40];
    const tol = 0.05;
    const rows = candidates.map((k) => ({
      driftK: k,
      recoveryN: recoveryN(k, tol),
      retention1day: 1 - k,
    }));

    // Audit trail (čitelné v test outputu / CI logu)
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(`  driftK=${r.driftK.toFixed(2)}  N(5%)=${r.recoveryN} dní  retention(1d)=${r.retention1day.toFixed(2)}`);
    }

    // CÍL-3 horní strážce: retention(1 den) ≥ 0.60 → k ≤ 0.40.
    // CÍL-1 dolní strážce (pokud chceme N≤28): k ≥ 0.10.
    const inWindow = rows.filter((r) => r.retention1day >= 0.60 && r.recoveryN <= 28);
    const ks = inWindow.map((r) => r.driftK);
    assert.ok(ks.includes(0.20), `driftK=0.2 musí splňovat obě podmínky okna, in-window: ${ks.join(', ')}`);
    assert.ok(Math.min(...ks) >= 0.10 && Math.max(...ks) <= 0.40, 'okno musí být [0.10, 0.40]');
  });

  it('driftK=0.2 leží v okně [0.10, 0.40] (potvrzeno v balance.js)', () => {
    const k = BALANCE.market.driftK;
    assert.strictEqual(k, 0.2, 'driftK musí být potvrzeno na 0.2 (calibrated, G-MARKET-DRIFT closure)');
    assert.ok(k >= 0.10 && k <= 0.40, `driftK=${k} musí ležet v kalibračním okně [0.10, 0.40]`);
  });

  it('driftK=0.2: retention(1 den)=0.80 ≥ 0.60 (CÍL-3) a N(5%)=14 ≤ 28 (CÍL-1)', () => {
    const k = BALANCE.market.driftK;
    assert.ok(1 - k >= 0.60, `retention(1 den)=${(1 - k).toFixed(2)} musí být ≥0.60 (CÍL-3)`);
    assert.strictEqual(recoveryN(k, 0.05), 14, 'N(5% recovery) pro driftK=0.2 musí být 14 (CÍL-1)');
  });
});

// ---------------------------------------------------------------------------
// Determinismus: seedovaný harness je reprodukovatelný (G1)
// ---------------------------------------------------------------------------
describe('Determinismus: seedovaný drift je reprodukovatelný', () => {
  it('stejný seed → stejné available po 14 dnech driftu', () => {
    function run() {
      const { state, ctx, goods } = makeMarketState(SEED);
      maxSellOff(state);
      driftDays(state, ctx, 14);
      const ms = marketOf(state);
      return goods.map((g) => ms[g.id].available);
    }
    assert.deepStrictEqual(run(), run(), 'stejný seed musí dát stejné available (determinismus)');
  });
});
