# Brief

- **Brief ID**: BRIEF-014-003
- **Iteration**: iter-014 (M5-2 – Kontrakty & build UI)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-14

## Goal
**Human gate**: schval (nebo vrať) M5-2 design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO-s-podmínkami T-002, architekt B1/B2/M1 zapracoval T-002a). Posuď **produktová rozhodnutí**, jak by je posoudil Tom (věrný hratelný rebuild, MVP-first, plynulost). Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **Contract data = doložitelná z originálu (events.js, 8 typů)**, M5-2 implementuje **minimální hratelnou sadu** (dodávkové kontrakty: dodej zboží do N dní → odměna), zbytek typů závisí na M6/M7. Gap **G-CONTRACTS-CATALOG** = informativní (Q3/DR-001), kalibrace M9. → Přijatelné dodat teď min. sadu a zbytek s pozdějšími milníky? (Analogické G-LISTBUILDINGS, které jsi schválil v iter-013.)
2. **B1 oprava — registerBuild dark code**: M5-1 build command nebyl wired do bootstrapu (stavba nebyla z appky dostupná). M5-2 to opravuje. → OK, že se latentní díra z M5-1 zaceluje teď (build se stává dostupný s build UI)?
3. **Build UI**: budovy/fronta/opravy/firmy + kontrakty panel se dostávají do hry (dokončení M5). → OK?
4. **G-BUILD-TXAUDIT zůstává** (stavební/contract výdaje zatím bez tx audit eventu; ctx se commandu nepředává). → Stále přijatelné odložit na M9?

## Co NEřešit
- Technické detaily (re-arm guard, SAVE_VERSION, determinismus) — vyřešeno reviewerem + architektem.

## Inputs
- Design (revidovaný): `context/refs/design_iter-014_T-001.md` (čti §14 Revize T-002a, contract sekce, build UI, G-CONTRACTS-CATALOG)
- DR-014-01 (`context/refs/`), DR-013-00/01
- Cíl: `zadani_projektu.md`, `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-014_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady>"`
- NEcommituj (git).
