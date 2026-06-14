# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-015-003 (human gate M6 design)
- **Iteration**: iter-015
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo — human gate na M6 design (výzkum & tech strom) vydán jménem Toma.

## Dílčí checklist
- [x] Přečíst AGENTS.md + brief
- [x] Přečíst design (rev. T-002a, §1.3a/§2.6/§2.7, G-LISTTECHS, G-TECH-JOB-EFFECTIVE) + DR-015-01 + DR-013-00
- [x] Přečíst zadani_projektu.md + done-criteria.md
- [x] Posoudit 4 produktová rozhodnutí jménem Toma
- [x] Vydat verdikt → artifacts/final/gate_iter-015_T-003.md

## Verdikt
SCHVÁLENO s výhradou (proceed na implementaci M6).
1. G-LISTTECHS approximovaný tech strom (vzorec 100×1.25^level doložitelný) — OK (precedens G-LISTBUILDINGS; vzorec přímo v zadání Scope IN)
2. G-TECH-JOB-EFFECTIVE (tech→joby no-op, demo přes budovy) — OK s pozn. (plné napojení M9, jinak eskalace)
3. University Math.random vynechán pro determinismus — OK (determinismus/reload je tvrdý požadavek; náhrada M9 volitelně)
4. K13 plně (techy = druhý zdroj modifikátorů přes stejnou vrstvu) — OK (žádaný stav, bez regrese M5-1)

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový (reviewer T-002 GO-s-podmínkami, architekt T-002a M-1/M-2/m-3).

## Blockery
–
