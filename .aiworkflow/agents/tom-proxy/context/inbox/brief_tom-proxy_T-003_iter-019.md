# Brief

- **Brief ID**: BRIEF-019-003
- **Iteration**: iter-019 (M8 – Příběh & meta vrstva)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-15

## Goal
**Human gate**: schval (nebo vrať) M8 design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO bez podmínek). Posuď **produktová rozhodnutí** — zejm. **R-G licence** (vlastní texty), což je bod, který architektura explicitně směruje na uživatele. Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **M8 = poslední obsahová vrstva (před release M9)**: hra dostane začátek (intro/tutoriál), vedení hráče (story/importantEvent + acknowledge), meta-progres (achievementy), notifikace/gamelog. → OK, že tím se obsahová vrstva uzavře?
2. **R-G licence — VLASTNÍ/parafráze texty (DŮLEŽITÉ)**: intro/tutoriál/dialogy/achievement texty NEBUDOU 1:1 převzaty z originálu — vlastní znění/parafráze (provenance:'original-paraphrased'). Originál slouží jen jako struktura/triggery/IDs + číselná data (army prahy, gold = fakta). Reviewer (T-REV) ověří, že texty nejsou 1:1 kopie. → **Přijatelné dodat vlastní texty místo originálních?** (Pozn.: plné licenční rozhodnutí před VEŘEJNÝM vydáním je až M9b/iter-021 T3 — teď jde o přístup k textům M8.)
3. **Achievementy deklarativně (C4 fix)**: achievementy/story jako deklarativní predikáty (data), ne imperativní háčky rozseté po kódu (originál byl C4-vadný). → OK čistší věrný přístup?
4. **UI event bus efemérní**: notifikace/confetti/hudba jen prezentace mimo deterministický stav (engine nesahá na DOM). → OK?

## Co NEřešit
- Technické detaily (catch-up pauza, evalPredicate, effects stuby) — vyřešeno reviewerem + carry do coder briefů (DR-019-01).

## Inputs
- Design: `context/refs/design_iter-019.md` (T1 importantEvent, T2 intro/R-G, T3 achievementy K18, T4 UI bus)
- DR-019-01 (impl poznámky), DR-013-00 (`context/refs/`)
- Cíl: `zadani_projektu.md` (R-G/PROVENANCE), `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém). **Zejm. R-G** — pokud cítíš, že plná licenční otázka je nevratná/mimo mandát, eskaluj (jinak schval přístup vlastních textů pro M8 s tím, že finální licence je M9b).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-019_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady/R-G>"`
- NEcommituj (git).
