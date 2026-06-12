# Brief

- **Brief ID**: BRIEF-004
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Provést micro-rework analýz dle review T-003: redakční přesnost citací (F1–F3) a doplnění dvou mezer (G1, G2) jako explicitní návrhové poznámky.

## Context
Reviewer (T-003) dal verdikt GO s úpravami – 0 blockerů. Uživatel si přesto přeje zapracovat
drobné úpravy do analýz, než schválí (T-005). Jde o malý, fokusovaný zásah do existujících
artefaktů (ne nová analýza). Plné nálezy: `agents/reviewer/artifacts/final/review_iter-001_T-003.md`
§2 (G1/G2) a §5 (F1–F4).

## Scope IN (přesně tyto úpravy)
- **F1** – v T-002a (A6) / T-002b (B5) upřesnit, že `Engine.curStep` je **service-level undefined**,
  zatímco `$rootScope.engine.curStep` existuje a funguje (proto si služby den počítají lokálně).
- **F2** – v T-002a (A8/B1) opravit citaci signatury `Game.save`: skutečná definice je
  `save: function(callback)` (game.js ř. 112); `game.save(true, null, $rootScope.curGameSave)` je
  volání z `autoSave` (ř. 45), funkce extra argumenty ignoruje. Substance (server-only, deep copy,
  dead loop, logy v savu) zůstává.
- **F3** – v T-002a (C2) ponechat explicitně, že precedence bug `/market` je na **ř. 25** (volání),
  ne uvnitř `getUpdatedData` (ř. 263+).
- **G1** – doplnit do T-002a (sekce save/offline nebo prioritního seznamu) explicitní návrhové
  rozhodnutí: **seedovatelný/serializovatelný RNG** (originál `Math.random()` + `services/rand.js`)
  jako předpoklad reprodukovatelného offline catch-upu a testovatelnosti vzorců. Priorita Med.
- **G2** – v T-002a (a/nebo T-002b) propojit, že **bitvy během catch-upu** (auto-resolve) jsou
  přirozeným důsledkem bitvy jako serializovatelného deterministického automatu na jednotném
  časovém zdroji (sjednoceno v konsolidované položce K7/K8 review). Priorita Med.
- Drobnost: zmínit `services/rand.js` (souvisí s G1) tam, kde to dává smysl.

## Scope OUT
- Žádná nová analýza ani re-strukturace artefaktů; jen cílené edity výše.
- Neřeš F4 (už vyřešeno v konsolidaci review K7/K8). Neměň konsolidovaný seznam reviewera.
- Žádná implementace herního kódu.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-004: Zapracovat F1–F3 + G1, G2 do existujících analýz; zapsat rework note.

## Inputs (soubory / reference)
- `agents/reviewer/artifacts/final/review_iter-001_T-003.md` (§2, §5 – přesné znění).
- `agents/architect/artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md` (edit).
- `agents/architect/artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md` (edit).
- Pro ověření citací: `doc/original_source/modules/prosperity/services/` (game.js, market.js).

## Acceptance Criteria
- F1, F2, F3 zapracovány do příslušných artefaktů (přesné citace/řádky).
- G1 (seedovatelný RNG) a G2 (bitvy v catch-upu) doplněny jako explicitní návrhové poznámky.
- Krátká **rework note** shrnující, co bylo změněno a kde.
- Žádná změna mimo Scope IN; konsolidovaný seznam reviewera nedotčen.

## Expected Outputs (cesty k souborům)
- Upravené: `analysis_refactoring_perf-offline_iter-001_T-002a.md`, `analysis_refactoring_maintainability_iter-001_T-002b.md`
- Nový: `agents/architect/artifacts/final/rework_iter-001_T-004.md` (rework note)

## Risks / Constraints
- Malý zásah – nezačni přepisovat celé analýzy. Drž se seznamu F1–F3, G1, G2.
- Model: **Fable**. Krátký fokusovaný běh.
