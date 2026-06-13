# Brief

- **Brief ID**: BRIEF-012-017
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-06-13

## Goal
Opravit 2 minor nálezy z code review T-011 (F-1, F-2). Schváleno uživatelem jako poslední úprava před uzavřením iterace. Malé, lokalizované, s přesným návrhem. NErozšiřuj scope mimo níže uvedené.

## Kontext (proč)
A4 sanity-cap (T-008) má zabránit explozivnímu růstu populace. Architektura **R-A4-3** říká: *existující savy s již „explodovanou" populací (nad capem) zůstanou — jen DALŠÍ růst se zastropuje* (cap se nesmí aplikovat retroaktivně jako shrink). Migrace (`populationMigration`) i porody (`healthBirths`) dnes ale clampují **celkový** total na `sanityCap`, takže loaded over-cap save se při prvním porodu/migraci stáhne dolů k capu → formálně porušuje R-A4-3.

## Scope IN (přesně tyto změny)

### F-1 — neredukovat už-over-cap loaded total (v OBOU systémech, ať jsou konzistentní)
Cap smí zabránit jen NOVÉMU překročení; nikdy nesnižovat total, který už je nad capem.

1. `src/core/systems/health.js`, fce `healthBirths` (~ř. 51-57):
   - Dnes: `const newTotal = Math.min(pop + actualBorn, sanityCap);`
   - Změň na guard: pokud `pop >= sanityCap`, ponech `pop` (žádný porod nad cap, ale ani shrink); jinak `Math.min(pop + actualBorn, sanityCap)`.
   - `bornTotal` přičítej jen skutečně přidané (`Math.max(0, newTotal - pop)`), jak už dělá.

2. `src/core/systems/population.js`, fce `populationMigration` (~ř. 88-94):
   - Dnes: `state.home.population.total = Math.max(0, Math.min(pop + actualAdd, sanityCap));`
   - Aplikuj stejný guard: když `pop >= sanityCap`, ponech `pop` (migrace nepřidává nad cap a NEsnižuje over-cap total); jinak `Math.min(pop + actualAdd, sanityCap)`.
   - `actualAdd` je už 0 při over-capacity (limit záporný) — guard řeší jen ten zbylý shrink z `min(pop, sanityCap)`.

### F-2 — reuse helper (odstranit inline duplikaci)
- V `src/core/systems/health.js` se počítá `Math.max(capacity, BALANCE.population.sanityMaxPop)` inline (~ř. 52). Tentýž výraz je už exportovaný jako `populationSanityCap(housingCapacity)` v `src/core/systems/population.js:29` a migrace ho používá.
- Importuj a použij `populationSanityCap(capacity)` i v `healthBirths`. Jediná definice capu.

## Scope OUT
- F-3..F-7 (nity, mrtvý `_catalog` param atd.) → backlog, NEsahej.
- Žádné jiné refaktory, žádné změny RNG cest ani save tvaru.
- Determinismus invariant (deriveWorkforceTotal, G1) se NESMÍ dotknout — tyto změny jsou mimo RNG i mimo derivaci workforce.total.

## Testy (povinné)
- Přidej regress test (rozšiř `test/iter012-playability.test.js` nebo `test/population.test.js`): loaded/nastartovaný stav s `population.total` NAD `sanityCap` → po `healthBirths` i po `populationMigration` total **neklesne** pod původní hodnotu (a nezvýší se nad cap). Pokud je sanityMaxPop=10000 nepraktické, můžeš test postavit s malou housing capacity tak, aby `sanityCap` byl nízký, NEBO dočasně přes BALANCE override — drž se vzoru existujících testů v souboru.
- Ověř, že stávající A4 testy (denní sazba /364, hard-cap zastaví růst zdola) dál procházejí.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (typecheck + lint:core + test, 0 fail) — uveď počet testů.
- `npm run smoke` OK (exit 0).
- Determinismus nedotčen: iter005-edge G1 + iter012-playability dál zelené.
- Pokud měníš zdroj tak, že to ovlivní precache, regeneruj `node tools/gen-precache.mjs` a přilož čistý diff (jen PRECACHE_VERSION). Pokud ne, nesahej na precache.

## Inputs
- Code review: `agents/reviewer/artifacts/final/code_review_iter-012_T-011.md` (F-1, F-2 detail)
- Architektura R-A4: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md`
- Kód: `src/core/systems/health.js`, `src/core/systems/population.js` (helper `populationSanityCap` ř. 29)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-012_T-017.md` (co změněno + gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-017 "<stručně + gate výsledek>"`
- NEcommituj (git) — commit dělá orchestrátor po ověření.
