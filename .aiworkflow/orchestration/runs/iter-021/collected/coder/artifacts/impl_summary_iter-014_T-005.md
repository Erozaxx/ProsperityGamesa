# Impl Summary — iter-014 T-005 (T6 build UI + kontrakty panel)

> POZNÁMKA: Tento summary doplnil orchestrátor. Coder agent T-005 implementaci dokončil,
> ale zemřel/byl reclaimnut (ephemeral prostředí) PŘED zápisem summary a voláním handoff-out.sh.
> Práce nezávisle ověřena orchestrátorem (CI 990/990, smoke OK, ui-selectors-t6 33/33) → zachráněna.

## Co změněno (soubor)
- `src/ui/selectors.js`: selectBuildableBuildings (cena se scalingem scaleCostByCount + canAfford), selectProjectQueue, selectBuilderCapacity, selectBuilderCompanies, selectContracts (deriváty canComplete/daysLeft/pctComplete počítané v selektoru)
- `src/ui/screens.js`: BuildScreen (karty budov, build command, fronta projektů, opravy, builder companies) + ContractsScreen (nabízené/aktivní kontrakty, accept/reject/complete, deadline/progress, odměna)
- `src/ui/App.js`: taby 'build' (Stavba) + 'contracts' (Kontrakty)
- `src/ui/styles.css`: styly build/contracts (mobile-first)
- `test/ui-selectors-t6.test.js`: 33 testů (selektory + deriváty)
- `src/precache.js`: regenerován (UI soubory)

## Gate (nezávisle ověřeno orchestrátorem)
- npm run ci: 990/990 pass, 0 fail (957 → +33)
- npm run smoke: SMOKE OK, 0 console errors, exit 0; UI renderuje taby Stavba+Kontrakty
- determinismus G1: nedotčen (selektory čisté read)
- ui-selectors-t6.test.js: 33/33

## Pokrytí UI
Build screen (stavba budov z UI – B1 wired v T5), fronta projektů, opravy, builder companies; kontrakty panel (accept/reject/complete). DoD M5 UI vrstva kompletní.
