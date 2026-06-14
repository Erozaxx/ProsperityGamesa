# Iteration Plan: iter-013

- **Created**: 2026-06-13
- **Goal**: M5 – Budovy, stavba, kontrakty: město roste – building instances + opotřebení/opravy, projectQueue/builder (quarterDay slot z M3), scaleCost, builder companies, vrstva modifikátorů z budov (K13), kontraktové eventy. Dle master plánu §3/iter-012(M5). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Detailní design M5 hotový (design_iter-013_T-001.md). Stav budov {created,totalMade,instances}; scaleCost = approximated addice (originál neškáluje, default faithful, gap G-BUILD-COSTSCALE); modifier fold K13 (save=jen modifikátory, T4 dekomponován na 6 kroků); kontrakty přes registr K14; doporučuje SPLIT M5-1(T1–T4)/M5-2(T5–T6); G-LISTBUILDINGS → doplnit ≥6 budov approximated. [orig. brief] Detailní design M5 dle master plánu §3/iter-012(M5) + architektury §5.3 (modifier vrstva K13), §5.4 (registr efektů K14): (1) building instances created/totalMade + opotřebení (ageBuildings, day) + opravy (oceňování getGoldValue) + persist schéma; (2) projectQueue + builder systém (quarterDay slot) + `build(itemId)` command + `scaleCost(base, created)` čistá fn; (3) builder companies (katalog + logika výběru/kapacit); (4) modifier vrstva plně pro budovy: `effective(itemId, attr)`, fold add→mul→set, memoizace + event-driven agregáty, save = jen seznam modifikátorů; (5) kontrakty: contractQueue, onComplete/onExpire/onReject přes registr efektů, eventy přes schedule. Rozhodnout split M5-1(T1–T4)/M5-2(T5–T6). Výstup: design doc + tickOrder/diagram dopady
- [ ] T-002: reviewer – Review designu M5 (correctness, soulad s architekturou D/K, kontrakty §8, žádné in-place applyUpgrade mutace, derivovaná data se neukládají) + challenger oponentura rizik
- [ ] T-003: tom-proxy – Human gate: schválení architektury M5 (zastupuje uživatele dle DR-013-00)
- [ ] T-004: coder – T1: building instances (created/totalMade), ageBuildings (day) opotřebení + opravy (getGoldValue), persist schéma budov; balanc čísla do balance.js
- [ ] T-005: coder – T2: projectQueue + builder systém (quarterDay) + `build(itemId)` command + `scaleCost(base, created)` čistá fn (formulas.js) + tabulkové testy scaleCost
- [ ] T-006: coder – T3: builder companies (katalogová data + logika výběru/kapacit)
- [ ] T-007: coder – T4 (L): modifier vrstva plně pro budovy (K13): `effective(itemId, attr)`, fold add→mul→set, memoizace + event-driven agregáty (maxWorkers, kapacity, attractiveness), save = jen seznam modifikátorů, re-aplikace po loadu
- [ ] T-008: coder – T5: kontrakty – contractQueue, onComplete/onExpire/onReject přes registr efektů (K14), kontraktové eventy přes schedule + persist
- [ ] T-009: coder – T6: UI build screen (karty budov, ceny se scalingem, fronta) + kontrakty panel
- [ ] T-010: tester – Test loop (sada §1.3): scaleCost/effective tabulkové testy, modifikátory round-trip (save jen modifikátory → load → přepočet), catch-up-safe invariant nových systémů, persist round-trip, PWA smoke, plné `npm run ci` + `npm run smoke`
- [ ] T-011: reviewer – Review gate M5: DoD bod po bodu, žádné `applyUpgrade` in-place mutace, derivovaná data se neukládají, tickOrder+diagram aktuální ve stejných commitech (právo re-run)
- [ ] T-012: human – Schválení uzavření iterace (zastupuje tom-proxy dle DR-013-00) → /close-iteration + PR + merge

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-011
- [ ] QA validace (Tester) – T-010
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M5)
- Město roste: stavby mají scaling cen (scaleCost) a opotřebení (ageBuildings + opravy), kontrakty běží, modifikátory čistě (fold, save=jen modifikátory).
- `npm run ci` zelené, `npm run smoke` OK, determinismus + catch-up-safe nedotčen.
- Žádné in-place `applyUpgrade` mutace; derivovaná data se neukládají.
- Reviewer GO.

## Decisions Made This Iteration
- DR-013-00: posun číslování M5–M9 (+1) + autonomní doběh; tom-proxy zastupuje human gaty.

## Retrospective Notes
- Vstup: master plán iter-003 §3/iter-012(M5), architektura iter-002 §5.3 (K13 modifikátory), §5.4 (K14 registr efektů), §8 kontrakty.
- Split-trigger (master plán): pokud T4(modifikátory)+T5(kontrakty) nesouzní do jedné iterace → split M5-1(T1–T4)/M5-2(T5–T6).
