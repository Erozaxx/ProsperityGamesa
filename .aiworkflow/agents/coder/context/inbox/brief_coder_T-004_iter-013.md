# Brief

- **Brief ID**: BRIEF-013-004
- **Iteration**: iter-013 (M5-1)
- **Task**: T-004 = T1 (building instances + opotřebení + opravy + persist)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T1** dle schváleného designu: stavová reprezentace instancí budov, opotřebení (ageBuildings), opravy a deklarativní persist schéma budov. Design je source of truth — drž se ho, neimprovizuj architekturu.

## Source of truth
`agents/coder/context/refs/design_iter-013_T-001.md` (po revizi T-002a). Čti zejm.: sekci T1 (building instances/ageBuildings/opravy), §4.6/§4.7 (rebuildBuildingDerived + mutace — viz Scope OUT níže), persist sekci.

## Scope IN (T1)
1. **Stav budov**: `state.home.buildings[id] = {created, totalMade, instances:[{instId, hp, inRepair}]}` přesně dle designu. Deterministické čítače (žádný Date.now/Math.random): `instId` přes deterministický seq dle designu.
2. **ageBuildings** systém na **day** edge (order dle designu): opotřebení hp instancí. Žádný DOM/Date.now/Math.random; pokud potřebuje náhodu, izolovaný `rng.stream('buildings')` dle designu. Levné v dávce (catch-up-safe).
3. **Opravy**: repair-projekty dle designu, cena oceňovaná přes `getGoldValue` (faktor dle designu), balanc konstanty (opotřebení rate, repair faktor) → `src/core/balance/balance.js` s odkazem na zdroj/§ (ne inline).
4. **Persist schéma budov** (deklarativní, dle §6.3 + designu): allowlist co se ukládá (`totalMade`, instance hp/inRepair…) vs. co se derivuje (`created===instances.length`). Zaregistruj do persist pipeline (`src/save/persistSchema.js` + load).
5. **`created===instances.length` re-derivace po loadu**: dle designu §4.6 (sdílený rebuildBuildingDerived) — implementuj **building-instance/created část** re-derivace a její volání z load. Strukturu (sdílená funkce volaná z load i mutací) připrav tak, jak design předepisuje, aby ji T4 jen rozšířil o modifikátory/agregáty.
6. **Registrace** v tickOrder (ageBuildings) + aktualizace živých artefaktů (tickOrder doc, ASCII diagram) ve stejném commitu, je-li relevantní.

## Scope OUT (NEdělej — patří jiným taskům)
- **Modifier fold, `effective`, agregáty (maxWorkers/kapacity/attractiveness)** = T4 (T-007). Pokud design má `rebuildBuildingDerived` obsahovat fold/agregáty, nech tyto části jako jasně označený TODO/placeholder pro T4 (NEimplementuj je), ale `created` re-derivaci a volání z load udělej teď.
- **projectQueue, builder systém, `build()` command, scaleCostByCount** = T2 (T-005). (ageBuildings/opravy mohou potřebovat frontu projektů — pokud ano, zaveď minimální projectQueue strukturu jen pro repair-projekty dle designu, a stavbu nech na T2; vyjasni v impl summary co jsi zavedl.)
- builder companies, buildings.json backfill = T3.
- kontrakty, build UI = M5-2.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (typecheck + lint:core + test, 0 fail) — uveď počet testů. Přidej jednotkové testy pro ageBuildings/opravy/persist round-trip budov.
- `npm run smoke` OK (exit 0).
- **Determinismus**: G1 (iter005-edge) + existující determinismus testy nedotčené; žádný Date.now/Math.random/DOM v core.
- **Persist round-trip**: save→load budov → `created` re-derivováno, identický stav.
- Pokud měníš zdroj ovlivňující precache, regeneruj `node tools/gen-precache.mjs` (čistý diff, jen PRECACHE_VERSION).

## Inputs
- Design: `context/refs/design_iter-013_T-001.md`
- DR-013-01 (`context/refs/`)
- Kód: `src/core/state/createInitialState.js`, `src/save/load.js` (Step 5), `src/save/persistSchema.js`, `src/core/engine/tickOrder.js`, `src/core/systems/market.js` (getGoldValue), `src/core/balance/balance.js`, `src/core/systems/jobs.js` (vzor stavu jobs)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-013_T-004.md` (co změněno soubor:funkce, gate výstup, co je placeholder pro T4)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git) — commit dělá orchestrátor po ověření.
