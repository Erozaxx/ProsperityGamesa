# Current Task

- **Task ID**: T-008
- **Brief**: BRIEF-013-008
- **Iteration**: iter-013
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Dokončeno. Nezávislá QA M5-1 (buildings + builder + companies + modifier vrstva K13).
Verdikt **GO** — všech 9 AC empiricky ověřeno vlastním během.

## Předpoklady
- Produkční kód implementován coderem T-004..T-007 (M5-1 T1–T4).
- Scope OUT: žádná změna produkčního kódu. Jen helper skripty v tmp/ (necommitnuto).

## Blockery
–

## Checklist (z briefu BRIEF-013-008)
- [x] AC1: `npm run ci` zelené — 906/906 pass, 0 fail, 220 suites; smoke OK
- [x] AC2: Modifikátory round-trip = IDENTITA (plný hashState) — 4 scénáře PASS
- [x] AC3: Save = jen modifikátory — payload bez derived/_effCache/_modVersion; fold přepočítá na identické hodnoty
- [x] AC4: Deterministický fold — 2× set různého source nezávislý na insertion order; add→mul→set pořadí
- [x] AC5: Jedna cesta agregátů — lineární růst (well×3=15, NE 45); Σ effective bez ×created
- [x] AC6: Catch-up-safe — 365 herních dní bez crashe; h1=h2 determinismus; save→load→run=direct run
- [x] AC7: Persist round-trip buildings/projectQueue/projectSeq/ownedCompanies/modifiers; rozestavěný projekt pokračuje
- [x] AC8: G1 determinismus nedotčen; grep 0 hits Date.now/Math.random/DOM v core
- [x] AC9: Build flow e2e: pay→queue→builder dokončí→instance+totalMade++→modifier efekt→save round-trip
- [x] QA report: artifacts/final/qa_report_iter-013_T-008.md (verdikt GO)
