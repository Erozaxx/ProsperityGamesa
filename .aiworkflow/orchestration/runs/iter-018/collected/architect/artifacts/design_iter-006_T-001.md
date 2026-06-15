# Detailní návrh (spec pro Sonnet) – iter-006 (M1: katalogy & balanc data)

- **Task**: T-001, iter-006 (BRIEF-019)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Povaha**: implementační spec PRO CODERA (Sonnet). NE implementace, NE změna architektury.
- **Vstupy**: architecture_proposal_iter-002_T-001.md (§5, §5.2, §5.5, §5.6, §9.3); doc/original_source_doc.md;
  doc/original_source/extracted/{rootscope-raw-dump.json, config-extract.json};
  doc/original_source/modules/prosperity/** (services/config.js 7520 ř., home.js 2665 ř., market.js, lists/listfood.js);
  src/core/{state, registry}; DR-001 (Q3 – autonomní gap eskalace).

---

## 0. Klíčové zjištění z reálných dat (čti první – determinuje celý M1)

**KRITICKÉ:** `rootscope-raw-dump.json` obsahuje pouze **statickou konfiguraci** (konstanty, houseTypes,
companies, achievements, season, browserNotificationTypes, techBase/techScale, CAUSESOFDEATH). Dynamické katalogy
jsou v dumpu **PRÁZDNÉ**: `itemList: {}`, `techTree.children: []`, `sectors: {}`, `world: {}`, `upgrades: {}`.

Důvod (config.js:196-225): originál fetchuje 16 JSON listů za běhu z `modules/prosperity/<list>.json`:
`listBuildings, listFood, listGoods, listHint, listJob, listmilitaryunit, listPeople, listPlace, listPolicy,
listProfession, listResource, listSectors, listSkill, listTechs, listZone, listRelics`.
**Z těchto 16 souborů je v repu fyzicky přítomen pouze `lists/listfood.js`.** Ostatní list-JSONy v repu NEJSOU.

**Důsledek pro M1 (toto je hlavní gap, řídí T1 a T6):**
- Plně doložitelné z dat: **food** (listfood.js), **houseTypes**, **companies (builders/explorer)**, **achievements**,
  **military units** (warrior/archer cena+upkeep z konstant), **season/engine konstanty**, **balance konstanty**,
  **CAUSESOFDEATH**, **maps**, **browserNotificationTypes**.
- **NEdoložitelné z dumpu** (jen názvy/odkazy ze source doc + zdrojový kód, ne strukturovaná data):
  **listBuildings, listGoods, listJob, listResource, listProfession, listSkill, listTechs, listZone, listSectors,
  listPeople, listPlace, listPolicy, listmilitaryunit detaily, listRelics, listHint**.
- Tyto katalogy se v M1 **rekonstruují primárně ze zdrojového kódu** (config.js default `world.home` blok, home.js,
  forest/field/mine.js, market.js) a kde ani to nestačí → `provenance: 'approximated'` + gap report (T6, DR-001 autonomní).

**MVP datový scope (M2–M4) – co MUSÍ být v M1 reálné (ne approx):**
| Katalog | Milník spotřeby | Zdroj v M1 |
|---|---|---|
| `resources.json` (wood, ore/stone, gold, techPt + food agg) | M2/M3 | konstanty + home.js produkce |
| `food.json` (6 položek) | M2 | **listfood.js – plně doložitelné** |
| `jobs.json` (joby + products/cost/area) | M3 | rekonstrukce z home.js jobs + config |
| `buildings.json` (granary, warehouse, builderHut, service) | M2/M5 | rekonstrukce z config.js + source doc §5 |
| `houseTypes.json` (8 tierů) | M2 | **dump – plně doložitelné** |
| `population.json` (natalita, úmrtí, jídlo rate) | M2 | **config.js world.home blok – doložitelné** |
| `goods.json` + `marketBaseline.json` | M4 | rekonstrukce; baseline = approx (server data chybí) |
| `companies.json` (builders) | M5 | **dump – plně doložitelné** |
| `military.json` (warrior/archer) | M7 (kontrakt teď) | **dump konstanty – doložitelné** |

**Co lze approximovat (pozdní milníky, M6/M7):** `techs.json` (jen vzorec 100×1.25^level je doložitelný, strom NE),
`zones.json` (listZone chybí úplně), `skills.json` (struktura ze skills.js, hodnoty approx), `sectors.json`.
Tyto se v M1 vygenerují jako **kostry s `provenance:'approximated'`** a plný obsah dotěží příslušný milník.

---

## 1. Souhrn tasků a cílových cest

```
tools/extract/                       # T1 – Node extrakční pipeline (výstupy commitnuté)
  extract.mjs                        #   orchestrátor: spustí všechny extraktory, zapíše src/data/*, gap-report
  lib/sources.mjs                    #   načtení dump+config-extract+listfood+source moduly (read-only)
  lib/writeCatalog.mjs               #   atomický zápis JSON + _meta (provenance, sourceRef, version)
  lib/provenance.mjs                 #   helpery: extracted | derived | approximated
  extractors/                        #   per-katalog mapéry (1 soubor = 1 katalog)
    houseTypes.mjs companies.mjs achievements.mjs food.mjs resources.mjs
    jobs.mjs buildings.mjs goods.mjs military.mjs population.mjs balance.mjs
    techs.mjs zones.mjs skills.mjs sectors.mjs
src/data/                            # T1 výstup – verzované JSON katalogy (commitnuté)
  _index.json buildings.json goods.json food.json jobs.json resources.json
  houseTypes.json companies.json military.json population.json marketBaseline.json
  techs.json zones.json skills.json sectors.json achievements.json
  gap-report.json                    # T6 strojový gap report
src/core/catalog/                    # T2 – schémata + loader + validátor + index
  schemas.js                         #   schéma per typ (runtime validátor, žádná knihovna)
  validate.js                        #   generický validátor, fail-fast s cestou k chybě
  loader.js                          #   loadCatalog(): import + validace + byId index + cross-ref check
  index.js                           #   re-export public API
src/core/balance/
  balance.js                         # T3 – pojmenované konstanty (přepis .gitkeep)
  formulas.js                        # T3 – čisté vzorce
src/core/registry/
  effects.js                         # T5 – registr efektů obsahu (kostra, string-ID)
  registry.js                        # BUG-001 fix (existující soubor)
test/
  formulas.test.js                   # T4 – tabulkové testy vzorců (node:test)
  catalog-validate.test.js           # T2 – validátor fail-fast testy
  registry.test.js                   # BUG-001 regresní test (cyklus)
doc/gap-report-iter-006.md           # T6 – lidsky čitelný gap report + eskalace (DR-001)
```

Pravidla (z architektury §3.1): `tools/` běží v Node, bez závislostí, výstup commitnutý. `src/core/` bez DOM/IO,
`src/data/` čistá data (žádné funkce – chování přes string-ID do `effects.js`).

---

## 2. T1 – Extrakční pipeline (`tools/extract/`)

### 2.1 Princip a kontrakt
- `node tools/extract/extract.mjs` → přečte zdroje (read-only), zavolá každý extraktor, zapíše `src/data/*.json`
  + `gap-report.json`. **Idempotentní**: dvojí spuštění dá bitově identický výstup (žádný `Date.now()`, žádné
  `Math.random()`, deterministické pořadí klíčů – `JSON.stringify` se setříděnými klíči).
- Každý zapsaný katalog má hlavičku `_meta`:
  ```json
  { "_meta": { "version": "0.9.5", "generatedFrom": "rootscope-raw-dump.json#houseTypes",
               "extractor": "houseTypes.mjs", "provenance": "extracted",
               "catalogVersion": 1, "itemCount": 8 } }
  ```
- `provenance` hodnoty: `"extracted"` (1:1 z dumpu/config-extract), `"derived"` (vypočteno/přemapováno ze zdroj. kódu),
  `"approximated"` (chybí ve zdroji, doplněno odhadem – MUSÍ být i v gap-reportu).

### 2.2 Signatury (JSDoc)
```js
// lib/sources.mjs
/** @returns {{dump:object, config:object, listFood:object, moduleSrc:(rel:string)=>string}} */
export function loadSources();   // moduleSrc čte text souboru z modules/prosperity/<rel> pro grep-extrakci

// lib/writeCatalog.mjs
/** @param {string} name @param {object} body @param {object} meta @returns {void} */
export function writeCatalog(name, body, meta);   // zapíše src/data/<name>.json s setříděnými klíči

// lib/provenance.mjs
/** @returns {{provenance:'approximated', note:string, gap:string}} */
export function approx(note, gapId);

// extractors/<x>.mjs – každý:
/** @param {object} sources @returns {{ body:object, meta:object, gaps:GapEntry[] }} */
export function extract(sources);
```

### 2.3 Mapování polí (dump/zdroj → katalog) – per extraktor

**food.mjs** (provenance `extracted`): `listFood` (listfood.js) → `food.json`.
Mapování: `{id, name, description, type:'food'}` 1:1, 6 položek (bread, cheese, fish, fruit, meat, vegetable).
Doplň `spoilageRate` a `consumeWeight` z `population` extraktoru (cross-ref poznámka, hodnota žije v population.json).

**houseTypes.mjs** (`extracted`): `dump.houseTypes` → `houseTypes.json`.
Mapování: `houseTypes[type].effects = {attractiveness, workers, capacity?}` → `{id:type, workers, capacity, attractiveness}`.
Pozn.: `tent` nemá `capacity` (chybí v datech) → emit `capacity: null` + `derived` flag (kapacita stanu se v originálu
neuplatňuje). 8 položek.

**companies.mjs** (`extracted`): `dump.companies` → `companies.json`.
Mapování: tři skupiny `explorer[]` (mapsAvailable), `houseBuilder[]` (`{id,name,cost:{gold},type}`),
`mineBuilder` (objekt → znormalizuj do pole 1 prvku). 6 firem celkem.

**achievements.mjs** (`extracted`): `dump.achievements` → `achievements.json`. 15 položek, 1:1 `{id,name,description,level}`.
`unlocked` se NEextrahuje (to je stav, ne katalog).

**military.mjs** (`extracted`): konstanty z dumpu → `military.json`:
`warrior: {goldCost: 1080 (GOLDCOSTPERWARRIOR), upkeep: 108 (WARRIORUPKEEP)}`,
`archer: {goldCost: 1620 (GOLDCOSTPERARCHER), upkeep: 162 (ARCHERUPKEEP)}`. Pozn.: `ARCHERUPKEEP=round(108×1.5)=162`
(config.js:28) – zapiš `derivedFrom: "round(108*1.5)"`.

**population.mjs** (`derived`, zdroj = config.js world.home default blok ř. ~615-664) → `population.json`:
```json
{ "consumeFoodRate": 2,
  "natality":  { "matRate": 0.04, "retRate": 0.02 },
  "spoilage":  { "meat":0.18,"vegetable":0.14,"fruit":0.22,"bread":0.08,"cheese":0.08,"fish":0.23 },
  "baseSpoilage": { "meat":0.18,"vegetable":0.14,"fruit":0.22,"bread":0.08,"cheese":0.10,"fish":0.23 },
  "causesOfDeath": [ ...14 položek z dump.CAUSESOFDEATH... ],
  "maxFood": 500 }
```
**VĚDOMÁ ODCHYLKA (zapéct s poznámkou, K4/R-H):** `spoilage.cheese = 0.08` vs `baseSpoilage.cheese = 0.10` –
v originálu je reálná nekonzistence (effective ≠ base). Zapiš OBĚ hodnoty + `note: "source divergence cheese
spoilage 0.08 vs base 0.10; resolve in M9 calibration"` a gap entry. Aktivní hodnota pro M2 = `0.08` (effective).

**resources.mjs** (`derived`): rekonstrukce z home.js/forest/field/mine + konstanty → `resources.json`:
`wood` (TREEMATURETIME=36 pozn.), `ore`, `stone`, `gold` (kind:'gold'), `techPt` (kind:'techPt').
Každý zdroj `{id, kind, name, storable:bool}`. Toto je **registr zdrojů** pro B4 validaci (§T2).

**jobs.mjs** (`derived`, zdroj home.js job loop + config): kostra `{id, name, products:{resourceId:amount}, cost?,
area?, baseStep}`. Min. doložitelné joby (baker, woodcutter, miner, farmer, fisher, hunter…) z home.js:1545
(`job.curStep += home.workerEfficiency * job.number`). Kde produkční čísla nejsou jednoznačná → `derived` s poznámkou,
nejistá pole → gap. **MVP potřebuje aspoň: produkce dřeva, jídla (bread+meat+fish+vegetable+fruit+cheese), rudy.**

**buildings.mjs** (`derived`): granary, warehouse, builderHut + serviceBuildings (config.js:868). `{id, name,
baseCost:{...}, cost (=baseCost), category, unlocks?, onBuild?:effectId}`. `cost` validuj proti resources (B4).
scaleCost se NEukládá (derivát, §5.3).

**goods.mjs** (`derived` + `approximated` baseline): goods (nepotravinové zboží – nářadí, marble…) z listGoods chybí
→ rekonstrukce ze zdroje co lze, zbytek approx. `marketBaseline.json` = `{goodsId:{available, max, basePrice}}` –
**basePrice nelze doložit** (config.js:562 `basePrice = basePrice || ceil(random*1000)` – generováno náhodně za běhu,
server-side `available` neexistuje, T-002a C2). → cely marketBaseline `provenance:'approximated'`, gap entry, kalibrace M9 (§9.1 architektury).

**balance.mjs** (`extracted` konstanty): zapíše NE do src/data ale připraví hodnoty pro `balance.js` (T3) –
viz §4. (Extraktor může vyemitovat `src/data/_balance-source.json` jako audit stopu provenance konstant.)

**techs.mjs / zones.mjs / skills.mjs / sectors.mjs** (`approximated`): kostry.
`techs.json = { techBase:100, techScale:1.25, sectors:[], tree:[] }` (vzorec doložitelný, strom prázdný → gap).
`zones.json = { policies:["Growth","Resource","Military"], aiStates:[], factions:["theWarlord","thePsychopath",
"thePrincess","player"], zones:[] }` (jen výčty ze source doc §7 doložitelné, konkrétní zóny → gap).
`skills.json`, `sectors.json` = prázdné kolekce + gap. Aktivační prahy do balance.js (`AIMechanicStart:567000`,
`revoltMechanicStart:630000` – z dumpu, doložitelné).

### 2.4 Jak to ověří test/CI
- `tools/extract/extract.mjs` musí proběhnout bez chyby; výstup je commitnutý a `node tools/extract/extract.mjs &&
  git diff --exit-code src/data/` (reprodukovatelnost – druhý běh nezmění výstup).
- Loader (T2) validuje výstup → každý katalog projde schématem (jinak fail-fast).

---

## 3. T2 – Schémata, validátor, registr, index (`src/core/catalog/`)

### 3.1 Schéma per typ (`schemas.js`)
Deklarativní schéma jako plain data (bez knihovny – zero-build). Tvar pravidla:
```js
/** @typedef {{type:'string'|'number'|'int'|'bool'|'object'|'array', required?:boolean,
 *             min?:number, max?:number, of?:FieldSchema, fields?:Record<string,FieldSchema>,
 *             enum?:unknown[], ref?:'resource'|'food'|'building'}} FieldSchema */
export const SCHEMAS = {
  food:       { id:{type:'string',required:true}, name:{type:'string',required:true},
                type:{type:'string',enum:['food']} },
  houseType:  { id:{type:'string',required:true}, workers:{type:'int',min:0,required:true},
                capacity:{type:'int',min:0}, attractiveness:{type:'number',required:true} },
  company:    { id:{type:'string',required:true}, name:{type:'string',required:true},
                cost:{type:'object',of:{type:'number',min:0}}, type:{type:'string'} },
  resource:   { id:{type:'string',required:true}, kind:{type:'string',
                enum:['gold','techPt','goods','food','stock']}, storable:{type:'bool'} },
  job:        { id:{type:'string',required:true}, products:{type:'object',of:{type:'number'},ref:'resource'},
                cost:{type:'object',of:{type:'number'},ref:'resource'}, baseStep:{type:'number',min:0} },
  building:   { id:{type:'string',required:true}, baseCost:{type:'object',of:{type:'number'},ref:'resource'},
                category:{type:'string'}, onBuild:{type:'string'} /* effectId */ },
  military:   { goldCost:{type:'int',min:0,required:true}, upkeep:{type:'int',min:0,required:true} },
  // techs/zones/skills/sectors: tolerantní schéma (mohou být prázdné, provenance approximated)
};
```

### 3.2 Generický validátor (`validate.js`) – fail-fast
```js
/** @param {object} value @param {Record<string,FieldSchema>} schema @param {string} path
 *  @returns {void} @throws {CatalogError} s plnou cestou ('jobs.baker.products.wood') */
export function validateItem(value, schema, path);
/** @param {object} catalog @param {Record<string,FieldSchema>} schema @param {string} name @returns {void} */
export function validateCatalog(catalog, schema, name);
```
Chování (§5.2 architektury): chybějící required pole, špatný typ, mimo min/max, neznámý enum → **throw při loadu**
(ne runtime log). Chyba nese cestu k poli pro rychlou diagnózu.

### 3.3 Loader + string-ID registr + byId + cross-ref (`loader.js`)
```js
/** @returns {Catalog} – { byType:{food,jobs,...}, byId:Map<string,{type,item}>, meta } @throws při kolizi/dangling ref */
export function loadCatalog(rawCatalogs);
```
Kroky:
1. Pro každý typ: `validateCatalog` (§3.2).
2. **String-ID registr (K10)**: posbírej všechna `id` napříč VŠEMI typy do `byId`. **Kolize ID napříč typy = throw**
   (`catalog: id collision 'X' between jobs and buildings`).
3. **byId index**: `Map<id, {type, item}>` pro cross-type lookup (save aplikace, efekty).
4. **Cross-ref validace cost/products (B4)**: pro každý `job.products`, `job.cost`, `building.baseCost`,
   `company.cost` ověř, že každý klíč existuje v registru zdrojů (`resources.json` + speciální `gold`,`wood`,…) →
   neznámý klíč = throw (`catalog: 'baker.products.xyz' references unknown resource 'xyz'`). Tím překlep nemůže
   fabrikovat NaN ekonomiku.
5. Vrať immutable (`Object.freeze` hluboce v DEV).

### 3.4 Jak to ověří test (`catalog-validate.test.js`)
- Happy path: `loadCatalog(realData)` projde, `byId.size === Σ položek`, `byType.food` má 6, `houseTypes` 8.
- Fail-fast: mutovaný fixture (chybějící `id`, kolize ID dvou typů, `job.products.nonexistent`) → každý `assert.throws`
  s konkrétní zprávou (cesta k poli).
- Cross-ref: fixture `building.baseCost: {unobtanium: 5}` → throw zmiňující 'unobtanium'.

---

## 4. T3 – `balance.js` + `formulas.js` (`src/core/balance/`)

### 4.1 `balance.js` – pojmenované konstanty (jednotka + zdroj v komentáři)
```js
export const BALANCE = Object.freeze({
  engine: { stepSeconds: 0.05, stepsPerDay: 900, stepsPerSeason: 81900, maxStep: 5e8,
            slowRate: 2.8 },                                   // dump.engine, season
  season: { seasonDays: 91, startSeason:'Winter', startDay:16, startMonth:12, startYear:922 },
  forest: { treeMatureTime: 36 },                              // TREEMATURETIME
  tech:   { base: 100, scale: 1.25 },                          // techBase / techScale
  scholar:{ capBase: 300, capScale: 1.25 },                    // getScholarLevelCap (config.js:3826)
  market: { priceExponent: 3, priceFactor: 1.5,               // market.js:124
            haggleBuy: 1.35, haggleSell: 0.6 },                // config.js:416-417
  tax:    { centerBase: 22, cityGuardBase: 56 },               // TAXCENTERBASE / CITYGUARDBASE
  caravan:{ baseCapacity: 10000 },                             // BASECARAVANCAPACITY
  army:   { warriorCost:1080, warriorUpkeep:108,
            archerCost:1620, archerUpkeep:162 },               // dump konstanty
  population: { consumeFoodRate:2, matRate:0.04, retRate:0.02, // config.js world.home blok
                workerEffMin:0.25, workerEffMax:2 },           // home.js:1907-1910
  world:  { aiMechanicStart:567000, revoltMechanicStart:630000 },
  offline:{ capTechRealHours: 8 },                             // architektura §9.2a (potvrzeno benchmark M0)
});
```
Pozn.: `marketBaseline.basePrice` ani server `available` NEjsou konstanta – patří do `marketBaseline.json`
(approximated). Skills 2× kompenzace (architektura §5.5) se NEřeší v M1 vzorci, ale poznámkou u skills katalogu (M3).

### 4.2 `formulas.js` – čisté funkce `f(inputs, balance) → number`
```js
/** Cena zboží dle nabídky. market.js:124. clamp available∈[0,max] (architektura §9.1 N-02).
 * @param {number} basePrice @param {number} available @param {number} max @returns {number} */
export function marketPrice(basePrice, available, max);
//  = round( basePrice * (1.5 - min(clamp(available,0,max), max)/max)^3 * 1000 ) / 1000

/** Cena techu na úrovni level. config.js:1393-1394, source doc §6.
 * @param {number} level @returns {number} */            // = round(100 * 1.25^level)
export function techCap(level);

/** Scholar level cap. config.js:3826. @param {number} level @returns {number} */
export function scholarLevelCap(level);                   // = round(300 * 1.25^level)

/** Škálovaná cena (růst s počtem). config.js:1170 scaleCost. Vrací NOVOU mapu (čistá).
 * @param {Record<string,number>} baseCost @param {number} pct @returns {Record<string,number>} */
export function scaleCost(baseCost, pct);                 // každé pole = floor(amt * pct)

/** Efektivita pracovníků (součet bonusů, clamp). home.js:1901-1911.
 * @param {{base?:number, minWorkerPenalty:number, leaderMorality:number, entertainmentOffset:number,
 *          goodSpiritsBonus:number, workerMorale:number, curfew?:boolean}} p @returns {number} */
export function workerEfficiency(p);
//  e = 1 + minWorkerPenalty + leaderMorality + entertainmentOffset + goodSpiritsBonus + workerMorale
//  if (curfew) e -= 0.25;  return clamp(e, 0.25, 2)

/** Denní spoilage množství dané položky. home.js:641-642 (~~ = trunc k nule).
 * @param {number} pct @param {number} amount @returns {number} */
export function spoilage(pct, amount);                    // = Math.trunc(pct * amount)

/** Roční počet narození/odchodů. config.js nat.matRate/retRate (frakce populace/rok).
 * @param {number} population @param {number} rate @returns {number} */
export function natality(population, rate);               // = Math.floor(population * rate)

/** Ocenění koše zboží. source doc §4 getGoldValue (gold 1:1). @param {Record<string,number>} basket
 *  @param {(id:string)=>number} priceOf @returns {number} */
export function goldValue(basket, priceOf);               // Σ qty * priceOf(id); gold započítán 1:1
```
Všechny funkce: čisté (žádný state mut), žádný `Math.random()`/`Date.now()`. `balance` se předává explicitně, NE import
uvnitř vzorce (testovatelnost s vlastními konstantami).

### 4.3 Referenční čísla (skutečná, z reálných dat) – pro T4 testy
| Vzorec | Vstup | Očekávaný výstup | Zdroj výpočtu |
|---|---|---|---|
| `techCap(0)` | 0 | **100** | 100×1.25^0 |
| `techCap(1)` | 1 | **125** | round(100×1.25) |
| `techCap(2)` | 2 | **156** | round(156.25) |
| `techCap(4)` | 4 | **244** | round(244.140625) |
| `techCap(10)` | 10 | **931** | round(931.32…) |
| `scholarLevelCap(0)` | 0 | **300** | 300×1.25^0 |
| `scholarLevelCap(1)` | 1 | **375** | round(375) |
| `scholarLevelCap(2)` | 2 | **469** | round(468.75) |
| `marketPrice(p,max,max)` | available=max | **round(p×0.5³×1000)/1000 = p×0.125** | (1.5−1)³=0.125 |
| `marketPrice(100,0,100)` | available=0 | **337.5** | 100×1.5³=337.5 |
| `marketPrice(100,50,100)` | a=50,max=100 | **1.0** | (1.5−0.5)³=1 →100 … POZOR: 100×1³? viz níže |
| `marketPrice(100,100,100)` | a=max | **12.5** | 100×0.125 |
| `marketPrice(100,150,100)` clamp | a>max | **12.5** | clamp→a=max |
| `scaleCost({gold:100,wood:50},1.15)` | — | **{gold:115, wood:57}** | floor(100×1.15)=115, floor(57.5)=57 |
| `workerEfficiency` base case | vše 0 | **1** | 1+0… |
| `workerEfficiency` clamp dolní | součet ≤ 0.25 | **0.25** | min clamp |
| `workerEfficiency` clamp horní | součet ≥ 2 | **2** | max clamp |
| `workerEfficiency` curfew | base1, curfew=true | **0.75** | 1−0.25 |
| `spoilage(0.18, 100)` | meat 100 | **18** | trunc(18) |
| `spoilage(0.23, 10)` | fish 10 | **2** | trunc(2.3) |
| `spoilage(0.08, 7)` | bread 7 | **0** | trunc(0.56)=0 |
| `natality(100, 0.04)` | pop 100 | **4** | floor(4) |
| `natality(250, 0.02)` ret | pop 250 | **5** | floor(5) |
| `army upkeep` | archer | **162** | round(108×1.5) |

**Pozn. k `marketPrice(100,50,100)`:** `(1.5 − 50/100)³ = (1.0)³ = 1` → `round(100×1×1000)/1000 = 100`.
**Oprava řádku tabulky: očekávaný výstup = 100, NE 1.0.** (Coder zapíše 100 – uvedeno explicitně, ať se neporta překlep.)

**Referenční čísla z katalogů (T4 ověří i extrakci):** houseTypes (architektura/dump): mansion `{workers:6,
capacity:1000, attractiveness:4}`, estate `{20, 10000, 100}`, publichouse `{25, 3000, -10}`. companies:
KuttingKorners `gold:2000` (hovel), LawyeredUp `gold:200000` (manor), StrikeGoldInc `{gold:10000, wood:2400}`.
food: přesně 6 položek. achievements: 15 položek. CAUSESOFDEATH: 14 položek.

### 4.4 Jak to ověří test (`formulas.test.js`)
Tabulkový test (node:test): pole `{name, fn, args, expected}` projetých `assert.strictEqual`. Vědomé odchylky
(cheese spoilage 0.08 vs 0.10) testovány na obě hodnoty s komentářem. Float porovnání přes přesnou hodnotu
(vzorce vrací zaokrouhlené → strictEqual OK; kde ne, `assert.ok(Math.abs(a-b) < 1e-9)`).

---

## 5. T5 – Registr efektů obsahu (kostra, `src/core/registry/effects.js`)

Princip (§5.4 architektury): akce obsahu (`onBuild`, `onUnlock`, event `options[].fn`, kontrakt `onComplete/…`)
jsou v datech jako **string-ID + params**, ne funkce. M1 dodá KOSTRU registru (typovaný modul per doména) s několika
doloženými efekty + no-op fallbacky; plné efekty doplní obsahové milníky.

```js
/** @typedef {(state:GameState, params:object, ctx:TickContext)=>void} EffectFn */
/** Zaregistruje doménové efekty do fns registru (idempotentně). @param {Registry} reg @returns {void} */
export function registerEffects(reg);
```
Kostra efektů (string-ID doložené z dump.fns + source doc): `noop`, `createScholars` (params `{count}`),
`unlockBuilding` (`{id}`), `unlockMap` (`{map}`), `insertInventory` (`{goodsId, qty}`), `grantResource`
(`{resourceId, amount}`). Implementace v M1 = **validovaný no-op se zápisem do logu** (kostra) – skutečná mutace
státu přijde s příslušným systémem (M2+). Důležité: ID existují a `effects.json`/katalogy na ně mohou odkazovat,
takže cross-ref validace (§3.3 onBuild) má co rozlišit known vs unknown.

**Pozn.:** dump.fns obsahuje 130+ string-ID (eventXxx, contractXxxComplete/Expire/Reject…). M1 NEimplementuje vše –
jen vyjmenuje kontrakt (effectId namespace) a dodá kostru pro efekty referencované MVP katalogy (buildings.onBuild).
Zbytek = gap (T6) s plánem na milník.

Test (`registry.test.js` rozšíření): `registerEffects` je idempotentní; každý known effectId po `resolve` nevyhodí;
neznámý effectId → throw (využívá fail-fast z registry.js).

---

## 6. T6 – Gap report + provenance (DR-001 autonomní)

### 6.1 Strojový `src/data/gap-report.json`
```json
{ "_meta": { "iteration":"iter-006", "generatedFrom":["rootscope-raw-dump.json","modules/prosperity/**"] },
  "gaps": [
    { "id":"G-LISTBUILDINGS", "catalog":"buildings", "severity":"high", "milestone":"M5",
      "what":"listBuildings.json není v repu; budovy rekonstruovány ze zdroje (granary/warehouse/builderHut/service)",
      "provenance":"derived", "blocksMvp":true },
    { "id":"G-LISTGOODS", "catalog":"goods", "severity":"high", "milestone":"M4", "blocksMvp":true, ... },
    { "id":"G-MARKETBASELINE", "catalog":"marketBaseline", "severity":"high", "milestone":"M4/M9",
      "what":"basePrice generován náhodně za běhu (config.js:562), server-side available neexistuje",
      "provenance":"approximated", "blocksMvp":true },
    { "id":"G-LISTJOB", "catalog":"jobs", "severity":"high", "milestone":"M3", "blocksMvp":true, ... },
    { "id":"G-LISTTECHS", "catalog":"techs", "severity":"medium", "milestone":"M6",
      "what":"techTree.children prázdné; doložitelný jen vzorec 100×1.25^level", "provenance":"approximated" },
    { "id":"G-LISTZONE", "catalog":"zones", "severity":"low", "milestone":"M7",
      "what":"listZone chybí; doložitelné jen policies/factions/aiStates výčty", "provenance":"approximated" },
    { "id":"G-LISTSKILL", "catalog":"skills", "severity":"medium", "milestone":"M3/M6", "provenance":"approximated" },
    { "id":"D-CHEESE-SPOILAGE", "catalog":"population", "severity":"low", "milestone":"M9",
      "what":"vědomá odchylka spoilage.cheese 0.08 vs baseSpoilage 0.10", "provenance":"derived", "deferredTo":"M9" }
  ],
  "summary": { "extracted":N, "derived":M, "approximated":K, "blocksMvp":[...ids] } }
```

### 6.2 Lidsky čitelný `doc/gap-report-iter-006.md`
Tabulka gapů + sekce **Eskalace (DR-001 autonomní)**: díry se NEblokují na uživateli; chybějící data → katalog
s `provenance:'approximated'`, pipeline pokračuje, uživatel je jen INFORMOVÁN. Dokument explicitně uvede:
(a) co je MVP-blokující a kde se reálně dotěží (M3/M4/M5 rekonstrukcí ze zdroje), (b) co je odloženo na pozdní
milníky (techs/zones/skills), (c) doporučení: pokud bude potřeba vyšší věrnost, jediná cesta je re-extrakce
z běžící hry (listBuildings/listGoods/listTechs JSONy) – mimo scope M1.

### 6.3 DoD M1 (z architektury §11)
„data kompletní a validovaná; eskalace děr uživateli" → splněno když: extrakce projde, všechny katalogy projdou
loaderem (fail-fast), formulas testy zelené s referenčními čísly, gap-report existuje a označuje MVP-blokující díry
s plánem dotěžení.

---

## 7. BUG-001 fix – `assertSerializable` WeakSet (`src/core/registry/registry.js`)

### 7.1 Příčina
`checkNoFunctions(val)` (ř. 84-93) rekurzuje přes `Object.values` **bez ochrany proti cyklu**. Na cyklickém vstupu
(`a.self = a`) přeteče zásobník (RangeError: stack overflow) **dříve**, než se dojde k `structuredClone` (ř. 75),
který by cyklus zvládl. Tj. fail je tvrdý crash místo řízené chyby.

### 7.2 Fix (minimální, zachová sémantiku)
Přidat `WeakSet` seen do `checkNoFunctions` – navštívené objekty přeskočit:
```js
export function assertSerializable(params) {
  checkNoFunctions(params, new WeakSet());
  try { structuredClone(params); }
  catch (e) { throw new Error(`registry: params not serializable: ${String(e)}`); }
}
/** @param {unknown} val @param {WeakSet<object>} seen */
function checkNoFunctions(val, seen) {
  if (typeof val === 'function') throw new Error('registry: params must not contain functions');
  if (val !== null && typeof val === 'object') {
    if (seen.has(/** @type {object} */(val))) return;   // cyklus – už navštíveno
    seen.add(/** @type {object} */(val));
    for (const v of Object.values(/** @type {object} */(val))) checkNoFunctions(v, seen);
  }
}
```
Sémantika zachována: funkce v cyklu je stále detekována (kontrolujeme PŘED přidáním do seen, descend až po). Cyklus
sám o sobě → `checkNoFunctions` projde, pak `structuredClone` cyklus zvládne (params se serializací uloží jako graf;
schedule kontrakt „primitive params" v praxi cykly nemá, ale robustnost je cílem fixu).

### 7.3 Test (`registry.test.js`)
- `const a={}; a.self=a; assertSerializable(a)` → **NEvyhodí** (dřív stack overflow). 
- `const a={}; a.self=a; a.fn=()=>{}; assertSerializable(a)` → vyhodí 'must not contain functions' (ne overflow).
- `assertSerializable({x:1, nested:{y:2}})` → projde (regrese happy path).

---

## 8. Pořadí implementace pro codera (doporučení)
1. **BUG-001 fix + test** (izolované, odblokuje schedule robustnost).
2. **T1 extrakce** doložitelných katalogů (food, houseTypes, companies, achievements, military, population) → reálná data.
3. **T2 schémata+loader+validátor** nad doloženými daty (fail-fast ověřitelný hned).
4. **T3 balance.js + formulas.js** (konstanty z dumpu, vzorce ze zdroje).
5. **T4 tabulkové testy** s referenčními čísly §4.3 (zachytí chyby vzorců i extrakce).
6. **T1 rekonstrukce** jobs/buildings/goods/resources (derived) + T6 gap pro neúplné.
7. **T5 effects kostra** + cross-ref napojení (onBuild).
8. **T1 approximated kostry** (techs/zones/skills/sectors) + **T6 gap-report** finalizace.

## 9. Rizika a předpoklady
- **R-A (architektura §12):** hlavní gap = chybějící list-JSONy. Mitigace: derived rekonstrukce + provenance flagy +
  gap-report; MVP katalogy (jobs/buildings/goods) se dotěží ze zdrojového kódu, ne z dumpu → vyšší riziko nepřesnosti
  produkčních čísel → vědomě označeno, kalibrace M9.
- **Předpoklad:** produkční čísla jobů jsou rekonstruovatelná z home.js/forest/field/mine.js v dostatečné věrnosti pro
  M3. Pokud ne (gap se ukáže větší při portu) → eskalace orchestrátorovi (re-extrakce z runtime), mimo M1 scope.
- **Alternativa k „derived rekonstrukci ze zdroje" (zvážena, zamítnuta):** odložit jobs/buildings na re-extrakci
  z běžící hry. Zamítnuto: blokuje M2-M4 (MVP) na externím kroku, který prostředí bez storage neumí spolehlivě
  reprodukovat; DR-001 preferuje autonomní pokračování s approximací před blokací.

---
*Konec spec. Zdroj pravdy pro architekturu = architecture_proposal_iter-002_T-001.md; referenční čísla ověřena proti
reálným datům dumpu a zdrojových modulů (config.js, home.js, market.js, listfood.js).*
