# Current Task

- **Task ID**: T-001 (iter-009)
- **Brief**: context/inbox/brief_architect_T-001_iter-009.md (BRIEF-032)
- **Iteration**: iter-009 (M3 – produkce/joby/workerEfficiency/skilly + BL-3)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – DETAILNÍ implementační spec (pro Sonnet codera) pro iter-009 (M3). NE implementace.
Výstup: `artifacts/final/design_iter-009_T-001.md`.

Pokrytí (čerpáno z AUTORITATIVNÍCH zdrojových služeb forest/field/mine/skills/home/game/config.js
+ reálných src/core/*, src/data/*, balance.js, architektura §4.3/§5/§7/§11):
- T1 forest/field/mine: state pod state.world (start trees 27173/animals 3864/ores 20000/livestock 0
  z config.js); forestRegen na 10days (saplings queue, animal regen, autumn fire), fieldDaily/mineDaily
  na day; resource handler kind 'stock' (trees/animals/ores/livestock/farmland) + STOCK_PATH; area/used
  jako čisté funkce (forestArea/fieldArea/mineArea, NEUKLÁDAT) přes settlementLevel proxy.
- T2 joby: jobsProduction přepsat na PROGRESS model (home.js:1510-1547: curStep+=eff*number, completion
  > maxStep*900*number → grant products); builder stub (M5); jobsAccidents (quarterDay order 20,
  wolf/procAccident); autoAssignWorkers (order 30, round-robin deterministicky); assignJob command.
- T3 workerEfficiency: workerEfficiencyDaily systém (day order 5, PŘED meal/produkce) zapisuje
  state.home.workerEfficiency přes existující formulas.workerEfficiency (clamp [0.25,2]); morale složky
  =0 v M3 → konst. 1 (gap G-MORALE-M5).
- T4 skilly: skillsProgress (step order 20, 2× kompenzace effMaxStep=maxStep*0.5 dle K4/§4.3, completion
  při curStep>maxStep/2 → grant products); startSkill command; skills.json 1-2 approximated skilly.
- T5 UI: selektory selectResourceAreas/selectJobs/selectSkills/selectWorkforce; screens Forest/Field/
  Mine/Jobs/Skills nad send(); navigace UI-only (neukládá se).
- BL-3: var. A přednačtené ctx.catalog pro nové systémy + var. B hasCatalog místo try/catch v
  population.js/food.js.

## Klíčové invarianty zdůrazněné coderovi
tickOrder pořadí věrné zdroji (game.js Engine→World→Skills; efficiency→joby→jídlo; accidents PO produkci);
catch-up-safe (rng jen makeRng(state,stream) – forest/mine/field streamy už v StreamName; žádný
Date.now/Math.random); persist schéma psané SOUČASNĚ se systémem; reálná čísla do balance.js s odkazem;
job.maxStep approximated (G-JOB-MAXSTEP, default 0.005, kalibrace M9 = největší balanční nejistota).

## Alternativy (zamítnuté)
Alt A fixní per-tick produkce (nevěrné progress modelu + brání M5 multiplierům), Alt B stocky bez
handleru 'stock' (druhá platební cesta = třída defektů K5), Alt C efficiency inline v quarterDay
(jiný balanc + duplikace morale). Vše s důvody v §13.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-032
- [x] POVINNÉ vstupy: architektura §4.3/§5/§7/§11, doc/original_source_doc.md §2/§4/§6,
      AUTORITATIVNÍ services forest/field/mine/skills/home/game/config.js, review_iter-008 (BL-3)
- [x] Prozkoumány REÁLNÉ src/core/systems/*, resources/*, balance/*, state/*, commands/*, catalog/*,
      src/data/* (jobs/skills/resources/buildings/houseTypes/food/population/balance.json), ui/*, tickOrder
- [x] Spec T1-T5 + BL-3 (cesty, JSDoc signatury, datové tvary state, tickOrder pořadí, reálná čísla,
      jak ověří test tabulkové + catch-up-safe)
- [x] Persist schéma každé domény + migrace; catch-up-safe (S-05) explicitně
- [x] Min. 1 alternativa (3 alternativy s důvody)
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí (D1-D13 beze změny); scope OUT (žádný kód, žádný trh/ekonomika M4).
- job.maxStep/products approximated (G-JOB-MAXSTEP); home.level→settlementLevel proxy (G-HOME-LEVEL);
  population.total↔workerSlots sjednocení min() (G-POP-WORKFORCE); skilly discovered=true v M3.

## Blockery
–
