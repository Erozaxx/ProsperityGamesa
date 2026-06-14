# Brief

- **Brief ID**: BRIEF-013-005
- **Iteration**: iter-013 (M5-1)
- **Task**: T-005 = T2 (projectQueue stavba + builder + build() command + scaleCost)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T2** dle designu: stavbu budov přes frontu projektů a builder systém. Stavíš na T1 (už existuje `state.home.projectQueue`, `projectSeq`, `buildings.js` s `rebuildBuildingDerived`/`destroyInstance`/`enqueueRepair`, a `scaleCostByCount` ve formulas.js). Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-013_T-001.md` — čti sekci **T2** (projectQueue + builder + build() + scaleCost). Zkontroluj, co už T1 zavedl (`impl_summary_iter-013_T-004.md`), ať neduplikuješ.

## Scope IN (T2)
1. **`build(itemId)` command** (`src/core/commands/`, registruj přes dispatch): validace (budova existuje v katalogu, lze stavět), výpočet ceny přes **`scaleCostByCount(baseCost, totalMade, factor)`**, odečet přes transakční vrstvu `pay` (zdroje wood/ore/gold dle baseCost), vložení projektu do `projectQueue` (deterministicky přes `projectSeq`). Pozn. G-BUILD-TXAUDIT: ctx se commandu nepředává → `pay` bez emitTx, OK dle DR-013-01/§2.3.
2. **Builder systém** na **quarterDay** edge (builder slot z M3 jobs): postup stavebních projektů ve `projectQueue` dle počtu builderů/kapacity (dle designu), inkrementace progressu.
3. **Dokončení projektu** (`completeBuild` nebo dle designu): projekt hotov → přidá instanci do `state.home.buildings[id].instances` (nový `instId`), `totalMade++`, a **volá `rebuildBuildingDerived`** (sdílená cesta — žádná separátní derivační logika). Repair-projekty (z T1 `enqueueRepair`) builder taky posouvá a po dokončení nastaví `inRepair=false`/obnoví hp dle designu.
4. **Napojení builder slotu** z jobs (quarterDay produkce) dle designu — builder pracovníci pohánějí postup.
5. **scaleCostByCount tabulkové testy**: ověř vzorec proti referenčním hodnotám/designu (default factor=1.0 = konstantní cena; ověř i factor>1.0 geometrický růst).
6. tickOrder registrace builder systému (quarterDay) + aktualizace tickOrder doc/diagram ve stejném commitu.

## Scope OUT
- Modifier fold/effective/agregáty = T4 (T-007). Pokud `completeBuild`→`rebuildBuildingDerived` narazí na modifier stuby z T1, ponech je stub (T4 je doplní). Neimplementuj modifikátory.
- builder companies (výběr/kapacity firem) = T3 (T-006) — pokud builder systém potřebuje jen základní kapacitu builderů z jobs, použij to; firemní logiku nech na T3. Vyjasni v summary co je z jobs vs. odloženo na T3.
- buildings.json už má 6 budov (T1) — needituj katalog kvůli novým budovám.
- build UI = M5-2.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: build() command (validace, pay, projekt do fronty), builder postup → dokončení → instance + totalMade++, scaleCost tabulkové, persist round-trip projectQueue.
- `npm run smoke` OK.
- **Determinismus** G1 + existující nedotčené; build/builder deterministické (žádný Date.now/Math.random/DOM); catch-up-safe (builder běží levně v dávce).
- Persist round-trip: rozestavěný projekt přežije save→load (projectQueue/projectSeq) a pokračuje.
- Precache regen jen pokud měníš zdroj ovlivňující manifest.

## Inputs
- Design: `context/refs/design_iter-013_T-001.md` (T2)
- T1 summary: `agents/coder/artifacts/final/impl_summary_iter-013_T-004.md`
- Kód: `src/core/systems/buildings.js`, `src/core/commands/dispatch.js` + existující commandy (vzor `buyGoods.js`), `src/core/systems/jobs.js` (quarterDay, builder slot), `src/core/balance/formulas.js` (scaleCostByCount), `src/core/systems/transactions.js` (pay), `src/save/persistSchema.js`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-013_T-005.md` (soubor:funkce, gate výstup, co z jobs vs. odloženo na T3)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
