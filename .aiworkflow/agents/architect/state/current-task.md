# Current Task

- **Task ID**: T-001 (iter-013)
- **Brief**: context/inbox/brief_architect_T-001_iter-013.md (BRIEF-013-001)
- **Iteration**: iter-013 (M5 – Budovy, stavba, kontrakty)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – detailní implementační DESIGN M5 (T1–T6) pro Sonnet codera. Žádný kód.
Výstup: `artifacts/final/design_iter-013_T-001.md`.

## Klíčová designová rozhodnutí
- **Stav budov** (M5-D1): `state.home.buildings[id] = {created, totalMade, instances:[{instId,hp,inRepair}]}`;
  `created===instances.length` (invariant, re-derived po loadu). `instId`/`projectId`/`contractId`
  deterministické čítače (NE Date.now). `ageBuildings` na **day** edge přes nový `rng.stream('buildings')`.
- **scaleCostByCount(base, created)** (M5-D4): NOVÁ čistá fn ve formulas.js, geometrický růst
  `pct=scaleFactor^created`, default `scaleFactor=1.0` = věrné originálu (originál budovy NEškáluje —
  doloženo buildingcard.js:88, config.js:1170). provenance:'approximated', gap G-BUILD-COSTSCALE, M9.
- **Modifier fold** (M5-D7, K13): `effective(itemId,attr,state)` fold add→mul→set; memoizace přes
  `_modVersion`/`_effCache` (neperzistentní, `_`-prefix); agregáty (maxWorkers/storage/attractiveness)
  v `home.derived` event-driven (complete/destroy/load). **Save = JEN catalogState.modifiers**.
  T4(L) rozložen na 6 Sonnet-kroků (T4.1–T4.6).
- **Kontrakty** (M5-D8, K14): `contractQueue`; onComplete/onExpire/onReject = string-ID+params v datech
  do registru efektů (NE imperativní háčky); expirace přes scheduleInsert (serializovatelné, přežije load).
- **Persist**: budovy/projectQueue/contractQueue do allowlistu; derivát (effCache/derived/progressPct/
  created) se NEUKLÁDÁ; load Step 5 rebuild = fold + recalcAggregates (jediná cesta, žádná load-only větev).
- **TickOrder**: +`buildings.builders` quarterDay order 40 (po autoAssign), +`buildings.age` day order 70
  (po burnWood); `contract.expire` one-shot schedule.

## Povinná rozhodnutí
- **SPLIT: ANO** → M5-1 (T1–T4) / M5-2 (T5–T6). Důvod: T4 je L s 6-krok dekompozicí (naplní iteraci);
  T4(K13 infra) a T5(K14 obsah) mají oddělené review gates → mísení = riziko re-run; čistá dependency
  hranice (T5/T6 staví na T2+T4). M5-1 je samostatně hratelné. Bez dopadu na architekturu.
- **G-LISTBUILDINGS**: doplnit buildings.json autonomně (Q3/DR-001) na ≥6 budov,
  `provenance:'approximated'` per pole, gap-report update, eskalace jen informativní (ne blocker, bez DR).
  Min. sada: builderHut, granary, warehouse, townCenter, +house (maxWorkers), +levná service budova.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-013-001
- [x] Reference: DR-013-00, master plán §3/iter-012(M5)+§1.2+Q3/DR-001, architektura iter-002
      (§5.3 K13, §5.4 K14, §6.3-6.4, §7.1, §8)
- [x] Kód: registry/effects, market(getGoldValue), tickOrder, jobs(quarterDay/builder stub),
      save(load/persistSchema), buildings.json/companies.json, balance/formulas, scheduler, dispatch,
      handlers/transactions, createInitialState/createHomeState, catalog loader + originál home/config/buildingcard
- [x] Design T1–T6 (Sonnet-implementable), T4(L) dekompozice 6 kroků, persist schémata,
      tickOrder dopady + diagram, split rozhodnutí, G-LISTBUILDINGS gap
- [x] Determinismus/catch-up-safe ověřeno (žádný DOM/Date.now/Math.random; izolovaný rng stream; levné v dávce)
- [x] Výstup do artifacts/final + handoff

## Blockery
–
