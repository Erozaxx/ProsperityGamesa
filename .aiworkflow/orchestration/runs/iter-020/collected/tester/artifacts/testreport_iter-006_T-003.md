# Test Report – iter-006 T-003 (M1 katalogy & balanc data)

- **Task ID**: T-003
- **Brief**: BRIEF-021
- **Iteration**: iter-006 (M1)
- **Tester**: tester (Sonnet)
- **Datum**: 2026-06-13
- **Verdikt**: **PASS**

---

## Shrnutí výsledků

| Oblast | Výsledek | Detaily |
|---|---|---|
| `npm run ci` (tsc + grep gate + node --test) | PASS | 238/238 testů (39 suits), 0 selhání |
| Schema validace všech 16 katalogů | PASS | Všechny katalogy projdou assertCatalogValid i validateCatalog |
| Tabulkové testy vzorců | PASS | Všechny referenční čísla z design spec §4.3 souhlasí |
| Fail-fast na rozbitém katalogu | PASS | 7 fail-fast testů – výjimka házena správně |
| BUG-001 regrese (cyklický objekt) | PASS | checkNoFunctions s WeakSet – čistá výjimka, ne RangeError |
| Extrakce reprodukovatelná | PASS | 2× spuštění extract.mjs = identické katalogy |
| PWA smoke (kumulativní sada) | PASS | gen-precache testy zelené, deterministické |

---

## Detailní výsledky

### 1. CI pipeline
```
tsc --noEmit:   0 chyb (EXIT 0)
lint:core:      PASS (grep gate OK)
node --test:    238/238 PASS (39 suites)
npm run ci:     ZELENÉ
```

Počet testů vzrostl z 172 (iter-005 baseline) na 238 (+66 nových testů v test/iter006-catalog-schema.test.js).

### 2. Schema validace katalogů
Všech 16 katalogů v src/data/ prošlo schema validací:
- Array katalogy (7): achievements, buildings, food, houseTypes, jobs, military, resources
- Object katalogy (5): balance, companies, population, techs, zones
- Prázdné katalogy s approximated provenance (4): goods, marketBaseline, sectors, skills

Každý katalog má `_meta.provenance` (extracted/derived/approximated).

### 3. Počty položek (dle design spec)
| Katalog | Očekáváno | Skutečnost | Status |
|---|---|---|---|
| food | 6 | 6 | OK |
| houseTypes | 8 | 8 | OK |
| achievements | 15 | 15 | OK |
| military | 2 | 2 | OK |
| resources | 5 (gold,ore,stone,techPt,wood) | 5 | OK |
| population.causesOfDeath | 14 | 14 | OK |

### 4. Tabulkové testy vzorců (formulas.test.js)
Všechny referenční čísla z design spec §4.3:

| Vzorec | Vstup | Očekávaný | Skutečný | Status |
|---|---|---|---|---|
| techCap(0) | 0 | 100 | 100 | OK |
| techCap(1) | 1 | 125 | 125 | OK |
| techCap(2) | 2 | 156 | 156 | OK |
| techCap(4) | 4 | 244 | 244 | OK |
| techCap(10) | 10 | 931 | 931 | OK |
| marketPrice(100,0,100) | available=0 | 337.5 | 337.5 | OK |
| marketPrice(100,50,100) | available=50 | 100 | 100 | OK |
| marketPrice(100,100,100) | available=max | 12.5 | 12.5 | OK |
| marketPrice(100,150,100) | clamp | 12.5 | 12.5 | OK |
| workerEfficiency({}) | base | 1 | 1 | OK |
| workerEfficiency(penalty<-0.75) | clamp dolní | 0.25 | 0.25 | OK |
| workerEfficiency(bonus>1) | clamp horní | 2 | 2 | OK |
| workerEfficiency({curfew:true}) | curfew | 0.75 | 0.75 | OK |
| spoilage(0.18, 100) | meat 100 | 18 | 18 | OK |
| spoilage(0.23, 10) | fish 10 | 2 | 2 | OK |
| spoilage(0.08, 7) | bread 7 | 0 | 0 | OK |
| natality(100, 0.04) | pop 100 | 4 | 4 | OK |
| natality(250, 0.02) | pop 250 | 5 | 5 | OK |
| round(108*1.5) | archer upkeep | 162 | 162 | OK |

Poznámka: scaleCost({gold:100,wood:50}, 1.15) = {gold:114, wood:57} – JS floating point 100×1.15=114.999... → floor=114 (shodné se zdrojovým config.js, chování je správné a zdokumentované v impl note).

### 5. Fail-fast na rozbitém katalogu (7 testů)
- missing `_meta` → throws "catalog validation failed" ✓
- missing required field `id` v food item → errors contain 'id' ✓
- missing required field `name` v food item → errors ✓
- missing required field `id` v houseTypes item → errors ✓
- missing required `goldCost` v military item → errors ✓
- neznámý catalog name → error "no schema" ✓
- broken input neprojde tichý průchod (regression guard) ✓

### 6. BUG-001 regrese (registry.test.js)
Tři testy potvrzeny zelené:
- `const a={}; a.self=a; assertSerializable(a)` → doesNotThrow (dříve RangeError stack overflow)
- `a.fn=()=>{}` → throws "must not contain functions" (ne RangeError)
- happy path plain nested object → doesNotThrow

Fix je přítomen: `checkNoFunctions(val, seen)` s `WeakSet` v src/core/registry/registry.js.

### 7. Extrakce reprodukovatelná
- `node tools/extract/extract.mjs` proběhl bez chyby
- Druhý běh extrakce: 0 diff v src/data/ (16/16 katalogů identické)
- Extrakce hlásí: 16 ok, 0 failed

### 8. PWA smoke (kumulativní, gen-precache.test.js)
- generatePrecache produkuje src/precache.js
- PRECACHE_VERSION starts with "prosperity-", délka > 15
- URL jsou ./relative, bez duplicit
- Obsahuje ./index.html, ./manifest.webmanifest
- Neobsahuje .test.js, .d.ts, .gitkeep, .md
- Deterministické (2× běh = stejná verze a soubory)

### 9. Referenční data v katalozích (spec §4.3)
Ověřeno v iter006-catalog-schema.test.js:
- archer goldCost=1620, upkeep=162 ✓
- warrior goldCost=1080, upkeep=108 ✓
- natality matRate=0.04, retRate=0.02 ✓
- spoilage meat=0.18, fish=0.23, bread=0.08 ✓
- D-CHEESE-SPOILAGE: spoilage.cheese=0.08, baseSpoilage.cheese=0.10 (obě hodnoty přítomny) ✓
- techBase=100, techScale=1.25 ✓
- balance.army.archerUpkeep=162 ✓
- balance.population.workerEffMin=0.25, workerEffMax=2 ✓
- mansion {workers:6, capacity:1000, attractiveness:4} ✓
- estate {workers:20, capacity:10000, attractiveness:100} ✓
- publichouse {workers:25, capacity:3000, attractiveness:-10} ✓
- KuttingKorners gold=2000, LawyeredUp gold=200000, StrikeGoldInc {gold:10000, wood:2400} ✓

---

## Přidané testy
Nový soubor: `test/iter006-catalog-schema.test.js`
- 66 nových testů ve 7 describe suitech
- Scope: schema validace, item counts, reference values, fail-fast, reproducibility, gap-report

---

## Regresní rizika
- Nízké. Nové testy jsou read-only (loadJson z src/data/). Extraction test spouští extract.mjs ale vrátí identický výstup (idempotent).
- jobs.json používá products jako array místo map – schema to toleruje (required: ['id','name','products']). Rozdíl od návrhu, ale validátor přijímá. Neblokuje M1 (M3 rekonstrukce dotěží).

---

## Recommendation: **Go**
Všechny AC jsou splněny. Iterace iter-006 M1 je připravena na uzavření.
