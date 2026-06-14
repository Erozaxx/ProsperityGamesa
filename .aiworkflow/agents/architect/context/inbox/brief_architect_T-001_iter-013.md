# Brief

- **Brief ID**: BRIEF-013-001
- **Iteration**: iter-013 (M5 – Budovy, stavba, kontrakty)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-13

## Goal
Vytvoř **detailní implementační design M5** (building instances, stavba/projectQueue/builder, scaleCost, builder companies, modifier vrstva z budov K13, kontrakty K14) na úroveň, ze které coder (Sonnet-level) přímo implementuje. Design, ne kód. Drž se schválené architektury iter-002 (D/K/R/§) — pouze ji konkretizuješ pro M5, neměníš.

## Kontext / stav repo
- MVP jádro (M0–M4) hotové: engine, čas/sezóny, populace, joby, ekonomika, klientský trh.
- iter-012 = playability hardening (mimo milníkovou osu). M5–M9 posunuty +1 (viz DR-013-00 v `context/refs/`).
- Existuje: `src/core/registry/effects.js` (K14 registr efektů – kostra z M1), `src/core/registry/registry.js`, `getGoldValue`/`marketInject` v `src/core/systems/market.js` (M4b kontrakt, smí se volat), `src/core/engine/tickOrder.js`, persist v `src/save/`, `src/core/balance/balance.js` + `formulas.js`.
- Katalogy: `src/data/buildings.json` (NEÚPLNÝ – jen 4 budovy, derived, G-LISTBUILDINGS) a `src/data/companies.json`.

## Zadání designu (master plán §3/iter-012(M5), tasky T1–T6)
Navrhni konkrétně, modul po modulu:

1. **T1 – Building instances + opotřebení + opravy + persist**
   - Stavová reprezentace instancí budov (`created`/`totalMade` per typ; co přesně ve `state.home.buildings`).
   - `ageBuildings` systém (denní tick) – opotřebení; oprava (cost oceňovaná přes `getGoldValue`).
   - Persist schéma budov (deklarativní allowlist dle §6.3; co se ukládá vs. derivuje).
   - Které balanc konstanty (opotřebení rate, repair cost faktor) → `balance.js` s odkazem na zdroj.

2. **T2 – projectQueue + builder + build() + scaleCost**
   - `projectQueue` struktura, builder systém na quarterDay slotu (z M3 jobs), postup staveb.
   - `build(itemId)` command (validace, odečet costu přes transakční vrstvu `pay`).
   - `scaleCost(base, created)` čistá funkce do `formulas.js` (vzorec scalingu cen dle originálu – dolož zdroj/§).

3. **T3 – Builder companies**
   - Katalogová data (companies.json – ověř/doplň strukturu) + logika výběru/kapacit builderů.

4. **T4 (L) – Modifier vrstva plně pro budovy (K13, §5.3)**
   - `effective(itemId, attr)` API: fold pořadí add→mul→set, memoizace, invalidace.
   - Event-driven agregáty (maxWorkers, kapacity skladů, attractiveness) z budov.
   - **Save = jen seznam modifikátorů** (nikdy derivované hodnoty); re-aplikace po loadu = fold.
   - POVINNÁ dekompozice L na kroky proveditelné Sonnet agentem (master plán §1.2).
   - Kritický invariant (review gate): žádné in-place `applyUpgrade` mutace, derivovaná data se neukládají.

5. **T5 – Kontrakty (K14)**
   - `contractQueue`, `onComplete`/`onExpire`/`onReject` přes registr efektů (string-ID + params v datech, ne imperativní háčky).
   - Kontraktové eventy přes schedule (serializovatelné), persist.

6. **T6 – UI build screen + kontrakty panel** (jen rozhraní k selektorům/commandům – návrh dat, ne pixely).

## Povinné rozhodnutí
- **Split M5-1(T1–T4) / M5-2(T5–T6)?** Posuď, zda T4(modifikátory)+T5(kontrakty) souzní do jedné iterace. Doporuč ano/ne s odůvodněním (master plán §3/iter-012 pozn. split-trigger).
- **G-LISTBUILDINGS gap**: buildings.json je neúplný. Navrhni postup (dle Q3/DR-001: chybějící data → `provenance:'approximated'`, autonomně; eskalace jen informativní). Které budovy minimálně potřebujeme pro hratelné M5.

## Scope OUT
- Neimplementuj (žádný produkční kód). Žádná změna architektury iter-002 (jen konkretizace). Žádný M6+ obsah.
- Determinismus/catch-up-safe invariant je tvrdé omezení každého nového systému (žádný DOM/Date.now/Math.random v core, levné v dávce).

## Inputs
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-012(M5), §1.2 L dekompozice)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§5.3 K13 modifikátory, §5.4 K14 registr efektů, §6.3–6.4 persist, §7.1 transakce, §8 kontrakty)
- Kód: `src/core/registry/`, `src/core/systems/market.js` (getGoldValue), `src/core/engine/tickOrder.js`, `src/save/`, `src/data/buildings.json`, `src/data/companies.json`, `src/core/balance/`
- DR-013-00 (`context/refs/`)

## Acceptance Criteria
- Design pokrývá T1–T6 na úroveň, ze které Sonnet coder implementuje bez dalšího architektonického rozhodování.
- T4 (L) má explicitní dekompozici na Sonnet-proveditelné kroky.
- Jasné persist schéma (co se ukládá / co derivuje) pro budovy, modifikátory (jen seznam), kontrakty.
- Explicitní tickOrder dopady (kam ageBuildings/builder/contract eventy v rámci dne) + diagram dopady.
- Rozhodnutí o splitu + o G-LISTBUILDINGS gapu.
- Žádný rozpor s D1–D13/K0–K19; kde se opíráš o §/K/D, cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-013_T-001.md` (design M5).
- Pokud doporučíš split → poznámka pro orchestrátora (rozdělím plán).

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + split doporučení>"`
- NEcommituj (git).
