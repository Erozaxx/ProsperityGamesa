# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-018-003 (human gate M7b design)
- **Iteration**: iter-018
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo — human gate na M7b design (battle automat: live battleCommand + offline auto-resolve G2, invaze + bandité) vydán jménem Toma.

## Dílčí checklist
- [x] Přečíst AGENTS.md + brief
- [x] Přečíst design (rev. T-002a: changelog M-1/M-2/M-3/F-1, §6.1a baseRevival, §7.3 double cd-decrement, §4 crit, §8.1a serializovatelnost) + DR-018-01 + DR-013-00
- [x] Přečíst zadani_projektu.md + done-criteria.md
- [x] Posoudit 4 produktová rozhodnutí jménem Toma
- [x] Vydat verdikt → artifacts/final/gate_iter-018_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M7b, SPLIT=NE, fallback M7b-1/M7b-2 otevřen).
1. Bitvy dokončují M7 (live + offline auto-resolve, invaze + bandité) — OK (účel M7b, Scope IN, jádro věrného rebuildu; kostra hotová z M2a/M7a-2)
2. G2 auto-resolve == live (zdarma, stejný automat, deterministické) — OK (strukturálně zadarmo přes battle.tick every:'step', jedna implementace; věrné + jednoduché)
3. G-MILITARY-STATS approx combat staty + baseRevival 0.25, kalibrace M9 — OK s pozn. (analogické G-LIST*/G-CAPITAL-MISMATCH, fallback vzor DR-017-01 m-4; provenance flag, M9 ladí feel)
4. battle.js 1:1 originál vč. kuriozit (dvojí dekrement cd, pevný crit rng) — OK (přesně "věrný rebuild"; odchylka by rozbila balanc + referenční testy)

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový (reviewer T-002 GO-s-podmínkami, architekt T-002a zapracoval M-1/M-2/M-3/F-1).
- Precedens gatů iter-016 / iter-017 T-003 (oba SCHVÁLENO).

## Blockery
–
