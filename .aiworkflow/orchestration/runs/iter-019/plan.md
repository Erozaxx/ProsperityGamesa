# Iteration Plan: iter-019

- **Created**: 2026-06-15
- **Goal**: M8 – Příběh & meta vrstva: importantEvent systém + story progres, intro/tutoriál + dialogy, achievementy deklarativně (K18), notifikace/gamelog (efemérní UI event bus). Dle master plánu §3/iter-016(M8). Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M8 hotový (design_iter-019_T-001.md, 517ř). M8=naplnění existujících slotů (state.story/achievements/log už persistované, engine-stopping running===false už v advance()+runCatchupBatch()). T1 importantEvent engine-stopping (acknowledgeEvent command, catch-up pauza D10 interrupted+remaining, advance() zahodí akumulátor=jediná core změna); T3 achievementy deklarativní K18 (jeden centrální evaluator, ZERO imperativní háčky C4 fix grep gate, sdílený predicate.js se story triggery); T4 UI event bus EFEMÉRNÍ (ctx.emitEvent mimo state→mimo hashState), gamelog=state.log+UI panel; R-G vlastní/parafráze texty provenance:'original-paraphrased'. SPLIT NE. tickOrder: story.check(day90)/achievements.eval(day95)/story.applyEffects(step5). [orig]
- [x] T-002: reviewer – Review designu M8: GO (bez podmínek); split NE (souhlas). C4 fix správný (originál JE C4-vadný events.js:88/96, design ho neopakuje – deklarativní predikáty+centrální evaluator, grep gate čistý), engine-stopping/catch-up pauza správná (running===false break existuje, advance() akumulátor zahození nutné+správné, state.story plain-data, ack nelosuje RNG), UI bus efemérní (emitEvent mimo state/hashState). 0 blocker/1 major/4 minor/4 nit = impl poznámky. MAJ-1 catch-up re-vstup while-smyčka main.js NOVÝ kód (autosave/offline přesunout za smyčku); MIN-2 effects stuby console.log→mutace; MIN-4 evalPredicate bez process.env větve. Viz DR-019-01
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (jménem uživatele): M8 obsahová vrstva OK, R-G vlastní/parafráze texty OK (finální licence M9b), achievementy deklarativní C4 fix OK, UI event bus efemérní OK. Bez eskalace → implementace M8 běží
- [x] T-004: coder – T1 hotový [zachráněno – duplicitní spawny, a14f41df verze]: story.js (storyCheck day90/applyEffects step5), acknowledgeEvent (nelosuje RNG), predicate.js (sdílí T3), story.json 12 eventů (R-G CZ texty), clock.js advance akumulátor-zahození, main.js MAJ-1 while-smyčka, TickContext.emitEvent? stub. ci 1426/1426, determinismus G1+M7+M5/M6 nedotčen, 41 testů (engine-stop/ack/save round-trip/catch-up pauza/RNG)
- [x] T-005: coder – T3 hotový: achievements.js (achievementsEval centrální day:95 + unlockAchievement jediné místo zápisu, C4 fix grep čistý 2 meta-testy), 15 achievementů when:predicate-as-data (R-G parafráze); MIN-2 effects reálná mutace, MIN-4 bez process.env, predicate.js sdílený. ci 1467/1467, determinismus+M8 story+M7/M5/M6 nedotčen, 41 testů
- [x] T-006: coder – T2+T4 hotový [ověřeno orchestrátorem]: T2 startTutorial/setStoryFlag efekty K14 + advanceTutorial/dismissTutorial commandy, dialogues.json/tutorials.json (R-G provenance:'original-paraphrased'), tutorials/dialogues v CATALOG_NAMES+schemas; T4 uiEventBus.js (createUiEventBus push/drain/aggregate MIMO state), ctx.emitEvent wiring main.js (drain+aggregate v catch-upu), GamelogScreen.js (tab Deník ring buffer + StoryEventOverlay + TutorialOverlay), selektory selectLog/selectTutorial/selectAchievements/selectActiveStoryEvent, OfflineSummary uiEventCounts. **ci 1509/1509** (typecheck OK), **smoke OK** (tab Deník render, 0 console err), **emitEvent NEMĚNÍ hashState** (T4-1 test h1==h2 s/bez busu = efemérní), žádný DOM/Date.now/Math.random v core, C4 grep čistý, M8/M7/M5/M6 nedotčen, 42 testů, precache regen
- [x] T-007: tester – **GO (DoD M8), 11/11 AC PASS / 0 FAIL** [empiricky vlastní harness]: ci 1509/0 (typecheck EXIT 0) + smoke 0 err (tab Deník); emitEvent EFEMÉRNÍ (H1 400 kroků hashState identický s/bez busu=2274103360, core bez DOM); story save mid-event bit-identický (H2 hash 647467080, deepStrictEqual) + ack NELOSUJE RNG (H3); catch-up MAJ-1 while-smyčka (main.js:370-395, autosave za smyčkou); achievementy idempotentní (H4) + reálná mutace MIN-2 (H5 wood 0→7, unlockMap) + persist (H6); C4 grep čistý (jediné `unlocked[]=` v achievements.js:61); R-G provenance 4 soubory, 0 verbatim shod s events.js; regrese M7/M5/M6/M4 292+302/0. Pozn (NE bug): onUnlock:[] prázdné u 15 ach (efekty funkční, kalibrace M9)
- [x] T-008: reviewer – **GO-s-podmínkami (DoD M8 SPLNĚN)** [statické review proti kódu]: všechny tvrdé invarianty PASS (C4 grep čistý jediný `unlocked[id]=` achievements.js:61; emitEvent efemérní bus v closure mimo state/hashState, core bez DOM, T4-1 reálný; D10 serializovatelnost state.story plain-data + speakerId string + ack nelosuje RNG + advance akumulátor-zahození; MAJ-1 while-smyčka main.js:370-395 autosave za smyčkou). Nálezy 0 blocker/1 major/2 minor/3 nit. **MAJOR-1 (firstStarve dead trigger home.food.starvation neexistoval) → OPRAVENO v M8 orchestrátorem** (mirror diseaseActive: createHomeState init false + food.js set starved>0 + persistSchema food+starvation + types; regrese test m8-firststarve.test.js FS-1..5; ci 1514/1514, precache regen). MINOR-1/2 (survivedWinter once, chained event skip loadStoryEvent) + 3 nit → carry M9
- [ ] T-009: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → **M8 hotov** (obsahová vrstva kompletní)

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-REV
- [ ] QA validace (Tester) – T-TEST
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M8)
- Obsahová vrstva kompletní: hra má začátek (intro/tutoriál), vedení hráče (story/importantEvent + acknowledge), meta-progres (achievementy K18), notifikace/gamelog.
- Achievementy deklarativní (žádné imperativní háčky rozseté po mechanikách); engine-stopping eventy serializovatelné; UI event bus efemérní (engine nesahá na DOM).
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe (story pauza) nedotčen.
- Vlastní texty (R-G), žádné 1:1 převzetí originálu.
- Reviewer GO.

## Decisions Made This Iteration
- DR-013-00 / DR-016-01: posun číslování, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-016(M8), architektura §3.4 (engine-stopping eventy), §7.2 (achievementy K18), K14 (registr efektů), D10 (catch-up pauza), achievements.json (extracted), originál events.js/game.js (story/achievement zdroj).
- M8 = poslední obsahová vrstva; M9 = kalibrace + release.
- Carry-overy na M9: G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 player-ATTACKING větev (z M7b) – kalibrace/cleanup.
- LL-005 (monitor živost přes working-tree mtime), LL-006 (duplicitní spawny + ověřuj proti CI/working-tree ne tvrzení).
