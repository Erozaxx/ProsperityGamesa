# Current Task

- **Task ID**: T-002 (REVIEW DESIGN M9a kalibrace, iter-020, Opus, architektonický gate před tom-proxy)
- **Brief**: BRIEF-020-002
- **Iteration**: iter-020
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: Review designu M9a balanční kalibrace (DESIGN-020-001, metodika ne kód). Hodnoceno PROTI KÓDU
(market.js marketInit/marketDailyDrift, balance.js driftK:0.2/capTechRealHours:8, formulas.js
marketPrice, catchup.js catchupStepCount, main.js:58+250 cap wiring, createHomeState.js sampler paths,
load.js loadAndReconstruct, rng.js hashState) + originál home.js:970 + architektura §9.1/§9.2a/§9.2b/D10
+ master plán M9. Všechny matematické claimy nezávisle ověřeny (0.8^14<0.05, okno driftK[0.10,0.40],
spread 0.6/1.35).

## Výsledek
Verdikt: **GO-s-podmínkami** (3 podmínky → DR-020-01). Žádný blocker, žádný major.

- Cíle-proti-referenci (R-C): PASS — DoD proti hratelnostním cílům, server-ref zamítnut.
- Determinismus harness + dekompozice L: PASS — seedovaný, kvartální it()+save/load+multi-seed pod limit.
- Kalibrace=data: PASS — formulas/drift/catchup signatury NEMĚNĚNY, grep-gate vynutitelný.
- Cap separace+min kontrakt: PASS-s-podmínkou — separace správná, ale CATCHUP_CAP_MS je hardcoded literál (MINOR-1).
- Vědomé odchylky: PASS — home.js:970 v DR/komentáři; mechanika v core CHYBÍ = deferred.
- Split A/B oba Sonnet: SOUHLAS — disjunktní práce, merge balance.js sekvencovat.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 4 (cap wiring literál main.js:58; sampler paths home.food.store≠foodStore; kvartál cena hypotéza; naming capBalanceRealHours vs §9.2b capRealHours)
- NIT: 3 (pop anti-spike X=50 false-positive; A+B oba editují balance.js; home.js:970 deferred carry)

Výstup: agents/reviewer/artifacts/final/review_design_iter-020_T-002.md

## NEcommitnuto (per brief).
