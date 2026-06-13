# Brief
- **Brief ID**: BRIEF-026
- **Iteration**: iter-007 (M2a)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop celého M2a dle §1.3/iter-007: POPRVÉ catch-up-safe invariant všech nových systémů, persist round-trip per doména, tx invarianty, kontraktní testy §8, PWA smoke.
## Scope IN
- `npm run ci` zelené (tsc, grep gate, node --test).
- **catch-up-safe invariant** (S-05) pro VŠECHNY nové systémy (population/housing/health/food/jobs/crime): live běh N kroků == dávkový (catch-up) běh N kroků → identický stav (hash). Žádný DOM/Date.now/Math.random; levné v dávce.
- Persist round-trip per doména (population/food/health/crime/housing): save → load → identický stav; migrace v1.
- Tx invarianty: žádné NaN/záporné zásoby; atomicita pay; ne-pod-nulu bez allowDeficit; txEvent suma konzistentní.
- Kontraktní testy §8: determinismus prázdné bitvy, round-trip state.battle/zones, schedule s AI eventy přežívá save/load, NEGATIVNÍ S-06 (world nevolá getGoldValue/market.inject).
- Determinismus celé simulace (seed → stejný hash); PWA smoke kumulativní.
- Doplň chybějící edge testy; negativně ověř (např. hladovění → úmrtí; přeplnění bydlení).
## Inputs
- src/core/systems/, src/core/resources/, src/save/, test/; návrh design_iter-007_T-001.md; impl notes T-002a/b; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky (počty testů, hash, catch-up shoda). Při FAIL přesně co.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-007_T-003.md + případné nové testy
