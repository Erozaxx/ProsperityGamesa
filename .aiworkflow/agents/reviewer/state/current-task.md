# Current Task

- **Task ID**: T-007 (FINAL REVIEW GATE M9a + DoD M9a, iter-020, Opus, právo re-run)
- **Brief**: BRIEF-020-007
- **Iteration**: iter-020
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: závěrečný review gate M9a + ověření DoD M9a. Hodnoceno PROTI KÓDU (produkční diff
`merge-base HEAD main..HEAD -- src/ test/`): main.js:64 cap derivace + 256-257 živé použití,
balance.js driftK provenance/capBalanceRealHours/home.js:970 evidence, market.js (jen komentář),
formulas.js marketPrice, catchup.js catchupStepCount + grep verifikace (cap usages, catchupStepCount
callers, consecutiveDiseased/inoculation=0, diseaseRecoveryBase readers=0) + body-level diff market.js=0
+ DR-020-01 podmínky (MINOR-1/2/4 + home.js:970).

## Výsledek
Verdikt: **GO**. Žádný blocker, major ani minor; 2 nity (nezávazné).

- INV-1 kalibrace=data: PASS — formulas/drift/catchup signatury i těla NEMĚNĚNY (body-diff market.js=0).
- INV-2 MINOR-1 cap z BALANCE: PASS — odvozen z BALANCE (main.js:64), ŽIVĚ zapojen do catch-up (main.js:256-257), ne no-op; D10 zachováno.
- INV-3 cíle-proti-referenci (R-C): PASS — harness na core+goods.json, žádná serverová data; N=14 korektní.
- INV-4 determinismus+dekompozice: PASS — kvartální 81 900 kroků it(), save/load bit-identické, golden-hash deterministický/regenerovatelný (ne flaky).
- INV-5 vědomé odchylky: PASS — home.js:970 grep=0 deferred evidence, MINOR-4 název, driftK calibrated — zapsané ne skryté.
- DoD M9a: SPLNĚNO; G-MARKET-DRIFT uzavřen.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NIT: 2 (cap-test importuje CATCHUP_CAP_MS z app/main.js; sweep analytický model paralelně k empirickému — oba nezávazné)

Výstup: agents/reviewer/artifacts/final/review_iter-020_T-007.md

## NEcommitnuto (per brief).
