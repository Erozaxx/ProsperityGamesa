# Brief

- **Brief ID**: BRIEF-018-002
- **Iteration**: iter-018 (M7b – Bitvy)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Review **designu M7b** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (§8.1, K8/D8/G2), proveditelnost Sonnet coderem, a **determinismus battle automatu** (serializovatelný kill-resume, auto-resolve catch-up == live G2 — nejrizikovější). Posuď split. Architektonický gate před tom-proxy.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-018_T-001.md`

## Na co se zaměřit (kritické)
1. **G2 auto-resolve == live (klíčové tvrzení)**: design tvrdí, že `battle.tick` je periodic `every:'step'` (tickOrder.js:230) → `runCatchupBatch` (catchup.js) I `advance` (clock.js) volají **identický** `step()` → `battleTick` → `battleStep`; offline = prázdná `queue` → obranná AI. Tedy auto-resolve v catch-upu je STRUKTURÁLNĚ ZADARMO (žádná druhá implementace). **Ověř proti kódu**, že to platí — že battle.tick je skutečně step-periodic a že catch-up dávka i live běh procházejí stejnou cestou. Toto je jádro G2.
2. **battleStep determinismus + serializovatelnost (kill-resume)**: `battleStep(bs, commands, rng('battle'))` signatura beze změny (§8.1); pevné pořadí kroků (end-check → cd-down → player commands → player AI → opponent AI → tick++) a útoků; `Math.random`→`rng.next()`; **celý `state.battle` (vč. subAccMs/cd/tick/queue) serializovatelný** → save uprostřed bitvy → load → fresh==load hashState (kill-resume bit-identický). Ověř, že nic neserializovatelného (funkce/closury) není v state.battle.
3. **Sub-step v akumulátoru**: `battleTick` adaptér (`subAccMs += STEP_MS`; `while >= BATTLE_TICK_MS(30): battleStep`) — žádný druhý časovač. Ověř, že je deterministický a levný v catch-up dávce.
4. **Damage/revival vzorce**: do `formulas.js` (battleDamage/Defense/revive) 1:1 originál + tabulkové testy. `reviveAI = floor(cas*rng/4)` přes rng('battle'). Ověř konzistenci s originálem.
5. **Kontrakt §8.1 beze změny signatury** (battleStep); battle.tick step order 30 už registrován (tickOrder beze změny).
6. **Napojení**: `startBattleStub` (world.js:1189) → naplnit (AI-vs-player invaze z M7a-2); banditRaid přes schedule; `resolveBattleOutcome` → mutace zón/inventáře + revival; výsledky do offline summary (PURE).
7. **Split NE** — souhlasíš (G2 zadarmo, T2/T3 přírůstky, T4 wiring, T5 UI)? Posuď, zda M7b-1 by byl samostatně hratelný (architekt tvrdí NE — automat bez spouštěče = mrtvý kód).
8. **G-MILITARY-STATS**: player combat staty approximované (provenance flag, M9) — OK (Q3/DR-001)?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení G2 auto-resolve (== live skutečně zadarmo?) + serializovatelnosti (kill-resume) + splitu.

## Inputs
- Design: `context/refs/design_iter-018_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.1, K8/D8/G2)
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-015(M7b))
- DR-013-00
- Kód pro ověření: `src/core/systems/battle.js` (stub, BattleState), `src/core/engine/tickOrder.js` (battle.tick step order 30), `src/core/engine/catchup.js` (runCatchupBatch), `src/core/engine/clock.js` (advance/step), `src/core/systems/world.js` (startBattleStub :1189, takeOver, aiBattleResolve), `src/save/persistSchema.js` (state.battle allowlist), `src/data/military.json`, originál `doc/original_source/modules/prosperity/services/battle.js`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-018_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + G2 + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- G2 auto-resolve (== live zadarmo) + serializovatelnost battleStep (kill-resume) prověř obzvlášť pečlivě — ověřuj proti kódu (battle.tick periodic, catchup cesta). Toto jsou nejrizikovější body (catch-up-safe + DR-012-02 třída).
