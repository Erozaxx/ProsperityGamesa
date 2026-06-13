# Brief

- **Brief ID**: BRIEF-012-002
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-13

## Goal
Zrevidovat architektonický návrh playability hardeningu (T-001) — najít VŠECHNY nálezy (nejen blockery): korektnost, rizika, mezery, dopad na determinismus a accounting invariant.

## Context
Architekt navrhl řešení 5 oblastí (start seed, resolver gold/techPt, crime pay clamp, sanity-cap populace, market UI overflow) na základě reálného playtestu (`doc/playtest-findings-mvp.md`). Návrh je vstup pro codera (T-005–T-009). Tvé review je gate před schválením uživatelem (T-004).

## Scope IN
- Review návrhu `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md`.
- Ověř tvrzení proti reálnému kódu (resolver, start seed, crime, populace, market UI) — nevěř návrhu na slovo, zkontroluj klíčová místa.
- Posuď: je doporučené pořadí (A2→A1→A3→A4→A5) správné? Jsou rizika/mitigace úplné? Je dopad na determinismus/save-hash a accounting invariant správně analyzovaný? Něco chybí (edge cases, testy)?

## Scope OUT
- Implementace ani psaní kódu.
- Plná balanc kalibrace (M9).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002: Review architektury — strukturovaný seznam nálezů (severity: blocker/major/minor/nit) + doporučení, zda lze jít do implementace

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md` (předmět review)
- `doc/playtest-findings-mvp.md`
- Reálný kód: `src/core/resources/handlers.js`, `src/core/resources/transactions.js`, `src/core/state/createHomeState.js`, `src/core/state/createInitialState.js`, `src/core/balance/balance.js`, `src/core/systems/crime.js`, systémy populace (births/retirement), market UI + `styles.css`, save/load + determinism testy

## Acceptance Criteria
- Strukturovaný seznam nálezů se severitou; každý blocker/major má konkrétní soubor/řádek a návrh řešení.
- Explicitní verdikt: GO / GO s podmínkami / NO-GO do implementace.
- Pokud návrh nemá vadu → jasně to napiš (prázdný blocker seznam je validní výsledek).

## Expected Outputs (cesty k souborům)
- `agents/reviewer/artifacts/final/review_architecture_iter-012_T-002.md`

## Risks / Constraints
- Zero-build PWA, žádné nové runtime závislosti.
- Determinismus je tvrdý požadavek; resolver je core používaný všude.
