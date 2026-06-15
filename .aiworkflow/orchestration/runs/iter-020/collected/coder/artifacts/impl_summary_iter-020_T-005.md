# Impl Summary — iter-020 T-005 (C-020-B: Offline cap + Balanc regression)

- **Task**: T-005 = C-020-B
- **Datum**: 2026-06-15
- **Autor**: coder (Sonnet)
- **Source of truth**: design_iter-020_T-001.md (T3 §3 / T4 §4), DR-020-01
- **Gate tom-proxy T-003**: cap = var. A = 8 h

## Co implementováno (soubor:funkce)

### T3 — Offline cap balanční hodnota (A=8 h) + MINOR-1
- **src/core/balance/balance.js → `BALANCE.offline.capBalanceRealHours = 8`**
  Nová konstanta oddělená od `capTechRealHours=8` (separace tech/balance §9.2a). Komentář: provenance
  `calibrated` (tom-proxy gate T-003, var A), MINOR-4 vědomá odchylka názvu od arch `capRealHours`.
- **src/app/main.js → `CATCHUP_CAP_MS` (MINOR-1 drátování — firstStarve-class past)**
  Bylo: hardcoded `8 * 3600 * 1000` (NEodvozený z BALANCE → `capBalanceRealHours` by byla MRTVÁ).
  Nyní: `Math.min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * 3600 * 1000`.
  Efektivní cap = **min(tech, balance)** odvozený z BALANCE. Konstanta `export`ována, aby byla testovatelná.
  Volající (`main.js:~256`, `const capMs = CATCHUP_CAP_MS`) tím dostává odvozený cap. `catchupStepCount`
  signatura `(missedMs, capRealMs)` NEZMĚNĚNA (clamp už existoval).
- **test/m9a-offline-cap.test.js** (NOVÝ, 7 testů): capBalanceRealHours existuje/oddělená/=8;
  CATCHUP_CAP_MS odvozen z BALANCE (re-derivace, NE literál); min-kontrakt; capBalance NENÍ no-op
  (snížení na 2 h by se promítlo do efektivního capu); catchupStepCount zastropí over-cap na 576 000
  kroků (D10), under-cap neaplikuje cap.

### T4 — Balanc regression (dekompozice L)
- **test/m9a-regression.test.js** (NOVÝ, 17 testů):
  - **Dekompozice S1/S4**: kvartální segmenty (91 dní = 81 900 kroků); každý kvartál = samostatný `it()`
    (změřeno ≈ 0,05–0,2 s/kvartál → bezpečně pod limitem prostředí). Stav mezi kvartály přes
    **save/load checkpoint** (`applyPersist` → `loadAndReconstruct`, pokračování na loaded state).
    Ověřeno (manuálně + determinismus test), že segmentovaný save/load běh je **bit-identický** s
    kontinuálním během (žádný drift) — zároveň G1 přes save hranici.
  - **Invarianty křivek (S2, §4.2)** vzorkované 1×/herní den: `0 < pop ≤ sanityMaxPop(10000)`, `gold ≥ 0`,
    `0 ≤ food[type] ≤ maxFood(500)`, žádný NaN/Inf, žádný populační kolaps >30 dní v řadě.
  - **MINOR-2 — správné state cesty**: `state.home.population.total`, `state.player.gold`,
    `state.home.food.store[type]` (NE `home.foodStore`/`home.curWorkers` z designu §4.3 — ty v kódu
    neexistují, tiché NaN riziko ošetřeno).
  - **Golden-hash checkpointy (§4.2)**: verzovaná konstanta `GOLDEN.hashes` (3 seedy A/B/C × 4 kvartály);
    hash na loaded state po každém kvartálu. Regenerovatelné přes `REGEN_GOLDEN=1` (dokumentace regenerace
    v hlavičce souboru). Determinismus test: dva nezávislé segmentované běhy = stejné hashe = golden artefakt.
  - **Multi-seed split (S3)**: SMOKE (1 seed / 1 rok / jen invarianty) + PLNÝ (3 seedy / golden hashe).

### home.js:970 evidence (T4 §4.4 / DR-020-01 §3)
- **src/core/balance/balance.js → `health` blok**: zapsána vědomá odchylka jako EVIDENCE (bez logiky).
  Originál `services/home.js:970` má JS precedence-bug (`?:` < `+`) → inoculation tech bezcenný.
  Rozhodnutí: až mechanika přibude, použít ZAMÝŠLENOU variantu `0.02 + (inoculation ? 0.01 : 0)`
  (provenance `original-intended`). Mechanika v core dnes NEEXISTUJE (`grep consecutiveDiseased/inoculation = 0`,
  ověřeno) → konstanty `diseaseRecoveryBase: 0.02` / `inoculationBonus: 0.01` se pouze evidují, NEZAPOJUJÍ.
  (Pozn.: literál `Math.random()` v komentáři přepsán na `rng <` kvůli lint:core nondeterminism gate.)

## Gate (DoD) — ověřeno
- **`npm run ci` ZELENÉ**: **1550 testů, 0 fail** (typecheck + lint:core OK). T-004 nechal 1526 → +24 nových.
- **`npm run smoke` OK**: app rendered, 0 console errors.
- Determinismus G1 + M8/M7/M5/M6 nedotčené; catchup/firstStarve sada (45 testů) zelená.
- Offline cap D10 zachováno: over-cap → 576 000 kroků (min(8,8)=8 h správně).
- Cap odvozen z BALANCE (MINOR-1 test); regression invarianty + golden hashe zelené; home.js:970 evidence zapsána.
- REGEN_GOLDEN=1 ověřeno: emituje přesně committed golden hashe (regenerovatelné, ne flaky).

## Scope dodržen
- NEDOTČENO: market.js / driftK / marketHarness (C-020-A T-004), cenový/drift/catchupStepCount vzorce + signatury.
- Změny = data (balance.js) + jednořádkové drátování capu + export + nové testy. Žádná nová core logika.

## Soubory (změněné/nové)
- M `src/core/balance/balance.js` (capBalanceRealHours; health evidence komentář + konstanty)
- M `src/app/main.js` (CATCHUP_CAP_MS odvozen z BALANCE + export)
- A `test/m9a-offline-cap.test.js` (T3 + MINOR-1)
- A `test/m9a-regression.test.js` (T4 segmentovaný regression + golden hashe)

## Handoff
- → Reviewer: grep-gate (žádná změna formulas.marketPrice/marketDailyDrift/catchupStepCount signatur),
  MINOR-1 drátování, golden artefakt regenerovatelnost.
- → Tester: smoke (1 seed/invarianty) vs plný (3 seedy/golden) split; REGEN_GOLDEN=1 pro obnovu při
  záměrné změně dat.
