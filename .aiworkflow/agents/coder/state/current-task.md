# Current Task

- **Task ID**: T-006 (iter-016 M7a-1 — T5 napojení trhu na zóny – marketInject)
- **Brief**: brief_coder_T-006_iter-016.md
- **Iteration**: iter-016
- **Status**: done
- **Done**: 2026-06-14

## Vysledek
- src/core/systems/world.js (processZone): přidán import marketInject + inject logika v policy 0
  - Productive zone (liege==originalLiege): marketInject(state, goodsId, +floor(qty*injectFraction)) pro každý resource key po tribute akumulaci, před gold konverzí
  - Warring zone (liege!=originalLiege): marketInject(state, goodsId, -warConsumption) pro každý resource key
  - Unknown goodsIds (non-market) jsou no-op (marketInject guard v market.js:106)
  - Clamp [0,max] zajišťuje marketInject interně
- src/core/balance/balance.js (BALANCE.world): přidány 2 nové konstanty
  - warConsumption: 5 (qty drained per resource key per war zone tick, approx, G-WORLD-INJECT-QTY)
  - injectFraction: 0.1 (fraction of resource qty injected by productive zone, approx, G-WORLD-INJECT-QTY)
- tickOrder.js: world.tick (order 30) PŘED market.drift (order 35) — bez změny (správně)
- contracts.test.js: S-06 test již flipnut na pozitivní (z předchozí iterace)
- test/m7a-world-t5.test.js (NOVÝ): 16 testů, 7 describe skupin
  - T5-1: S-06 positive — productive zone inject zvýší available (+qty, clamp)
  - T5-2: warring zone drain sníží available (−warConsumption)
  - T5-3: clamp [0,max] — inject nesmí překročit max, drain nesmí jít pod 0
  - T5-4: arbitrage sanity — buy→sell stále ztrátový po inject
  - T5-5: tick order — world.tick order 30 < market.drift order 35 (checked in sorted periodics)
  - T5-6: determinismus — stejný rng seed → stejný marketState
  - T5-7: no-op pro non-market goodsIds (stone/wood/iron safe)
- CI: 1179/1179 pass, 0 fail (+16 nových T5 testů)
- Smoke: SMOKE OK
- G1+M5/M6+M7a+M4b determinismus: nedotčen (všechny testy zeleně)
- Git: NEcommitováno
