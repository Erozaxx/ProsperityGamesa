# Brief

- **Brief ID**: BRIEF-019-007
- **Iteration**: iter-019 (M8 – Příběh & meta vrstva)
- **Task**: T-007 (tester) — plný test loop M8 + **DoD M8 (komplet obsahová vrstva)**
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-15

## Goal
Nezávislá QA M8 (importantEvent/story + intro/tutoriál + achievementy K18 + notifikace/gamelog UI event bus). Ověřuj EMPIRICKY vlastním během. Přísný na **determinismus** (story engine-stopping save/load round-trip, achievementy idempotentní, **emitEvent EFEMÉRNÍ — NESMÍ ovlivnit hashState**) a že M8 nerozbil M7/M5/M6/M4.

## Co implementováno (T1–T4)
- **T1 (T-004)**: `story.js` (storyCheck day90, storyApplyEffects step5), `commands/story.js` (acknowledgeEvent — running=true+pendingEffects, NELOSUJE RNG), `predicate.js` (evalPredicate sdílený), `story.json` (12 eventů, R-G CZ parafráze), `clock.js` advance() zahodí akumulátor při running===false, main.js MAJ-1 while-smyčka catch-up re-vstup, TickContext.emitEvent? stub.
- **T3 (T-005)**: `achievements.js` (achievementsEval centrální day95 + unlockAchievement JEDINÉ místo zápisu `unlocked[`, C4 fix), `achievements.json` (15 ach. when:predicate-as-data, R-G parafráze, onUnlock:[]), effects.js `unlockMap`/`grantResource` REÁLNÁ mutace (MIN-2).
- **T2+T4 (T-006)**: intro/tutoriál+dialogy jako data (dialogues.json/tutorials.json, R-G parafráze, K14), `state.story.tutorials` progres+persist; `ctx.emitEvent` REÁLNÁ implementace (vzor emitTx, fronta MIMO state→MIMO hashState), gamelog UI panel nad state.log ring buffer, notifikace z emitEvent fronty, catch-up agreguje eventy do offline summary.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail, **typecheck projde**). **`npm run smoke`** OK (gamelog + tutoriál/intro UI renderuje, **0 console errors**).
2. **emitEvent EFEMÉRNÍ (KRITICKÉ)**: emitEvent volání během ticku/catch-upu **NESMÍ změnit hashState** (stejný stav s/bez emitEvent posluchače → identický hashState); fronta žije MIMO `state` → neukládá se (save/load round-trip identický). Engine NIKDY nesahá na DOM (žádný `document`/`window` v core).
3. **Story engine-stopping + save/load round-trip (KRITICKÉ)**: story event uprostřed běhu → running=false; **save UPROSTŘED eventu → load → bit-identické** (hashState/deepEqual); state.story plně serializovatelný (JSON round-trip, žádné closury/funkce/katalog-ref). `acknowledgeEvent` → running=true + pendingEffects, **NELOSUJE RNG** (stream nezměněn).
4. **Catch-up pauza D10 (KRITICKÉ)**: story event uprostřed offline catch-up dávky → interrupted → re-vstup `remaining` (MAJ-1 while-smyčka) → po acku pokračování **bit-identické**, **cap NEporušen**. autosave/buildOfflineSummary AŽ ZA smyčkou. Catch-up agreguje story/notifikace eventy do offline summary (ne spam toastů).
5. **Achievementy deterministické + idempotentní (KRITICKÉ)**: stejný stav → stejné unlocky; **žádný re-unlock** (idempotence); unlock efekt REÁLNÁ mutace (MIN-2: grantResource→store, unlockMap→unlockedMaps). `state.achievements.unlocked` persist round-trip.
6. **C4 grep gate**: přiřazení `unlocked[`/`achievements.unlocked[` JEN v `unlockAchievement` (nikde jinde po mechanikách). Žádné imperativní achievement/story háčky rozseté po systémech (grep důkaz).
7. **Tutoriál/intro e2e**: intro sekvence se spustí (úvodní eventy/tutoriál kroky), tutoriál progres ve `state.story.tutorials` postupuje a **persist** (round-trip). Texty jako data (K14), žádná herní logika v UI.
8. **R-G evidence**: story.json/dialogues.json/tutorials.json/achievements.json texty **vlastní/parafráze** (`_meta.provenance:'original-paraphrased'`), **NE 1:1 originál** (porovnej namátkou s originál events.js/game.js — struktura/triggery/IDs/čísla OK, znění ne).
9. **Gamelog/notifikace UI render**: gamelog panel renderuje nad state.log ring buffer (deterministický, persist); notifikace/toasty z emitEvent fronty; bez console chyb. UI = selektory+komponenty, žádná logika.
10. **M8 nerozbil M7/M5/M6/M4**: m7b-battle/m7a2-world + m5/m6/m4b + G1 (iter005-edge) + m8-story + m8-achievements nedotčené/zelené.
11. **DoD M8 celkově**: hra má začátek (intro/tutoriál), vedení hráče (story/importantEvent + acknowledge), meta-progres (achievementy K18), notifikace/gamelog. Obsahová vrstva KOMPLETNÍ a hratelná.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK.
- **Známé gapy (NE bug)**: balanc/kalibrace (market, offline cap), G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 player-ATTACKING — schválené, kalibrace M9.

## Acceptance Criteria (DoD M8)
- ci zelené (typecheck projde), smoke OK (gamelog/tutoriál UI renderuje, 0 console errors).
- emitEvent NEMĚNÍ hashState (efemérní); engine nesahá na DOM.
- Story save/load uprostřed eventu bit-identický; ack nelosuje RNG; catch-up pauza re-vstup bit-identický, cap neporušen.
- Achievementy deterministické + idempotentní; C4 grep čistý; unlock efekt reálná mutace; persist round-trip.
- Tutoriál/intro e2e + persist; R-G texty ne 1:1.
- M8 nerozbil M7/M5/M6/M4.
- Verdikt GO/NO-GO (DoD M8).

## Inputs
- Design: `context/refs/design_iter-019.md` (T1–T4), DR-019-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-019_T-004.md`, `..._T-005.md`, `..._T-006.md`
- Testy: `test/m8-story.test.js`, `test/m8-achievements.test.js`, T-006 nové testy (emitEvent efemérnost/gamelog/tutoriál), `test/iter005-edge.test.js`, m7b/m7a2/m5/m6/m4b sady
- Kód: `src/core/systems/story.js`/`achievements.js`/`predicate.js`, `src/core/commands/story.js`, `src/core/registry/effects.js`, `src/data/story.json`/`achievements.json`/`dialogues.json`/`tutorials.json`, `src/app/main.js` (ctx.emitEvent/emitTx, MAJ-1 while-smyčka), `src/ui/` (gamelog/tutoriál/notifikace), `src/save/persistSchema.js`, originál `events.js`/`game.js`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-019_T-007.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-007 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
