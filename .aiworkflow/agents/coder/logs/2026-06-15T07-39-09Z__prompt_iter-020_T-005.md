# Brief

- **Brief ID**: BRIEF-020-005
- **Iteration**: iter-020 (M9a)
- **Task**: T-005 = C-020-B (Offline cap + Balanc regression)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **C-020-B**: offline cap balanční hodnota (T3) + balanc regression (T4) + home.js:970 evidence. Design je source of truth. (NESPAWNUJ sub-agenty; udělej práci sám a řádně ji ukonči.)

## Source of truth
`agents/coder/context/refs/design_iter-020_T-001.md` — čti **T3 (cap), T4 (regression, dekompozice)**. **DR-020-01** (podmínky — zejm. MINOR-1!). tom-proxy gate T-003: **cap = var. A = 8h**.

## Scope IN

### T3 — Offline cap balanční hodnota (gate: A=8h)
1. Přidej konstantu `offline.capBalanceRealHours = 8` do `balance.js` (oddělená od `capTechRealHours=8`, separace §9.2a). Komentář provenance + DR-020-01 (záměrná odchylka názvu od arch `capRealHours`).
2. **MINOR-1 (KRITICKÉ — firstStarve-class past)**: `CATCHUP_CAP_MS` v `main.js:58` je dnes hardcoded `8*3600*1000`, NEodvozený z BALANCE. **Přepoj volajícího (`main.js:250`) na `min(capTechRealHours, capBalanceRealHours)` odvozené z BALANCE** — jinak je nová konstanta MRTVÁ. Engine kontrakt: efektivní cap = `min(tech, balance)`.
3. Test: cap je ODVOZEN z BALANCE (ne hardcoded literál); `min(tech,balance)` aplikováno; capBalanceRealHours změna se projeví v efektivním capu.

### T4 — Balanc regression (dekompozice L)
1. **NOVÝ** `test/m9a-regression.test.js`: dlouhé seedované běhy s **dekompozicí** — kvartální segmenty (91 dní = 81 900 kroků) přes **save/load checkpointy** (segment doběhne → save → load → další segment, bez driftu). Multi-seed split smoke(rychlý)/plný. **Žádný `it()` nepřekročí časový limit prostředí.**
2. **Invarianty křivek** jako strážci: populace 0–10000, gold≥0, food≤maxFood, žádný NaN, žádný starve>30 dní. (Pozor MINOR-2: state cesty — food je `home.food.store`, NE `home.foodStore`; ověř správné cesty, tiché NaN riziko.)
3. **Golden-hash checkpointy**: verzovaný artefakt referenčních `hashState` na checkpointech (deterministický, regenerovatelný — ne flaky). Dokumentuj jak regenerovat.
4. **home.js:970 evidence**: JS precedence-bug (`?:`<`+` → inoculation tech bezcenný) → zvolena ZAMÝŠLENÁ varianta `0.02+(inoc?0.01:0)`, zapsáno jako vědomá odchylka `original-intended` (komentář/DR). **Mechanika v core dnes NEEXISTUJE (grep=0) → žádná změna logiky, jen evidence/dokumentace** (až mechanika přibyde, použít zamýšlenou variantu).

## Scope OUT
- Trh cíle + driftK + marketHarness = C-020-A (T-004). NEsahej market.js/driftK.
- NEMĚŇ cenový/drift vzorec.

## Tvrdé invarianty (DR-020-01)
- Determinismus: seedované, segmentované běhy pod limit; žádný Date.now/Math.random/DOM v core; save/load checkpointy bit-identické.
- Cap odvozen z BALANCE (MINOR-1), ne hardcoded.
- Golden-hash regenerovatelný, ne flaky.

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, typecheck projde) — uveď počet testů.
- `npm run smoke` OK.
- Determinismus G1 + M8/M7/M5/M6 nedotčené; offline cap chování (D10) zachováno (min správně).
- Regression invarianty zelené; cap odvozen z BALANCE (MINOR-1 test); home.js:970 evidence zapsána.
- Precache regen jen při změně manifest souborů.

## Inputs
- Design `context/refs/design_iter-020_T-001.md` (T3/T4/§4.3 sampler), DR-020-01
- Kód: `src/core/balance/balance.js` (offline.capTechRealHours:8), `src/app/main.js` (CATCHUP_CAP_MS:58, volající:250), `src/core/engine/catchup.js` (cap aplikace, catchupStepCount), `src/core/state/createInitialState.js`, `src/save/load.js` (loadAndReconstruct pro checkpointy), originál `doc/original_source/` home.js:970

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-005 (iter-020)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-020_T-005.md` (soubor:funkce, gate výstup, MINOR-1 cap drátování, dekompozice, home.js:970 evidence)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
