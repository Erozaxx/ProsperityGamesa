# Brief (RE-DISPATCH — dokončení T-004)

- **Brief ID**: BRIEF-017-004b
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-004 = T2 (L) — frakční automat (DOKONČENÍ; favour migrace už hotová)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## ⚠️ Kontext re-dispatch
Předchozí běh T-004 byl **uříznut** po implementaci favour migrace, **JÁDRO T2 nebylo dokončeno**. Hotovo a commitnuto (checkpoint `3d1594e`, ci 1179/1179):
- ✅ `migrateFavour` helper (`world.js:335`), `persistSchema.js:259` favour typeof guard (number→{}), zones.json/balance favour změny.
- ✅ M7a-1 round-trip (m7a-world-t1) 34/34 nedotčen — favour migrace je OK, **NESAHEJ na ni destruktivně**, jen ověř + doplň migrační testy.

**CHYBÍ (tvůj úkol):** processAI automat, armFactionAI self-rearm, registerWorldEffects + boot wiring, persist frakčního stavu, VŠECHNY povinné testy, impl summary.

## Source of truth
`agents/coder/context/refs/design_iter-017.md` — §2 (processAI), §2.4 (armFactionAI per-faction guard), §3.1 (favour — už hotová). DR-017-01.

## Scope IN (dokončení T2)
1. **`processAI(state, factionId, rng('world'))`** přechodová funkce AISTATES 0–7 dle §2/originálu (`Math.random→rng('world')`, `Engine.insert→scheduleInsert` K17 params objekt). `faction.state` (0–7) persistován = replay jádro. Žádný Date.now/Math.random/DOM.
2. **`armFactionAI(state)` per-faction self-rearm (§2.4, KRITICKÉ)**: `world.processFaction{factionId}` se re-schedulí **nepodmíněně** (entry nikdy nezmizí). Guard = scan `schedule.filter(e=>e.id==='world.processFaction').map(e=>e.params.factionId)`, doplň jen chybějící frakce v pevném pořadí — **NE `scheduleCountOf`** (nerozliší frakce). Volat JEDNOU z bootSequence. Žádná load-only/init-only větev.
3. **`registerWorldEffects(registry)`** — handlery `world.processFaction`/`takeOver`/`AIIsAttacking` + stuby (`startBattle` M7b, M8 stuby dle designu). **Boot wiring v `main.js`**: `registerWorldEffects(registry)` + `armFactionAI(state)` za `armContractOffer` v bootSequence (anti-dark-code).
4. **AISTATES tabulka** do zones.json (přepis M7a-1 placeholderů na originál semantiku, provenance dle designu) — pokud už není.
5. **Persist** frakčního stavu (`world.factions[].state` + dynamika) — ověř allowlist.

## Scope OUT
- Revolty/questy/tribute výběr/AI-AI bitvy = T3 (pokud processAI volá AI-AI state 6, minimální hook/stub, vyjasni v summary). UI = T6. battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy (NOVÝ soubor, např. `test/m7a-faction-t2.test.js`):
  - **favour migrace** (fresh-vs-load shape, starý M7a-1 save number→{}, neprázdný round-trip `{thePrincess:-3,player:7}`).
  - **processAI replay** (stejný seed → stejné AISTATES přechody).
  - **armFactionAI per-faction** (fresh/plný/částečný schedule → idempotentní, všechny frakce naplánované, žádný duplikát).
  - **persist round-trip** frakčního stavu (faction.state přežije save/load).
  - **fresh-vs-load hashState identický** s frakční aktivitou.
- `npm run smoke` OK.
- **Determinismus G1** + **M7a-1 round-trip (m7a-world-t1) + fresh-vs-load** + M5/M6/M4b nedotčené.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-017.md`, DR-017-01
- Kód: `src/core/systems/world.js` (migrateFavour hotová, processAI/armFactionAI doplnit), `src/core/engine/scheduler.js` (scheduleInsert), `src/core/systems/contracts.js` (armContractOffer + registerContractEffects vzor), `src/app/main.js` (bootSequence — kam armFactionAI/registerWorldEffects), `src/data/zones.json` (aiStates/factions), `src/core/balance/balance.js`, originál `doc/original_source/.../world.js`

## Workflow po dokončení (NEZAPOMEŇ — minule chybělo)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-017)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-017_T-004.md` (soubor:funkce, gate výstup, processAI/armFactionAI/favour, hook pro T3)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
