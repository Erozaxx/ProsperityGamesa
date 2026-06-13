# Brief
- **Brief ID**: BRIEF-034
- **Iteration**: iter-009 (M3)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop M3 dle §1.3: tabulkové testy produkce/efficiency proti referencím, catch-up-safe invariant nových systémů, save round-trip, PWA smoke.
## Scope IN
- `npm run ci` zelené.
- Tabulkové testy: jobsProduction progress model (curStep += eff·number, completion při maxStep·900·number → grant products), workerEfficiency clamp [0.25,2], area vzorce (forest 28000+1.6^lvl·5000, field, mine), regenerace lesa (10days, TREEMATURETIME), skilly 2× kompenzace (maxStep·0.5).
- catch-up-safe invariant pro VŠECHNY M3 systémy (forest/field/mine/jobs/workerEfficiency/skills): live N kroků == dávka N kroků (identický hash), i přes denní/quarterDay/měsíční hrany.
- Save round-trip nových domén (world.forest/field/mine, home.jobs/skills/workerEfficiency); deriváty (progPct) nejsou v payloadu.
- Determinismus (RNG streamy forest/mine/field); PWA smoke kumulativní.
- Doplň chybějící edge testy; negativně (vytěžený stock, nikdo nepřiřazen → žádná produkce).
## Inputs
- src/core/systems/{forest,field,mine,jobs,workerEfficiency,skills}.js, src/data/, test/; návrh design_iter-009_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky. Při FAIL přesně co.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-009_T-003.md + případné nové testy
