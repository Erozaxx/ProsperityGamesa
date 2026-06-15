# Impl Summary — iter-013 T-005 (M5-1 T2)

## Task
T-005 = T2: projectQueue stavba + builder + build() command + scaleCost

## Změněné soubory:funkce

| Soubor | Změna |
|--------|-------|
| `src/core/balance/balance.js` | Přidány do `BALANCE.buildings`: `masonStep=1`, `quarterDaysPerDay=4`, `maxActiveProjects=0`, `maxProjectQueue=0`, `requeueDelay=2` |
| `src/core/commands/build.js` | **NOVÝ soubor**: `build(state, params)` command handler + `registerBuild(creg)`. Validace (existence, unlocked, queue capacity), cena přes `scaleCostByCount`, `pay()` bez ctx (G-BUILD-TXAUDIT gap), push projektu do `projectQueue`. |
| `src/core/systems/buildings.js` | Přidány: `effectFromCatalog(buildingId, attr)` (T2 helper pro čtení effect values z effects[]), `completeBuild(state, project, ctx)` (nová instance, totalMade++, rebuildBuildingDerived), `applyRepair(state, project, ctx)` (hp restore, inRepair=false, recalcBuildingAggregates), `buildersProcess(state, _params, ctx)` (quarterDay builder advancement), import `canAfford`+`pay` z transactions. |
| `src/core/engine/tickOrder.js` | Import + registrace `buildings.builders` (quarterDay, order 40, po autoAssign order 30). |
| `docs/tickOrder.md` | Přidán `buildings.builders` do tabulky, T2 sekce, ASCII diagram aktualizován. |
| `src/precache.js` | Regenerován (`prosperity-a774e289b2d5` → `prosperity-a202e26b4cb9`). |
| `test/m5-buildings-t2.test.js` | **NOVÝ soubor**: 33 testů (scaleCostByCount tabulkové, build() validace/happy-path, buildersProcess advancement+completion, applyRepair, repair deferred payment, persist round-trip, completeBuild direct). |

## Gate výsledek

- `npm run ci`: **840 testů, 0 fail** (typecheck + lint:core + test, exit 0)
- `npm run smoke`: **OK** (exit 0)
- **Determinismus**: G1 (iter005-edge) passes, existující testy nedotčené; buildersProcess deterministický (žádný RNG, žádný Date.now/Math.random/DOM)
- **Persist round-trip**: in-progress build projekt přežije save→load (projectQueue/projectSeq) a buildersProcess ho dokončí; repair projekt s paid=false taky přežije
- **Precache regenerován**: `node tools/gen-precache.mjs` → čistý diff jen PRECACHE_VERSION
- **Nové testy (33)**: m5-buildings-t2.test.js (scaleCostByCount × 6, build() validace × 5, happy-path × 4, buildersProcess × 6, applyRepair × 3, repair deferred payment × 3, persist round-trip × 2, completeBuild direct × 3)

## Builder kapacita: co z jobs vs. odloženo na T3

### Implementováno T2 (z jobs / z builderHut effects)
- **Builder slot z jobs**: `state.home.jobs['builder'].number` — počet builderů přiřazených přes M3 job systém; `jobsProduction` a `autoAssign` je přeskakují (`noProduction:true`, `category:'builder'`), přiřazuje se explicitně přes `assignJob('builder', delta)` command (existující). Toto je základní kapacita dle designu §3.2.
- **maxActiveProjects**: čteno z `builderHut.effects[]` přes `effectFromCatalog('builderHut', 'maxActiveProjects')` × `builderHut.created` (1 per hut). T4 nahradí za `effective()` s modifier fold.
- **maxProjectQueue**: analogicky z `builderHut.effects[]` × created (3 per hut).

### Odloženo na T3 (T-006)
- Builder company logika: `selectBuilderCompany` command, `companies.json` `buildersProvided`/`masonProvided` fields, unlock/kapacita firem — per design §3.2 „G-BUILDER-COMPANIES, lze stub do M5-2/M6". T2 používá pouze basic builder job count + builderHut derived capacity.

## Klíčové architektonické rozhodnutí

- **G-BUILD-TXAUDIT (M-4, DR-013-01 §2.3)**: `build` command dostává pouze `(state, params)` — `dispatch.js` nepředává ctx (arch iter-002 constraint). `pay()` volán bez ctx → `emitTx` audit skipping je vědomý gap. Gold se odečítá správně. Dořeší M5-2/M9.
- **effectFromCatalog helper**: `effective('builderHut', 'maxProjectQueue', state)` vrací 0 (T4 stub reads `entry.maxProjectQueue` — top-level field neexistuje, je jen v effects[]). T2 workaround: `effectFromCatalog` čte přímo z `entry.effects[]`. T4 tuto funkci nahradí modifier foldem.
- **Requeue heuristika**: projekt se přesune na konec fronty po `requeueDelay=2` ticks bez postupu (nedostatek builderů nebo zlatá na repair). Odpovídá home.js:1773 STEPSPERDAY/3 přepočítanému na quarterDay cadenci.
