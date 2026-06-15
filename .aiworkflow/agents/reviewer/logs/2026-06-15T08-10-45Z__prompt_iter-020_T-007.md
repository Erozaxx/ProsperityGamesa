# Brief

- **Brief ID**: BRIEF-020-007
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-007 (reviewer) — **review gate M9a + DoD M9a** (Opus, právo re-run)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Závěrečný **review gate M9a** (master plán §1.4, právo re-run) + ověření **DoD M9a**. QA (T-006) dala GO empiricky; ty hodnotíš correctness + kvalitu + invarianty PROTI KÓDU. Klíč: **DoD formulován proti hratelnostním cílům, NE proti neexistující serverové referenci** (R-C); odchylky zdokumentované v datech; kalibrace = DATA ne logika.

## Rozsah review (produkční diff M9a)
Base→HEAD: `adef6d3..HEAD` (iter-019 close) — ne, správně: iter-020 diff je `c908f2d..HEAD` NEBO proti main merge-base. Použij: `git diff $(git merge-base HEAD main)..HEAD -- src/ test/`. Klíčové soubory:
```
src/core/balance/balance.js   (market.driftK provenance calibrated; offline.capBalanceRealHours=8 + capTechRealHours separace; home.js:970 evidence)
src/core/systems/market.js    (POUZE komentář — cenový/drift vzorec beze změny; ověř grep-gate)
src/app/main.js               (CATCHUP_CAP_MS=min(capTech,capBalance) odvozeno z BALANCE + export — MINOR-1)
test/helpers/marketHarness.mjs
test/m9a-market.test.js, test/m9a-offline-cap.test.js, test/m9a-regression.test.js
```

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Kalibrace = DATA ne logika (KLÍČOVÉ)**: `marketPrice`/`marketDailyDrift`/`catchupStepCount` signatury i TĚLA beze změny (jen data/komentář). Ověř proti diffu. Cenový vzorec a drift formula nezměněny.
2. **MINOR-1 cap odvozen z BALANCE (KLÍČOVÉ, firstStarve-class)**: `CATCHUP_CAP_MS` = `min(capTechRealHours, capBalanceRealHours)*3600*1000` z BALANCE, NE hardcoded literál; konstanta žije (ne no-op). Efektivní cap = min(tech, balance) — D10 chování zachováno.
3. **Cíle proti referenci (R-C)**: testy CÍL-1/2/3 proti definovaným hratelnostním cílům, ne serverová data. N=14 (0.8^14≈0.044<0.05), spread invariant, impact ≥60%.
4. **Determinismus + dekompozice**: regression segmenty (81900 kroků) přes save/load = bit-identické (golden-hash); seedované; žádný `it()` přes limit; golden-hash regenerovatelný/deterministický (ne flaky).
5. **Vědomé odchylky**: home.js:970 (original-intended), capBalanceRealHours název (MINOR-4) zapsané v datech/DR, ne skryté; home.js:970 mechanika v core NEEXISTUJE (grep=0) → žádná logická změna.

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu).
2. **Soulad s designem** `context/refs/design_iter-020_T-001.md` + DR-020-01 (podmínky MINOR-1/2/4 vyřešené?) + architekturou (§9.1 trh, §9.2a/D10 cap, K4/K7, R-C).
3. **Reuse/mrtvý kód** (soubor:řádek). Harness staví na engine, ne duplicitní implementace?
4. **Golden-hash artefakt**: verzovaný, regenerovatelný, deterministický (ne flaky CI risk)?
5. **DoD M9a celkově**: trh a cap kalibrovány proti EXPLICITNÍM cílům; balanc regression zelená; vědomé odchylky rozhodnuty a zapsány; gap G-MARKET-DRIFT uzavřen.

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko k **DoD M9a** + kalibrace=data + MINOR-1 cap + cíle-proti-referenci + determinismus segmentů.

## Inputs
- Design: `context/refs/design_iter-020_T-001.md`; QA: `context/refs/qa_report_iter-020_T-006.md`; DR-020-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§9.1/§9.2a/D10/K4/K7/R-C)
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-020_T-004.md`, `..._T-005.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-020_T-007.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-007 "<verdikt + DoD M9a + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Kalibrace=data (vzorce beze změny) + MINOR-1 cap odvození z BALANCE + cíle-proti-referenci + determinismus segmentů (bit-identičnost, golden ne flaky) prověř obzvlášť pečlivě — ověřuj proti kódu.
