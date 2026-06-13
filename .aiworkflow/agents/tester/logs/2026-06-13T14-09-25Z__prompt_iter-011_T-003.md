# Brief
- **Brief ID**: BRIEF-042
- **Iteration**: iter-011 (M4b → MVP)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop M4b dle §1.3 + PLNÝ MVP e2e scénář. Doveď CI do zelené.
## Scope IN
- `npm run ci` zelené.
- Formulas ceny: marketPrice kubika vč. clampu available∈[0,max] a mezí; spread haggleBuy 1.35/sell 0.6.
- ARBITRÁŽNÍ SANITY (klíč): okamžitý nákup→prodej NENÍ ziskový (0.6/1.35≈44%) — ani s cenovým dopadem.
- marketDailyDrift (mean-reversion k=0.2/den) chování; catch-up-safe všech tržních systémů.
- getGoldValue konzistence; marketInject kontrakt (pozitivní S-06).
- Karavany: sendCaravan→schedule→caravanReturns grant; round-trip přes save/load uprostřed cesty.
- WIRING: buyGoods/sellGoods/sendCaravan dosažitelné přes send() po bootu; MarketScreen.
- **PLNÝ MVP e2e**: bootSequence → simulace (populace jí, produkce, ekonomika, obchod) → save → offline (lastSimTimestamp posun) → bootSequence znovu → catch-up dopočítá progres → stav konzistentní. Idle smyčka výdělek→nákup→pasivní příjem→offline progres funguje.
- Doplň chybějící edge testy.
## Inputs
- src/core/systems/market*.js, src/core/commands/{buyGoods,sellGoods,sendCaravan}.js, src/app/main.js, src/ui/screens.js, test/; návrh design_iter-011_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky vč. MVP e2e průchodu a arbitrážní sanity. Při FAIL přesně co.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-011_T-003.md + případné nové testy
