# Current Task

- **Task ID**: T-004
- **Brief**: context/inbox/brief_architect_T-004_iter-001.md (BRIEF-004)
- **Iteration**: iter-001
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-12
- **Completed**: 2026-06-12

## Co teď dělám
Hotovo – micro-rework analýz dle review T-003:
- **F1**: T-002a A6 (zapracováno v prvním běhu, commit 436b681) + T-002b B5 –
  `Engine.curStep` je service-level undefined, `$rootScope.engine.curStep` funguje.
- **F2**: T-002a A8/B1 – citace `save: function(callback)` (game.js ř. 112) vs.
  volání z `autoSave` (ř. 45); zapracováno v prvním běhu, ověřeno proti zdroji.
- **F3**: T-002a C2 – precedence bug `/market` explicitně na ř. 25 (volání),
  ne uvnitř `getUpdatedData` (ř. 263+).
- **G1**: T-002a B5 + tabulka D (#15) – seedovatelný/serializovatelný RNG
  (originál `Math.random()` + `services/rand.js`) jako předpoklad catch-upu, Med.
- **G2**: T-002a B5 – auto-resolve bitev při catch-upu jako důsledek bitvy coby
  deterministického automatu na jednotném čase (A4 / T-002b C3 / K7-K8), Med.
- Rework note: `artifacts/final/rework_iter-001_T-004.md`
- Všechny citované řádky ověřeny proti `doc/original_source/.../services/`.

## Dílčí checklist
- [x] T-004: Zapracovat F1–F3 + G1, G2 do existujících analýz; zapsat rework note.

## Předpoklady
- Konsolidovaný seznam reviewera (T-003 §6) nedotčen; F4 neřešeno (vyřešeno K7/K8).
- Číslování tabulky D v T-002a zachováno (G1 přidán jako #15), aby existující
  reference na položky 1–14 zůstaly platné.

## Blockery
–
