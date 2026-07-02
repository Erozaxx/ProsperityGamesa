# Impl Summary — T-004 (iter-020 M9a) — C-020-A Trh

- **Task**: C-020-A — Trh: hratelnostní cíle trhu jako měřitelné testy (T1) + potvrzení kalibrace driftK=0.2 (T2) + simulační harness helper.
- **Coder**: Sonnet
- **Datum**: 2026-06-15
- **Status**: done

## Co bylo implementováno (soubor : funkce / obsah)

### 1. Harness helper — `test/helpers/marketHarness.mjs` (test-only, mimo src/core)
Deterministický headless běh trhu, staví výhradně na existujícím engine (NE druhá implementace).
Žádný Date.now / Math.random / DOM.
- `loadGoods()` — načte `goods` katalog z disku (pro `byId` v `priceOf`).
- `makeMarketState(seed=0xCA11B)` → `{ state, ctx, goods }` — `createInitialState({seed})` + `initRng` + `marketInit`.
- `marketOf(state)` — typovaný přístup k `state.world.marketState`.
- `driftDays(state, ctx, n)` — n× `marketDailyDrift`, vrací snapshoty `{available,baseline,max,dev}`/den.
- `recoveryDays(state, ctx, id, tol, maxDays)` — empiricky (NE vzorcem) počet dní než `dev ≤ tol`.
- `maxSellOff(state)` — nastaví `available = max` pro všechna goods (maximální výprodej, Δ₀=0.5·max).

> Pozn.: helper již existoval z přípravy; ověřeno, že odpovídá designu §4 (DR-020-01 §2.1) — beze změny použit.

### 2. T1 cíle jako testy — `test/m9a-market.test.js` (NOVÝ, 11 testů, vše zelené)
- **CÍL-1 recovery** (3 testy): po `maxSellOff` je odchylka `≤5%` baseline za **N=14 dní** (všechna goods);
  po **3 dnech** obnoveno **≥48%** počáteční mezery (a `<100%` → drift viditelný, ne skokem);
  empiricky `recoveryDays(tools, 5%) = 14`.
- **CÍL-2 arbitráž neztrátová** (3 testy): `sellingPrice < buyingPrice` napříč `available ∈ {0,.25,.5,.75,1}·max`
  × 5 goods; round-trip `buy K → sell K` ztrátový napříč goods; velký round-trip s cenovým dopadem zůstává
  výrazně ztrátový (návratnost `<0.55`).
- **CÍL-3 impact persistence** (1 test): po max výprodeji zůstane `≥60%` dopadu po 1 dni driftu (1−k=0.80).
- **T2 driftK kalibrace** (3 testy): sweep audit `driftK ∈ {0.10..0.40}` (tabulka N(5%) + retention(1d) do CI logu);
  `driftK=0.2` leží v okně `[0.10,0.40]`; retention(1 den)=0.80≥0.60 (CÍL-3) a N(5%)=14≤28 (CÍL-1).
- **Determinismus** (1 test): stejný seed → stejné `available` po 14 dnech.

### 3. T2 driftK potvrzení (G-MARKET-DRIFT closure) — pouze data/komentář, vzorec BEZE ZMĚNY
- `src/core/balance/balance.js` — `market.driftK: 0.2` (hodnota beze změny), provenance komentář
  `approximated → calibrated` + odůvodnění proti CÍL-1/CÍL-3 (okno [0.10,0.40], bezpečný střed).
- `src/core/systems/market.js` — komentář v `marketDailyDrift`: G-MARKET-DRIFT closed (calibrated, ref na test).
  (Pozn.: token "window" nahrazen "admissible range" kvůli lint:core grep-gate na `\bwindow\b`.)

## Invarianty (ověřeno)
- Cenový vzorec `marketPrice(basePrice, available, max)` — signatura i tělo beze změny.
- Drift vzorec `marketDailyDrift(state, _params, _ctx)` — signatura i tělo beze změny (jen komentář).
- Spread `haggleBuy 1.35 / haggleSell 0.6` — beze změny (chrání CÍL-2).
- Determinismus: seedy, žádný Date.now/Math.random/DOM v core ani v harness.

## Gate (DoD) — výsledek
- `npm run ci` → **ZELENÉ: tests 1526 / pass 1526 / fail 0** (typecheck OK, lint:core OK).
- `npm run smoke` → **SMOKE OK** (app rendered, 0 console errors).
- Cíle **CÍL-1 / CÍL-2 / CÍL-3 zelené**; **driftK=0.2 potvrzeno** (calibrated).
- M8/M7/M5/M6 + existující market testy (TC-01 arbitráž, TC-05 drift 20%/den) **nedotčené** — součást 1526 pass.
- `src/precache.js` PRECACHE_VERSION přegenerován (balance.js/market.js jsou manifest-soubory → očekávané; jen komentářové změny obsahu).

## Scope OUT (nedotčeno)
- Offline cap / capBalanceRealHours / catchup / main.js / home.js:970 = C-020-B (T-005).
- Žádná změna market logiky.

## Soubory změněné / přidané
- A `test/m9a-market.test.js`
- A `test/helpers/marketHarness.mjs` (ověřen/použit)
- M `src/core/balance/balance.js` (komentář provenance + odůvodnění driftK)
- M `src/core/systems/market.js` (komentář G-MARKET-DRIFT closure)
- M `src/precache.js` (auto-regen)
