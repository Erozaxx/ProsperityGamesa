# Brief

- **Brief ID**: BRIEF-009
- **Iteration**: iter-003
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-13

## Goal
Proveď review master plánu iterací (PM T-001) – posuď úplnost, řez tasků na komplexitu Opus-návrh + Sonnet-provedení, závislosti/kritickou cestu a konzistenci test loop + review gate u každé iterace. Vrať verdikt + všechny nálezy (nejen blockery).

## Context
- iter-003 = cizelování plánu. PM agent (Fable) převedl schválené milníky M0–M9 architektury do 15 iterací (iter-004…iter-018) s tasky, modely, DoD, test loop a review gate.
- Tvoje review je quality gate před schválením uživatelem (T-004). Po review PM zapracuje nálezy (T-003).
- Architektura a její rozhodnutí (D1–D13, R1–R4) jsou SCHVÁLENÉ – nehodnoť je znovu; hodnoť, zda je plán s nimi konzistentní a realizovatelný.

## Scope IN
- Review deliverable: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`.
- Posuď zejména:
  1. **Úplnost** – pokrývá plán souvislou cestu M0→release bez děr? Je každý milník M0–M9 namapován na ≥1 iteraci?
  2. **Řez tasků** – jsou tasky realisticky nařezané tak, aby návrh zvládl Opus a provedení Sonnet? Není některý task moc velký/rizikový pro Sonnet (měl by být rozdělen)?
  3. **Závislosti & kritická cesta** – sedí pořadí? Jsou prerekvizity (M1 před obsahem, M2a před M2b atd.) správně?
  4. **Test loop + review gate** – má KAŽDÁ iterace závěrečný test (Sonnet/Haiku) i review gate (Opus, právo re-run)? Je obsah testů u dané iterace smysluplný (vzorce, determinismus, save round-trip, catch-up-safe od M2, PWA smoke)?
  5. **Konzistence s architekturou** – catch-up-safe invariant, M1 = extrakční pipeline, `tsc --checkJs` DoD M0, MVP = M0–M4.

## Scope OUT
- Neměň plán (to dělá PM v T-003). Jen reviduj a piš nálezy.
- Nehodnoť znovu architekturu/rozhodnutí D1–D13/R1–R4.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002: Review master plánu iterací; verdikt + všechny nálezy klasifikované (BLOCKER / SUGGESTION / NITPICK).

## Inputs (soubory / reference)
- POVINNÝ vstup: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`
- Reference architektury: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§11 milníky, §0 rozhodnutí)
- Zadání: `zadani_projektu.md`
- Tvoje role/gate: `agents/reviewer/AGENTS.md`

## Acceptance Criteria
- Jasný verdikt (GO / GO s úpravami / NO-GO).
- Všechny nálezy s klasifikací (BLOCKER / SUGGESTION / NITPICK), každý s konkrétním odkazem (iterace/task) a doporučením.
- Explicitní potvrzení (nebo vyvrácení) bodů 1–5 ze Scope IN.

## Expected Outputs (cesty k souborům)
- `agents/reviewer/artifacts/final/review_iteration_master_plan_iter-003_T-002.md`

## Risks / Constraints
- Buď konkrétní a akční – nálezy musí jít zapracovat. Vyhni se obecným frázím.
- Pokud je plán v pořádku, řekni to (GO) – nevymýšlej nálezy na sílu; SUGGESTION/NITPICK jen když mají hodnotu.
