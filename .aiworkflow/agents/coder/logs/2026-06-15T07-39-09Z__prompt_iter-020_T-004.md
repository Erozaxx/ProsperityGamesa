# Brief

- **Brief ID**: BRIEF-020-004
- **Iteration**: iter-020 (M9a)
- **Task**: T-004 = C-020-A (Trh — kalibrace + cíle jako testy)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **C-020-A (Trh)**: hratelnostní cíle trhu jako MĚŘITELNÉ automatizované testy (T1) + potvrzení kalibrace driftK=0.2 proti cílům (T2) + simulační harness helper. Design je source of truth. (NESPAWNUJ sub-agenty; udělej práci sám a řádně ji ukonči.)

## Source of truth
`agents/coder/context/refs/design_iter-020_T-001.md` — čti **T1 (cíle), T2 (kalibrace trhu, harness)**. **DR-020-01** (podmínky). Reviewer T-002 GO-s-podmínkami.

## Scope IN
1. **Harness helper** `test/helpers/marketHarness.mjs`: deterministický headless běh trhu se seedy (staví na `createInitialState`/`initRng`/`marketDailyDrift`/`marketPrice`). Žádný Date.now/Math.random/DOM. Re-use existující engine, NE druhá implementace.
2. **T1 cíle jako testy** (NOVÝ `test/m9a-market.test.js`):
   - **CÍL-1 recovery**: po max výprodeji (`available`→0 nebo min) se vrátí na ≤5 % odchylku od baseline za **N=14 herních dní** čistě z driftu; ≥48 % mezery za 3 dny. (`0.8^14≈0.044<0.05`.)
   - **CÍL-2 arbitráž neztrátová**: `sellingPrice < buyingPrice` vždy + okamžitý round-trip nákup→prodej je ztrátový (spread haggleBuy 1.35 / haggleSell 0.6). Invariant napříč hodnotami available.
   - **CÍL-3 impact persistence**: po hráčově cenovém dopadu drift zachová ≥60 % dopadu za 1 den (`1−k=0.8≥0.6`).
3. **T2 driftK potvrzení**: ověř `balance.js driftK=0.2` splňuje všechny 3 cíle (leží v okně [0.10,0.40]); pokud ano, **potvrď hodnotu** (uzavři gap G-MARKET-DRIFT: provenance `approximated`→`calibrated` v komentáři/datech). Cenový i drift vzorec BEZE ZMĚNY — měň jen data/komentář provenance.

## Scope OUT
- Offline cap + balanc regression + home.js:970 = C-020-B (T-005). NEsahej cap/catchup.
- Žádná změna logiky `marketPrice`/`marketDailyDrift` (grep-gate: signatury beze změny). Kalibrace = DATA.

## Tvrdé invarianty (DR-020-01)
- Determinismus: harness seedovaný, žádný Date.now/Math.random/DOM v core.
- Cenový/drift vzorec beze změny; jen `driftK`/baseline data + provenance.
- Cíle měřitelné a deterministické (tester je převezme do sady §1.3).

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, typecheck projde) — uveď počet testů.
- `npm run smoke` OK.
- Determinismus G1 + M8/M7/M5/M6 nedotčené; cenový/drift vzorec beze změny.
- Cíle CÍL-1/2/3 jako zelené testy; driftK=0.2 potvrzeno.
- Precache regen jen při změně souborů ovlivňujících manifest.

## Inputs
- Design `context/refs/design_iter-020_T-001.md` (T1/T2/§4 harness), DR-020-01
- Kód: `src/core/systems/market.js` (marketDailyDrift, marketPrice), `src/core/balance/balance.js` (market.driftK:0.2, haggle spreads), `src/core/state/createInitialState.js`, `src/core/engine/rng.js` (initRng/hashState)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-020)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-020_T-004.md` (soubor:funkce, gate výstup, cíle jako testy, driftK potvrzení)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
