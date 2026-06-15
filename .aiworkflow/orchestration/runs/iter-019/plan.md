# Iteration Plan: iter-019

- **Created**: 2026-06-15
- **Goal**: M8 – Příběh & meta vrstva: importantEvent systém + story progres, intro/tutoriál + dialogy, achievementy deklarativně (K18), notifikace/gamelog (efemérní UI event bus). Dle master plánu §3/iter-016(M8). Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M8 hotový (design_iter-019_T-001.md, 517ř). M8=naplnění existujících slotů (state.story/achievements/log už persistované, engine-stopping running===false už v advance()+runCatchupBatch()). T1 importantEvent engine-stopping (acknowledgeEvent command, catch-up pauza D10 interrupted+remaining, advance() zahodí akumulátor=jediná core změna); T3 achievementy deklarativní K18 (jeden centrální evaluator, ZERO imperativní háčky C4 fix grep gate, sdílený predicate.js se story triggery); T4 UI event bus EFEMÉRNÍ (ctx.emitEvent mimo state→mimo hashState), gamelog=state.log+UI panel; R-G vlastní/parafráze texty provenance:'original-paraphrased'. SPLIT NE. tickOrder: story.check(day90)/achievements.eval(day95)/story.applyEffects(step5). [orig]
- [x] T-002: reviewer – Review designu M8: GO (bez podmínek); split NE (souhlas). C4 fix správný (originál JE C4-vadný events.js:88/96, design ho neopakuje – deklarativní predikáty+centrální evaluator, grep gate čistý), engine-stopping/catch-up pauza správná (running===false break existuje, advance() akumulátor zahození nutné+správné, state.story plain-data, ack nelosuje RNG), UI bus efemérní (emitEvent mimo state/hashState). 0 blocker/1 major/4 minor/4 nit = impl poznámky. MAJ-1 catch-up re-vstup while-smyčka main.js NOVÝ kód (autosave/offline přesunout za smyčku); MIN-2 effects stuby console.log→mutace; MIN-4 evalPredicate bez process.env větve. Viz DR-019-01
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (jménem uživatele): M8 obsahová vrstva OK, R-G vlastní/parafráze texty OK (finální licence M9b), achievementy deklarativní C4 fix OK, UI event bus efemérní OK. Bez eskalace → implementace M8 běží
- [ ] T-004: coder – T1: importantEvent + story progres. state.story.* (event/queue/used/lines/tutorials/pendingEffects serializovatelné plain-data), engine-stopping eventy přes existující running===false break + acknowledgeEvent command; advance() zahodí akumulátor při running===false (jediná core změna); MAJ-1 catch-up re-vstup while-smyčka v main.js (runCatchupBatch interrupted→remaining, autosave/buildOfflineSummary PŘESUNOUT ZA smyčku); story.check (day order 90) + story.applyEffects (step order 5); persist. Determinismus (ack nelosuje RNG, save uprostřed eventu→identický load)
- [ ] T-005: coder – T3: achievementy deklarativně K18. achievements.json + when:predicate-as-data; JEDEN centrální evaluator achievementsEval (day order 95) + tx přes ctx.emitTx; sdílený predicate.js (evalPredicate, MIN-4 bez process.env větve v core); ZERO imperativní háčky (C4, grep gate unlocked[ jen v unlockAchievement); MIN-2 effects.js stuby unlockMap/grantResource přepsat na REÁLNOU mutaci; state.achievements persist + unlock mechanismus
- [ ] T-006: coder – T2+T4: intro/tutoriál + dialogy (obsah jako data přes K14, VLASTNÍ/parafráze texty story.json/dialogues.json/tutorials.json provenance:'original-paraphrased', R-G) + notifikace/gamelog (efemérní UI event bus ctx.emitEvent vzor emitTx mimo state/hashState, engine NEsahá na DOM; gamelog panel nad existující state.log ring buffer; catch-up agreguje do offline summary). UI selektory+commands žádná logika v UI
- [ ] T-007: tester – Test loop M8 + DoD M8 (sada §1.3): story event uprostřed catch-upu (pauza→ack→pokračování bit-identické, cap neporušen), achievementy deterministické + idempotentní + save round-trip, tutoriál e2e, UI event bus efemérní (mimo hashState), gamelog/notifikace render bez chyb, žádné imperativní achievement háčky (grep), M8 nerozbil M7/M5/M6, plné npm run ci + smoke
- [ ] T-008: reviewer – Review gate M8 + DoD M8: žádné imperativní achievement háčky rozseté po mechanikách (C4 grep), texty vlastní/parafráze ne 1:1 originál (R-G evidence), engine nikdy nesahá na DOM (UI bus mimo hashState), engine-stopping eventy serializovatelné, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
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
