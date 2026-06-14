# Brief

- **Brief ID**: BRIEF-013-002a
- **Iteration**: iter-013 (M5-1 – Budovy & modifikátory)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-14

## Goal
Revize tvého designu `design_iter-013_T-001.md` – zapracuj **4 major podmínky** z reviewer gate (T-002, GO-s-podmínkami) a **zúž design na M5-1 scope (T1–T4)**. Split potvrzen (DR-013-01): kontrakty (T5) + build UI (T6) jdou do M5-2/iter-014, z tohoto designu je vyřaď (nebo přesuň do sekce "Odloženo na M5-2"). Stále design, ne kód.

## Zapracuj tyto podmínky (z review T-002)
1. **M-2 (major) – sdílený rebuild, žádná load-only větev**: Dnešní `load.js` Step 5 počítá JEN `workforce.total` (DR-012-02), ne obecný recalc. Zaveď v designu **jednu sdílenou funkci `rebuildBuildingDerived(state)`** (fold modifikátorů + agregáty + `created===instances.length` re-derivace), kterou volá **load (Step 5) I každá mutace budov** (build complete / destroy / repair). Explicitně zakázat load-only derivační větev. Je to stejná třída bugu jako reload-determinismus sága (DR-012-02) — drž single source of truth.
2. **M-1 (major) – effects→modifier mapování + jedna cesta agregátů**: Doplň konkrétní pravidlo, jak se `building.effects` (z katalogu) mapují na modifikátory: typy op (add/mul/set), mapové atributy (např. per-resource kapacity), per-instance vs. per-typ, deterministické generování `modifier.id` a `modifier.source`. A **sjednoť agregáty na JEDNU cestu** — v T-001 jsou dvě (modifikátory v §4.3 vs. `created × effective` v §4.4), což hrozí dvojím započtením. Rozhodni jednu kanonickou cestu a druhou odstraň.
3. **M-3 (major) – deterministický fold**: fold "set" (a celkově pořadí aplikace) musí být deterministicky řazený podle `source` (string-ID), ne podle pořadí vložení do objektu. Popiš řazení.
4. **M-4 (major→akceptováno jako gap)**: `build` command bez `ctx` → `pay` bez `emitTx` audit. Zaznamenej jako vědomý gap **G-BUILD-TXAUDIT** (dořeší se M5-2/M9), v designu zmínit, neimplementovat audit teď. Pokud jde snadno předat ctx do build commandu pro emitTx, navrhni to (preferováno), jinak gap.

Minor/nit (5+3) z review zapracuj dle uvážení (kde zvyšují kvalitu bez scope creepu).

## Scope M5-1 (co design po revizi pokrývá)
- **T1**: building instances {created, totalMade, instances:[{instId, hp, inRepair}]}, ageBuildings (day) opotřebení, opravy (repair-projekty, getGoldValue), persist schéma, `created===instances.length` re-derivace.
- **T2**: projectQueue + builder (quarterDay slot) + `build(itemId)` command + `scaleCostByCount(base, created, factor)` (formulas.js, default factor=1.0 = věrné originálu, gap G-BUILD-COSTSCALE).
- **T3**: builder companies (companies.json struktura + výběr/kapacity) + doplnění buildings.json ≥6 budov (G-LISTBUILDINGS, provenance:'approximated').
- **T4 (L, 6 kroků)**: modifier vrstva K13 — viz M-1/M-2/M-3 výše. Ověř/uprav dekompozici T4.1–T4.6 tak, aby reflektovala sdílený rebuildBuildingDerived a jednu cestu agregátů.

## Scope OUT
- T5 (kontrakty), T6 (build UI) → přesun do sekce "Odloženo na M5-2/iter-014" (jen krátká poznámka, ne plný design — ten udělá architekt v iter-014).
- Žádný kód, žádná změna architektury iter-002.

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-013_T-001.md`
- Review (4 major + minor/nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-013_T-002.md`
- DR-013-01 (`context/refs/`)
- Architektura §5.3/§5.4/§6, `src/save/load.js` (Step 5 DR-012-02), `src/save/persistSchema.js` (catalogState/modifiers), `src/core/registry/effects.js`

## Acceptance Criteria
- Všechny 4 major podmínky explicitně vyřešeny v designu (M-1, M-2, M-3, M-4).
- Jedna kanonická cesta agregátů; sdílený rebuildBuildingDerived volaný z load i mutací.
- Design zúžen na M5-1 (T1–T4); T5/T6 jen odloženo.
- T4 dekompozice aktualizovaná, Sonnet-proveditelná.

## Expected Outputs
- Aktualizuj `agents/architect/artifacts/final/design_iter-013_T-001.md` (in-place revize; přidej changelog sekci "Revize T-002a: …") NEBO nový `design_iter-013_T-002a.md` — zvol jedno a uveď v handoffu které je platné.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny 4 major + který doc je platný>"`
- NEcommituj (git).
