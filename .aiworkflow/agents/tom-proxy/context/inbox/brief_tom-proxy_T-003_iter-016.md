# Brief

- **Brief ID**: BRIEF-016-003
- **Iteration**: iter-016 (M7a-1 – Zóny, jednotky & napojení trhu)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-14

## Goal
**Human gate**: schval (nebo vrať) M7a-1 design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO-s-podmínkami, architekt M-1/M-2 zapracoval). Posuď **produktová rozhodnutí**. Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **Split M7a → M7a-1 (teď: zóny + jednotky + napojení trhu) + M7a-2 (frakční AI + revolty/questy/tribute + UI, iter-017)**. M7a-1 je hratelné/testovatelné bez frakční AI; AI svět "ožívá" plně až M7a-2. → OK rozdělit a dodat frakční AI v další iteraci?
2. **G-LISTZONE — approximovaný obsah zón**: originál fetchoval listZone za runtime (není v dumpu). Frakce/policies/AISTATES/vzorce DOLOŽITELNÉ z originálu world.js; konkrétní zóny (~13, topologie/stats) approximované, provenance:'approximated', kalibrace M9. → Přijatelné (analogické G-LISTTECHS/G-LISTBUILDINGS)?
3. **G-WORLD-DAYEDGE — vědomá odchylka**: originál tikal zóny per-step; M7a-1 je tiká na day-edge (day-index round-robin) kvůli ceně catch-upu (AI svět musí běžet levně v offline dávce). Chování ekvivalentní (každá zóna se zpracuje za periodu), jen hrubší granularita. → OK obětovat per-step granularitu za catch-up výkon?
4. **AI-AI bitvy vzorcem, ne plný automat**: bitvy mezi AI frakcemi se v M7a-2 vyřeší RNG vzorcem (rychlé, deterministické); plný battle automat (hráčské bitvy) je M7b/iter-018. → OK?

## Co NEřešit
- Technické detaily (day-index vzorec, hydrateZones, persist) — vyřešeno reviewerem + architektem.

## Inputs
- Design (revidovaný): `context/refs/design_iter-016.md` (changelog Revize T-002a, §2.1 round-robin, §8.1 re-hydratace, §16 odloženo M7a-2, G-LISTZONE, G-WORLD-DAYEDGE)
- DR-016-01, DR-013-00 (`context/refs/`)
- Cíl: `zadani_projektu.md`, `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-016_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady>"`
- NEcommituj (git).
