# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-021
- **Iteration**: iter-006
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M1 (katalogy & balanc data).

## Předpoklady
- Produkční kód implementován coderem T-002b (M1: src/data/, src/core/catalog/, src/core/balance/, tools/extract/, test/).

## Blockery
–

## Checklist (z briefa – iter-006)
- [x] `npm run ci` zelené (tsc, grep gate, node --test) – 238/238 PASS
- [x] Schema validace VŠECH 16 katalogů v src/data/ projde
- [x] Tabulkové testy vzorců (techCap 0→100/1→125/2→156/4→244/10→931, marketPrice 337.5/100/12.5, workerEfficiency clamp [0.25,2], spoilage trunc, natality 0.04/0.02, archer upkeep 162) – všechny přítomny a zelené
- [x] Fail-fast: uměle rozbitý katalog → validátor hodí čistou výjimku (7 fail-fast testů, vše zelené)
- [x] BUG-001 regrese: cyklus → čistá výjimka, ne RangeError – zelené
- [x] Extrakce reprodukovatelná: 2× běh = identické katalogy – zelené
- [x] PWA smoke (gen-precache kumulativní) – zelené
- [x] Verdikt zapsán do artifacts/final/testreport_iter-006_T-003.md
