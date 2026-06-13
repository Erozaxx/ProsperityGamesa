# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-026
- **Iteration**: iter-007
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M2a – catch-up safe invariant, persist round-trip, tx invarianty, edge cases, determinismus, PWA smoke.

## Předpoklady
- Produkční kód implementován coderem T-002a (M2a-1: infrastruktura) a T-002b (M2a-2: živé systémy).
- Scope OUT: žádné změny produkčního kódu.

## Blockery
–

## Checklist (z briefa – iter-007)
- [x] `npm install && npm run ci` zelené (tsc, grep gate, node --test) – 460/460 PASS
- [x] S-05 catch-up-safe invariant: live N kroků == dávka N kroků (identický hash) pro VŠECHNY systémy – 13/13 PASS
- [x] Persist round-trip per doména (population/food/health/crime/housing) – všechny PASS
- [x] Tx invarianty: žádné NaN/záporné, atomicita pay, ne-pod-nulu bez allowDeficit, txEvent konzistence – 10/10 PASS
- [x] Kontraktní testy §8 vč. negativního S-06 – existující, zelené
- [x] Determinismus celé simulace (seed → stejný hash) – PASS
- [x] PWA smoke kumulativní – 4/4 PASS
- [x] Edge testy: hladovění→úmrtí, přeplnění bydlení, disease lifecycle – PASS
- [x] Verdikt zapsán do artifacts/final/testreport_iter-007_T-003.md
