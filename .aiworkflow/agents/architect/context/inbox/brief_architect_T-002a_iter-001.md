# Brief

- **Brief ID**: BRIEF-002a
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Na základě T-001 identifikovat refactoring kandidáty v rovině **výkon & runtime + save/offline + serverové závislosti**, pohledem cíle mobile-first PWA / offline.

## Context
T-002 (celé) na Fable vypršelo idle timeoutem, proto je rozděleno na dva kratší tasky.
Tento task (T-002a) pokrývá jen výkonovou a offline/save/serverovou rovinu. Druhý task
(T-002b, běží paralelně) řeší údržbu/architekturu. Stále jde o analýzu/doporučení, ne
implementaci.

## Scope IN
- **Výkon & runtime**: každý-krok `step()` funkce volané z `World.step()`, agregační smyčky,
  `Engine.schedule` GC, bitvy na vlastním 30 ms intervalu, drift kompenzace v `Game.run()`.
- **Save / offline**: save model „stav minus katalog" (lz-string diff + re-link + re-aplikace
  upgradů), autosave perioda, co se stane offline (žádná offline simulace / catch-up?).
- **Serverové závislosti**: katalogy (listBuildings/listGoods/listTechs/listZone…) fetchované
  ze serveru, `/market`, modul `gamesaves`, socket.io – co v offline PWA nutně padá.
- Pro každý nález: problém, dopad/odůvodnění, priorita (High/Med/Low), doporučená alternativa, odhad rizika/úsilí.

## Scope OUT
- NEŘEŠ provázanost/údržbu, string-callback dispatch, UI↔logika, balanc-as-code (to je T-002b).
- Neopakuj popis mechanik z T-001 (odkazuj). Žádná implementace.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002a: Refactoring kandidáti – výkon & runtime + save/offline + serverové závislosti.

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md` (začni tady).
- `doc/original_source/modules/prosperity/services/` (engine.js, game.js, world.js, market.js) pro ověření.
- `.aiworkflow/zadani_projektu.md` – cíl mobile-first PWA, offline.

## Acceptance Criteria
- Pokryty všechny tři roviny: výkon & runtime, save/offline, serverové závislosti.
- Každý nález má: problém, dopad, prioritu, alternativu, odhad rizika/úsilí.
- Prioritizovaný seznam nálezů tohoto domeny na závěr.
- Strukturovaný markdown, odkazy na T-001 a zdroj (ne duplikace).

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md`

## Risks / Constraints
- Drž doménu (neukousni T-002b). Konkrétní, odůvodněné nálezy, ne fráze.
- Model: **Fable**, xhigh. Cíl je kratší fokusovaný běh.
