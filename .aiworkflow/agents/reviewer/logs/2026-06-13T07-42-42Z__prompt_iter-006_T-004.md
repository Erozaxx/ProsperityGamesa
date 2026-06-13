# Brief
- **Brief ID**: BRIEF-022
- **Iteration**: iter-006 (M1)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-006 (M1) = DoD M1. Verdikt GO / RE-RUN. Klíč: úplnost extrakce vs. gap report, referenční čísla, provenance flagy.
## Scope IN
- DoD M1 (master plán): katalogy kompletní/validované NEBO díry explicitně v gap reportu s eskalací; referenční čísla potvrzena testem; balance/formulas základ.
- Soulad s návrhem design_iter-006_T-001.md (extrakce, schémata, formulas, gap).
- Posuď gap report (src/data/gap-report.json + doc/gap-report-iter-006.md): jsou provenance flagy (extracted/derived/approximated) korektní? Jsou MVP-blokující díry (jobs/buildings/goods/marketBaseline) řešitelné v M2–M4, nebo blocker? Autonomní eskalace dle Q3/DR-001 dodržena?
- Kvalita: formulas čisté funkce, balance s odkazem na zdroj, fail-fast validátor, BUG-001 fix správný, extrakce reprodukovatelná.
- Spusť `npm run ci`.
## Inputs
- src/data/, src/core/catalog/, src/core/balance/, src/core/registry/, tools/extract/, test/; návrh, impl note, test report; architektura §5/§9.3; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; nálezy klasifikované; při RE-RUN přesně co.
- Potvrzení/vyvrácení, že re-planning checkpoint M2+ může proběhnout (gap report dostatečný podklad).
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-006_T-004.md
