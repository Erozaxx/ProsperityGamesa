# Brief

- **Brief ID**: BRIEF-017-001
- **Iteration**: iter-017 (M7a-2 – Frakční AI & svět ožívá)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-14

## Goal
Detailní implementační design **M7a-2** (frakční automat + revolty/questy/tribute + AI-AI bitvy + UI) na úroveň pro Sonnet codera. Dokončuje milník M7a. Navazuješ na svůj M7a-1 design (`context/refs/design_iter-016_M7a-1.md`) — **§3 (frakční automat), §4 (revolty/questy/tribute/AI-AI), §16 (odloženo M7a-2)** už obsahují základ; **dotáhni je do plného designu**. Drž architekturu iter-002. Design, ne kód.

## Stav repo (M7a-1 hotové, v main)
- `src/core/systems/world.js`: `worldTick` (day-index round-robin), `processZone` (ekonomika/politika + **M7a-2 stuby** pro frakce/tribute), sdílená `hydrateZones`.
- `src/data/zones.json`: 13 zón, **8 aiStates**, 4 frakce (player/thePrincess/thePsychopath/theWarlord), policies.
- `src/core/engine/`: scheduleInsert (one-shot, K17, serializovatelný), `rng('world')`. Persist `src/save/` (world.zones/factions allowlistované).
- `getGoldValue`/`marketInject` (kontrakt §8.2). `battle.js` STUB (M7b — NEDOTČEN). `src/ui/` (pure komponenty, taby).

## Zadání designu (master plán §3/iter-014(M7a) T2/T3/T6 + design iter-016 §3/§4)
1. **T2 – Frakční automat (L)**: AISTATES 0–7 jako **data** (přechodová tabulka v `zones.json.aiStates`) + deterministická `processAI(state, factionId, rng('world'))`. Plánování útoků/varování přes **schedule one-shot** (string-ID + index K17, NE Engine.insert objektová ref). **Idempotentní self-rearm guard** (`world.processFaction` se re-schedulí; po loadu/bootu re-arm se `scheduleCountOf` guardem — mirror marketInit/armContractOffer, anti-DR-012-02). Aktivační prahy z `balance.world`. Persist frakční stav (`world.factions[].state` 0–7 + dynamika).
2. **T3 – Revolty + questy + tribute + AI-AI bitvy**:
   - Revolty: favour vzorce na zone ticku (§4.1).
   - Questy: deterministicky generované (`questSeq`, `rng('world')`), oceňování `getGoldValue`, `acceptQuest`/`rejectQuest` commands.
   - Tribute výběr: `gatherTributes` (month edge — periodikum dle §4.4; akumulace už v M7a-1 processZone) → do home gold/resources.
   - AI-AI bitvy: **RNG resolve vzorcem** v `processAI` state 6 (NE battle automat — battle.js NEDOTČEN). AI-vs-player → scheduleInsert('startBattle') stub pro M7b.
3. **T6 – UI world/zones screen**: mapa zón, frakce/diplomacie, policy, questy panel (selektory + commands, žádná logika v UI). Tab.

## Povinná rozhodnutí
- **Determinismus/catch-up-safe (kritické)**: frakční automat deterministický v offline dávce; jediný `rng('world')`; schedule serializovatelný (přežije save/load); **idempotentní self-rearm** (žádná load-only ani init-only větev — DR-012-02 třída); replay test (stejný seed → stejné přechody AISTATES).
- **Split** M7a-2 (ano/ne): posuď, zda T2+T3+T6 souzní do jedné iterace (T2 je L). Pokud ano, jedna iterace; pokud ne, doporuč hranici.
- **Kontrakty §8/§8.2 beze změny signatur** (getGoldValue/marketInject); battle.js NEDOTČEN.

## Scope OUT
- Žádný kód. Battle automat hráčských bitev = M7b/iter-018 (NEsahej battle.js). Žádná změna architektury iter-002.

## Inputs
- M7a-1 design (§3/§4/§16 = základ M7a-2): `context/refs/design_iter-016_M7a-1.md`
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-014(M7a) T2/T3/T6, §1.2)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.2 zone tick, §8 kontrakty, K16/K17 schedule)
- DR-016-01, DR-013-00 (`context/refs/`)
- Kód: `src/core/systems/world.js` (processZone M7a-2 stuby, hydrateZones), `src/data/zones.json` (aiStates/factions), `src/core/engine/` (scheduleInsert, scheduleCountOf, rng world), `src/core/systems/contracts.js` (armContractOffer vzor self-rearm), `src/save/`, `src/ui/`
- Originál: `doc/original_source/modules/prosperity/services/world.js` (frakční AI, AISTATES, revolty — zdroj pravdy)

## Acceptance Criteria
- Design pokrývá T2/T3/T6 pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Determinismus: processAI deterministický, idempotentní self-rearm (žádná load-only/init-only větev), replay test; serializovatelný schedule.
- Persist schéma (frakční stav, questy) — co se ukládá / co derivuje.
- AI-AI bitvy vzorcem (battle.js nedotčen); split rozhodnutí.
- tickOrder dopady (gatherTributes month, processFaction přes schedule) + diagram.
- Žádný rozpor s D/K/§; cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-017_T-001.md` + poznámka o splitu.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + split + self-rearm determinismus>"`
- NEcommituj (git).
