# Current Task

- **Task ID**: T-001
- **Brief**: BRIEF-008 (brief_project-manager_T-001_iter-003.md)
- **Iteration**: iter-003
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: kompletní end-to-end plán iterací M0–M9 → iter-004…iter-018 zapsán do `artifacts/final/iteration_master_plan_iter-003_T-001.md`.

## Dílčí checklist
- [x] T-001: Vytvořit kompletní end-to-end plán iterací (M0–M9 → iter-004+), s rozpadem na tasky, komplexitou, modely, závislostmi, DoD a test loop + review gate u každé iterace.

## Předpoklady
- Architektura iter-002 (D1–D13, R1–R4, M0–M9) je schválená a neměnná – plán ji jen sekvencuje.
- A1–A4 + Q1–Q3 viz §4–5 master plánu (gap report checkpoint po iter-006, syntetický benchmark náhradou za low-end zařízení, pokračování po MVP bez pauzy).

## Blockery
–

## Validace (provedeno grep nad vlastním výstupem)
- 15 iterací (iter-004…iter-018), každý milník M0–M9 namapován na ≥1 iteraci (M0/M2/M4/M7/M9 split na a/b).
- 15× test loop task T-TEST (tester Sonnet/Haiku) + 15× review gate T-REV (reviewer Opus, právo re-run) = každá iterace má oba gaty.
- MVP hranice (M0–M4 = iter-004…011) a kritická cesta explicitně v §2.1–2.2.
