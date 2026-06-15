# Brief

- **Brief ID**: BRIEF-021-003
- **Iteration**: iter-021 (M9b – Release kandidát)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-15

## Goal
**Human gate M9b DESIGN**: schval (nebo vrať) přístup k release kandidátu jménem uživatele PŘED implementací. Reviewer GO-s-podmínkami (0 blocker/0 major). Posuď produktová rozhodnutí (mobile UX scope, PWA audit scope, **PROVENANCE/licence PŘÍSTUP**). 

⚠️ **DŮLEŽITÉ rozlišení**: Tady schvaluješ jen **PŘÍSTUP** (vlastní assety/texty, PROVENANCE metodika, doporučení licence). **Finální licenční ROZHODNUTÍ** (volba konkrétní licence před veřejným vydáním) je **nevratné/právní → NEROZHODUJ ho, eskaluje se skutečnému uživateli v T-008** (release gate). Tvůj mandát: auto-ano u design gate v rámci scope; nevratné/právní eskaluj.

## Klíčová produktová rozhodnutí
1. **Mobile UX scope**: touch ≥44px, 0 horizontal overflow, render ≤15/s (oprava render.js ~60/s = §3.4 fix), iOS Safari (100dvh/safe-area). → OK jako release-quality mobilní polish?
2. **PWA audit scope**: evikce R-F (export reminder >7 dní), SW update flow (message-driven, save přežije), offline edge (install iOS/Android). → OK jako finální PWA audit?
3. **PROVENANCE/licence PŘÍSTUP (NE finální rozhodnutí)**: assety/jména/texty vlastní/parafráze (M8 už verbatim=0), PROVENANCE.md evidence, audit-provenance.mjs gate. Doporučení architekta = MIT+disclaimer (alt GPL-3.0/proprietární). **Přijatelný PŘÍSTUP?** (Finální volba licence = user gate T-008.)
4. **Vědomé**: README zastaralý → přepis; known issues do release docs (carry-over gapy).

## Co NEřešit / eskalovat
- **Finální licence = NEROZHODUJ** (T-008 user gate).
- Technické podmínky (MINOR-1/2/3 render test/precache sekvence/G1) — vyřešeno reviewerem (DR-021-01).

## Inputs
- Design: `context/refs/design_iter-021_T-001.md`, DR-021-01 (`context/refs/`)
- Zadání: `zadani_projektu.md` (PROVENANCE/licence ř.32/52), `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / s výhradou / VRÁceno (pro DESIGN přístup).
- Stanovisko k mobile UX + PWA scope + **PROVENANCE/licence přístup**.
- Explicitně potvrď, že finální licence je eskalována na T-008 (ne rozhodnuta teď).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-021_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + licence eskalace T-008>"`
- NEcommituj (git).
