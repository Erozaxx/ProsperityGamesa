# Current Task

- **Task ID**: T-003
- **Brief**: re-verify Vlny 1 (iter-022)
- **Iteration**: iter-022
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-07-02
- **Completed**: 2026-07-02

## Co teď dělám
Dokončeno. Re-verify Vlny 1 oprav na HEAD `fde32b3` (obsahuje `0e320e6`):

- **#1 story dialog: RESOLVED** — DOM měření @320/360/390/1280: `position:fixed`, z-index 1000,
  backdrop, dialog+tlačítko ve viewportu, hit-test blokuje pozadí (#1c), ack+resume funguje.
- **#2 render-on-send: RESOLVED** — PAUZA: daně „−" UI 1→0 okamžitě, „Koupit 10" owned 0→10
  okamžitě (krok zamrzlý na 6, žádný resume). Bonus: #7 (rapid tax) už nereprodukovatelný.
- **#10 panely: RESOLVED** — `.offline-summary` i `.catchup-progress` mají kontejner
  (computed-style důkaz v F8).
- **Bez regrese** — plný běh F1–F9: 0 console.error / 0 pageerror / 0 requestfailed /
  0 h-overflow @320/360/390/1280; přetrvávají jen známé Vlna-2 nálezy (#3/#4/#5/#6/#8/#9).
- Harness gap ve F4 (modální overlay vs. tab-klik) potvrzen jako harness limitace, opraven
  v `scratch/e2e-rum.mjs` (`clearOverlays()` v `clickTab()`), NE produktová chyba.

Recommendation: **Go** pro Vlnu 1.

## Výstupy
- Report: `.aiworkflow/agents/tester/artifacts/final/reverify-wave1_iter-022.md`
- Targeted harness: `.aiworkflow/agents/tester/scratch/reverify-wave1.mjs` (failures=0)
- Upravený hlavní harness: `.aiworkflow/agents/tester/scratch/e2e-rum.mjs`
  (clearOverlays v clickTab, styled-check pro .catchup-progress)

## Checklist (z briefu T-003)
- [x] Přečíst AGENTS.md, coder záznam wave1_iter-022.md, původní report #1/#2/#10
- [x] #1: ověřit DOM měřením (position/top/inViewport, backdrop, z-index, tlačítko) na 320/360/390/desktop
- [x] #2: reprodukovat původní scénář (pauza → daně ±, koupit 10) → okamžitá změna v UI
- [x] #10: `.offline-summary` a `.catchup-progress` mají kontejner
- [x] #1c: modalita (hit-test), F4 timeout vyřešen jako harness gap (clearOverlays)
- [x] Regrese/RUM: 0 CE / 0 PE / 0 RF / 0 overflow napříč flow
- [x] Report do artifacts/final/ + current-task.md + handoff-out.sh

## Blockery
–
