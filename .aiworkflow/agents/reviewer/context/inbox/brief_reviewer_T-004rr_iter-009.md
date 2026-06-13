# Brief (RE-REVIEW round 2 – po opravě 2 blockerů)
- **Brief ID**: BRIEF-035rr
- **Iteration**: iter-009 (M3)
- **To**: reviewer (Opus)
## Goal
Re-review iter-009 (M3) po opravě B-1 (commandy+ctx.catalog v runtime) a B-2 (T5 UI) + S-1 (forest fire). Verdikt GO / RE-RUN. DoD M3 reálně splněno?
## Co se opravilo
- B-1: assignJob/startSkill registrované v bootstrapEngine + ctx.catalog preload; +testy dosažitelnosti (boot-integration).
- B-2: src/ui/screens.js (Forest/Jobs/Skills) + selektory (selectJobs/selectSkills/selectWorkforce/selectWorld) + záložky v App.js.
- S-1: forest fire jmenovatel maxTrees (328327).
## Scope IN
- OVĚŘ B-1 reálně: commandy dosažitelné přes send() po bootu (ne unknown), ctx.catalog naplněn v runtime.
- OVĚŘ B-2: UI obrazovky existují a jsou napojené na commands (assignJob/startSkill); produkční smyčka hratelná end-to-end.
- OVĚŘ S-1: forest fire vzorec dle zdroje.
- DoD M3 reálně splněno; catch-up-safe nezhoršeno; core bez DOM.
- Spusť `npm run ci` (zelené).
## Inputs
- src/app/main.js, src/ui/screens.js, src/ui/selectors.js, src/ui/App.js, src/core/systems/forest.js, test/; předchozí review review_iter-009_T-004.md; agents/reviewer/AGENTS.md
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-009_T-004rr.md
