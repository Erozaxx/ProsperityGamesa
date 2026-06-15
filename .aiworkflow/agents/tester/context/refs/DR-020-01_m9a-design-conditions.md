# DR-020-01 — M9a (balanční kalibrace) designové podmínky + impl poznámky

- **Datum**: 2026-06-15
- **Stav**: Rozhodnuto (architekt T-001 + reviewer T-002 GO-s-podmínkami)

## Rozhodnutí

1. **Kalibrace proti hratelnostním cílům (R-C)**: DoD M9a se formuluje proti EXPLICITNÍM měřitelným cílům, NE proti neexistující serverové referenci. Tři cíle (ověřeny matematicky reviewerem):
   - **CÍL-1 recovery**: po max výprodeji se `available` vrátí na ≤5 % odchylku od baseline za **N=14 herních dní** čistě z driftu (`0.8^14 ≈ 0.044 < 0.05`); ≥48 % mezery za 3 dny.
   - **CÍL-2 arbitráž neztrátová**: `sellingPrice < buyingPrice` vždy + round-trip ztrátový (invariant spread `0.6/1.35 = 0.444`, drží dokud haggleSell<haggleBuy). Regresní pojistka, ne laditelné.
   - **CÍL-3 impact persistence**: drift zachová ≥60 % hráčova dopadu za 1 den (`1−k = 0.8 ≥ 0.6`).
   - **driftK = 0.2 POTVRZENO** (střed bezpečného okna [0.10, 0.40]); uzavírá gap G-MARKET-DRIFT (provenance approximated→calibrated). **Cenový i drift vzorec beze změny** — kalibrace = jen DATA (balance.js).

2. **Offline cap separace (D10/R2b)**: nová konstanta `offline.capBalanceRealHours` oddělená od `capTechRealHours=8`; engine aplikuje `min(capTech, capBalance)`. Hodnota = rozhodnutí tom-proxy gate T-003 (var. A=8h / B=2h / C=0.5h).

3. **Regression metodika (T4)**: reference = invarianty křivek (pop 0–10000, gold≥0, food≤maxFood, žádný NaN, žádný starve>30 dní) + golden-hash checkpointy (verzovaný artefakt). **Dekompozice L**: kvartální segmenty (91 dní = 81 900 kroků) přes save/load checkpointy, denní sampling, multi-seed split smoke(Haiku)/plný(Sonnet) — žádný `it()` nepřekročí časový limit prostředí.

## Designové podmínky (GO-s-podmínkami, zapracovat při kódu)

- **MINOR-1 (nejdůležitější, firstStarve-class past)**: `CATCHUP_CAP_MS` v `main.js:58` je hardcoded literál `8*3600*1000`, NEodvozený z `BALANCE`. Coder MUSÍ přepojit volajícího (`main.js:250`) na `min(capTechRealHours, capBalanceRealHours)` odvozené z BALANCE — jinak je nová konstanta `capBalanceRealHours` MRTVÁ (latentní no-op). Přidat test, že cap je odvozen z BALANCE (ne hardcoded).
- **MINOR-2**: sampler cesty v designu §4.3 (`home.foodStore`, `home.curWorkers`) NEodpovídají kódu — food je `home.food.store`. Coder ověří správné state cesty (tiché NaN riziko).
- **MINOR-4**: `capBalanceRealHours` diverguje od architekturního názvu `capRealHours` (§9.2b) — zaznamenat jako vědomou odchylku (separace tech/balance je záměrná).
- **home.js:970**: JS precedence-bug (`?:` < `+` → inoculation tech bezcenný); zvolena **zamýšlená** varianta `0.02 + (inoc?0.01:0)`, zapsáno jako vědomá odchylka `original-intended`. Mechanika v core dnes NEEXISTUJE (grep=0) → korektně deferred (žádná akce v M9a kódu, jen evidence).

## Split coder tasků
- **C-020-A — Trh** (M, Sonnet): T1 cíle jako fixtures/testy + T2 driftK=0.2 potvrzení + harness helper `test/helpers/marketHarness.mjs`.
- **C-020-B — Cap + Regression** (M, Sonnet): T3 capBalanceRealHours + drátování `min` (MINOR-1!) + T4 segmentovaný regression + home.js:970 evidence.
- Nezávislé → paralelizovatelné.

## Reference
- Design: agents/architect/artifacts/final/design_iter-020_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-020_T-002.md
