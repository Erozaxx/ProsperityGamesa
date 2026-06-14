# Current Task

- **Task ID**: T-008 (Závěrečný REVIEW GATE M7a-1 — zóny/jednotky/napojení trhu, Opus)
- **Brief**: BRIEF-016-008
- **Iteration**: iter-016
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Závěrečný review gate M7a-1 PROTI KÓDU (diff afac3b9..HEAD). Ověřeno všech 6 tvrdých invariantů:
- M-1 round-robin REÁLNĚ tiká: world.js:343-360 gate `_absDay % slot===0` (ne mrtvý curStep%dist), bezstavový, _absDay persistovaný (season fully-saved).
- M-2 re-hydratace bez load-only větve: sdílená hydrateZones (world.js:373) z createInitialState (:141) i load Step 5 (load.js:317); id-based merge (ne Object.assign na pole); persist jen dynamika (persistSchema.js:248-286); zones/factions vyjmuty z generického world-merge (load.js:228-234); fresh==load hashState test PASS.
- §8.2: marketInject/getGoldValue signatury beze změny (market.js:91/103); inject(+)/drain(−)/clamp; world.tick(30)<market.drift(35) (tickOrder.js:204-205).
- battle.js NEDOTČEN (git diff prázdný).
- Jednotky: recruitUnit přes pay, reuse totWarriors/totArchers+upkeep.military (M4a), registerRecruitUnit (main.js:113).
- Determinismus: jediný rng('world'), žádný Math.random/Date.now/DOM v core, O(1)/den.
CI 1179/1179 PASS (nezávisle ověřeno), M7a suity 82/82 PASS.
Výstup: agents/reviewer/artifacts/final/review_iter-016_T-008.md

## Výsledek
Verdikt: **GO**. DoD M7a-1 **SPLNĚNO** (zóny+ekonomika, jednotky, napojení trhu; frakce=M7a-2).
Determinismus: round-robin reálně tiká (M-1 ✅), re-hydratace bez driftu/bez load-only větve (M-2 ✅).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 4 (calcMilitary/EconomicRating mrtvý kód world.js:299-328; goldDemand/goldProduction persist odchylka od §8 bez DR; homeZone mirror neimpl. + zavádějící komentář world.js:179; docs/tickOrder.md stale "STUB")
- NIT: 2 (immunity boolean vs >0 test; allies/allies_dyn dvojí klíč)

## NEcommitnuto (per brief).
