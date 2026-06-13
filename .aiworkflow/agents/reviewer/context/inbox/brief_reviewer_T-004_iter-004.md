# Brief
- **Brief ID**: BRIEF-014
- **Iteration**: iter-004 (M0a)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iterace iter-004 (M0a engine core). Ověř DoD, soulad s návrhem/architekturou, kvalitu a rizika. Verdikt GO / RE-RUN.
## Scope IN
- Ověř DoD iter-004 (master plán): core běží v Node bez DOM; čas/sezóny se posouvají; determinism hash test; tsc --checkJs + grep gate zelené a v CI; tickOrder + ASCII diagram jako živé artefakty.
- Ověř soulad implementace s návrhem `design_iter-004_T-001.md` (signatury, moduly, vrstvení) a architekturou (§3.1 hranice vrstev, §4.1–4.4, §5.6).
- Posuď kvalitu: čitelnost, hranice vrstev (core bez DOM/fetch/Date.now/Math.random), testovatelnost, catch-up-safe připravenost.
- Zhodnoť BUG-001 z test reportu (assertSerializable stack overflow na cyklu) – je odložení na M1 OK, nebo blocker?
- Spusť `npm run ci` pro vlastní ověření.
## Inputs
- Kód src/, test/, tools/, docs/; návrh design_iter-004_T-001.md; impl note impl_iter-004_T-002.md; test report testreport_iter-004_T-003.md; architektura; `agents/reviewer/AGENTS.md`
## Acceptance Criteria
- Jasný verdikt GO / RE-RUN; nálezy klasifikované (BLOCKER/SUGGESTION/NITPICK) s odkazem na soubor.
- Při RE-RUN: přesně co coder opraví (orchestrátor reopenne).
## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-004_T-004.md`
