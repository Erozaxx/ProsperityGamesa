# Current Task

- **Task ID**: T-005 (iter-013 M5-1 T2: projectQueue stavba + builder + build() command + scaleCost)
- **Brief**: brief_coder_T-005_iter-013.md
- **Iteration**: iter-013
- **Status**: done
- **Started**: 2026-06-14
- **Done**: 2026-06-14

## Checklist (T-005)

- [x] build(itemId) command: validace, scaleCostByCount, pay, push do projectQueue
- [x] Registrace build command v registerBuild (src/core/commands/build.js)
- [x] Builder systém: buildersProcess (quarterDay, order 40) v buildings.js
- [x] completeBuild: nová instance, totalMade++, rebuildBuildingDerived
- [x] applyRepair: hp restore, inRepair=false, recalcBuildingAggregates
- [x] Napojení builder slotu z jobs (state.home.jobs['builder'].number)
- [x] effectFromCatalog helper (pro T2 čtení effect values z builderHut.effects[])
- [x] BALANCE.buildings rozšíření: masonStep, quarterDaysPerDay, maxActiveProjects, maxProjectQueue, requeueDelay
- [x] Registrace buildings.builders v tickOrder.js (quarterDay, order 40)
- [x] docs/tickOrder.md aktualizován (buildings.builders + T2 sekce)
- [x] precache regenerován (PRECACHE_VERSION aktualizován)
- [x] scaleCostByCount tabulkové testy (factor=1.0 konstantní, factor>1.0 geometrický)
- [x] test/m5-buildings-t2.test.js: 33 nových testů
- [x] npm run ci ZELENÉ — 840 testů, 0 fail
- [x] npm run smoke OK
- [x] G1 determinismus nedotčen
- [x] Persist round-trip: rozestavěný projekt přežije save→load a pokračuje

## Builder kapacita: co z jobs vs. odloženo na T3

- **z jobs (implementováno T2)**: `state.home.jobs['builder'].number` — základní počet builderů přiřazených přes M3 job systém
- **z builderHut effects (implementováno T2)**: `maxActiveProjects` a `maxProjectQueue` čteny přes `effectFromCatalog('builderHut', attr)` z builderHut.effects[] (T4 stub verze bez modifier fold)
- **odloženo na T3**: builder company logika (selectBuilderCompany command, firm-provided capacity, companies.json `buildersProvided` field) — T-006

## T4 Placeholders (TODO pro T4/T-007)

- `effectFromCatalog` je T2 workaround — T4 nahradí za `effective('builderHut', attr, state)` s modifier fold
- `addBuildingModifiers` — stub (TODO T4.3)
- `invalidateModifiers` — stub (TODO T4.2)
- `effective()` — base-only, bez modifier fold (TODO T4.1)
- `recalcBuildingAggregates` — base catalog values (TODO T4.4)

## Výsledek
T2 dokončen. 840 testů, 0 fail. Smoke OK. G1 determinismus nedotčen.
Persist round-trip funguje. Rozestavěný projekt přežije save→load a pokračuje.
