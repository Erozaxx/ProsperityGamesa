# Brief

- **Brief ID**: BRIEF-017-008
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-008 (reviewer) — **review gate M7a-2 + DoD M7a** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Závěrečný **review gate M7a-2** (master plán §1.4, právo re-run) + ověření **DoD M7a** (celý milník: zóny/jednotky/trh z M7a-1 + frakční AI/revolty/questy/UI z M7a-2). QA (T-007) dala GO empiricky; ty hodnotíš correctness + kvalitu + invarianty. Přísně prověř **determinismus frakčního automatu** (processAI replay, self-rearm bez load-only/init-only větve, favour migrace bez M7a-1 regrese — DR-012-02) a `battle.js NEDOTČEN`.

## Rozsah review (produkční diff M7a-2)
Base→HEAD: `bbaf10e..HEAD` (jen iter-017). Klíčové soubory:
```
src/core/systems/world.js     (+858 – processAI automat, processFaction self-rearm, armFactionAI per-faction guard, registerWorldEffects, processRevolt, processQuestGen, gatherTributes, migrateFavour)
src/core/balance/formulas.js  (aiBattleResolve 1:1 originál)
src/core/commands/quests.js   (acceptQuest/rejectQuest)
src/core/engine/tickOrder.js (gatherTributes month 25), src/app/main.js (boot wiring), src/save/persistSchema.js (favour)
src/ui/screens.js (WorldZonesScreen), selectors.js (selectWorldZones/Factions/Quests), App.js (tab), styles.css
test/m7a2-world-t2.test.js, m7a2-world-t3.test.js, ui-selectors-world-t6.test.js
```
Diff: `git diff bbaf10e..HEAD -- src/ test/m7a2-* test/ui-selectors-world-t6.test.js`

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **processAI determinismus**: AISTATES 0–7 automat 1:1; jediný `rng('world')` (žádný Math.random/Date.now/DOM v core); replay (stejný seed → stejné přechody). `faction.state` persistován.
2. **Self-rearm bez load-only/init-only větve (DR-012-02)**: `world.processFaction{factionId}` se re-schedulí **nepodmíněně**; `armFactionAI` **per-faction set-difference guard** (scan dle `params.factionId`, NE `scheduleCountOf`); volaný JEDNOU z bootSequence; pokrývá fresh/plný/částečný/starý-save. Ověř všechny call-sites.
3. **favour migrace bez M7a-1 regrese**: `migrateFavour` number→{} deterministicky; `persistSchema` favour typeof guard; fresh-vs-load identický; M7a-1 round-trip (m7a-world-t1) nedotčen. Ověř, že migrace nezavádí load-only drift.
4. **AI-AI bitvy vzorcem**: `aiBattleResolve` formulas.js (1:1 originál, rng param); **`battle.js` NEDOTČEN** (ověř git/diff); AI-vs-player → `scheduleInsert('startBattle')` stub M7b.
5. **Questy/tribute determinismus**: questy (questSeq, rng world, **absolutní** deadlineStep, gating přes existující pole settlementLevel/totWarriors+totArchers); tribute gatherTributes month 25. Persist (world.quests/questSeq, favour). Deriváty se neukládají.
6. **UI bez logiky**: WorldZonesScreen pure; ratingy/daysLeft v selektorech, ne v komponentách.

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu, ne tvrzení).
2. **Soulad s designem** `context/refs/design_iter-017.md` (vč. T-002a revize §3.1/§2.4/§5.1) a architekturou (§8.2, §8, K16/K17). Odchylky označ.
3. **Reuse/simplify/mrtvý kód** (soubor:řádek + návrh). Zejm. M7b/M8 stuby (startBattle/warning/danger/loadImportantEvent) — jasně označené no-op?
4. **Persist/migrace**: nová pole (world.factions state, world.quests/questSeq, favour objekt) — staré savy OK (migrace/undefined-guard)? Derivovaná se neukládají?
5. **Živé artefakty**: tickOrder doc + diagram aktuální (gatherTributes month 25, processFaction schedule).
6. **Gapy** (G-FAVOUR-SHAPE, G-CAPITAL-MISMATCH, G-QUEST-PERSIST, G-WORLD-*) korektně označené + v gap-reportu? Schválené tom-proxy — neflaguj jako blocker, jen ověř dokumentaci.
7. **DoD M7a celkově**: AI svět tiká deterministicky (zóny + frakce mění politiky/útočí + jednotky + napojení trhu); revolty/questy/tribute; UI. Milník kompletní?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M7a** + determinismu (processAI replay, self-rearm, favour migrace).

## Inputs
- Design: `context/refs/design_iter-017.md`; QA: `context/refs/qa_report_iter-017_T-007.md`; DR-017-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2, §8, K16/K17)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-017_T-004..T-006.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-017_T-008.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-008 "<verdikt + DoD M7a + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus frakčního automatu (processAI replay, armFactionAI self-rearm, favour migrace) + battle.js NEDOTČEN prověř obzvlášť pečlivě — ověřuj proti kódu.
