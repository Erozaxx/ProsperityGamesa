# Brief

- **Brief ID**: BRIEF-015-001
- **Iteration**: iter-015 (M6 – Výzkum & tech strom)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-14

## Goal
Detailní implementační design **M6** (tech strom + techy jako modifikátory K13 plně + academy/university + UI) na úroveň, ze které Sonnet coder přímo implementuje. Drž schválenou architekturu iter-002 (D/K/§) — jen konkretizuješ. Design, ne kód.

## Stav repo (co reusneš)
- **Modifier vrstva K13** (`src/core/systems/buildings.js`): `effective(itemId, attr, state)`, `invalidateModifiers`, `addBuildingModifiers`, `recalcBuildingAggregates`, **`rebuildBuildingDerived(state)`** (sdílená re-derivace volaná z load Step 5 i mutací). Modifikátory žijí v `state.catalogState.modifiers`, save = jen modifikátory.
- **techPt** resource handler existuje (M4a) — `src/core/resources/handlers.js`.
- Registr efektů K14: `src/core/registry/effects.js`. Persist: `src/save/`. UI vzor: `src/ui/screens.js` (pure komponenty), `selectors.js`, taby v `App.js`.
- **`techs.json`** = jen approximated kostra (`_meta` + prázdné `techs`), gap **G-LISTTECHS** (z M1, odložen na M6).

## Zadání designu (master plán §3/iter-013(M6) T1–T4)
1. **T1 – Tech strom**: sektory + techy, cena `techCap`=`100×1.25^level` (čistá fn do `formulas.js`, vzorec DOLOŽITELNÝ z original_source_doc), `unlockedTechs` ve stavu (deterministické, persistované), `buyTech(techId)` command (validace prerekvizit + odečet `techPt` přes `pay`). Persist schéma (jen `unlockedTechs`/raw, ne derivované).
2. **T2 – Techy jako modifikátory K13 PLNĚ (kritické)**: tech efekty výhradně přes **stejnou modifier vrstvu** (`catalogState.modifiers`, source=`tech:<id>`), ne ad-hoc. **Generalizuj sdílenou re-derivaci**: dnešní `rebuildBuildingDerived` re-aplikuje jen budovy → navrhni jednu cestu (např. `rebuildDerived(state)` nebo přidání `addTechModifiers` do téhož rebuildu), která po loadu re-aplikuje **budovy I techy** foldem. **ŽÁDNÁ load-only ani tech-only větev** (třída bugu DR-012-02). Save = jen `unlockedTechs` + `catalogState.modifiers` (nikdy derivované). Tím se K13 uzavírá plně (dva zdroje modifikátorů: budovy + techy).
3. **T3 – Academy/university**: research progres (akumulace), `techPt` produkce (napojení na joby/efficiency a/nebo academy budovu), tick fáze dle tickOrder. Determinismus/catch-up-safe.
4. **T4 – UI academy/tech strom screen**: selektory (dostupné/odemčené techy, cena, prerekvizity, research progres) + buyTech command, tab. Žádná logika v UI.

## Povinná rozhodnutí
- **G-LISTTECHS**: techs.json je kostra. Navrhni postup — doložitelný vzorec (techCap) + **approximovaný tech strom** (sektory + techy + efekty jako modifikátory, provenance:'approximated', kalibrace M9). Min. hratelná sada techů pokrývající mechaniky (efekty na efficiency/produkci/kapacity přes modifikátory).
- **Split** M6 (ano/ne + kde) — posuď, zda T1–T4 souzní do jedné iterace.
- **Generalizace rebuild** (T2) — konkrétní návrh, jak sjednotit budovy+techy do jedné re-derivační cesty bez regrese M5-1 (round-trip identita budov musí zůstat).

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002. M7+ obsah.
- Determinismus/catch-up-safe je tvrdé omezení (žádný Date.now/Math.random/DOM v core, levné v dávce).

## Inputs
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-013(M6), §1.2)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.3 K13, §5.4 K14, §6 persist, §7.1 transakce)
- M5-1 design (modifier vrstva): `agents/architect/artifacts/final/design_iter-013_T-001.md`
- Kód: `src/core/systems/buildings.js` (modifier API + rebuildBuildingDerived), `src/core/resources/handlers.js` (techPt), `src/core/balance/formulas.js`, `src/save/load.js` (Step 5), `src/data/techs.json`, `doc/original_source_doc.md` (techCap vzorec, tech data)
- DR-013-00 (`context/refs/`)

## Acceptance Criteria
- Design pokrývá T1–T4 pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Jasná generalizace sdílené re-derivace (budovy+techy, jedna cesta, žádná load-only/tech-only větev).
- Persist schéma (jen unlockedTechs + modifikátory); G-LISTTECHS postup; split rozhodnutí.
- tickOrder dopady (academy research/techPt produkce) + diagram.
- Žádný rozpor s D/K/§; cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-015_T-001.md`

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + rozhodnutí o G-LISTTECHS + split>"`
- NEcommituj (git).
