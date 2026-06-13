# Current Task

- **Task ID**: T-002 (iter-011 M4b market/caravans MVP)
- **Brief**: brief_coder_T-002_iter-011.md
- **Iteration**: iter-011
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-011 T-002 M4b)
- [x] T1: marketState{available,max,baseline}, buyGoods, sellGoods (clamp, spread 1.35/0.6, pay/grant via goods handler)
- [x] T2: marketDailyDrift (day, order 35, available+=0.2×(baseline−available))
- [x] T3: getGoldValue wrapper + marketInject contract; S-06 negative test → positive (8 assertions)
- [x] T4: sendCaravan + caravanReturns schedule (maxSteps=900×(30−speed))
- [x] T5: selectMarket + MarketScreen + tab Trh in App.js
- [x] Crime fix: pay(state,{gold},'crime:loss',ctx,step) instead of direct mutation (DA5 grep-gate)
- [x] Persist v2→v3 migration, SAVE_VERSION=3
- [x] goods.json: 5 seed commodities (tools/cloth/gems/spice/silk), K10-safe IDs
- [x] iter006-catalog-schema.test.js: SEEDED_CATALOG_CONTENT constant to survive extract.mjs runs
- [x] tsc: 0 errors
- [x] lint:core: OK
- [x] node --test: 700 pass, 0 fail
