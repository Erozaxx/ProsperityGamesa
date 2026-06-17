# Architektura: Playability & onboarding hardening (iter-012, T-003 — REVIZE)

- **Autor**: architect
- **Iterace**: iter-012
- **Brief**: BRIEF-012-003
- **Datum**: 2026-06-13
- **Status**: Final (návrh – NE implementace)
- **Supersedes**: `architecture_playability_iter-012_T-001.md` (T-001) — tato verze ho nahrazuje
- **Vstupy revize**: review T-002 (`review_architecture_iter-012_T-002.md`) + DR-012-01
- **Pro codera**: pořadí a mapování viz §8

> Tato verze opravuje faktický omyl T-001 ohledně A2 (resolver gold/techPt). **Všechna níže uvedená
> tvrzení byla v T-003 znovu ověřena přímo proti kódu a empiricky `node` probe** (ne na slovo review
> ani T-001). Dokument je realizovatelný coderem bez dalšího architektonického rozhodování.

---

## 0. Co se v této revizi změnilo oproti T-001 (changelog)

| Oblast | T-001 tvrdil | T-003 realita (ověřeno) | Dopad |
|---|---|---|---|
| **A2** | „BLOCKER: gold/techPt nejsou v ID_CATALOGS → resolver vrací 'resource' → throw + Zlato 0" | gold/techPt **JSOU** v `resources.json` (`kind:"gold"`/`"techPt"`), `resources` je v ID_CATALOGS a načítá se na bootu i v testech → s katalogem resolver vrací `'gold'`/`'techPt'` a handler čte `player.gold` **správně už dnes**. A2 jako produkční fix = **no-op**. | A2 reklasifikováno z BLOCKER na **robustnost (catalog-less hardening)** |
| **§7 accounting** | „invariant byl reálně porušen v běhu" | **NEpravda** — gold teče do `player.gold` už dnes; `accounting-invariant.test` (zelený) měří smysluplně už teď | §7 přepsáno: žádné historické porušení |
| **§3 crime** | „pay({gold}) hodí **vždy** při incidents>0 (kvůli A2)" | **NEpravda** s katalogem — crime má `Math.min(floor, player.gold)` clamp + `>0` guard + `player.gold>0` guard → nehodí. (Throw nastane jen catalog-less.) | §3 přepsáno: clamp je správný sám o sobě |
| **§9 diagram** | větev „PŘED A2 (bug)" → byId throw → home.store.gold | s katalogem fiktivní; reálná bug větev existuje **jen catalog-less** | diagram přepracován |
| **playtest #2 „Zlato 0"** | důsledek A2 (resolver) | důsledek **A1** (fresh start pop=0 → crime early-return, taxes 0, market nemá co utratit) | re-diagnóza, viz §2.4 |
| **DAYS_PER_YEAR** | otevřené „360 vs 365" | **364** = 4 × `season.seasonDays(91)` (ověřeno `stepsPerSeason 81900 = 900×91`) | předepsáno coderovi |
| **market sloupce** | „5 sloupců" | **6** (Zboží, Dostupné, Nákupní cena, Prodejní cena, V inventáři, Akce; `colspan="6"`) | §5 opraveno |
| **load.js** | „sjednotit seed cestu" (vágní) | **smazat řádky 211–212** (`state.home=createHomeState`/`state.player=createPlayerState`) | §1 konkretizováno |
| **migrace sanity-cap** | jen births | sanity-cap aplikovat **i v migraci** jednotně | §4 doplněno |
| **population.test rename** | obecně „population.test.js" | konkrétně test `allows unlimited growth with null-capacity housing (tent)` (`population.test.js:254`) | §8 konkretizováno |
| **pořadí** | A2 → A1 → A3 → A4 → A5 | **A1 → A4 → A3 (jen test) → A5 → (robustnost: Option A)** | §8 přepsáno |

**Reálně platné a správně diagnostikované z T-001:** A1, A4, A5 (diagnóza i doporučení), §6 determinismus/save.

---

## 0a. Shrnutí pěti oblastí (revidováno)

| # | Oblast | Typ | Root cause | Doporučená oprava |
|---|--------|-----|-----------|-------------------|
| A1 | Start seed z `BALANCE.start` | **Bug (jediný reálný start-state bug)** | Factory čtou neexistující klíče `startTents`/`startPopulation`; gold natvrdo 0 | Seedovat v `createInitialState` z `BALANCE.start`; smazat chybné čtení ve factory; v `load.js` smazat 211–212 |
| A2 | Resolver `gold`/`techPt` | **Robustnost (NE bug)** | S katalogem OK. Bez katalogu (test harnessy) `resourceKindOf('gold')==='resource'` → `pay({gold})` hodí | **Option A**: defensivní early-return v `resourceKindOf` pro `gold`/`techPt` (viz §2) |
| A3 | Crime pay clamp | Robustnost (no-op kódu) | `crimeDaily` clamp + guards už chrání; throw byl jen catalog-less | Žádná změna kódu; jen regress test (no-throw invariant) |
| A4 | Sanity-cap populace | Bug/balanc | `healthBirths` aplikuje **roční** `matRate`/`retRate` (0.04/0.02) **denně** → exploze; tent `capacity=null` → bez stropu | Denní sazba (÷364) + globální sanity hard-cap v births i migraci |
| A5 | Market UI overflow | UX | `styles.css` nemá žádné pravidlo pro `.market-table` (6sl. tabulka) → přetéká na mobilu | Scroll wrapper + responsivní CSS |

> **Klíčová oprava narrativu:** A1 a A2 **NEjsou provázané** ve smyslu „po A1 hra spadne na A2".
> Hra dnes (s načteným katalogem) gold resolvuje správně. A1 funguje samostatně. Jediná vazba je
> opačná a slabá: A1 seed (pop>0) zvyšuje pravděpodobnost, že **catalog-less test harness** narazí
> na crime→`pay({gold})`, který bez katalogu hodí — to řeší Option A (§2), nikoli A1.

---

## 1. A1 — Start seed z `BALANCE.start`  (diagnóza T-001 PLATÍ; upřesněno)

### Root cause (ověřeno proti kódu)
- `src/core/state/createInitialState.js:98-99` volá `createPlayerState()` a `createHomeState()` **bez katalogu**.
- `src/core/state/createHomeState.js:21-22` čte `start['startTents']` / `start['startPopulation']` —
  tyto klíče v `BALANCE.start` **neexistují**. Skutečný tvar (`balance.js:145-151`):
  ```js
  start: { population: 50, gold: 500,
           food: { bread: 20, cheese: 0, fish: 0, fruit: 0, meat: 0, vegetable: 0 },
           housing: { tent: 5 } }
  ```
  → `tentCount` spadne na default 5 (náhodou „správně"), `startPop` na default **0**.
- `createPlayerState()` (`createHomeState.js:46-47`) vrací `gold: 0` natvrdo → start s 0 zlata.
- Food store je vždy nulový (`createHomeState.js:27`), ignoruje `BALANCE.start.food` → bread 0.

Empiricky: fresh `createInitialState()` → gold=0, pop=0, bread=0, housing={tent:5}.

### Doporučená varianta — seed v `createInitialState` z `BALANCE.start` (single source of truth)
Faktory zůstanou „neutral defaults"; aplikace start hodnot se přesune do `createInitialState`,
kde už je `BALANCE` importován (`createInitialState.js:8`).

Konkrétně v `createInitialState`, po sestavení `player`/`home`, seeduj z `BALANCE.start`:
- `player.gold = BALANCE.start.gold` (500)
- `home.population.total = BALANCE.start.population` (50)
- `home.housing.counts = { ...BALANCE.start.housing }` (`{ tent: 5 }`)
- `home.food.store = { bread:0, cheese:0, fish:0, fruit:0, meat:0, vegetable:0, ...BALANCE.start.food }`
  (zaručí všech 6 klíčů, viz R-A1-2)

A ve `createHomeState.js`:
- **Odstranit** chybné čtení `startTents`/`startPopulation` (řádky 14-22) → factory vrátí čistý
  neutral stav (`population.total: 0`, `housing.counts: {}` nebo `{ tent: 0 }`). Seed jde
  výhradně z `createInitialState`.
- `createPlayerState()` ponechat `gold: 0` jako neutral default (seed jde z `createInitialState`).

### `load.js` — KONKRÉTNÍ akce: smazat řádky 211–212
`src/save/load.js:207-215` staví čistý stav přes `createInitialState(...)` (krok 3), pak **přepíše**:
```js
state.home = createHomeState(catalog);   // řádek 211  ← SMAZAT
state.player = createPlayerState();       // řádek 212  ← SMAZAT
```
Po smazání: `state.home`/`state.player` zůstanou nasídlené z `createInitialState` (s A1 seed), a
`applyPayload` (krok 4, allowlist) je přepíše uloženými hodnotami (`gold`, `population.total`,
`housing.counts`, `food.store` jsou v `PERSIST_SCHEMA`). → staré savy se chovají korektně, fresh
i load mají **jednu** seed cestu. **Nepřidávat druhou seed větev** (viz review MINOR-4).

### Alternativa (zamítnuta) — seed uvnitř `createHomeState`/`createPlayerState`
Předat `BALANCE` do factory. **Proč ne:** factory mají JSDoc kontrakt „no catalog, neutral defaults";
`createPlayerState()` nemá parametr; rozšiřování signatur na dvou místech zvyšuje povrch chyb;
`load.js` volá factory s `catalog` (save catalog `{}`), takže by stejně nenesly `BALANCE.start`.
Centralizace v `createInitialState` (kde `BALANCE` už je) je jednodušší a testovatelnější.

### Dotčené soubory/funkce
- `src/core/state/createInitialState.js` — `createInitialState()` (přidat seed blok)
- `src/core/state/createHomeState.js` — `createHomeState()` (odstranit čtení 14-22),
  `createPlayerState()` (beze změny, gold=0)
- `src/save/load.js` — smazat řádky 211-212

### Rizika
- **R-A1-1:** Pokud by `applyPayload` některé pole vynechal (chybí v savu), zůstane seed (50/500) — to
  je žádoucí default, ne bug. Mitigace: seed přes `createInitialState` před `applyPayload` (zařízeno smazáním 211-212).
- **R-A1-2:** Food store musí mít všech 6 klíčů kvůli UI/selectorům. Mitigace: merge přes zero-store (výše).

---

## 2. A2 — Resolver `gold`/`techPt` — **NENÍ produkční bug; catalog-less robustnost (Option A)**

### 2.1 Realita (empiricky ověřeno — oprava omylu T-001)
- `src/data/resources.json:8-12,23-27` obsahuje **přímo** `{"id":"gold","kind":"gold"}` a
  `{"id":"techPt","kind":"techPt"}`.
- `resources` JE v `ID_CATALOGS` (`loader.js:23-24`) a v `CATALOG_NAMES` (`app/catalogs.js`) → nahrává
  se na bootu i ve všech testech, které katalogy načtou; `loadAllCatalogs` volá `buildById()`.
- **S načteným katalogem** (probe): `resourceKindOf('gold') === 'gold'`, `resourceKindOf('techPt') === 'techPt'`,
  `handlerFor('gold').get({player:{gold:500}}) === 500`.
- `resourceHandlers['gold']`/`['techPt']` (`handlers.js:60-87`) čtou/píší `state.player.gold`/`.techPt`
  **správně**.

→ `resourceKindOf` se s katalogem **nedostane do `catch`**, `byId('gold')` **nehází**. Doporučení T-001
(early-return) by s katalogem bylo **no-op**. `accounting-invariant.test` je zelený, protože gold
reálně teče do `player.gold` — ne kvůli „triviálnímu špatnému handleru".

### 2.2 Reálná mezera: catalog-less harnessy (DR-012-01)
- **Bez načteného katalogu** (probe `clearCatalogs()`): `resourceKindOf('gold') === 'resource'` →
  handler `'resource'` čte `home.store.gold` (prázdné) → `pay({gold})` vidí „have 0" → **throw
  „insufficient gold"**.
- Catalog-less test harnessy existují: `test/calendar.test.js` `makeBootstrap()` (`createInitialState`
  + `initRng` + registry, **bez** `loadCatalog`). Podobné bootstrapy mohou existovat jinde.
- **Interakce s A1:** A1 seed nastaví `pop=50`. Jakýkoli catalog-less harness, který protočí denní
  tick s crime aktivním (`pop>0` → crime neudělá early-return), spustí `pay({gold})` přes `'resource'`
  handler a **spadne**. Toto byl zdroj orchestrátorovy reprodukce „insufficient funds". Není to
  produkční crash (boot katalog vždy načte), ale je to **reálná regrese-křehkost v testech**, kterou
  A1 odhalí.

### 2.3 ROZHODNUTÍ: **Option A** — defensivní early-return v `resourceKindOf`

```js
export function resourceKindOf(key) {
  // gold/techPt are special currencies with dedicated handlers; resolve independently
  // of catalog load order (defense-in-depth — they are also in resources.json with the same kind).
  if (key === 'gold') return 'gold';
  if (key === 'techPt') return 'techPt';
  try {
    const entry = byId(key);
    const item = /** @type {Record<string, unknown>} */ (entry.entry);
    return /** @type {string} */ (item['kind'] || entry.type);
  } catch {
    return 'resource';
  }
}
```

**Klasifikace:** explicitně **redundantní hardening / defense-in-depth, NE bug fix.** S načteným
katalogem nemění žádné chování (gold/techPt už dnes resolvují na `'gold'`/`'techPt'`). Hodnota: činí
resolver nezávislým na load-orderu katalogu → odolnost proti budoucímu odstranění gold/techPt z
katalogu a robustnost catalog-less harnessů.

**Doporučení a zdůvodnění (Option A vs Option B):**

| | Option A (early-return v resolveru) | Option B (načíst katalogy v dotčených harnessech) |
|---|---|---|
| Dotek produkce | 4 řádky v core resolveru (jen 2 speciální měny, které dedikované handlery mají) | žádný |
| Robustnost | defense-in-depth; resolver nezávislý na load-orderu i v runtime | žádná — řeší jen konkrétní testy |
| Křehkost | nízká: chování s katalogem beze změny (chráněno testem invariance) | **vysoká**: každý nový catalog-less test to musí pamatovat; latentní fragilita zůstává |
| Údržba | jednorázová | opakující se zátěž na testy |

**→ Volím Option A** (shoda s preferencí orchestrátora v DR-012-01). Cena je minimální a lokální (2
speciální měny s vlastními handlery), přínos je trvalá robustnost resolveru. Option B přenáší zátěž
na testy a nechává resolver závislý na load-orderu — pro core komponentu nežádoucí.

**Pojistka invariance (povinné s Option A):** unit test, že early-return **nemění** chování s
načteným katalogem: `resourceKindOf('gold')==='gold'` a `resourceKindOf('techPt')==='techPt'`
platí jak s načteným katalogem, tak bez něj (a `handlerFor('gold')` === `resourceHandlers.gold`).

### Alternativa (zamítnuta) — **Option B**: načíst katalogy v dotčených harnessech
Přidat `loadCatalog('resources', …)` do `calendar.test` a dalších catalog-less bootstrapů.
**Proč ne:** nulový dotek produkce, ale neřeší runtime robustnost a je křehké (každý nový catalog-less
test musí na to myslet). Resolver zůstává závislý na pořadí načtení katalogu — u core komponenty je
defense-in-depth (Option A) lepší.

### 2.4 Re-diagnóza playtest finding #2 („Zlato 0" / insufficient funds)
**Finding #2 je proti aktuálnímu kódu NEPLATNÝ jako resolver bug.** Pozorované symptomy plně vysvětluje
**A1** (fresh start má `pop=0` a `gold=0`):
- `pop=0` → `crimeDaily` early-return (`crime.js:29`) → žádné crime gold loss.
- `pop=0` → taxes generují 0; market nemá za co nakupovat.
- „Zlato 0" v UI = fresh start s `gold=0` (A1), ne resolver zapisující do `home.store.gold`.

→ Finding #2 byl re-verifikován proti kódu jako **misdiagnóza navrstvená na #1 (A1)**. Symptomy řeší
**A1**. **Coder NEMÁ „opravovat resolver" jako bug fix.** Pokud playtest zaznamenal konkrétní runtime
stack-trace „insufficient funds" se `pop>0` (produkční boot, načtený katalog), pak by šlo o jinou
příčinu a je nutné ho dohledat — z dostupných dat (sumář, ne raw trace) takový produkční crash
**nevyplývá**; catalog-less throw (§2.2) je vysvětlen a uzavřen Option A.

### Dotčené soubory/funkce
- `src/core/resources/handlers.js` — `resourceKindOf()` (Option A early-return)

### Rizika
- **R-A2-1:** Early-return zastíní případný budoucí katalogový item s id `gold`/`techPt`. Ověřeno: dnes
  jsou v `resources.json` se shodným `kind` → chování identické; pojistka = test invariance + grep-gate
  (gold/techPt musí být v katalogu s `kind`==id).
- **R-A2-2:** Žádný — s katalogem se chování nemění (no-op pro produkci). Accounting viz §7 (neutrální).

---

## 3. A3 — Crime pay clamp  (žádná změna kódu; jen regress test)

### Stav v kódu (ověřeno — už ošetřeno)
`src/core/systems/crime.js:43-50`:
```js
const incidents = crimeCount(pop, crime.level, BALANCE.crime);
if (incidents > 0 && state.player && state.player.gold > 0) {
  const goldLoss = Math.min(Math.floor(incidents * 0.5), state.player.gold);
  if (goldLoss > 0) {
    pay(state, { gold: goldLoss }, 'crime:loss', ctx, state.engine.curStep);
  }
}
```
`goldLoss` je `floor` + **clampnutý** na `state.player.gold`, navíc dvojitý guard (`incidents>0`,
`player.gold>0`) → s načteným katalogem `pay` **nikdy nehodí**. Throw, který T-001 přisuzoval crime
„vždy při incidents>0", nastával **jen catalog-less** (resolver→`'resource'`→have 0) a je uzavřen
Option A (§2). **Clamp je správný sám o sobě, ne „po A2".**

### Doporučená varianta — žádná změna kódu, přidat regress test
- Ponechat stávající clamp (správný). `allowDeficit` v `pay` **nezavádět** (mění core signaturu,
  riziko regrese mimo scope; clamp na volajícím je lokálnější a bezpečnější).
- Přidat **invariant/regress test**: `crimeDaily` nikdy nehodí pro `pop ∈ {0..N}`, `gold ∈ {0..M}`
  (s načteným katalogem). Hodnotný regress guard proti budoucí změně clampu.

### Alternativa (zamítnuta) — `allowDeficit` opt-in v `pay`
Rozšířit `pay` o per-key `allowDeficit` a v crime volat s `{allowDeficit:true}`.
**Proč ne:** clamp už garantuje `goldLoss ≤ player.gold`, takže `allowDeficit` je zbytečné; změna
signatury `pay`/`canAfford` (core; market/taxes/upkeep) zvyšuje povrch regrese mimo scope.

### Dotčené soubory/funkce
- `src/core/systems/crime.js` — **beze změny** (volitelně komentář)
- nový test (viz §8)

### Rizika
- **R-A3-1:** Žádné (kód se nemění). Test je čistě additivní.

---

## 4. A4 — Sanity-cap populace  (diagnóza T-001 PLATÍ; DAYS_PER_YEAR=364, cap i v migraci)

### Root cause (ověřeno)
- `health.js:40-51` `healthBirths` volá `natality(pop, BALANCE.population.matRate)` kde `matRate=0.04`
  je **roční** (`balance.js:121-122`, „Annual birth rate"), ale funkce běží **denně** v noon tick →
  efektivně násobně přestřelený růst (playtest: 50 → ~8749/rok).
- Birth cap se NEAPLIKUJE: tent má `capacity: null` (`houseTypes.json:9`); `calcHousingDerivedFromCatalog`
  (`population.js:28`) `null` přeskočí → `capacity = 0` → větev `capacity > 0 ? … : born` (`health.js:47`)
  vrátí `born` **bez limitu**.
- **Stejný bug v retirement:** `populationRetirement` (`population.js:85-88`) aplikuje roční `retRate=0.02`
  denně.
- **Migrace:** `populationMigration` (`population.js:72`) má pro `capacity<=0` limit `MAX_SAFE_INTEGER`.
  Pro tent-only je tent attractiveness 0 (dopad nulový), ALE hovel attractiveness -1 a publichouse -10
  (`houseTypes.json`) → negativní rate → `migrationAcc` může jít do záporu, `floor(<0) ≤ -1`, `toAdd<0`,
  `actualAdd=max(0,…)=0` → reálný únik nepravděpodobný. Přesto je strop **asymetrický** (jen births).

### Doporučená varianta — denní sazba + globální sanity hard-cap (births i migrace)

**(a) Denní sazba (správnost, ne plný tuning):**
`healthBirths` i `populationRetirement` běží denně → musí použít **denní** sazbu:
`dailyRate = annualRate / DAYS_PER_YEAR`.

> **DAYS_PER_YEAR = 364** (předepsáno). Odvozeno: `BALANCE.season.seasonDays = 91` (`balance.js:28`)
> × 4 sezóny = 364; konzistentní s `stepsPerSeason 81900 = 900 × 91` a `stepsPerDay 900`.
> Coder: použít `const DAYS_PER_YEAR = 4 * BALANCE.season.seasonDays;` (= 364), NE 360/365.

Implementace: buď převést v místě volání (`natality(pop, matRate / DAYS_PER_YEAR)`), nebo přidat
`BALANCE.population.matRatePerDay`/`retRatePerDay`. Preferováno: převod v místě volání s konstantou
`DAYS_PER_YEAR` (méno duplikace zdroje pravdy; `natality` zůstane čistá `floor(pop*rate)`).

**(b) Globální sanity hard-cap (tvrdá zábrana exploze):**
NEMĚNIT sdílenou `calcHousingDerivedFromCatalog` (používá ji births, migrace i workforce). Místo toho
**globální sanity hard-cap** aplikovaný **jednotně**:
- V `healthBirths`: `state.home.population.total = Math.min(pop + actualBorn, sanityCap)`.
- V `populationMigration`: po výpočtu `actualAdd` rovněž clampnout výsledek na `sanityCap`
  (jednotně, aby strop nebyl asymetrický — review MINOR-3).
- `sanityCap = Math.max(housingCapacity, BALANCE.population.sanityMaxPop)`, kde `sanityMaxPop`
  je MVP sanity strop (např. 10000). Housing cap má přednost, když je vyšší.

> **Doporučená kombinace:** (a) denní sazba (births+retirement, ÷364) + (b) globální sanity hard-cap
> v births **i** migraci. Tent fallback-capacity je dlouhodobě čistší, ale globální hard-cap je
> nejjednodušší, nejbezpečnější (nezasahuje sdílenou fn) a testovatelný v rámci „sanity, ne tuning".

### Alternativa (zamítnuta) — jen snížit `matRate` na denní bez hard-capu
Řeší rychlost, ale neřeší chybějící housing strop → populace stále poroste neomezeně (jen pomaleji) v
tent-only osadě. Plný balanc tuning je M9 (scope OUT). Sanity cap je nutná zábrana pro MVP.

### Dotčené soubory/funkce
- `src/core/systems/health.js` — `healthBirths()` (denní sazba + sanity hard-cap)
- `src/core/systems/population.js` — `populationRetirement()` (denní sazba),
  `populationMigration()` (sanity hard-cap jednotně)
- `src/core/balance/balance.js` — `population.sanityMaxPop` (a případně `…PerDay` mirror);
  zrcadlit do `src/data/balance.json` pro konzistenci
- `src/core/balance/formulas.js` — `natality()` ponechat (čistá `floor(pop*rate)`, sazba zvenčí)

### Rizika
- **R-A4-1:** Determinismus — births/retirement NEpoužívají RNG (čistý `floor`, ověřeno) → změna sazby
  je deterministická; `healthDisease` RNG stream nedotčen. Bez RNG rizika.
- **R-A4-2:** Změna sdílené `calcHousingDerivedFromCatalog` by ovlivnila jiné callery → **neměnit ji**;
  globální hard-cap v births/migraci.
- **R-A4-3:** Save-hash dlouhých savů se mění (jiná populační trajektorie) — viz §6. Existující savy
  s explodovanou populací zůstanou (allowlist), jen další růst se zastropuje.
- **R-A4-4:** `population.test.js` testuje births/retirement s ručně nastaveným popem/kapacitou →
  očekávané hodnoty se mění; navíc test `allows unlimited growth with null-capacity housing (tent)`
  (`population.test.js:254`) — viz §8.

---

## 5. A5 — Market UI overflow  (diagnóza T-001 PLATÍ; 6 sloupců)

### Root cause (ověřeno)
- `src/ui/screens.js:80-111` `MarketScreen` renderuje `<table class="market-table">` se **6 sloupci**:
  Zboží, Dostupné, Nákupní cena, Prodejní cena, V inventáři, Akce (`colspan="6"` na ř. 93; akční buňka
  má třídu `.market-actions` na ř. 101 se dvěma tlačítky „Koupit 10"/„Prodat 10").
- `src/ui/styles.css` (~55 řádků) NEOBSAHUJE **žádné** pravidlo pro `.market-table`/`.market-section`/
  `table` → tabulka v přirozené šířce; akční buňka roztáhne řádek a na úzkém mobilu (~360px) přetéká
  horizontálně. (Fix tím netrpí — `.market-actions` třída v markupu existuje, CSS je aplikovatelné as-is.)

### Doporučená varianta — scroll wrapper + responsivní CSS (zero-build, čisté CSS)
1. **Markup (`screens.js`):** obalit `<table class="market-table">` do `<div class="table-scroll">…</div>`.
2. **CSS (`styles.css`):**
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
   Na úzkém mobilu se akční tlačítka skládají vertikálně; tabulka se vejde, scroll je fallback.
   Reuse existujících `var(--…)` proměnných tam, kde to dává smysl (ověřit ve `styles.css`).

### Alternativa (zamítnuta) — přepsat tabulku na card layout (div grid)
Větší zásah do `MarketScreen` (testy `ui-selectors`/screens); mobile UX polish je M9. Minimální CSS fix
splní „ne přetékání" bez přepisu komponenty. Card layout = kandidát pro M9.

### Dotčené soubory/funkce
- `src/ui/screens.js` — `MarketScreen()` (přidat `.table-scroll` wrapper)
- `src/ui/styles.css` — přidat market/table pravidla

### Rizika
- **R-A5-1:** Použít literály konzistentní se stávajícím stylem / reuse `var(--…)`.
- **R-A5-2:** `npm run smoke` ověřuje boot + 0 console errors, NE layout → overflow ověřit vizuálně /
  narrow-viewport check (mimo scope tohoto návrhu).

---

## 6. Dopad na determinismus a save-hash  (T-001 §6 PLATÍ)

### Co se mění
- **Fresh initial state** (A1): `player.gold 0→500`, `population.total 0→50`, `housing.counts {tent:5}`
  reálně seedované, `food.store.bread 0→20`. → jakýkoli test hashující **čerstvý** default stav dostane nový hash.
- **Dlouhá seedovaná trajektorie** (A4): jiná populační křivka → jiný stav po N krocích → jiný hash u
  long-sim fixtures (pokud existují).

### Co se NEmění (a proč determinismus drží)
- **RNG cesta nedotčena:** A1/A2/A4 nepřidávají ani neodebírají žádné `makeRng`/`rng.chance` volání.
  `crimeDaily` i `healthDisease` konzumují RNG stream stejně (`crime.js:26`, `health.js:62`). Pořadí a
  počet RNG draws zachováno → save/load round-trip determinismus držen.
- **Persist allowlist nedotčen** (`persistSchema.js`): seedované hodnoty jsou v allowlistu → save→load je
  reprodukuje; staré savy přepíšou seed přes `applyPayload` → zpětná kompatibilita.
- **Save version se NEMĚNÍ** (jen hodnoty, ne tvar) → žádná migrace; `DEFAULT_SAVE_VERSION` zůstává **3**.

### Ošetření existujících save/determinism testů
1. **Fresh-state hash/snapshot testy:** přepočítat fixtures (gold 500, pop 50, bread 20). Hledat testy
   tvrdící `gold===0` / `population.total===0` na čerstvém `createInitialState()`.
2. **Round-trip (save→load→hash):** většinou nezasaženy (testují identitu, ne absolutní hodnotu).
3. **Testy s manuálním overridem** (`accounting-invariant.test.js`, `health-crime.test.js`,
   `population.test.js` nastavují gold/pop ručně) — nezasaženy (override přepíše seed). Izoluje většinu suite.
4. **Long-sim determinism fixture** (pokud existuje): přepočítat baseline po A4.

> **Akce pro codera:** po A1+A4 spustit `node --test`, vyfiltrovat selhání na „assertion gold/pop",
> aktualizovat **jen** ty fixtures. NEhromadně neregenerovat.

---

## 7. Dopad na accounting invariant (Σ tx == Δ gold)  — OPRAVENO

### Invariant
`Σ txEvent.amount kde key==='gold'` == `gold_after − gold_before`.

### Realita (oprava omylu T-001)
- **Dnes (s katalogem):** `handlerFor('gold')` → `resourceHandlers['gold']` → píše `player.gold`;
  `emitTx` (`transactions.js`) emituje `{key:'gold', amount}` na **stejnou** veličinu. → **invariant
  drží korektně už teď** pro taxes/grant/market/crime/upkeep. `accounting-invariant.test.js` (zelený)
  měří smysluplně — **NEbyl žádný historický run-time porušený invariant** (T-001 §7 tvrdil opak; to bylo nesprávné).
- A1/A4/A5/A3 accounting **nemění** (A3 beze změny kódu; A1 jen seeduje hodnoty; A4 mění populaci, ne
  gold tx). Option A (§2) je s katalogem no-op → accounting neutrální.

### Volitelné posílení (hardening, ne náprava)
Po volbě lze přidat assertion, že `grant({gold:N})` zvýší `state.player.gold` o N (ne `home.store.gold`).
Je to **hardening**, ne oprava porušeného invariantu. `accounting-invariant.test.js` zůstane zelený.

---

## 8. Doporučené pořadí implementace + testy  (PŘEPRACOVÁNO)

Pořadí je dáno reálnými závislostmi a rizikem regrese (core → UI). A2 **neodblokovává** A1/A3 (mýtus
T-001 odstraněn); A1, A4, A3-test, A5 jsou navzájem logicky nezávislé.

```
Krok 1  A1   Start seed z BALANCE.start    → jediná reálná start-state oprava
             (seed v createInitialState; smazat load.js 211-212; odstranit čtení v createHomeState)
Krok 2  A4   Denní sazba (÷364) + sanity hard-cap (births i migrace)   → nezávislé na A1 logikou
Krok 3  A3   JEN regress test (no-throw invariant)  → žádná změna kódu
Krok 4  A5   Market UI/CSS overflow         → čistě UI/CSS; nezávislé; poslední
Krok 5  A2   Option A: early-return v resourceKindOf (redundantní hardening + test invariance)
             → poslední; explicitně NE bug fix; uzavírá catalog-less robustnost (DR-012-01)
```

> **A1 + A4 párovat fixture-update** (oba mění fresh-state / long-sim hashe — §6). A3, A5, A2 samostatně.
> A1/A4/A5 mohou jít do implementace bez čekání (diagnóza platná). A2 (Option A) je nízkorizikové,
> může jít kdykoli; doporučeno jako poslední, ať je jasné, že není „fix blockeru".

### Testy / aktualizace testů per oblast

| Oblast | Nové testy | Aktualizace existujících |
|--------|-----------|--------------------------|
| A1 | unit: `createInitialState()` → gold 500, pop 50, tent 5, bread 20; `load.js` fresh seeduje stejně (bez 211-212) | testy tvrdící gold/pop===0 na fresh stavu (přepočítat) |
| A4 | births denní sazba (50 → rozumný roční růst, ne ~8749); sanity cap drží strop (births i migrace); retirement denní | `population.test.js` births/retirement očekávané hodnoty; **přejmenovat/upravit** `allows unlimited growth with null-capacity housing (tent)` (`population.test.js:254`) → „grows up to sanity cap" + upravit assertion (po hard-capu „unlimited" už není doslova pravda); long-sim fixture pokud je |
| A3 | invariant: `crimeDaily` nikdy nehodí pro pop∈{0..N}, gold∈{0..M} (s katalogem) | (volitelně) `health-crime.test.js` crime větev |
| A5 | (volitelně) narrow-viewport smoke check | žádné unit; vizuální ověření |
| A2 | unit invariance: `resourceKindOf('gold')==='gold'` & `'techPt'==='techPt'` **s katalogem i bez něj**; `handlerFor('gold')===resourceHandlers.gold`; grep-gate: gold/techPt jsou v `resources.json` s `kind`==id | (volitelně) posílit `accounting-invariant.test.js` (grant({gold:N}) → player.gold +N) |
| Globální | `npm run smoke` (boot + 0 console errors) po každém kroku | `node --test` celá suite zelená po každém kroku |

### Gate doporučení
- **`npm run smoke`** po A1, A5 (boot + 0 console errors). Po A1 ověří, že seedovaná hra nebootuje do crashe.
- **Dlouhý seedovaný sim (≥1–2 herní roky)** po A4 jako catch na exploze/crash.

---

## 9. ASCII diagram — resource resolver + start-state cesta  (PŘEPRACOVÁNO)

```
                          FRESH START                         LOAD (save)
                          createInitialState({seed})          load.js: createInitialState + applyPayload
                                  |                            (po smazání 211-212: seed zůstane,
                                  v                             applyPayload přepíše uloženými poli)
            ┌──────────────────────────────────────┐    ┌──────────────────────────┐
            │  A1: seed z BALANCE.start             │    │ seed (TÁŽ cesta) →        │
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
       ┌──────────────────────────┴───────────────────────────────┐
       │ KATALOG NAČTEN (produkce + testy s loadCatalog)           │   KATALOG NENAČTEN (catalog-less harness)
       │ resources.json: {id:'gold',kind:'gold'} → byId OK         │   byId('gold') THROW → catch
       │ → resourceKindOf = 'gold'                                 │   → resourceKindOf = 'resource'
       │ (A2 Option A early-return = TÁŽ hodnota 'gold', no-op)    │   (A2 Option A early-return → 'gold' i ZDE → FIX)
       └──────────────────────────┬───────────────────────────────┘
                                  v
                       resourceHandlers['gold']
                                  |
                                  v
                       get/add/remove → state.player.gold        [bez Option A + bez katalogu:
                                  |                                'resource' handler → home.store.gold(=0)
                                  v                                → pay THROW "insufficient gold"
                       emitTx{key:'gold'} ─ recordTx ─→ council     (jen v catalog-less harnessech,
                                  |                                  NE v produkci — boot katalog načte)]
                                  v
                       Σ tx == Δ player.gold  (invariant DRŽÍ už dnes)
                       crimeDaily clamp (A3) → no throw
```

---

## 10. Souhrn rizik a mitigací

| ID | Riziko | Závažnost | Mitigace |
|----|--------|-----------|----------|
| R-A1-1 | Chybějící pole v savu → seed default 50/500 | Nízká (žádoucí) | Seed v createInitialState před applyPayload (smazat load.js 211-212) |
| R-A1-2 | Food store nemá všech 6 klíčů | Nízká | Merge nad zero-store |
| R-A2-1 | Early-return zastíní budoucí katalogový gold/techPt item | Nízká | Dnes shodný kind v resources.json; test invariance + grep-gate |
| R-A2-2 | Změna chování s katalogem | Nulová | Option A je no-op s katalogem (ověřeno) |
| R-A3-1 | Crime hodí | Nulová (s katalogem) | Clamp+guards už chrání; jen regress test |
| R-A4-1 | RNG drift z births | Nulová | Births/retirement bez RNG (čistý floor) |
| R-A4-2 | Změna sdílené calcHousingDerived ovlivní callery | Stř. | Globální hard-cap v births/migraci, neměnit sdílenou fn |
| R-A4-3 | Save-hash dlouhých savů se mění | Stř. | Očekávané; přepočítat long-sim fixture |
| R-SAVEHASH | Fresh-state hash testy selžou | Stř. | §6 – přepočítat jen gold/pop/bread fixtures, neregenerovat hromadně |
| R-INVARIANT | Accounting invariant drží už dnes | Pozitivní | §7 – volitelné posílení testu (hardening) |
| R-A5-2 | Smoke neověří layout overflow | Nízká | Vizuální / narrow-viewport check (M9) |

---

## 11. Předpoklady a nejistoty

- **P1 (vyřešeno):** `DAYS_PER_YEAR = 364` (= `4 * BALANCE.season.seasonDays`, ověřeno proti
  `seasonDays:91` a `stepsPerSeason:81900 = 900×91`). Coder NEmá „ověřovat 360/365".
- **P2:** Konkrétní `sanityMaxPop` (A4) je approximated MVP sanity, NE M9 tuning. Doporučení:
  `sanityMaxPop ≈ 10000`.
- **P3:** Žádné nové runtime závislosti v `src/` (zero-build PWA) — všechny opravy jsou JS/CSS edits v
  existujících souborech.
- **P4:** Save version zůstává 3 (žádná změna tvaru stavu) → žádná migrace.
- **P5 (review U2):** Playtest #2 re-verifikován proti kódu jako neplatný resolver bug; symptomy řeší
  A1. Není znám produkční runtime stack-trace „insufficient funds" se `pop>0` (boot katalog vždy
  načte). Catalog-less throw je vysvětlen a uzavřen Option A. Pokud by takový produkční trace existoval,
  je nutné ho dohledat — nepatří však mezi pět diagnostikovaných oblastí.
```
