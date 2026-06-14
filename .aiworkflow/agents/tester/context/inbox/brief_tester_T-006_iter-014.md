# Brief

- **Brief ID**: BRIEF-014-006
- **Iteration**: iter-014 (M5-2)
- **Task**: T-006 (tester) — plný test loop M5-2 + **DoD M5 komplet**
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-14

## Goal
Nezávislá QA M5-2 (kontrakty K14 + build UI) a ověření, že **celý milník M5 je hotový** (budovy + stavba + companies + modifikátory z M5-1 + kontrakty + UI z M5-2). Ověřuj EMPIRICKY vlastním během. Buď přísný na determinismus/persist kontraktů (schedule eventy) a na to, že UI je reálně funkční (B1 fix — build z appky).

## Kontext (M5-2 implementováno)
- T5: `src/core/systems/contracts.js` (contractQueue, lifecycle přes registr efektů K14, contract.offer/expire/complete), commands accept/reject/complete, `contracts.json`, `armContractOffer` (B2 re-arm), rng stream 'contracts'. **B1 fix**: registerBuild + contract commands/effects nyní v bootstrapu (main.js).
- T6: selektory (selectBuildableBuildings/ProjectQueue/BuilderCapacity/BuilderCompanies/Contracts), BuildScreen + ContractsScreen, taby. *(T6 coder agent zemřel před handoffem — práci zachránil orchestrátor; ověř ji obzvlášť pečlivě.)*

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet testů + 0 fail). **`npm run smoke`** OK (0 console errors, build+contracts taby renderují).
2. **Kontrakty životní cyklus**: offer → accept → (dodání zboží) → complete (pay cost + grant reward přes getGoldValue) ; offer → expire (po deadlineStep) → onExpire efekt; reject. Vše přes registr efektů (string-ID), deterministické.
3. **B2 re-arm (kritické pro staré savy)**: starý save BEZ `contract.offer` v schedule → po loadu `armContractOffer` naplánuje offer (scheduleCountOf guard). M5-2 save → no-op. Idempotentní (víc volání). Ověř empiricky se starým i novým savem.
4. **Determinismus**: contract offer/expire deterministické (rng stream 'contracts' izolovaný); G1 (iter005-edge) plný hashState nedotčen po přidání streamu; round-trip contractQueue/contractSeq identita.
5. **Catch-up-safe**: dlouhý seedovaný sim s kontrakty v offline dávce (≥1 herní rok) → bez crashe, deterministický (stejný save+čas → stejný výsledek), contract eventy běží v dávce stejně jako live.
6. **Persist round-trip**: contractQueue, contractSeq, + M5-1 domény (buildings/projectQueue/ownedCompanies/modifiers) — round-trip bez ztráty; schedule eventy (contract.offer/expire) přežijí save/load.
7. **Build UI funkční (B1)**: build screen → `build` command reálně staví (zdroje se odečtou, projekt do fronty, builder dokončí, instance vznikne); buyCompany z UI; opravy z UI. ContractsScreen accept/reject/complete reálně mění stav. **Žádná herní logika v UI** (deriváty v selektorech).
8. **SAVE_VERSION**: zůstává 3, staré savy se načtou (undefined-guard nových polí).
9. **DoD M5 celkově**: město roste (stavby, scaling, opotřebení), kontrakty běží, modifikátory čistě, vše z UI — milník M5 kompletní a hratelný.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš nález + repro, eskaluj. Helper skripty tmp/agents/tester/state/ OK, necommituj produkční změny.
- M6+ obsah.

## Acceptance Criteria (DoD M5)
- ci zelené, smoke OK (UI renderuje).
- Kontrakty lifecycle deterministický + round-trip; B2 re-arm funguje pro staré savy.
- Catch-up-safe (≥1 rok sim bez crashe).
- Build UI reálně funkční (B1 — stavba z appky); žádná logika v UI.
- G1 determinismus nedotčen; SAVE_VERSION kompatibilita.
- Verdikt GO/NO-GO (DoD M5).

## Inputs
- Design: `context/refs/design_iter-014_T-001.md`, DR-014-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-014_T-004.md` (+T-005 zachráněný)
- Testy: `test/m5-contracts.test.js`, `test/ui-selectors-t6.test.js`, `test/iter005-edge.test.js`, `test/m5-buildings-*.test.js`
- Kód: `src/core/systems/contracts.js`, `src/core/commands/contracts.js`, `src/app/main.js` (boot wiring B1/B2), `src/ui/` (screens/selectors/App), `src/save/`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-014_T-006.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-006 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
