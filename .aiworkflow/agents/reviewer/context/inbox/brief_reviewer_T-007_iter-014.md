# Brief

- **Brief ID**: BRIEF-014-007
- **Iteration**: iter-014 (M5-2)
- **Task**: T-007 (reviewer) — **review gate M5-2 + DoD M5** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Závěrečný **review gate M5-2** (master plán §1.4, právo re-run) + ověření **DoD M5** (celý milník). QA (T-006) dala GO empiricky; ty hodnotíš correctness + kvalitu + dodržení invariantů. **Pozn.: T6 (build UI) coder zemřel před handoffem, práci zachránil orchestrátor** — prověř build UI obzvlášť pečlivě (úplnost, žádná logika v UI).

## Rozsah review (produkční diff M5-2)
Base→HEAD: `ecfb479..HEAD` (jen iter-014). Klíčové soubory:
```
src/core/systems/contracts.js     (+302 – lifecycle, registerContractEffects, armContractOffer)
src/core/commands/contracts.js    (+185 – accept/reject/complete)
src/app/main.js                   (B1/B2 boot wiring: registerBuild + contract commands/effects + armContractOffer)
src/core/engine/rng.js            (stream 'contracts')
src/core/engine/tickOrder.js, src/save/load.js + persistSchema.js, src/core/state/*, src/data/contracts.json, src/core/catalog/*
src/ui/screens.js (+217 BuildScreen/ContractsScreen), selectors.js (+274), App.js (taby), styles.css
test/m5-contracts.test.js (+872), test/ui-selectors-t6.test.js (+600)
```
Diff: `git diff ecfb479..HEAD -- src/ test/`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Kontrakty přes registr efektů K14**: onComplete/onExpire/onReject = string-ID + params v datech, NE imperativní háčky. Ověř proti kódu.
2. **Determinismus/serializovatelnost**: contractQueue + schedule eventy (contract.offer/expire) přežijí save/load; rng stream 'contracts' izolovaný (na konci STREAM_NAMES, nemění seedy ostatních); deriváty (canComplete/daysLeft/pctComplete) se NEukládají. G1 nedotčen.
3. **B2 re-arm idempotentní**: `armContractOffer` se `scheduleCountOf('contract.offer')===0` guardem; běží fresh i po loadu; neduplikuje; deterministický (žádný Date.now/Math.random v armování). Ověř call-site v boot.
4. **B1 boot wiring**: registerBuild + registerContractCommands + registerContractEffects skutečně v bootstrapu; build/contract commandy resolvovatelné.
5. **Žádná herní logika v UI**: výpočty (scaleCost, canComplete, daysLeft) v selektorech/core, ne v komponentách. Komponenty čtou přes selektory, píší přes commands.
6. Žádný Date.now/Math.random/DOM v core; catch-up-safe; SAVE_VERSION=3 kompatibilita starých savů.

## Na co se zaměřit
1. **Correctness** invariantů výše (proti kódu, ne tvrzení).
2. **Soulad s designem** `context/refs/design_iter-014_T-001.md` (vč. §14 revize) a architekturou iter-002 (K14/§8/§6). Odchylky označ.
3. **Build UI úplnost (zachráněná práce)**: BuildScreen (budovy, fronta, opravy, firmy) + ContractsScreen (accept/reject/complete, deadline, odměna) + taby kompletní a funkční? Selektory korektní (deriváty)?
4. **Reuse/simplify/mrtvý kód**: konkrétně soubor:řádek + návrh.
5. **Persist/migrace**: nová pole round-trip; staré savy OK (undefined-guard).
6. **Živé artefakty**: tickOrder doc + diagram aktuální (contract.offer/expire — i když přes schedule, ne periodikum).
7. **Gapy** (G-CONTRACTS-CATALOG, G-BUILD-TXAUDIT, G-BUILD-COSTSCALE aj.) korektně označené + v gap-reportu.
8. **DoD M5 celkově**: budovy + stavba + companies + modifikátory (M5-1) + kontrakty + UI (M5-2) → milník M5 kompletní a hratelný?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M5** (kompletní/ne).

## Inputs
- Design: `context/refs/design_iter-014_T-001.md`; QA: `context/refs/qa_report_iter-014_T-006.md`; DR-014-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (K14/§8/§6)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-014_T-004.md` + T-005 (zachráněný)

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-014_T-007.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-007 "<verdikt + DoD M5 + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus/persist (contract schedule, rng stream, re-arm) + zachráněná build UI prověř obzvlášť pečlivě.
