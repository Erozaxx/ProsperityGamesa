# Brief

- **Brief ID**: BRIEF-013-007
- **Iteration**: iter-013 (M5-1)
- **Task**: T-007 = T4 (L, 6 kroků) — modifier vrstva K13 pro budovy
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T4** dle designu §4.1–4.8 (kroky T4.1–T4.6): plnou vrstvu modifikátorů z budov (K13). Tím **nahradíš stuby** z T1/T2 (`effective` base-only, `addBuildingModifiers`/`removeBuildingModifiers`/`invalidateModifiers` no-op, `recalcBuildingAggregates` čte base katalog, `effectFromCatalog` workaround z T2) plnou implementací. Design je source of truth — toto je nejcitlivější task iterace, drž invarianty doslova.

## ⚠️ Tvrdé invarianty (review gate je bude ověřovat — NEPORUŠ)
1. **Save = JEN seznam modifikátorů** (`catalogState.modifiers`). NIKDY neukládej derivované hodnoty (`effective`, agregáty `home.derived`, `_effCache`, `_modVersion`). Tyto se po loadu PŘEPOČÍTAJÍ.
2. **Sdílený `rebuildBuildingDerived(state)`** je JEDINÁ cesta re-derivace — volá se z **load Step 5 I z každé mutace budov** (`completeBuild`/`destroyInstance`/`applyRepair`/`buyCompany`). ŽÁDNÁ load-only ani mutation-only větev foldu/agregátů. (Toto je přesně třída bugu z determinismus ságy DR-012-02 — single source of truth.)
3. **Deterministický fold**: před aplikací `sort by (source, id)` lexikograficky; `set` bere POSLEDNÍ po sortu (ne insertion order). Pořadí op: add→mul→set. Žádná závislost na pořadí klíčů v objektu.
4. **JEDNA kanonická cesta agregátů**: `Σ effective(id, attr)` BEZ násobení `created` (multiplicita je zapečená do `modifier.value` přes `value=created` dle §4.3). Žádné dvojí započtení.
5. Žádný Date.now/Math.random/DOM v core; catch-up-safe (fold levný v dávce, memoizace přes `_modVersion`).

## Scope IN (T4.1–T4.6 dle designu)
- **T4.1**: `effective(itemId, attr, state)` + `fold` s deterministickým `sort by (source,id)` (M-3), dot-path pro mapové attr.
- **T4.2**: memoizace `_effCache`/`_modVersion` (neperzistentní `_`-prefix) + `invalidateModifiers`.
- **T4.3**: `addBuildingModifiers`/`removeBuildingModifiers` dle §4.3 — per-TYP modifikátor `id=bld:${buildingId}:${attr}:${op}`, `source=building:${buildingId}`, multiplicita `created` zapečená do `value`. Mapování `building.effects → modifier` (op add/mul/set z dat).
- **T4.4**: `recalcBuildingAggregates` JEDNA cesta `Σ effective` bez ×created → `home.derived` (maxWorkers, kapacity skladů, attractiveness).
- **T4.5**: napojení agregátů na spotřebitele dle designu: `jobs.workerSlots` (maxWorkers), `housing`/`settlementLevel`, sklady; **G-BUILDER-MASON** (`masonProvided` z firem → `maxActiveProjects`) napoj zde dle designu. Ověř integrační body za běhu.
- **T4.6**: sdílený `rebuildBuildingDerived` (created re-derivace + re-gen building modifikátorů idempotentně + `recalcBuildingAggregates`) volaný z load Step 5 i všech mutací; persist zůstává jen `catalogState.modifiers` (+ payload grep test že derivované není v payloadu).

## Scope OUT
- kontrakty, build UI = M5-2. Žádný nový gameplay mimo modifikátory.
- Neměň architekturu iter-002.

## Gate (Definition of Done) — přísný
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy:
  - `effective`/fold tabulkové (add→mul→set, deterministický sort, 2× `set` různého source → poslední po sortu).
  - **Modifikátory round-trip = IDENTITA**: nová hra → mutace (build/buy) → snapshot stavu; save→load → `rebuildBuildingDerived` → stav **bitově identický** (hashState) s před-save. Klíčový test (chrání invariant 1+2).
  - Agregáty: build budovy s `maxWorkers` efektem → `home.derived.maxWorkers` správně; `created`× = NEdvojí započtení.
  - G-BUILDER-MASON: owned firma s `masonProvided` → `maxActiveProjects` navýšen.
  - payload grep: `applyPersist(state)` NEobsahuje `derived`/`_effCache`/`_modVersion`/`effective`.
- `npm run smoke` OK.
- **Determinismus G1** (iter005-edge) + plný hashState round-trip nedotčen.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-013_T-001.md` §4.1–4.8 (T4.1–T4.6), §4.3 mapování, §4.6/§4.7 rebuild+mutace
- DR-013-01 (M-1/M-2/M-3 podmínky), DR-012-02 (precedens determinismus single source of truth)
- Kód: `src/core/systems/buildings.js` (stuby effective/addBuildingModifiers/recalcBuildingAggregates/rebuildBuildingDerived/effectFromCatalog), `src/save/load.js` (Step 5), `src/save/persistSchema.js` (catalogState/modifiers), `src/core/systems/jobs.js` (workerSlots), `src/core/systems/housing.js`, `src/core/commands/buyCompany.js` (companyBuildersTotal/masonProvided)
- Předchozí summaries T-004/T-005/T-006

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-013_T-007.md` (soubor:funkce, gate výstup, jak ověřena identita round-trip, vyřešené gapy: G-BUILDER-MASON aj.)
- `bash agents/coder/scripts/handoff-out.sh T-007 "<stručně + gate výsledek>"`
- NEcommituj (git).
