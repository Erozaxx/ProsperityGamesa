# Detailní návrh – iter-011 / T-001 (M4b → MVP): klientský trh, drift, getGoldValue/market.inject, karavany, market UI + crime fix

- **Task**: T-001, iter-011 (BRIEF-040)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Typ**: implementační spec pro Sonnet codera. **ŽÁDNÝ produkční kód v tomto dokumentu.**
- **Vstupy (přečteno)**: architecture_proposal_iter-002_T-001 §9.1 (R1/D9 klientský trh), §8.2 (getGoldValue/market.inject kontrakt + S-06), §7 (resource vrstva); `doc/original_source_doc.md` §4 (Trh, BASECARAVANCAPACITY); `doc/original_source/modules/prosperity/services/market.js` (calcMarketPrice, buyingPrice/sellingPrice, getGoldValue, sendCaravan, caravan.maxSteps); REÁLNÉ `src/core/balance/formulas.js` (marketPrice, goldValue), `src/core/resources/{transactions,handlers,accounting}.js`, `src/core/commands/{dispatch,assignJob,setTaxRate}.js`, `src/core/engine/{tickOrder,index}.js`, `src/core/registry/registry.js`, `src/core/state/{createInitialState,createHomeState}.js`, `src/app/main.js` (bootstrapEngine), `src/ui/{App,screens,selectors,render}.js`, `src/save/{persistSchema,migrations,schema,load}.js`, `src/core/systems/{crime,world}.js`, `src/data/goods.json` (PRÁZDNÝ – gap G-LISTGOODS), `test/contracts.test.js` (S-06 negativní test).
- **Cíl**: dokončit idle smyčku = **MVP**. Po této iteraci hráč: vidí trh, kupuje/prodává zboží s dynamickou cenou, posílá karavany, hodnota košů se oceňuje jediným API. Tím se uzavře T-REV MVP gate.

---

## 0. Executive summary + registr úkolů

| # | Úkol | Soubory (nové/upravené) | Wiring KRITICKÝ |
|---|---|---|---|
| T1 | Klientský trh: marketState + price/spread + buyGoods/sellGoods | `core/systems/market.js` (NOVÝ), `core/commands/{buyGoods,sellGoods}.js` (NOVÉ), `core/balance/balance.js`, `core/state/createInitialState.js`, `src/data/goods.json` | **buyGoods+sellGoods registrované v `bootstrapEngine`** |
| T2 | Denní mean-reversion drift | `core/systems/market.js` (`marketDailyDrift`), `core/engine/tickOrder.js` (periodics) | **`market.drift` v periodics (day)** |
| T3 | getGoldValue jediné oceňovací API + market.inject kontrakt | `core/systems/market.js` (`getGoldValue`, `marketInject`, `priceOf`); S-06 test se obrací na pozitivní | wrapper nad `formulas.goldValue` (HOTOVÁ) |
| T4 | Karavany: sendCaravan command + caravanReturns schedule | `core/commands/sendCaravan.js` (NOVÝ), `core/systems/caravan.js` (NOVÝ `caravanReturns`), registry, `createInitialState` | **sendCaravan registrované v `bootstrapEngine`; `caravanReturns` v registry** |
| T5 | Market UI | `ui/selectors.js` (`selectMarket`), `ui/screens.js` (`MarketScreen`), `ui/App.js` (tab Trh) | **MarketScreen + tab napojené v App.js + `send`** |
| CF | crime.js fix | `core/systems/crime.js` | **`pay(state,{gold},'crime:loss',ctx,step)` místo přímé mutace** |
| P | Persist + migrace v2→v3 | `save/persistSchema.js`, `save/migrations.js`, `save/schema.js` (SAVE_VERSION=3) | marketState + caravan do allowlistu |

**Z M2a/M3/M4a HOTOVÉ – NEREIMPLEMENTOVAT, jen použít:**
- `formulas.marketPrice(basePrice, available, max)` – kubika, identická originálu (`market.js:124`), s clampem available∈[0,max] uvnitř. **HOTOVÁ.**
- `formulas.goldValue(basket, priceOf)` – Σ qty×priceOf(id), gold 1:1. **HOTOVÁ** (jen ji obalíme).
- `resourceHandlers.gold` a `resourceHandlers.goods` – `goods` čte/zapisuje `state.player.inventory[id]`. **HOTOVÉ** (handler kind `goods` z M2a).
- `pay(state,cost,cause,ctx,step)` / `grant(state,prod,cause,ctx,step)` / `canAfford` – atomické, emitují txEvent přes `ctx.emitTx`. **HOTOVÉ.**
- `ctx.emitTx` zapojené v `bootSequence` (M4a) → účetnictví funguje i pro nové platby zdarma.
- `registerCommand(creg,type,fn)` + `dispatch` – command vrstva. **HOTOVÁ.**
- `register(registry,id,fn)` + `resolve` + `scheduleInsert(state,step,id,params)` (z `engine/index.js` jako `scheduleInsert`). **HOTOVÉ.**

---

## 1. Předpoklad: goods katalog je prázdný (gap G-LISTGOODS) – seed katalog

`src/data/goods.json` je `{"goods": []}` (listGoods se nepodařilo extrahovat). Trh **nemá co obchodovat** bez položek. Coder proto vytvoří **seed goods katalog** (`provenance: 'approximated'`, gap G-LISTGOODS), aby trh měl deterministická data. BasePrice/max jsou aproximace – finální kalibrace M9.

### 1.1 `src/data/goods.json` – nový obsah

```json
{
  "_meta": {
    "notes": "Seed goods for M4b market MVP. listGoods not in extracted sources (gap G-LISTGOODS). basePrice/max approximated, calibrated in M9.",
    "provenance": "approximated",
    "source": "doc/original_source/modules/prosperity/lists (listGoods missing)"
  },
  "goods": [
    { "id": "wood",   "kind": "goods", "basePrice": 2,  "max": 10000, "baselineFraction": 0.5 },
    { "id": "ore",    "kind": "goods", "basePrice": 5,  "max": 8000,  "baselineFraction": 0.5 },
    { "id": "tools",  "kind": "goods", "basePrice": 25, "max": 2000,  "baselineFraction": 0.5 },
    { "id": "cloth",  "kind": "goods", "basePrice": 15, "max": 3000,  "baselineFraction": 0.5 },
    { "id": "gems",   "kind": "goods", "basePrice": 120,"max": 500,   "baselineFraction": 0.5 }
  ]
}
```

- **`kind: "goods"`** je KRITICKÉ: `resourceKindOf(key)` v `handlers.js` čte `item.kind || entry.type` z `byId`. Aby `pay`/`grant` směrovaly nákup/prodej do `state.player.inventory` (goods handler), musí mít položka `kind: "goods"`. (Ověř: `byId('wood').entry.kind === 'goods'` → `handlerFor('wood') === resourceHandlers.goods`.)
- **`baselineFraction`**: kam se `available` vrací driftem (0.5 = polovina max → cena ≈ `basePrice×1³ = basePrice`). Baseline je tedy ne-triviální cíl (ne 0, ne max).
- **`max`**: referenční zásoba pro cenovou kubiku.

### 1.2 Registrace goods katalogu do loaderu

V `src/core/catalog/loader.js` přidat `'goods'` do `ID_CATALOGS` setu (řádek 23-25), aby `byId` indexoval položky zboží (nutné pro `resourceKindOf`). V `src/app/catalogs.js` přidat `'goods'` do `CATALOG_NAMES` (řádek 10-20), aby se katalog načetl z `./src/data/goods.json`.

> **Ověř test:** po `loadAllCatalogs()` (resp. `loadCatalog('goods', data); buildById()`) platí `hasId('wood')===true` a `resourceKindOf('wood')==='goods'`.

### 1.3 Validátor katalogu

`assertCatalogValid('goods', data)` (v `core/catalog/index.js` / validate modulu) musí akceptovat `goods` katalog: každá položka má `id:string`, `kind:'goods'`, `basePrice:number>0`, `max:number>0`, `baselineFraction:number∈[0,1]`. Coder doplní `goods` case do existujícího validátoru stejným vzorem jako ostatní katalogy.

---

## 2. T1 – Klientský trh (D9, §9.1, N-02)

### 2.1 marketState – tvar a inicializace

**Umístění ve stavu**: `state.world.marketState` (mapa `goodsId → {available, max, baseline}`). World doména už je v persist allowlistu (§9.1 K11), market dynamika patří do světa (§3.2 architektura: `world: { …, marketState }`).

```
state.world.marketState = {
  wood:  { available: 5000, max: 10000, baseline: 5000 },
  ore:   { available: 4000, max: 8000,  baseline: 4000 },
  tools: { available: 1000, max: 2000,  baseline: 1000 },
  cloth: { available: 1500, max: 3000,  baseline: 1500 },
  gems:  { available: 250,  max: 500,   baseline: 250  }
}
```

**Inicializace** v `createInitialState.js` → `createWorldState()` (rozšířit existující funkci, řádky 15-37). Po načtení goods katalogu NENÍ k dispozici v `createInitialState` (catalog je M1, createInitialState je catalog-free – viz komentář řádek 50). Proto **dvoufázová inicializace**, vzor jako u jobs/skills (lazy):

- `createWorldState()` přidá `marketState: {}` (prázdná mapa – stejně jako `home.jobs: {}`).
- Naplnění z katalogu udělá **`marketInit(state, goodsCatalog)`** v `core/systems/market.js`, volaná z `bootstrapEngine` (nebo z prvního tiku market systému, lazy). Doporučeno: volat v `bootstrapEngine` PO načtení katalogů (katalogy se v `bootSequence` načtou před `bootstrapEngine`), předat goods katalog do `marketInit`.

```
/**
 * Initialize marketState from goods catalog (idempotent: skips ids already present).
 * available/baseline = round(max * baselineFraction).
 * @param {GameState} state
 * @param {Array<{id:string,max:number,baselineFraction:number}>} goods
 */
export function marketInit(state, goods) { … }
```

> **Pozn. k bootstrapEngine wiring**: `bootstrapEngine()` v main.js už staví `ctx.catalog` přes `buildCtxCatalog()` (řádky 60-72) – přidat `'goods'` do seznamu načítaných katalogů tam (`['jobs','skills','houseTypes','food','goods']`). `marketInit` pak dostane `ctx.catalog.goods`. Volání `marketInit(state, ctx.catalog.goods)` patří do `bootSequence` HNED po `bootstrapEngine()` a po `ctx.emitTx` wiring (kolem řádku 165 main.js), aby fungovalo i pro fresh start i po loadu (idempotentní: existující marketState z loadu se nepřepíše).

### 2.2 Cenové vzorce (HOTOVÁ formulas.marketPrice + spread)

`core/systems/market.js` – čisté price helpery (žádná mutace), čerpají z `formulas.marketPrice` + `BALANCE.market`:

```
priceOf(state, goodsId)        → marketPrice(basePrice, available, max)   // střední cena (oceňování)
buyingPrice(state, goodsId)    → round(priceOf × haggleBuy  × 100)/100    // co hráč PLATÍ za kus
sellingPrice(state, goodsId)   → round(priceOf × haggleSell × 100)/100    // co hráč DOSTANE za kus
```

- `basePrice` se čte z goods katalogu (`byId(goodsId).entry.basePrice`), `available`/`max` z `state.world.marketState[goodsId]`.
- `BALANCE.market.haggleBuy = 1.35`, `haggleSell = 0.6` – **už v balance.js** (řádky 75-78). Použít, nereimplementovat.
- Zaokrouhlení na 2 desetinná místa `round(x*100)/100` – identické s originálem `market.js:180/194`.
- **M5+ gap (G-HAGGLE-MODS)**: originál upravuje haggle o ±0.1 podle `bookKeeping`/`tradingHouse` budov. Budovy nejsou v M4b → **bez modifikátorů**, čistě 1.35/0.6. Poznámka v kódu.

**Reálná čísla (wood, basePrice=2, max=10000):**
| available | ratio | (1.5−ratio)³ | priceOf | buyingPrice (×1.35) | sellingPrice (×0.6) |
|---|---|---|---|---|---|
| 5000 (baseline) | 0.5 | 1.0 | 2.0 | 2.70 | 1.20 |
| 0 (vykoupeno) | 0.0 | 3.375 | 6.75 | 9.11 | 4.05 |
| 10000 (přeplněno) | 1.0 | 0.125 | 0.25 | 0.34 | 0.15 |

### 2.3 buyGoods / sellGoods commandy

**Nové soubory** `core/commands/buyGoods.js`, `core/commands/sellGoods.js` (vzor přesně dle `setTaxRate.js` / `assignJob.js`: validace → mutace → CommandResult; NIKDY nevyhazují).

**Důležité**: command handler dostává `(state, params)` – **NEMÁ ctx** (viz `CommandHandlerFn` typ v dispatch.js: `(state, params) => CommandResult`). Pro platby s `emitTx` to znamená: command vrstva volá `pay`/`grant` **bez ctx** (tx se nezaznamenají do účetnictví) NEBO se ctx musí dostat dovnitř. **Rozhodnutí (DR-011-A): commandy provedou platbu bez emitTx** – nákup/prodej zboží hráčem není měsíční účetní položka jako daně/upkeep (council report sleduje gold flow firmy, ne tržní směny). Tx z buy/sell se do reportu nezahrnují (konzistentní s tím, že command vrstva ctx nemá). Pokud by se v budoucnu chtěly i tržní směny v reportu, ctx by se musela injektovat do command registry (mimo scope M4b).

**buyGoods** (`params: { goodsId, qty }`):
```
buyGoods(state, params):
  1. goodsId musí být string, marketState[goodsId] musí existovat → jinak {ok:false,error}
  2. qty musí být kladný integer → jinak {ok:false,error}
  3. unitPrice = buyingPrice(state, goodsId)
     totalCost = round(unitPrice * qty * 100)/100
  4. cost = { gold: totalCost }
     if (!canAfford(state, cost)) → {ok:false, error: 'nedostatek zlata'}
  5. pay(state, cost, 'market:buy')           // gold handler, BEZ ctx (DR-011-A)
     grant(state, { [goodsId]: qty }, 'market:buy')  // goods handler → inventory
  6. marketState[goodsId].available = clamp(available - qty, 0, max)   // N-02 clamp
  7. return {ok:true}
```

**sellGoods** (`params: { goodsId, qty }`):
```
sellGoods(state, params):
  1-2. stejná validace
  3. unitPrice = sellingPrice(state, goodsId)
     totalGain = round(unitPrice * qty * 100)/100
  4. cost = { [goodsId]: qty }
     if (!canAfford(state, cost)) → {ok:false, error: 'nedostatek zboží'}  // goods handler get
  5. pay(state, { [goodsId]: qty }, 'market:sell')       // odebrat zboží z inventáře
     grant(state, { gold: totalGain }, 'market:sell')    // přidat zlato
  6. marketState[goodsId].available = clamp(available + qty, 0, max)   // N-02 clamp
  7. return {ok:true}
```

- **clamp N-02**: `Math.min(Math.max(x,0),max)`. Velký nákup → available klesne na 0 (cena se zastaví na horní mezi `(1.5−0)³=3.375`), velký výprodej → available stoupne na max (cena na dolní mezi `(1.5−1)³=0.125`). Tím cena nikdy nepřeteče, formula nikdy nevyrobí zápornou cenu.
- **Pořadí cena→clamp**: cena se počítá z `available` PŘED transakcí (na začátku handleru). To je věrné originálu (cena za celý balík je za aktuální stav, ne marginální). Po platbě se available posune. Tím nákup velkého balíku za nízkou cenu a okamžitý prodej je stále ztrátový kvůli spreadu (viz §2.4).

**Registrace** (`registerBuyGoods(creg)`, `registerSellGoods(creg)` – vzor `registerSetTaxRate`):
```
// V buyGoods.js:  export function registerBuyGoods(creg){ registerCommand(creg,'buyGoods',buyGoods); }
// V sellGoods.js: export function registerSellGoods(creg){ registerCommand(creg,'sellGoods',sellGoods); }
```

### 2.4 Arbitrážní sanity (KRITICKÁ – buy→sell NENÍ ziskový)

Protože `haggleBuy=1.35 > haggleSell=0.6`, okamžitý nákup→prodej je VŽDY ztrátový **i bez cenového dopadu**:

- Koupím N kusů wood za `buyingPrice = priceOf×1.35`. Hned prodám N kusů za `sellingPrice' = priceOf'×0.6`.
- I kdyby se available NEHnul (cenový dopad ignorujeme): `sellingPrice/buyingPrice = 0.6/1.35 = 0.444`. Hráč dostane zpět 44.4 % toho, co zaplatil → **ztráta 55.6 %**.
- Cenový dopad to JEN zhoršuje: nákup zvedne cenu (available klesá → cena roste), prodej ji srazí (available roste → cena klesá). Po nákupu je available nižší, po prodeji vyšší než start → sell běží při nižší ceně.
- **Test (arbitráž)**: `buyGoods(state,{goodsId:'wood',qty:100})` pak `sellGoods(state,{goodsId:'wood',qty:100})`; assert `state.player.gold < goldBefore`. (Spread garantuje ztrátu.)

### 2.5 Jak ověří test (T1)
- `priceOf`/`buyingPrice`/`sellingPrice` reálná čísla z tabulky §2.2 (tabulkový test).
- buyGoods: gold klesne o totalCost, inventory[goodsId] +qty, marketState.available −qty (clamp).
- sellGoods: opačně, available +qty (clamp na max).
- buyGoods při nedostatku zlata → `{ok:false}` a stav NEZMĚNĚN (atomicita `pay`).
- clamp: nákup qty > available → available=0 (ne záporné); prodej qty velký → available=max (ne nad max).
- arbitráž §2.4.

---

## 3. T2 – Denní mean-reversion drift (`marketDailyDrift`)

`core/systems/market.js`:
```
/**
 * Daily mean-reversion drift toward baseline (simulates surrounding world).
 * available += k × (baseline − available), then clamp [0, max].
 * Day edge. Deterministic, no RNG, catch-up-safe (S-05).
 * @param {GameState} state @param {object} _params @param {TickContext} _ctx
 */
export function marketDailyDrift(state, _params, _ctx) {
  const k = BALANCE.market.driftK;   // 0.2
  for (const id in state.world.marketState) {
    const m = state.world.marketState[id];
    const next = m.available + k * (m.baseline - m.available);
    m.available = Math.min(Math.max(next, 0), m.max);
  }
}
```

### 3.1 Balance konstanta
Do `BALANCE.market` (balance.js, řádky 69-79) přidat:
```
/** Daily mean-reversion drift rate toward baseline. provenance: approximated, gap G-MARKET-DRIFT (M9). */
driftK: 0.2,
```

### 3.2 Registrace v periodics (KRITICKÉ)
V `core/engine/tickOrder.js` → `registerCorePeriodics`:
1. Přidat `register(registry, 'market.drift', marketDailyDrift);` k ostatním `register(...)` (kolem řádku 156, vedle `world.tick`).
2. Přidat do `periodics` pole (kolem řádku 184, do `day` skupiny – PO `world.tick` order 30, doporučeně **order 35**):
   ```
   { id: 'market.drift', every: 'day', order: 35, systemFn: 'market.drift' },
   ```
3. Import `marketDailyDrift` z `../systems/market.js` (vrch souboru, vedle `worldTick`).
4. Aktualizovat `TICK_ORDER` komentář (living artefakt §4.3): den nově obsahuje `market.drift`.

### 3.3 Reálná čísla driftu (wood, baseline=5000, k=0.2)
Hráč vykoupí na available=1000. Drift k baseline 5000:
| den | available (před) | += 0.2×(5000−avail) | available (po) |
|---|---|---|---|
| 1 | 1000 | +800 | 1800 |
| 2 | 1800 | +640 | 2440 |
| 3 | 2440 | +512 | 2952 |
| … | … | … | → asymptoticky k 5000 |

Po ~14 dnech je available ≈ 4760 (95 % cesty). Cíl §9.1: „cena se po velkém výprodeji vrátí k baseline do N herních dní" – splněno. `k` nevyhladí hráčův dopad během jednoho dne (1 den = jen 20 %).

### 3.4 Catch-up-safe (S-05)
`marketDailyDrift` je čistá funkce stavu, žádný `Date.now()`/`Math.random()`, O(goods) za den. Běží v dávkové smyčce stejně jako live → catch-up bezpečné. Drift se aplikuje jednou za herní den i během offline catch-upu (každá day-hrana).

### 3.5 Jak ověří test (T2)
- Po 1 dni: available posun přesně o 20 % rozdílu k baseline (deterministicky).
- available > baseline → drift klesá k baseline (oba směry).
- clamp: drift nikdy nepřekročí [0,max].
- 50 dní catch-up → stejný výsledek jako 50× `marketDailyDrift` ručně (determinismus).

---

## 4. T3 – getGoldValue jediné oceňovací API + market.inject kontrakt

### 4.1 getGoldValue (wrapper nad HOTOVOU formulas.goldValue)

`core/systems/market.js`:
```
/**
 * Single valuation API (§8.2). Values a basket of goods at current market price.
 * Gold counted 1:1. Wraps pure formulas.goldValue with a priceOf bound to marketState.
 * @param {GameState} state
 * @param {Record<string, number>} basket  // {goodsId: qty}, may include 'gold'
 * @returns {number}
 */
export function getGoldValue(state, basket) {
  return goldValue(basket, (id) => id === 'gold' ? 1 : priceOf(state, id));
}
```
- `formulas.goldValue(basket, priceOf)` je HOTOVÁ (řádky 121-127). Tady jen dodáme `priceOf` vázané na marketState. `gold` 1:1 (originál `market.js:131`).
- **Jediné oceňovací API**: jakýkoli systém, který oceňuje koš zboží (AI tribute M7, opravy, ratingy), volá `getGoldValue(state, basket)`. Žádné druhé místo s cenovou logikou.
- **Napojení existujících oceňovacích míst**: brief zmiňuje `mineralMuseum apod.`. Hledání (`grep -rn "getGoldValue\|mineralMuseum"` v src/core) → v M4b žádný systém zatím koš neoceňuje (museum je M5+/M6). Proto **žádné existující volání k přepojení** – API je připravené pro M7. (Pokud coder najde jakékoli ad-hoc oceňování zboží, přepojí ho na `getGoldValue`. Pravděpodobnost: žádné.)

### 4.2 market.inject kontrakt

`core/systems/market.js`:
```
/**
 * Inject/withdraw supply into the client market (§9.1). From M7 AI zones feed this;
 * until M7 only marketDailyDrift moves available. Clamps [0, max].
 * @param {GameState} state @param {string} goodsId @param {number} qty  // +inject, −withdraw
 */
export function marketInject(state, goodsId, qty) {
  const m = state.world.marketState[goodsId];
  if (!m) return;  // unknown good – no-op (M7 zones reference only existing goods)
  m.available = Math.min(Math.max(m.available + qty, 0), m.max);
}
```
- Kontrakt EXISTUJE od M4b (smí být volán). Do M7 ho krmí jen drift (resp. nikdo) – `marketInject` je veřejné API pro M7 zóny.

### 4.3 S-06 negativní test se OBRACÍ na pozitivní (KRITICKÉ)

`test/contracts.test.js` blok „S-06 contract" (řádky 234-285) tvrdí: `world.js` NESMÍ referencovat `goldValue`/`market.inject` (protože trh ještě neexistoval). **Od M4b trh existuje** → kontrakt se obrací:

- **ZRUŠIT/PŘEPSAT negativní asserce** (řádky 235-255): testy „world.js source does not reference goldValue/market.inject" se odstraní nebo nahradí.
- **PŘIDAT pozitivní kontraktní test** (nový blok): ověří, že `getGoldValue` a `marketInject` JSOU exportované z `core/systems/market.js`, mají správnou signaturu a fungují:
  - `getGoldValue(state, {wood: 10})` vrátí `10 × priceOf(state,'wood')` (číslo, ne 0).
  - `getGoldValue(state, {gold: 100})` vrátí `100` (1:1).
  - `marketInject(state, 'wood', 1000)` posune `marketState.wood.available` o +1000 (clamp).
  - **Pořadí závislostí zůstává hlídané**: world systém (M7) smí volat `getGoldValue`/`marketInject` AŽ teď. world.js je stále no-op stub (M7), takže `worldTick` se nemění – ale architektura nyní povoluje budoucí volání. Pozitivní test dokumentuje, že kontrakt je živý.
- `worldTick` zůstává no-op stub (M7 mimo scope). Behaviorální spy test (řádky 257-285) na „worldTick neemituje tx" může zůstat (stub stále nic nedělá).

### 4.4 Jak ověří test (T3)
- `getGoldValue` reálná čísla (košík wood×10 → 10×priceOf).
- gold v koši 1:1.
- `marketInject` clamp [0,max].
- Pozitivní S-06: API exportované a funkční (nahrazuje negativní asserci).

---

## 5. T4 – Karavany (sendCaravan command + caravanReturns schedule)

Originál (`market.js:354-427` sendCaravan, `:106-113` caravanReturns přes `Engine.insert(200,'caravanReturns')`): hráč nastaví buy/sell listy, zaplatí čistý rozdíl, karavana odjede na `maxSteps = STEPSPERDAY × (30 − speed)`, po návratu doručí `recGoods`.

### 5.1 Caravan stav

`createInitialState.js` → `createWorldState()` přidá:
```
caravan: {
  capacity: BALANCE.caravan.baseCapacity,  // 10000 (už v balance.js řádek 99)
  speed: 0,                                 // base speed; road techs (+1/+2) = M5+ gap G-CARAVAN-ROADS
  sentOut: 0,                               // remaining steps until return (0 = idle)
  recGoods: {}                              // goods (+gold) to deliver on return
}
```

### 5.2 sendCaravan command

**Nový soubor** `core/commands/sendCaravan.js`. `params: { buy: {goodsId:qty}, sell: {goodsId:qty} }`.
```
sendCaravan(state, params):
  1. validace: buy/sell jsou objekty {goodsId: kladný int}; goodsId musí existovat v marketState
  2. caravan idle? (sentOut === 0) → jinak {ok:false, error:'karavana je na cestě'}
  3. usedBuyCapacity = Σ buy[id];  usedSellCapacity = Σ sell[id]
     if (usedBuyCapacity > capacity || usedSellCapacity > capacity) → {ok:false,error:'překročena kapacita'}
  4. buyTotal  = Σ buyingPrice(id)  × buy[id]    // co zaplatím za nákup
     sellTotal = Σ sellingPrice(id) × sell[id]   // co dostanu za prodej (doručí se v gold při návratu)
     expenditures = buyTotal − sellTotal          // čistý výdaj (může být záporný = čistý příjem)
  5. cost: hráč musí mít zboží na prodej + zlato na čistý výdaj:
       canAfford(state, sell-as-goods)  // má dost prodávaného zboží?
       if (expenditures > 0) canAfford(state, {gold: expenditures})
       jinak {ok:false, error}
  6. pay(state, sell, 'caravan:send')             // odebrat prodávané zboží HNED
     recGoods = { ...buy }                         // nakoupené zboží přijde při návratu
     if (expenditures > 0) pay(state, {gold: expenditures}, 'caravan:send')
     else recGoods.gold = -expenditures            // čistý příjem přijde jako gold při návratu
  7. caravan.recGoods = recGoods
     speed = caravan.speed   // road tech bonusy = M5 gap
     caravan.sentOut = BALANCE.engine.stepsPerDay × (30 − speed)   // 900×30 = 27000 kroků = 30 dní
     // schedule the return:
     scheduleInsert(state, state.engine.curStep + caravan.sentOut, 'caravanReturns', {})
  8. return {ok:true}
```

- **Věrnost originálu**: maxSteps = `STEPSPERDAY × (30 − speed)` (`market.js:413`). Při speed=0 → 27000 kroků = 30 herních dní. Zboží na prodej se odebere HNED, nakoupené (`recGoods`) se doručí při návratu (jako v originálu, řádky 383-392).
- **Pozn. originál bug**: originál v `market.js:413` má `caravan.speed` (ne `speed` s road bonusem) – my replikujeme `30 − caravan.speed`. Road tech bonus (`speed += 1/2`) je M5 (gap G-CARAVAN-ROADS), v M4b speed=0.
- **Platby BEZ ctx** (DR-011-A, jako buyGoods) – command vrstva nemá ctx.
- **scheduleInsert** je z `core/engine/index.js` (export `scheduleInsert`). Použít `state.engine.curStep + sentOut` jako absolutní krok. (Originál `Engine.insert(200,'caravanReturns')` plánuje relativně; náš scheduler je absolutní – §4.2 architektura.)

### 5.3 caravanReturns handler

**Nový soubor** `core/systems/caravan.js` (nebo přidat do market.js – doporučeno samostatný `caravan.js` pro čistotu). Registruje se v `registry` jako fns handler (volá ho scheduler).
```
/**
 * Caravan return: deliver recGoods (bought goods + net-income gold) to player. Schedule handler.
 * @param {GameState} state @param {object} _params @param {TickContext} ctx
 */
export function caravanReturns(state, _params, ctx) {
  const caravan = state.world.caravan;
  const goods = caravan.recGoods || {};
  if (Object.keys(goods).length > 0) {
    grant(state, goods, 'caravan:return', ctx, state.engine.curStep);  // gold + goods do inventáře
  }
  caravan.recGoods = {};
  caravan.sentOut = 0;
}
```
- **TADY ctx JE k dispozici** (schedule handlery dostávají `(state, params, ctx)` – viz `runTick` řádek 117: `handler(state, entry.params, ctx)`). Proto `grant(..., ctx, step)` emituje txEvent → návrat karavany SE zaznamená do účetnictví (konzistentní: karavana je „firemní" operace). To je v pořádku a žádoucí.
- `grant` s mixem `{gold: X, wood: Y}` funguje: `handlerFor('gold')` → gold handler, `handlerFor('wood')` → goods handler (kind goods). HOTOVÉ.

### 5.4 Registrace (KRITICKÉ – obojí)
1. **Command** v `bootstrapEngine` (main.js): `registerSendCaravan(creg);` (viz §7).
2. **Schedule handler** v `registerCorePeriodics` (tickOrder.js): `register(registry, 'caravanReturns', caravanReturns);` (vedle ostatních `register(...)`). Import `caravanReturns` z `../systems/caravan.js`. Bez této registrace `scheduleInsert(...,'caravanReturns')` při návratu vyhodí `registry: unknown id: caravanReturns` (resolve fail-fast).

### 5.5 Catch-up-safe
sendCaravan je command (hráčská akce, ne tick). caravanReturns je schedule one-shot – při catch-upu se odbaví v `scheduleDue` při dosažení cílového kroku, deterministicky. Karavana poslaná před odchodem se vrátí během offline catch-upu. ✔

### 5.6 Jak ověří test (T4)
- sendCaravan idle → caravan.sentOut = 27000, recGoods naplněno, prodané zboží odebráno z inventáře, gold odečten o expenditures.
- sendCaravan když sentOut>0 → `{ok:false}`.
- kapacita překročena → `{ok:false}`.
- schedule: po `scheduleInsert` je v `state.engine.schedule` položka na kroku curStep+27000.
- caravanReturns: po doběhnutí kroku grant recGoods do inventáře+gold, sentOut→0. (Test: scheduleInsert + advance N kroků přes registrovaný handler → inventář naroste.)
- catch-up: poslat karavanu, advance 30 dní v dávce → vrátí se.

---

## 6. CF – crime.js fix (carry-over M4a, DA5 grep-gate)

Současný `crime.js:42-44` mutuje gold přímo:
```
state.player.gold = Math.max(0, state.player.gold - goldLoss);   // PORUŠUJE K5/§7 + DA5 grep-gate
```
**Oprava**: odečet přes resource vrstvu s emitTx:
```
import { pay } from '../resources/transactions.js';
…
const goldLoss = Math.min(Math.floor(incidents * 0.5), state.player.gold);
if (goldLoss > 0) {
  pay(state, { gold: goldLoss }, 'crime:loss', _ctx, state.engine.curStep);  // _ctx → ctx (rename param)
}
```
- `pay` je atomické, `canAfford` garantuje, že `goldLoss ≤ gold` (už zajištěno `Math.min`), takže `pay` nevyhodí.
- `_ctx` → přejmenovat na `ctx` (signatura `crimeDaily(state, _params, ctx)`), aby šel emitTx. `crimeDaily` je v periodics (noon order 40) → dostává ctx z `runTick` (`resolve(...)(state, {}, ctx)`).
- **Grep-gate DA5**: po opravě `grep -rn "player.gold\s*=" src/core/systems/` musí být ČISTÝ (žádná přímá mutace gold mimo `handlers.js`). crime.js byl poslední porušitel z M4a.
- **emitTx**: crime loss se nově zaznamená do účetnictví jako `crime:loss` (výdaj). Konzistentní s tax/upkeep. ✔

### 6.1 Jak ověří test (CF)
- crime loss odečte gold přesně jako dřív (regrese: stejné číslo).
- txEvent `crime:loss` emitován (council.current.byCause['crime:loss'] záporné).
- grep-gate: `src/core/systems/*` neobsahuje `player.gold =` mimo handlers.

---

## 7. WIRING – command registrace v bootstrapEngine (KRITICKÉ, jinak RE-RUN)

V `src/app/main.js` → `bootstrapEngine()` (řádky 81-92). **Poučení M2b/M3/M4a**: bez registrace = mrtvé UI tlačítko, RE-RUN. Přidat 3 importy + 3 registrace + goods katalog + marketInit:

```
// nové importy (vrch main.js):
import { registerBuyGoods } from '../core/commands/buyGoods.js';
import { registerSellGoods } from '../core/commands/sellGoods.js';
import { registerSendCaravan } from '../core/commands/sendCaravan.js';
import { marketInit } from '../core/systems/market.js';

// v bootstrapEngine(), po registerSetTaxRate(creg):
registerBuyGoods(creg);
registerSellGoods(creg);
registerSendCaravan(creg);

// v buildCtxCatalog seznamu: přidat 'goods'
for (const name of ['jobs', 'skills', 'houseTypes', 'food', 'goods']) { … }
```

A v `bootSequence` (po `ctx.emitTx` wiring, kolem řádku 165):
```
// Initialize market supply from goods catalog (idempotent – skips ids already in marketState from load)
marketInit(state, /** @type {any} */ (ctx.catalog.goods) || []);
```

**Ověření wiringu (test)**: `bootstrapEngine()` vrátí `creg`, na kterém `creg.handlers.has('buyGoods') === true`, `.has('sellGoods')`, `.has('sendCaravan')`. (Vzor: existující test ověřuje setTaxRate/assignJob registrované.)

---

## 8. T5 – Market UI napojený v App.js (KRITICKÉ, jinak RE-RUN)

### 8.1 selectMarket (ui/selectors.js)
```
/**
 * Market rows for display: id, available, max, buyingPrice, sellingPrice, owned.
 * @param {GameState} s
 * @returns {{ rows: Array<{id,available,max,buy,sell,owned}>, caravan: {sentOut,capacity,onRoad} }}
 */
export function selectMarket(s) { … }
```
- `rows` z `state.world.marketState` (id, available, max) + `buyingPrice/sellingPrice` (z market.js helperů – selektor je import z core, smí volat čisté price fns) + `owned = state.player.inventory[id] || 0`.
- `caravan`: `{ sentOut, capacity, onRoad: sentOut > 0 }`.
- **Pozn.**: selektor smí importovat `priceOf`/`buyingPrice`/`sellingPrice` z `core/systems/market.js` (čisté funkce, žádný DOM). Stejně jako selektory už importují z core.

### 8.2 MarketScreen (ui/screens.js)
Nová exportovaná komponenta (vzor `JobsScreen`/`CouncilScreen`):
```
export function MarketScreen({ snapshot, send }) {
  const market = selectMarket(snapshot);
  // tabulka zboží: název | dostupné/max | nákupní cena | prodejní cena | vlastněno | akce [Koupit 10] [Prodat 10]
  // tlačítko Koupit → send('buyGoods', { goodsId: id, qty: 10 })
  // tlačítko Prodat → send('sellGoods', { goodsId: id, qty: 10 }) (disabled když owned<10)
  // sekce Karavana: kapacita, stav (na cestě / připravena), tlačítko Poslat karavanu
  //   → send('sendCaravan', { buy: {...}, sell: {...} })  (MVP: jednoduchý preset, viz pozn.)
}
```
- **Nákup/prodej**: pevné množství qty=10 na tlačítko (MVP – jednoduché, deterministické). Volitelně input pro qty (UI-only stav přes `useState`).
- **Karavana MVP**: jednoduché – tlačítko „Poslat karavanu" s presetem (např. koupit 100 wood). Plný buy/sell editor je nice-to-have, MVP stačí 1 funkční odeslání + zobrazení stavu „na cestě (N dní)". Stav `caravan.onRoad` → tlačítko disabled + text „Karavana na cestě".
- Výsledek `send(...)` vrací `{ok,error}`; při `!ok` se UI tiše překreslí ze stavu (vzor JobsScreen `assign`).

### 8.3 App.js – tab Trh (KRITICKÉ napojení)
V `src/ui/App.js`:
1. Import: `import { ForestScreen, JobsScreen, SkillsScreen, CouncilScreen, MarketScreen } from './screens.js';`
2. Přidat tab do `TABS` (řádky 17-23): `{ id: 'market', label: 'Trh' },`
3. Přidat render větev (vedle ostatních, řádky 105-108):
   ```
   ${activeTab === 'market' ? html`<${MarketScreen} snapshot=${snapshot} send=${send} />` : null}
   ```
- `send` je už předané do App (z `bootSequence` → `dispatch(creg,...)`). Tlačítka volají `send('buyGoods'/'sellGoods'/'sendCaravan', params)` → dispatch → registrovaný handler. Smyčka uzavřená.

### 8.4 Jak ověří test (T5)
- `selectMarket(state)` vrátí řádky s buy/sell cenami a owned (čistý selektor, Node test).
- (UI komponenty: smoke přes existující render harness – MarketScreen se vyrenderuje bez chyby, tlačítka mají onClick volající send se správnými params. Pokud projekt nemá UI test harness, ověří se manuálně + selektorovým testem.)

---

## 9. Persist + migrace (v2 → v3)

### 9.1 persistSchema.js
`PERSIST_SCHEMA.world` (řádek 21) rozšířit: `['zones', 'factions', 'forest', 'field', 'mine', 'marketState', 'caravan']`. Protože `applyPersist` pro world iteruje přes `PERSIST_SCHEMA.world` a kopíruje `s.world[field]` (řádky 173-180), `marketState` a `caravan` se uloží automaticky. **Žádný další kód** – jen přidat 2 klíče do allowlistu. Doplnit komentář (řádky 22-25): `world.marketState: per goodsId {available, max, baseline}`, `world.caravan: {capacity, speed, sentOut, recGoods}`.

### 9.2 migrations.js + schema.js
- `src/save/schema.js`: `SAVE_VERSION = 3` (z 2).
- `src/save/migrations.js`: přidat krok `{ from: 2, to: 3, migrate }`:
  ```
  migrate(payload):
    p.world = { ...p.world }
    if (!p.world.marketState) p.world.marketState = {}   // marketInit naplní z katalogu při bootu
    if (!p.world.caravan) p.world.caravan = { capacity: 10000, speed: 0, sentOut: 0, recGoods: {} }
    p.meta = { ...p.meta, saveVersion: 3 }
  ```
- **Pozn.**: `marketState: {}` po migraci je OK – `marketInit` v bootSequence je idempotentní a naplní prázdnou mapu z katalogu. Starý save tak po loadu dostane čerstvý trh (available=baseline). To je akceptovatelné (trh nebyl v M4a, takže není co ztratit).
- `validateInvariants` v load.js: volitelně přidat kontrolu, že `marketState[id].available ∈ [0, max]` (nepovinné pro MVP, ale levné).

### 9.3 Jak ověří test (P)
- v2 save → migrate → má `world.marketState={}` a `world.caravan` default, saveVersion=3.
- round-trip: applyPersist(state s marketState+caravan) → loadAndReconstruct → marketState/caravan zachované.

---

## 10. ASCII diagram dat. toku (M4b)

```
        UI (MarketScreen)
          │  send('buyGoods'|'sellGoods'|'sendCaravan', params)
          ▼
   dispatch(creg) ──► buyGoods/sellGoods/sendCaravan (commands, BEZ ctx)
          │                 │
          │                 ├─ buyingPrice/sellingPrice ◄── priceOf ◄── formulas.marketPrice
          │                 │                                            (basePrice, available, max)
          │                 ├─ pay/grant (gold, goods) ──► state.player.{gold,inventory}
          │                 └─ clamp marketState.available ∈ [0,max]   (N-02)
          ▼
   state.world.marketState[id] = {available, max, baseline}
          ▲                          ▲
          │ marketDailyDrift          │ marketInject(state,id,qty)  [M7 zóny; do M7 jen drift]
          │ (day, k=0.2)              │
   ── periodics (tickOrder) ──    getGoldValue(state, basket) ──► formulas.goldValue (Σ qty×priceOf)
                                       [jediné oceňovací API; S-06 obrácen na pozitivní]

   sendCaravan ──► scheduleInsert(curStep+27000, 'caravanReturns')
                          │ (schedule one-shot, catch-up-safe)
                          ▼
                   caravanReturns(state,_,ctx) ──► grant(recGoods, ctx) ──► inventory + gold
```

---

## 11. MVP e2e scénář (pro T-REV MVP gate)

Idle smyčka je po M4b uzavřená. **E2e scénář** (testovatelný headless v Node + ověřitelný v UI):

1. **Fresh start**: `bootSequence` → katalogy (vč. goods) → `bootstrapEngine` (registruje buy/sell/sendCaravan) → `marketInit` naplní `marketState` (5 komodit, available=baseline). Hráč má gold=500 (start), prázdný inventář.
2. **Produkce** (M3, už funguje): joby produkují suroviny do `home.store`/inventáře; populace jí, daně (M4a) generují gold. Engine běží (rAF smyčka, accumulator).
3. **Trh – nákup**: hráč na tabu „Trh" koupí 100 wood → `send('buyGoods',{goodsId:'wood',qty:100})` → gold klesne o `buyingPrice×100`, inventory.wood=100, marketState.wood.available klesne o 100 → cena wood STOUPNE (méně dostupné).
4. **Trh – prodej**: hráč prodá 50 wood → gold stoupne o `sellingPrice×50` (méně než zaplatil díky spreadu), available stoupne o 50. **Arbitráž nefunguje** (§2.4).
5. **Drift**: po několika herních dnech (day-hrany) `marketDailyDrift` vrací available k baseline → cena se normalizuje.
6. **Karavana**: hráč pošle karavanu (`sendCaravan`) → zaplatí, zboží na cestě 30 dní → `caravanReturns` doručí nakoupené zboží + případný čistý příjem do inventáře/gold.
7. **Oceňování**: `getGoldValue(state, state.player.inventory)` kdykoli vrátí aktuální hodnotu hráčova zboží v gold (jediné API).
8. **Save/restore**: autosave uloží marketState+caravan; po reloadu (loadGame v2→v3 migrace nebo v3 round-trip) se trh obnoví (marketInit doplní z katalogu, available zachované u v3), karavana na cestě pokračuje.
9. **Offline catch-up**: po `missedMs` se v dávce odbaví drift (každý den) + caravanReturns (pokud dosáhne kroku) → offline summary.

**MVP gate kritéria (T-REV ověří)**: (a) hráč dokáže koupit i prodat zboží s živou cenou; (b) buy→sell není zisk; (c) karavana odjede a vrátí se; (d) getGoldValue ocení koš; (e) vše přežije save/load i offline catch-up; (f) žádná přímá mutace gold/goods mimo resource vrstvu (grep-gate čistý).

---

## 12. Rizika a mitigace

| ID | Riziko | Mitigace |
|---|---|---|
| R-M1 | **Mrtvé UI** – buyGoods/sellGoods/sendCaravan neregistrované v bootstrapEngine (opakovaná chyba M2b/M3/M4a) | §7 explicitní registrace + test `creg.handlers.has(...)`; MarketScreen napojený §8.3 |
| R-M2 | goods katalog prázdný (G-LISTGOODS) → trh bez položek | §1 seed katalog (approximated) + registrace v loaderu/catalogs.js; marketInit |
| R-M3 | `kind: goods` chybí → pay/grant směruje wood do špatného handleru (resource místo goods) | §1.1: každá položka má `kind:'goods'`; test `resourceKindOf('wood')==='goods'` |
| R-M4 | command nemá ctx → emitTx z buy/sell se ztratí | DR-011-A: vědomé rozhodnutí (tržní směny nejsou council položka); caravanReturns ctx MÁ (schedule) |
| R-M5 | caravanReturns neregistrované v registry → resolve fail-fast crash při návratu | §5.4 registrace v registerCorePeriodics; test schedule→advance→návrat |
| R-M6 | S-06 negativní test selže (nyní legitimně reference market) | §4.3 přepis negativní asserce na pozitivní kontrakt |
| R-C | Balanc trhu (basePrice/max/driftK) je approximated, ne ze serveru | §9.1 architektura: referencí jsou hratelnostní cíle, kalibrace M9; gap G-LISTGOODS/G-MARKET-DRIFT |
| R-M7 | available drift přeteče mez | clamp [0,max] v drift i inject i buy/sell (N-02) |

---

## 13. Alternativy (zamítnuté)

- **Alt A – marketState v `state.player` místo `state.world`.** Zamítnuto: trh je „okolní svět", logicky patří do world domény (§3.2 architektura `world: {…, marketState}`); world už je v persist allowlistu; M7 AI zóny (world) krmí trh přes inject – držet vedle sebe. Player drží jen hráčův inventář.
- **Alt B – buy/sell přes ctx-injektované commandy (emitTx pro tržní směny).** Zamítnuto pro MVP: command vrstva (`CommandHandlerFn`) ctx nemá; injektovat ji znamená měnit dispatch signaturu (širší dopad, mimo scope). Tržní směny navíc nejsou „firemní" účetní položka jako daně. Pokud bude potřeba (M9 reporting), refaktor command vrstvy je oddělený krok. (caravanReturns ctx MÁ – schedule handler – takže důležitý gold flow karavan se účtuje.)
- **Alt C – drift jako spojitý per-step místo denního.** Zamítnuto: originál market perioda běží po dnech (resp. bug V3 denně); per-step drift by byl dražší v catch-upu a hůře laditelný. Denní mean-reversion je věrná reference (§9.1) a levná (O(goods)/den).
- **Alt D – getGoldValue jako metoda na marketState objektu.** Zamítnuto: porušuje K0/K4 (stav = čistá data, logika = čisté funkce). `getGoldValue(state, basket)` je čistá funkce nad formulas.goldValue – testovatelná, serializovatelná, žádné metody ve stavu.
- **Alt E – ponechat S-06 jako negativní test (world.js nesmí volat market).** Zamítnuto: od M4b trh existuje, world (M7) NA něm staví – kontrakt se z definice obrací na pozitivní (§8.2 architektura: „pořadí trh M4 → AI svět M7"). Negativní test už chrání neexistující invariant.

---

## 14. Definition of Done (checklist pro Sonnet)

- [ ] `src/data/goods.json` seed katalog (5 komodit, kind:goods, basePrice/max/baselineFraction); registrace v loader ID_CATALOGS + catalogs.js CATALOG_NAMES + validátor.
- [ ] `core/systems/market.js`: `marketInit`, `priceOf`, `buyingPrice`, `sellingPrice`, `getGoldValue`, `marketInject`, `marketDailyDrift` (čisté/tick fns; HOTOVÉ formulas.marketPrice/goldValue jen obalit).
- [ ] `BALANCE.market.driftK = 0.2` (approximated, gap G-MARKET-DRIFT).
- [ ] `core/commands/buyGoods.js` + `sellGoods.js` + `sendCaravan.js` (validace, clamp N-02, pay/grant, registerXxx).
- [ ] `core/systems/caravan.js`: `caravanReturns` (grant recGoods s ctx).
- [ ] `createInitialState.js` createWorldState: `marketState: {}`, `caravan: {capacity,speed,sentOut,recGoods}`.
- [ ] `tickOrder.js`: register `market.drift` + `caravanReturns`; periodics `market.drift` (day,order 35); TICK_ORDER komentář.
- [ ] **main.js bootstrapEngine: registerBuyGoods/SellGoods/SendCaravan; buildCtxCatalog +goods; marketInit v bootSequence.**
- [ ] **App.js: import MarketScreen, tab 'market'/'Trh', render větev s send.**
- [ ] `selectors.js selectMarket` + `screens.js MarketScreen`.
- [ ] `crime.js`: pay(...,'crime:loss',ctx,step) místo přímé mutace; param _ctx→ctx; grep-gate DA5 čistý.
- [ ] `persistSchema.js world` +marketState +caravan; `migrations.js` v2→v3; `schema.js` SAVE_VERSION=3.
- [ ] `contracts.test.js`: S-06 negativní → pozitivní (getGoldValue/marketInject exportované+funkční).
- [ ] Testy: ceny (tabulka), buy/sell+clamp, arbitráž (ztráta), drift (20%/den + catch-up), getGoldValue, karavana send+return+schedule, crime pay, registrace commandů, migrace v2→v3, MVP e2e smoke.

---

### Gaps zavedené/potvrzené v M4b
- **G-LISTGOODS**: listGoods není v extrahovaných zdrojích → seed goods katalog (approximated), kalibrace M9.
- **G-MARKET-DRIFT**: `driftK=0.2` approximated → M9.
- **G-HAGGLE-MODS**: bookKeeping/tradingHouse haggle ±0.1 modifikátory = M5+ (budovy).
- **G-CARAVAN-ROADS**: road tech speed bonus (+1/+2) = M5+ (techy); v M4b speed=0 (30 dní).
