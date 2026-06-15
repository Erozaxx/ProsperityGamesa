# Impl Summary — iter-017 T-004 (T2 frakční automat)

> POZNÁMKA: Doplnil orchestrátor. T-004 prošel přes 2 spawny (původní uříznut po favour migraci →
> WIP checkpoint 3d1594e; navazující agent a2f5055 dokončil jádro T2, ale nezapsal summary/handoff).
> Práce nezávisle ověřena orchestrátorem (CI 1192/1192, T2 determinismus testy 126/126 cíleně) → zachráněna.

## Co implementováno (soubor:funkce)
- `src/core/systems/world.js`:
  - **favour migrace** (z WIP): `migrateFavour(saved, def)` (number→{}), volaná z hydrateZones; quests/questSeq init.
  - `processAI(state, factionId, rng('world'))` — 8-stavový AISTATES automat (Math.random→rng('world'), Engine.insert→scheduleInsert K17), exportovaný.
  - `processFaction` schedule handler — **nepodmíněný self-rearm** (anti-DR-012-02).
  - `armFactionAI(state)` — **per-faction set-difference guard** (scan dle params.factionId, ne scheduleCountOf).
  - `registerWorldEffects(reg)` — registruje 6 world schedule handlerů (processFaction/takeOver/AIIsAttacking + startBattle M7b stub + M8 stuby).
  - helpery getFaction/getZone/getCapital/calcMilitary/EconomicRating, findNeighboursOf, redistributeForces.
- `src/save/persistSchema.js:259`: favour typeof guard (number→{}, deep-copy object).
- `src/core/engine/tickOrder.js`: registerWorldEffects v registerCorePeriodics.
- `src/app/main.js`: registerWorldEffects + armFactionAI v bootstrapEngine + bootSequence (anti-dark-code).
- `src/data/zones.json`: favour {} (13 zón); AISTATES tabulka.
- `test/m7a2-world-t2.test.js`: 9 T2 testů (T2-1..T2-9).

## Gate (nezávisle ověřeno orchestrátorem)
- npm run ci: 1192/1192 pass, 0 fail
- T2 cílené (G1+M7a-1 round-trip+m7a2-world-t2+M5/M6): 126/126
- favour migrace: fresh-vs-load shape, starý M7a-1 save number→{}, neprázdný round-trip {thePrincess:-3,player:7} — vše PASS
- M7a-1 round-trip (m7a-world-t1) NEDOTČEN (favour migrace nerozbila)

## Hook pro T3
processAI state 6 (AI-AI bitvy) volá hook — plný aiBattleResolve vzorec + revolty/questy/tribute výběr = T3 (T-005).
