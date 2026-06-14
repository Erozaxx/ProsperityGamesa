# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-017-003 (human gate M7a-2 design)
- **Iteration**: iter-017
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo — human gate na M7a-2 design (frakční AI automat + revolty/questy/tribute + AI-AI bitvy + UI) vydán jménem Toma.

## Dílčí checklist
- [x] Přečíst AGENTS.md + brief
- [x] Přečíst design (rev. T-002a: changelog M-1/M-2/m-4, §3.1 favour migrace, §2.4 armFactionAI, §5.1 quest gating) + DR-017-01 + DR-016-01 + DR-013-00
- [x] Přečíst zadani_projektu.md + done-criteria.md
- [x] Posoudit 4 produktová rozhodnutí jménem Toma
- [x] Vydat verdikt → artifacts/final/gate_iter-017_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M7a-2).
1. Svět plně ožívá (processAI 1:1 originál, revolty/questy/tribute, AI-AI bitvy) — OK (účel M7a, Scope IN, jádro věrného rebuildu; kostra hotová v M7a-1)
2. favour migrace number→objekt {factionId:number} (G-FAVOUR-SHAPE) — OK (oprava na originálovou věrnost; bezztrátová deterministická migrace number→{}, revolt nebyl aktivní; povinný migrační test)
3. AI-AI bitvy RNG vzorcem, plný battle automat = M7b/iter-018 — OK (1:1 originál, levné/deterministické pro catch-up; battle.js nedotčen; konzistentní s gate iter-016)
4. Approximace (G-CAPITAL-MISMATCH katalog; quest gating přes existující pole) — OK s pozn. (věrnost mechanik zachována, deterministické náhrady odstraňují tichý no-op; kalibrace gapů M9)

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový (reviewer T-002 GO-s-podmínkami, architekt T-002a zapracoval M-1/M-2/m-4).
- Precedens gate iter-016 T-003 (SCHVÁLENO).

## Blockery
–
