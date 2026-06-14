# Brief

- **Brief ID**: BRIEF-014-004
- **Iteration**: iter-014 (M5-2)
- **Task**: T-004 = T5 (kontrakty K14)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T5 (kontrakty)** dle schváleného designu: contractQueue, životní cyklus přes registr efektů K14, schedule eventy, persist, boot registrace. Design je source of truth. Determinismus/catch-up-safe jsou tvrdé invarianty.

## Source of truth
`agents/coder/context/refs/design_iter-014.md` — čti **contract sekci (T5)** + **§14 (Revize T-002a: B1/B2/M1 — boot registrace a re-arm)**. Klíčové konkrétní předpisy jsou v §14.

## Scope IN (T5)
1. **`systems/contracts.js`** (nový): contractQueue lifecycle. `state.home.contractQueue` = pole `{id, type, status, cost, reward, deadlineStep, title, onComplete, onExpire, onReject}` + `contractSeq` čítač (deterministický, jako projectSeq). Deriváty (canComplete/daysLeft/pctComplete) se NEukládají — počítají se v selektoru.
2. **Životní cyklus přes registr efektů K14**: `onComplete/onExpire/onReject` = string-ID do registru + params v datech (NE imperativní háčky). `registerContractEffects(registry)` registruje handlery: `contract.offer`, `contract.expire`, `contract.complete` (generický pay(cost)+grant(reward) přes getGoldValue), `contract.reject`. Dle designu.
3. **Schedule**: expirace přes `scheduleInsert(deadlineStep, 'contract.expire', {contractId})`; generování přes `contract.offer` (re-schedulí se). **Absolutní deadlineStep** (deterministické, přežije save/load), izolovaný rng stream `'contracts'` (na KONEC STREAM_NAMES — dle designu, kvůli G1).
4. **B1 (boot) — registerBuild wired**: do `bootstrapEngine` (main.js) přidej dle §14.1: `registerContractEffects(registry)` (za registerCorePeriodics), `registerContractCommands(creg)` + **`registerBuild(creg)`** (za registerBuyCompany — B1 oprava dark code z M5-1). Ověř přesná místa dle §14.1.
5. **B2 (re-arm) — armContractOffer**: idempotentní `armContractOffer(state)` v `bootSequence` (za marketInit) dle §14.2: guard `scheduleCountOf('contract.offer')===0` → insert na `Math.max(curStep, firstOfferStep)`. Deterministické (žádný RNG/Date při armování — jitter až v handleru), idempotentní (běží fresh i po loadu, neduplikuje).
6. **Commands**: `acceptContract`/`rejectContract` (a `completeContract` pokud design předepisuje) — `registerContractCommands`.
7. **Persist schéma** kontraktů (allowlist contractQueue/contractSeq) + round-trip. **SAVE_VERSION zůstává 3** (M1, nová pole pod undefined-guardem, žádná migrace polí).
8. Balanc čísla (odměny, deadline, offer perioda) → `balance.js` s odkazem na zdroj/originál.

## Scope OUT
- **Build UI + kontrakty panel** = T6 (T-005). Ty děláš jen core kontrakty + boot wiring. (registerBuild wiring ale udělej v T5, protože je to boot a contract effects tam taky patří — vyjasni v summary.)
- Žádná změna command vrstvy (ctx se commandu nepředává; G-BUILD-TXAUDIT zůstává).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy:
  - contract lifecycle: offer → accept → complete (pay+grant) / expire (deadline) / reject; přes registr efektů.
  - **Determinismus**: contract generování deterministické (seed → stejné kontrakty); rng stream 'contracts' nerozbije G1.
  - **Persist round-trip**: contractQueue/contractSeq + schedule eventy (contract.expire/offer) přežijí save→load; **B2 re-arm**: starý save bez contract.offer ho po loadu dostane (scheduleCountOf guard), nový save neduplikuje.
  - **B1**: build + contract commands resolvovatelné po boot (žádný "unknown command").
  - catch-up-safe: kontrakty běží v offline dávce stejně jako live.
- `npm run smoke` OK (boot s novými registracemi bez chyb).
- **Determinismus G1** (iter005-edge) + plný hashState nedotčen.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-014.md` (T5 + §14), DR-014-01
- Kód: `src/core/registry/effects.js` + `registry.js`, `src/app/main.js` (bootstrapEngine, registerBuyCompany, bootSequence, marketInit), `src/core/engine/` (scheduler, scheduleInsert, scheduleCountOf), `src/core/engine/rng.js` (STREAM_NAMES), `src/save/load.js` + `persistSchema.js`, `src/core/systems/market.js` (getGoldValue, marketInit vzor re-arm), `src/core/commands/buyCompany.js` (vzor commandu)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-014_T-004.md` (soubor:funkce, gate výstup, jak vyřešeny B1/B2, co zbývá pro T6)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
