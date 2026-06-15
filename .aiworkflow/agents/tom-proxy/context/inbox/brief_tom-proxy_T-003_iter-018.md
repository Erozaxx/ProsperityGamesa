# Brief

- **Brief ID**: BRIEF-018-003
- **Iteration**: iter-018 (M7b – Bitvy)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-15

## Goal
**Human gate**: schval (nebo vrať) M7b design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO-s-podmínkami, architekt M-1/M-2/M-3/F-1 zapracoval). Posuď **produktová rozhodnutí**. Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **Bitvy dokončují M7 (= AI svět + bitvy hotové)**: battle automat — hráčské bitvy live (battleCommand) + offline auto-resolve (stejný automat, G2). Invaze + bandité. → OK, že tím se pozdní hra (bitvy) rozjede a M7 je hotové?
2. **G2 auto-resolve == live (zdarma)**: bitvy se v offline catch-upu dohrají STEJNÝM automatem jako live (jen s obrannou AI místo hráčských commandů) — žádná druhá implementace, deterministické. → OK přístup (věrný + jednoduchý)?
3. **G-MILITARY-STATS — approximované combat staty**: player combat staty (strength/defense/critChance/cooldown) nejsou v dumpu → approximované z originálu, provenance flag, kalibrace M9. baseRevival taky approx (0.25 default). → Přijatelné (analogické předchozím G-LIST*)?
4. **battle.js stub naplněn 1:1 originálem**: damage/revival vzorce, cooldowny, AI reakce portovány 1:1 z originálu (vč. kuriozit jako dvojí dekrement cd) pro věrnost. → OK věrný port i s originálovými zvláštnostmi?

## Co NEřešit
- Technické detaily (serializovatelnost, rng počty, cd sekvence) — vyřešeno reviewerem + architektem.

## Inputs
- Design (revidovaný): `context/refs/design_iter-018.md` (changelog Revize T-002a, §6.1a baseRevival, §7.3 cd, §4 crit, §8.1a serializovatelnost)
- DR-018-01, DR-013-00 (`context/refs/`)
- Cíl: `zadani_projektu.md`, `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-018_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady>"`
- NEcommituj (git).
