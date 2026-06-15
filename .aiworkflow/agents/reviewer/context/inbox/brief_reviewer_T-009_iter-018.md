# Brief

- **Brief ID**: BRIEF-018-009
- **Iteration**: iter-018 (M7b)
- **Task**: T-009 (reviewer) — **review gate M7b + DoD M7** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Závěrečný **review gate M7b** (master plán §1.4, právo re-run) + ověření **DoD M7** (celý milník: AI svět M7a + bitvy M7b). QA (T-008) dala GO empiricky; ty hodnotíš correctness + kvalitu + invarianty. Přísně prověř **determinismus bitvy** (replay, kill-resume serializovatelnost, G2 auto-resolve == live — DR-012-02 + catch-up-safe) a 1:1 originál (M-1/M-2/M-3).

## Rozsah review (produkční diff M7b)
Base→HEAD: `0c4635e..HEAD` (jen iter-018). Klíčové soubory:
```
src/core/systems/battle.js     (+862 – battleStep automat, battleTick sub-step, createBattleState, resolveBattleOutcome, startBattle, banditRaid, obranná AI)
src/core/balance/formulas.js   (battleDamage/Defense/revivePlayer/reviveAI 1:1 orig)
src/core/commands/battleCommand.js
src/core/balance/balance.js (BALANCE.battle), src/app/main.js (boot wiring), src/core/systems/world.js (startBattle invaze)
src/ui/screens.js (BattleScreen), selectors.js (selectBattle/selectBattleLog), App.js (tab), OfflineSummary.js (battleLog), styles.css
test/m7b-battle-t1.test.js, m7b-battle-t3.test.js, m7b-battle-t4.test.js, ui-selectors-battle-t5.test.js
```
Diff: `git diff 0c4635e..HEAD -- src/ test/m7b-* test/ui-selectors-battle-t5.test.js`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Kontrakt §8.1 beze změny signatury**: `battleStep(bs, commands, rng)` + BattleState top-level klíče beze změny.
2. **Serializovatelnost (F-1, kill-resume)**: `state.battle` plně serializovatelný — **žádné cyklické reference** (army self-ref), žádné objektové `liege`/`lastAttack` → `liege: string`, `lastAttackId: string|null`, žádné funkce/closury. Save uprostřed bitvy → load → bit-identické. Ověř JSON round-trip.
3. **G2 auto-resolve == live**: `battle.tick` periodic `every:'step'` → `advance()` I `runCatchupBatch()` volají identický `step()`; offline = prázdná queue → obranná AI. **Žádná druhá implementace.** Ověř proti kódu (tickOrder battle.tick, catchup cesta).
4. **Determinismus 1:1 originál**: jediný `rng('battle')`; pevné pořadí kroků/útoků; `Math.random`→`rng.next()`.
   - **M-1 baseRevival**: `?? BALANCE.battle.baseRevivalDefault` (NE `||`), žádný NaN.
   - **M-2 cd double-decrement**: opponent AI `cd--` PO attackWith KAŽDÝ tick (warriors→archers, 1:1 orig); player jen 1×.
   - **M-3 crit rng**: přesně 1× per provedený útok s focus PO guardu.
5. **battle.js stub plně nahrazen**: žádný no-op zbytek; `startBattle` (M7a-2 invaze) naplněn; banditRaid scheduled.
6. **UI bez logiky**: BattleScreen pure; deriváty (cdPct/progress) v selektorech.

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu).
2. **Soulad s designem** `context/refs/design_iter-018.md` (vč. T-002a revize §6.1a/§7.3/§4/§8.1a) a architekturou (§8.1, K8/D8/G2). Odchylky označ.
3. **Reuse/simplify/mrtvý kód** (soubor:řádek + návrh). Zejm. M8 stuby (warningAIAttacking/loadImportantEvent) jasně označené no-op?
4. **Persist/migrace**: state.battle round-trip; staré savy (battle null → guard)?
5. **Živé artefakty**: tickOrder doc + diagram (battle.tick step order 30, banditRaid schedule, gatherTributes — aktuální).
6. **Gapy** (G-MILITARY-STATS, baseRevival approx, G-AIBATTLE-DEDUP) korektně označené + v gap-reportu? Schválené tom-proxy — neflaguj jako blocker.
7. **DoD M7 celkově**: AI svět (zóny+frakce+jednotky+trh+revolty/questy/tribute) + bitvy (live battleCommand + offline auto-resolve + invaze/bandité). Stuby z M2a (world.js + battle.js) plně nahrazeny. Milník M7 kompletní?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M7** + determinismu (replay, kill-resume, G2).

## Inputs
- Design: `context/refs/design_iter-018.md`; QA: `context/refs/qa_report_iter-018_T-008.md`; DR-018-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.1, K8/D8/G2)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-018_T-004..T-007.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-018_T-009.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-009 "<verdikt + DoD M7 + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus bitvy (replay, kill-resume serializovatelnost, G2 auto-resolve == live) + 1:1 originál (cd/crit/revival) prověř obzvlášť pečlivě — ověřuj proti kódu.
