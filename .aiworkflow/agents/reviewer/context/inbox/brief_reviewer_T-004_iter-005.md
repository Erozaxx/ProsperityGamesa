# Brief
- **Brief ID**: BRIEF-018
- **Iteration**: iter-005 (M0b)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-005 (M0b) = DoD M0 komplet. Verdikt GO / RE-RUN. Při nevyhovujícím benchmarku NAŘIZUJ eskalaci (Worker/cap), ne pokračování.
## Scope IN
- DoD M0 (master plán iter-005): hra instalovatelná a startuje offline; čas/sezóny/save/load/pauza/rychlosti fungují; benchmark změřen PŘED potvrzením capu; CI gate funkční. + DoD M0a stále platí.
- Soulad s návrhem design_iter-005_T-001.md (PWA shell, SW, IndexedDB save, benchmark, error screen).
- Posuď benchmark report (docs/benchmark_iter-005.md): je potvrzení capu 8h obhájené? D13 (main thread) OK? Syntetická povaha (A2) korektně uvedena?
- Kvalita: hranice vrstev (core bez DOM stále drží grep gate), kill-safe save, SW cache strategie, zero-build vendor.
- Spusť `npm run ci` pro vlastní ověření.
## Inputs
- Kód src/, test/, tools/, docs/, .github/; návrh, impl note, test report; architektura; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Jasný verdikt GO / RE-RUN; nálezy klasifikované s odkazy; při RE-RUN přesně co opravit.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-005_T-004.md
