# Iteration Plan: iter-014

- **Created**: 2026-06-14
- **Goal**: M5-2 – Kontrakty & build UI: contractQueue + onComplete/onExpire/onReject přes registr efektů (K14), kontraktové eventy přes schedule; UI build screen (karty budov, ceny se scalingem, fronta) + kontrakty panel. Dokončuje M5 (DoD M5 se vyhodnotí zde). Dle master plánu §3/iter-012(M5) T5/T6 + design iter-013 §13. Posun číslování viz DR-013-00/01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Detailní design M5-2 (navazuje na design_iter-013 §13 odloženo): (1) kontrakty – contractQueue struktura, onComplete/onExpire/onReject přes registr efektů K14 (string-ID+params v datech, ne imperativní háčky), kontraktové eventy přes schedule (serializovatelné, přežijí load), persist schéma; zdroj kontraktů z katalogu/originálu; (2) build UI – datový návrh build screen (karty budov, ceny se scalingem přes scaleCostByCount, fronta projektů, opravy) + kontrakty panel nad selektory/commandy. Determinismus/catch-up-safe; G-BUILD-TXAUDIT kontext. Výstup: design doc
- [ ] T-002: reviewer – Review designu M5-2 (K14 registr efektů korektně, kontrakty serializovatelné/deterministické, UI jen přes selektory/commands bez logiky v UI, soulad s architekturou)
- [ ] T-003: tom-proxy – Human gate: schválení M5-2 designu (zastupuje uživatele dle DR-013-00, mandát: auto-ano u gate v rámci scope)
- [ ] T-004: coder – T5: kontrakty – contractQueue, onComplete/onExpire/onReject přes registr efektů K14, kontraktové eventy přes schedule, persist + round-trip; balanc do balance.js
- [ ] T-005: coder – T6: build UI screen (karty budov, ceny scaling, fronta projektů, opravy, builder companies) + kontrakty panel; jen selektory + commands, žádná herní logika v UI
- [ ] T-006: tester – Test loop M5-2 + DoD M5 komplet (sada §1.3): kontrakty deterministické + round-trip (schedule přežije save/load), catch-up-safe, build UI smoke (render bez chyb), plné `npm run ci` + `npm run smoke`, determinismus G1 nedotčen
- [ ] T-007: reviewer – Review gate M5-2 + DoD M5: registr efektů bez imperativních háčků, kontrakty serializovatelné, UI bez logiky, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-008: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → DoD M5 hotovo

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-007
- [ ] QA validace (Tester) – T-006
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M5 komplet)
- Kontrakty běží: contractQueue, onComplete/onExpire/onReject přes registr efektů (K14), eventy přes schedule serializovatelné a deterministické.
- Build UI funkční: budovy se staví z UI (ceny se scalingem, fronta, opravy, firmy), kontrakty panel.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe nedotčen.
- Žádná herní logika v UI; derivovaná data se neukládají; registr efektů bez imperativních háčků.
- Reviewer GO. → **DoD M5 (město roste, stavby, kontrakty, modifikátory) kompletní.**

## Decisions Made This Iteration
- DR-013-00/01: split M5, posun číslování, autonomní doběh.

## Retrospective Notes
- Vstup: master plán §3/iter-012(M5) T5/T6, design iter-013 §13 (odloženo M5-2), architektura §5.4 (K14 registr efektů), §8 kontrakty.
- M5-1 (iter-013) dodalo budovy/builder/companies/modifikátory; M5-2 uzavírá M5 kontrakty + UI.
