# Brief

- **Brief ID**: BRIEF-012-010
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: tester
- **Date**: 2026-06-13

## Goal
Nezávislá QA validace celé implementace iter-012 (playability hardening A1–A5 + reload-determinismus fix). Ověřit exit kritéria iterace empiricky, ne jen že CI je zelené.

## Co bylo implementováno (kontext)
- **A1 (T-005)**: start seed — fresh hra startuje populovaná (pop 50, gold 500, food, housing) přes `BALANCE.start`.
- **A2 (T-006)**: resolver gold/techPt — dedikovaný handler před byId lookupem (`resourceKindOf`).
- **A3 (T-007)**: crime pay robustnost — no-throw při broke osadě.
- **A4 (T-008)**: sanity-cap populace — denní sazba `annualRate/364` + hard-cap `sanityMaxPop=10000`.
- **A5 (T-009)**: market UI overflow fix (`.table-scroll`).
- **Determinismus fix (T-013–T-016)**: `workforce.total` se dopočítává přes `deriveWorkforceTotal` při init i load (single source of truth) → reload-determinismus i fresh-sim konzistentní. Detaily: `orchestration/decisions/DR-012-02_*.md`.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (typecheck + lint:core + test). Potvrď číslo testů a 0 fail.
2. **`npm run smoke`** OK (seeded pop=50, 0 console errors).
3. **Dlouhý seedovaný sim ≥2 herní roky** (≥728 herních dní; pozor DAYS_PER_YEAR=364) z fresh seedovaného startu — **bez crashe/výjimky**. Ověř, že populace neexploduje (sanity-cap drží, ne 50→~8749/rok) ani nespadne na 0 nesmyslně.
4. **Accounting invariant**: Σ transakcí == Δ `state.player.gold` přes delší běh (po A2 fixu resolveru). Pokud existuje invariant-check util/test, použij; jinak postav krátký skript přes veřejné API (engine step + ledger).
5. **G1 determinismus po load na PLNÉM `hashState`**: save→load→N kroků == kontinuální N kroků (bit-shoda celého stavu, ne jen perzistované projekce). Ověř i z fresh seedovaného startu a save na různých krocích (vč. brzkého kroku).
6. **Tvar save v3**: `applyPersist(state)` payload NEobsahuje `workforce.total` (jen `assigned`).

## Scope OUT
- Neměň produkční kód. Pokud najdeš bug, NEopravuj — zapiš nález a eskaluj (orchestrátor reopne coderovi).
- Testovací helper skripty si napsat můžeš (do `agents/tester/state/` nebo tmp), ale necommituj produkční změny.

## Inputs
- `orchestration/decisions/DR-012-02_*.md`, `DR-012-01_*.md`
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md`, `…_T-014.md`, `…_T-016.md`
- Architektura: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md`
- Kód: `src/core/state/createInitialState.js`, `src/core/systems/jobs.js`, `src/save/load.js`, `src/core/resolver*`, `src/core/systems/crime.js`, `src/core/systems/population*`

## Acceptance Criteria (exit iterace)
- `npm run ci` zelené, `npm run smoke` OK.
- Dlouhý seedovaný sim ≥2 herní roky bez crashe a bez explozivního/nesmyslného růstu populace.
- Accounting invariant (Σ tx == Δ gold) drží i po fixu resolveru.
- G1 determinismus po load drží na plném `hashState`.
- Fresh hra startuje populovaná (pop/gold/food > 0) a zlato se v UI reálně hýbe (taxes/grant → `state.player.gold`).

## Expected Outputs
- QA report: `agents/tester/artifacts/final/qa_report_iter-012_T-010.md` — každé AC s PASS/FAIL + důkaz (čísla, hashe, výstupy). Verdikt GO/NO-GO.
- Při NO-GO: konkrétní repro + které AC selhalo → eskalace orchestrátorovi.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-010 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).

## Risks / Constraints
- Determinismus je core invariant — buď přísný, hledej i latentní desync (různé save-pointy, vč. kroku 0/1).
- Buď nezávislý — neopisuj coderova tvrzení, ověř je vlastním během.
