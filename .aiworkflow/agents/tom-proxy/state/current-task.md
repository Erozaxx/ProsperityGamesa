# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-020-003 (human gate M9a — balanční kalibrace)
- **Iteration**: iter-020
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo — human gate M9a (balanční kalibrace) vydán jménem Toma. SCHVÁLENO, offline cap = varianta A (8 h).

## Dílčí checklist
- [x] Přečíst brief BRIEF-020-003 (source of truth)
- [x] Přečíst design_iter-020_T-001 (T1 cíle trhu, T2 driftK, T3 offline cap, T4 regression) + DR-020-01
- [x] Přečíst zadani_projektu.md (idle/offline) + done-criteria.md
- [x] Posoudit produktová rozhodnutí (cap R2b, cíle trhu S-03, vědomé odchylky)
- [x] Explicitní volba cap A/B/C + zdůvodnění
- [x] Vydat verdikt → artifacts/final/gate_iter-020_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M9a). Klasifikace: rozhodnuto v mandátu, bez eskalace.
1. **Offline cap (R2b/D10) → VARIANTA A = 8 h** (`capBalanceRealHours=8`). Max idle-friendly, = dnešní efektivní cap (nulová operační změna), reverzibilní config, doporučeno architektem+orchestrátorem. B=2h validní alternativa; C=0.5h zamítnuto (měnilo by feel → vyžadovalo by eskalaci).
2. **Cíle trhu (S-03)** OK jako definice vyladěného trhu (CÍL-1/2/3, driftK=0.2 střed okna [0.10,0.40], kalibrace=jen DATA).
3. **Vědomé odchylky** OK: home.js:970 zamýšlená varianta (`original-intended`, deferred — mechanika v core neexistuje); `capBalanceRealHours` název (záměrná separace tech/balance).

## Předpoklady
- Mandát default = rozhodni a pokračuj; eskaluj jen nevratné/scope/mimo-mandát/právní. A i B v mandátu, jen C by eskalovalo.
- Reviewer T-002 GO-s-podmínkami (0 blocker/0 major); tech podmínky DR-020-01 carry do coder briefů.
- Cap reverzibilní → revidovatelný po playtestu M9b. Finální R-G licence = samostatný gate M9b/iter-021, nepredjímáno.
- Precedens gatů iter-013..019 T-003 (všechny SCHVÁLENO).

## Blockery
–
