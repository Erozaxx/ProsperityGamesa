# Architektura: Playability & onboarding hardening (iter-012, T-001)

- **Autor**: architect
- **Iterace**: iter-012
- **Brief**: BRIEF-012-001
- **Datum**: 2026-06-13
- **Status**: Final (návrh – NE implementace)
- **Pro codera**: T-005..T-009 (mapování viz §8 Pořadí implementace)

> Tento dokument je realizovatelný coderem bez dalšího architektonického rozhodování.
> Každá oblast má: root cause (s odkazem na řádky), doporučenou variantu, alternativu, dotčené
> soubory/funkce a rizika. Globální dopady (determinismus/save-hash, accounting invariant)
> jsou v §6 a §7.

---

## 0. Shrnutí pěti oblastí

| # | Oblast | Typ | Root cause | Doporučená oprava |
|---|--------|-----|-----------|-------------------|
| A1 | Start seed z `BALANCE.start` | Bug | Factory čtou neexistující klíče `startPopulation`/`startTents`; gold natvrdo 0 | Seedovat v `createInitialState` z `BALANCE.start`; opravit factory klíče |
| A2 | Resolver `gold`/`techPt` | BLOCKER | `gold`/`techPt` nejsou v `byId` → `resourceKindOf` vrací `'resource'` (čte `home.store`) | Early-return ve `resourceKindOf` pro speciální měny |
| A3 | Crime pay clamp | Robustnost | `crimeDaily` volá `pay({gold})`, throw při nedostatku | Clamp už existuje; dodat floor + `allowDeficit` pojistku |
| A4 | Sanity-cap populace | Bug/balanc | `healthBirths` aplikuje **roční** `matRate` (0.04) **denně** → exploze; tent `capacity=null` → žádný cap | Denní sazba + globální sanity cap z housing (tent fallback cap) |
| A5 | Market UI overflow | UX | `styles.css` nemá žádné pravidlo pro `.market-table` → přirozená šířka přetéká | Scroll wrapper + responsivní CSS |

Klíčové zjištění: A1 a A2 jsou **provázané** – i po opravě A1 (gold=500 v `player.gold`) by hra
spadla na A2, protože `pay({gold})` čte přes špatný handler. A2 musí jít **první nebo současně** s A1.

---

## 1. A1 — Start seed z `BALANCE.start`

### Root cause
- `src/core/state/createInitialState.js:98-99` volá `createPlayerState()` a `createHomeState()` **bez katalogu**.
- `src/core/state/createHomeState.js:21-22` čte `start['startTents']` a `start['startPopulation']` –
  tyto klíče v `BALANCE.start` **neexistují**. Skutečný tvar (`src/core/balance/balance.js:145-151`):
  ```js
  start: { population: 50, gold: 500,
           food: { bread: 20, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 },
           housing: { tent: 5 } }
  ```
  → `tentCount` spadne na default 5, `startPop` na default 0.
- `createPlayerState()` (`createHomeState.js:46-48`) vrací `gold: 0` natvrdo → start s 0 zlata.
- Food store je vždy nulový (`createHomeState.js:27`), ignoruje `BALANCE.start.food`.

### Doporučená varianta — seed v `createInitialState` z `BALANCE.start` (single source of truth)
Faktory zůstanou „neutral defaults" (jak slibuje JSDoc `createInitialState.js:57`), ale **aplikace
start hodnot se přesune do `createInitialState`**, kde už je `BALANCE` importován (`createInitialState.js:8`).

Konkrétně:
1. V `createInitialState` po sestavení `player`/`home` přepiš seed hodnoty z `BALANCE.start`:
   - `player.gold = BALANCE.start.gold` (500)
   - `home.population.total = BALANCE.start.population` (50)
   - `home.housing.counts = { ...BALANCE.start.housing }` (`{ tent: 5 }`)
   - `home.food.store = { ...defaultZeroStore, ...BALANCE.start.food }` (bread:20, zbytek 0)
2. Odstranit mrtvý/chybný kód čtení `startTents`/`startPopulation` z `createHomeState.js:13-23`
   (factory vrátí čistý prázdný stav: `population.total: 0`, `housing.counts: {}` nebo `{ tent: 0 }`).
3. Přidat parametr/opt `opts.skipSeed` NENÍ nutný – fresh start vždy seeduje (viz §6 pro testy).

**Pozn. k load.js:** `src/save/load.js:207-212` staví čistý stav přes `createInitialState(...)`,
pak **přepíše** `state.home = createHomeState(catalog)` a `state.player = createPlayerState()`,
a teprve potom `applyPayload` (allowlist) přepíše uložené hodnoty. Po refaktoru:
- `createInitialState` už seeduje start hodnoty (OK pro fresh).
- V `load.js` musí seed hodnoty zůstat, protože `applyPayload` je přepíše uloženými (`gold`,
  `population.total`, `housing.counts` jsou v `PERSIST_SCHEMA`, `persistSchema.js:11-13`).
- **Akce pro codera:** v `load.js` nahradit ruční `createHomeState(catalog)`/`createPlayerState()`
  voláním stejné seed cesty jako fresh (tj. ponechat `home`/`player` z `createInitialState`, nebo
  zavolat sdílenou seed funkci), aby start defaults byly konzistentní před `applyPayload`.
  Allowlist zajistí, že uložená hra přepíše seed – takže staré savy se chovají korektně.

### Alternativa (zamítnuta) — seed uvnitř `createHomeState`/`createPlayerState`
Předat `BALANCE` do factory a číst `start.population`/`start.gold` tam.
**Proč ne:** factory mají v JSDoc kontrakt „no catalog, neutral defaults" a `createPlayerState()`
nemá žádný parametr; rozšiřování signatur na dvou místech zvyšuje povrch chyb. Navíc `load.js`
volá factory s `catalog` (save catalog `{}`), což by stejně neslo `BALANCE.start` – museli bychom
předávat balanci zvlášť. Centralizace v `createInitialState` (kde `BALANCE` už je) je jednodušší
a testovatelnější.

### Dotčené soubory/funkce
- `src/core/state/createInitialState.js` — `createInitialState()` (přidat seed blok)
- `src/core/state/createHomeState.js` — `createHomeState()` (odstranit chybné čtení klíčů),
  `createPlayerState()` (gold zůstává 0 jako neutral default – seed jde z createInitialState)
- `src/save/load.js:207-215` — sjednotit seed cestu před `applyPayload`

### Rizika
- **R-A1-1:** Pokud `load.js` po refaktoru NEseeduje a `applyPayload` nějaké pole vynechá (chybí v
  savu), stav by měl 0 místo 50. Mitigace: ponechat seed přes `createInitialState` i v load cestě.
- **R-A1-2:** Food store musí mít všech 6 klíčů kvůli UI/selectorům. Mitigace: merge přes
  `{ bread:0, cheese:0, fish:0, fruit:0, meat:0, vegetable:0, ...BALANCE.start.food }`.

---

## 2. A2 — Resolver `gold`/`techPt` (BLOCKER)

### Root cause
- `src/core/resources/handlers.js:178-187` `resourceKindOf(key)` volá `byId(key)`; chytí výjimku a
  vrací `'resource'`.
- `gold` a `techPt` NEJSOU v `ID_CATALOGS` (`src/core/catalog/loader.js:23-24` — jen
  `achievements, buildings, food, goods, houseTypes, jobs, military, resources, skills`). Měny nejsou
  katalogové položky. → `byId('gold')` throw → fallback `'resource'`.
- Handler `'resource'` (`handlers.js:124-139`) čte/píše `state.home.store[key]`, který je prázdný
  (`createHomeState.js:38` `store: {}`). Takže:
  - `get('gold')` přes resource handler vrací 0 → `canAfford`/`pay` vidí „have 0" → throw
    „insufficient funds" i když `state.player.gold = 500`.
  - `grant({gold})` (taxes/grant) zapíše do `home.store.gold`, NE do `player.gold` → UI „Zlato 0".

### Doporučená varianta — early-return ve `resourceKindOf`
Přidat na začátek `resourceKindOf` (před `byId` lookup):
```js
export function resourceKindOf(key) {
  if (key === 'gold' || key === 'techPt') return key;  // special currencies → dedicated handlers
  try { /* ...stávající byId lookup... */ }
  catch { return 'resource'; }
}
```
Handlery `gold` a `techPt` v `resourceHandlers` (`handlers.js:60-87`) už existují a čtou/píší
správně `state.player.gold` / `state.player.techPt`. Tím se `handlerFor('gold')` namapuje na
`resourceHandlers['gold']`.

**Toto je minimální, lokální a zpětně kompatibilní oprava** — chování pro všechny ostatní klíče
(food/goods/stock/resource) zůstává beze změny, protože ty mají `kind` v katalogu nebo legitimně
spadají do `'resource'`.

### Alternativa (zamítnuta) — přidat `gold`/`techPt` do `resources.json` katalogu s `kind`
Definovat měny jako katalogové položky s `kind: 'gold'`/`'techPt'`.
**Proč ne:** měny nejsou herní „resource" (nemají cenu, nejsou skladovány v `home.store`); přidání
do katalogu by vyžadovalo schema změny, kolizní kontrolu (K10) a riskuje, že je začnou indexovat
jiné systémy (market, výroba). Early-return je 2 řádky a explicitně vyjadřuje výjimku.

### Dotčené soubory/funkce
- `src/core/resources/handlers.js` — `resourceKindOf()` (přidat early-return)

### Rizika
- **R-A2-1:** Pokud by někde existoval skutečný katalogový item s id `gold` (cenově oceňované zboží),
  early-return by ho zastínil. Ověřeno: `gold`/`techPt` nejsou v žádném katalogu pod `ID_CATALOGS`;
  riziko nulové. Mitigace: grep gate `byId('gold')` v testu (nesmí existovat).
- **R-A2-2:** Accounting invariant — viz §7 (po fixu gold reálně teče do `player.gold`).

---

## 3. A3 — Crime pay clamp

### Stav v kódu (částečně už ošetřeno)
`src/core/systems/crime.js:44-50`:
```js
if (incidents > 0 && state.player && state.player.gold > 0) {
  const goldLoss = Math.min(Math.floor(incidents * 0.5), state.player.gold);
  if (goldLoss > 0) {
    pay(state, { gold: goldLoss }, 'crime:loss', ctx, state.engine.curStep);
  }
}
```
`goldLoss` je už **clampnutý** na `state.player.gold` a `floor`-nutý → `pay` by za normálních
okolností nehodil. **Throw riziko je nízké**, ale brief ho explicitně žádá ošetřit jako pojistku
(„ať broke osada nespadne"). Skutečné latentní riziko: před opravou A2 `pay({gold})` čte přes
`'resource'` handler (have 0) → throw **vždy, když `incidents>0`**. Po A2 je clamp dostatečný.

### Doporučená varianta — defensivní pojistka, nikoli přepis
1. Ponechat stávající `Math.min(floor(...), player.gold)` clamp (je správný).
2. Přidat ujištění, že `goldLoss` je integer ≥ 0 (už je díky `floor` + `>0` guard).
3. **Doporučení (volitelné, robustní):** v `crimeDaily` obalit `pay` tak, aby používal
   `allowDeficit` sémantiku NENÍ potřeba — clamp už garantuje `goldLoss ≤ player.gold`. Místo toho
   přidat invariant test (viz §8), že crime nikdy nehodí pro libovolné `pop`/`gold ≥ 0`.

> **Rozhodnutí:** A3 je primárně **závislost na A2**. Po A2 je crime bezpečné. Samostatná změna
> kódu v `crime.js` je minimální (žádná, nebo jen komentář + test). Pokud chce coder explicitní
> pojistku, použít variantu níže.

### Alternativa (defensive `allowDeficit` v handleru)
Rozšířit `pay` o per-key `allowDeficit` a v crime volat `pay(state, {gold: goldLoss}, ..., {allowDeficit:true})`.
**Proč spíš ne jako default:** mění signaturu `pay`/`canAfford` (core, používá market/taxes/upkeep);
zvyšuje riziko regrese mimo scope. Clamp na volajícím místě je lokálnější a bezpečnější.
Pokud se zvolí, musí být `allowDeficit` opt-in a default `false` (zachovat stávající chování).

### Dotčené soubory/funkce
- `src/core/systems/crime.js` — `crimeDaily()` (clamp ponechat; volitelně komentář)
- (volitelně) `src/core/resources/transactions.js` — `pay()` signatura, jen pokud se zvolí alternativa

### Rizika
- **R-A3-1:** Závislost na pořadí — A3 testovat AŽ po A2, jinak crime hodí kvůli špatnému handleru.
- **R-A3-2:** Pokud se zvolí `allowDeficit` v `pay`, hrozí regrese v accountingu (deficit tx).
  Mitigace: nedělat, ponechat clamp na volajícím.

---

## 4. A4 — Sanity-cap populace

### Root cause
- `src/core/systems/health.js:40-51` `healthBirths` volá `natality(pop, BALANCE.population.matRate)`
  kde `matRate = 0.04` je **roční** (`balance.js:121-122`, „Annual birth rate"), ale funkce běží
  **denně** v `noon` tick (`tickOrder.js:180`). → efektivně `(1.04)^365` ≈ ×1.1M / herní rok
  (reálně omezeno `Math.floor` na malém popu, ale playtest naměřil 50 → ~8749 / rok).
- Birth cap se NEAPLIKUJE: `getHousingCapacity` (`health.js:22-31`) sečte kapacitu z `houseTypes`
  katalogu. Tent má `capacity: null` (`src/data/houseTypes.json:9`), `calcHousingDerivedFromCatalog`
  (`population.js:28`) `null` přeskočí → capacity = 0 → větev `capacity > 0 ? ... : born` (`health.js:47`)
  vrátí `born` **bez limitu**.
- Stejný problém v migraci: `populationMigration` (`population.js:72`) `limit = capacity > 0 ? ... : MAX_SAFE_INTEGER`
  → tent-only osada má neomezenou migraci (zde menší dopad, protože attractiveness tent = 0).

### Doporučená varianta — dvě nezávislé opravy (denní sazba + housing sanity cap)

**(a) Denní sazba porodů (správnost, ne plný tuning):**
`healthBirths` běží denně, proto musí použít **denní** sazbu. Buď:
- převést roční `matRate` na denní v místě volání: `dailyRate = matRate / DAYS_PER_YEAR`
  (`DAYS_PER_YEAR` = 360 nebo 365 dle kalendáře — ověřit v `season`/engine konstanta), nebo
- přidat `BALANCE.population.matRatePerDay` (approximated) a použít ho v `healthBirths`.

> **Pozn.:** `populationRetirement` (`population.js:85-88`) má **stejný** bug (roční `retRate`
> aplikovaný denně). Pro konzistenci a aby populace nekolabovala/neexplodovala asymetricky, převést
> na denní sazbu i tam. Tohle je v scope „sanity", ne plný M9 tuning.

**(b) Housing sanity cap (tvrdá zábrana exploze):**
Tent (a obecně domy s `capacity: null`) musí poskytovat **fallback kapacitu**, jinak je osada
„bez stropu". Doporučení:
- Zavést `BALANCE.population.tentCapacity` (approximated, např. 10/stan → 5 stanů = 50, sedí se
  startem) NEBO obecný `BALANCE.population.fallbackCapacityPerHouse`.
- V `calcHousingDerivedFromCatalog` (nebo v cap helperu) traktovat `capacity == null` jako
  `fallbackCapacity` místo přeskočení. **Pozor:** tato funkce je sdílená (births i migration i
  workforce) — změna sémantiky `null→fallback` ovlivní i `workerSlots`/`attractiveness`? NE, ty se
  počítají zvlášť (`population.js:31-32`); změní jen `capacity`. Ověřit, že žádný jiný caller
  nespoléhá na `capacity=0` jako „neomezeno".
- **Bezpečnější (doporučeno):** NEMĚNIT sdílenou `calcHousingDerivedFromCatalog`, ale přidat
  **globální sanity hard-cap** v `healthBirths`: `pop_after = Math.min(pop + born, sanityCap)`,
  kde `sanityCap = max(housingCapacity, BALANCE.population.sanityMaxPop)` (např. 10000 jako MVP
  strop). Tím se exploze zastaví i kdyby cap logika selhala, a nezasahuje do sdílené funkce.

> **Doporučená kombinace:** (a) denní sazba + (b) globální sanity hard-cap v `healthBirths`
> (a symetricky v migraci). Tent fallback capacity je čistší dlouhodobě, ale globální hard-cap je
> nejjednodušší, nejbezpečnější a testovatelný v rámci „sanity, ne tuning".

### Alternativa (zamítnuta) — jen snížit `matRate`
Snížit `matRate` na denní hodnotu bez hard-capu.
**Proč ne samo o sobě:** řeší rychlost, ale neřeší chybějící housing strop — populace stále poroste
neomezeně (jen pomaleji) v tent-only osadě bez budov. Plný balanc tuning (cílové křivky, food/housing
pressure) je explicitně M9 (scope OUT). Sanity cap je nutná zábrana pro MVP hratelnost.

### Dotčené soubory/funkce
- `src/core/systems/health.js` — `healthBirths()` (denní sazba + sanity hard-cap)
- `src/core/systems/population.js` — `populationRetirement()` (denní sazba), volitelně
  `populationMigration()` (sanity limit pro tent-only)
- `src/core/balance/balance.js` — `population` sekce (`matRatePerDay`/`retRatePerDay` nebo
  `sanityMaxPop`/`tentCapacity`); přidat i do `src/data/balance.json` pro konzistenci (oba zdroje
  drží stejná čísla – `balance.js` je runtime SoT, `balance.json` data mirror)
- `src/core/balance/formulas.js` — `natality()` lze ponechat (čistá `floor(pop*rate)`), sazba se
  předá zvenčí

### Rizika
- **R-A4-1:** Determinismus — births/retirement NEpoužívají RNG (čisté `floor`), takže změna sazby
  je deterministická. `healthDisease` RNG stream zůstává nedotčen (jiná funkce). Bez rizika na RNG.
- **R-A4-2:** Změna sdílené `calcHousingDerivedFromCatalog` může ovlivnit jiné callery. Mitigace:
  zvolit variantu s globálním hard-capem v `healthBirths`, NE měnit sdílenou funkci.
- **R-A4-3:** Save-hash dlouhých savů se změní (jiná trajektorie populace) — viz §6. Existující savy
  s explodovanou populací zůstanou (allowlist), jen další růst se zastropuje.
- **R-A4-4:** `population.test.js` testuje births/retirement s ručně nastaveným popem a kapacitou —
  očekávané hodnoty se po změně sazby změní → aktualizovat (viz §8).

---

## 5. A5 — Market UI overflow

### Root cause
- `src/ui/screens.js:80-111` `MarketScreen` renderuje `<table class="market-table">` s 5 sloupci
  (Zboží, Koupit, Prodat, Vlastním, Akce + 2 tlačítka „Koupit 10"/„Prodat 10").
- `src/ui/styles.css` (54 řádků) NEOBSAHUJE **žádné** pravidlo pro `.market-table`, `.market-section`,
  `.screen-market` ani obecné `table`. → tabulka se vykreslí v přirozené šířce; tlačítka „Koupit 10"
  / „Prodat 10" v poslední buňce roztáhnou řádek a na úzkém mobilu (~360px) přetéká horizontálně.

### Doporučená varianta — scroll wrapper + responsivní CSS (zero-build, čisté CSS)
1. **Markup (`screens.js`):** obalit `<table class="market-table">` do
   `<div class="table-scroll">…</div>` (horizontální scroll fallback pro jistotu).
2. **CSS (`styles.css`):** přidat pravidla:
   ```css
   .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
   .market-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
   .market-table th, .market-table td { padding: 0.3rem 0.4rem; text-align: right; }
   .market-table th:first-child, .market-table td:first-child { text-align: left; }
   .market-actions { white-space: nowrap; }
   .market-actions button { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
   @media (max-width: 480px) {
     .market-actions { display: flex; flex-direction: column; gap: 0.25rem; }
   }
   ```
   Na úzkém mobilu se akční tlačítka skládají vertikálně; tabulka se vejde, scroll je jen fallback.

### Alternativa (zamítnuta) — přepsat tabulku na card layout (div grid)
Místo `<table>` použít flex/grid karty per zboží.
**Proč ne teď:** větší zásah do `MarketScreen` (testy `ui-selectors`/screens), a brief řadí mobile
UX polish do M9. Minimální CSS fix splní „ne" přetékání bez přepisu komponenty. Card layout je
vhodný kandidát pro M9 polish.

### Dotčené soubory/funkce
- `src/ui/screens.js` — `MarketScreen()` (přidat `.table-scroll` wrapper)
- `src/ui/styles.css` — přidat market/table pravidla

### Rizika
- **R-A5-1:** Žádné CSS proměnné pro fonty/spacing nemusí existovat — použít literály konzistentní
  se stávajícím stylem (`styles.css` používá `var(--text)`, `var(--accent)` ap. — ověřit a reuse).
- **R-A5-2:** Smoke gate (`npm run smoke`) ověřuje boot + 0 console errors, NE layout. Overflow se
  ověří manuálně/vizuálně nebo přidat narrow-viewport check do smoke (mimo scope tohoto návrhu).

---

## 6. Dopad na determinismus a save-hash

### Co se mění
- **Fresh initial state se mění** (A1): `player.gold 0→500`, `population.total 0→50`,
  `housing.counts {tent:5}` reálně seedované, `food.store.bread 0→20`. → jakýkoli test/snapshot,
  který hashuje **čerstvý** default stav, dostane nový hash.
- **Dlouhá seedovaná trajektorie se mění** (A4): jiná populační křivka → jiný stav po N krocích →
  jiný hash u determinism/long-sim fixtures (pokud existují).

### Co se NEmění (a proč determinismus drží)
- **RNG cesta nedotčena:** A1/A2/A4 nepřidávají ani neodebírají žádné `makeRng`/`rng.chance` volání.
  `crimeDaily` i `healthDisease` konzumují RNG stream stejně jako dřív (`crime.js:25`, `health.js:62`).
  Pořadí a počet RNG draws zůstává → save/load round-trip determinismus zachován.
- **Persist allowlist nedotčen** (`persistSchema.js`): seedované hodnoty (`gold`, `population.total`,
  `housing.counts`, `food.store`) jsou všechny v allowlistu → save→load je reprodukuje. Staré savy
  přepíšou seed přes `applyPayload` → zpětná kompatibilita držena.
- **Save version se NEMĚNÍ** (žádná změna tvaru stavu, jen hodnot) → není potřeba nová migrace
  (na rozdíl od iter-011 v2→v3). `DEFAULT_SAVE_VERSION` zůstává 3.

### Ošetření existujících save/determinism testů
1. **Fresh-state hash/snapshot testy:** přepočítat očekávané fixtures (gold 500, pop 50, food bread 20).
   Hledat testy, které tvrdí `gold === 0` / `population.total === 0` na čerstvém `createInitialState()`.
2. **Round-trip (save→load→hash) testy:** většinou **nezasaženy** — testují identitu před/po, ne
   absolutní hodnotu. Ověřit, že fixture save (pokud má hardcoded payload) je validní s novou seed cestou.
3. **Testy s manuálním overridem** (`accounting-invariant.test.js:34-40`, `health-crime.test.js`,
   `population.test.js` nastavují `state.player.gold = …` / `state.home.population.total = …` ručně) —
   **nezasaženy**, protože seed override hned přepíšou. Toto izoluje většinu suite (762 testů) od A1.
4. **Long-sim determinism fixture** (pokud existuje): přepočítat baseline po A4.

> **Akce pro codera:** spustit celou suite (`node --test`) po A1+A2, vyfiltrovat selhání na
> „assertion gold/pop", aktualizovat **jen** ty fixtures. NEhromadně neregenerovat.

---

## 7. Dopad na accounting invariant (Σ tx == Δ gold)

### Invariant (z `accounting-invariant.test.js:1-3`)
`Σ txEvent.amount kde key==='gold'` musí rovnat `gold_after − gold_before`.

### Dopad opravy A2
- **Před A2:** `grant({gold})`/`pay({gold})` šly přes `'resource'` handler → zapisovaly do
  `home.store.gold`, NIKOLI do `player.gold`. Přitom `emitTx` (`transactions.js:45,61`) emitoval
  `{key:'gold', amount}`. → tx se zaznamenaly, ale `player.gold` se neměnil → **invariant byl reálně
  porušen v běhu** (Σ tx ≠ Δ player.gold), jen ho testy nezachytily, protože používaly přímý handler
  nebo override.
- **Po A2:** `handlerFor('gold')` → `resourceHandlers['gold']` → píše `player.gold`. Nyní `emitTx`
  i mutace jdou na **stejnou** veličinu (`player.gold`). → **invariant Σ tx == Δ player.gold drží
  korektně** pro taxes/grant/market/crime/upkeep.

### Ověření
- `accounting-invariant.test.js` měl by **projít a nově být smysluplný** (předtím mohl procházet
  triviálně, pokud měřil přes stejný špatný handler). Doporučení: po A2 přidat/posílit assertion,
  že po `grant({gold:N})` je `state.player.gold` vyšší o N (ne `home.store.gold`).
- **Riziko:** pokud někde stav před A2 „omylem" akumuloval gold do `home.store.gold`, po A2 to
  zmizí. Grep: kdokoli čte `home.store.gold` (nemělo by existovat). Ověřeno: `home.store` je obecný
  resource store, gold tam nepatří.

---

## 8. Doporučené pořadí implementace + testy

Pořadí je dáno **závislostmi** (A2 odblokovává A1/A3) a **rizikem regrese** (core → UI).

```
Krok 1  A2  Resolver gold/techPt        → odblokuje vše ostatní; nejnižší povrch (2 řádky)
Krok 2  A1  Start seed z BALANCE.start   → po A2 gold reálně funguje; seed má smysl
Krok 3  A3  Crime pay clamp              → ověřit po A2 (clamp už je); test no-throw
Krok 4  A4  Sanity-cap populace          → denní sazba + hard cap; nezávislé na A1-3 logikou
Krok 5  A5  Market UI overflow           → čistě UI/CSS; nezávislé; poslední
```

> Mapování na tasky codera (z briefu): A2→T-005..A5→T-009 dle pořadí dispatchu orchestrátora.
> Doporučené spárování: **A2+A1 v jednom PR/tasku** (provázané, společné fixture update), A3, A4,
> A5 samostatně.

### Testy / aktualizace testů per oblast

| Oblast | Nové testy | Aktualizace existujících |
|--------|-----------|--------------------------|
| A2 | unit: `handlerFor('gold')`===gold handler; `grant({gold:N})` zvýší `player.gold`; grep-gate `byId('gold')` throw | `accounting-invariant.test.js` posílit (gold→player.gold) |
| A1 | unit: `createInitialState()` → gold 500, pop 50, tent 5, bread 20; load fresh seeduje stejně | testy tvrdící gold/pop===0 na fresh stavu (přepočítat) |
| A3 | invariant: `crimeDaily` nikdy nehodí pro pop∈{0..N}, gold∈{0..M} | `health-crime.test.js` (crime větev) |
| A4 | births denní sazba (50 → ~rozumný roční růst, ne 8749); sanity cap drží strop; retirement denní | `population.test.js` (births/retirement očekávané hodnoty), long-sim fixture pokud je |
| A5 | (volitelně) narrow-viewport smoke check | žádné unit; vizuální ověření |
| Globální | `npm run smoke` (boot + 0 console errors) po každém kroku | `node --test` celá suite zelená po každém kroku |

### Gate doporučení (z playtest-findings §Proces)
- **`npm run smoke`** povinně po A1, A2, A5 (boot + 0 console errors). Po A1/A2 ověří, že seedovaná
  hra nebootuje do crashe „insufficient funds".
- **Dlouhý seedovaný sim (≥1–2 herní roky)** po A4 jako catch na exploze/crash (typ bug #3/#4).

---

## 9. ASCII diagram — resource resolver + start-state cesta

```
                          FRESH START                         LOAD (save)
                          createInitialState({seed})          load.js: createInitialState + applyPayload
                                  |                                   |
                                  v                                   v
            ┌──────────────────────────────────────┐    ┌──────────────────────────┐
            │  A1: seed z BALANCE.start             │    │ seed (stejná cesta) →    │
            │  player.gold      = 500               │    │ applyPayload (allowlist) │
            │  home.population  = 50                │    │ přepíše uloženými poli   │
            │  home.housing     = { tent: 5 }       │    │ (gold,pop,housing,food)  │
            │  home.food.store  = { bread:20, ... } │    └──────────────────────────┘
            └──────────────────────────────────────┘
                                  |
                                  v
        ──────────────  RUNTIME tick (taxes / market / crime / upkeep)  ──────────────
                                  |
                       grant/pay(state, { gold: N }, cause, ctx)   (transactions.js)
                                  |
                                  v
                       handlerFor('gold')  →  resourceKindOf('gold')
                                  |
                ┌─────────────────┴──────────────────────────────┐
                │  A2 FIX:  if (key==='gold'||key==='techPt')     │
                │             return key   ← EARLY RETURN          │
                │  (před byId() lookup, který by hodil výjimku)    │
                └─────────────────┬──────────────────────────────┘
                   PŘED A2 (bug)   |    PO A2 (fix)
                        |          |          |
                        v          |          v
            byId('gold') THROW     |   resourceHandlers['gold']
                        |          |          |
                        v          |          v
            fallback 'resource'    |   get/add/remove → state.player.gold
                        |          |          |
                        v          |          v
            home.store.gold (=0)   |   emitTx{key:'gold'} ── recordTx ─→ council accounting
                        |          |          |
                        v          |          v
        canAfford→0 → pay THROW    |   Σ tx == Δ player.gold  (invariant DRŽÍ)
        "insufficient funds"       |   crimeDaily clamp (A3) → no throw
        + UI "Zlato 0"             |
```

---

## 10. Souhrn rizik a mitigací

| ID | Riziko | Závažnost | Mitigace |
|----|--------|-----------|----------|
| R-A2-1 | Early-return zastíní katalogový `gold` item | Nízká | Ověřeno – gold/techPt nejsou v ID_CATALOGS; grep-gate test |
| R-A1-1 | load.js neseeduje → 0 místo 50 při chybějícím poli | Stř. | Seed přes createInitialState i v load cestě |
| R-A1-2 | Food store nemá všech 6 klíčů | Nízká | Merge nad zero-store |
| R-A3-1 | Crime hodí, pokud testováno před A2 | Stř. | Pořadí: A3 až po A2 |
| R-A4-1 | RNG drift z births | Nulová | Births/retirement bez RNG (čistý floor) |
| R-A4-2 | Změna sdílené calcHousingDerived ovlivní callery | Stř. | Globální hard-cap v healthBirths, neměnit sdílenou fn |
| R-A4-3 | Save-hash dlouhých savů se mění | Stř. | Očekávané; přepočítat long-sim fixture |
| R-SAVEHASH | Fresh-state hash testy selžou | Stř. | §6 – přepočítat jen gold/pop fixtures, neregenerovat hromadně |
| R-INVARIANT | Accounting invariant po A2 reálně měří player.gold | Pozitivní | §7 – posílit assertion |
| R-A5-2 | Smoke neověří layout overflow | Nízká | Vizuální ověření / narrow-viewport check (M9) |

---

## 11. Předpoklady a nejistoty

- **P1:** `DAYS_PER_YEAR` pro převod roční→denní sazby (A4) — coder ověří konstantu v engine/season
  (360 vs 365). Návrh nepředepisuje konkrétní číslo, jen princip „roční/dní".
- **P2:** Konkrétní hodnota `sanityMaxPop`/`tentCapacity` (A4) je approximated MVP sanity, NE M9
  tuning. Doporučení: `tentCapacity ≈ 10` (5 stanů = 50, sedí start) nebo `sanityMaxPop ≈ 10000`.
- **P3:** Žádné nové runtime závislosti v `src/` (zero-build PWA) — všechny opravy jsou JS/CSS edits
  v existujících souborech.
- **P4:** Save version zůstává 3 (žádná změna tvaru stavu) — pokud reviewer rozhodne jinak, je nutná
  migrace; návrh argumentuje, že není potřeba.
```
