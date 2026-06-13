# Brief

- **Brief ID**: BRIEF-012-005
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-06-13

## Goal
Implementovat playability hardening podle SCHVÁLENÉ architektury (T-003) — všech 5 oblastí v předepsaném pořadí, deterministicky a se zelenou CI.

## Context
Architektura byla schválena uživatelem (T-004), vč. A2 Option A. Single source of truth je **`.aiworkflow/agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md`** (supersedes T-001). Drž se jí — řeší root causes, konkrétní soubory/řádky, rizika a mapování testů. Pokud najdeš rozpor mezi návrhem a realitou kódu, NEulet od návrhu potichu — zastav se a poznač to v handoffu.

Pořadí implementace (závazné): **A1 → A4 → A3 (jen test) → A5 → A2 (hardening)**.

## Scope IN (mapování na plan tasky)
- **T-005 (A1) Start seed:** Seedovat v `createInitialState` z `BALANCE.start` (gold 500, population 50, housing `{tent:5}`, food.store s všemi 6 klíči). Odstranit chybné čtení `startTents`/`startPopulation` v `createHomeState.js` (ř. ~14-22), factory nech jako neutral defaults. V `src/save/load.js` smazat řádky ~211-212 (přepis `createHomeState`/`createPlayerState`). Ověř, že fresh hra startuje pop 50 / gold 500 a staré savy se načtou korektně (applyPayload allowlist přepíše).
- **T-006 (A2) Resolver hardening (Option A):** Defensivní early-return v `resourceKindOf` (`src/core/resources/handlers.js`) — pro `'gold'`/`'techPt'` vrátit klíč napřímo PŘED `byId` lookupem. S načteným katalogem no-op; bez katalogu vrátí správný handler. Přidat test invariance (s katalogem i bez něj → 'gold'/'techPt').
- **T-007 (A3) Crime regress test:** Žádná změna logiky crime. Přidat regresní test: broke osada (gold < crime cost) → `crimeDaily` NEHODÍ (no-throw invariant), gold se clampne na floor(available).
- **T-008 (A4) Sanity-cap populace:** (a) Denní sazba: `healthBirths` (`health.js`) i `populationRetirement` (`population.js`) musí použít `annualRate / DAYS_PER_YEAR`, kde `DAYS_PER_YEAR = 4 * BALANCE.season.seasonDays` (= 364). (b) Globální sanity hard-cap: v `healthBirths` i `populationMigration` clampnout výsledek na `sanityCap = Math.max(housingCapacity, BALANCE.population.sanityMaxPop)`; přidat `population.sanityMaxPop` (např. 10000) do `balance.js` + zrcadlit do `src/data/balance.json`. NEMĚNIT sdílenou `calcHousingDerivedFromCatalog`. Births/retirement nepoužívají RNG → musí zůstat deterministické.
- **T-009 (A5) Market UI overflow:** V `styles.css` přidat scroll wrapper + responsivní pravidlo pro market tabulku (6 sloupců) — vodorovný scroll na úzkém mobilu, žádný přepis komponenty. Pokud je třeba minimální wrapper element v market UI komponentě, přidej ho.

## Scope OUT
- Plná balanc kalibrace (M9) — A4 je sanity, ne tuning.
- Nové budovy/mechaniky/obsah.
- Refaktor mimo dotčené funkce.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-005: A1 start seed
- [ ] T-006: A2 resolver hardening (Option A) + test
- [ ] T-007: A3 crime regress test
- [ ] T-008: A4 sanity-cap populace (denní sazba ÷364 + hard-cap)
- [ ] T-009: A5 market UI overflow

## Inputs (soubory / reference)
- `.aiworkflow/agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (ZÁVAZNÉ)
- `.aiworkflow/agents/reviewer/artifacts/final/review_architecture_iter-012_T-002.md` (kontext nálezů)
- `.aiworkflow/orchestration/decisions/DR-012-01_*.md`
- Kód: `src/core/state/createInitialState.js`, `src/core/state/createHomeState.js`, `src/save/load.js`, `src/core/resources/handlers.js`, `src/core/systems/health.js`, `src/core/systems/population.js`, `src/core/balance/balance.js`, `src/data/balance.json`, market UI + `styles.css`

## Acceptance Criteria
- `npm run ci` zelené (typecheck + lint:core + test). Existující testy závislé na prázdném startu aktualizovat na seedovaný start tam, kde to dává smysl (ne maskovat regrese).
- `npm run smoke` OK.
- Determinismus zachován (žádná změna RNG cest); save verze 3 beze změny tvaru.
- Nové/aktualizované testy: A2 resolver invariance, A3 crime no-throw, A4 denní sazba + sanity cap (populace po ≥1 herním roce v rozumných mezích), A1 fresh start pop/gold.
- Diff odpovídá schválenému návrhu; žádné scope-creep změny.

## Expected Outputs (cesty k souborům)
- Změny v `src/` (implementace).
- Stručný implementační souhrn: `.aiworkflow/agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md` (co změněno po oblastech, jaké testy přidány, výsledek `npm run ci`/`npm run smoke`).

## Risks / Constraints
- Zero-build PWA, žádné nové runtime závislosti do `src/`.
- Resolver je core (Option A měň minimálně, defensivně).
- NEcommituj sám — orchestrátor commitne po QA. Jen implementuj a zapiš souhrn.
