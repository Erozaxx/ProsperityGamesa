# Current Task

- **Task ID**: T-002 (Review DESIGNU M5 iter-013, architektonický gate před implementací)
- **Brief**: BRIEF-013-002
- **Iteration**: iter-013
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Review designu M5 (`design_iter-013_T-001.md`, 562 ř.) před implementací.
Ověřena tvrzení proti architektuře iter-002 (§5.3 K13, §5.4 K14, §6.3-6.4 persist, §7.1, §8),
master plánu §1.2/§3, DR-013-00, Q3/DR-001 a REÁLNÉMU KÓDU/ZDROJI:
effects.js, market.js getGoldValue, save/persistSchema.js + load.js, buildings.json,
formulas.js scaleCost, companies.json, jobs.json/jobs.js, originál home.js:285/2344 + config.js:1170.
Všechna nosná tvrzení designu o originálu/kódu ověřena – sedí.
Výstup: agents/reviewer/artifacts/final/review_design_iter-013_T-002.md

## Výsledek
Verdikt: **GO – s podmínkami**. Split: **ANO** M5-1(T1-T4)/M5-2(T5-T6), hranice beze změny.

Klíčová zjištění:
- Invarianty determinismu/persistu navržené správně (det. čítače místo Date.now, rng stream
  'buildings' místo Math.random, save=jen modifikátory, created=instances.length re-derivace,
  žádné applyUpgrade mutace). Tvrzení ověřena proti zdroji.
- M-1 (major): mapování building.effects → modifier není úplně specifikováno (T4.3 jádro K13);
  + dvojí cesta agregátů (modifikátory vs. created×effective) může dvojitě započítat. Vyjasnit = podmínka GO.
- M-2 (major): load Step 5 dnes dělá JEN workforce.total – design předpokládá obecný rebuild;
  T4.6 musí zavést rebuildBuildingDerived volaný z load I complete/destroy (jediná cesta),
  jinak load-only drift (M5-R1).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 4 (M-1 effects→modifier mapping; M-2 Step 5 rebuild; M-3 fold set řazení; M-4 build pay bez ctx/emitTx)
- MINOR: 5 (m-1 dot-path; m-2 grep gate do testu; m-3 M9 geom growth; m-4 DoD M5-1 commandy ne UI; m-5 T4.5 integ body)
- NIT: 3 (n-1 ageBuildings O(n); n-2 scaleCostByCount param name; n-3 doplnit pole ke 4 existujícím budovám)

## Design je dost konkrétní pro Sonnet kromě M-1/M-2 (vyžadují doplnění, jinak Sonnet rozhoduje architektonicky).
## Negitcommitnuto (scope per brief).
