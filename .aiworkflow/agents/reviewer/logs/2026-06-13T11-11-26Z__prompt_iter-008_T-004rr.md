# Brief (RE-REVIEW round 2 – po opravě 4 blockerů)
- **Brief ID**: BRIEF-031rr
- **Iteration**: iter-008 (M2b)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Re-review iter-008 (M2b) po opravě B-1..B-4. Ověř, že DoD M2 je nyní reálně splněno (offline progres funguje v boot cestě, ne jen unit). Verdikt GO / RE-RUN.
## Co se opravilo (round 1)
- B-1: main.js → bootSequence(env): katalogy → loadGame(slot,catalog) → loadAndReconstruct.
- B-2: po loadu missedMs → runCatchupBatch (chunky/yield/cap) → offline summary.
- B-3: createAutosave napojen (60s periodic + visibilitychange/pagehide 'hide' bypass); raw saveGame odstraněn.
- B-4: export/import + OfflineSummary/CatchupProgress zapojeny v UI přes getExtraProps.
- S-6: export jako envelope (lastSimTimestamp). Integrační test test/boot-integration.test.js (12 testů).
## Scope IN
- OVĚŘ, že B-1..B-4 jsou reálně vyřešené v src/app/main.js (bootSequence) – ne jen unit bloky.
- Integrační test boot cesty skutečně exercituje wiring (selže, kdyby chyběl)?
- DoD M2: offline progres se dopočítá po návratu vč. capu/summary; autosave; export/import. catch-up=týž kód jako live, G1.
- Spusť `npm run ci` (musí být zelené).
## Inputs
- src/app/main.js, src/app/*, src/core/engine/catchup.js, test/boot-integration.test.js; předchozí review review_iter-008_T-004.md; impl note; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; pokud GO, potvrď že DoD M2 (offline progres v reálné appce) je splněno.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-008_T-004rr.md
