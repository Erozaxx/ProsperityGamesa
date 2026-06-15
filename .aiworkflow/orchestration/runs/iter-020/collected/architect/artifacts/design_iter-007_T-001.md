# Detailní implementační spec – iter-007 (M2a), T-001

- **Task**: T-001, iter-007 (BRIEF-023)
- **Autor**: architect (Opus) – DETAILNÍ NÁVRH pro Sonnet codera. **Žádná implementace.**
- **Datum**: 2026-06-13
- **Vstupy (POVINNÉ)**: architecture_proposal_iter-002_T-001.md (§4.3 tickOrder, §5 katalogy, §6 save, §7 transakce, §8 kontrakty, §9.4 R4 stuby); review_iter-006_T-004.md (S-1/S-2/S-3, N-1/N-2); reálný `src/core/*` + `src/data/*` + `docs/tickOrder.md`.
- **Scope OUT**: žádný produkční kód v tomto dokumentu, žádná změna architektury (D1–D13 beze změny). Catch-up MVP (end-to-end smyčka + summary UI + autosave triggery) je **M2b** – zde NE.

---

## 0. Executive summary + doporučení ke splitu

iter-007 = **M2a** = první živé herní systémy + transakční/persist infrastruktura. Pokrytí: T1 transakční vrstva (§7), T2 deklarativní persist schémata + migrace v1 (§6.3–6.4), T3 population+housing, T4 food+health+crime, T5 stuby world/battle + kontraktní testy §8, plus **catalog hardening** z M1 review (S-1/S-2/S-3/N-1/N-2).

**Doporučení ke splitu: ANO, rozdělit na M2a-1 (infrastruktura) a M2a-2 (systémy).** Detaily v §9. Stručně: T1+T2+catalog hardening tvoří *infrastrukturní vrstvu* bez herního chování (testovatelná čistě jednotkově: transakce, round-trip, validace). T3+T4+T5 jsou *herní systémy*, které tu infrastrukturu konzumují a navzájem na sobě stojí (food handler potřebuje resource vrstvu; persist schémata vznikají SE systémy; tickOrder pořadí je balanční kontrakt). Split sníží riziko, že jediné velké PR smíchá infrastrukturní bug s balančním bugem. **M2a-1 je tvrdá prerekvizita M2a-2.**

### Catch-up-safe invariant (S-05) – platí pro KAŽDÝ nový systém v M2a
Každá systémová funkce přidaná v T3/T4/T5 MUSÍ být:
1. **Deterministická** – čas jen ze `state.season`/`state.engine.curStep` (předaný `edges`), náhoda jen přes `makeRng(state, '<stream>')`. **Zakázáno**: `Date.now()`, `Math.random()`, `performance.now()`, jakýkoli DOM/`window`/`document`. (Vynucuje `tools/check-core-imports.mjs` grep gate – při psaní ho neobcházej.)
2. **Levná v dávce** – žádné alokace v hot-path mimo nutné, žádné O(n²); systémy běží 900×/den × catch-up dávka. Preferuj počítání agregátů z čísel ve stavu, ne iterace přes velké kolekce každý krok.
3. **Idempotentní vůči loadu** – žádná „load-only" větev; load = `createInitialState` + aplikace persist allowlistu + přepočet derivátů (§6.4).

---

## 1. Reálný výchozí stav (co UŽ existuje – stavěj na tom, neměň API)

Ověřeno čtením `src/core/*` a `src/data/*`. **Coder MUSÍ použít tyto existující signatury, ne vymýšlet nové.**

### 1.1 State (`src/core/state/createInitialState.js`, `types.d.ts`)
`createInitialState(opts?)` vrací strom; relevantní prázdné sloty pro M2a:
```
player: {}            // M2a vyplní (gold, techPt, inventory)
home: {}              // M2a vyplní (population, housing, food, health, crime, jobs)
world: {}             // T5 vyplní stub-tvar (zones, factions)
battle: null          // T5: zůstává null (žádná aktivní bitva); kontraktní testy konstruují ad-hoc
catalogState: { modifiers: [] }
```
Existující naplněné: `meta, engine, season, rng, log, achievements.unlocked`. **Tvar těchto NEMĚŇ.**

### 1.2 Engine / čas (`src/core/engine/`)
- `runTick(state, ctx)` – fáze calendar → schedule → periodics → devInvariants. Systémy se registrují jako periodika (viz §4 tohoto spec).
- `advanceCalendar(state) → TimeEdges`: `{ isNewDay, isQuarterDay, isNoon, isNewMonth, isNew5Days, isNew10Days, isNewSeason, isNewYear }`.
- Konstanty (`timeEdges.js`): `STEPS_PER_DAY=900`, `STEPS_PER_QUARTER=225`, `DAYS_PER_SEASON=91`, `DAYS_PER_MONTH=30 (provisional)`.
- `makeRng(state, name) → Rng` se streamy: `population | forest | mine | field | market | world | battle | events`. `Rng = { next(), int(maxExcl), range(min,max), chance(p) }`. RNG stav je v `state.rng.streams[name]` (serializovatelný).
- `scheduleInsert(state, step, id, params?)`, `scheduleDue`, `scheduleCancel`, `scheduleCountOf`.
- `hashState(state) → number` (FNV-1a) – používá se v determinismus testech.

### 1.3 Registry (`src/core/registry/registry.js`)
`createRegistry()`, `register(reg, id, handler)` (idempotentní pro identickou referenci, jinak throw na kolizi), `resolve(reg, id)` (throw na neznámé), `has(reg, id)`, `assertSerializable(params)`. `HandlerFn = (state, params, ctx) => void`.

### 1.4 Catalog (`src/core/catalog/`)
- `loadCatalog(name, data)`, `getCatalog(name)`, `hasCatalog(name)`, `listCatalogs()`, `clearCatalogs()` – jen `name→data` store.
- `schemas.js`: `SCHEMAS[name] = { required: [...] }` – jen *přítomnost* required polí.
- `validate.js`: `validateCatalog(name, catalog) → ValidationError[]`, `assertCatalogValid(name, catalog)` (throw na první chybě).
- **CHYBÍ** (T-catalog hardening to dodá): byId registr, kolize ID napříč typy, B4 cross-ref, typová/min-max/enum validace.

### 1.5 Balance / formulas (`src/core/balance/`)
- `BALANCE` (frozen) – relevantní pro M2a: `population.{consumeFoodRate:2, matRate:0.04, retRate:0.02, workerEffMin:0.25, workerEffMax:2}`, `tax.{centerBase:22, cityGuardBase:56}`, `world.{aiMechanicStart:567000, revoltMechanicStart:630000}`. **Krimi/disease/housing konstanty CHYBÍ → T4/T3 je doplní (§6).**
- `formulas.js`: `marketPrice`, `techCap`, `scholarLevelCap`, `scaleCost`, `workerEfficiency`, `spoilage(pct,amount)=trunc(pct*amount)`, `natality(pop,rate)=floor(pop*rate)`, `goldValue`. **M2a přidá: `consumeFood`, `foodVariety`, `diseaseChance`, `crimeCount` (§6).**

### 1.6 Save (`src/save/`)
- `saveGame(state, opts?) → {generation, savedAt}` – rotuje N=3 generace, `assertSerializable`, `structuredClone(state)`.
- `loadGame(slotId?) → { state, record } | null` – **POZOR**: dnes vrací `rec.payload` PŘÍMO (žádná migrace, žádná čistá konstrukce). **T2 to přepracuje na 7-krokový load (§6.4) – to je hlavní změna v save vrstvě.**
- `validateEnvelope(rec)` – kontroluje `saveVersion`, přítomnost `meta/engine/season/rng`, `curStep` finite.

### 1.7 Commands (`src/core/commands/dispatch.js`)
`createCommandRegistry()`, `registerCommand(creg, type, handler)`, `dispatch(creg, state, cmd) → {ok, error?}` (nikdy nethrowuje, validuje serializovatelnost params). M2a sám nové commandy nevyžaduje (systémy běží na ticku), ale resource vrstva (§5) musí být commandy-ready.

### 1.8 Data katalogy (reálné hodnoty, src/data/)
- `population.json`: `consumeFoodRate:2`, `maxFood:500`, `natality{matRate:0.04, retRate:0.02}`, `spoilage{bread:0.08, cheese:0.08, fish:0.23, fruit:0.22, meat:0.18, vegetable:0.14}`, `baseSpoilage{...cheese:0.1...}` (D-CHEESE-SPOILAGE rozpor → použij `spoilage` aktivní, `baseSpoilage` referenční; balanc M9), `causesOfDeath[14]`.
- `houseTypes.json`: 8 tierů `{id, workers, attractiveness, capacity}` – tent(3,0,null), hovel(3,-1,200), house(5,0,600), mansion(6,4,1000), manor(10,8,1400), chateau(20,25,3000), estate(20,100,10000), publichouse(25,-10,3000).
- `food.json`: 6 druhů `{id,name,description,type:'food'}` – bread,cheese,fish,fruit,meat,vegetable.
- `jobs.json`: 7 jobů, `products` = **pole stringů** (S-3 → změnit na mapu, §3.5).
- `resources.json`: gold(gold), ore(resource), stone(resource), techPt(techPt), wood(resource) – **N-1**: kind `"resource"` ≠ enum návrhu.
- `military.json`: archer(1620/162), warrior(1080/108). `companies.json`, `buildings.json`, `zones.json` (prázdné zones/aiStates), `goods.json` (prázdné), `marketBaseline.json` (prázdné).

---

## 2. Cílový tvar `state.home` po M2a (autoritativní)

Všechny nové systémy zapisují do `state.home` (a `state.player` pro gold/techPt/inventory). **Tvar je kontrakt mezi systémy, persist schématy i testy.** Coder vytvoří factory, která tento tvar inicializuje (viz §2.1).

```
state.player = {
  gold: <number>,                    // resourceHandler 'gold'
  techPt: <number>,                  // resourceHandler 'techPt'
  inventory: { [goodsId]: number },  // resourceHandler 'goods' (M2a prázdné/minimal)
}

state.home = {
  population: {
    total: <number>,                 // živí obyvatelé
    migrationAcc: <number>,          // akumulátor frakční migrace (per step), drží zbytek
    bornTotal: <number>,             // kumulativní statistika
    diedTotal: <number>,
  },
  housing: {
    counts: { [houseTypeId]: number },   // kolik domů daného tieru postaveno (M2a: seed z initial)
    // deriváty (capacity, workerSlots, attractiveness) se NEUKLÁDAJÍ – počítají se z counts + katalogu
  },
  food: {
    store: { [foodId]: number },     // bread, cheese, fish, fruit, meat, vegetable
  },
  health: {
    diseaseActive: <boolean>,        // probíhá epidemie?
    diseaseDaysLeft: <number>,
  },
  crime: {
    level: <number>,                 // 0..1 normalizovaná míra kriminality
  },
  settlementLevel: <number>,         // úroveň osady (day edge přepočet)
}
```

### 2.1 Factory: `src/core/state/createHomeState.js` (NOVÝ)
```
/** @returns {HomeState} */
export function createHomeState(catalog) { ... }   // čistá konstrukce z katalogu + balance startovních hodnot
export function createPlayerState() { ... }        // gold/techPt/inventory startovní
```
- Volá se z `createInitialState`? **NE přímo** – `createInitialState` zůstává catalog-free (M1 kontrakt). Místo toho `app/bootstrap` a `load` (§6.4 krok 3) volají `createHomeState(catalog)` po `createInitialState` a přiřadí do `state.home`/`state.player`. Tím zůstává `createInitialState` čistá a testovatelná bez katalogu.
- Startovní hodnoty (population.total, gold, food.store, housing.counts) → **nové konstanty v `BALANCE.start`** (viz §6, odvozené z `world.home` defaultů originálu; coder dotěží reálná čísla z `doc/original_source/.../home.js` init – pokud chybí, použij rozumný seed a zapiš gap).

### 2.2 Typy: `src/core/state/types.d.ts` (rozšířit)
Přidat interface `HomeState`, `PopulationState`, `HousingState`, `FoodState`, `HealthState`, `CrimeState`, `PlayerState` a zařadit je do `GameState` místo `player: {}` / `home: {}`. (Living artefact – typy se mění SE systémem.)

---

## 3. Catalog hardening (M1 review S-1/S-2/S-3/N-1/N-2) – PRVNÍ V POŘADÍ

Důvod první pozice (review §5 doporučení): M2a je první milník, kde katalogy krmí systémy → NaN-ekonomika z překlepu v datech je reálné riziko. Hardening musí být hotový, než T1/T3/T4 začnou číst katalogy.

### 3.1 byId registr napříč typy + kolize ID (K10) – `src/core/catalog/loader.js` rozšířit
```
/** Builds a flat id→{type,entry} index across all loaded catalogs. Throws on cross-type id collision. */
export function buildById() → Map<string,{type:string, entry:object}>
export function byId(id) → {type, entry}        // throw na neexistující id (fail-fast, ne 'no such item')
export function hasId(id) → boolean
```
- Iteruje přes `listCatalogs()`, pro každý katalog s polem entit (`food`, `houseTypes` (`houseTypes`), `jobs`, `resources`, `buildings`, `military`, `achievements`) extrahuje `entry.id`.
- **Kolize**: pokud se `id` objeví ve dvou typech → `throw Error('catalog: id collision "<id>" in <typeA> and <typeB>')`. Test to ověří uměle vloženou kolizí.
- Katalogy bez `id` pole (`population`, `zones`, `companies`, `balance`, `techs`, `marketBaseline`, `goods` prázdné) se přeskočí nebo indexují dle svého klíče (companies: indexovat `explorer/houseBuilder/mineBuilder` položky podle jejich `id`).
- `buildById` se volá jednou po loadu všech katalogů (v bootstrap a v testech), výsledek se cachuje v modulu (`clearCatalogs` ho invaliduje).

### 3.2 Typová / min-max / enum / ref validace schémat (S-1) – `src/core/catalog/schemas.js` + `validate.js`
Rozšířit `SCHEMAS[name]` z `{required:[...]}` na deklarativní pravidla:
```
SCHEMAS.houseTypes = {
  itemShape: {
    id:            { type: 'string', required: true },
    workers:       { type: 'number', required: true, min: 0 },
    attractiveness:{ type: 'number', required: true },
    capacity:      { type: 'number', required: false, nullable: true, min: 0 },
  }
}
SCHEMAS.resources = {
  itemShape: {
    id:   { type:'string', required:true },
    name: { type:'string', required:true },
    kind: { type:'string', required:true, enum:['gold','techPt','goods','food','resource'] }, // N-1: 'resource' zařazen
  }
}
SCHEMAS.jobs = { itemShape: { id:{type:'string',required:true}, name:{type:'string',required:true},
                              products:{ type:'productMap', required:true } } }  // viz §3.5
```
- `validate.js` rozšířit: pro katalogy s `itemShape` iteruje přes pole entit a validuje každé pole proti pravidlu (`type`, `required`, `min`, `max`, `enum`, `nullable`, `ref`). Vrací `ValidationError[] = {key, issue}` (zachovat existující tvar, jen víc kontrol). `assertCatalogValid` throwuje s **cestou** (`<catalog>[<index>].<field>: <issue>`).
- Zpětná kompatibilita: katalogy bez `itemShape` (jen `required`) validují jako dnes.

### 3.3 B4 cross-ref `cost`/`products` proti registru zdrojů (§5.2) – `validate.js` / nová `crossref.js`
```
/** Validates every cost/products map references a known resource|food|goods id. */
export function validateCrossRefs(byIdIndex) → ValidationError[]
```
- Cíle validace: `buildings[].baseCost` (klíče → resource), `companies.*[].cost` (→ resource), `jobs[].products` (→ **food NEBO resource**, N-2!), eventy/kontrakty (M5+, zatím no-op).
- **N-2 KRITICKÉ**: platný cíl `products`/`cost` je `kind ∈ {gold, techPt, resource, goods, food}`. Food položky (bread, cheese…) žijí ve `food.json`, ne v `resources.json` → cross-ref MUSÍ akceptovat food katalog jako cíl, jinak false-positive. Definuj množinu „resource-like ids" = sjednocení `resources[].id ∪ food[].id ∪ goods[].id`.
- Neznámé id v cost/products → `ValidationError` (fail-fast při loadu, ne runtime NaN). Test: úmyslný překlep `"wodd"` → chyba.

### 3.4 gap-report.json metadata (S-2) – `src/data/gap-report.json` + extraktor
Doplnit do strojového reportu (lidský `doc/gap-report-iter-006.md` to už má):
```
{ "_meta": {...}, "summary": { "total": N, "blocksMvp": M, "byMilestone": {...} },
  "gaps": [ { ...stávající..., "blocksMvp": true|false, "provenance": "missing|approximated|derived" } ] }
```
- `blocksMvp`: true pro G-LISTGOODS, G-MARKETBASELINE, G-LISTJOB, G-LISTBUILDINGS (M2–M5 konzumenti); false pro G-LISTTECHS/ZONE/SKILL (M6/M7). `summary` blok přidat pro programovou konzumaci (re-planning/dashboard).
- **Pozn.**: toto je úprava DAT + extraktoru (`tools/extract/`), ne core kódu. Pokud extraktor generuje gap-report, uprav generátor, ať je výstup idempotentní (review ověřuje 0 diff při re-run).

### 3.5 jobs.products → mapa `{resourceId: amount}` (S-3) – `src/data/jobs.json` + extraktor + schema
- Změnit `products` z `["bread"]` na `{ "bread": <amount> }`. Amount = produkce na job-tick (quarterDay) – derived odhad z `home.js` job loopů; provenance zůstává `derived`, reálná čísla dotěží M3, ale **tvar mapy musí být teď** (jinak B4 §3.3 nemá co validovat a T3/T4 nemá produkční čísla).
- Schema `productMap` validátor (§3.2): objekt, klíče = resource-like id (§3.3), hodnoty = number ≥ 0.
- M2a používá produkci jen pro food joby (baker→bread, farmer→{vegetable,fruit}, fisher→fish, hunter→meat, cheesefarmer→cheese); ostatní (miner, woodcutter) plní M3, ale mapu mají taky.

---

## 4. tickOrder registrace systémů (§4.3) – kde se co volá

`registerCorePeriodics` (v `tickOrder.js`) dnes registruje 9 no-op slotů. M2a **nahradí no-op skutečnými systemFn** (registrovanými v registry pod string-ID) a **přidá chybějící sloty**. Pořadí uvnitř hrany je balanční kontrakt (§4.3 závazek věrnosti) – dodržet:

| Hrana (edge) | order | systemFn (string-ID) | Task | Pozn. |
|---|---|---|---|---|
| `step` | 10 | `population.migration` | T3 | migrační akumulátor (frakční, per step) |
| `step` | 20 | `skills.progress` | — | zůstává no-op (M3) |
| `quarterDay` | 10 | `jobs.production` | T3/T4 | produkce jídla z jobů (grant přes resource vrstvu) |
| `noon` | 10 | `health.births` | T3 | births |
| `noon` | 20 | `population.retirement` | T3 | retirement (NOVÝ slot) |
| `noon` | 30 | `health.disease` | T4 | disease check (NOVÝ slot) |
| `noon` | 40 | `crime.daily` | T4 | crime (NOVÝ slot) |
| `noon` | 50 | `food.meal2` | T4 | druhé jídlo dne (NOVÝ slot) |
| `day` | 10 | `food.meal1` | T4 | první jídlo dne (přejmenovat z `meal.daily`) |
| `day` | 20 | `housing.settlementLevel` | T3 | settlementLevel přepočet (NOVÝ slot) |
| `10days` | 10 | `forest.regen` | — | no-op (M3) |
| `5days` | 10 | `localTaxes` | — | no-op (M4) |
| `month` | 10 | `food.spoilage` | T4 | spoilage (NOVÝ slot – na month hraně dle §4.3) |
| `month` | 20 | `taxes.monthly` | — | no-op (M4) |
| `season` | 10 | `season.change` | — | no-op (efekty M3+) |

**Pozn. k mealu**: architektura §4.3 má meal#1 na `day` a meal#2 na `noon`. births/retirement/crime na `noon`. Dodržet pořadí v rámci `noon`: births → retirement → disease → crime → meal2 (efektivita populace před spotřebou). `housing.settlementLevel` na `day` po meal1.

**Pozn. k month hraně**: `isNewMonth` je dnes provisional 30d (calendar.js). Spoilage v originálu je *měsíční* (§4.3 `foodSpoilage (month)`). Ponech `month` hranu; pokud M9 změní month model, je to balanc, ne struktura. **Zapiš `docs/tickOrder.md` update SE změnou** (living artefact, N-04) – nový slotový seznam výše.

**Stuby T5** (`world.tick`, `battle.tick`) – viz §7. Registrují se do tickOrder/persist od teď jako no-op, ale s kontraktními testy.

---

## 5. T1 – Transakční vrstva (§7) — `src/core/resources/`

Cesty: `src/core/resources/handlers.js`, `src/core/resources/transactions.js`, `src/core/resources/index.js`. Dnes je adresář prázdný (`.gitkeep`).

### 5.1 resourceHandlers[kind] (§7.1)
```
/** @typedef {{ get(state,key):number, add(state,key,n):void, remove(state,key,n):void, capacity?(state,key):number }} ResourceHandler */
/** @type {Record<string, ResourceHandler>} */
export const resourceHandlers = {
  gold:    { get, add, remove },               // state.player.gold
  techPt:  { get, add, remove },               // state.player.techPt
  goods:   { get, add, remove },               // state.player.inventory[key]
  food:    { get, add, remove },               // state.home.food.store[key] – PER-DRUH; agregát viz foodAggregate
  foodAggregate: { get, add, remove },         // fair-share napříč druhy (§7.1, viz §6 consumeFood) – allowDeficit politika uvnitř
  resource:{ get, add, remove },               // wood/ore/stone – M2a slot (M3 plní), get z state.home.store nebo player; viz pozn.
}
```
- **kind se odvozuje z katalogu**: `resourceKindOf(key)` přes byId (§3.1) → `byId(key).entry.kind`. Pro food položky (kind 'food') → handler `food`. Klíč `'food'` jako agregát → `foodAggregate`.
- Každý handler: `get(state,key)` čte z příslušného slotu; `add`/`remove` mutují. `capacity?` volitelné (housing/maxFood) – `food` handler může mít cap `population.maxFood` (500).
- Pozn. resource(wood/ore/stone): M2a je nepotřebuje pro population/food smyčku → handler existuje (slot), čtení/zápis do `state.home.store` nebo `state.player` – **rozhodni umístění a zapiš do §2 tvaru**; pokud M2a nepotřebuje, registruj handler ale ponech store prázdný (M3 naplní). Drž tvar konzistentní s byId kind.

### 5.2 Generické canAfford / pay / grant (§7.1)
```
/** @param {GameState} state @param {Record<string,number>} cost @returns {boolean} */
export function canAfford(state, cost) { return Object.entries(cost).every(([k,n]) => handlerFor(k).get(state,k) >= n); }

/** Atomická platba. Throw při nedostatku (caller volá canAfford předem) nebo ne-pod-nulu bez allowDeficit.
 * @param {GameState} state @param {Record<string,number>} cost @param {string} cause @returns {void} */
export function pay(state, cost, cause) { ... }   // ∀k: remove(k); emit txEvent{key, amount:-n, cause, step}

/** @param {GameState} state @param {Record<string,number>} prod @param {string} cause @returns {void} */
export function grant(state, prod, cause) { ... } // ∀k: add(k, capped); emit txEvent{key, amount:+n, cause, step}
```
- `handlerFor(key)` = `resourceHandlers[resourceKindOf(key)]`.
- **Invarianta ne-pod-nulu (§7.1)**: `remove` nikdy pod nulu bez explicitního `allowDeficit`. Pokud by `get(k) - n < 0` a ne allowDeficit → `throw Error('resources: insufficient <key> (have X, need N)')`. **Jediná výjimka**: `food`/`foodAggregate` handler má vlastní fair-share politiku (§6 `consumeFood`) – tam se „nedostatek" řeší rozdělením a hladověním, ne výjimkou; food handler volá interní spotřebu s `allowDeficit` sémantikou a vrací kolik se reálně snědlo.
- **Atomicita**: `pay` musí být all-or-nothing. Doporučení: zavolej `canAfford` na začátku `pay`; pokud false → throw před jakoukoli mutací (žádný částečný odečet). Test ověří, že neúspěšná `pay` nezmění stav.
- **NaN guard**: `add`/`remove` s `!Number.isFinite(n)` → throw (chrání proti NaN ekonomice, B4 runtime).

### 5.3 txEvent emise (§7.2)
```
/** @typedef {{ key:string, amount:number, cause:string, step:number }} TxEvent */
```
- M2a: txEvent se emituje do **lehkého in-memory bufferu / callbacku**, NE do `state` (účetnictví observer = M4). Minimal: `emitTx(tx)` zapíše do `ctx`-úrovně sběrače nebo no-op observeru, který M4 nahradí. **Nepiš měsíční report teď** (§7.2 je observer, M4). Cíl M2a: API existuje a je volané, takže M4 jen připojí observer.
- Doporučení: `txEvent` posílat přes `ctx.emitTx?.(tx)` (volitelný hook v TickContext) – pokud není, no-op. Tím se neukládá nic do save a observer je opt-in.

### 5.4 Jak to ověří test (`test/resources.test.js`)
- `canAfford` true/false na gold/food/goods.
- `pay` odečte přesně; **neúspěšná pay nezmění stav** (atomicita); throw na nedostatek bez allowDeficit.
- `grant` přičte; cap (food maxFood) clampuje.
- `remove` pod nulu → throw; s allowDeficit (food fair-share) → ne-throw, vrátí reálně odebrané.
- NaN cost → throw.
- txEvent: registruj testovací observer přes `ctx.emitTx`, ověř `{key, amount, cause, step}` pro pay (záporné) i grant (kladné).
- determinismus: po sérii transakcí `hashState` stabilní mezi běhy.

---

## 6. Persist schémata + nové balance/formulas (T2 sdílí s T3/T4)

### 6.1 T2 – Deklarativní persist schémata (§6.3, K11) — `src/save/persistSchema.js` (NOVÝ)
**Allowlist per doména** – co není deklarováno, se neukládá:
```
/** @type {Record<string, string[]|object>} */
export const PERSIST_SCHEMA = {
  player:     ['gold', 'techPt', 'inventory'],
  population: ['total', 'migrationAcc', 'bornTotal', 'diedTotal'],
  housing:    ['counts'],                  // capacity/slots/attractiveness = derivát, NEUKLÁDAT
  food:       ['store'],
  health:     ['diseaseActive', 'diseaseDaysLeft'],
  crime:      ['level'],
  home:       ['settlementLevel'],         // + odkaz na sub-domény population/housing/food/health/crime
  world:      ['zones', 'factions'],       // T5 stub (no-op tvar, round-trip přežije)
  battle:     null,                        // null = ukládá se celý (nebo zůstává null v M2a)
};
```
- **Generický save průchod**: `applyPersist(state) → plainPayload` projde schématy a vytáhne JEN allowlistovaná pole. Save vrstva (`saveStore.saveGame`) dnes ukládá `structuredClone(state)` celý → **T2 to zúží**: payload = `applyPersist(state)` (+ vždy `meta, engine.{curStep,speed,running,schedule,scheduleCount,_seq}, season, rng, log, achievements, catalogState.modifiers`). Engine/rng/season/schedule jsou „infrastrukturní" allowlist (už se ukládají, drž je).
- Deriváty (housing capacity, food cap, effective hodnoty) se NIKDY neukládají.

### 6.2 T2 – Load = čistá konstrukce, 7 kroků (§6.4) — `src/save/load.js` (NOVÝ) + úprava `saveStore.loadGame`
Dnešní `loadGame` vrací `rec.payload` přímo. **Přepracovat** na 7-krokový pipeline (architektura §6.4):
```
loadAndReconstruct(rec, catalog) → GameState:
  1. validuj obálku (validateEnvelope) → fail = caller zkusí předchozí generaci (zachovat stávající fallback v loadGame)
  2. migrations[payload.saveVersion → … → SAVE_VERSION] (§6.3, očíslované kroky)
  3. state = createInitialState({ seed: payload.meta.seed, gameVersion: payload.meta.gameVersion })
     + state.home = createHomeState(catalog); state.player = createPlayerState();  // čistá konstrukce
  4. aplikuj payload přes PERSIST_SCHEMA (allowlist) → jediný vstup, ŽÁDNÝ deep-merge
     (kopíruj jen allowlistovaná pole; infrastrukturu engine/rng/season/schedule/log převezmi z payloadu)
  5. přepočti deriváty: catalogState.modifiers fold (M5+ no-op teď) + housing/food capacity event-driven (calcAll ekvivalent)
  6. validuj invarianty (žádné NaN/záporné: food.store ≥ 0, population.total ≥ 0) → porušení = chyba loadu (fallback generace), NE tichá oprava
  7. spočti missedMs z lastSimTimestamp → catch-up (M2b – v M2a jen vrať state + lastSimTimestamp, catch-up smyčku NEspouštěj)
```
- **Žádný `fixNaNs`** (§6.4) – invarianty jsou asserty.
- `loadGame` zůstane jako tenký wrapper: najde aktivní/fallback generaci, zavolá `loadAndReconstruct`. **Catalog se musí předat** (loadGame potřebuje katalog → změna signatury `loadGame(slotId, catalog)` nebo katalog injektovaný z app/bootstrap; zvol injekci přes parametr, zapiš do app glue).

### 6.3 T2 – Migrace v1 (§6.3) — `src/save/migrations.js` (NOVÝ)
```
/** @type {Array<{ from:number, to:number, migrate:(payload:object)=>object }>} */
export const MIGRATIONS = [
  // v1 je aktuální; první reálná migrace přijde, až se změní SAVE_VERSION.
  // Formát: očíslované kroky from→to, každý čistá transformace payloadu.
];
export function migrate(payload) → payload;   // aplikuje řetěz from payload.saveVersion → SAVE_VERSION
```
- M2a zavádí `SAVE_VERSION` (v `schema.js`) jako stávající `1`. **M2a saves jsou v1.** Migrace je zatím prázdný řetěz, ALE infrastruktura (`migrate()` + očíslovaný formát) musí existovat a být volaná v load kroku 2, aby M3+ jen přidal krok. Test: payload bez nějakého M2a pole (simulace „starého" savu) projde migrací + čistou konstrukcí bez pádu (chybějící pole doplní `createHomeState`).

### 6.4 Nové balance konstanty — `src/core/balance/balance.js` (rozšířit `BALANCE`)
Coder dotěží reálná čísla z `doc/original_source/.../home.js`, `config.js`. Pokud chybí, použij uvedený default a **zapiš gap** (provenance approximated). Pojmenovat s jednotkou a source ref komentářem (K4):
```
BALANCE.start = {            // startovní stav osady (z world.home defaults originálu – DOTĚŽIT)
  population: <n>, gold: <n>, food: { bread:<n>, ... }, housing: { tent:<n> },
}
BALANCE.food = {
  consumeFoodRate: 2,        // už v population (sjednotka: jídlo/osoba/jídlo) – sjednotit zdroj
  mealsPerDay: 2,            // meal#1 (day) + meal#2 (noon)
  varietyTiers: [...],       // foodVariety bonus dle počtu druhů (DOTĚŽIT z home.js)
}
BALANCE.health = {
  diseaseBaseChancePer20kPop: <p>,   // §5.5 disease.baseChancePer20kPop – DOTĚŽIT
  diseaseDurationDays: <n>,
  diseaseDeathFraction: <f>,
}
BALANCE.crime = {
  basePerDay: <p>,           // §5.5 crime.basePerDay – DOTĚŽIT
  povertyFactor: <f>,        // krimi roste s nedostatkem/nezaměstnaností
}
BALANCE.housing = {
  // settlementLevel prahy (z attractiveness/population) – DOTĚŽIT
}
```
**Pozn.**: D-CHEESE-SPOILAGE (0.08 vs 0.10) – použij `population.spoilage.cheese=0.08` (aktivní), zapiš odchylku, balanc M9.

### 6.5 Nové formulas — `src/core/balance/formulas.js` (rozšířit, čisté funkce)
```
/** Spotřeba jídla per jídlo: počet lidí × consumeFoodRate. @returns {number} */
export function foodDemand(population, consumeFoodRate) { return population * consumeFoodRate; }

/** Fair-share rozdělení spotřeby napříč druhy jídla. Vrací {consumed:{[id]:n}, fed:number, starved:number}.
 *  Spotřebuje z dostupných druhů proporčně/dle politiky originálu (T-001 §4). PURE – nemutuje store. */
export function consumeFood(store, demand, foods) → { consumed, fed, starved };

/** foodVariety bonus dle počtu nenulových druhů (efektivita/spokojenost). @returns {number} */
export function foodVariety(store) → number;     // z BALANCE.food.varietyTiers

/** Šance epidemie per den. @returns {number} 0..1 */
export function diseaseChance(population, balanceHealth) → number;

/** Počet obětí kriminality / incidentů za den. @returns {number} */
export function crimeCount(population, crimeLevel, balanceCrime) → number;

/** settlementLevel z populace + housing attractiveness. @returns {number} */
export function settlementLevel(population, housingAttractiveness, balanceHousing) → number;
```
- Všechny PURE: `f(inputs, balance) → number/objekt`, žádná mutace stavu, žádný RNG uvnitř (RNG se aplikuje v systému, ne ve formuli – determinismus testovatelný tabulkově).
- **Reálná čísla**: coder odvodí z `home.js` (spotřeba, nemoc, krimi loop) a `config.js`; tabulkové testy s referenčními hodnotami (§8).

---

## 7. T3 + T4 + T5 systémy — `src/core/systems/`

Každý systém = `systemFn(state, params, ctx)` registrovaný v registry pod string-ID z §4. Mutuje `state.home`/`state.player` přes resource vrstvu (§5) nebo přímo (population counts). RNG jen přes `makeRng(state,'<stream>')`.

### 7.1 T3 – Population + Housing — `population.js`, `housing.js`
**`population.migration` (step, order 10)** – `src/core/systems/population.js`:
- Frakční migrační akumulátor: `migrationAcc += migrationRatePerStep(state)`; když `migrationAcc >= 1` → přibyde `floor(migrationAcc)` lidí (do kapacity housing), `migrationAcc -= floor`. Drží zbytek pro determinismus v dávce (catch-up-safe: 900×/den se sčítá frakce, ne skok).
- Migrace omezena housing kapacitou: `capacity = Σ houseTypes[id].capacity × counts[id]` (derivát z katalogu, NEukládat). Attractiveness ovlivňuje rate.
- RNG: `makeRng(state,'population')` pro případnou stochastiku (jinak deterministicky z populace).

**`health.births` (noon, order 10)**: `born = natality(population.total, BALANCE.population.matRate)` (formula existuje); `population.total += born` (do kapacity), `bornTotal += born`.

**`population.retirement` (noon, order 20)** – NOVÝ: `died = natality(population.total, retRate)`; `population.total -= died`; `diedTotal += died`. (natality formula slouží pro oba dle §1.5/jobs.products poznámky.)

**`housing.settlementLevel` (day, order 20)** – `housing.js`: `state.home.settlementLevel = settlementLevel(population.total, derivedAttractiveness, BALANCE.housing)`. Housing tiery: capacity/workerSlots/attractiveness se počítají z `counts × houseTypes katalog` event-driven (po stavbě – M5; v M2a jen ze seed counts). **House tiery (§ brief T3)**: M2a počítá agregáty z `counts`, stavba domů (command) je M5 – zde jen čtení katalogu a derivace.

Persist: `population` (§6.1 allowlist), `housing.counts`, `home.settlementLevel`.

### 7.2 T4 – Food + Health + Crime — `food.js`, `health.js`, `crime.js`
**`jobs.production` (quarterDay, order 10)** – `src/core/systems/jobs.js` (M2a část): pro food joby (baker, farmer, fisher, hunter, cheesefarmer) `grant(state, jobs[id].products × workers × efficiency, 'job:'+id)`. Workers/efficiency: M2a může použít fixní/seed přiřazení (plné jobs+workerEfficiency je M3) – **minimální verze**: produkce z `jobs.products` mapy × konstanta; zapiš že plné napojení je M3. Grant přes resource vrstvu (food handler).

**`food.meal1` (day, order 10)** a **`food.meal2` (noon, order 50)** – `food.js`:
- `demand = foodDemand(population.total, consumeFoodRate)`; `{consumed, fed, starved} = consumeFood(store, demand, foods)`; odečti `consumed` přes food handler (allowDeficit fair-share); `starved` → hladovění (úmrtí / efektivita). 2 jídla/den (meal#1 day, meal#2 noon).
- `foodVariety(store)` → bonus do efektivity/spokojenosti (uložit? NE – derivát, počítá se).

**`food.spoilage` (month, order 10)** – `food.js`: pro každý druh `lost = spoilage(population.spoilage[foodId], store[foodId])` (formula existuje, trunc); `store[foodId] -= lost`. Per-druh sazby z `population.json.spoilage`.

**`health.disease` (noon, order 30)** – `health.js`: pokud `!diseaseActive`: `if rng.chance(diseaseChance(population.total, BALANCE.health))` → `diseaseActive=true, diseaseDaysLeft=duration`. Pokud aktivní: úmrtí `floor(population × deathFraction)`, `diseaseDaysLeft--`; na 0 → `diseaseActive=false`. RNG: `makeRng(state,'population')` nebo dedikovaný (drž 1 stream konzistentně, zapiš který).

**`crime.daily` (noon, order 40)** – `crime.js`: `crime.level` roste/klesá dle populace, chudoby, cityGuard (tax.cityGuardBase). `crimeCount(...)` → incidenty (ztráty gold/úmrtí). RNG pro stochastiku.

Persist: `food.store`, `health.{diseaseActive,diseaseDaysLeft}`, `crime.level`.

### 7.3 T5 – Stuby world/battle + kontrakty (§8, §9.4) — `world.js`, `battle.js`
**`world.tick` (registrovat slot)** – `src/core/systems/world.js`:
- M2a = **no-op fn** registrovaná v tickOrder (slot existuje), `state.world` má stub tvar `{ zones: [], factions: [...] }` (z zones.json). **NEGATIVNÍ kontrakt (S-06)**: stub world **NESMÍ volat** `getGoldValue`/`goldValue` ani `market.inject` (neexistuje před M4). Implementace: world.js prostě tyto funkce neimportuje ani nevolá; test to vynutí staticky/behaviorálně (§8).
- Aktivační prahy `BALANCE.world.{aiMechanicStart:567000, revoltMechanicStart:630000}` jsou v datech (existují), ale world je no-op do M7.

**`battle.tick` / `battleStep`** – `src/core/systems/battle.js`:
- Definuj **kontraktní signaturu** (§8.1, no-op tělo pro prázdnou bitvu):
  ```
  /** @param {BattleState} bs @param {Command[]} commands @param {Rng} rng @returns {BattleState} */
  export function battleStep(bs, commands, rng) { ... }   // 1 tick = 30 ms sim času; prázdná bitva = deterministicky stabilní
  ```
- `state.battle` zůstává `null` v M2a (žádná aktivní bitva); battleStep je čistá funkce volatelná z testů. Auto-resolve (catch-up) = stejný battleStep bez commands (M7 plní AI politiku).
- BattleState tvar (§8.1): `{ zoneId, sides:{player,opponent}, state:'setup'|'running'|'done', tick, log:[], summary }`.

Persist: `world` (§6.1 `['zones','factions']` round-trip), `battle` (null/celý).

---

## 8. Kontraktní testy §8 (T5) — `test/contracts.test.js`

Architektura §9.4/§8.2 vyžaduje od M2:
1. **Determinismus prázdné bitvy**: `battleStep(emptyBattle, [], rng)` opakovaně → stejný výsledek; `hashState` / hash battleState stabilní mezi dvěma běhy se stejným seedem. Bez NaN.
2. **Round-trip `state.world` / `state.battle`**: `applyPersist` + `loadAndReconstruct` zachová `world.zones/factions` a `battle` beze ztráty (deep-equal na allowlistovaných polích).
3. **Schedule s AI eventy přežije save/load**: vlož do `state.engine.schedule` event s AI string-ID (no-op handler), save → load → event je stále naplánovaný se stejným step/params; po doběhnutí stejný výsledek (determinismus).
4. **NEGATIVNÍ test S-06 (KRITICKÝ)**: stub `world.tick` (a celá M2a) **nesmí volat** oceňovací API před M4. Implementace testu:
   - Behaviorální: vytvoř špiona/mock `getGoldValue`/`goldValue` a `market.inject`; spusť N kroků enginu se zaregistrovaným `world.tick`; ** assert že NEbyly zavolány**. Pokud world.js takovou funkci zavolá → test FAIL (ne tichý no-op).
   - Doporučení: protože `goldValue` je v `formulas.js`, test obalí/sleduje volání (např. dependency injection přes ctx, nebo grep-test že `world.js` neimportuje `goldValue`/`market`). Preferuj behaviorální spy přes ctx, doplň statickou kontrolu importů.

Ostatní testy systémů:
- `test/population.test.js`: migrace akumulátor (frakce se sčítá, skok na celé číslo, zbytek drží), births/retirement čísla proti `natality` referencím, kapacitní strop.
- `test/food.test.js`: consumeFood fair-share (proporční odběr, hladovění při nedostatku), 2 jídla/den, spoilage trunc proti `population.json` sazbám (bread 0.08, fish 0.23…), foodVariety tiery.
- `test/health-crime.test.js`: diseaseChance/crimeCount tabulkově, disease lifecycle (start→duration→konec), determinismus přes seed.
- `test/transactions.test.js`: §5.4.
- `test/persist.test.js`: allowlist (neukládá deriváty), round-trip všech domén, migrace prázdný řetěz, load = čistá konstrukce (chybějící pole doplní factory), invariant fail → fallback.
- `test/catalog-hardening.test.js`: byId, kolize ID throw, typová/min-max/enum validace (úmyslné porušení), B4 cross-ref (překlep → chyba, food jako platný cíl N-2), productMap tvar.
- **Determinismus gate**: `hashState(state)` po N krocích (např. 5 dní) stabilní mezi dvěma běhy se stejným seedem – přidat do `test/` a do `npm run ci`.

**`npm run ci` musí zůstat zelené** (typecheck + lint:core grep gate + node --test). Nové systémy projdou `tools/check-core-imports.mjs` (žádný DOM/Date.now/Math.random).

---

## 9. DOPORUČENÍ KE SPLITU M2a-1 / M2a-2

**Doporučuji split provést.** M2a nese 6 nezávisle review-ovatelných balíků na hraně infrastruktura vs. herní chování. Rozdělení:

### M2a-1 – Infrastruktura (prerekvizita)
**Obsah**: Catalog hardening (§3, celé), T1 transakční vrstva (§5), T2 persist schémata + load 7-kroků + migrace v1 (§6.1–6.3), + balance/formulas rozšíření *signatury* (§6.4–6.5 jako stuby/pure funkce s referenčními testy, bez napojení na systémy).
**DoD M2a-1**:
- byId + kolize ID + typová/enum/min-max validace + B4 cross-ref (vč. food cíl N-2) zelené; úmyslné porušení = fail-fast s cestou.
- gap-report.json má `blocksMvp`+`summary` (S-2); jobs.products je mapa (S-3); extrakce idempotentní (0 diff re-run).
- canAfford/pay/grant/resourceHandlers: atomicita, ne-pod-nulu, NaN guard, txEvent emise – unit testy zelené.
- persistSchema allowlist + applyPersist + loadAndReconstruct (7 kroků) + migrate() řetěz: round-trip + load=čistá konstrukce + invariant fallback testy zelené.
- nové formulas (consumeFood, foodVariety, diseaseChance, crimeCount, settlementLevel) jako PURE funkce s tabulkovými referenčními testy.
- `npm run ci` zelené; grep gate (žádný DOM/Date.now/Math.random) OK; `hashState` determinismus baseline.

### M2a-2 – Živé systémy + stuby
**Obsah**: T3 (population/housing), T4 (food/health/crime), T5 (stuby world/battle + kontraktní testy §8 vč. S-06), tickOrder registrace systémů (§4), balance startovní konstanty (§6.4 `start`).
**DoD M2a-2**:
- tickOrder systémy registrované v deklarovaném pořadí (§4); `docs/tickOrder.md` aktualizováno (living artefakt N-04).
- population (migrace/births/retirement/kapacita), food (2 jídla/spotřeba/spoilage/variety), health (disease lifecycle), crime – testy zelené, čísla proti reálným katalogům/balance.
- world/battle stuby registrované; kontraktní testy §8 zelené vč. NEGATIVNÍ S-06.
- catch-up-safe invariant ověřen: každý systém deterministický (seed→stejný hashState), bez DOM/Date/Math.random, levný v dávce.
- `state.home`/`state.player` mají cílový tvar (§2); persist round-trip přes všechny domény.
- `npm run ci` zelené.

### Proč split (trade-off)
- **Pro**: M2a-1 je čistě jednotkově testovatelná bez herní logiky → izoluje infrastrukturní bugy od balančních. M2a-2 staví na stabilní, zelené infrastruktuře → menší PR, jasnější reviewer gate. Odpovídá architektuře §11 pozn. S-04 (split povolen) a §14.3 (persist schéma vzniká SE systémem – zde schémata definuje M2a-1 jako allowlist, M2a-2 je naplní reálným tvarem; tvar je dohodnut v §2 předem, takže není drift).
- **Proti / riziko**: persist schéma „vzniká se systémem" (§14.3) – split zdánlivě odděluje schéma (M2a-1) od systému (M2a-2). **Mitigace**: §2 tohoto spec fixuje cílový tvar `state.home` PŘEDEM jako kontrakt, takže M2a-1 píše allowlist proti dohodnutému tvaru a M2a-2 ho jen naplní. Round-trip testy v M2a-1 běží proti `createHomeState` factory (tvar existuje), i když systémy ještě neběží. Pokud by to vadilo, alternativa B níže.

### Alternativa B (zamítnuta): NErozdělovat (M2a vcelku)
Jeden milník, jak je v architektuře (M2a). **Důvod zamítnutí**: M2a je dle architektury §11/S-04 nejhustší (3× L); jediné velké PR by smíchalo transakční/persist infrastrukturu s pěti herními systémy + kontrakty → reviewer gate by těžko izoloval, zda regrese je v transakcích nebo v balanci. Split nestojí nic na architektuře (sloty/tvar jsou stejné) a výrazně zlepšuje testovatelnost a review. Proto preferuji split; alternativu B držím jen pro případ, že orchestrátor chce 1 iteraci a vezme vyšší review riziko.

### Alternativa C (zamítnuta): jemnější split na 3+ části
Rozdělit i M2a-2 na population/housing vs. food/health/crime vs. stuby. **Důvod zamítnutí**: food spotřeba potřebuje population.total, health/crime potřebují population – systémy jsou provázané přes `state.home` a tickOrder pořadí; jejich rozdělení by vyžadovalo dočasné mock-populace a zvýšilo režii bez zisku. Stuby T5 jsou malé a logicky patří k systémové vrstvě. 2 části jsou optimum.

---

## 10. Rizika a mitigace (M2a-specifické)

| # | Riziko | Dopad | Mitigace |
|---|---|---|---|
| M2a-R1 | **Reálná balanční čísla chybí** (start stav, disease/crime/variety – nejsou v repo katalozích, jen odkaz na home.js/config.js) | Střední | Coder dotěží z `doc/original_source/.../home.js`; co nedoložitelné → approximated + gap entry (jako M1); kalibrace M9. Tvar/struktura nezávislá na číslech. |
| M2a-R2 | **loadGame změna signatury** (potřebuje katalog) rozbije app glue | Střední | Injektovat katalog parametrem; aktualizovat `src/app/*` volání + testy `app-persist.test.js` ve stejném commitu. |
| M2a-R3 | **Food fair-share / allowDeficit** je jediná výjimka z ne-pod-nulu → snadný zdroj NaN/záporných zásob | Vysoký | `consumeFood` PURE + tabulkové testy; food handler clampuje na ≥0; invariant assert v load kroku 6 a devInvariants. |
| M2a-R4 | **S-06 negativní test** falešně projde (world no-op nevolá nic, ale test to neověří) | Vysoký | Behaviorální spy přes ctx + statická import kontrola; test musí FAIL, když world.js přidá volání goldValue/market. |
| M2a-R5 | **tickOrder pořadí** uvnitř noon/day má balanční dopad (births před spotřebou apod.) | Střední | Dodržet §4 tabulku; `docs/tickOrder.md` jako living artefakt; reviewer gate kontroluje aktuálnost (N-04). |
| M2a-R6 | **D-CHEESE-SPOILAGE** (0.08 vs 0.10) | Nízký | Použít aktivní `spoilage` 0.08; odchylka zapsána (gap), balanc M9. |
| M2a-R7 | **Split kontrakt drift** (M2a-1 allowlist vs. M2a-2 reálný tvar) | Střední | §2 fixuje tvar předem; round-trip testy v M2a-1 proti `createHomeState`. |

---

## 11. Předpoklady a nejistoty
1. Reálná startovní čísla osady (`world.home` defaults) a disease/crime/variety vzorce jsou v originálním zdroji (`home.js`, `config.js`) dotěžitelná – ověří coder; co ne → approximated + gap, kalibrace M9.
2. `month` hrana (30d provisional) je pro spoilage akceptovatelná pro M2a; případná změna month modelu je balanc M9, ne struktura.
3. txEvent observer (účetnictví) je M4 – M2a jen emituje přes opt-in `ctx.emitTx`, nic neukládá.
4. world/battle zůstávají no-op/null v M2a; kontrakty §8 jsou vynuceny testy, implementace M7.
5. Implementaci provede Sonnet (coder) ve dvou krocích dle splitu §9 (M2a-1 pak M2a-2).

---

*Konec spec. Navazuje na architecture_proposal_iter-002_T-001.md (zdroj pravdy pro K/R/D rozhodnutí) a review_iter-006_T-004.md (S-1/S-2/S-3/N-1/N-2 hardening). Living artefakty (tickOrder §4, diagram, types.d.ts) se aktualizují SE změnou ve stejném commitu (N-04).*
