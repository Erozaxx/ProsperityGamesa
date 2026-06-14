# Current Task

- **Task ID**: T-008 (REVIEW GATE M7a-2 + DoD M7a — frakční automat/revolty/questy/tribute/UI, Opus)
- **Brief**: BRIEF-017-008
- **Iteration**: iter-017
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: Závěrečný REVIEW GATE M7a-2 + ověření DoD M7a (celý milník) PROTI KÓDU. QA (T-007) dala GO empiricky.
Ověřeno proti kódu: processAI 0–7 (world.js:905–1139, jediný rng 'world', scheduleInsert, faction.state persist); processFaction nepodmíněný re-arm (world.js:1166–1168); armFactionAI set-difference guard (world.js:1245–1263, scheduleCountOf NEPOUŽITO), call-site JEDNOU z bootSequence (main.js:208); migrateFavour 4 větve (world.js:584–592) + persistSchema typeof guard (persistSchema.js:259); aiBattleResolve (formulas.js:380, 1:1 originál); battle.js NEDOTČEN (git: poslední commit iter-007 b7d638a); questy absolutní deadline + questSeq + persist; gatherTributes month order 25 (tickOrder.js:219); UI selektory ratingy/daysLeft on-demand.
Vlastní běh testů: 110/110 PASS (t2/t3/t6/t1).

## Výsledek
Verdikt: **GO**. DoD M7a **SPLNĚNO**. Determinismus (processAI replay, self-rearm, favour migrace) POTVRZEN proti kódu. battle.js NEDOTČEN.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 4 (F-1 zones.json favour stále number=0, ale migrateFavour absorbuje → fresh==load drží + QA tvrzení nepřesné; F-2 aiBattleResolve duplicita formulas.js vs inline processAI; F-3 docs/tickOrder.md neaktualizován o gatherTributes/handlery — gate §9.1; F-4 quests persist přes generický shallow fallback)
- NIT: 1 (F-5 stuby jasně označené no-op — potvrzení)

Doporučeno před close: doplnit F-3 (tickOrder.md). F-1/F-2/F-4 → M9.

Výstup: agents/reviewer/artifacts/final/review_iter-017_T-008.md

## NEcommitnuto (per brief).
