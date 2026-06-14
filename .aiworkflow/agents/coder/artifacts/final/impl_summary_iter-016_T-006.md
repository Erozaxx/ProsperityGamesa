# Implementation Summary — iter-016 T-006 (T5: marketInject wiring)

- **Task**: T-006 = T5 (napojení trhu na zóny – marketInject)
- **Milník**: M7a-1 (dokončen touto implementací)
- **Datum**: 2026-06-14
- **Agent**: coder (Sonnet)

## Soubory a funkce

### Změněné soubory

| Soubor | Funkce/Sekce | Změna |
|---|---|---|
| `src/core/systems/world.js` | import, `processZone` policy 0 | +import `marketInject`; +inject logika (produkční+, válčící−) |
| `src/core/balance/balance.js` | `BALANCE.world` | +`warConsumption: 5`, +`injectFraction: 0.1` |

### Nové soubory

| Soubor | Obsah |
|---|---|
| `test/m7a-world-t5.test.js` | 16 testů, 7 describe skupin (T5-1..T5-7) |

## Jak zóny injectují/odčerpávají

### Produkční zóny (policy 0, liege==originalLiege)
- V `processZone`, po akumulaci tributu (před gold konverzí):
- Pro každý `goodsId` v `zone.resources`:
  - `injectQty = floor(qty * BALANCE.world.injectFraction)` (= 0.1)
  - Pokud `injectQty > 0`: `marketInject(state, goodsId, +injectQty)`
- Zvyšuje `available` → tlačí cenu dolů (více nabídky)
- Clamp na `max` zajišťuje `marketInject` interně
- Poté běží gold konverze: `getGoldValue(state, zone.resources)` → `{gold: val}`

### Válčící zóny (policy 0, liege!=originalLiege)
- Pro každý `goodsId` v `zone.resources`:
  - `marketInject(state, goodsId, -BALANCE.world.warConsumption)` (= −5)
- Snižuje `available` → tlačí cenu nahoru (méně nabídky)
- Clamp na `0` zajišťuje `marketInject` interně (nesmí být záporné)

### Bezpečnost
- `marketInject` je no-op pro neznámé goodsIds (guard v `market.js:106`)
- Zónové resources obsahují `stone`, `wood`, `iron` etc. — tyto NEJSOU v market katalogu → no-op, trh neovlivněn
- Market goods (`tools`, `cloth`, `gems`, `spice`, `silk`) by měly být v zone resources pro reálný efekt (approx, G-WORLD-INJECT-QTY, kalibrace M9)

## S-06 obrácení

Negativní test S-06 (`world NEvolá market.inject před M4`) byl flipnut na pozitivní (`world NYNÍ volá marketInject`) v předchozí iteraci (T1/contracts.test.js).

`test/contracts.test.js` (sekce 4) nyní ověřuje:
- `getGoldValue` + `marketInject` jsou exportované z `market.js`
- `marketInject` mění `available` (clamp, no-op pro unknown)
- `worldTick` necrashuje (behavioral spy)

`test/m7a-world-t5.test.js` (T5-1) přidává přímý pozitivní test:
- `processZone` s produkční zónou a `tools` resource → `available` se zvýší (+inject)

## Pořadí ticků

`tickOrder.js`: `world.tick` (day order **30**) PŘED `market.drift` (day order **35**) — beze změny (správně).
Injekce ze zón se aplikuje, pak drift mean-reversion → konzistentní s architekturou (§6.3).

## Gate výsledek

| Gate | Výsledek |
|---|---|
| `npm run ci` | **1179/1179 PASS, 0 fail** (+16 nových T5 testů) |
| `npm run smoke` | **SMOKE OK** |
| Determinismus G1 | PASS (hashState round-trip, T1-3, T5-6) |
| M5/M6 round-trip | PASS (nezměněno) |
| M7a fresh-vs-load (m7a-world-t1) | PASS (34/34) |
| M4b market (m4b-market-caravan) | PASS (62/62) |
| S-06 kontrakt | PASS (pozitivní, contracts.test.js 19/19) |
| Arbitráž sanity | PASS (T5-4, buy→sell stále ztrátové) |
| Clamp [0,max] | PASS (T5-3) |
| Pořadí world.tick před market.drift | PASS (T5-5) |

## Poznámky

- **G-WORLD-INJECT-QTY**: konkrétní inject množství (`injectFraction=0.1`, `warConsumption=5`) jsou aproximována (server-side data nedostupná). Kalibrace M9.
- **Kontrakt §8.2 BEZE ZMĚNY**: signatury `marketInject(state, goodsId, qty)` a `getGoldValue(state, basket)` nedotčeny — jen volány z `world.js`.
- **battle.js NEDOTČEN** (scope out).
- **Git**: NEcommitováno.
