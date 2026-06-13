# Brief

- **Brief ID**: BRIEF-012-011
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-13

## Goal
Code review **celé implementace iter-012** (playability hardening A1–A5 + reload-determinismus fix). Hledej correctness bugy i příležitosti k reuse/simplify/maintainability. QA (T-010) už dala GO empiricky — ty hodnotíš kvalitu kódu, ne jen že to běží.

## Rozsah review (produkční diff)
Base→HEAD: `1418072..HEAD` (větev `feature/iter-012-init`). Produkční soubory (mimo `.aiworkflow/`):

```
src/core/balance/balance.js            (A1 BALANCE.start)
src/core/resources/handlers.js         (A2 gold/techPt handler)
src/core/state/createHomeState.js      (A1 seed z BALANCE)
src/core/state/createInitialState.js   (A1 seed + derive-on-init workforce.total)
src/core/systems/health.js             (A3/A4 souvislosti)
src/core/systems/jobs.js               (deriveWorkforceTotal helper, autoAssign)
src/core/systems/population.js         (A4 sanity-cap, denní sazba /364)
src/save/load.js                       (Option A rebuild-on-load Step 5)
src/ui/screens.js, src/ui/styles.css   (A5 market overflow)
src/precache.js                        (regenerováno)
tools/smoke.mjs                        (seeded smoke)
test/*                                 (nové+upravené testy)
```
Diff získáš: `git diff 1418072..HEAD -- src/ tools/ test/`

## Na co se zaměřit
1. **Correctness** — A1 seed (žádný dvojí seed, konzistence population/housing/food/gold), A2 resolver (gold/techPt handler před byId, žádný regres jiných zdrojů), A3 crime no-throw, A4 sanity-cap (denní sazba `annualRate/364`, hard-cap, žádné off-by-one / přetečení), determinismus fix (`deriveWorkforceTotal` single source of truth, žádná 4. kopie, init↔load↔autoAssign konzistence).
2. **Reuse / simplify** — duplicitní logika, zbytečná složitost, místa kde šlo využít existující util. Buď konkrétní (soubor:řádek + návrh).
3. **Maintainability** — čitelnost, pojmenování, komentáře u netriviálních invariantů (zejm. determinismus/RNG), test coverage nových cest.
4. **Soulad s architekturou** — `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` a DR-012-01/02. Odchylky označ.

## Inputs
- DR-012-01, DR-012-02 (`context/refs/`)
- Architektura: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md`
- Coder impl summaries: `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md`, `…_T-014.md`, `…_T-016.md`
- QA report: `agents/tester/artifacts/final/qa_report_iter-012_T-010.md`

## Acceptance Criteria
- Review pokrývá všechny produkční soubory v rozsahu.
- Každý nález klasifikován: **blocker / major / minor / nit**, s `soubor:řádek` a konkrétním návrhem.
- Explicitní verdikt: **GO / GO-s-podmínkami / NO-GO**.
- Pokud blocker/major → orchestrátor reopne coderovi; minor/nit můžou jít do backlogu.

## Expected Outputs
- `agents/reviewer/artifacts/final/code_review_iter-012_T-011.md` — nálezy + verdikt.

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-011 "<verdikt + počet nálezů dle závažnosti>"`
- NEcommituj (git), NEopravuj kód — jen review.

## Constraints
- Buď věcný a konkrétní; žádné vágní „mohlo by být lepší" bez návrhu.
- Determinismus je core invariant — RNG cesty a derivovaná pole prověř obzvlášť pečlivě.
