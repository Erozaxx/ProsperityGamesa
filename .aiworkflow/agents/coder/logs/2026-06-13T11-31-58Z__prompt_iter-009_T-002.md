# Brief
- **Brief ID**: BRIEF-033
- **Iteration**: iter-009 (M3)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-009 (M3) PŘESNĚ dle návrhu. SKUTEČNĚ vytvářej soubory, průběžně `npm run ci`, nekonči bez zelené CI + impl note + handoff.
## Scope IN (dle design_iter-009_T-001.md)
- T1 systémy forest/field/mine (stocky jako resource handlery; regenerace lesa 10days; field/mine day; area/used; start hodnoty trees 27173/animals 3864/ores 20000/livestock 0; area vzorce dle návrhu).
- T2 joby+produkce (quarterDay): PROGRESS model (job.curStep += workerEfficiency·number, completion při curStep > maxStep·900·number → grant products) – přepiš M2a placeholder amount·5; autoAssignWorkers, accidents; assignJob command. jobs.products mapa.
- T3 workerEfficiency (day systém, formula už existuje, clamp [0.25,2]) napojený na produkci.
- T4 skilly: skillsProgress (per step, po produkci; 2× kompenzace maxStep·0.5); startSkill command; UI panel.
- T5 UI forest/field/mine/jobs (selektory + screens + commands).
- BL-3: přednačtený ctx.catalog + hasCatalog místo per-step getCatalog try/catch.
- Doplnit gapy do gap-report.json (G-JOB-MAXSTEP default 0.005 approximated atd.); balanc čísla do balance.js s odkazem na zdroj.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-009_T-001.md
- src/core/systems/, src/core/resources/, src/data/, docs/tickOrder.md; doc/original_source/modules/ (reálné mechaniky); agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. tabulkových produkce/efficiency + catch-up-safe nových systémů).
- tickOrder aktualizován (pořadí věrné zdroji: Engine→World→Skills); docs/tickOrder.md.
- Core bez DOM; systémy catch-up-safe; persist schéma nových domén.
## Outputs
- Kód; impl note agents/coder/artifacts/final/impl_iter-009_T-002.md; handoff-out.sh T-002
