# Brief

- **Brief ID**: BRIEF-017-002a
- **Iteration**: iter-017 (M7a-2)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-15

## Goal
Revize tvého `design_iter-017_T-001.md` — zapracuj **2 major + 1 minor** podmínky z reviewer gate (T-002, GO-s-podmínkami). Stále design, ne kód. Detaily: `agents/architect/context/refs/review_design_iter-017_T-002.md`.

## Zapracuj (podmínky před implementací)
1. **M-1 (major) — favour migrace bez M7a-1 regrese**: Měníš `favour` z **number** (M7a-1) na **objekt** `{factionId:number}` (originál ř.291-365). Reviewer ověřil 2 konkrétní místa v kódu, kde to dnes vrací number → fresh-vs-load drift:
   - `persistSchema.js:259` má `favour: z.favour || 0` (number fallback) → musí být `?? {}` (objektový tvar).
   - `hydrateZones` (`world.js:377`) `favour: saved?.favour ?? (def.favour ?? 0)` produkuje number → musí **migrovat number→objekt** (a `zones.json` favour:0 → {}).
   - Předepiš v designu **přesnou migrační logiku** (number→{} nebo number→{originalLiege:number}?) deterministickou (fresh-vs-load identický hashState; staré savy s number favour → objekt). Revolt nebyl v M7a-1 aktivní (gated prázdný) → migrace nedestruktivní, ale MUSÍ být deterministická. Uveď, že je nutný **fresh-vs-load + starý-save migrační test** (acceptance-blokující).
2. **M-2 (major) — armFactionAI per-faction guard**: Tvůj `armFactionAI` set-difference guard nesmí spoléhat na `scheduleCountOf` — reviewer ověřil, že `scheduler.js:82` indexuje schedule jen podle **`id`** (`world.processFaction`), NErozliší 3 frakce (factionId je v params, ne v id). „Doplnění od konce" selže při asymetrickém stavu. Předepiš **per-faction guard**: scan schedule entries pro `id==='world.processFaction'` a porovnej jejich `params.factionId` proti seznamu živých frakcí → naplánuj jen chybějící. Deterministické, idempotentní. Uveď přesně.
3. **m-4 (minor) — quest gating fallback**: quest gating dnes čte `home.level`/`militaryCouncil.discovered`, která ve `state` NEEXISTUJÍ → reinforcement quest by se nikdy nevygeneroval (tichý no-op). Předepiš **deterministický fallback** nebo použij **existující state pole** (ověř proti createHomeState/createInitialState, co existuje — např. settlementLevel, population). Aby questy reálně vznikaly.

Minor/nit (zbylé) zapracuj dle uvážení.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002. battle.js NEDOTČEN.

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-017_T-001.md`
- Review (2 major/5 minor/3 nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-017_T-002.md`
- DR-017-01 (`context/refs/`)
- Kód pro ověření: `src/save/persistSchema.js:259` (favour), `src/core/systems/world.js:377` (hydrateZones favour), `src/core/engine/scheduler.js:82` (scheduleCountOf indexuje podle id), `src/core/state/createHomeState.js`/`createInitialState.js` (existující state pole pro quest gating), `src/data/zones.json` (favour)

## Acceptance Criteria
- M-1, M-2, m-4 explicitně vyřešeny (přesná místa v kódu + logika).
- M-1: deterministická migrace favour number→objekt + povinný fresh-vs-load + starý-save test.
- M-2: per-faction guard (ne scheduleCountOf), idempotentní.
- m-4: quest gating funguje (existující pole / fallback).

## Expected Outputs
- Aktualizuj `design_iter-017_T-001.md` in-place (changelog "Revize T-002a: …") nebo nový doc — zvol jedno, uveď v handoffu platný.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny M-1/M-2/m-4 + platný doc>"`
- NEcommituj (git).
