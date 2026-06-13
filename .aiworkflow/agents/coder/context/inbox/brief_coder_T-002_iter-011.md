# Brief
- **Brief ID**: BRIEF-041
- **Iteration**: iter-011 (M4b → MVP)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-011 (M4b) PŘESNĚ dle návrhu → uzavři idle smyčku = MVP. SKUTEČNĚ vytvářej soubory, průběžně `npm run ci`, nekonči bez zelené CI + impl note + handoff.
## KRITICKÉ (jinak RE-RUN)
- buyGoods/sellGoods/sendCaravan commandy REGISTRUJ v bootstrapEngine (+ test creg.handlers.has).
- MarketScreen napoj v App.js (tab Trh); market.drift + caravanReturns v registry; marketInit v bootSequence.
- goods.json je PRÁZDNÝ → vytvoř seed katalog (5 komodit, kind:"goods", approximated+gap) + registruj v loaderu.
## Scope IN (dle design_iter-011_T-001.md)
- T1 klientský trh: marketState[id]={available,max,baseline} v state.world; buyGoods/sellGoods (clamp available∈[0,max], spread haggleBuy 1.35/sell 0.6, pay/grant přes goods handler).
- T2 marketDailyDrift (day order 35): available += 0.2×(baseline−available); catch-up-safe.
- T3 getGoldValue(koš) wrapper nad formulas.goldValue + marketInject kontrakt; OBRAŤ negativní S-06 test na POZITIVNÍ.
- T4 karavany: sendCaravan command + caravanReturns schedule handler (maxSteps=900×(30−speed)), grant recGoods s ctx při návratu.
- T5 UI: selectMarket + MarketScreen + tab Trh v App.js.
- crime fix: pay(state,{gold},'crime:loss',ctx,step) místo přímé mutace (DA5 grep-gate čistý).
- Persist v2→v3 migrace (marketState+caravan), SAVE_VERSION=3.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-011_T-001.md
- src/core/balance/formulas.js (marketPrice/goldValue), src/core/resources/ (goods handler), src/app/main.js, src/ui/screens.js, src/data/goods.json; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. arbitrážní sanity + clamp + drift + karavany + obrácený S-06).
- Commandy dosažitelné v runtime; MarketScreen napojený; core bez DOM; catch-up-safe.
## Outputs
- Kód; impl note agents/coder/artifacts/final/impl_iter-011_T-002.md; handoff-out.sh T-002
