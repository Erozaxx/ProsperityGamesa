# Current Task

- **Task ID**: T-002a (iter-014) — revize M5-2 designu (B1/B2/M1 z reviewer gate T-002)
- **Brief**: context/inbox/brief_architect_T-002a_iter-014.md (BRIEF-014-002a)
- **Iteration**: iter-014 (M5-2 – Kontrakty & build UI)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – revize T-002a. Doplněna chybějící **§14** (B1/B2/M1 + M2/minor/nit) do
`design_iter-014_T-001.md` (in-place). §14 byla v changelogu/§0–§13 referencovaná, ale
text chyběl → dopsána jako závazná sekce s přednastí. Ověřeno proti kódu (main.js, load.js,
market.js, scheduler.js, schema.js, migrations.js, build.js, engine/index.js). Žádný kód.
**Platný dokument: `artifacts/final/design_iter-014_T-001.md` (in-place; nový T-002a NEvznikl).**

## Revize T-002a — výsledek
- **B1 (blocker)**: §14.1 — import + `registerBuild(creg)` + `registerContractCommands(creg)`
  za `main.js:99`; `registerContractEffects(registry)` za `main.js:88`. Ověřeno: registerBuild
  (build.js:147) dnes NEimportován ani volán v main.js → build dark code. Fresh i po loadu.
- **B2 (blocker)**: §14.2 — `armContractOffer(state)` za `marketInit` (main.js:180) v bootSequence;
  guard `scheduleCountOf('contract.offer')===0`; insert na `max(curStep, firstOfferStep)`.
  Deterministický (bez RNG/Date), idempotentní (2. volání no-op), jedna cesta pro fresh+M5-2+starý save.
  Ověřeno: applyPayload (load.js:90) přepíše engine.schedule saved heapem → starý save bez offeru.
- **M1 (major)**: §14.3 — SAVE_VERSION ZŮSTÁVÁ 3, žádná migrace polí (undefined-guard, precedent
  projectQueue load.js:189). B2 je nutný NEZÁVISLE (schedule v engine ≠ home pole; migrace pole
  schedule nepokrývá). Escape hatch: pokud bump z jiného důvodu → v3→v4 no-op migrace.
- **M2 + minor/nit**: §14.4/§14.5 — init v createHomeState; firstOfferStep=1 sjednoceno;
  registerEffects vynechán; title derivovat; G-CONTRACT-SCHED-CLEANUP backlog.

## Předchozí (T-001) — plný design M5-2 (T5 kontrakty + T6 build UI)
Žádný kód. Žádná změna architektury iter-002 ani command vrstvy.
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
