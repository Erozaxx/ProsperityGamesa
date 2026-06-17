# Review — Gate M9a + DoD M9a (iter-020, T-007)

- **Review ID**: REVIEW-020-007
- **Task**: T-007 (reviewer, Opus) — závěrečný review gate M9a + ověření DoD M9a
- **Brief**: BRIEF-020-007
- **Autor**: reviewer
- **Datum**: 2026-06-15
- **Rozsah**: `git diff $(git merge-base HEAD main)..HEAD -- src/ test/`
- **Verdikt**: **GO**

> Metodika: correctness ověřena PROTI KÓDU (čtení src + grep), ne převzata z impl summary ani QA.
> Tester T-006 dal GO empiricky; tento gate hodnotí correctness/kvalitu/invarianty nezávisle.

---

## Rozsah diffu (8 souborů, +844 / −6)

```
src/app/main.js                 (+11/−6)   MINOR-1 cap wiring + export
src/core/balance/balance.js     (+54)      driftK provenance, capBalanceRealHours, home.js:970 evidence
src/core/systems/market.js      (+3/−1)    POUZE komentář (G-MARKET-DRIFT closed)
src/precache.js                 (+1/−1)    auto-generated hash bump (ne logika)
test/helpers/marketHarness.mjs  (+127)     nový test-only harness
test/m9a-market.test.js         (+268)     CÍL-1/2/3 + driftK sweep
test/m9a-offline-cap.test.js    (+82)      T3 cap + MINOR-1 no-op test
test/m9a-regression.test.js     (+303)     T4 segmentovaný regression + golden-hash
```

Diff obsahuje přesně očekávané soubory (design §5 split A/B). Žádný nečekaný zásah do core logiky.

---

## Tvrdé invarianty (ověřeno proti kódu)

### INV-1 — Kalibrace = DATA ne logika — **PASS**
- `marketPrice` (`formulas.js:18`): tělo i signatura `(basePrice, available, max)` mimo diff → beze změny.
- `marketDailyDrift` (`market.js:124`): body-level diff prázdný (grep non-comment řádků = 0); změnily se POUZE doc-komentáře. Signatura `(state, _params, _ctx)` a vzorec `available += k·(baseline−available)` clamp `[0,max]` beze změny.
- `catchupStepCount` (`catchup.js:22`): soubor NENÍ v diffu vůbec → signatura `(missedMs, capRealMs)` i tělo beze změny.
- `balance.js` je `Object.freeze({...})` → změny jsou čistě datové/komentářové.
- Závěr: kalibrace proběhla jako změna dat + komentářů, žádná změna cenového/drift/catch-up vzorce. **Invariant drží.**

### INV-2 — MINOR-1: cap odvozen z BALANCE, ne hardcoded, NE no-op — **PASS (KLÍČOVÉ, ověřeno)**
- `main.js:64`: `export const CATCHUP_CAP_MS = Math.min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * 3600 * 1000;` — odvozeno z BALANCE, NE literál `8*3600*1000`.
- **Konstanta žije (ne no-op)** — kritické ověření za QA: `CATCHUP_CAP_MS` se nepoužívá jen v testu, ale teče do produkční catch-up cesty:
  - `main.js:256` `const capMs = CATCHUP_CAP_MS;`
  - `main.js:257` `const totalSteps = catchupStepCount(missedMs, capMs);`
  - `main.js:258` `const wasCapped = missedMs > capMs;`
  → efektivní cap = `min(tech, balance)` se reálně aplikuje na offline progres. Kdyby byl cap hardcoded, snížení `capBalanceRealHours` by se neprojevilo; takto ano. D10 (over-cap zastropí na 576 000 kroků @8h) zachováno.
- `test/m9a-offline-cap.test.js` re-derivuje vzorec z BALANCE a testuje min-kontrakt + D10. Adekvátní.

### INV-3 — Cíle proti referenci (R-C) — **PASS**
- CÍL-1/2/3 v `m9a-market.test.js` měřeny přes harness, který staví VÝHRADNĚ na `createInitialState/initRng/marketInit/marketDailyDrift` + `goods.json` z disku. Žádný odkaz na serverové křivky (neexistují, R-C/§9.1).
- N=14: `0.8^14 ≈ 0.044 < 0.05`, `0.8^13 ≈ 0.055 > 0.05` → matematicky korektní kalibrovaný cíl pro driftK=0.2. Empirický `recoveryDays(tools,5%)=14` (skutečný drift běh, ne dosazený vzorec).
- CÍL-2 spread invariant (`sell<buy`, round-trip ztrátový) napříč 5 frakcí × 5 goods + reálný `buyGoods`/`sellGoods`. Impact ≥60 % (CÍL-3, `1−k=0.80`). Sweep audit `[0.10,0.40]`.

### INV-4 — Determinismus + dekompozice — **PASS**
- Regression: kvartální segmenty 81 900 kroků (91 dní), každý `it()` ≤ 1 kvartál → pod limitem prostředí. Save/load checkpoint per kvartál (`applyPersist`→`loadAndReconstruct`) → bit-identičnost s kontinuálním během = G1 přes save hranici.
- Golden-hash (`GOLDEN.hashes` A/B/C × Q1–Q4) je `Object.freeze`d verzovaný artefakt; `REGEN_GOLDEN=1` cesta s jasným protokolem regenerace v hlavičce. FNV-1a nad sorted-key JSON (`hashState`) → deterministický, ne flaky (žádný `Date.now`/`Math.random` v běhu).
- Determinismus testy (`deepStrictEqual` 2× běh) v market i regression suite.

### INV-5 — Vědomé odchylky zapsané, ne skryté — **PASS**
- `home.js:970`: grep `consecutiveDiseased|inoculation|p_innoculation` v `src/core/` mimo balance.js = **0** (ověřeno). Mechanika v core NEEXISTUJE → žádná logická změna. Konstanty `diseaseRecoveryBase:0.02`/`inoculationBonus:0.01` evidovány v balance.js (řádky 265–284) jako `original-intended`, NEčte je žádná logika (grep readers mimo balance.js = 0) → inertní evidence. Korektně deferred.
- `capBalanceRealHours` (MINOR-4): název-divergence od architekturního `capRealHours` zapsána jako záměrná v balance.js komentáři.
- driftK provenance `approximated→calibrated` zapsáno v balance.js i market.js komentáři. G-MARKET-DRIFT uzavřen v komentáři.

---

## DR-020-01 — podmínky vyřešené?

| Podmínka | Stav | Důkaz |
|---|---|---|
| MINOR-1 (cap z BALANCE, ne no-op) | **VYŘEŠENO** | main.js:64 derivace + 256-257 živé použití |
| MINOR-2 (správné state cesty) | **VYŘEŠENO** | `home.population.total`/`player.gold`/`home.food.store[type]` — ověřeno v createInitialState.js (řádky 82,86); ne neexistující `home.foodStore`/`curWorkers` |
| MINOR-4 (název divergence) | **VYŘEŠENO** | zapsáno jako vědomá odchylka v balance.js |
| home.js:970 odchylka | **VYŘEŠENO** | evidence-only, grep=0, deferred |

---

## Soulad s architekturou
- §9.1 trh (cíle proti feel ne serveru): OK. §9.2a/D10 cap separace tech/balance + `min`: OK, separace zachována (dvě nezávislá pole, i když var A obě =8). K4/K7 determinismus: OK. R-C: OK (DoD proti explicitním cílům).
- Reuse / mrtvý kód: `marketHarness.mjs` orchestruje existující core fce (NE druhá implementace trhu) — ověřeno čtením; staví na `createInitialState/initRng/marketInit/marketDailyDrift`. Test-only (mimo `src/core` → neporušuje lint:core gate). Žádný mrtvý produkční kód (evidence-konstanty jsou vědomě deferred, ne mrtvý kód).
- Testy běží v CI: `node --test` auto-discover `test/**/*.test.{js,mjs}` → m9a-* soubory zahrnuty.

---

## Nálezy

**Blocker**: žádný.
**Major**: žádný.
**Minor**: žádný.

**Nit (nezávazné, neblokující):**
- **NIT-1** `test/m9a-offline-cap.test.js` importuje `CATCHUP_CAP_MS` z `src/app/main.js` → tahá app-vrstvu do unit testu (proti čistotě harness konvence v market/regression suite). Funkčně OK (top-level const, žádný DOM side-effect při importu), ale dlouhodobě by konstanta mohla žít v `src/core/balance` nebo dedikovaném config modulu, aby cap-test nezávisel na app boot modulu. Drobnost, ne pro M9a.
- **NIT-2** `m9a-market.test.js` T2 sweep používá analytický model `(1−k)^n` paralelně k empirickému `recoveryDays`. Je to vědomě komentováno jako audit trail; konzistentní s designem §2.2. Bez akce.

---

## Stanovisko k DoD M9a

**DoD M9a SPLNĚNO.** Trh i offline cap kalibrovány proti EXPLICITNÍM měřitelným hratelnostním cílům (ne serverové referenci, R-C); cap empiricky i staticky odvozen z BALANCE a živě zapojen do produkční catch-up cesty (no-op past uzavřena); balanc regression segmenty bit-identické přes save/load a golden-hash deterministický/regenerovatelný; invarianty křivek drží v ročním běhu; cenový/drift/catch-up vzorec beze změny (kalibrace = data); vědomé odchylky (driftK calibrated, cap separace, home.js:970, MINOR-4 název) zapsané ne skryté; gap G-MARKET-DRIFT uzavřen.

- **kalibrace = data**: POTVRZENO (body-level diff market.js/formulas/catchup = 0).
- **MINOR-1 cap**: POTVRZENO (odvozen z BALANCE, živé použití main.js:256, ne no-op).
- **cíle proti referenci**: POTVRZENO (harness na core+goods.json, žádná serverová data; N=14 korektní).
- **determinismus segmentů**: POTVRZENO (81 900 kroků/kvartál, save/load bit-identické, golden ne flaky).

## Verdikt: **GO**

Žádné blocker/major/minor nálezy. 2 nity (nezávazné). M9a může být uzavřeno.
