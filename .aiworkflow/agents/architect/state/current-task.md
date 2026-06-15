# Current Task

- **Task ID**: T-001 (iter-020) — DESIGN M9a (balanční kalibrace: trh proti hratelnostním cílům S-03, kalibrace driftK/baseline, offline cap hodnota R2b, balanc regression)
- **Brief**: context/inbox/brief_architect_T-001_iter-020.md (BRIEF-020-001)
- **Předchozí**: iter-019 T-001 (M8) — done
- **Iteration**: iter-020 (M9a — Balanční kalibrace; uzavírá R1/S-03, R2b, G-MARKET-DRIFT)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Checklist (z briefu)
- [x] T1 hratelnostní cíle trhu (S-03, §9.1) jako MĚŘITELNÉ testy: CÍL-1 recovery N=14 dní, CÍL-2 arbitráž neztrátová (spread invariant), CÍL-3 impact persistence ≥60 %/den
- [x] T2 kalibrace trhu: driftK potvrzen 0.2 (okno [0.10,0.40]), baseline 0.5 ponechán, harness helper, sweep metodika; DATA ne logika
- [x] T3 offline cap: nová `capBalanceRealHours` (separace od tech 8h), doporučení var A=8, alt B=2/C=0.5 → tom-proxy
- [x] T4 balanc regression: invarianty pop/gold/food + golden-hash checkpointy; POVINNÁ dekompozice (kvartální segmenty S1–S4); home.js:970 odchylka posouzena
- [x] Vědomé odchylky zapsané; split coder tasků (C-020-A trh / C-020-B cap+regression); DR-020-01 impl poznámky

## Výstup
**`artifacts/final/design_iter-020_T-001.md`** — T1 cíle, T2 metodika+harness, T3 cap+alternativy, T4 regression+dekompozice, DR-020-01.

## Klíčová rozhodnutí
- **DoD proti EXPLICITNÍM cílům, NE serverové referenci** (R-C / §9.1 — server data neexistují).
- **driftK = 0.2 potvrzeno** proti CÍL-1 (recovery ≤5 % za 14 dní) + CÍL-3 (≥80 % impact/den); přípustné okno [0.10, 0.40]. G-MARKET-DRIFT closure (provenance approximated→calibrated). Cenový/drift vzorec BEZE ZMĚNY.
- **Arbitráž (CÍL-2) = invariant, ne laditelný cíl**: `sell<buy` drží, dokud 0.6<1.35; regresní pojistka.
- **Offline cap**: doporučena nová `offline.capBalanceRealHours=8` (var A, max idle-friendly), engine `min(tech,balance)`. Alt B=2 / C=0.5 → rozhoduje tom-proxy (reverzibilní config). capTechRealHours=8 se nemění.
- **home.js:970**: zvolena ZAMÝŠLENÁ varianta `0.02+(inoc?0.01:0)` (ne JS precedence-bug, který dělá inoculation bezcenným). Pokud mechanika v core chybí → evidence pro budoucnost.
- **T4 dekompozice**: kvartální segmenty (91 dní = 81 900 kroků) přes save/load checkpointy, denní sampling, multi-seed split smoke(Haiku)/full(Sonnet) — žádný test nepřekročí limit.
- **Split**: C-020-A (trh, M) ∥ C-020-B (cap+regression, M) — nezávislé, paralelizovatelné, žádný L po dekompozici.
