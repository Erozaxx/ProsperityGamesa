# Current Task

- **Task ID**: T-004 (review gate, RE-REVIEW round 2)
- **Brief**: BRIEF-035rr
- **Iteration**: iter-009 (M3)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: RE-REVIEW round 2 iter-009 (M3 = DoD M3) po opravě 2 blockerů + S-1.
Výstup: agents/reviewer/artifacts/final/review_iter-009_T-004rr.md

## Výsledek
Verdikt: **GO**.

Opraveno ověřeno:
- B-1: assignJob/startSkill registrované v bootstrapEngine (main.js:83-85) + ctx.catalog naplněn v runtime přes buildCtxCatalog (jobs/skills/houseTypes/food). Systémy reálně čtou ctx.catalog (jobs.js:31/46, skills.js:29). Regresní testy v boot-integration.test.js (blok BLOCKER-1) – selhaly by jinak.
- B-2: UI screens.js (Forest/Jobs/Skills) + selektory (selectJobs/selectSkills/selectWorkforce/selectWorld) + záložky v App.js napojené na send(assignJob/startSkill); produkční smyčka hratelná end-to-end. Žádný scope change nebyl potřeba.
- S-1: forest fire jmenovatel = BALANCE.forest.maxTrees (328327) dle config.js:688 (forest.js:21,66).

DoD M3 reálně splněno; catch-up-safe nezhoršeno (stejný ctx v catchupBatch i live loop); core bez DOM (UI v src/ui/).
CI ověřeno: `npm run ci` ZELENÉ (tsc 0, lint:core OK, node --test 633/633).

## Zbylé (backlog, neblokují)
- NITPICK-1 timeSinceLastFire inkrement; NITPICK-2 startSkill cost/discovery (M5+ gapy).
- G-FOREST-TECHMODS (forester tech M5/M6). UI progress bar normalizace (kosmetické).

## Kód neměněn (scope OUT).
