# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-016-003 (human gate M7a-1 design)
- **Iteration**: iter-016
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo — human gate na M7a-1 design (zóny + jednotky + napojení trhu) vydán jménem Toma.

## Dílčí checklist
- [x] Přečíst AGENTS.md + brief
- [x] Přečíst design (rev. T-002a, §2.1 round-robin/M-1, §8.1 re-hydratace/M-2, §16 odloženo, G-LISTZONE §9, G-WORLD-DAYEDGE) + DR-016-01 + DR-013-00
- [x] Přečíst zadani_projektu.md + done-criteria.md
- [x] Posoudit 4 produktová rozhodnutí jménem Toma
- [x] Vydat verdikt → artifacts/final/gate_iter-016_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M7a-1).
1. Split M7a-1 / M7a-2 (frakční AI do iter-017) — OK (precedent M5-split DR-013-01; M7a-1 samostatně hratelné, jednosměrná závislost, vratné)
2. G-LISTZONE approximovaný obsah zón (vzorce/AISTATES/capitals doložitelné, ~13 zón approximováno) — OK (precedent G-LISTTECHS/G-LISTBUILDINGS; provenance + kalibrace M9)
3. G-WORLD-DAYEDGE vědomá odchylka per-step→day-edge round-robin — OK (catch-up je tvrdý požadavek; ekvivalentní chování, jen hrubší granularita; M-1 navíc opravil correctness vadu)
4. AI-AI bitvy RNG vzorcem, plný battle automat = M7b/iter-018 — OK (1:1 originál, levné/deterministické pro catch-up; battle.js nedotčen)

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový (reviewer T-002 GO-s-podmínkami, architekt T-002a zapracoval M-1/M-2).

## Blockery
–
