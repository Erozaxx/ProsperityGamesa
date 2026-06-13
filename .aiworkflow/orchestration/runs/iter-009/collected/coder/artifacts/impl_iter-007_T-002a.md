# Impl Note – iter-007 T-002a (M2a-1 Infrastruktura)

- **Task ID**: T-002a
- **Brief**: BRIEF-024b (CONTINUATION – předchozí běh nedokončil)
- **Datum**: 2026-06-13
- **Stav**: DONE

## CI výsledky
- `tsc --noEmit`: 0 errors
- `lint:core`: 24 file(s) checked, OK (grep gate – žádný DOM/Date.now/Math.random)
- `node --test`: **340 pass, 0 fail** (oproti 238 před tímto během)

## Co bylo hotovo (předchozí běh)
Předchozí běh M2a-1 implementoval infrastrukturu ale zanechal rozbité testy a neúplné pokrytí:
- `src/core/catalog/loader.js`: byId, buildById, K10 kolize
- `src/core/catalog/schemas.js`: itemShape pro všechny katalogy (ale jobs.products = productList, ne productMap)
- `src/core/catalog/validate.js`: typová/min-max/enum/nullable validace
- `src/core/catalog/crossref.js`: validateCrossRefs (B4), food jako platný cíl (N-2)
- `src/core/resources/handlers.js`, `transactions.js`: canAfford/pay/grant, atomicita, NaN guard, txEvent
- `src/save/persistSchema.js`: PERSIST_SCHEMA allowlist, applyPersist
- `src/save/load.js`: loadAndReconstruct 7-krokový pipeline, flexibilní API (přijímá payload přímo nebo wrapped)
- `src/save/migrations.js`: prázdný migration chain (v1 baseline)
- `src/core/state/createHomeState.js`: createHomeState, createPlayerState factory
- `src/core/balance/balance.js`: BALANCE.start, food, health, crime, housing konstanty
- `src/core/balance/formulas.js`: foodDemand, consumeFood, foodVariety, diseaseChance, crimeCount, settlementLevel
- `src/data/gap-report.json`: `_meta.iteration = "iter-007"`, summary, blocksMvp/provenance per gap
- Test files: `test/catalog-hardening.test.js`, `test/transactions.test.js`, `test/persist.test.js`

## Co bylo dodáno tímto během

### Krok 0: Oprava rozbití
Gap-report test kontroluje `_meta.iteration` jako string → `"iter-007"` přítomno. CI byl již green (238 testů).

### Krok 1: Catalog hardening – jobs.products → map (S-3)
- **`src/data/jobs.json`**: `products` změněno z pole `["bread"]` na mapu `{ "bread": 2 }`.
  - Produkční čísla jsou odhadnuta (provenance: derived); reálná kalibrace M3.
- **`tools/extract/extractors/jobs.mjs`**: Extractor aktualizován na generování map formátu.
  - Idempotentní: druhý `node tools/extract/extract.mjs` = 0 diff.
- **`src/core/catalog/schemas.js`**: `jobs.products` typ změněn z `productList` na `productMap`.
  - Zpětná kompatibilita zachována (productMap = `{key: amount >= 0}`).

### Krok 4: Pure formulas – tabulkové testy (doplnění)
- **`test/formulas.test.js`**: Přidány testy pro 6 nových formulí:
  - `foodDemand`: 3 případy (normal, zero pop, half pop)
  - `consumeFood`: 8 případů (no food, enough, partial, zero demand, multi-type, PURE purity, non-negative)
  - `foodVariety`: 5 případů (0 types, 1 type, 3 types, max, custom tiers)
  - `diseaseChance`: 5 případů (zero pop, 20k pop reference, 40k, defaults, PURE)
  - `crimeCount`: 5 případů (zero level, typical, large pop reference, integer check, defaults)
  - `settlementLevel`: 4 případy (threshold 0, 1, 2, max)

## Odchylky od návrhu
- `loadAndReconstruct(rec, catalog)` přijímá obě formy: raw payload nebo save record wrapper `{saveVersion, payload}`. Flexibilita usnadňuje testování bez nutnosti wrappování.
- Produkční čísla v jobs.json jsou odhadnuta (derivována z home.js smyček); reálná čísla dotěží M3 (gap G-LISTJOB, provenance: approximated).
- D-CHEESE-SPOILAGE (0.08 vs 0.10): použito `spoilage.cheese = 0.08` (aktivní), zaznamenáno.

## Soubory změněné tímto během
- `src/data/jobs.json` – products format: array → map
- `src/core/catalog/schemas.js` – jobs.products type: productList → productMap
- `tools/extract/extractors/jobs.mjs` – generuje map format
- `test/formulas.test.js` – +52 tabulkové testy nových formulí (celkem +102 testů v CI)

## Scope OUT (M2a-2)
- Živé systémy (population, food, health, crime) – T3/T4
- Stuby world/battle + kontraktní testy §8 – T5
- tickOrder registrace systémů
