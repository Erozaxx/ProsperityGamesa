# DR-019-01 — M8 implementační poznámky (reviewer GO, carry do coder briefů)

- **Datum**: 2026-06-15
- **Stav**: GO (bez podmínek, reviewer T-002); poznámky pro codery (ne architektonická revize)

## Poznámky pro implementaci
- **MAJ-1 (catch-up re-vstup)**: while-smyčka pro re-vstup runCatchupBatch po acku je NOVÝ kód v main.js (~315-345), ne "už hotovo". Dnes se runCatchupBatch volá jednou; autosave/buildOfflineSummary (ř.329/335) běží i při interrupted → po zavedení smyčky je PŘESUNOUT ZA smyčku (jinak autosave/offline summary uprostřed přerušeného catch-upu). Coder T1/event task.
- **MIN-2 (effects stuby)**: effects.js stuby unlockMap/grantResource dnes jen console.log (gate-allow) → přepsat na REÁLNOU mutaci, jinak tichý no-op. Coder achievement/story task.
- **MIN-4 (evalPredicate path-getter)**: žádná runtime větev dle process.env v core (no-build/R-I) → path-getter řešit lintem na neexistující path, ne nedeterministickou větví. Coder achievement task.
- **R-G**: reviewer (T-REV) porovná texty proti originálu (vlastní/parafráze, provenance:'original-paraphrased').

## Reference
- Design: agents/architect/artifacts/final/design_iter-019_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-019_T-002.md
