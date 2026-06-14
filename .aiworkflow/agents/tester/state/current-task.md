# Current Task

- **Task ID**: T-007
- **Brief**: BRIEF-016-007
- **Iteration**: iter-016
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Dokončeno. Nezávislá QA M7a-1 (zóny + jednotky + napojení trhu).
Verdikt **GO** — všech 9 AC empiricky ověřeno vlastním během.

## Předpoklady
- T4-T7 implementoval coder (iter-015).
- Scope OUT: žádná změna produkčního kódu.

## Blockery
–

## Checklist (z briefu BRIEF-015-008)
- [x] AC1: `npm run ci` zelené — 1097/1097 pass, 0 fail; smoke OK (tab "Veda" renderuje)
- [x] AC2: buyTech lifecycle — prereqs+canAfford+pay+odemčení; tech efekt v home.derived; nelze bez techPt/prereqs/2×
- [x] AC3: Tech modifikátory round-trip identita (plný hashState) — bit-identický; payload bez derivovaných
- [x] AC4: K13 plně — budovy+techy STEJNÁ modifier vrstva; jedna rebuild cesta; kombinace budova+tech fold add→mul→set
- [x] AC5: Research/techPt deterministický; catch-up-safe; ≥1 rok sim (365 dní); techCap tabulkově
- [x] AC6: M6 nerozbil M5 — m5-buildings-t4 44/44; m5-contracts 51/51; G1 iter005-edge 16/16
- [x] AC7: Persist round-trip M6 domén (unlockedTechs, research.sectors) + M5; staré savy undefined-guard
- [x] AC8: Determinismus — žádný Math.random/Date.now/DOM v core; fresh-vs-load identita
- [x] AC9: UI — TechScreen renderuje; buyTech tlačítko odemyká; žádná logika v UI
- [x] QA report: artifacts/final/qa_report_iter-015_T-008.md (verdikt GO)
