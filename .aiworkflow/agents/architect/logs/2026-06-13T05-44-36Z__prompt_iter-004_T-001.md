# Brief
- **Brief ID**: BRIEF-011
- **Iteration**: iter-004 (M0a)
- **From**: Orchestrator
- **To**: architect (Opus – detailní návrh tasku)
- **Date**: 2026-06-13

## Goal
Vytvoř detailní implementační návrh (spec pro Sonnet codera) pro VŠECHNY tasky iterace iter-004 (T1–T6 dle master plánu): konkrétní soubory, signatury, datové struktury, algoritmy, pořadí. Sonnet pak podle toho implementuje bez dalšího rozhodování.

## Context
- iter-004 = M0a (kostra repa & engine core), první implementační iterace. Stack: ES2022 moduly + JSDoc, runtime zero-build, žádný framework v core. Dev závislost jen `typescript` (`tsc --noEmit --checkJs`).
- Toto je NÁVRH, ne implementace – nepiš produkční kód, piš spec (interface, pseudo, layout). Implementaci dělá Sonnet v T-002.

## Scope IN (tasky iterace – navrhni všechny)
- T1: struktura repa dle architektury §3.1 + CI gate `tsc --noEmit --checkJs` + grep gate na zakázané importy v core (DOM/fetch/Date.now/Math.random). package.json (type:module), tsconfig (checkJs), adresáře core/data/app/tools/tests, pravidla vrstvení.
- T2: state container (§3.2) – jeden plain-data strom, `createInitialState()`, dev Object.freeze snapshot, types.d.ts základ.
- T3: clock + akumulátor (§4.1) – fixed-timestep 0.05 s, speed Pause/1×/2×, frame budget, dávková smyčka (bez catch-up UI).
- T4: scheduler (§4.2) – one-shot min-heap (serializovatelný, index id→count), periodika jako data, výpočet hran času (isNewDay/isNoon/…).
- T5: RNG streamy (§4.4) – mulberry32/xoshiro, pojmenované streamy per systém, stav v state.rng, determinism hash.
- T6: tickOrder kostra (§4.3) jako deklarovaná data + calendar/seasons (den/měsíc/rok/sezóna 4×91 dní) + fail-fast fns registr (§5.6) + commands skeleton (§3.3: dispatch, validace, setSpeed).

## Inputs (POVINNÉ)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§3.1 struktura, §3.2 state, §3.3 commands, §4.1–4.4 engine, §5.6 fail-fast)
- Master plán iterace: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3 iter-004, §1.3 test loop)
- Tvoje role: `agents/architect/AGENTS.md`

## Acceptance Criteria
- Spec pokrývá všech 6 tasků: pro každý uveď soubory (cesty), exportované funkce/typy se signaturami (JSDoc), datové tvary, klíčové algoritmy/pseudo, a jak to ověří test.
- Spec je konzistentní s architekturou (žádné nové rozhodnutí; když narazíš na nejednoznačnost, zvol a zdůvodni).
- Definuje konkrétní strukturu adresářů a obsah package.json/tsconfig a grep-gate skriptu.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-004_T-001.md`

## Risks / Constraints
- Zero-build runtime: kód musí běžet v prohlížeči i Node bez transpilace (ES2022 + import maps / relativní importy). Core nesmí importovat DOM/fetch/Date.now/Math.random (grep gate).
- Drž to realizovatelné Sonnetem na jeden průchod – konkrétní, ne abstraktní.
