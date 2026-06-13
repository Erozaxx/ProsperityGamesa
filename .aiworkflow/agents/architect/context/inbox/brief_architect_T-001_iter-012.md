# Brief

- **Brief ID**: BRIEF-012-001
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-13

## Goal
Navrhnout architekturu „playability & onboarding hardeningu" — opravit pět provázaných nálezů tak, aby MVP bylo reálně hratelné, deterministické a bez crashů.

## Context
Po dokončení M0–M4 proběhl reálný browser playtest (headless Chromium) + dlouhý seedovaný sim. Odhalil řetězec latentních bugů, které 762 unit testů neviděla (testovaly prázdný start). Detaily a reprodukce jsou v `doc/playtest-findings-mvp.md`. Hra je „technicky MVP", ale startuje s 0 populace / 0 zlata a po seedu padá.

Klíčové zjištění z reprodukce (orchestrátor ověřil v běhu):
- `createInitialState` volá `createHomeState()`/`createPlayerState()` BEZ katalogu a factory čtou neexistující klíče `startPopulation`/`startTents` místo `BALANCE.start` (`population:50, gold:500, food, housing`).
- `resourceKindOf('gold')` nenajde 'gold' v katalogovém `byId` → vrátí `'resource'` handler (čte 0). Takže `pay({gold})` vidí „have 0" i když `state.player.gold>0` → výjimka „insufficient funds". Dopad i mimo crash: gold přes handler (taxes/grant) nejde do `state.player.gold`.
- `crimeDaily` volá `pay({gold})`, které při nedostatku hází.
- Populace exploduje 50 → ~8749 / herní rok (nezastropené porody/migrace).
- Market UI přetéká horizontálně na úzkém mobilu.

## Scope IN
- Návrh řešení pro všech pět oblastí (start seed, resolver gold/techPt, crime pay clamp, sanity-cap populace, market UI overflow).
- Pro každou: dotčené moduly/funkce, navrhovaná změna, alternativy + doporučení, rizika.
- **Dopad na determinismus a save-hash** (seed mění initial state → hash; jak ošetřit existující save/load testy).
- **Dopad na accounting invariant** (Σ tx == Δ gold) po fixu resolveru gold/techPt.
- Doporučené pořadí implementace + jaké testy/aktualizace testů budou potřeba.

## Scope OUT
- Plná balanc kalibrace (M9) — populace jen sanity-cap, ne finální tuning.
- Implementace samotná (to dělá coder v T-005–T-009).
- Nové herní mechaniky/budovy (M5+).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-001: Navrhnout architekturu pro všech 5 oblastí + dopad na determinismus/save-hash + accounting invariant + doporučené pořadí implementace

## Inputs (soubory / reference)
- `doc/playtest-findings-mvp.md`
- `src/core/state/createHomeState.js`, `src/core/state/createInitialState.js`
- `src/core/balance/balance.js` (sekce `start`)
- `src/core/resources/handlers.js` (`resourceKindOf`, `handlerFor`, gold/techPt handlery), `src/core/resources/transactions.js`
- `src/core/systems/crime.js`
- systémy populace (births/migration) – dohledat
- UI market komponenta – dohledat
- `tools/smoke.mjs` (browser-smoke gate, k dispozici přes `npm run smoke`)

## Acceptance Criteria
- Návrh pokrývá všech 5 oblastí s konkrétními soubory/funkcemi a doporučenou variantou.
- Explicitně řeší dopad na determinismus/save-hash a na accounting invariant.
- Obsahuje ASCII diagram toku (alespoň pro resource resolver / start-state cestu), seznam rizik + mitigací a doporučené pořadí implementace.
- Je realizovatelný coderem bez dalšího rozhodování o architektuře.

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md`

## Risks / Constraints
- Zero-build PWA, žádné nové runtime závislosti do `src/`.
- Změna resolveru zdrojů je core a používá se všude (taxes, market, upkeep) — nutná opatrnost a důraz na zpětnou kompatibilitu chování mimo gold/techPt.
- Determinismus je tvrdý požadavek (existují save/determinism testy).
