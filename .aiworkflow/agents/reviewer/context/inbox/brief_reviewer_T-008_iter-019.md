# Brief

- **Brief ID**: BRIEF-019-008
- **Iteration**: iter-019 (M8 – Příběh & meta vrstva)
- **Task**: T-008 (reviewer) — **review gate M8 + DoD M8** (Opus)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Závěrečný **review gate M8** (poslední obsahová vrstva) + ověření **DoD M8** (importantEvent/story + intro/tutoriál + achievementy K18 + notifikace/gamelog). QA (T-007) dala verdikt empiricky; ty hodnotíš correctness + kvalitu + invarianty proti KÓDU. Přísně prověř **C4 anti-pattern fix** (achievementy/story deklarativní, žádné imperativní háčky), **engine-stopping serializovatelnost + catch-up pauza** (D10/MAJ-1), a **UI event bus EFEMÉRNÍ** (emitEvent mimo hashState, engine nesahá na DOM).

## Rozsah review (produkční diff M8)
Base→HEAD: `adef6d3..HEAD` (jen iter-019). Diff: `git diff adef6d3..HEAD -- src/ test/`
Klíčové soubory:
```
src/core/systems/story.js        (storyCheck day90, storyApplyEffects step5, loadStoryEvent)
src/core/systems/achievements.js (achievementsEval day95, unlockAchievement — JEDINÉ místo zápisu unlocked[)
src/core/systems/predicate.js    (evalPredicate sdílený story+achievementy)
src/core/commands/story.js       (acknowledgeEvent, advanceTutorial, dismissTutorial)
src/core/registry/effects.js     (unlockMap/grantResource REÁLNÁ mutace MIN-2; startTutorial/setStoryFlag K14)
src/app/uiEventBus.js            (createUiEventBus push/drain, aggregateUiEvents — EFEMÉRNÍ MIMO state)
src/app/main.js                  (ctx.emitEvent wiring, MAJ-1 catch-up while-smyčka, drain/aggregate)
src/core/engine/clock.js         (advance() zahodí akumulátor při running===false)
src/data/story.json, achievements.json, dialogues.json, tutorials.json (R-G original-paraphrased)
src/app/catalogs.js, src/core/catalog/schemas.js (story/tutorials/dialogues katalogy)
src/ui/GamelogScreen.js, selectors.js, App.js (tab Deník), OfflineSummary.js (uiEventCounts)
test/m8-story.test.js, m8-achievements.test.js, m8-t2t4.test.js
```

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **C4 fix (KLÍČOVÉ)**: achievementy/story = deklarativní predikáty (`when: predicate-as-data`) vyhodnocené JEDNÍM centrálním evaluatorem. **Grep gate**: přiřazení `unlocked[`/`achievements.unlocked[` = `true/value` JEN v `unlockAchievement` (nikde jinde po mechanikách). Ověř, že nezavádí imperativní achievement/story háčky do existujících systémů. (Pozn.: `buildings.js` čtení `unlocked[techId]` = tech-unlock READ, NE achievement write — OK.)
2. **emitEvent EFEMÉRNÍ (KLÍČOVÉ)**: `ctx.emitEvent` push do fronty MIMO `state` → MIMO `hashState`, neukládá se. Engine NIKDY nesahá na DOM (žádný document/window v core). Ověř T4-1 test reálně porovnává hashState s/bez busu. Bus listener volán optional (`ctx.emitEvent?.()`) → core funguje bez busu.
3. **Engine-stopping serializovatelnost (D10)**: `state.story.*` plain-data (žádné closury/funkce/katalog-ref; speaker resolve v selektoru). Save UPROSTŘED eventu → load bit-identický. `acknowledgeEvent` NELOSUJE RNG (stream nezměněn). `advance()` zahodí akumulátor při running===false (jediná core změna engine).
4. **Catch-up pauza MAJ-1 (D10)**: main.js while-smyčka re-vstupu `runCatchupBatch` s `remaining` (engine-stopping event uprostřed → smyčka skončí → čeká na ack → po acku pokračuje); **autosave/buildOfflineSummary AŽ ZA smyčkou**; cap NEporušen. Catch-up agreguje UI eventy do offline summary (ne spam).
5. **Determinismus**: achievementy idempotentní (stejný stav → žádný re-unlock); jediný evaluator; žádný Date.now/Math.random/DOM v core. unlock efekt REÁLNÁ mutace (MIN-2, ne console.log stub).
6. **UI bez logiky**: GamelogScreen/overlays pure; deriváty v selektorech (selectLog/selectTutorial/selectAchievements/selectActiveStoryEvent).

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu, ne tvrzení).
2. **Soulad s designem** `context/refs/design_iter-019.md` (T1–T4) + architekturou (§3.4 engine-stopping, §7.2 K18, K14, D10, C4). Odchylky označ.
3. **R-G**: story/dialogues/tutorials/achievements texty vlastní/parafráze (`_meta.provenance:'original-paraphrased'`), NE 1:1 originál (porovnej namátkou s events.js/game.js — struktura/IDs/čísla OK, znění ne). Finální licence = M9b (neflaguj jako blocker teď).
4. **Reuse/simplify/mrtvý kód** (soubor:řádek + návrh).
5. **Persist/migrace**: story/achievements/tutorials/log round-trip; staré savy (guard na chybějící klíče)?
6. **Živé artefakty**: tickOrder doc + diagram (story.check day90, achievements.eval day95, story.applyEffects step5 — aktuální, append na konec bez přeskupení).
7. **DoD M8 celkově**: hra má začátek (intro/tutoriál), vedení hráče (story/importantEvent + acknowledge), meta-progres (achievementy K18), notifikace/gamelog. Obsahová vrstva KOMPLETNÍ a hratelná.

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M8** + C4 fix + engine-stopping/catch-up pauza determinismu + UI event bus efemérnosti.

## Inputs
- Design: `context/refs/design_iter-019.md`; QA: `context/refs/qa_report_iter-019_T-007.md` (zkopíruj z tester artifacts pokud chybí); DR-019-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§3.4, §7.2, K14, K18, D10, C4)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-019_T-004..T-006.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-019_T-008.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-008 "<verdikt + DoD M8 + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- C4 fix (deklarativní, grep gate) + engine-stopping serializovatelnost/catch-up pauza + UI event bus efemérnost (emitEvent mimo hashState, engine nesahá na DOM) prověř obzvlášť pečlivě — ověřuj proti kódu. Toto jsou nejrizikovější body.
