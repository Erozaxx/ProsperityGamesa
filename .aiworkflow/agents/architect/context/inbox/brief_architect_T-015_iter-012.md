# Brief

- **Brief ID**: BRIEF-012-015
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-13

## Goal
Rozhodnout **dotažení** fixu reload-determinismu. Tvé Option A (rebuild-on-load, T-013) je aplikované a korektní (G1 plný hashState zelený 16/16), ALE odhalilo hlubší preexistující díru. Rozhodni přístup k dotažení a identifikuj dopad na fixtures. Blocker před T-016 (coder).

## Context (ověřeno coderem experimentem)
Root cause hlubší vrstvy: `workforce.total=0` je **stale i na 1. ticku SPOJITÉHO simu**:
- `createInitialState` seeduje populaci (A1), ale `workforce.total` nedopočítá (= 0).
- `jobsAccidents` (quarterDay order 20) běží **před** `autoAssignWorkers` (order 30), a quarterDay edge nastává už na kroku 1 (`sid=0`).
- → Path A (kontinuální) vstupuje do kroku 1 s `workforce.total=0` → `jobsAccidents` přeskočí `rng.next()` na 'population'. Path B (load) má díky Option A správnou hodnotu → čerpá RNG → **desync** (jediné rozcházející pole: `rng.streams.population`).
- 2 preexistující testy (`test/app-bootstrap.test.js`, `test/export-string.test.js`) savnou/exportují na **`curStep=0`** → selhávají. Existují beze změny od iter-008; Option A je jen **odhalil** (dřív obě cesty bugově přeskakovaly → falešná shoda).
- **Důkaz codera**: aplikovat `deriveWorkforceTotal` i v Path A před krokem 1 → `hashA == hashB == 273280195` (shoda). Root cause jednoznačný.

Plný rozbor: **`agents/coder/artifacts/final/impl_summary_iter-012_T-014.md`** (povinné čtení).

## Scope IN — rozhodni mezi variantami
1. **Derive-on-init**: přepočítat `workforce.total` v `createInitialState` (přes existující `deriveWorkforceTotal` helper), aby spojitý sim vstupoval do kroku 1 s dopočítanou hodnotou (== load). Sjednotí obě cesty. **Mění hash fresh-simu** → posune dotčené golden fixtures (urči KTERÉ: bench fixtures? precache? jiné determinismus golden hashe?). Argument korektnosti: seedovaná osada (50 pop) MÁ mít workforce od kroku 1.
2. **Uznat testy jako křehké**: hra reálně nikdy nesavne na `curStep=0` (save jde až po boot+ticích). Posunout save-point v těch 2 testech za 1. quarterDay edge. Minimální, ale ponechává tick-1 stale `workforce.total` ve spojitém simu.
3. Reorder (Option C) — **už zamítnuto** v T-013, neuvažuj znovu.

## Posuď a doporuč
- Která varianta je **správnější** (ne jen průchozí)? Zdůvodni.
- U derive-on-init: **rozsah regenerace fixtures** — vyjmenuj konkrétní soubory/příkazy (`tools/gen-*`, precache, bench), a posuď riziko, že behavior-change rozbije další golden testy.
- **Doporuč, zda behavior-change eskalovat uživateli** před implementací (orchestrátor pak rozhodne o gate). Buď explicitní.

## Scope OUT
- Neimplementovat (coder T-016). Pouze rozhodnutí + design + identifikace fixtures.

## Inputs
- `agents/coder/artifacts/final/impl_summary_iter-012_T-014.md` (ZÁVAZNÉ — důkaz + 3 varianty)
- `orchestration/decisions/DR-012-02_*.md`, `agents/architect/artifacts/final/fix_reload_determinism_iter-012_T-013.md`
- Kód: `src/core/state/createInitialState.js`, `src/core/state/createHomeState.js`, `src/core/systems/jobs.js` (deriveWorkforceTotal), `test/app-bootstrap.test.js`, `test/export-string.test.js`, `tools/gen-precache.mjs`, `tools/bench-step.mjs`

## Acceptance Criteria
- DR-012-02 rozšířen: zvolená varianta dotažení + zdůvodnění + seznam fixtures k regeneraci + doporučení k user-gate. Status: decided-extended.
- Design pro T-016 dostatečně konkrétní (soubor, místo přepočtu, které fixtures regenerovat, jak ověřit plné `npm run ci`).
- Explicitní očekávaný cílový stav: plné `npm run ci` zelené (vč. app-bootstrap, export-string, iter005-edge G1, iter012-playability).

## Expected Outputs
- Aktualizovaný `orchestration/decisions/DR-012-02_*.md`.
- Design doc: `agents/architect/artifacts/final/fix_reload_determinism_complete_iter-012_T-015.md`.

## Risks / Constraints
- Determinismus core invariant; žádná nová nedeterministická cesta.
- Zero-build, žádné nové runtime závislosti.
- Pokud root cause sahá ještě dál, NEulet potichu — zapiš a eskaluj orchestrátorovi.
