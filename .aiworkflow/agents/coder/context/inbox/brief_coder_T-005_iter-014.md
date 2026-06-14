# Brief

- **Brief ID**: BRIEF-014-005
- **Iteration**: iter-014 (M5-2)
- **Task**: T-005 = T6 (build UI + kontrakty panel)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T6 (build UI + kontrakty panel)** dle designu. Tím se M5 dokončuje (DoD M5). Drž vzor existujícího UI: pure komponenty `{snapshot, send}`, čtou přes **selektory**, píší přes **commands**. **ŽÁDNÁ herní logika v UI** (výpočty scaleCost/canComplete/daysLeft patří do selektorů/core).

## Source of truth
`agents/coder/context/refs/design_iter-014.md` — čti **T6 build UI sekci** (selektory, BuildScreen, ContractsScreen, taby). `registerBuild` už je wired (T5/B1).

## Scope IN (T6)
1. **Selektory** (`src/ui/selectors.js` dle designu): `selectBuildableBuildings` (karty budov + cena se scalingem přes `scaleCostByCount(base, totalMade)` + canAfford), `selectProjectQueue` (rozestavěné projekty + progres), `selectBuilderCapacity` (builder count/kapacita), `selectBuilderCompanies` (owned + dostupné firmy), `selectContracts` (aktivní/nabízené + **deriváty canComplete/daysLeft/pctComplete** počítané ZDE, ne v UI ani persistu). Repair stav budov (opotřebení/inRepair).
2. **BuildScreen** komponenta (`src/ui/screens.js`): karty budov (build → `send('build',{itemId})`), fronta projektů, opravy (→ repair command/enqueueRepair cesta dle designu), builder companies (→ `send('buyCompany',...)`). Zobrazení cen se scalingem.
3. **ContractsScreen / kontrakty panel** (`src/ui/screens.js`): nabízené/aktivní kontrakty, accept (`send('acceptContract',...)`)/reject (`send('rejectContract',...)`)/complete (pokud relevantní), deadline/progress (daysLeft/pctComplete ze selektoru), odměna.
4. **Taby** v `src/ui/App.js`: přidej `build` + `contracts` taby dle existujícího vzoru (jako Market/Council screen).
5. Styly (`src/ui/styles.css`) dle potřeby (drž mobile-first, žádný overflow — viz A5 z iter-012).

## Scope OUT
- Core kontrakty/build logika = hotovo (T5/M5-1). Ty děláš jen UI vrstvu (selektory + komponenty + taby).
- Žádná herní logika v UI komponentách. Žádná změna engine/commands (kromě případného UI-only selektoru).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: selektory (selectBuildableBuildings cena se scalingem, selectContracts deriváty canComplete/daysLeft/pctComplete), případně render-smoke komponent.
- `npm run smoke` OK — **boot + render build/contracts screen bez console chyb** (klíčové, smoke renderuje UI). Ověř, že build tlačítko reálně volá `build` command (B1 — teď už wired) a kontrakt accept/reject funguje.
- **Determinismus G1** nedotčen (UI nesmí sahat do core stavu mimo commands; žádný Date.now/Math.random v selektorech ovlivňující stav — selektory jsou čisté read).
- Žádný DOM přístup v core; UI je jediná DOM vrstva.
- Precache regen jen při změně zdroje ovlivňujícího manifest (přidání UI souborů/změna → pravděpodobně regen; ověř a regeneruj `node tools/gen-precache.mjs` pokud nutné).

## Inputs
- Design: `context/refs/design_iter-014.md` (T6), DR-014-01
- T5 summary: `agents/coder/artifacts/final/impl_summary_iter-014_T-004.md`
- Kód/vzor: `src/ui/screens.js` (MarketScreen/CouncilScreen vzor), `src/ui/selectors.js`, `src/ui/App.js` (taby), `src/ui/styles.css`, `src/core/balance/formulas.js` (scaleCostByCount), `src/core/systems/buildings.js` (effective/agregáty pro zobrazení), `src/core/systems/contracts.js`, `src/core/commands/` (build/buyCompany/contracts)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-014_T-005.md` (soubor:funkce, gate výstup, co UI pokrývá)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
