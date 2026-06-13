# Current Task

- **Task ID**: T-001 (iter-011)
- **Brief**: context/inbox/brief_architect_T-001_iter-011.md (BRIEF-040)
- **Iteration**: iter-011 (M4b → MVP: klientský trh, drift, getGoldValue/market.inject, karavany, market UI + crime fix)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – DETAILNÍ implementační spec (pro Sonnet codera) pro iter-011 (M4b/MVP). NE implementace.
Výstup: `artifacts/final/design_iter-011_T-001.md`.

Pokrytí (čerpáno z REÁLNÝCH src/core/* + services/market.js + architektura §9.1/§8.2/§7):
- T1 klientský trh: marketState[goodsId]={available,max,baseline}; marketPrice kubika (formulas, HOTOVÁ);
  buyingPrice/sellingPrice spread 1.35/0.6; clamp available∈[0,max] (N-02); buyGoods/sellGoods
  commandy REGISTROVANÉ v bootstrapEngine; market handler přes resource vrstvu (gold+goods, emitTx).
- T2 denní drift mean-reversion: marketDailyDrift day-tick, available += k×(baseline−available),
  k=0.2/den (balance.market.driftK); registrace v periodics.
- T3 getGoldValue(state,koš) jediné oceňovací API (formulas.goldValue HOTOVÁ, wrapper s priceOf z
  marketState); market.inject(state,goodsId,qty) kontrakt; S-06 NEGATIVNÍ test se OBRACÍ na pozitivní.
- T4 karavany: sendCaravan command + caravanReturns schedule (engine.insert), maxSteps=900×(30−speed).
- T5 market UI: selectMarket, MarketScreen (tab Trh: ceny buy/sell, nákup/prodej, karavany), App.js.
- crime.js fix: pay(state,{gold:loss},'crime:loss',ctx) místo přímé mutace player.gold.

## Klíčové wiring body (poučení M2b/M3/M4a re-run)
buyGoods/sellGoods/sendCaravan REGISTROVANÉ v bootstrapEngine (jinak mrtvé UI – RE-RUN); MarketScreen
napojen v App.js (tab + send); marketDailyDrift v periodics; goods handler 'goods' kind HOTOVÝ z M2a;
arbitrážní sanity (1.35>0.6 → buy→sell ztrátový); migrace v2→v3 (world.marketState+caravan); MVP e2e.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-040
- [x] POVINNÉ vstupy: architecture §9.1/§8.2/§7, doc/original_source_doc.md §4 + services/market.js
- [x] Prozkoumány REÁLNÉ src/core/{balance/formulas,resources,commands,engine/tickOrder,registry,state},
      app/main.js (bootstrapEngine), ui/{App,screens,selectors,render}, save/{persistSchema,migrations},
      systems/{crime,world}, src/data/goods.json (prázdný – gap G-LISTGOODS)
- [x] Spec T1-T5 + crime fix (cesty, signatury, marketState tvar, vzorce s reálnými čísly, jak ověří test)
- [x] Command registrace v bootstrapEngine + UI napojení v App.js (explicitně)
- [x] Arbitrážní sanity (buy→sell ztrátový kvůli spreadu)
- [x] MVP e2e scénář pro T-REV MVP gate
- [x] Persist schéma + migrace v2→v3; catch-up-safe (S-05)
- [x] Min. 1 alternativa s důvody
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- D1-D13 beze změny. goods.json prázdný (gap G-LISTGOODS) → spec definuje seed goods katalog
  (approximated) + market init z něj. gold/goods handlery hotové z M2a. Scope OUT: AI svět/bitvy (M7),
  budovy tradingHouse/bookKeeping haggle modifikátory (M5+).

## Blockery
–
