# Brief
- **Brief ID**: BRIEF-040
- **Iteration**: iter-011 (M4b → MVP)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní spec (pro Sonnet) pro iter-011 (M4b): klientský trh, drift, getGoldValue/market.inject kontrakt, karavany, market UI. Tím se uzavře idle smyčka = MVP.
## DŮLEŽITÉ (poučení M2b/M3)
Návrh MUSÍ explicitně pokrýt: buyGoods/sellGoods/sendCaravan commandy REGISTROVANÉ v bootstrapEngine, market UI napojené v App.js. Plus crime.js fix (carry-over M4a): odečet goldu přes pay(...,'crime:loss',ctx), ne přímá mutace.
## Scope IN (navrhni všechny)
- T1 klientský trh (D9, §9.1): marketState[goodsId] = {available, max}, cenová kubika 1:1 (marketPrice z M1 formulas: basePrice×(1.5−min(avail,max)/max)³), spread haggle buy 1.35 / sell 0.6, clamp available∈[0,max] (N-02), buyGoods/sellGoods commands (registrované).
- T2 denní mean-reversion drift (k v balance, default 0.2/den) na denním ticku (marketDailyDrift).
- T3 getGoldValue(koš) jako JEDINÉ oceňovací API + market.inject(goodsId, qty) kontrakt (od teď smí být volán; NEGATIVNÍ test S-06 z M2a se OBRACÍ na pozitivní kontrakt). Napoj systémy, které oceňují (mineralMuseum apod.) na getGoldValue.
- T4 karavany: sendCaravan command, cesty/návraty přes schedule (engine.insert), zboží/ceny vůči marketState.
- T5 UI: market screen (ceny, nákup/prodej, haggle) + karavany napojené v App.js.
- crime.js fix: pay přes resource vrstvu + emitTx (DA5 grep-gate čistý).
## Inputs (POVINNÉ)
- Architektura §9.1 (R1 klientský trh, D9), §8.2 (getGoldValue/market.inject kontrakt), §7; doc/original_source_doc.md + modules (Market service, karavany, haggle čísla)
- M4a kód: src/core/systems/, src/core/resources/, src/core/balance/formulas.js (marketPrice), src/app/main.js, src/ui/; review_iter-007 (S-06 negativní test k obrácení); agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá T1–T5 + crime fix: cesty, signatury, marketState tvar, cenové vzorce s reálnými čísly, getGoldValue/market.inject API, karavany schedule, command registrace, UI napojení.
- Arbitrážní sanity: okamžitý nákup→prodej NENÍ ziskový (spread). MVP e2e scénář popsán.
## Expected Outputs
- agents/architect/artifacts/final/design_iter-011_T-001.md
## Constraints
- Core bez DOM; trh KLIENTSKÝ deterministický (žádný server); catch-up-safe; balanc s odkazem/approximated+gap.
