# QA Report — T-006 (iter-020, M9a Balanční kalibrace)

- **Report ID**: QA-020-006
- **Task**: T-006 (tester, Sonnet) — nezávislá QA M9a + DoD M9a
- **Brief**: BRIEF-020-006
- **Datum**: 2026-06-15
- **Verdikt**: **GO** — DoD M9a splněno. Všechna AC PASS, empiricky ověřeno vlastním během.

> Metodika: každé tvrzení coderů ověřeno EMPIRICKY vlastním headless/CI během (ne převzato z impl summary). Produkční kód nebyl trvale měněn (jediná mutace = dočasný no-op probe v balance.js, vzápětí bit-identicky revertován + ověřeno `diff`).

---

## Souhrn výsledků

| # | AC (DoD M9a) | Verdikt |
|---|---|---|
| AC1 | `npm run ci` zelené + `npm run smoke` OK | **PASS** |
| AC2 | Cíle trhu CÍL-1/2/3 deterministické proti definovaným cílům | **PASS** |
| AC3 | Cap odvozen z BALANCE (MINOR-1, ne no-op) | **PASS** |
| AC4 | Regression segmenty bit-identické + golden-hash regenerovatelný/deterministický | **PASS** |
| AC5 | Invarianty křivek drží (rok+) | **PASS** |
| AC6 | Determinismus G1 + offline cap D10 zachováno | **PASS** |
| AC7 | home.js:970 vědomá odchylka, mechanika v core NEEXISTUJE (grep=0) | **PASS** |
| AC8 | M9a nerozbil M8/M7/M5/M6 + cenový/drift vzorec beze změny | **PASS** |

**PASS: 8 / 8. FAIL: 0.**

---

## AC1 — CI zelené + smoke OK — **PASS**

Vlastní běh `npm run ci` (typecheck → lint:core → test):
```
# tests 1550
# suites 410
# pass 1550
# fail 0
```
EXIT 0. typecheck (tsc --noEmit) + lint:core (check-core-imports) prošly.

`npm run smoke` (EXIT 0):
```
SMOKE OK: app rendered, 0 console errors.
```
App vyrenderoval (Rok 1 · den 1, všechny taby vč. Trh/Deník). 0 console errors.

---

## AC2 — Cíle trhu CÍL-1/2/3 deterministické proti DEFINOVANÝM cílům — **PASS**

Vlastní běh `test/m9a-market.test.js`: **18 testů / 18 pass / 0 fail**.

- **CÍL-1 (recovery ≤5% za 14 dní)**: empiricky `recoveryDays(tools, 5%) = 14` (ne dosazený vzorec, skutečný `marketDailyDrift` běh). Po 14 dnech odchylka ≤5% baseline pro všech 5 goods; po 3 dnech ≥48% mezery obnoveno a `<100%` (drift viditelný, ne skokem).
- **CÍL-2 (arbitráž neztrátová)**: `sellingPrice < buyingPrice` napříč `available ∈ {0,.25,.5,.75,1}·max` × 5 goods; round-trip buy K→sell K přes reálný `buyGoods`/`sellGoods` command registr = ztrátový; velký round-trip s cenovým dopadem návratnost <0.55. Invariant chráněn spreadem 1.35/0.6.
- **CÍL-3 (impact persistence ≥60%/den)**: po max výprodeji zůstane ≥60% dopadu po 1 dni driftu (1−k=0.80).
- **DriftK sweep audit** (vlastní CI log): `0.10→N29/ret0.90 .. 0.40→N6/ret0.60`; 0.2 → N=14, retention 0.80; leží v okně [0.10, 0.40].
- **Cíle NEodkazují na serverová data**: harness staví výhradně na `createInitialState/initRng/marketInit/marketDailyDrift` + `goods.json` z disku; žádný odkaz na neexistující serverové křivky (ověřeno čtením `marketHarness.mjs`).
- **Determinismus**: `stejný seed → stejné available po 14 dnech` PASS.

---

## AC3 — Cap odvozen z BALANCE (MINOR-1, KRITICKÉ, ne no-op) — **PASS**

`test/m9a-offline-cap.test.js`: 7/7 pass. Navíc **vlastní empirické ověření no-op pasti** (klíčový bod briefu):

1. **Re-derivace ze zdroje**: `CATCHUP_CAP_MS` v `src/app/main.js:64` =
   `Math.min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * 3600 * 1000`.
   - grep zdroje: výraz **referencuje `capBalanceRealHours`** (true), **NENÍ hardcoded** `8 * 3600` literál (false).
   - `CATCHUP_CAP_MS = 28 800 000` == `min(8,8)·HOUR`.
2. **Definitivní mutační test (no-op vyvrácen)**: dočasně změněno `capBalanceRealHours: 8 → 2` v balance.js, fresh import:
   ```
   capBalanceRealHours= 2   CATCHUP_CAP_MS= 7200000   hours= 2
   ```
   → efektivní cap se ZMĚNIL z 8h na 2h. Konstanta NENÍ mrtvá. Soubor zápětí revertován (`diff` = bit-identický restore).
3. **Min-kontrakt na catchupStepCount**: over-cap 100h @8h = 576 000 kroků; @2h = 144 000 kroků → cap se mění s balanc hodnotou (CAP CHANGES = true).

---

## AC4 — Regression segmenty bit-identické + golden-hash — **PASS**

`test/m9a-regression.test.js`: **17/17 pass**.

- **Bit-identičnost (vlastní nezávislý harness, ne převzato)**: kontinuální 4-kvartální běh (BEZ save/load) vs segmentovaný běh (save/load po každém kvartálu), seed 0xA1:
  ```
  continuous final hash : 4005350179
  segmented  final hash : 4005350179
  BIT-IDENTICAL (seg==cont): true
  matches committed GOLDEN.A[3]=4005350179: true
  ```
  → save/load checkpointy NEMĚNÍ trajektorii; segmentace je poctivá; shoda s committed golden.
- **Golden-hash regenerovatelný + deterministický**: `REGEN_GOLDEN=1` spuštěn 2×; oba běhy identické (`diff run1 run2` = prázdný) a emitované hashe se PŘESNĚ shodují s committed `GOLDEN.hashes` (A/B/C × Q1–Q4). Není flaky.
- **Žádný it() nepřekročí limit**: nejdelší it() ≈ 1.53 s (determinismus test = 2× plný rok); ostatní kvartální it() ≈ 0.3–0.4 s. Bezpečně pod limitem prostředí.

---

## AC5 — Invarianty křivek drží (rok+) — **PASS**

SMOKE (1 seed/rok) + PLNÝ (3 seedy/rok) invariant asserty zelené:
- `0 < pop ≤ sanityMaxPop(10000)`, `gold ≥ 0`, `0 ≤ food[type] ≤ maxFood`, žádný NaN/Inf, žádný populační kolaps >30 dní v řadě.
- **MINOR-2 cesty ověřeny správné**: `state.home.population.total`, `state.player.gold`, `state.home.food.store[type]` (NE neexistující `home.foodStore`/`home.curWorkers` z designu §4.3 — coder je opravil, tiché NaN riziko ošetřeno).

---

## AC6 — Determinismus G1 + offline cap D10 — **PASS**

- **G1 přes save hranici**: dva nezávislé segmentované běhy seed A = stejné kvartální hashe (deepStrictEqual) = golden artefakt.
- **D10 over-cap**: `catchupStepCount(100h, CATCHUP_CAP_MS)` = 576 000 kroků (8h cap správně aplikován min); under-cap 1h = přesně missedMs/STEP_MS (cap se neaplikuje). `STEP_MS=50`.

---

## AC7 — home.js:970 vědomá odchylka, žádná tichá logická změna — **PASS**

- `grep consecutiveDiseased|inoculation|p_innoculation` v `src/core/` mimo balance.js = **0**. Mechanika v core NEEXISTUJE.
- Jediný výskyt = `src/core/balance/balance.js` jako EVIDENCE komentář (řádky 265–284): vědomá odchylka označená `original-intended`, zamýšlená varianta `0.02 + (inoculation?0.01:0)`, konstanty `diseaseRecoveryBase:0.02`/`inoculationBonus:0.01` evidovány ale NEZAPOJENY (žádná logika je nečte).
- `grep Math.random()` v `src/core/` = 0 (komentář lint-safe přepsán na `rng <`).
- → Žádná tichá logická změna; odchylka pouze zdokumentována pro budoucí implementaci (M9b+).

---

## AC8 — M9a nerozbil M8/M7/M5/M6 + vzorce beze změny — **PASS**

- **Regression sady** (m8-* / m7b / m7a2 / m5 / m6 / m4b / catchup / iter005-edge / firstStarve): **639 / 639 pass / 0 fail**.
- **TC-01 arbitráž** (m4b) zelené; **iter005-edge G1** zelené (78/78 vč. obou souborů).
- **Vzorce/signatury beze změny** (grep gate):
  - `marketPrice(basePrice, available, max)` — beze změny
  - `marketDailyDrift(state, _params, _ctx)` — beze změny
  - `catchupStepCount(missedMs, capRealMs)` — beze změny
  - spread `haggleBuy:1.35 / haggleSell:0.6` — beze změny; `goods.json` baselineFraction = 0.5 (5×) beze změny; `driftK:0.2` (hodnota beze změny, jen provenance komentář approximated→calibrated).

---

## Známé gapy (NE bug — M9b/cleanup, dle scope OUT)
TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1, mobile UX/PWA/licence — mimo scope M9a, neblokuje.

## Bug reporty
Žádné. Produkční kód nezměněn (kromě dočasného revertovaného no-op probe).

---

## Verdikt: **GO**

DoD M9a splněno: trh i offline cap kalibrovány proti EXPLICITNÍM definovaným cílům (ne serverovým datům); cap empiricky odvozen z BALANCE (no-op vyvrácen mutačním testem); balanc regression segmenty bit-identické a golden-hash deterministický/regenerovatelný; invarianty drží v ročním běhu; M9a nerozbil M8/M7/M5/M6; cenový/drift/catch-up vzorec beze změny; vědomé odchylky (driftK calibrated, cap separace, home.js:970) zapsané, ne skryté. CI 1550/0, smoke 0 errors.
