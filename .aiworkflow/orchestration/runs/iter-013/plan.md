# Iteration Plan: iter-013

- **Created**: 2026-06-13
- **Goal**: M5-1 – Budovy & modifikátory: building instances + opotřebení/opravy, projectQueue/builder (quarterDay slot z M3), scaleCost, builder companies, vrstva modifikátorů z budov (K13). Kontrakty + build UI (T5–T6) jsou M5-2/iter-014 (split dle DR-013-01). Dle master plánu §3/iter-012(M5). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Detailní design M5 hotový (design_iter-013_T-001.md). Stav budov {created,totalMade,instances}; scaleCost = approximated addice (originál neškáluje, default faithful, gap G-BUILD-COSTSCALE); modifier fold K13 (save=jen modifikátory, T4 dekomponován na 6 kroků); kontrakty přes registr K14; doporučuje SPLIT M5-1(T1–T4)/M5-2(T5–T6); G-LISTBUILDINGS → doplnit ≥6 budov approximated. [orig. brief] Detailní design M5 dle master plánu §3/iter-012(M5) + architektury §5.3 (modifier vrstva K13), §5.4 (registr efektů K14): (1) building instances created/totalMade + opotřebení (ageBuildings, day) + opravy (oceňování getGoldValue) + persist schéma; (2) projectQueue + builder systém (quarterDay slot) + `build(itemId)` command + `scaleCost(base, created)` čistá fn; (3) builder companies (katalog + logika výběru/kapacit); (4) modifier vrstva plně pro budovy: `effective(itemId, attr)`, fold add→mul→set, memoizace + event-driven agregáty, save = jen seznam modifikátorů; (5) kontrakty: contractQueue, onComplete/onExpire/onReject přes registr efektů, eventy přes schedule. Rozhodnout split M5-1(T1–T4)/M5-2(T5–T6). Výstup: design doc + tickOrder/diagram dopady
- [x] T-002: reviewer – Review designu M5: GO-s-podmínkami; split ANO (M5-1/M5-2); 0 blocker/4 major/5 minor/3 nit; všechna tvrzení designu ověřena proti zdroji. Podmínky: M-2 sdílený rebuildBuildingDerived (load+complete/destroy), M-1 effects→modifier mapování + jedna cesta agregátů, M-3 deterministické řazení set, M-4 G-BUILD-TXAUDIT gap. Viz DR-013-01
- [x] T-002a: architect – Revize designu hotová (design_iter-013_T-001.md, changelog T-002a). M-1: §4.3 effects→modifier (per-typ, value=created) + §4.4 JEDNA cesta agregátů Σeffective bez ×created; M-2: §4.6/§4.7 sdílený rebuildBuildingDerived z load Step5 i mutací (load-only zakázána); M-3: §4.1 fold sort by (source,id), set=poslední; M-4: §2.3 ctx se commandu nepředává → G-BUILD-TXAUDIT gap (Volba B). T5/T6 → §13 odloženo M5-2. T4 = 6 kroků T4.1–T4.6
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (jménem uživatele): scaleCost default=1.0 OK, G-LISTBUILDINGS approx OK, G-BUILD-TXAUDIT odloženo OK (s pozn.), split M5-1/M5-2 OK. Žádná blokující výhrada → implementace M5-1 může běžet
- [x] T-004: coder – T1 hotový: buildings.js (ageBuildings day/order70, enqueueRepair, destroyInstance, rebuildBuildingDerived s created re-derivací; modifier/agregát část stub pro T4), stav home.buildings+projectQueue+projectSeq+derived, scaleCostByCount formula, BALANCE.buildings, persist (created derivován, derived mimo payload), load Step 5, buildings.json→6 budov approximated. ci 807/807, smoke OK, G1 pass, precache regen
- [ ] T-005: coder – T2: projectQueue + builder systém (quarterDay) + `build(itemId)` command + `scaleCostByCount(base, created, factor)` čistá fn (formulas.js, default factor=1.0 faithful) + tabulkové testy scaleCost
- [ ] T-006: coder – T3: builder companies (katalogová data + logika výběru/kapacit) + doplnění buildings.json ≥6 budov (G-LISTBUILDINGS, provenance:'approximated', gap-report update)
- [ ] T-007: coder – T4 (L, 6 kroků T4.1–T4.6): modifier vrstva plně pro budovy (K13): `effective(itemId, attr, state)` fold add→mul→set (deterministicky řazený), memoizace (_modVersion/_effCache, neperzistentní) + event-driven agregáty (maxWorkers, kapacity, attractiveness) v home.derived, save = JEN catalogState.modifiers, sdílený `rebuildBuildingDerived` z load i complete/destroy
- [ ] T-008: tester – Test loop M5-1 (sada §1.3): scaleCost/effective tabulkové testy, modifikátory round-trip (save jen modifikátory → load → přepočet == identita), catch-up-safe invariant nových systémů, persist round-trip, determinismus G1 nedotčen, PWA smoke, plné `npm run ci` + `npm run smoke`
- [ ] T-009: reviewer – Review gate M5-1: DoD bod po bodu, žádné `applyUpgrade` in-place mutace, derivovaná data se neukládají, žádná load-only větev derivace, tickOrder+diagram aktuální (právo re-run)
- [ ] T-010: human – Schválení uzavření iterace (zastupuje tom-proxy dle DR-013-00) → /close-iteration + PR + merge

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-011
- [ ] QA validace (Tester) – T-010
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M5-1)
- Stavby se staví (build command + projectQueue + builder quarterDay), mají scaling cen (scaleCostByCount) a opotřebení (ageBuildings + opravy přes getGoldValue).
- Modifikátory čistě: fold add→mul→set deterministický, save=jen modifikátory, re-aplikace po loadu = identita; sdílený rebuildBuildingDerived (žádná load-only větev).
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe nedotčen.
- Žádné in-place `applyUpgrade` mutace; derivovaná data se neukládají.
- Reviewer GO. (Kontrakty + build UI = M5-2/iter-014.)

## Decisions Made This Iteration
- DR-013-00: posun číslování M5–M9 (+1) + autonomní doběh; tom-proxy zastupuje human gaty.

## Retrospective Notes
- Vstup: master plán iter-003 §3/iter-012(M5), architektura iter-002 §5.3 (K13 modifikátory), §5.4 (K14 registr efektů), §8 kontrakty.
- Split-trigger (master plán): pokud T4(modifikátory)+T5(kontrakty) nesouzní do jedné iterace → split M5-1(T1–T4)/M5-2(T5–T6).
