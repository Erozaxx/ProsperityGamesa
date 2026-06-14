# Brief

- **Brief ID**: BRIEF-014-001
- **Iteration**: iter-014 (M5-2 – Kontrakty & build UI)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-14

## Goal
Detailní implementační design **M5-2** (kontrakty K14 + build UI) na úroveň, ze které Sonnet coder přímo implementuje. Navazuješ na svůj M5-1 design (`context/refs/design_iter-013_M5-1.md`) — §5 (T5 kontrakty), §6 (T6 build UI), §13 (odloženo M5-2) už obsahují kostru; **dotáhni je do plného designu**. M5-2 dokončuje milník M5. Design, ne kód. Žádná změna architektury iter-002.

## Stav repo (M5-1 hotové, v main)
- Budovy: `src/core/systems/buildings.js` (instances, ageBuildings, build/builder, completeBuild, modifier vrstva K13, `rebuildBuildingDerived`, `effective`, agregáty), `src/core/commands/build.js`, `buyCompany.js`.
- Registr efektů K14: `src/core/registry/effects.js` (118 ř.), `registry.js`.
- Scheduler: serializovatelný (`scheduleInsert`), `src/core/engine/`. Persist: `src/save/`.
- UI: `src/ui/screens.js`, `selectors.js`, `styles.css` (preact+htm, jen přes selektory+commands).
- **NENÍ katalog kontraktů** v `src/data/` (v originále kontrakty/eventy v `doc/original_source/modules/prosperity/services/events.js`).

## Zadání designu

### T5 — Kontrakty (K14)
Dotáhni §5/§13 M5-1 designu do plného návrhu:
1. **`contractQueue` struktura** (serializovatelná, deterministická `contractSeq` jako `projectSeq`): pole kontraktů {id, type, params, status, deadlineStep, …}.
2. **Životní cyklus**: aktivace, `onComplete`/`onExpire`/`onReject` jako **string-ID do registru efektů K14 + params v datech** (NE imperativní háčky). Expirace přes `scheduleInsert(deadlineStep, 'contract.expire', {contractId})`; handler v novém `systems/contracts.js`.
3. **Zdroj dat kontraktů**: ověř `doc/original_source/.../events.js`. Pokud kontrakty nelze 1:1 doložit → navrhni **approximovaný katalog** `src/data/contracts.json` (provenance:'approximated', gap **G-CONTRACTS-CATALOG**, kalibrace M9) s minimální hratelnou sadou typů (dodávkový kontrakt: dodej X zboží do N dní → odměna gold/techPt; oceňování přes `getGoldValue`).
4. **Generování kontraktů**: jak/kdy se nabízejí (schedule perioda?), `acceptContract`/`rejectContract` commands.
5. **Persist schéma** kontraktů (allowlist) + round-trip; schedule eventy přežijí save/load.
6. **Determinismus/catch-up-safe**: žádný Date.now/Math.random/DOM v core; pokud generování používá náhodu → izolovaný rng stream; levné v dávce.

### T6 — Build UI + kontrakty panel
Datový návrh (ne pixely):
1. **Build screen**: karty budov (z katalogu), zobrazení ceny se scalingem (`scaleCostByCount(base, totalMade)`), tlačítko build (→ `build` command), fronta projektů (`projectQueue` progres), opravy (repair-projekty), builder companies (`buyCompany`). Selektory nad stavem (žádná herní logika v UI).
2. **Kontrakty panel**: aktivní/nabízené kontrakty, accept/reject, deadline/progress, odměna.
3. Selektory/commands kontrakt (co UI čte / volá).

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002 ani command vrstvy (G-BUILD-TXAUDIT zůstává — ctx se commandu nepředává).
- M6+ obsah.

## Inputs
- M5-1 design (kostra §5/§6/§13): `context/refs/design_iter-013_M5-1.md`
- DR-013-00/01 (`context/refs/`)
- Architektura iter-002: §5.4 (K14 registr efektů), §8 (kontrakty), §6 (persist), §3.4 (engine-stopping eventy / acknowledge — pokud relevantní)
- Master plán §3/iter-012(M5) T5/T6
- Kód: `src/core/registry/effects.js`, `src/core/systems/buildings.js`, `src/core/engine/` (scheduler), `src/save/`, `src/ui/`, `src/core/systems/market.js` (getGoldValue)
- Originál: `doc/original_source/modules/prosperity/services/events.js` (zdroj kontraktů)

## Acceptance Criteria
- Plný design T5 (kontrakty) + T6 (build UI) na úroveň pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Kontrakty: serializovatelné, deterministické, přes registr efektů (string-ID, ne háčky); persist schéma jasné.
- Rozhodnutí o zdroji dat kontraktů (doložitelné vs. approximated katalog + gap).
- Build UI: jen selektory + commands, žádná logika v UI.
- tickOrder/diagram dopady (contract.expire handler, případné contract generování).
- Žádný rozpor s D/K/§; cituj kde se opíráš.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-014_T-001.md`

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + rozhodnutí o contract datech>"`
- NEcommituj (git).
