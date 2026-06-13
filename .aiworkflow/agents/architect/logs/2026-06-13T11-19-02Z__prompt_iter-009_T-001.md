# Brief
- **Brief ID**: BRIEF-032
- **Iteration**: iter-009 (M3)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní spec (pro Sonnet) pro iter-009 (M3): systémy forest/field/mine, joby+produkce, workerEfficiency, skilly (2× kompenzace), UI. Staví na M2 (transakce, systémy, catch-up).
## Context
- M0–M2 hotovo: engine, katalogy, transakce, persist, živé systémy populace/jídlo/zdraví/krimi, offline catch-up. Teď M3 = produkční smyčka (suroviny, joby, efektivita, skilly).
- catch-up-safe invariant (S-05) platí pro všechny nové systémy.
## Scope IN (navrhni všechny)
- T1 systémy forest/field/mine: stocky (trees/animals/ores/livestock/farmland) jako resource handlery, regenerace lesa (10 dní, TREEMATURETIME z balance), mine/field periodika, area/used plocha (kapacita).
- T2 joby + produkce (quarterDay): jobsProduction vč. builder slotu (stub pro M5), autoAssignWorkers, accidents; assignJob command. jobs.products je mapa {resourceId:amount} (z M2a).
- T3 workerEfficiency (day) jako čistá formula (clamp [0.25,2], curfew -0.25 z M1 formulas) + napojení na produkci.
- T4 skilly: skillsProgress (per step, 2× kompenzace maxStep/2 dle K4), startSkill command, UI panel. (skills katalog je approximated z M1 – použij, doplň gap.)
- T5 UI obrazovky forest/field/mine/jobs (karty, listy, progress) nad selektory + commands.
- BL-3 (backlog M2b): getCatalog cache mimo hot-path (cache katalogy v ctx při startu / hasCatalog místo try/catch).
## Inputs (POVINNÉ)
- Architektura §4.3 tickOrder, §5 katalogy, §7 resource/transakce; doc/original_source_doc.md (mechaniky produkce/joby/skilly + reálná čísla)
- M2 kód: src/core/systems/, src/core/resources/, src/data/ (resources/jobs/skills katalogy); review_iter-008_T-004rr.md (BL-3)
- agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá T1–T5 + BL-3: cesty, signatury, datové tvary state (stocks/jobs/skills/area), tickOrder pořadí (quarterDay produkce, day efficiency/regenerace), reálná čísla z katalogů/source doc, jak ověří test (tabulkové + catch-up-safe).
- Pořadí uvnitř dne věrné zdroji (reviewer to bude kontrolovat).
## Expected Outputs
- agents/architect/artifacts/final/design_iter-009_T-001.md
## Constraints
- Core bez DOM; všechny systémy catch-up-safe (deterministické, levné v dávce). Persist schéma každé domény se systémem. Balanc čísla do balance.js s odkazem; nedoložitelné → approximated+gap.
