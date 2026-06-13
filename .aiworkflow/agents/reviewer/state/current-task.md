# Current Task

- **Task ID**: T-004 (review gate)
- **Brief**: BRIEF-035
- **Iteration**: iter-009 (M3)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: review gate iter-009 (M3 = DoD M3) s pravomocí re-run.
Výstup: agents/reviewer/artifacts/final/review_iter-009_T-004.md

## Výsledek
Verdikt: **RE-RUN**.

CI ověřeno: `npm run ci` ZELENÉ (tsc 0, lint:core OK 41 souborů, node --test 622/622).

## Co je OK (ověřeno proti zdroji)
- tickOrder pořadí věrné §4.3 (skills step/20; jobs qd 10/20/30; workerEff day/5 PŘED meal1; field/mine day; forest 10days).
- Engine→World→Skills + 2× kompenzace skillů: OVĚŘENO ve zdroji – Skills.step() volán 2× (world.js:575 + game.js:18) → effMaxStep=maxStep*0.5 je věrná reprodukce. completion na step 26 (maxStep 50).
- Jobs progress model: completionUnits = maxStep*900*number; curStep += eff*number; grant products*number. Věrné home.js:1510-1547.
- workerEfficiency clamp [0.25,2], M3=1. Catch-up-safe (žádný Date.now/Math.random, vlastní RNG streamy, RNG nečerpán když není důvod). persist allowlist bez progPct/area/used. stock handler + NaN guard. core bez DOM.

## Nálezy (blokující)
- BLOCKER-1: assignJob/startSkill NEregistrované v main.js bootstrapEngine; ctx.catalog NEwired (BL-3 Var.A jen v testech, ne v runtime). → smyčka nehratelná přes app.
- BLOCKER-2: T5 UI (screens + selektory selectJobs/selectSkills/selectResourceAreas/selectWorkforce) zcela chybí. DoD M3 „hratelná" nesplněno (NEBO schválený scope change).
- SUGGESTION-1: forest fire jmenovatel forestArea vs source maxTrees (~100× riziko) – dle návrhu §3.1, nepřesnost návrhu, ne codera.

## Re-run scope (jádro NEMĚNIT)
1. Registrovat assignJob+startSkill + sestavit ctx.catalog v bootstrapEngine (+test registrace).
2. Dodat T5 UI selektory+screens, NEBO schválený scope change zapsaný do project/scope-changes.md + úprava DoD M3.
3. (volitelně) rozhodnout forest-fire jmenovatel.

## Kód neměněn (scope OUT).
