# Brief

- **Brief ID**: BRIEF-020-006
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-006 (tester) — test loop M9a + DoD M9a
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-15

## Goal
Nezávislá QA M9a (kalibrace trhu + offline cap + balanc regression). Ověřuj EMPIRICKY vlastním během. Přísný na: **cíle proti definovaným referencím** (ne serverová data), **determinismus dlouhých segmentovaných běhů** (pod limit prostředí), **cap odvozen z BALANCE** (MINOR-1, ne mrtvá konstanta), a že M9a nerozbil M8/M7/M5/M6.

## Co implementováno (T-004 + T-005)
- **T-004 (C-020-A)**: `test/helpers/marketHarness.mjs`, `test/m9a-market.test.js` (CÍL-1/2/3); driftK=0.2 calibrated (cenový/drift vzorec beze změny).
- **T-005 (C-020-B)**: `BALANCE.offline.capBalanceRealHours=8`; `CATCHUP_CAP_MS=min(capTech,capBalance)` (main.js); `test/m9a-offline-cap.test.js`; `test/m9a-regression.test.js` (segmenty+golden-hash); home.js:970 evidence.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail, typecheck). **`npm run smoke`** OK (0 console errors).
2. **Cíle trhu (CÍL-1/2/3) deterministické a proti definovaným cílům**: recovery k baseline ≤5% za 14 dní (ověř empiricky vlastním headless během), arbitráž neztrátová (sell<buy + round-trip ztráta), impact persistence ≥60%/den. Ověř, že testy NEodkazují na neexistující serverová data.
3. **Cap odvozen z BALANCE (MINOR-1, KRITICKÉ)**: `CATCHUP_CAP_MS` NENÍ hardcoded — sniž `capBalanceRealHours` (např. na 2) a ověř, že efektivní cap se ZMĚNÍ (min kontrakt). capBalanceRealHours NENÍ no-op. Cenný regres: pokud by zůstal hardcoded, konstanta je mrtvá.
4. **Regression segmenty bit-identické (KRITICKÉ)**: kvartální segmenty (81900 kroků) přes save/load checkpointy dávají **bit-identický** výsledek jako kontinuální běh (hashState). Golden-hash regenerovatelné (REGEN_GOLDEN=1) a deterministické (2× běh = stejný hash). Žádný `it()` nepřekročí časový limit.
5. **Invarianty křivek**: pop 0–10000, gold≥0, food≤maxFood (cesty `home.food.store`, MINOR-2), žádný NaN, žádný kolaps populace >30 dní — v dlouhém běhu (rok+) drží.
6. **Determinismus G1 + offline cap D10**: dlouhý seedovaný catch-up deterministický, levný; over-cap chování zachováno (min správně aplikováno).
7. **home.js:970 evidence**: zapsáno jako vědomá odchylka (original-intended); mechanika v core NEEXISTUJE (grep=0) → žádná změna logiky. Ověř, že žádná tichá logická změna nepronikla.
8. **M9a nerozbil M8/M7/M5/M6**: m8-*/m7b/m7a2/m5/m6/m4b + G1 (iter005-edge) nedotčené.
9. **DoD M9a celkově**: trh a cap kalibrovány proti EXPLICITNÍM cílům; balanc regression zelená; vědomé odchylky zapsané; cenový/drift vzorec beze změny.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK.
- Mobile UX / PWA audit / licence = M9b. Známé gapy (TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1) = NE bug (M9b/cleanup).

## Acceptance Criteria (DoD M9a)
- ci zelené (typecheck), smoke OK.
- Cíle CÍL-1/2/3 deterministické proti definovaným cílům; driftK=0.2 splňuje.
- Cap odvozen z BALANCE (min kontrakt, ne no-op); regression segmenty bit-identické + golden-hash deterministický; invarianty drží.
- M9a nerozbil M8/M7/M5/M6; cenový/drift vzorec beze změny.
- Verdikt GO/NO-GO (DoD M9a).

## Inputs
- Design: `context/refs/design_iter-020_T-001.md`, DR-020-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-020_T-004.md`, `..._T-005.md`
- Testy: `test/m9a-market.test.js`, `test/m9a-offline-cap.test.js`, `test/m9a-regression.test.js`, `test/helpers/marketHarness.mjs`, regrese sady
- Kód: `src/core/systems/market.js`, `src/core/balance/balance.js`, `src/app/main.js` (CATCHUP_CAP_MS), `src/core/engine/catchup.js`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-020_T-006.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-006 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
