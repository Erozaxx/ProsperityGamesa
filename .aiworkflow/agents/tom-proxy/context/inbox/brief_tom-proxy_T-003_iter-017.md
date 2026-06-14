# Brief

- **Brief ID**: BRIEF-017-003
- **Iteration**: iter-017 (M7a-2 – Frakční AI & svět ožívá)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-15

## Goal
**Human gate**: schval (nebo vrať) M7a-2 design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO-s-podmínkami, architekt M-1/M-2/m-4 zapracoval). Posuď **produktová rozhodnutí**. Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **Svět plně ožívá (M7a-2 dokončuje M7a)**: frakce mění politiky a útočí (AISTATES processAI z originálu 1:1), revolty/questy/tribute běží, AI-AI bitvy vzorcem. → OK, že tím se AI svět rozjede naplno?
2. **favour migrace number→objekt** (G-FAVOUR-SHAPE): M7a-1 dočasně modeloval favour jako number; originál je objekt `{factionId:number}`. M7a-2 to opravuje na věrný tvar (deterministická nedestruktivní migrace, M7a-1 revolt nebyl aktivní). → OK opravit datový model na originálovou věrnost?
3. **AI-AI bitvy vzorcem, ne plný automat**: bitvy mezi AI frakcemi se řeší RNG vzorcem (rychlé/deterministické); plný battle automat hráčských bitev je M7b/iter-018. → OK?
4. **Approximace** (G-CAPITAL-MISMATCH: capital přes katalog ne orig hardcode; quest gating přes existující pole místo neexistujících orig polí): věrnost mechanik zachována, drobné odchylky kalibrace M9. → Přijatelné?

## Co NEřešit
- Technické detaily (self-rearm guard, migrateFavour, per-faction guard) — vyřešeno reviewerem + architektem.

## Inputs
- Design (revidovaný): `context/refs/design_iter-017.md` (changelog Revize T-002a, §3.1 favour migrace, §2.4 armFactionAI, §5.1 quest gating)
- DR-017-01, DR-016-01, DR-013-00 (`context/refs/`)
- Cíl: `zadani_projektu.md`, `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-017_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady>"`
- NEcommituj (git).
