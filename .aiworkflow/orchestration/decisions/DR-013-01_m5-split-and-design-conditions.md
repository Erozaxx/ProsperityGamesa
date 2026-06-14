# DR-013-01 — M5 split (M5-1/M5-2) + designové podmínky před implementací

- **Datum**: 2026-06-14
- **Stav**: Rozhodnuto (orchestrátor + reviewer GO-s-podmínkami; tom-proxy gate T-003)

## Rozhodnutí
1. **Split M5 potvrzen** (architekt T-001 + reviewer T-002): **iter-013 = M5-1 (T1–T4)**, **iter-014 = M5-2 (T5–T6: kontrakty + build UI)**. M5-1 je samostatně hratelné přes commandy/testy (build screen legitimně až M5-2). DoD M5 se vyhodnotí po M5-2. Downstream milníky se posouvají +1 (M6=iter-015, M7a=iter-016, M7b=iter-017, M8=iter-018, M9a=iter-019, M9b=iter-020) — orientačně, finalizuje se při každém init.

2. **Designové podmínky (GO-s-podmínkami, zapracovat PŘED kódem):**
   - **M-2**: zavést sdílený `rebuildBuildingDerived(state)` volaný z load (Step 5) I z complete/destroy — žádná load-only větev foldu/agregátů/`created` re-derivace (jinak drift, viz DR-012-02 třída bugu).
   - **M-1**: doplnit pravidlo mapování `building.effects → modifier` (mul/set, mapové attr, per-instance vs per-typ, generování modifier.id/source) + sjednotit JEDNU cestu agregátů (eliminovat dvojí započtení modifikátory vs. created×effective).
   - **M-3**: fold "set" deterministicky řazený podle source.
   - **M-4**: build command bez ctx → pay bez emitTx = vědomý gap **G-BUILD-TXAUDIT** (audit dořeší M5-2/M9), akceptováno.

## Reference
- Design: agents/architect/artifacts/final/design_iter-013_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-013_T-002.md
