# Iteration Plan: iter-019

- **Created**: 2026-06-15
- **Goal**: M8 – Příběh & meta vrstva: importantEvent systém + story progres, intro/tutoriál + dialogy, achievementy deklarativně (K18), notifikace/gamelog (efemérní UI event bus). Dle master plánu §3/iter-016(M8). Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Detailní design M8 dle master plánu §3/iter-016(M8) + architektury §3.4 (engine-stopping eventy/acknowledge), §7.2 (achievementy deklarativně K18), K14 (registr efektů, obsah jako data), D10 (catch-up pauza): (1) importantEvent systém + story progres ve stavu (story.*), engine-stopping eventy jako doménová událost + acknowledgeEvent command, interakce s catch-up pauzou; (2) intro/tutoriál + dialogy (obsah jako data přes registr efektů K14, vlastní texty – R-G licence); (3) achievementy deklarativně {id, when: predicate-as-data}, vyhodnocení na denním ticku + tx/doménových událostech, unlock mechanismus; (4) notifikace/confetti/hudba/devlog: efemérní UI event bus (engine NIKDY nesahá na DOM), gamelog ring buffer UI. Determinismus/catch-up-safe. Rozhodnout split. Výstup: design doc
- [ ] T-002: reviewer – Review designu M8 (achievementy deklarativní bez imperativních háčků rozsetých po mechanikách C4, engine-stopping eventy serializovatelné + acknowledge, UI event bus efemérní mimo determinismus, story progres persist, soulad s architekturou) + posouzení splitu
- [ ] T-003: tom-proxy – Human gate: schválení M8 designu + R-G (vlastní texty intro/dialogy, ne 1:1 převzetí originálu) (mandát dle DR-013-00)
- [ ] T-004..T-00x: coder – implementační tasky dle schváleného designu/splitu (orchestrátor doplní po T-003: importantEvent+story, intro/tutoriál+dialogy, achievementy K18, notifikace/gamelog UI)
- [ ] T-TEST: tester – Test loop M8 (sada §1.3): story event uprostřed catch-upu (pauza→pokračování), achievementy deterministické + save round-trip, tutoriál e2e, gamelog/notifikace UI bez chyb, M8 nerozbil M7/M5/M6, plné `npm run ci` + `npm run smoke`
- [ ] T-REV: reviewer – Review gate M8: DoD bod po bodu, žádné imperativní achievement háčky rozseté po mechanikách (C4), texty bez 1:1 převzetí (R-G evidence), engine nikdy nesahá na DOM, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-CLOSE: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → **M8 hotov** (obsahová vrstva kompletní)

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
