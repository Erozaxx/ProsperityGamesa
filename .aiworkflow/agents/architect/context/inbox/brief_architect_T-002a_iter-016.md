# Brief

- **Brief ID**: BRIEF-016-002a
- **Iteration**: iter-016 (M7a-1)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-14

## Goal
Revize tvého `design_iter-016_T-001.md` — zapracuj **2 major podmínky** z reviewer gate (T-002, GO-s-podmínkami) + **zúž design na M7a-1 scope (T1, T4, T5)**. Split potvrzen (DR-016-01): frakční AI (T2) + revolty/questy/tribute (T3) + UI (T6) → M7a-2/iter-017, z tohoto designu je vyřaď do sekce "Odloženo na M7a-2". Stále design, ne kód.

## Zapracuj (podmínky před implementací)
1. **M-1 (major correctness) — day-index round-robin**: Tvůj návrh `if (curStep % dist === 0)` (převzatý z originálu, kde běží per-step) je na **DAY-edge prakticky mrtvý**: na day-edge je `curStep` násobek `stepsPerDay` (~900), `dist=ceil(periodSteps/zones.length)≈347`, a `900 % 347 ≠ 0` (nikdy 0) → `processZone` se téměř nikdy nespustí → **zónová ekonomika tichý no-op**. Přepočítej round-robin na **day-index**: použij `dayIndex` (počet dní, ne kroků) → `zoneIndex = floor(dayIndex / daysPerZoneSlot) % zones.length` nebo ekvivalent, tak aby se každých ~5 dní zpracovala jiná zóna a za periodu se prošly všechny. Uveď přesný vzorec deterministický a bezstavový (přežije save/load).
2. **M-2 (major, DR-012-02 třída) — re-hydratace zón**:
   - (a) `createWorldState()` (`createInitialState.js`/`createHomeState.js`) MUSÍ inicializovat `world.zones` + `world.factions` (dle designu), aby fresh==load (žádná asymetrie undefined-vs-data).
   - (b) Load: generický `Object.assign` na pole `zones[]` je nebezpečný (stale tail / index↔id mismatch). Předepiš **id-based merge** (spáruj uložený dynamický stav zóny s katalogovou static definicí podle zone id).
   - (c) Zaveď **sdílenou `hydrateZones(state)`** fn (re-hydratace static zón z katalogu + merge dynamického stavu) volanou z **load i createInitialState** — žádná load-only větev (M5-R1 gate, anti-DR-012-02). + povinný **fresh-vs-load determinismus test** (hashState identický).
   - Jasně odděl: co se PERSISTUJE (jen dynamický stav zón — favour/gold/units/aiState…) vs. co se RE-HYDRATUJE z katalogu (static: id, capital, topology, base stats).
3. **Tribute split**: ujasni, že akumulace tribute probíhá v M7a-1 (`processZone`), ale výběr/distribuce přes month-edge (`gatherTributes`) je M7a-2. V M7a-1 jen akumuluj (nebo nech jako odložené — rozhodni a popiš).

Minor/nit (3+3) zapracuj dle uvážení.

## Scope M7a-1 (co design po revizi pokrývá)
- **T1**: zone tick (day-index round-robin, processZone ekonomika/politika vzorci, createWorldState init, hydrateZones, persist dynamiky, fresh-vs-load test).
- **T4**: jednotky (recruitUnit command z military.json, reuse player.totWarriors/totArchers + upkeep.military M4a, zónové jednotky persist).
- **T5**: napojení trhu (produkční zóny marketInject(+), válčící(−); kontrakt §8.2 beze změny).

## Scope OUT (přesun do "Odloženo na M7a-2/iter-017")
- T2 frakční AI automat, T3 revolty/questy/tribute výběr/AI-AI bitvy, T6 UI — jen krátká poznámka (plný design udělá architekt v iter-017).
- Žádný kód, žádná změna architektury iter-002, battle.js NEDOTČEN.

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-016_T-001.md`
- Review (2 major/3 minor/3 nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-016_T-002.md`
- DR-016-01 (`context/refs/`)
- Kód pro ověření: `src/core/state/createInitialState.js`/`createHomeState.js` (createWorldState), `src/save/load.js` (zone hydration, M5-R1 precedent ~ř.284), `src/core/engine/` (stepsPerDay, dayIndex), `src/data/zones.json`, originál `world.js`

## Acceptance Criteria
- M-1, M-2 explicitně vyřešeny (přesný day-index vzorec; createWorldState init + id-based merge + sdílená hydrateZones + fresh-vs-load test; persist vs re-hydratace jasně oddělené).
- Tribute split ujasněn.
- Design zúžen na M7a-1 (T1/T4/T5); T2/T3/T6 odloženo.

## Expected Outputs
- Aktualizuj `design_iter-016_T-001.md` in-place (changelog "Revize T-002a: …") nebo nový doc — zvol jedno, uveď v handoffu platný.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny M-1/M-2 + platný doc>"`
- NEcommituj (git).
