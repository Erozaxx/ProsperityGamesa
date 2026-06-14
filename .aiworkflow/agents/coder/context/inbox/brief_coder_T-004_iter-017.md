# Brief

- **Brief ID**: BRIEF-017-004
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-004 = T2 (L) — frakční automat processAI + self-rearm + favour migrace
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T2 (frakční automat)** dle designu — nejcitlivější task M7a-2 (determinismus + anti M7a-1 regrese). Design je source of truth, drž invarianty DOSLOVA.

## Source of truth
`agents/coder/context/refs/design_iter-017.md` — čti **§2 (frakční automat processAI), §2.4 (armFactionAI per-faction guard), §3.1 (favour migrace migrateFavour)**, persist sekci. DR-017-01.

## ⚠️ Tvrdé invarianty (review gate je ověří)
1. **favour migrace bez M7a-1 regrese (M-1)**: `favour` se mění z number → objekt `{factionId:number}`. Implementuj `migrateFavour(saved, def)` helper dle §3.1 (závazné pořadí větví: saved object deep-copy > saved number→{} > def object > {}). 3 místa: `hydrateZones` (world.js:377 → migrateFavour), `persistSchema.js:259` (`favour: typeof z.favour==='object' ? {...z.favour} : {}` — NE `||0`), `zones.json` favour `0`→`{}` (13 zón). **Fresh-vs-load identický hashState** + starý M7a-1 save (number→{}) deterministicky.
2. **Self-rearm determinismus (DR-012-02)**: `world.processFaction{factionId}` se re-schedulí **nepodmíněně** (i pod prahem, i incapacitated) → entry nikdy nezmizí. `armFactionAI(state)` **per-faction guard** (§2.4): scan `schedule.filter(e=>e.id==='world.processFaction').map(e=>e.params.factionId)`, doplň jen chybějící frakce v pevném pořadí `factionIds` — **NE scheduleCountOf** (ten indexuje jen podle id, nerozliší frakce). Volat JEDNOU z bootSequence (mirror armContractOffer). Žádná load-only/init-only větev.
3. **processAI determinismus**: `processAI(state, factionId, rng('world'))` 1:1 dle designu/originálu; `Math.random→rng('world')`, `Engine.insert→scheduleInsert` (K17, params objekt). Žádný Date.now/Math.random/DOM v core. `faction.state` (0–7) persistován = replay jádro.
4. **registerWorldEffects** v bootstrapu (anti-dark-code): contract handlery `world.processFaction`/`takeOver`/`AIIsAttacking` + stuby. armFactionAI za armContractOffer v bootSequence.

## Scope IN (T2)
- `processAI` přechodová funkce AISTATES 0–7 (zones.json.aiStates tabulka).
- `armFactionAI` per-faction self-rearm + registerWorldEffects + boot wiring.
- `migrateFavour` + 3 místa (hydrateZones, persistSchema, zones.json).
- Persist frakční stav (`world.factions[].state` + dynamika).
- AISTATES tabulka do zones.json (přepis M7a-1 placeholderů na originál semantiku, provenance dle designu).

## Scope OUT (jiné tasky)
- Revolty/questy/tribute výběr/AI-AI bitvy = T3 (T-005). Pokud processAI volá AI-AI bitvy (state 6), zaveď minimální hook / stub dle designu a vyjasni v summary; plný aiBattleResolve je T3.
- UI = T6. battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej: **favour migrace testy** (fresh-vs-load shape, starý M7a-1 save number→{}, neprázdný round-trip), processAI replay (stejný seed → stejné AISTATES přechody), armFactionAI per-faction (fresh/plný/částečný schedule → idempotentní, všechny frakce naplánované), persist round-trip frakčního stavu.
- `npm run smoke` OK.
- **Determinismus G1** + **M7a-1 round-trip (m7a-world-t1) + fresh-vs-load** + M5/M6/M4b nedotčené (favour migrace NESMÍ rozbít M7a-1 round-trip — klíčové).
- Precache regen jen při změně zdroje ovlivňujícího manifest (zones.json změna → pravděpodobně regen).

## Inputs
- Design: `context/refs/design_iter-017.md`, DR-017-01, DR-012-02 (precedens)
- Kód: `src/core/systems/world.js` (processZone, hydrateZones:377, processAI stub), `src/save/persistSchema.js:259` (favour), `src/core/engine/scheduler.js` (scheduleInsert), `src/core/systems/contracts.js` (armContractOffer vzor), `src/app/main.js` (bootSequence), `src/data/zones.json`, `src/core/balance/balance.js` (BALANCE.world prahy), originál `doc/original_source/.../world.js`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-017_T-004.md` (soubor:funkce, gate výstup, jak favour migrace + armFactionAI funguje, co je hook pro T3)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
