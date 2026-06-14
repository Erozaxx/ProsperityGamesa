# Brief

- **Brief ID**: BRIEF-013-003
- **Iteration**: iter-013 (M5-1 – Budovy & modifikátory)
- **From**: Orchestrator
- **To**: tom-proxy (human gate – zastupuješ uživatele Toma)
- **Date**: 2026-06-14

## Goal
**Human gate**: schval (nebo vrať) M5-1 design jménem uživatele Toma PŘED zahájením implementace. Uživatel pověřil workflow autonomním doběhem master plánu (DR-013-00) a delegoval human gaty na tebe. NEděláš technický review (ten už proběhl: reviewer GO-s-podmínkami T-002, architekt podmínky zapracoval T-002a). Tvůj úkol je posoudit **produktová rozhodnutí a kompromisy** tak, jak by je posoudil Tom: slouží to cíli „věrný, hratelný rebuild Prosperity"? Jsou akceptované kompromisy přijatelné?

## Klíčová rozhodnutí ke schválení (na co by se Tom díval)
1. **scaleCost aproximace**: Architekt zjistil, že originál budovy NEškáluje cenu podle počtu postavených. Návrh zavádí `scaleCostByCount` s **default factor=1.0 = věrné originálu** (žádný per-count růst), volitelně laditelné v M9. Gap G-BUILD-COSTSCALE. → Přijatelné, že budovy zatím nezdražují s počtem (věrnost > herní progrese, kalibrace později)?
2. **G-LISTBUILDINGS**: katalog budov je neúplný (originál fetchoval listBuildings za runtime, není v dumpu). Návrh: doplnit ≥6 budov s `provenance:'approximated'`, kalibrace M9. → OK postupovat s aproximovanými budovami (dle Q3/DR-001 = autonomně, informativně)?
3. **G-BUILD-TXAUDIT**: stavba odečte zdroje, ale (zatím) negeneruje transakční audit event (ctx se commandu nepředává; předání by změnilo command vrstvu architektury). Odloženo na M5-2/M9. → Přijatelné, že stavební výdaje zatím nejsou v měsíčním finančním reportu?
4. **Split M5 → M5-1 (teď) + M5-2 (kontrakty + build UI, iter-014)**: M5-1 je hratelné přes commandy/testy, plný build screen až M5-2. → OK rozdělit a dodat budovy v UI až v další iteraci?

## Co NEřešit
- Technické detaily foldu/persist/determinismu (vyřešeno reviewerem + architektem).
- Implementaci.

## Inputs
- Design (po revizi): `context/refs/design_iter-013_T-001.md` (čti zejm. changelog "Revize T-002a", §2.3 G-BUILD-TXAUDIT, §4.x scaleCost/modifikátory, §13 odloženo M5-2)
- DR-013-00 (autonomní doběh), DR-013-01 (split + podmínky) – `context/refs/`
- Cíl projektu: `zadani_projektu.md` (acceptance criteria), `project/done-criteria.md`

## Acceptance Criteria
- Explicitní verdikt: **SCHVÁLENO** (proceed na implementaci M5-1) / **SCHVÁLENO s výhradou** (uveď výhradu jako poznámku pro implementaci/M9) / **VRÁceno** (uveď co přepracovat – jen pokud něco zásadně odporuje cíli projektu).
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s poznámkou / problém).
- Drž se ducha uživatele: chce věrný, hratelný rebuild; kalibrace a polish jsou plánované na M9; nechce blokovat postup na detailech, které jdou doladit později.

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-013_T-003.md` (verdikt + stanoviska).

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + případné výhrady>"`
- NEcommituj (git).
