# Brief
- **Brief ID**: BRIEF-031
- **Iteration**: iter-008 (M2b)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-008 (M2b) = DoD M2. Verdikt GO / RE-RUN. Klíč: acceptance „offline progres" reálně splněno; catch-up MVP vědomě minimální = OK, invariant pro M3+ vyhlášen.
## Scope IN
- DoD M2 (master plán): osada žije offline – progres se dopočítá po návratu vč. capu a summary; autosave pokrývá mobilní swipe away; export/import funguje.
- S-1 vyřešeno: persist pipeline napojena na reálnou save/load cestu (saveGame přes allowlist; bootstrap katalogy→loadAndReconstruct).
- catch-up = TÝŽ kód jako live (žádná druhá implementace); G1 determinismus (chunked==batch==live).
- POSUĎ NÁLEZ testera: populationMigration volá getCatalog('houseTypes') KAŽDÝ KROK v try/catch (bez katalogů házelo výjimku ~3000 ns; s katalogy ~470 ns/krok). Je per-step getCatalog + try/catch jako control-flow akceptovatelné, nebo nutná oprava (cache katalogu při startu / přesun mimo hot-path)? Klasifikuj (blocker/suggestion).
- Kvalita: autosave triggery, export komprese/allowlist parita, summary model, catch-up cap/yield.
- Spusť `npm run ci`.
## Inputs
- src/core/engine/catchup.js, src/core/systems/population.js, src/save/*, src/app/*, test/, tools/bench-step.mjs; návrh, impl note, test report; architektura §4.1/§6; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; nálezy klasifikované; stanovisko k per-step getCatalog patternu.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-008_T-004.md
