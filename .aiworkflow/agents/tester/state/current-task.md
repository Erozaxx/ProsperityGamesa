# Current Task

- **Task ID**: T-010
- **Brief**: BRIEF-012-010
- **Iteration**: iter-012
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislá QA celé implementace iter-012 (playability A1–A5 + reload-determinismus fix).
Verdikt **GO** — všech 6 AC empiricky ověřeno vlastním během.

## Předpoklady
- Produkční kód implementován coderem (A1 T-005..A5 T-009, determinismus fix T-014/T-016).
- Scope OUT: žádná změna produkčního kódu. Jen tester helper skripty (necommitnuto).

## Blockery
–

## Checklist (z briefu BRIEF-012-010)
- [x] AC1: `npm run ci` zelené — 778/778 pass, 0 fail, 193 suites
- [x] AC2: `npm run smoke` OK — exit 0, seeded pop=50, 0 console errors
- [x] AC3: dlouhý seedovaný sim ≥2 roky (655200 kroků/728 dní) bez crashe; cap drží (maxPop≤10000, stress maxPop=9995/overshoot=0); finalPop=36>0
- [x] AC4: accounting invariant Σ gold-tx == Δ player.gold (81000 kroků, diff=0, maxStepDiscrepancy=0)
- [x] AC5: G1 determinismus na PLNÉM hashState — 10 save-pointů (vč. krok 0/1/2) bit-shoda A==C
- [x] AC6: save v3 — applyPersist payload bez workforce.total (jen assigned), saveVersion=3
- [x] QA report: artifacts/final/qa_report_iter-012_T-010.md (verdikt GO)
