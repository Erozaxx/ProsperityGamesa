# Current Task

- **Task ID**: T-001 (iter-016) — Detailní design M7a (AI svět: zóny, frakční AI, revolty/questy/tribute, jednotky, napojení trhu)
- **Brief**: context/inbox/brief_architect_T-001_iter-016.md (BRIEF-016-001)
- **Iteration**: iter-016 (M7a – AI svět & jednotky)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – design M7a (T1–T6) na úroveň pro Sonnet. Zdroj pravdy mechanik = originál world.js.
Žádný kód, žádná změna architektury iter-002 ani kontraktů §8 signatur.
**Platný výstup: `artifacts/final/design_iter-016_T-001.md`.**

## Klíčová rozhodnutí
- **D-SPLIT = ANO**: M7a-1 (iter-016a: T1 zone tick + T4 jednotky + T5 napojení trhu) /
  M7a-2 (iter-016b: T2 frakční automat + T3 revolty/questy/tribute/AI-AI bitvy + T6 UI).
  Důvod: T1 a T2 jsou dva nezávislé L celky; M7a-1 samostatně hratelné (precedent M5-1);
  2×L+3×M nad Sonnet kapacitu; izolace rizikového frakčního automatu pro samostatný review.
  DoD M7a se vyhodnotí po M7a-2.
- **Zone tick (T1)**: worldTick (day order 30, už registrován) → bezstavový round-robin
  (zoneIndex z curStep, přežije save/load) přes 5denní periodu → processZone(state,zoneId,rng('world')).
  Vzorce 1:1 z originálu (goldDemand 150×units, production 50×workers, policy switch) → balance.world.
- **Frakční automat (T2)**: AISTATES 0–7 jako data (zones.json.aiStates) + deterministická processAI;
  Math.random→rng('world'); Engine.insert→scheduleInsert (K17, serializovatelné); schedule self-rearm
  world.processFaction; gate aiMechanicStart. Vzor contracts.js (registr efektů + seq + RNG izolace).
- **AI-AI bitvy = RNG resolve VZORCEM** (formulas.aiBattleResolve, 1:1 orig ř.952–981), NE battle automat
  (M7b/iter-017, battle.js NEDOTČEN). AI-vs-player = scheduleInsert('startBattle') → M7b stub.
- **Jednotky (T4)**: player.totWarriors/totArchers UŽ existují, upkeep.military UŽ běží (M4a) → M7a-1
  jen recruitUnit command (gold z military.json) + zónové jednotky v persist. homeZone = mirror player.tot*.
- **Napojení trhu (T5)**: marketInject/getGoldValue BEZE ZMĚNY signatur (§8.2 kontrakt naplněn).
  Produkční zóny inject(+) produkce, válčící inject(−). worldTick (order 30) PŘED market.drift (35).
  Negativní S-06 → pozitivní kontrakt.
- **Determinismus/catch-up-safe**: jediný rng stream 'world' (existuje, žádný nový); 'battle' rezervován M7b;
  schedule one-shot serializovatelný; bezstavový round-robin; randRound deterministický; O(1) zone tick.
- **Persist (D8)**: world.zones/factions už v allowlistu (jen naplnit); ratingy/goldDemand/production
  derivované NEUKLÁDAT; re-hydratace static zón z katalogu na load (G-WORLD-ZONEHYDRATE).
- **tickOrder**: world.tick beze změny pozice (přestane být no-op); NOVÉ world.gatherTributes (month order 25,
  před upkeep.military 30); schedule handlery M7a-2 (registerWorldEffects vzor registerContractEffects).

## G-LISTZONE postup (resolved)
- **Resolved approximací, žádná eskalace** (DR Q3 autonomně). AISTATES 0–7 + capitals
  (dickinsonLanding/castleGrey/hornCastle) + faction names + vzorce = DOLOŽITELNÉ z originálu.
- Min. sada ~13 zón (capitals + princess region winisk/burwash/corbyville/lemieux/kitsilano +
  warlord region pointAnne/redWater/tomiko/silverInslet + homeZone). Topologie/targetWorkerNum/
  growth/stats/aggression = approximated (provenance flag, kalibrace M9).
- Wiring: zones schema + validátor + zones do CATALOG_NAMES (vzor M6 G-LISTTECHS).

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-016-001, DR-013-00 (renumbering), DR-013-01/DR-015-01
- [x] Master plán §3/iter-014(M7a) T1–T6 + §1.2 (split-trigger) + active.md plan
- [x] Architektura iter-002 §8.2 (zone tick), §8/§9.1 (kontrakty/trh), §9.4 (R4/D12), K8/K16/K17 mapování
- [x] Kód: world.js (stub), market.js (marketInject/getGoldValue), scheduler.js, rng.js (stream 'world'),
      tickOrder.js, upkeep.js (vzor), persistSchema.js, contracts.js (vzor schedule+RNG+seq), balance.js,
      zones.json (prázdné), military.json (extracted), createHomeState.js
- [x] ORIGINÁL world.js (processZone, processAI AISTATES, redistributeForces, gatherTributes, ratingy) — zdroj pravdy
- [x] T1 zone tick, T2 frakční automat, T3 revolty/questy/tribute/AI-AI bitvy, T4 jednotky, T5 trh, T6 UI
- [x] SPLIT rozhodnutí (ANO) + odůvodnění; G-LISTZONE postup; determinismus/catch-up-safe; persist; tickOrder; diagram
- [x] Rizika+mitigace; 4 alternativy; gap-list; Sonnet dekompozice L tasků
- [x] Výstup design_iter-016_T-001.md; handoff

## Blockery
–
