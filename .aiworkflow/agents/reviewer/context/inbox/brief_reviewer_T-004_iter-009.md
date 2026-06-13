# Brief
- **Brief ID**: BRIEF-035
- **Iteration**: iter-009 (M3)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-009 (M3) = DoD M3. Verdikt GO / RE-RUN. Klíč: pořadí uvnitř dne ověřeno proti zdroji a zapsáno do tickOrder (věrnost §4.3).
## Scope IN
- DoD M3 (master plán): produkční smyčka hratelná; skilly progresují s kompenzací; vše catch-up-safe.
- Soulad s návrhem design_iter-009_T-001.md a se ZDROJEM (doc/original_source/modules: forest/field/mine/skills/jobs). Pořadí Engine→World→Skills věrné.
- Jobs progress model správný (curStep += eff·number, completion maxStep·900·number); workerEfficiency napojení; skilly 2× kompenzace.
- Catch-up-safe invariant (posuď i kód, ne jen testy); BL-3 fix (getCatalog cache mimo hot-path) korektní.
- Kvalita: persist allowlist (progPct/area derivované, ne v payloadu), balanc čísla s odkazem/approximated+gap, hranice vrstev (core bez DOM).
- Spusť `npm run ci`.
## Inputs
- src/core/systems/{forest,field,mine,jobs,workerEfficiency,skills}.js, src/core/resources/, src/data/, test/, docs/tickOrder.md; návrh, impl note, test report; doc/original_source/modules/; architektura §4.3/§7; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; nálezy klasifikované; při RE-RUN přesně co.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-009_T-004.md
