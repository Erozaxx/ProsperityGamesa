# Brief

- **Brief ID**: BRIEF-018-001
- **Iteration**: iter-018 (M7b – Bitvy)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-15

## Goal
Detailní implementační design **M7b** (battle automat: bitvy live i offline auto-resolve) na úroveň pro Sonnet codera. Naplňuje `battle.js` stub (kontrakt §8.1 z M2a) + `startBattle` stub z M7a-2. Tím se dokončuje M7. Drž architekturu iter-002 (§8.1, K8/D8/G2). Design, ne kód. **ROZHODNI SPLIT.**

## Stav repo
- **`src/core/systems/battle.js`** (STUB k naplnění): `battleStep(bs, commands, rng)` (advance rng + tick — kontrakt §8.1 established), `battleTick(state)` (no-op, step edge order 30). BattleState kontrakt: `{ zoneId, sides:{player,opponent}, state, tick, log, summary }`.
- **`startBattle` stub z M7a-2** (`world.js:1083` scheduleInsert + `:1189` startBattleStub): AI-vs-player spouští bitvu → M7b napojí.
- **rng streamy** `'battle'` UŽ existuje (`rng.js:10`).
- **`military.json`**: warrior (goldCost 1080, upkeep 108), archer (1620/162) — **BEZ combat statů** (damage/health/cooldown). Jednotky: `player.totWarriors/totArchers`.
- Scheduler (serializovatelný), persist `src/save/` (state.battle allowlist?), UI `src/ui/`, offline summary `src/ui/OfflineSummary.js`.

## Zadání designu (master plán §3/iter-015(M7b), T1–T5)
1. **T1 – Battle automat (§8.1)**: `battleState` + `battleStep(state, commands, rng('battle'))`. **Sub-step 30 ms** z hlavního akumulátoru (dle §8.1 — popiš jak sub-step běží v rámci tick akumulátoru). Cooldowny v ticích **1:1** (charge 80, volley 120…). Serializovatelný v `state.battle` (přežije save/load — **kill-resume uprostřed bitvy**). Naplň BattleState kontrakt.
2. **T2 – Damage/revival vzorce**: do `formulas.js` (battleDamage, crit, revival) + **tabulkové testy proti originálu** (`doc/original_source/.../battle.js`). Combat staty do `military.json` (G-MILITARY-STATS, approx z originálu, provenance flag).
3. **T3 – battleCommand + obranná AI (G2 — kritické)**: `battleCommand` commands (hráčské akce); obranná AI politika = **skriptované akce dle cooldownů** → **auto-resolve v catch-upu BEZ druhé implementace** (stejný `battleStep` automat se přehraje s AI commandy). Toto je G2: jeden automat live i offline.
4. **T4 – Invaze + bandité**: spouštění přes schedule / frakční automat (napoj `startBattle` stub z M7a-2 — AI-vs-player invaze); bandité přes schedule; výsledky do **offline summary**.
5. **T5 – Battle UI**: commands, progress, log (selektory + commands, žádná logika v UI) + playtest „feel" checklist (R-D, poznámky pro M9).

## Povinná rozhodnutí
- **Determinismus (kritické)**: `rng('battle')` izolovaný; battleStep deterministický; **serializovatelný** (kill-resume = save uprostřed bitvy → load → pokračování bit-identické); **auto-resolve v catch-up dávce == live automat** (G2, žádná druhá implementace). Sub-step 30ms vs catch-up dávka — popiš jak se bitva dohraje v offline dávce deterministicky a levně.
- **SPLIT** M7b (ano/ne): battle automat (T1+T2+T3) je velký/rizikový L celek; invaze (T4) + UI (T5) navazují. Posuď, zda do jedné iterace nebo split (např. M7b-1 automat+commands / M7b-2 invaze+UI).
- **G-MILITARY-STATS**: combat staty (damage/health/cooldown) nejsou v military.json → approximovat z originálu, provenance flag, kalibrace M9.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002 ani kontraktu §8.1 signatury (změna = decision record). Frakční AI / zóny = hotovo (M7a, NEsahej world.js processAI).

## Inputs
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-015(M7b), §1.2)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§8.1 battle automat, K8/D8/G2)
- Kód: `src/core/systems/battle.js` (stub), `src/core/systems/world.js` (startBattle stub :1083/:1189), `src/core/engine/` (akumulátor, rng 'battle', scheduler), `src/save/`, `src/data/military.json`, `src/ui/OfflineSummary.js`, originál `doc/original_source/modules/prosperity/services/battle.js` (battle mechaniky — zdroj pravdy)
- DR-013-00 (`context/refs/`)

## Acceptance Criteria
- Design pokrývá T1–T5 pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Determinismus: battleStep deterministický + serializovatelný (kill-resume) + auto-resolve catch-up == live (G2). Explicitní popis sub-step v akumulátoru i v offline dávce.
- Persist schéma `state.battle` (co se ukládá / co derivuje).
- Napojení `startBattle` z M7a-2 (invaze) + bandité; výsledky do offline summary.
- SPLIT rozhodnutí + G-MILITARY-STATS postup. tickOrder dopady (battleTick step order 30 už registrován).
- Žádný rozpor s D/K/§; cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-018_T-001.md` + poznámka o splitu.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + split + G2 auto-resolve determinismus>"`
- NEcommituj (git).
