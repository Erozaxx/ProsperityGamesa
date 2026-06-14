# Brief

- **Brief ID**: BRIEF-014-002
- **Iteration**: iter-014 (M5-2 – Kontrakty & build UI)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-14

## Goal
Review **designu M5-2** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (K14/§8/§6), proveditelnost Sonnet coderem, a determinismus/persist invarianty. Architektonický gate (T-002) před tom-proxy schválením.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-014_T-001.md`

## Na co se zaměřit
1. **Kontrakty přes registr efektů K14** (§5.4): `onComplete/onExpire/onReject` jako string-ID + params v datech (NE imperativní háčky). Ověř, že návrh nezavádí imperativní callbacky rozseté po kódu. Mapování z originálu (events.js string-ID callbacky) korektní?
2. **Serializovatelnost/determinismus**: contractQueue + schedule eventy (`contract.offer`/`contract.expire`) přežijí save/load (K17 index); **absolutní deadlineStep** (ne per-step countdown) — ověř, že je deterministický a catch-up-safe; izolovaný rng stream `'contracts'` (přidání na KONEC STREAM_NAMES kvůli G1 — ověř, že nerozbije determinismus existujících streamů). Deriváty (canComplete/daysLeft/pctComplete) se NEukládají (selektor).
3. **M52-D8 (kritické)**: `registerEffects` se dnes NEvolá v bootstrapu → contract handlery by se neresolvovaly. Návrh přidává `registerContractEffects`/`registerContractCommands` do boot + completion přes import (ne ctx.registry). Posuď, zda je to korektní a nerozbije to existující schedule resolve. Žádná změna command vrstvy (G-BUILD-TXAUDIT zůstává).
4. **Persist schéma** kontraktů (allowlist) + round-trip korektní; potřeba migrace savů (nové pole contractQueue/contractSeq)?
5. **Build UI**: jen selektory (read) + commands (write), ŽÁDNÁ herní logika v UI. Ověř, že výpočty (scaleCost, canComplete) jsou v selektorech/core, ne v UI komponentách.
6. **Soulad s architekturou** + gapy (G-CONTRACTS-CATALOG provenance derived/approximated). Odchylky od D/K označ.
7. **Proveditelnost**: je design dost konkrétní pro Sonnet implementaci T5+T6 bez dalších architektonických rozhodnutí? Posuď, zda T5+T6 souzní do jedné iterace (M5-2 je menší — 2 impl tasky), nebo doporuč split.

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO pro zahájení implementace.
- Posouzení M52-D8 (boot registrace) + determinismus contract streamu.

## Inputs
- Design: `context/refs/design_iter-014_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.4 K14, §8 kontrakty, §6 persist, §3.4)
- M5-1 design (kontext): `agents/architect/artifacts/final/design_iter-013_T-001.md`
- DR-013-01 (`context/refs/`)
- Kód: `src/core/registry/effects.js`, `src/core/engine/` (scheduler, runTick SCHEDULE fáze), `src/app/main.js` (bootstrapEngine), `src/core/engine/rng.js` (STREAM_NAMES), `src/save/`, `src/ui/`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-014_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Determinismus/persist (contract schedule, rng stream) prověř obzvlášť pečlivě. M52-D8 boot registrace je kritický bod — ověř ho proti kódu.
