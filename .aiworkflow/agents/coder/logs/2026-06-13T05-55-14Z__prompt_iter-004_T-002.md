# Brief
- **Brief ID**: BRIEF-012
- **Iteration**: iter-004 (M0a)
- **From**: Orchestrator
- **To**: coder (Sonnet – provedení)
- **Date**: 2026-06-13

## Goal
Implementuj CELOU iteraci iter-004 (M0a engine core) PŘESNĚ dle detailního návrhu architekta. Výsledkem je funkční headless engine v repu + CI gate + testy, vše zelené.

## Context
- Stack: ES2022 moduly + JSDoc typy, runtime zero-build (žádná transpilace), žádný framework v core. Dev závislost jen `typescript` (přes npx, instaluj per běh pokud chybí).
- Návrh je závazný – implementuj podle něj. Když narazíš na nejasnost nebo drobnou chybu v návrhu, oprav minimálně a poznamenej to do impl note.

## Scope IN
- Implementuj všech 6 tasků dle návrhu: T1 struktura repa + package.json + tsconfig.json + grep gate (tools/check-core-imports.mjs) + index.html, T2 state container (src/core/state.js, types.d.ts), T3 clock (src/core/clock.js), T4 scheduler (src/core/scheduler.js + timeEdges), T5 RNG (src/core/rng.js), T6 registry/calendar/tickOrder/commands.
- Napiš jednotkové testy (node:test) dle acceptance v návrhu: clock/scheduler/RNG hrany (přechod dne, sezóny 4×91, roku), determinism hash.
- Zapracuj zpětnou poznámku návrhu (EngineState `_seq`, SeasonState `_absDay`).
- Ověř lokálně: `npx tsc --noEmit --checkJs` zelené, `node --test` zelené, grep gate zelený. Pokud npx/tsc není dostupný, použij `node` syntax check a poznamenej.

## Inputs (POVINNÉ)
- Návrh: `agents/architect/artifacts/final/design_iter-004_T-001.md` (závazný)
- Architektura (reference): `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
- Tvoje role: `agents/coder/AGENTS.md`

## Acceptance Criteria
- Repo má strukturu dle §3.1; všechny moduly z návrhu existují a exportují deklarované signatury.
- `tsc --noEmit --checkJs` bez chyb; `node --test` zelené; grep gate prochází (žádné DOM/fetch/Date.now/Math.random v core).
- Engine běží v Node bez DOM: čas se posouvá, sezóny/rok se střídají, determinism hash stabilní pro daný seed.

## Expected Outputs
- Kód v `/src`, `/tools`, `/tests`, kořen (package.json, tsconfig.json, index.html), živé artefakty v `/docs`.
- Impl note: `agents/coder/artifacts/final/impl_iter-004_T-002.md` (co hotovo, výsledky tsc/test, odchylky od návrhu).

## Risks / Constraints
- Core (src/core, src/data, src/systems) NESMÍ importovat DOM/fetch/Date.now/Math.random (grep gate). Čas a náhoda jen přes engine clock + RNG streamy.
- Drž se návrhu; nevymýšlej nové moduly nad rámec iter-004.
