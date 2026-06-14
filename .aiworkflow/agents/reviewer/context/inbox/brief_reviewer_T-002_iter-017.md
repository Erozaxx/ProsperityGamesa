# Brief

- **Brief ID**: BRIEF-017-002
- **Iteration**: iter-017 (M7a-2 – Frakční AI & svět ožívá)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Review **designu M7a-2** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (§8.2/§8/K16/K17), proveditelnost Sonnet coderem, a **determinismus frakčního automatu v dávce** (self-rearm bez load-only/init-only větve, replay — třída DR-012-02). Posuď **favour shape migraci** (G-FAVOUR-SHAPE) a split. Architektonický gate před tom-proxy.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-017_T-001.md`

## Na co se zaměřit (kritické)
1. **Self-rearm determinismus (DR-012-02)**: `world.processFaction{factionId}` se re-schedulí **nepodmíněně** (i pod prahem, i incapacitated) → schedule entry nikdy nezmizí. Boot/load arm přes `armFactionAI(state)` se **set-difference guardem** (doplní jen chybějící frakce proti živým entries), volaný JEDNOU z bootSequence (mirror `armContractOffer`). Ověř: **žádná load-only ani init-only větev**; `faction.state` persistován (replay jádro); fresh==load i save/load uprostřed AI aktivity → identický hashState. Ověř proti kódu (scheduleInsert/scheduleCountOf, contracts.js armContractOffer vzor, main.js bootSequence).
2. **processAI determinismus**: `processAI(state, factionId, rng('world'))` 1:1 z originálu; `Math.random→rng('world')`, `Engine.insert→scheduleInsert` (K17, params objekt, serializovatelný). Žádný Math.random/Date.now/DOM v core. Replay (stejný seed → stejné přechody AISTATES).
3. **favour shape migrace (G-FAVOUR-SHAPE)**: M7a-1 měl `favour` jako **number**, M7a-2 mění na **objekt** `{factionId:number}`. Migrace v `hydrateZones`. **KRITICKÉ**: ověř, že migrace nerozbije M7a-1 fresh-vs-load round-trip (staré savy s number favour → objekt deterministicky); že to neporušuje determinismus/hash stabilitu. Je to riziko regrese M7a-1 — prověř pečlivě.
4. **AI-AI bitvy vzorcem**: `aiBattleResolve` ve formulas.js (1:1 originál, rng param); `battle.js` NEDOTČEN; AI-vs-player → `scheduleInsert('startBattle')` M7b stub. Ověř, že design battle automat neimplementuje.
5. **Revolty/questy/tribute**: revolty gated `revoltMechanicStart` v processZone; questy deterministicky (`questSeq`, rng world, getGoldValue, **absolutní** deadlineStep); tribute `gatherTributes` month order 25. Persist (world.quests/questSeq, frakční stav).
6. **UI**: WorldZonesScreen + selektory — žádná logika v UI (ratingy/deriváty v selektorech).
7. **Split NE** — souhlasíš (T2 L + 2×M v jedné iteraci)? **Kontrakty §8/§8.2 beze změny signatur**; tickOrder dopady (gatherTributes month 25, processFaction schedule).

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení self-rearm determinismu + favour migrace (regrese M7a-1?) + splitu.

## Inputs
- Design: `context/refs/design_iter-017_T-001.md`
- M7a-1 design (favour shape, hydrateZones): `agents/architect/artifacts/final/design_iter-016_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2, §8, K16/K17)
- DR-016-01, DR-013-00
- Kód: `src/core/systems/world.js` (processZone, hydrateZones, favour), `src/core/systems/contracts.js` (armContractOffer vzor), `src/core/engine/` (scheduleInsert/scheduleCountOf), `src/app/main.js` (bootSequence), `src/save/`, `src/data/zones.json`, originál `world.js`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-017_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + favour migrace + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Self-rearm determinismus (armFactionAI, žádná load-only/init-only větev) + favour shape migrace (regrese M7a-1 round-trip) prověř obzvlášť pečlivě — ověřuj proti kódu. Toto jsou nejrizikovější body (DR-012-02 třída).
