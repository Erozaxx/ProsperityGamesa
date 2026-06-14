# Current Task

- **Task ID**: T-001 (iter-014) — design M5-2 (kontrakty K14 + build UI)
- **Brief**: context/inbox/brief_architect_T-001_iter-014.md (BRIEF-014-001)
- **Iteration**: iter-014 (M5-2 – Kontrakty & build UI)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – plný design M5-2 (T5 kontrakty + T6 build UI). Dotaženo §5/§6/§13 z M5-1 designu
do plného návrhu pro Sonnet. Žádný kód. Žádná změna architektury iter-002 ani command vrstvy.
**Výstup: `artifacts/final/design_iter-014_T-001.md`.**

## Klíčová rozhodnutí
- **M52-D1 (zdroj contract dat = DOLOŽITELNÝ)**: events.js + home.js:2407 insertContract +
  config.js:3248 contract*Complete/Expire/Reject plně definují contract model i lifecycle.
  Katalog src/data/contracts.json = přepis originálu, provenance:'derived'/'approximated'.
  Gap G-CONTRACTS-CATALOG ZÚŽEN na "min. sada M5-2 nepokrývá všech 8 typů + deterministická
  fixace náhodných rozsahů + kalibrace M9" (informativní, ne blocker, ne DR).
- **M52-D2 (contractQueue)**: state.home.contractQueue (pole {id,type,status,cost,reward,
  deadlineStep,title,onComplete,onExpire,onReject}) + contractSeq (čítač jako projectSeq).
- **M52-D3/D4 (lifecycle přes registr efektů)**: onComplete/onExpire/onReject = data
  {effect:string,...params} (string-ID, K14; originál UŽ string callbacky callFn). Expirace přes
  scheduleInsert(deadlineStep,'contract.expire',{contractId}); handler v novém systems/contracts.js.
  ABSOLUTNÍ deadlineStep (ne per-step countdown originálu).
- **M52-D5 (generování)**: schedule-driven 'contract.offer' (re-schedule self, ne polling),
  izolovaný rng stream 'contracts'. Min. sada: dodávkový (supply) kontrakt, oceňování getGoldValue.
- **M52-D6 (commands)**: acceptContract/rejectContract/completeContract; completion přes
  exportovanou applyContractComplete (import), NE přes ctx.registry → command vrstva beze změny.
- **M52-D7 (build UI)**: selectBuildableBuildings/selectProjectQueue/selectBuilderCapacity/
  selectBuilderCompanies/selectContracts + BuildScreen/ContractsScreen + taby. Jen selektory+commands.
- **M52-D8 (boot wiring NUTNÉ)**: registerEffects DNES NEvolán v bootstrapEngine (main.js:86) →
  contract.expire/offer by se neresolvovaly. M5-2 přidá registerContractEffects + registerContractCommands.

## tickOrder dopady
- ŽÁDNÉ nové periodikum. Kontrakty běží přes SCHEDULE fázi (runTick phase 2):
  contract.offer (generátor, re-schedule) + contract.expire (one-shot na deadlineStep).
  TICK_ORDER konstanta beze změny; tickOrder.md jen poznámka o schedule handlerech.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-014-001, M5-1 design (§5/§6/§13), DR-013-00/01
- [x] Architektura iter-002 §5.4 (K14)/§5.6/§8 (kontrakty)/§6 (persist)/§3.4 ověřena
- [x] Kód prozkoumán: effects.js+registry, buildings.js, scheduler.js+tickOrder.js+rng.js,
      load.js+persistSchema.js, screens.js+selectors.js+App.js, market.js (getGoldValue),
      dispatch.js+build.js+buyCompany.js, transactions.js (pay/grant), main.js (boot wiring),
      createInitialState.js, buildings.json+companies.json
- [x] Originál events.js + home.js:2407 insertContract/1678 tick + config.js:3248 contract*
      + contractcard.js prozkoumán → contract data DOLOŽITELNÁ
- [x] T5 plný design (queue, lifecycle přes registr, generování, persist, determinismus)
- [x] T6 plný design (build UI + kontrakty panel, selektory+commands)
- [x] tickOrder/diagram dopady; rizika+mitigace; min. 1 alternativa (3 alternativy)
- [x] Výstup design_iter-014_T-001.md; handoff

## Blockery
–
