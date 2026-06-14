# Brief

- **Brief ID**: BRIEF-014-002a
- **Iteration**: iter-014 (M5-2)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-14

## Goal
Revize tvého `design_iter-014_T-001.md` — zapracuj **2 blocker + 1 major** z reviewer gate (T-002, GO-s-podmínkami). Stále design, ne kód. Detaily: `agents/architect/context/refs/review_design_iter-014_T-002.md`.

## Zapracuj (podmínky před implementací)
1. **B1 (blocker) — registerBuild wired**: `bootstrapEngine` (main.js) dnes registruje jen `buyCompany`, NE `build` → build command z M5-1 je nedostupný ("dark code"), build UI z T6 by vrátilo `unknown command`. Design M5-2 MUSÍ explicitně předepsat přidání `registerBuild(creg)` (a všech contract commands) do bootstrapu. Uveď přesně, které commandy se registrují a kde.
2. **B2 (blocker) — contract.offer re-arm pro existující savy**: `contract.offer` generátor nastartovaný v `createInitialState` se pro EXISTUJÍCÍ savy nikdy nenaplánuje, protože `applyPayload` (load.js) přepíše `engine.schedule` celým saved heapem (bez offer). Předepiš **re-arm se `scheduleCountOf` guardem** v load/boot cestě (mirror `marketInit`, který už běží fresh i po loadu) — pokud `scheduleCountOf('contract.offer')===0`, naplánuj. Uveď přesně kam (load Step? boot?) a jak guard funguje.
3. **M1 (major) — SAVE_VERSION/migrace explicitně**: Rozhodni v designu: nová pole (contractQueue/contractSeq) jsou pod undefined-guardem → je nutný bump `SAVE_VERSION` (=3) a migrace, nebo ne? Uveď jasné rozhodnutí + odůvodnění. Zdůrazni, že B2 (schedule re-arm) je nutný NEZÁVISLE na migraci polí (migrace pole nepokrývá schedule).

Major/minor/nit z review (zbylé) zapracuj dle uvážení, kde zvyšují kvalitu bez scope creepu.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002 ani command vrstvy (G-BUILD-TXAUDIT zůstává).

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-014_T-001.md`
- Review (2 blocker/2 major/4 minor/3 nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-014_T-002.md`
- DR-014-01 (`context/refs/`)
- Kód pro ověření: `src/app/main.js` (bootstrapEngine, registerBuild/buyCompany), `src/save/load.js` (applyPayload, Step pořadí), `src/core/systems/market.js` (marketInit re-arm vzor), `src/core/engine/` (scheduleCountOf)

## Acceptance Criteria
- B1, B2, M1 explicitně vyřešeny v designu (s přesnými místy v kódu, kde se zasahuje).
- Návrh re-arm guardu deterministický a idempotentní (běží fresh i po loadu, neduplikuje).
- Jasné rozhodnutí o SAVE_VERSION/migraci.

## Expected Outputs
- Aktualizuj `design_iter-014_T-001.md` in-place (changelog sekce "Revize T-002a: …") nebo nový `design_iter-014_T-002a.md` — zvol jedno a uveď v handoffu které je platné.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny B1/B2/M1 + platný doc>"`
- NEcommituj (git).
