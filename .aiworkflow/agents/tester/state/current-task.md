# Current Task

- **Task ID**: T-006
- **Brief**: BRIEF-020-006
- **Iteration**: iter-020
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Dokončeno. Nezávislá QA M9a (kalibrace trhu CÍL-1/2/3 + offline cap MINOR-1 + balanc regression segmenty/golden-hash) + DoD M9a.
Verdikt **GO** — všech 8 AC empiricky ověřeno vlastním během. CI 1550/1550 pass / 0 fail, smoke OK (0 console errors).

## Předpoklady
- T-004 (C-020-A trh) + T-005 (C-020-B cap+regression) implementoval coder (iter-020).
- Scope OUT: žádná trvalá změna produkčního kódu (jediná mutace = dočasný no-op probe v balance.js, bit-identicky revertován; necommituji — orchestrátor).

## Blockery
–

## Checklist (z briefu BRIEF-020-006)
- [x] AC1: `npm run ci` zelené — 1550 pass / 0 fail; typecheck + lint:core OK; smoke OK (0 console errors)
- [x] AC2: Cíle trhu CÍL-1/2/3 deterministické proti definovaným cílům (recovery=14d empiricky, arbitráž neztrátová, impact ≥60%/den); NEodkazují na serverová data; 18/18 pass
- [x] AC3: Cap odvozen z BALANCE (MINOR-1) — mutační test capBalanceRealHours 8→2 ⇒ CATCHUP_CAP_MS 28.8M→7.2M (2h); NENÍ no-op; revertováno; 7/7 pass
- [x] AC4: Regression segmenty bit-identické (continuous==segmented==golden 4005350179); golden-hash REGEN 2× deterministický; žádný it() >limit (max ~1.5s); 17/17 pass
- [x] AC5: Invarianty křivek drží rok+ (pop 0–10000, gold≥0, food≤max přes home.food.store MINOR-2, žádný NaN/kolaps>30d)
- [x] AC6: Determinismus G1 přes save hranici + cap D10 over-cap=576000 kroků zachováno
- [x] AC7: home.js:970 vědomá odchylka; mechanika v core grep=0; jen evidence v balance.js; žádná tichá logická změna; Math.random grep=0
- [x] AC8: M9a nerozbil M8/M7/M5/M6 (639/639 pass vč. TC-01/iter005-edge); marketPrice/marketDailyDrift/catchupStepCount signatury + spread + baselineFraction + driftK hodnota beze změny
- [x] QA report: artifacts/final/qa_report_iter-020_T-006.md (verdikt GO — DoD M9a)
