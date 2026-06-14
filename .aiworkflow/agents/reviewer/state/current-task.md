# Current Task

- **Task ID**: T-002 (REVIEW DESIGN M7a-2 — frakční automat/revolty/questy/tribute/UI, Opus)
- **Brief**: BRIEF-017-002
- **Iteration**: iter-017
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Review DESIGNu M7a-2 (před implementací) PROTI KÓDU + originálu world.js.
Ověřeno: armContractOffer vzor (contracts.js:262, main.js:199), scheduler indexace by-id (scheduler.js:82), hydrateZones/favour (world.js:335-417), persistSchema favour||0 (persistSchema.js:259), zones.json favour:number, load.js shared path, balance.world. Originál world.js: processAI ř.743-991, AI-AI bitva ř.952-984, revolt ř.282-369 (favour=OBJEKT), quest ř.371-487, gatherTributes ř.527-565 — ověřeno subagentem.

## Výsledek
Verdikt: **GO-S-PODMÍNKAMI** (M-1 favour migrace + M-2 set-difference guard).
- Self-rearm determinismus: vzor SPRÁVNÝ (nepodmíněný re-arm, boot-only arm, set-diff guard). DR-012-02 ošetřeno. Podmínka: set-difference guard závazný (scheduleCountOf nerozliší frakce — indexace by-id).
- favour migrace: RIZIKO REGRESE M7a-1 ANO, řešitelné — persistSchema.js:259 `|| 0`→`?? {}` + hydrateZones number→{} migrace; revolt nebyl v M7a-1 aktivní → nedestruktivní.
- Split NEsplit: SOUHLAS (kostra M7a-1 hotová, ověřeno proti kódu).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 2 (M-1 favour persist `||0` + hydrateZones migrace = regrese M7a-1; M-2 armFactionAI set-difference guard závazný)
- MINOR: 5 (state re-map ověř; redistributeForces jen AI-AI větev; state7 mimo enum; quest gating home.level/militaryCouncil chybí v state; capitalId schema validace)
- NIT: 3 (favour selektor undefined-safe; tribute order 25 OK; immunity flag nevyužit)

Výstup: agents/reviewer/artifacts/final/review_design_iter-017_T-002.md

## NEcommitnuto (per brief).
