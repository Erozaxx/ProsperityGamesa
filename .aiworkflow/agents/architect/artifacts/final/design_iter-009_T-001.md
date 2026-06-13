# Detailní návrh (spec pro Sonnet) – iter-009 / T-001 – M3: Produkce, joby, workerEfficiency, skilly + BL-3

- **Task**: T-001, iter-009 (BRIEF-032), milník **M3** (architektura §11)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Typ**: DETAILNÍ IMPLEMENTAČNÍ SPEC pro Sonnet codera. **NE implementace.** Žádný produkční kód, žádná změna architektury (D1–D13 beze změny), žádná ekonomika/trh (to je M4).
- **Vstupy (povinné, přečteny)**: architecture_proposal_iter-002_T-001.md (§4.3 tickOrder, §5 katalogy/balanc, §7 transakce, §11 M3); `doc/original_source_doc.md` §2/§4/§6; **autoritativní zdrojové služby** `doc/original_source/modules/prosperity/services/{forest,field,mine,skills,home,game,config}.js`; reálný kód `src/core/systems/*`, `src/core/resources/*`, `src/core/balance/*`, `src/data/*`, `src/core/engine/tickOrder.js`, `docs/tickOrder.md`; review_iter-008_T-004rr.md (BL-3).

---

## 0. Executive summary

M3 doplňuje produkční smyčku nad živou osadou M2. Pět dílčích systémů + jeden backlog úklid:

| ID | Co | tickOrder edge | Stav v M2 dnes |
|----|----|----|----|
| **T1** | forest/field/mine systémy: stocky (trees/animals/ores/livestock/farmland) jako resource handlery `stock`, regenerace lesa (10 dní), mine/field denní periodika, area/used kapacita | `day` (mine/field), `10days` (forest.regen) | `forest.regen` = noop, mine/field neexistují |
| **T2** | joby + produkce: `jobsProduction` přepsat na worker-driven model (`curStep += workerEfficiency·workers`, completion → grant products), `autoAssignWorkers`, `accidents`, `assignJob` command; `jobs.products` mapa | `quarterDay` | `jobsProduction` = fixní WORKERS_PER_JOB=5, jen food, bez workerů |
| **T3** | `workerEfficiency` (day) jako čistá formula clamp [0.25,2] napojená do produkce; už existuje `workerEfficiency()` ve formulas.js – zbývá denní systém který ji počítá do state | `day` | formula existuje, denní výpočet ne |
| **T4** | skilly: `skillsProgress` per step (2× kompenzace `maxStep/2` dle K4), `startSkill` command, persist, UI | `step` | `skills.progress` = noop |
| **T5** | UI obrazovky forest/field/mine/jobs (karty, listy, progress) nad selektory + commands | – | neexistuje |
| **BL-3** | `getCatalog` cache mimo hot-path: `hasCatalog`/přednačtený ctx místo try/catch control-flow v per-step systémech | – | try/catch v jobs.js, population.js, food.js |

**Klíčové invarianty (průřezové, S-05):** každý nový systém je **catch-up-safe** – deterministický (čas a náhoda jen přes `state.engine.curStep` a `makeRng(state, stream)`, žádný `Date.now()`/`Math.random()`), levný v dávce (bez alokací/O(n²) v hot-path), bez DOM. Každá doména má **persist schéma psané SOUČASNĚ se systémem** (architektura §14.3, K11). Reálná čísla → `balance.js` s odkazem; nedoložitelné → `provenance: approximated` + gap záznam.

---

## 1. Co je v M2 hotové (báze, na které stavíme)

- `state.home = { population, housing, food, health, crime, settlementLevel }` (types.d.ts:116). **`state.world` je prázdný objekt `{}`** – sem patří forest/field/mine.
- `state.player = { gold, techPt, inventory }`. Skilly produkty (`item.products`) jdou do `player.inventory` (skills.js:21 `Player.insertInventory`).
- Resource vrstva: `resourceHandlers[kind]` (handlers.js) s kindy `gold|techPt|goods|food|resource`. `canAfford/pay/grant(state, map, cause, ctx, step)` (transactions.js). `resourceKindOf(key)` čte `byId(key).kind`.
- tickOrder: `runTick` → calendar → schedule → periodics (řazené `edgePriority` pak `order`) → devInvariants. Periodika registrovaná v `registerCorePeriodics(registry)` (tickOrder.js:132). Edge flags v `advanceCalendar` (calendar.js): `isNewDay/isQuarterDay/isNoon/isNewMonth/isNew5Days/isNew10Days/isNewSeason/isNewYear`.
- Commands: `createCommandRegistry()`, `registerCommand(creg, type, handler)`, `dispatch(creg, state, cmd)` (dispatch.js). Handler `(state, params) → {ok, error?}`.
- RNG: `makeRng(state, name)` (rng.js). **Pozor: `StreamName` už obsahuje `'forest'`, `'mine'`, `'field'`** (types.d.ts:11) – streamy jsou připravené, použij je.
- UI: preact+htm, `App.js`, `selectors.js` (čisté selektory), `send(type, params)` jako jediný zápis. Bez DOM v core.

**Autoritativní zdrojové pořadí kroku originálu (game.js:16-18):** `Engine.step()` (= schedule) → `World.step()` → `Skills.step()`. Tj. **skilly běží KAŽDÝ krok PO produkci/světě**. To je důvod „2× kompenzace" (viz T4 §5.2).

---

## 2. tickOrder – cílový stav po M3 (věrný zdroji)

Aktualizuj `src/core/engine/tickOrder.js` (`registerCorePeriodics`) **a** `docs/tickOrder.md` ve stejném commitu (živý artefakt, N-04). Měněné/nové řádky:

```
ID                          edge        order  systemFn                   pozn.
population.migration        step        10     population.migration       (beze změny)
skills.progress             step        20     skills.progress            T4 – nahradit noop
jobs.production             quarterDay  10     jobs.production            T2 – přepsat fn
jobs.accidents              quarterDay  20     jobs.accidents             T2 – NOVÝ (po produkci)
jobs.autoAssign             quarterDay  30     jobs.autoAssign            T2 – NOVÝ (po accidents)
health.births               noon        10     (beze změny)
population.retirement        noon       20     (beze změny)
health.disease              noon        30     (beze změny)
crime.daily                 noon        40     (beze změny)
food.meal2                  noon        50     (beze změny)
workerEfficiency.daily      day         5      workerEfficiency.daily     T3 – NOVÝ (PŘED meal1, počítá home.workerEfficiency pro příští den)
food.meal1                  day         10     (beze změny)
housing.settlementLevel     day         20     (beze změny)
world.tick                  day         30     (beze změny, STUB)
field.daily                 day         40     field.daily                T1 – NOVÝ
mine.daily                  day         50     mine.daily                 T1 – NOVÝ
forest.regen                10days      10     forest.regen               T1 – nahradit noop
localTaxes                  5days       10     (noop, M4)
food.spoilage               month       10     (beze změny)
taxes.monthly               month       20     (noop, M4)
season.change               season      10     (noop, M3? – necháváme noop; sezónní efekty produkce řeší forest/field přímo přes season index)
battle.tick                 step        30     (beze změny, STUB)
```

**Zdůvodnění pořadí (reviewer to kontroluje):**
- **`workerEfficiency.daily` order 5 (PŘED meal1)** na `day` edge: efektivita se v originálu počítá v `Home.step` denně a produkce ji čte (`home.workerEfficiency`, home.js:1901). Spočti ji na `day` a ulož do `state.home.workerEfficiency`; `jobsProduction` na `quarterDay` ji pak čte ze state (deterministicky, hodnota platí celý den). Architektura §4.3 řadí „efektivita → joby → jídlo" – proto efficiency PŘED meal.
- **`jobs.accidents` a `jobs.autoAssign` PO `jobs.production`** v rámci `quarterDay` (order 20/30 > 10): originál (home.js:1283) dělá quarterDay threats/accidents a worker reassignment v témž bloku jako produkci; accidents zabíjejí workery až po odvedení produkce daného ticku.
- **`forest.regen` na `10days`**: originál forest.js:54 `curStep % (STEPSPERDAY*10) == 0` – regen běží jednou za 10 dní (saplings shift/push). Denní `forest.step` originálu dělá jen animal regen výpočet uvnitř toho 10denního bloku → v rebuildu vše soustředíme do `forest.regen` (10days). (Viz §3.1 pozn. o zjednodušení.)
- **`field.daily`/`mine.daily` na `day`**: originál field.js:9 a mine.js:9 `curStep % STEPSPERDAY == 0`.

---

## 3. T1 – Forest / Field / Mine systémy

### 3.0 Datový tvar state (NOVÉ pod `state.world`)

`state.world` je dnes `{}`. Přidej tři sub-domény + area/used. **Persist schéma napiš současně** (allowlist – jen dynamika).

```jsonc
state.world = {
  forest: {
    curTrees: 27173,          // start z config.js:687
    curAnimals: 3864,         // start z config.js:686
    saplings: [0,0,0,0,0,0,0,0,0,0], // 10-prvková fronta saplings (forest.js:57 shift/push); start nuly
    health: 100,              // forest.js:55
    timeSinceLastFire: 0,     // forest.js:96 (autumn fire risk)
    lastFire: 0,              // forest.js:107 (step posledního požáru; 0 = nikdy)
    consecutiveNoAnimal: 0,   // forest.js:119 (animal migration trigger)
  },
  field: {
    curLivestock: 0,          // config.js:708 curlivestock (start 0)
    rodentInfestation: 0,     // field.js:18
    usedFarmLand: 0,          // field.js:66
    inspectTime: 0,           // field.js:33 (crop circle; stub – ponech 0, mechanika M8)
  },
  mine: {
    curOres: 20000,           // config.js:715 curOres (start 20000)
  },
  // area/used: DERIVED z home.level + budov; NEUKLÁDAT (architektura §6.3 – derivovaná data se nikdy neukládají).
  // Počítají se event-driven (po změně level/budov) nebo lazy v selektoru. V M3 home.level neexistuje
  //   jako rostoucí veličina → použij settlementLevel jako proxy (viz §3.4).
}
```

**Pozn. ke startovním hodnotám**: `curTrees=27173`, `curAnimals=3864`, `curOres=20000`, `curLivestock=0` jsou EXTRAHOVANÉ z `config.js` (řádky 686-715, `provenance: extracted`). Zapiš je do `balance.js` (viz §3.5), ne hardcode v systému.

### 3.1 `src/core/systems/forest.js` (NOVÝ)

```js
/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

/**
 * Forest regeneration – 10days edge, order 10.
 * Source: forest.js:48-170 (10-day block: curStep % (STEPSPERDAY*10) == 0).
 * Deterministic port: animal regen + sapling queue + seasonal bonuses.
 * Fire risk (autumn) and forest fire use rng.stream('forest').
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function forestRegen(state, _params, ctx) { /* ... */ }
```

**Algoritmus (věrný forest.js, deterministicky):**
1. `const f = state.world.forest; const season = state.season.curSeason; // 0=spring,1=summer,2=autumn,3=winter`
2. **Saplings queue** (forest.js:56-88): `const matured = f.saplings.shift();` `let newSaplings = f.curTrees * 0.004;`
   - Spring (season===0): `if (f.curTrees < 500) newSaplings += 120; else newSaplings += 20;` (pollinationService/forester techy jsou M5/M6 → vynech, zapiš gap).
   - `f.saplings.push(newSaplings);`
   - health loss: `for i: f.saplings[i] -= f.saplings[i] * (100 - f.health) / 5;` (health=100 → 0 loss).
   - cap matured podle area: `const area = forestArea(state); const used = forestUsed(state); if (area < used + matured + 100) matured = area - used - 100;` (clamp ≥0).
   - `f.curTrees += matured;`
3. **Autumn fire risk** (forest.js:90-113, season===2): `f.timeSinceLastFire++; if (f.timeSinceLastFire > 23) { const risk = Math.pow(f.curTrees / forestArea(state), 2); if (makeRng(state,'forest').next() < risk) { f.curTrees = Math.round(f.curTrees*0.5); f.lastFire = state.engine.curStep; log('forest fire'); } f.timeSinceLastFire = 0; }`
4. **Animal regen** (forest.js:116-152):
   - `if (f.curAnimals <= 20) { f.consecutiveNoAnimal++; if (f.consecutiveNoAnimal > 10 && season===0) { f.consecutiveNoAnimal = 0; f.curAnimals += 600 + Math.ceil(makeRng(state,'forest').next()*450); } }`
   - `else { f.curAnimals += Math.ceil(f.curAnimals*0.0075 + f.curTrees/(f.curAnimals*10.5 + 20)); f.consecutiveNoAnimal = 0; }`
   - seasonal: `if (season===0) f.curAnimals += 70; else if (season===1) f.curAnimals += 30;`
   - `animalGrowth` (forest.js:144) je tech bonus M6 → 0 v M3 (gap).
   - excess cull: `if (f.curAnimals > f.curTrees/5) { const diff = f.curAnimals - f.curTrees/5; f.curAnimals -= Math.floor(diff/5); }`

**Vědomé zjednodušení (zapiš do balance.js komentář + gap):** originál má `forest.step` denně (počítá animal regen každý den uvnitř 10denního bloku – ale ten blok JE 10denní, denní `step` jen testuje `% STEPSPERDAY`). Reálně tedy celý regen běží 1× za 10 dní → náš `forestRegen` na `10days` je věrný. `maxTrees` (forester tech), `animalGrowth`, pollination jsou techy/budovy M5–M6 → v M3 vynechány, gap `G-FOREST-TECHMODS`.

**RNG:** používej `makeRng(state, 'forest')` (stream existuje). Volej ho i když požár nenastane jen pokud originál volal `Math.random()` na té cestě – tj. fire test (season autumn) a animal migration. Žádné jiné `Math.random()`.

### 3.2 `src/core/systems/field.js` (NOVÝ)

```js
/** Field daily – day edge, order 40. Source: field.js:8-40. */
export function fieldDaily(state, _params, ctx) { /* ... */ }
```

**Algoritmus (field.js:8-31):**
- `const fld = state.world.field; const season = state.season.curSeason;`
- `vegetableFarm.created` je budova M5 → v M3 = 0 → `chanceOfRodents = 0`. **V M3 je rodent mechanika fakticky vypnutá** (žádné farmy), ale systém zaregistruj a strukturu nech (gap `G-FIELD-FARMS`, milník M5). Pokud chceš testovatelnost: vzorec `chanceOfRodents = 0.001 * vegetableFarmCount` (Winter /3, Spring ×1.5) implementuj, ale `vegetableFarmCount=0` z absence budov.
- `inspectTime` (crop circle, field.js:33-39): dekrementuj pokud >0; mechanika dropů je M8 → ponech jako pasivní dekrement, gap.
- **RNG:** `makeRng(state, 'field')` pro rodent roll (i když chance=0, originál volá `Math.random()` na denní cestě jen uvnitř `if (chanceOfRodents)` – pokud chance=0, `Math.random() < 0` je vždy false; pro 1:1 determinismus **NEVOláme rng když chanceOfRodents===0**, ať nespotřebováváme stream zbytečně). Dokumentuj toto rozhodnutí.

### 3.3 `src/core/systems/mine.js` (NOVÝ)

```js
/** Mine daily – day edge, order 50. Source: mine.js:7-18. */
export function mineDaily(state, _params, ctx) { /* ... */ }
```

**Algoritmus (mine.js:8-17):**
- `const m = state.world.mine;`
- `if (m.curOres < 300) { if (makeRng(state,'mine').next() < 0.1) { /* schedule eventMineExpander */ } }`
- `eventMineExpander` je obsahový event (M8) → v M3 buď no-op nebo jednoduchý grant ore (gap `G-MINE-EXPANDER`). **Doporučení:** v M3 jen no-op s logem; nespouštěj schedule fn který neexistuje. RNG volej jen když `curOres < 300` (věrné – originál testuje `Math.random()` jen v té větvi).

### 3.4 Area / used (kapacita plochy)

**Derivované, NEUKLÁDAT.** Čisté funkce v novém `src/core/balance/formulas.js` (přidat) nebo `src/core/systems/space.js`:

```js
/** Forest space available. Source: config.js:3711. Formula: round(28000 + 1.6^level * 5000). */
export function forestArea(level) { return Math.round(28000 + Math.pow(1.6, level) * 5000); }
/** Field space available. Source: config.js:3709. Formula: round(450 + 2^level * 1200). */
export function fieldArea(level) { return Math.round(450 + Math.pow(2, level) * 1200); }
/** Mine space available. Source: config.js:3712. 0 if mine not unlocked, else 1000 + level*800. */
export function mineArea(level, mineUnlocked) { return mineUnlocked ? (1000 + level * 800) : 0; }
/** Forest used. Source: config.js:3769-3770: building forestSpace + curTrees. M3: only curTrees (no buildings). */
export function forestUsed(curTrees /*, buildings */) { return Math.round(curTrees); }
```

**`level` v M3**: `state.home.settlementLevel` (existuje, housingSettlementLevel ho počítá). To je proxy za `home.level` originálu. Zapiš jako předpoklad (gap `G-HOME-LEVEL`: originál má `home.level` 0..6 jako progresní stupeň; M3 mapuje na settlementLevel; přesné mapování ladí M5). `mineUnlocked` = true v M3 (mine je default; explorer unlock je M5).

**Selektor pro UI:** `selectAreaUsed(state)` v selectors.js vrací `{ forest: {area, used}, field: {area, used}, mine: {area, used} }` – počítá lazy z funkcí výše, necachuje ve state.

### 3.5 Resource handler `stock` (NOVÝ kind)

Stocky (`trees/animals/ores/livestock/farmland`) jsou v `state.world.{forest,field,mine}`, ne v `home.store`. Aby joby (lumberjack platí `trees`, hunter „platí" `animals` přes completion-multiplier) mohly jít přes transakční vrstvu, přidej handler `stock` do `resourceHandlers` (handlers.js):

```js
stock: {
  get(state, key) { return STOCK_PATH[key] ? readPath(state, STOCK_PATH[key]) : 0; },
  add(state, key, n) { /* NaN guard; writePath += n */ },
  remove(state, key, n, allowDeficit=false) { /* NaN guard; clamp ≥0; deficit check */ },
}
```

s mapou:
```js
const STOCK_PATH = {
  trees:     'world.forest.curTrees',
  animals:   'world.forest.curAnimals',
  ores:      'world.mine.curOres',
  livestock: 'world.field.curLivestock',
  farmland:  'world.field.usedFarmLand',
};
```

A do `resources.json` přidej tyto resource id s `kind: "stock"` (aby `resourceKindOf`/`byId` je rozpoznal). **Pozor na BL-3 / hot-path:** `resourceKindOf` dnes dělá try/catch přes `byId`. Po BL-3 (§7) bude byId cache spolehlivá; `stock` kind se vyřeší lookupem v cache.

**Pozn.:** v M3 joby produkují hlavně do `inventory`/`food` (jako dnes). Stock-jako-cost (lumberjack platí trees) je v originálu vázán na `job.cost` který M3 katalog jobs nemá (jobs.json má jen `products`). Proto **`stock` handler přidej, ale plné cost-z-stocku napojení je připravené pro M5** (kdy přijdou plné joby s cost). V M3 stocky mění jen forest/field/mine systémy a completion-multipliery jobů je čtou (read-only přes `get`).

---

## 4. T2 – Joby + produkce (quarterDay)

### 4.0 Cílový model (věrný home.js:1319-1562)

Originál NEpřičítá produkty fixně – má **progress model**: každý quarterDay `job.curStep += home.workerEfficiency * job.number`; když `job.curStep > job.completionUnits`, odvede `products` do inventáře a resetuje `curStep=0`. `completionUnits = job.maxStep * STEPSPERDAY * job.number` (s resource-multipliery pro hunter/lumberjack/rancher).

**M3 přepis `jobsProduction`** musí tento progress model implementovat (dnešní fixní `amount*5` je M2a placeholder, který nahrazujeme).

### 4.1 Datový tvar state (NOVÉ pod `state.home`)

```jsonc
state.home.jobs = {
  // per job id: dynamický stav
  "baker":      { number: 0, curStep: 0 },
  "woodcutter": { number: 0, curStep: 0 },
  // ... pro každý job z katalogu jobs.json
},
state.home.workforce = {
  total: 0,        // = součet workerSlots z housing (workerSlots = housing.workers)
  assigned: 0,     // = Σ jobs[*].number
  // unemployed = total - assigned (derived, neukládat)
},
state.home.workerEfficiency: 1, // T3 počítá denně; persist (deterministická báze pro produkci)
```

**Persist schéma** (allowlist): `jobs: { number, curStep }` per id; `workforce: { assigned }` (total je derived z housing); `workerEfficiency`. `number` a `curStep` jsou jediná persistovaná dynamika jobů (architektura §6.3).

**`number` = počet workerů na jobu.** `total workerSlots` se počítá z `calcHousingDerivedFromCatalog` (population.js:21 už existuje, vrací `workerSlots`). `unemployed = workerSlots - Σ number`.

### 4.2 `jobsProduction` přepis (`src/core/systems/jobs.js`)

```js
/**
 * Jobs production – quarterDay edge, order 10.
 * Progress model (source: home.js:1510-1547):
 *   each quarterDay: job.curStep += workerEfficiency * job.number
 *   when curStep > completionUnits: grant products (scaled by number), reset curStep.
 *   completionUnits = job.maxStep * STEPSPERDAY * job.number (job.maxStep default per catalog).
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 */
export function jobsProduction(state, _params, ctx) { /* ... */ }
```

**Algoritmus (per job s `number > 0`):**
1. `const eff = state.home.workerEfficiency || 1;` (z T3, default 1).
2. `const def = jobDef(jobId);` (z katalogu – BL-3: čti z přednačteného `ctx.catalog.jobs` nebo cache, ne per-step getCatalog+try/catch).
3. `const maxStep = def.maxStep ?? DEFAULT_JOB_MAXSTEP;` (viz §4.4 čísla).
4. `const completionUnits = maxStep * STEPS_PER_DAY * jobState.number;` (STEPS_PER_DAY=900 z balance).
5. `jobState.curStep += eff * jobState.number;`
6. `if (jobState.curStep > completionUnits) {`
   - `const products = scaleProducts(def.products, jobState.number);` (`{id: amount*number}`, viz home.js:1380-1382 `Math.round(products[ip]*curBatchSize)` – v M3 batchSize=number).
   - `grant(state, products, 'job:'+jobId, ctx, state.engine.curStep);` (přes transakční vrstvu; handler routuje food→food store, goods→inventory, resource→home.store).
   - `jobState.curStep = 0;`
   - `}`

**Determinismus/levnost:** žádné alokace v hot-path kromě malé products mapy při completion (řídké). `Math.round`/`Math.floor` jako originál. Žádný RNG v produkci (originál v produkční smyčce RNG nemá kromě job-specifických eventů hunter/raid které jsou M8).

**`grant` capping:** food handler capuje na `maxFood=500` (handlers.js:68) – to je věrné (`Player.hasCapacityFor`, home.js:1529). Goods/resource bez capu v M3 (warehouseFull je M5).

### 4.3 `builder` slot (stub pro M5)

`jobs.json` přidej `builder` job s `products: {}` (nic neprodukuje) a flag `noProduction: true` nebo `category: "builder"`. `jobsProduction` ho **přeskočí** (`if (def.category === 'builder' || !def.products) continue;`). Builder workforce slot tak existuje (lze přiřadit workery přes `assignJob`), ale stavba budov je M5. Zapiš jako kontrakt (architektura §9.4 – stub registrace). Gap `G-BUILDER-M5`.

### 4.4 `jobs.autoAssign` (NOVÝ – `quarterDay` order 30)

Originál `assignJob` (home.js:2165) je manuální + distribuce do tasků náhodně. **`autoAssignWorkers`** v briefu = automatické dorovnání nezaměstnaných na default joby. V originálu to není jeden vzorec; je to herní pomůcka. **Návrh (jednoduchý, deterministický):**

```js
/**
 * Auto-assign unemployed workers – quarterDay edge, order 30.
 * Distributes unemployed (workerSlots - Σ assigned) round-robin over auto-assignable jobs,
 * respecting job.max. Deterministic (no RNG): stable job order from catalog.
 * Only assigns if autoAssign policy enabled (state.home.autoAssign !== false; default true).
 */
export function autoAssignWorkers(state, _params, ctx) { /* ... */ }
```

- `const slots = workerSlots(state); const assigned = Σ jobs[*].number; let free = slots - assigned;`
- pokud `free <= 0` → return.
- Iteruj joby v **deterministickém pořadí** (pořadí z katalogu) které mají `autoAssignable !== false` a `number < max`; přiřaď round-robin po 1 dokud `free > 0` nebo nejsou kam. **Bez RNG** (na rozdíl od originálu, který distribuoval tasky náhodně – tasky M3 nemáme; zapiš jako vědomé zjednodušení + gap `G-JOB-TASKS`).
- Aktualizuj `state.home.workforce.assigned`.

**Pozn.:** populace (`state.home.population.total`) vs. workforce. V M2 migrace plní `population.total`. Workforce sloty = housing workers. V M3 mapuj: dostupní workeři = `min(population.total, workerSlots)`. Default chování: `total = min(population.total, workerSlots)`; auto-assign rozdělí. Dokumentuj toto sjednocení (gap `G-POP-WORKFORCE`, ladí M5).

### 4.5 `jobs.accidents` (NOVÝ – `quarterDay` order 20)

Věrné home.js:1283-1316 + `procAccident` (config.js:3913):

```js
/**
 * Job accidents – quarterDay edge, order 20 (after production).
 * Source: home.js:1290-1316, config.js:3913 procAccident.
 * level<=1: wolf attack chance 0.005 kills 1 worker from target jobs.
 * level>=3 & workers>200: chance 0.0001*workers/3 → procAccident (kills random job worker).
 * Uses rng.stream('population') (same as crime, deterministic ordering).
 */
export function jobsAccidents(state, _params, ctx) { /* ... */ }
```

- `const rng = makeRng(state, 'population');` (sdílí stream s crime – konzistentní s tím, že accidents/crime jsou „populace"; alternativně nový stream, ale `StreamName` ho nemá → použij `population`, dokumentuj).
- `const level = state.home.settlementLevel; const workers = workforceTotal(state);`
- `if (level <= 1) { if (workers > 0 && rng.next() < 0.005) { killOneWorkerFromJobs(state, ['hunter','woodcutter', ...]); } }`
- `else if (level >= 3 && workers > 200 && rng.next() < 0.0001 * workers / 3) { procAccident(state, rng); }`
- `procAccident`: vyber náhodný job s `number>0` (rng), zabij 1 workera (`jobs[id].number--`, `population.total--`, log). Hospital/nurse dampening je M5 → v M3 vždy 50% kill (home.js:3926 else-větev) → `if (rng.next() < 0.5) kill`.

**RNG pořadí:** accidents běží na `population` streamu PŘED crime (crime je `noon`, accidents `quarterDay` – jiné edge, různé kroky, nekolidují v rámci kroku). Dokumentuj že obě čerpají `population` stream → pořadí spotřeby je `quarterDay accidents` (4×/den) pak `noon crime` (1×/den). Toto je catch-up-safe (deterministické dle curStep).

### 4.6 `assignJob` command (`src/core/commands/assignJob.js` NOVÝ)

```js
/**
 * assignJob command: move `delta` workers to/from a job.
 * Source intent: home.js:2165 assignJob (+ unassign as negative delta).
 * params: { jobId: string, delta: number }
 * Validates: job exists, delta integer, resulting number in [0, job.max],
 *   enough unemployed (delta>0) or enough assigned (delta<0).
 * @returns {CommandResult}
 */
export function assignJob(state, params) { /* ... */ }
export function registerAssignJob(creg) { registerCommand(creg, 'assignJob', assignJob); }
```

- Validace: `jobId` v katalogu; `Number.isInteger(delta)`; pro `delta>0`: `unemployed >= delta` a `number+delta <= max`; pro `delta<0`: `number+delta >= 0`.
- Mutace: `state.home.jobs[jobId].number += delta;` aktualizuj `workforce.assigned`.
- **Hire cost** (home.js:2169) je M5 (joby M3 nemají `hireCost`) → vynech, gap.
- Vrať `{ok:false, error}` při porušení (nikdy nevyhazuj – dispatch.js kontrakt).
- Registruj v bootstrap (vedle `registerSetSpeed`).

### 4.7 Reálná čísla → `balance.js` + `jobs.json`

`jobs.json` rozšiř o `maxStep` per job (čas produkce) a `category`. **Problém:** přesné `maxStep`/`products` nejsou v extrahovaných datech (gap `G-LISTJOB` už existuje, `provenance: approximated`). Postup:
- Ponech 7 jobů z jobs.json, přidej `maxStep` (approximated) a `max` (worker cap, approximated). Doporučené default (zapiš `provenance: approximated`, gap `G-JOB-MAXSTEP`):
  - `DEFAULT_JOB_MAXSTEP = 1` (→ completionUnits = 1*900*number = 900*number; při eff=1, 4 quarterDay/den, přičítá `number` 4×/den = 4*number/den → completion ~225 dní? **Příliš pomalé.**)
  - **Kalibrace:** originál `maxStep` jsou malá čísla (zlomky), `completionUnits = maxStep*900*number`. Aby produkce byla hratelná (job dokončí ~1×/den), `completionUnits ≈ eff*number*4` (4 quarterDay) → `maxStep*900*number ≈ 4*number` → `maxStep ≈ 0.0044`. **Doporučení: `maxStep` per job v rozsahu 0.002–0.01 (approximated), default 0.005**; přesná kalibrace = M9. Zapiš vzorec a default do balance.js `jobs.defaultMaxStep` + per-job override v jobs.json. **TENTO VÝPOČET dej do komentáře balance.js a gap-reportu** – je to klíčová balanční neznámá.
- `state.home.workerEfficiency` clamp [0.25, 2] (už v balance population.workerEffMin/Max).

**Do `balance.js` přidej sekci `production`:**
```js
production: {
  /** Default job maxStep (time factor). completionUnits = maxStep*stepsPerDay*number. provenance: approximated, gap G-JOB-MAXSTEP. Source intent: home.js:1489. */
  defaultJobMaxStep: 0.005,
  /** quarterDay ticks per day (production cadence). Source: home.js:608 STEPSPERDAY/4. */
  quarterDaysPerDay: 4,
},
forest: { treeMatureTime: 36, /* existing */
  /** start stocks. Source: config.js:686-687 */
  startTrees: 27173, startAnimals: 3864,
  saplingQueueLen: 10, /* forest.js 10-day queue */ },
field: { startLivestock: 0 /* config.js:708 */ },
mine: { startOres: 20000 /* config.js:715 */, expanderThreshold: 300 /* mine.js:10 */, expanderChance: 0.1 /* mine.js:12 */ },
space: {
  forestBase: 28000, forestScale: 1.6, forestMul: 5000, // config.js:3711
  fieldBase: 450, fieldScale: 2, fieldMul: 1200,         // config.js:3709
  mineBase: 1000, minePerLevel: 800,                      // config.js:3712
},
accidents: {
  wolfChance: 0.005,            // home.js:1291
  highLevelChanceFactor: 0.0001, // home.js:1313 (× workers/3)
  procAccidentKillChance: 0.5,  // home.js:3926
},
```

---

## 5. T3 – workerEfficiency (day)

### 5.1 `src/core/systems/workerEfficiency.js` (NOVÝ – `day` order 5)

Formula `workerEfficiency(parts)` UŽ EXISTUJE ve formulas.js:75 (clamp [0.25,2], curfew -0.25). Chybí **denní systém**, který ji počítá ze stavu a ukládá do `state.home.workerEfficiency`:

```js
/**
 * Worker efficiency daily – day edge, order 5 (BEFORE meals & production reads).
 * Computes state.home.workerEfficiency via formulas.workerEfficiency().
 * Source: home.js:1901-1911.
 * Inputs in M3 (most morale components are M5+): base 1, curfew (M5 tech → false in M3).
 * @param {GameState} state
 */
export function workerEfficiencyDaily(state, _params, _ctx) {
  state.home.workerEfficiency = workerEfficiency({
    base: 1,
    // M5+ morale parts: minWorkerPenalty, leaderMorality, entertainmentOffset,
    //   goodSpiritsBonus, workerMorale → 0 in M3 (gap G-MORALE-M5)
    curfew: false, // curfew tech is M5/M6
  });
}
```

**V M3 je workerEfficiency fakticky konstanta 1** (všechny morale složky jsou M5+). To je OK – systém + persist slot existuje, hodnotu plní složky v dalších milnících. **Důležité:** systém běží na `day` order 5, takže `state.home.workerEfficiency` je nastavená PŘED `jobsProduction` (quarterDay) celého dne. Zapiš gap `G-MORALE-M5` (minWorkerPenalty z food/housing, leaderMorality z awesomeness, atd.).

**Čistota:** formula je už čistá; systém jen čte/zapisuje state. Žádný RNG, žádné alokace. Catch-up-safe triviálně.

---

## 6. T4 – Skilly (step, 2× kompenzace)

### 6.1 Datový tvar state (NOVÉ – `state.home.skills` nebo `state.player.skills`)

Skilly produkty jdou do `player.inventory` (skills.js:21). Stav skillů dej pod `state.home.skills` (konzistentní s ostatní home dynamikou) nebo `state.skills`. **Doporučení: `state.home.skills`:**

```jsonc
state.home.skills = {
  // per skill id (z katalogu skills.json):
  "<skillId>": { progressing: false, curStep: 0, progPct: 0 },
}
```

**Persist schéma**: `{ progressing, curStep }` per id (`progPct` je derived – přepočítej při loadu nebo persistuj taky; originál ho drží ve stavu, ale je odvozený → NEUKLÁDAT, počítej v selektoru/systému).

### 6.2 `src/core/systems/skills.js` (NOVÝ – `step` order 20)

Věrné skills.js:10-28, **S KOMPENZACÍ 2×** (K4, architektura §4.3):

```js
/**
 * Skills progress – step edge, order 20.
 * Source: skills.js:10-28. Original Skills.step() ran ONCE per engine step
 *   (game.js:18, after World.step). curStep++ each step.
 * 2× COMPENSATION (K4 / architecture §4.3): original effectively progressed skills
 *   at the engine rate; rebuild runs this once per step too, so to keep balance faithful
 *   the EFFECTIVE maxStep is halved (maxStep/2) OR curStep increments by the documented
 *   factor. Original bug: skills stepped 2×/step in some paths → effective maxStep/2.
 *   Apply: completion threshold uses maxStep/2 (see balance.skills.stepCompensation).
 * @param {GameState} state
 * @param {TickContext} ctx
 */
export function skillsProgress(state, _params, ctx) { /* ... */ }
```

**Algoritmus (per skill s `progressing===true`):**
1. `s.curStep++;`
2. `const effMaxStep = def.maxStep * BALANCE.skills.stepCompensation;` // stepCompensation = 0.5 (2× kompenzace, maxStep/2)
3. `s.progPct = Math.min(Math.round(s.curStep * 100 / effMaxStep), 100);`
4. `if (s.curStep > effMaxStep) {`
   - `if (def.products) grant(state, def.products, 'skill:'+skillId, ctx, state.engine.curStep);` (→ inventory)
   - `onFull` callbacky (skills.js:18) jsou efekty M5/M6 (registr efektů) → v M3 jen products. Gap `G-SKILL-EFFECTS`.
   - reset: `s.progressing = false; s.curStep = 0; s.progPct = 0;`
   - `}`

**2× kompenzace – přesné zdůvodnění pro reviewera:** Architektura §4.3 a §5.5 (K4) explicitně uvádějí: „Skills 2×/krok → efektivní `maxStep/2`". Originál `Skills.step()` se volal jednou za engine krok (game.js:18), ale dokumentovaná balanční past je, že progrese byla 2× rychlejší než zamýšleno. Rebuild běží `skillsProgress` taky 1×/step (edge `step`), takže aby balanc seděl s pozorovaným chováním originálu, **threshold = maxStep/2**. Zapiš do balance.js `skills.stepCompensation: 0.5` s odkazem na architekturu §4.3/§5.5 a komentářem, že OBĚ varianty (maxStep i maxStep/2) se rozhodnou v kalibraci M9 – proto je to konstanta, ne magické číslo. Gap `G-SKILL-COMPENSATION` (low, M9).

### 6.3 `startSkill` command (`src/core/commands/startSkill.js` NOVÝ)

Věrné skills.js:41-54:

```js
/**
 * startSkill command. Source: skills.js:41-54.
 * params: { skillId: string }
 * Validates: skill exists & discovered & not already progressing & canAfford(cost).
 * On success: pays cost (if any), sets progressing=true.
 * @returns {CommandResult}
 */
export function startSkill(state, params) { /* ... */ }
export function registerStartSkill(creg) { registerCommand(creg, 'startSkill', startSkill); }
```

- Validace: `def = skillDef(skillId)` exists; `!state.home.skills[skillId]?.progressing`; discovered (M3: všechny skilly discovered=true, gap `G-SKILL-DISCOVERY` M6); `if (def.cost) canAfford(state, def.cost)`.
- Mutace: `if (def.cost) pay(state, def.cost, 'skillStart:'+skillId, ctx?, step);` `state.home.skills[skillId].progressing = true;`
- **Pozn.:** command handler nemá `ctx` (dispatch.js signatura `(state, params)`). Pro `pay` s emitTx buď rozšiř signaturu (mimo scope – architektura §3.3) NEBO volej `pay(state, cost, cause)` bez ctx (emitTx je optional, transactions.js:29). **Doporučení: `pay(state, def.cost, 'skillStart:'+skillId)` bez ctx** – tx event se v M3 neemituje pro skill start (accounting je M4). Dokumentuj.
- Vrať `{ok, error}`.

### 6.4 skills.json katalog

`skills.json` je dnes prázdný (`skills: []`, gap `G-LISTSKILL`, `provenance: approximated`). **Doplň aspoň 1-2 ukázkové skilly** (approximated) aby systém + UI šel otestovat, s `provenance: approximated`:
```jsonc
{ "id": "basketWeaving", "name": "Basket Weaving", "maxStep": 50, "products": { "basket": 1 }, "cost": {}, "discovered": true }
```
Zapiš že přesný listSkill chybí (gap už existuje). **`basket` goods**: goods katalog je prázdný (gap G-LISTGOODS) → buď použij existující resource (`wood`) jako product, nebo přidej approximated goods. **Doporučení: ukázkový skill produkuje `wood` nebo `techPt`** (existující resource kindy), ať nezavádíš fiktivní goods. Dokumentuj.

---

## 7. BL-3 – getCatalog cache mimo hot-path

**Problém (review_iter-008 BL-3):** per-step systémy (`jobs.js`, `population.js`, `food.js`) volají `getCatalog('jobs'/'houseTypes'/'food')` v try/catch jako control-flow. Na správně bootnuté cestě funguje, ale try/catch v hot-path je anti-pattern a maskuje chyby.

**Řešení (2 varianty, doporučená první):**

**Varianta A (doporučená) – přednačtené katalogy v `ctx`:** Bootstrap (registerCorePeriodics caller / app/main.js) jednou při startu načte potřebné katalogy do `ctx`:
```js
ctx.catalog = {
  jobs: getCatalog('jobs').jobs,
  houseTypes: getCatalog('houseTypes').houseTypes,
  food: getCatalog('food').food,
  skills: getCatalog('skills').skills,
};
```
Systémy čtou `ctx.catalog.jobs` (žádný getCatalog/try/catch v hot-path). `TickContext` typ rozšiř o optional `catalog?`. **Invalidace**: katalogy jsou immutable po loadu → cache platí celou session; po `loadCatalog`/`clearCatalogs` (jen testy) rebuild ctx. Toto je nejlevnější a nejčistší.

**Varianta B (minimální) – `hasCatalog` místo try/catch:**
```js
const jobs = hasCatalog('jobs') ? getCatalog('jobs').jobs : [];
```
`hasCatalog` (loader.js:59) je O(1) hasOwnProperty, žádný throw. Menší zásah, ale stále volá getCatalog per-step (levné – Map lookup, ne throw).

**Doporučení:** Varianta A pro nové M3 systémy (forest/field/mine/jobs/skills čtou z `ctx.catalog`); **Varianta B jako minimální fix pro existující population.js/food.js** (nahraď try/catch za `hasCatalog`). Tím je BL-3 vyřešeno bez velkého refactoru a nové systémy jsou rovnou čisté.

**Jak ověří test:** unit test že `jobsProduction`/`forestRegen` nevolají `getCatalog` (mock/spy) když `ctx.catalog` je předaný; že `hasCatalog`-cesta vrací `[]` bez throwu když katalog chybí; perf: žádný try/catch v hot-path (grep/review).

---

## 8. T5 – UI obrazovky (forest/field/mine/jobs)

Core bez DOM. UI = preact+htm, čte snapshot přes selektory, zapisuje přes `send(type, params)`.

### 8.1 Selektory (`src/ui/selectors.js` – přidat)

```js
/** Forest/field/mine readout. Pure, no DOM. */
export function selectResourceAreas(s) {
  return {
    forest: { trees: s.world.forest.curTrees, animals: s.world.forest.curAnimals,
              area: forestArea(s.home.settlementLevel), used: forestUsed(s.world.forest.curTrees), health: s.world.forest.health },
    field:  { livestock: s.world.field.curLivestock, rodents: s.world.field.rodentInfestation,
              area: fieldArea(s.home.settlementLevel), used: s.world.field.usedFarmLand },
    mine:   { ores: s.world.mine.curOres, area: mineArea(s.home.settlementLevel, true), used: 0 },
  };
}
/** Jobs list with progress. Pure. */
export function selectJobs(s) {
  // returns [{ id, name, number, max, progPct, products }]
  // progPct = round(curStep*1000/completionUnits)/10 (home.js:1553)
}
/** Skills list. Pure. */
export function selectSkills(s) {
  // returns [{ id, name, progressing, progPct, products, cost, canStart }]
}
/** Workforce. */
export function selectWorkforce(s) {
  // { total: workerSlots, assigned, unemployed }
}
```

### 8.2 Komponenty (`src/ui/screens/` NOVÉ)

- `ForestScreen.js`, `FieldScreen.js`, `MineScreen.js`: karta se stockem + area/used bar (progressbar) + health (forest).
- `JobsScreen.js`: list jobů, každý s `number`, +/- tlačítka → `send('assignJob', {jobId, delta:+1/-1})`, progress bar (`progPct`), products. Header: workforce (total/assigned/unemployed).
- `SkillsScreen.js`: list skillů, „Start" tlačítko → `send('startSkill', {skillId})` (disabled pokud `!canStart`), progress bar.
- Komponenty čistě prezentační, žádný stav mimo `ui/` (architektura §3.2). Použij existující progress bar pattern (CatchupProgress.js styl).

### 8.3 Navigace v App.js

Přidej přepínání obrazovek (jednoduchý tab/router v UI-only stavu, neukládá se). `App.js` dostane `screen` prop nebo lokální `useState`. Existující HUD (čas/populace/rychlost) zůstává. **UI stav (vybraná obrazovka) NIKDY do save** (architektura §3.2).

### 8.4 Bootstrap napojení

V `app/main.js` (nebo bootstrap) registruj nové commandy: `registerAssignJob(creg); registerStartSkill(creg);`. Přidej `ctx.catalog` (BL-3 var. A). `selectResourceAreas`/`selectJobs`/`selectSkills` napoj do render props.

---

## 9. Persist & catch-up (průřezově)

### 9.1 Persist schémata (psát SOUČASNĚ se systémem, K11)

Nové allowlist persist schémata (vedle existujících v `src/save/persistSchema` – ověř cestu, M2b ji zavedl):
```
world.forest:  { curTrees, curAnimals, saplings, health, timeSinceLastFire, lastFire, consecutiveNoAnimal }
world.field:   { curLivestock, rodentInfestation, usedFarmLand, inspectTime }
world.mine:    { curOres }
home.jobs:     per id { number, curStep }
home.workforce:{ assigned }
home.workerEfficiency: number
home.skills:   per id { progressing, curStep }
```
**Derivované NEUKLÁDAT**: area/used (počítá se z level), `progPct` (z curStep), `workforce.total`/`unemployed`. Migrace v→v+1 přidává tyto klíče s defaulty (architektura §6.4): existující savy bez `world.forest` dostanou start hodnoty z balance.

### 9.2 Catch-up-safe (S-05) – ověření

Catch-up dohání M3 systémy **automaticky** – jsou registrované v tickOrder a `runCatchupBatch` (M2b) volá týž `step()`. `core/engine/catchup.js` se NEMĚNÍ. Podmínky (každý systém splní):
- Determinismus: čas jen `state.engine.curStep`/`state.season.curSeason`; náhoda jen `makeRng(state, stream)`. **Žádný `Date.now()`/`Math.random()`** (grep gate, R-I).
- Levnost: O(jobů)/O(skillů) per tick, žádné O(n²), žádné alokace v hot-path (products mapa jen při completion).
- Bez DOM.

### 9.3 RNG streamy – pořadí spotřeby

| Systém | stream | edge | pozn. |
|--------|--------|------|------|
| forest.regen | `forest` | 10days | fire test (autumn) + animal migration |
| field.daily | `field` | day | rodent roll (jen když chance>0 → v M3 nikdy) |
| mine.daily | `mine` | day | expander roll (jen když ores<300) |
| jobs.accidents | `population` | quarterDay | wolf/procAccident |
| crime.daily | `population` | noon | (existující) |

**Důležité:** forest/field/mine mají VLASTNÍ streamy (už v `StreamName`), takže přidání/změna jednoho nerozhodí ostatní (G1, architektura §4.4). Accidents sdílí `population` s crime – dokumentuj pořadí (accidents quarterDay 4×/den, crime noon 1×/den; různé kroky → deterministické).

---

## 10. Jak ověří test (tabulkové + catch-up-safe)

Pro každý systém napiš `node:test` (vzor existujících `test/*.test.js`):

**T1 forest/field/mine:**
- Tabulkový: forestRegen 1 cyklus z `{curTrees:27173, curAnimals:3864, saplings:[0..], health:100, season:spring}` → ověř `curTrees`, `curAnimals` proti ručně spočteným hodnotám ze vzorců (animal regen `+= ceil(3864*0.0075 + 27173/(3864*10.5+20)) + 70 spring`). Fixed seed pro fire/migration.
- Area: `forestArea(0)=33000` (28000+1.6^0*5000), `fieldArea(0)=1650` (450+1*1200), `mineArea(0,true)=1000`. Ověř proti config.js vzorcům.
- Determinismus: 2× run se stejným seedem → identický `state.world` (hash).

**T2 jobs:**
- Progress: job `number=10, eff=1, maxStep=0.005` → `completionUnits = 0.005*900*10 = 45`; po N quarterDay kde `Σ(eff*number) > 45` (tj. `curStep > 45` po `45/10=4.5` → 5 quarterDay) → completion, grant `products*10`, `curStep=0`. Tabulkově ověř krok kdy completionuje a granted množství.
- `assignJob` command: `{jobId:'baker', delta:3}` z unemployed=5 → `jobs.baker.number=3`, unemployed=2; `delta>max` → `{ok:false}`; `delta` přes unemployed → `{ok:false}`.
- accidents: fixed seed, level=0, workers>0, vynuť `rng<0.005` → 1 worker killed (population.total--, job number--).
- autoAssign: unemployed=5, 2 auto joby (max 10) → round-robin → každý dostane ~2-3, deterministicky (bez RNG).

**T3 workerEfficiency:**
- `workerEfficiencyDaily` s base parts → `state.home.workerEfficiency === 1` (M3, všechny složky 0). Clamp: umělé parts (minWorkerPenalty:-5) → `0.25`; (+5) → `2`. (formula už má testy – přidej systémový test že zapisuje do state na `day` edge.)
- Pořadí: po `day` ticku je `workerEfficiency` nastavená PŘED `quarterDay` produkcí příštího dne.

**T4 skilly:**
- Progress 2× kompenzace: skill `maxStep=50`, `stepCompensation=0.5` → `effMaxStep=25`; `progressing=true` → po 26 stepech (`curStep>25`) completion, `products` v inventory, reset. Tabulkově ověř step completion = 26 (ne 51) – **to je test 2× kompenzace**.
- `startSkill`: discovered+afford → `progressing=true`, cost zaplacen; už progressing → `{ok:false}`; nedostatek na cost → `{ok:false}`.

**BL-3:**
- `jobsProduction(state, {}, ctx)` s `ctx.catalog.jobs` → nevolá getCatalog (spy). `hasCatalog`-cesta v population.js bez throwu když katalog chybí.

**Catch-up-safe (všechny):**
- `runCatchupBatch` přes N dní (chunked) == single-batch (G1): `hash(state)` identický. Žádný systém nepoužívá `Date.now`/`Math.random` (grep test).
- Persist round-trip: save → load → `state.world`/`home.jobs`/`home.skills` identické; migrace starého savu (bez world) → start hodnoty.

---

## 11. Cesty souborů (souhrn)

**Nové core systémy:**
- `src/core/systems/forest.js` (forestRegen)
- `src/core/systems/field.js` (fieldDaily)
- `src/core/systems/mine.js` (mineDaily)
- `src/core/systems/workerEfficiency.js` (workerEfficiencyDaily)
- `src/core/systems/skills.js` (skillsProgress)
- `src/core/systems/jobs.js` (PŘEPSAT jobsProduction + přidat jobsAccidents, autoAssignWorkers)

**Nové commandy:**
- `src/core/commands/assignJob.js`, `src/core/commands/startSkill.js`

**Upravit:**
- `src/core/engine/tickOrder.js` (registerCorePeriodics – nové periodika, nahradit noop) + `docs/tickOrder.md`
- `src/core/resources/handlers.js` (kind `stock` + STOCK_PATH)
- `src/core/balance/balance.js` (sekce production/forest/field/mine/space/accidents/skills + start stocks)
- `src/core/balance/formulas.js` (forestArea/fieldArea/mineArea/forestUsed; volitelně scaleProducts)
- `src/core/state/types.d.ts` (ForestState/FieldState/MineState/JobState/SkillState/WorkforceState; rozšířit HomeState o jobs/skills/workforce/workerEfficiency; WorldState; TickContext.catalog?)
- `src/core/state/createInitialState.js` + `createHomeState.js` (init world.forest/field/mine ze start hodnot; home.jobs/skills/workforce)
- `src/data/jobs.json` (maxStep, max, category, builder stub), `src/data/skills.json` (1-2 approximated skilly), `src/data/resources.json` (stock resource ids), `src/data/gap-report.json` (nové gapy)
- `src/save/persistSchema*` (nová schémata + migrace) — ověř přesnou cestu v src/save/
- `src/ui/selectors.js` (selectResourceAreas/selectJobs/selectSkills/selectWorkforce)
- `src/ui/App.js` (navigace) + nové `src/ui/screens/{Forest,Field,Mine,Jobs,Skills}Screen.js`
- `src/app/main.js` (registrace commandů, ctx.catalog, render props)
- Population.js/food.js: BL-3 minimální fix (hasCatalog místo try/catch)

---

## 12. Gapy (zapsat do gap-report.json)

| Gap | Popis | Milník | Severity |
|-----|-------|--------|----------|
| G-JOB-MAXSTEP | přesné job.maxStep/products neznámé (listJob chybí); approximated default 0.005, kalibrace M9 | M3/M9 | high |
| G-FOREST-TECHMODS | forester/pollination/animalGrowth techy vynechány (forest.js:69,92,144) | M6 | low |
| G-FIELD-FARMS | vegetableFarm.created=0 (žádné budovy) → rodent mechanika fakticky vypnutá | M5 | low |
| G-MINE-EXPANDER | eventMineExpander obsahový event no-op v M3 | M8 | low |
| G-BUILDER-M5 | builder job slot stub, stavba je M5 | M5 | medium |
| G-JOB-TASKS | jobtasks (náhodná distribuce do tasků) zjednodušeno na number-only | M5 | low |
| G-POP-WORKFORCE | population.total vs. workerSlots sjednocení; M3 = min() | M5 | medium |
| G-HOME-LEVEL | home.level (0..6) mapováno na settlementLevel proxy | M5 | medium |
| G-MORALE-M5 | workerEfficiency morale složky (minWorkerPenalty/leaderMorality/...) = 0 v M3 | M5 | medium |
| G-SKILL-COMPENSATION | maxStep vs maxStep/2 (2× kompenzace) rozhodne kalibrace M9 | M9 | low |
| G-SKILL-EFFECTS | skill onFull/onStart efekty (registr efektů) M5/M6 | M6 | low |
| G-SKILL-DISCOVERY | skill discovery (sektory/techy) M6; M3 vše discovered | M6 | low |

(G-LISTJOB, G-LISTSKILL už existují – aktualizuj notes.)

---

## 13. Alternativy (min. 1, s důvody)

**Alt A – joby jako fixní per-tick produkce (dnešní M2a model `amount*number*konstanta`).** Jednodušší, žádný `curStep`/`completionUnits`. **Zamítnuto:** nevěrné originálu (home.js:1510-1547 je explicitně progress model s completionUnits), rozbíjí balanc (produkce by byla lineární bez maxStep křivky) a znemožňuje resource-multipliery (hunter/lumberjack zpomalení při nedostatku zvěře/stromů, home.js:1462-1477) které M5 potřebuje. Progress model je nutný už teď, i když M3 multipliery ještě nemá.

**Alt B – stocky jako prostý objekt ve world bez resource handleru `stock`.** Forest/field/mine by mutovaly `state.world.*` přímo, žádný `stock` kind. **Zamítnuto:** joby v M5 budou platit `trees`/`ores` jako `job.cost` přes transakční vrstvu (canAfford/pay); bez `stock` handleru by se musela zavádět druhá platební cesta (přesně ta třída defektů, kterou K5/§7 odstranil – 4 rozjeté dispatchery). Handler `stock` teď = jeden zdroj pravdy, levné rozšíření, M5 ho jen využije.

**Alt C – workerEfficiency počítat inline v jobsProduction (quarterDay), ne samostatný denní systém.** Méně systémů. **Zamítnuto:** originál počítá efficiency denně (home.js:1901, v denním bloku) a produkce ji čte jako hotovou hodnotu 4×/den; inline výpočet 4×/den by byl jiný balanc a duplikoval by morale agregaci (drahé, M5 morale složky jsou nákladnější). Samostatný `day` systém + persist slot je věrný a čistý (architektura §4.3 řadí efektivitu jako denní hranu).

---

## 14. Předpoklady a nejistoty

1. **`home.jobs`/`home.skills`/`home.workforce` jsou nové pod `state.home`**; `state.world.{forest,field,mine}` nové pod `state.world` (dnes `{}`). Žádná kolize s M2 strukturou.
2. **job.maxStep/products jsou approximated** (G-JOB-MAXSTEP) – produkční rychlost je balanční hypotéza, kalibruje M9; default 0.005 dává ~1 completion/den/job při eff=1, number~10. **Toto je největší balanční nejistota M3** – zapiš výpočet do balance.js i gap-reportu.
3. **2× kompenzace = `maxStep/2`** dle architektury §4.3/§5.5 (K4); konstanta `skills.stepCompensation=0.5`, obě varianty drží M9. Test ověří completion při `curStep>maxStep/2`.
4. **home.level → settlementLevel proxy** (G-HOME-LEVEL); area vzorce používají settlementLevel; přesné mapování M5.
5. **Morale složky workerEfficiency = 0 v M3** → efficiency konstanta 1; systém + slot existuje pro M5+ (G-MORALE-M5).
6. **Stocky start hodnoty extrahované** (config.js:686-715): trees 27173, animals 3864, ores 20000, livestock 0 → do balance.js.
7. **Pořadí kroku originálu** (game.js:16-18: Engine→World→Skills) potvrzuje skilly PO produkci/světě → edge `step` order 20 (po population.migration order 10). Skilly per-step = důvod 2× kompenzace.
8. Žádný produkční kód v tomto dokumentu; D1–D13 beze změny; ekonomika/trh OUT (M4).

---

*Konec specifikace. Coder (Sonnet) implementuje dle tohoto dokumentu; reviewer kontroluje věrnost tickOrder pořadí (§2), 2× kompenzaci skillů (§6.2), progress model jobů (§4.2), catch-up-safe (§9.2) a persist schémata psaná současně se systémy (§9.1). Reálná čísla a pořadí jsou ze zdrojových služeb forest/field/mine/skills/home/game.js (autoritativní) a config.js extrakce.*
