# Prosperity (v0.9.5) – architektonická analýza klíčových mechanik originálu

- **Task**: T-001, iter-001
- **Autor**: architect
- **Datum**: 2026-06-12
- **Účel**: Podklad pro T-002 (hledání neefektivních mechanik) a pro pozdější návrh rebuildu (mobile-first PWA). Dokument **popisuje stav originálu** – nehodnotí, nedoporučuje refactoring.
- **Zdroje**: `doc/original_source_doc.md`, `doc/original_source/modules/prosperity/**`, `doc/original_source/extracted/config-extract.json`

> Konvence: cesty k souborům jsou relativní k `doc/original_source/modules/prosperity/`, pokud není uvedeno jinak. Čísla řádků odpovídají staženému zdroji v0.9.5.

---

## 0. Celkový architektonický obraz

Originál je AngularJS 1.x (MEAN.js) SPA. Celý herní stav žije na **`$rootScope`** – globální mutable objekt sdílený všemi službami, controllery i direktivami. Architektura má 4 vrstvy:

```
┌─────────────────────────────────────────────────────────────────┐
│ UI vrstva: controllers/* (obrazovky=mapy) + directives/*        │
│ (buildingcard, techtree, battlemap, inventory, person, ...)     │
│   čte/zapisuje přímo $rootScope (two-way binding)               │
├─────────────────────────────────────────────────────────────────┤
│ Doménové služby (AngularJS singletons, services/*):             │
│ Engine, Seasons, Home, Player, Market, Forest, Field, Mine,     │
│ Techs, Skills, World, Battle, Events, Game, Item, Dialogue      │
│   = chování; stav drží na $rootScope, ne v sobě                 │
├─────────────────────────────────────────────────────────────────┤
│ Datová vrstva: Config (services/config.js, ~7500 ř.)            │
│   konstanty, itemList (z 16 JSON katalogů), houseTypes,         │
│   companies, techTree, achievements, story, $rootScope.fns      │
├─────────────────────────────────────────────────────────────────┤
│ Persistence: Game + modul gamesaves (server REST) + localStorage│
│   lz-string komprese, diff vůči 'itemlistbk' backupu            │
└─────────────────────────────────────────────────────────────────┘
```

Klíčové vlastnosti (rozvedeno v kap. 14):

1. **Step engine + schedule** – diskrétní krokový simulátor (`curStep`), jednorázové/odložené události v `schedule[step]`, periodické věci přes modulo testy uvnitř `step()` jednotlivých služeb.
2. **Data-driven katalogy** – vše herní (budovy, zboží, jídlo, joby, techy, zóny, postavy, skilly…) je položka v `$rootScope.itemList`, načtená z JSON a „oživená" linkovacími funkcemi (`linkItemList`).
3. **String-callback dispatch** – plánované události se serializují jako `{id: 'fnName', params}` a vykonávají přes `$rootScope.callFn(id, params)` → `$rootScope.fns[id]` (umožňuje uložit schedule do save).
4. **Save = diff komprimovaného `$rootScope`** – ukládá se itemList + player + engine (vč. schedule) + season + battles…, ořezaný o statická data, která se při loadu znovu dopočítají z Configu.

---

## 1. Čas a engine (step scheduler)

**Soubory:** `services/engine.js` (scheduler), `services/game.js` ř. 13–41 (běhová smyčka), `services/config.js` (konstanty, `$rootScope.engine` objekt, `$rootScope.fns`, `callFn`).

### Datový model
Stav na `$rootScope.engine` (definice v config.js, ~ř. 1191):

| Pole | Význam |
|---|---|
| `curStep` | globální čítač kroků (int), `maxStep = 5×10^8` |
| `schedule` | `{ [step:number]: [{id: string, params: any}] }` – plán událostí |
| `state` / `stopped` | 1 = běží, 0 = stop; `stopped` je čítač vnořených stop() (start dekrementuje, engine se rozběhne až při 0) |
| `speeds` | `[{rate:0 (Pause)}, {rate:0.05 (1×)}, {rate:0.025 (2×)}]`; `normalRate=0.05`, `slowRate=2.8` |
| `logs`, `startStopLogs` | herní log (s časovým razítkem season.rok-měsíc-den) |
| `autoSave` | flag autosave |

Konstanty: `BASEENGINERATE = 0.05` s/krok (~20 kroků/s), `STEPSPERDAY = 900`.

### Aktualizace v čase
- **Smyčka běhu není v Engine, ale v Game** (`game.js: run()`, ř. 13–27): rekurzivní `$timeout(run, delay)`; pokud `engine.state`, zavolá `Engine.step()` → `World.step()` → `Skills.step()` (+ autosave každých `STEPSPERDAY×10` kroků). `calcRate()` (ř. 29–41) kompenzuje drift: měří reálný čas mezi tiky a zkracuje delay (min 10 ms).
- **`Engine.step()`** (engine.js ř. 233–258): `curStep++`; vyzvedne `schedule[curStep]`, každou položku vykoná přes `$rootScope.callFn(value.id, value.params)` v try/catch, slot smaže. Každých 10 000 kroků `clearPastEvents()` (GC prošlých slotů).
- **Plánování**: `insert(start, funcId, params, findNextEmpty)` – relativně k `curStep`; `findNextEmpty` posouvá na první volný slot. `once(start, funcId)` – absolutní krok, deduplikuje stejné funcId ve slotu. `countEvent(id, param)` umí spočítat naplánované výskyty (užívá Events.startCheck k re-registraci AI smyček po loadu).
- **Periodické mechaniky NEjdou přes schedule** – každá služba má `step()` volanou každý krok z `World.step()` a uvnitř testuje `curStep % perioda == 0` (den, měsíc, poledne…). Schedule slouží jen pro jednorázové/odložené události (eventy, návrat karavany, bitvy, AI tiky – ty se re-plánují samy).

### Vstupy/výstupy a vazby
- Vstup: rychlost od UI (`changeSpeed`), start/stop od Game/eventů (story screeny zastavují engine přes stop čítač).
- Výstup: vykonané `fns` callbacky (mutují `$rootScope`), gamelog, browser notifikace (`createNotification` – přímá manipulace DOM přes jQuery).
- Závisí na: `$rootScope.fns` katalogu (config.js, ~1200 ř. funkcí, ř. 2383+) – **všechny serializovatelné herní akce jsou string-ID funkce zde**.

---

## 2. Kalendář a sezóny

**Soubory:** `services/seasons.js` (54 ř.), `services/config.js` (objekt `$rootScope.season` ~ř. 1176; `fns.changeSeason` ř. 3877–3912).

### Datový model
`$rootScope.season`: `{ stepsPerDay: 900, stepsPerSeason: 900×91 = 81 900, curSeason: 'Winter', curDay: 16, curMonth: 12, curYear: 922, curStepInSeason, seasonLength: {Spring:91, Summer:91, Autumn:91, Winter:91} }`. Start hry: zima, den 16, měsíc 12, rok 922.

### Aktualizace v čase
- `Seasons.step()` voláno každý krok z `World.step()`; aktivní jen při `curStep % STEPSPERDAY == 0`: `curDay++` (den >30 → měsíc++, měsíc >12 → rok++), `curStepInSeason++` (pozn.: navzdory názvu počítá **dny** v sezóně); po 91 dnech `advance()` → `fns.changeSeason(old, new)` v pořadí Spring→Summer→Autumn→Winter→Spring.
- `changeSeason` samo o sobě jen přepne `curSeason`, přepočítá rychlost lovu (`calcHuntingSpeed` při unlocked `huntingSeasons`) a spustí vysvětlující event. **Sezónní efekty na produkci jsou decentralizované**: jednotlivé mechaniky čtou `season.curSeason` ve svých step funkcích (les – přírůstky stromů/zvěře na jaře a požáry na podzim; pole – `preconditions: ['notWinter']` na úkolech, hlodavci; domov – spotřeba palivového dřeva 0.5/os./den v zimě vs 0.2 jinak; svět – plánování eventů v násobcích délky sezóny).

### Vazby
Vstup: `engine.curStep`. Výstup: `season.*` čtený Forest/Field/Home/Events/Engine.log; eventy `explainSummer/Autumn/Winter/Spring`.

---

## 3. Populace a bydlení

**Soubor:** `services/home.js` (2665 ř.) – největší doménová služba; data v `$rootScope.world.home` a `$rootScope.player`. Tiery domů: `config.js` ř. 796–860 (`houseTypes`), potvrzeno v `extracted/config-extract.json`.

### Datový model
Populace je **agregátní** (žádné per-osoba entity pro běžné obyvatele):
- `home.curWorkers` / `home.maxWorkers` (strop = `baseWorkers` + sumace efektů `workers` z postavených instancí budov, `calcMaxWorkers()` ř. ~2539).
- `home.jobs[jobid].number` – počty pracovníků na jobech (joby = položky itemList type `job`, viz kap. 5); nezaměstnaní = `jobs.bum.number`; `workersAway` (poslaní pryč, např. karavany/vojsko).
- Jmenované osoby existují jen pro NPC/story: `home.people[characterid]` (+ direktivy `person.js`, `jobtasks.js` pro vizualizaci).
- `home.nat` – natalita: `{matRate, matThisYear, retRate, retThisYear}`.
- `home.infected`, `home.diseased`, `home.crime`, `home.level` (0–6: Camp→City), `player.awesomeness` + komponenty (`foodAwesomeness`, `decoAwesomeness`, `healthAwesomeness`, `threatAwesomeness`, `spaceAwesomeness`, `citySizeAwesomeness`, `festivalAwesomeness`).
- `houseTypes` (config-extract): tent w3, hovel w3/cap200/att−1, house w5/600/0, mansion 6/1000/+4, manor 10/1400/+8, chateau 20/3000/+25, estate 20/10000/+100, publichouse 25/3000/−10 (`workers` = pracovní sloty, `capacity` = sklad. kapacita, `attractiveness` = vliv na příliv).

### Aktualizace v čase (Home.step, ř. ~595–1923)
Jediná velká step funkce s checkpointy podle modulo času:
- **každý krok**: migrační akumulátor – `player.curNewWorker += player.awesomeness`; při překročení `maxNewWorker` → `newWorkers(1)` (přibude bum), při poklesu pod `−maxNewWorker` → `Player.cullWorker` (odchod). *Awesomeness je tedy rychlost migrace.*
- **quarterDay**: zpracování jobů a jejich produkce (viz kap. 5), nehody (`procAccident`, config.js ř. 3913 – smrt s náhodnou příčinou z `CAUSESOFDEATH`, 14 položek), vlčí útoky u malých osad, auto-obsazování volných slotů z bum poolu.
- **newNoon**: narození (`comesOfAge` po 180 dnech hry, kvóta `matRate × curWorkers`/rok), odchody do důchodu (`retirement` po 360 dnech), zločin (šance 1 %/bod `crime`/den: pettyTheft/vandalism/arson/foodTheft), druhé jídlo dne.
- **newDay**: 2× `eatFood()`, `burnWood()` (palivo), efektivita práce – `workerEfficiency = clamp(1 + minWorkerPenalty + leaderMorality + entertainmentOffset + goodSpiritsBonus + workerMorale [− 0.25 curfew], 0.25, 2.0)`, kontrola levelu města (`checkSettlementLevel`).
- **newMonth**: daně, upkeep (kap. 6), hniloba jídla (kap. 4), měsíční finanční report (`home.monthlyFinances`, `world.council.monthlyReports[month] = {i:{}, o:{}}` – příjmy/výdaje po položkách).
- **Nemoci**: `chanceToGetSick = (curWorkers + diseaseFromColdChance×50)/20000 (+ consecutiveNoFood/50)`; infekce se šíří, `chanceToDie = 0.05` (−25 % s `balancedDiet`); úmrtí → `Player.cullWorker`.
- **Pozdní mechaniky**: `revoltMechanicStart = STEPSPERDAY×700` (config) – až poté se počítá revolt/favour logika (kap. 9 – platí pro zóny; doma se projevuje crime/curfew).

### Bydlení a attractiveness
- Domy se staví výhradně přes **builder companies kontrakty** (kap. 7 a 12): eventy `houseBuilder` nabídnou stavbu domu daného tieru za fixní gold (Kutting Korners/hovel 2 000 g, Bricking Bad/house 9 000 g, Honestly Good/mansion 30 000 g, Lawyered Up/manor 200 000 g; `companies` v config.js ř. 1242–1285).
- `calcAttractiveness()` (ř. ~2553): suma `attractiveness` efektů budov, normalizace podle populace, bonusy (arts +10, garden +1/instance) → `decoAwesomeness` → migrace.

### Vstupy/výstupy
Vstup: jídlo (granary), budovy a jejich `effects`, season, crime/disease RNG. Výstup: pracovní síla pro joby, daně, `awesomeness`. Vazby: Player (pay/insertInventory/cullWorker), Engine (insert/log), itemList (taxCenter, inn, hospital, cityGuardHQ, curfew…).

---

## 4. Jídlo

**Soubory:** `services/home.js` (eatFood ř. 409–468, spoilage ř. 639–651), `services/player.js` (pay – klíč `food`, ř. 173–243), `lists/listfood.js` (katalog 6 druhů).

### Datový model
- Katalog: `bread, cheese, fish, fruit, meat, vegetable` (itemList type `food`).
- Sklad **odděleně od zboží**: `home.foodStore[itemid]` + agregát `home.curFood`, strop `home.maxFood` (= `baseFoodCapacity` + efekty `foodCapacity` budov, ×2 s `betterShelving`) – fyzicky „granary".
- `home.consumeFoodRate` – index do `home.foodConsumptionRates` (úroveň přídělů; při nedostatku se automaticky vrací na základní úroveň 2).
- `home.spoilage[itemid]` / `baseSpoilage` – měsíční % hniloby per druh (techy ji půlí, config.js ř. 1647).
- `player.foodVariety` – kolik druhů reálně pokrylo ≥75 % populace při posledním jídle.

### Aktualizace v čase
- **2× denně** (`newDay` + `newNoon`) `eatFood()`: `numEaters = curWorkers + 2 + speciální NPC`; požadavek `food = rate × numEaters / 2`. Platba klíčem `food` jde do `Player.pay`, který **rozdělí spotřebu napříč druhy** (sort podle dostupnosti, fair-share `ceil(total/(n−i))`, počítá foodVariety). Nedostatek → sní co je, `consecutiveNoFood++`; >6 dní → `foodAwesomeness = max(−consecutiveNoFood, −90)` (hladomor sráží migraci/morálku, zvyšuje nemocnost). Dostatek → bonus `ceil(foodVariety²/2) × consumeFoodRate`.
- **Měsíčně** hniloba: `foodStore[id] × spoilage[id]` se odepíše přes `Player.pay` (→ hromadění jídla se nevyplácí, nutná průběžná produkce).
- Produkce jídla teče dovnitř výhradně přes `Player.insertInventory` (type `food` → foodStore, ořez na maxFood při `limited`).

### Vazby
Vstup: produkce jobů (farmer, hunter→meat, fisher, baker…), trh/karavany, kontrakty. Výstup: přežití populace, foodAwesomeness, nemocnost. Sezóna působí nepřímo přes produkční joby (pole v zimě stojí).

---

## 5. Produkce surovin (les / pole / důl) a joby

**Soubory:** `services/forest.js` (175 ř.), `services/field.js` (70 ř.), `services/mine.js` (34 ř.) – **správci zásobníků zdrojů**; samotnou produkci dělají **joby** v `services/home.js` (quarterDay blok ř. ~1283–1593) nad katalogem jobů z `config.js: buildJobs()` ř. 1287–1376.

### Datový model
- Zásobníky ve `$rootScope.world.*`: `forest.curTrees`, `forest.curAnimals`, `forest.saplings` (fronta dozrávání, `TREEMATURETIME = 36` slotů), `mine.curOres`, `field.curlivestock`, `field.maxFarmLand/usedFarmLand`, `field.rodentInfestation`. Plošná omezení: `$rootScope.area` vs `$rootScope.used` (citySpace, forestSpace, fieldSpace, mineSpace, riverSpace, otherSpace).
- **Job = itemList položka type `job`**: `{number, max, maxWorkers, cost, baseCost, products, baseProducts, maxStep, baseMaxStep, category (sektor), onComplete?, onNewDay?, idleIfFull, preconditions?}`. `buildJobs()` doplní defaulty a per-job callbacky (forester sází saplings + náhodně herby; miner má `onNewDay` šanci objevit žílu `~Math.random < number/(4000+curOres)`).
- Produkční cyklus jobu: progress do `maxStep`, pak `products` (škálované počtem pracovníků a `workerEfficiency`) přes `Player.insertInventory` a `cost` (vstupy: trees, animals, ores, crops…) přes `Player.pay`. `max` sloty jobu = sumace efektů `max<jobid>` z instancí budov (`calcMaxJobNumbers()` home.js ř. 2017–2080).

### Aktualizace v čase
- **Home.step (quarterDay)**: iterace všech jobů – kontrola preconditions (`evalPreconditions`, config.js ř. 3966; např. `notWinter` pro kultivaci), dostupnosti vstupů, progress, výplata produktů. Efektivita lovu/těžby závisí na stavu zásobníku (hunter vs `curAnimals`, lumberjack vs `curTrees` – home.js ř. 1404–1477).
- **Forest.step** (každých 10 dní): regenerace – posun fronty `saplings` (dozrání → `curTrees`), nové saplings `0.004×curTrees` + jarní bonusy (+120/+20, pollinationService, popel po požáru), zvěř `+ceil(curAnimals×0.0075 + curTrees/(curAnimals×10.5+20))` + sezónní bonusy (jaro +70, léto +30); ekologické stropy (zvěř ≤ stromy/5, resp. /8 při insertu); podzimní **lesní požáry** `risk = (curTrees/maxTrees)²` → −50 % stromů; migrační event zvěře po vyhubení; ořez růstu podle `area.forestSpace`.
- **Mine.step** (denně): při `curOres < 300` 10% šance naplánovat `eventMineExpander` (kontrakt na rozšíření dolu). Důl jinak jen ubývá těžbou; doplňují ho eventy a miner `onNewDay` objevy.
- **Field.step** (denně): šance na hlodavčí infestaci `0.001 × počet vegetableFarm` (zima /3, jaro ×1.5, strop 30) → event + postih produkce; `inspectTime` odpočet pro crop-circle minievent.

### Vazby
Vstup: pracovníci (Home), sezóna, plocha, techy (upgrady mění `products`/`maxStep` přes `applyUpgrade`). Výstup: suroviny do inventáře/foodStore, opotřebení zásobníků. Forest/Field/Mine poskytují i mutátory (`increase/decreaseTrees/Animals/Ores/livestock`) volané z `Player.pay/insertInventory` – **zásobníky zdrojů jsou „virtuální měny" platebního systému**.

---

## 6. Ekonomika: zlato, daně, trh, karavany

**Soubory:** `services/market.js` (433 ř.), `services/player.js` (pay/canAfford/insertInventory ř. 122–460), `services/home.js` (daně/upkeep ř. 679–831), `services/config.js` (konstanty).

### Datový model
- **Peníze**: `player.gold` (float). Měnová soustava jen pro zobrazení: cu / ag(=108 cu) / au(=197 ag) / bi(=209 au) (`convertToCurrency`, market.js ř. 213).
- **Inventář zboží**: `player.inventory[itemid]` + `curCapacity`/`maxCapacity` (warehouse; plný sklad → `warehouseFull` flag, další produkce se zahazuje při `limited`).
- **Tržní item** (itemList type `goods`): `{basePrice, available, max, marketPrice, demand, limited, luxury}`. Tržní data v originále přicházejí **ze serveru** (`GET /market`, market.js ř. 263–305) a přepisují basePrice/available/max lokálních položek.
- **Karavana**: `world.home.caravan = {capacity (BASECARAVANCAPACITY=10 000), buy:{}, sell:{}, recGoods, speed, maxSteps, sentOut, ready}`.
- **Platby jsou polymorfní**: `cost`/`products` objekty `{key: amount}`, kde klíč může být gold, surovina zásobníku (trees/ores/animals/livestock/farmland), jídlo (konkrétní druh nebo agregát `food`), techPt, job (=odvede pracovníky) nebo zboží. `Player.pay`/`canAfford`/`insertInventory` dispatchují podle klíče/typu – **jediná univerzální transakční vrstva hry**; vedlejším efektem zapisují consumption/productionHistory (10denní okno) a měsíční reporty.

### Cenotvorba a obchod
- **Dynamická cena**: `calcMarketPrice = round(basePrice × (1.5 − min(available,max)/max)³, 3)` (market.js ř. 124) – kubická křivka podle zásoby trhu: prázdný trh ×3.375, plný ×0.125.
- **Spread**: nákup `marketPrice × haggleBuy (1.35)`, prodej `× haggleSell (0.6)`; techy bookKeeping/tradingHouse spread zužují o 0.1–0.15 (ř. 168–195).
- `getGoldValue(koš)` – ocenění koše zboží tržními cenami (gold 1:1); používá ho AI svět, kontrakty, repair projekty.
- **Karavana** (`sendCaravan`, ř. 354–427): validace kapacity buy i sell ≤ capacity, netto platba předem, `maxSteps = STEPSPERDAY × (30 − speed)` (cesty zrychlují dirtRoad/gravelRoad), odpočet `sentOut` v `Market.step`; po dojezdu `Engine.insert(200, 'caravanReturns')` doručí `recGoods`.

### Daně a upkeep (Home.step, newMonth)
- Tax Center: `+ curRate × curWorkers × TAXCENTERBASE(22)` gold/měsíc (vyšší sazba snižuje awesomeness – `updateAwesomeness` odečítá `taxCenter.curRate`).
- Lokální daně (tech `taxes`): `+ curWorkers × rate` každých 5 dní.
- Inn: `+ round(20 × curWorkers × 30 × (1+rand)/10)` měsíčně.
- Výdaje: City Guard HQ a Hospital `budgetLevels[level].gold × curWorkers`; armáda `WARRIORUPKEEP(108) × warriors + ARCHERUPKEEP(162) × archers` měsíčně.

### Vazby
Vstup: produkce (insertInventory), populace (daně). Výstup: gold pro stavbu/kontrakty/armádu; tržní ceny pro AI ekonomická ratingy. Pozn. pro rebuild: závislost na serverovém `/market` je jediné místo, kde ekonomika není plně klientská.

---

## 7. Budovy a stavba

**Soubory:** `services/config.js` (`buildCityBuildings`, itemList type `building`, `onBuild` callbacky ř. ~872–1300; `scaleCost` ř. 1170), `services/home.js` (`build()` ř. 260–309, mason/projectQueue ř. ~1711–1809, výpočty efektů `calcMaxWorkers/calcFoodCapacity/calcAttractiveness/calcCrime`…), `controllers/masonsguild.js` + `directives/buildingcard.js` (UI).

### Datový model
- **Budova = itemList položka type `building`**: `{cost, baseCost, maxProgress, created, totalMade, instances: [...], effects: {workers?, capacity?, foodCapacity?, attractiveness?, crime?, max<jobid>?, ...}, citySpace/forestSpace/... (zábor plochy), unlocked, category, onBuild?, requires?}`.
- **Instance** budov nesou stav opotřebení (`age`, `inRepair`) – `ageBuildings()` denně, opravy jdou do `home.projectQueue` jako `{type:'repair', instId, cost}` (cena převedená na gold přes `getGoldValue`).
- **Cena roste s počtem**: škálování `baseCost` podle `created` (helper `scaleCost(cost, pct)` násobí všechny složky costu).
- **Stavební fronta**: `home.projectQueue` – projekty zpracovává job `builder` (sloty od `masonsGuild`, paralelismus `mason.maxActiveProjects`, tech masonMultitask); progress do `maxProgress`, pak `created++`, vznik instance, `onBuild()` callback (switch/case inicializace – např. porcelainTower vytváří scholars).
- **Esenciální sklady**: granary (maxFood), warehouse (maxCapacity, `warehouseFull`), builderHut.

### Aktualizace v čase
Stavba i opravy běží v Home.step (builder job v quarterDay bloku); efekty budov se nepřepočítávají průběžně, ale přes `calcAll()` funkce (po stavbě, loadu, levelu).

### Vazby
Vstup: gold + suroviny (cost), unlock z tech stromu/eventů, plocha (`area`/`used`). Výstup: `effects` agregáty do populace/jobů/skladů/attractiveness/crime; odemyká joby a mechaniky. Domy NEjdou přes mason queue, ale přes kontrakty builder companies (kap. 3, 12).

---

## 8. Výzkum (tech strom) a dovednosti

**Soubory:** `services/techs.js` (142 ř.), `config.js: buildTechs()` ř. 1380+ (strom, `techBase=100`, `techScale=1.25`), upgrady ř. 1515–2266; `services/skills.js` (58 ř.); UI `directives/techtree.js`, `techcard.js`, `skillbtn.js`; `controllers/academy.js`, `university.js`.

### Tech strom – datový model
- **Sektory** (itemList type `sector`: agriculture, civil, crafts, forestry, medicine, military): `{curLevel, exp, cap, points, scale, sjobs[]}`. `cap = round(techBase × scale^curLevel)` = `100 × 1.25^level` (Techs.calcCap, ř. 36–38).
- **Strom**: `$rootScope.techTree = {id:'techTreeRoot', children:[{id:'sector_*', obj, children:[{id:tech, obj, cost, children:[...]}]}]}` – hierarchie root→sektor→tech→pod-tech; tech = itemList type `upgrade` s `{cost (sector points), onUnlock, applyUpgrade, checkRequirements, unlocks[]}`.
- Body: dvojí měna – per-sektor `points` (level-up sektoru) a globální `player.techPt`; university může směňovat své `points` do sektorů (`purchasePoint`).

### Aktualizace v čase (Techs.step, denně)
1. **Pasivní exp ze zaměstnanců**: každý pracovník přidává 1 exp/den do sektoru své kategorie (`expPoints['sector_'+job.category] += job.number`); odemčené NPC postavy se sektorem +2.
2. **University scholars**: režim `general` (1 exp všem úrovním scholara + rostoucí šance na university point) nebo specializace (`addExp(s[mode], 6)` + multiplikátor sektorové exp `×(1.25 + 0.1×level)`).
3. `sector.exp ≥ cap` → `points++`, `curLevel++`, nový cap (geometrický růst po 25 %). Profese hráče `scholar` dává ×1.25.
- Nákup techu: zaplať `points` sektoru → `onUnlock`/`applyUpgrade` mutuje itemList (mění products/maxStep/spread/odemyká budovy). **Při loadu se `applyUpgrade` všech unlocked techů přehrává znovu** (game.js ř. 447–470), protože efekty se neukládají.

### Dovednosti (Skills) – datový model a běh
- Skill = itemList type `skill`: `{curStep, maxStep, progPct, progressing, cost?, products?, onStart?, onFull?, discovered}` – ruční „kantrip" akce raného věku (chopWood, hunt, splitWood, forageBerries…).
- `Skills.step()` běží **každý krok** (volá ho Game.run i World.step): u `progressing` skillů `curStep++`; po dosažení `maxStep` → `onFull()`, `products` do inventáře, reset. `start()` vyžaduje discovered + zaplacení cost.

### Vazby
Vstup: pracovní síla (exp), budovy academy/university. Výstup: trvalé modifikace katalogů (produkce, ceny, bojové staty), odemčené budovy/joby. Techy jsou hlavní zdroj **mutací statických dat za běhu** – podstatné pro save model.

---

## 9. AI svět, zóny, diplomacie

**Soubor:** `services/world.js` (1021 ř.); zóny/postavy definované v itemList (type `zone`, `character`), sousednost `neighbours[]` (config.js ~ř. 4144).

### Datový model
- **Zóna** (itemList type `zone`): `{numWorkers, targetWorkerNum, warriors, archers, warriorGrowth, archerGrowth, liege, originalLiege, policy (0 Resource / 1 Growth / 2 Military – ZONEPOLICIES), resources{}, tribute{}, goldStore, goldDemand, goldProduction, favour{faction:int}, neighbours[], curQuest, militaryRating, economicRating, immunity}`. `$rootScope.zones` = pole referencí (lazy build v Battle.getZonesByLiege).
- **Frakce** (itemList type `character`): `theWarlord` (kapitál dickinsonLanding), `thePrincess` (castleGrey), `thePsychopath` (hornCastle), `player` (homeZone), bandits; staty `{aggression, backstab, allies, state, nextTarget, warriors:{strength,defense}, archers:{...}, playerOpinion:{love, awe, fear}}`.
- `AISTATES`: 0 default, 1 growPop, 2 growMil, 3 growRes, 4 prepAttack (odhalitelné špionem), 5 annoAttack, 6 attacking, 7 incapacitated.

### Aktualizace v čase – dvě smyčky
1. **Zone tick (round-robin)** – `World.step()`: perioda 5 dní rozprostřená přes zóny (`dist = ceil(period/zones.length)`; každých `dist` kroků se zpracuje 1 zóna) → `processZone(zone)`:
   - ekonomika: `goldDemand = 150×(warriors+archers)`, `goldProduction = 50×numWorkers`; deficit → čerpání `goldStore`, eskalace `notEnoughGold` (notifikace hráči u vlastních vassalů, pak ztráty lidí/jednotek).
   - politika: Growth = přírůstek populace `~1 %+3` (strop targetWorkerNum → přepne na Resource), tribute do `resources`; Military = růst jednotek dle `warriorGrowth/archerGrowth` × frakční koeficienty (Warlord 1.5/1.3, Princess 0.6/1.6, Psycho 2/0.5), konzumuje pracovníky, 25% šance nákupu jednotek za resources; Resource = `tribute × numWorkers` do poolu, u původního lenníka konverze na gold přes `Market.getGoldValue`.
   - **revolty** (až po `revoltMechanicStart`): dobytá zóna (`liege != originalLiege`) ztrácí `favour[liege]` −2/tick (Growth +1, Military −4; posádka <5 jednotek −2 … ≥1000 +2; domácí zóny frakcí +2); `favour < 5` → revolta, návrat k `originalLiege` (hráči se navíc spustí event `vassalRevolted`). Neutrální zóny drift favour k 0.
   - **questy**: zóny generují žádosti (gold/food/reinforcement) s odměnou favour (+ gold při favour>50), `daysRemaining: 30`.
   - přepočet `militaryRating = warriors×(str×2+def) + archers×(str×2+def) + 10` a `economicRating` (hráč: hodnota inventáře+gold; AI: hodnota resources + numWorkers×1000).
2. **Frakční AI tick** – `processAI(ai)` plánovaný přes schedule (Events.startCheck: perioda 5 dní, aktivace po `AIMechanicStart = STEPSPERDAY×90×7`, fázový posun frakcí 1000/2000/3000 kroků): stavový automat – v `state 0` najde nejslabšího souseda (`findNeighboursOf` přes vlastněné zóny), porovná ratingy (útok zvažuje při převaze >1.5×, jinak growMil/growRes), `aggression` rozhoduje o přechodu do prepAttack; stavy 4/5 = detekce špiony (`player.spy.deployed`, `successRate` → varování `warningAIAttacking`/`dangerAIAttacking`); stav 6 = útok – na hráče `startBattle` (reálná bitva), na AI **RNG resolve** (vzorec se silami jednotek, vítěz `takeOver` za 400 kroků); `redistributeForces` přerozdělí jednotky podle ohrožení sousedy (min. posádky kapitálů per frakce, AI si +10 % jednotek „přičaruje").
- **Tribute sběr**: `gatherTributes()` (plánováno měsíčně přes fns) – vassalové hráče vyplatí `resources` do inventáře; vassalové AI konvertují na gold do kapitálu.

### Vazby
Vstup: kalendář (aktivace), trh (oceňování), špioni, bitvy. Výstup: invaze na hráče, tribute, questy, diplomacie (`favour`, `allies`, `playerOpinion`). `World.step` je zároveň **kompozitní root tick** všech služeb (volá Seasons/Home/Forest/Mine/Field/Skills/Market/Techs.step).

---

## 10. Vojsko a bitvy

**Soubory:** `services/battle.js` (632 ř.), `directives/battlemap.js`, `controllers/battlefight.js`, `controllers/militarycouncil.js`; konstanty config.js ř. 26–32.

### Datový model
- Jednotky hráče jsou čísla na `itemList.homeZone.warriors/archers` (+ jednotky umístěné ve vassalských zónách). Ceny: warrior 1 080 g (108×10), archer 1 620 g (108×15); upkeep 108/162 g měsíčně; městská stráž `CITYGUARDBASE = 56` (budget levels v cityGuardHQ).
- **Bitva = `$rootScope.curBattle`** (jen jedna současně): `{zone, player:{liege, warriors:{number, strength, defense, cd, cdPct, casualties, critChance}, archers:{...}, action}, opponent:{...}, state (0 setup/1 running/2 done), curStep, timer, battleLog[], startingSummary, endSummary}`.
- **Katalog útoků** (battle.js ř. 586–629, statická data): warriors – charge (×1, cd 80, focus warriors→archers), shieldWall (×0, cd 150, 2× defense), flank (×1.8, cd 180, archers→warriors); archers – volley (×0.7, cd 120), fireArrows (×1.5, cd 220).

### Aktualizace v čase – **oddělená real-time smyčka**
- Bitva NEběží na engine kroku, ale vlastním `$interval(tick = 30 ms)` (ř. 224) – druhá časová osa vedle engine. AI protivník útočí automaticky po `reaction` ticích a pak při cd=0; hráč klikáním (UI directive battlemap).
- **Damage model** (ř. 442–443): `damage = ceil(max(√number, number/10) × strength × multiplier × (crit ? 1.5 : 1))`; obrana cíle `defense × min(√(focus, units)/2, …)`; zabití = `damage / defense`, přeliv damage na další focus skupinu. Modifikátory z techů (thumbRing −10 % cd archerů, blessingOfWind +10 % crit).
- **Konec** (`end()`, ř. 298): vítěz dle přeživších; **oživování** padlých hráče `baseRevival 0.15 (+0.15 fieldHospital, +0.1 blessingOfHoney)`, AI náhodně ~12,5 %. Výsledkové větve: obrana vs bandité → loot (gold + zbraně z padlých); prohraná obrana homeZone → bandité raidují inventář dle vzorce demand, AI razie → −50 % goldu, ~1/3 části inventáře, −25 % populace + `immunity = 210` (grace period); prohraná obrana vassalu → `takeOver` frakcí.
- **Zdroje bitev**: `triggerBandit` (cheat/event), `invasions`, AI stav 6, dobývání `smallTribes` (hráčův útok – jednotky se přesunou ze zóny, battleCount statistiky).

### Vazby
Vstup: jednotky (nákup v militarycouncil, mercenary kontrakty), techy (staty), AI svět (invaze). Výstup: změny liege zón, loot/ztráty, militaryExp, achievementy (Centurion/Cohort/Legion).

---

## 11. Příběh, eventy, dialogy, achievementy

**Soubory:** `services/events.js` (425 ř.), `services/dialogue.js` (64 ř., většinou skeleton), `config.js` (`importantEvent` ř. 4281+, eventové definice ř. 4348+, `story` ř. 353–373, achievements ř. 7374–7412), `directives/storyscreen.js`, `controllers/intro.js`, `milontitale.js`.

### Datový model
- **importantEvent** (modální story/dialog systém): `$rootScope.importantEvent[id] = {speakerid, text: fn|string, fn?, options: [{name, cssClass?, fn?, next?, nextDelay?: [steps, eventId]}], used, params}` + runtime `{curEvent, curEventId, loadQueue, animate}`. `load(id)` zobrazí event (typicky zastaví engine), `options.next` řetězí dialogy, `nextDelay` plánuje pokračování přes engine schedule. `used` flag = jednorázovost (jediné, co se ukládá).
- **Kontrakty** (přechodník mezi eventy a ekonomikou): `home.contractQueue` položky `{title, cost, rewardString, expiration (dny), onComplete/onExpire/onReject (string fns ID), params}` – vytváří `Home.insertContract`, UI `contractcard.js`. Všechny nabídky firem, obchodníků, žoldáků jdou tudy.
- **Plánované worldbuilding eventy**: `Events.startCheck()` – po startu/loadu zasadí do schedule pevný scénář v násobcích délky sezóny: 13× `eventPlague`, skriptované expanze frakcí (`eventWarlordCapturesPointAnne` v 2.6 sezóny, … `eventPrincessCapturesAltona` v 2.95), `eventTravellingPhysician`; re-registruje `processAI` smyčky (deduplikace přes `countEvent`).
- **Náhodné/ekonomické eventy** (`Events.setupEvents` → `$rootScope.events.*`): ximniTrader (eskalující ceny 1.25^n), goodsBuyer/goodsSeller (generované koše dle inventáře a tržních cen), marbleSeller (marble/granite balancující pravděpodobnost), mercenaryForHire, mineBuilder/mineExpander, houseBuilder (kap. 3), travellingPhysician. Sebe-replánují se přes `Engine.insert` s náhodným rozptylem.
- **Story**: `story.milontiTale`, `story.julietPursuit` – `{curLine, canStart, started, completed, startNPCid, fn, notification}`; vlastní obrazovka (controller milontitale). `dialogue.js` je nedokončený skeleton – reálné dialogy jedou přes importantEvent.
- **Achievementy**: `achievements[id] = {id, name, description, level, unlocked}` (15 ks; createAchievement ř. 7376) – odemykání je imperativní z příslušných mechanik (level města, počty jednotek, gold, bydlení, přežití roku), ne deklarativní podmínky.
- **Meta**: gamelog (engine), browser Notifications (typy s ikonami), confetti, musicPlayer (config ř. 7177).

### Vazby
Eventy jsou **hlavní lepidlo progrese**: odemykají mapy/mechaniky (foundField, masterBuilder, mineBuilder), dávkují tutoriál (firstVisitTo*, explainSeason), pohánějí story i AI scénář. Vše stojí na engine schedule + string-fns dispatch.

---

## 12. Ukládání a načítání

**Soubory:** `services/game.js` (621 ř.), serverový modul `gamesaves` (REST resource), lz-string; `config.js` (`itemlistbk` backup ř. 230, `linkItemList`).

### Datový model save
`saveObj = { itemList (deep copy), player, engine (vč. curStep, schedule, logs, speed), season, battles, invasions, records, distributeMedicine, nextContractId, tutorials: {id: used}, importantEvent: {id: used, curEventId}, story: {id: {curLine, canStart, completed, started}}, levelUpUI, version }`. **`world` se NEukládá** (zakomentováno, ř. 124) – `world.home/forest/...` jsou současně itemList položky (type place), takže stav projde přes itemList.

### Pipeline
1. **cleanSaveObj** (ř. 257–362): z každé itemList položky smaže statiku (name, description, cost, products, effects, neighbours, baseCost/baseProducts, spoilage, maxStep, type, category…) – ukládá se jen **dynamický stav**; vše smazané se při loadu rekonstruuje z Config katalogů a `link*` funkcí.
2. Serializace: `LZString.compressToBase64(JSON.stringify(saveObj))` → REST `Gamesaves` ($save/$update, jméno „<město> – Moon M, Y"); autosave každých 10 herních dní (z Game.run), lokální fallback zakomentován; `localStorage` drží jen `itemlistbk` (čistý katalog pro diff) a drobnosti.
3. **Load** (`processLoad`, ř. 390–509): decompress → parse → cleanSaveObj (znovu, kvůli starým savům) → **deep-merge do `$rootScope`** (`jQuery.extend(true,…)` po klíčích) → obnova `importantEvent.used` flagů → `fixup()` (migrace dat mezi verzemi: home name, totalMade, deduplikace projectQueue, repair konverze) → `$rootScope.linkItemList()` (znovu naváže objekty, world, joby, techy, zóny) → `checkPlayerDefaults` → **re-aplikace všech unlocked upgradů** (`applyUpgrade` + unlocks) → sanitizace (záporné inventáře na 0, NaN fix `Home.fixNaNs`) → start enginu + `Home.checkSettlementLevel/calcAll`.
4. Protože **schedule se ukládá celý**, naplánované eventy přežijí save/load; `Events.startCheck` po startu doplní chybějící periodické AI eventy (countEvent deduplikace). Online prvky: ukládání na server vyžaduje login (socket.io chat, invite – mimo jádro hry).

### Architektonický princip
Save model = **„stav minus katalog"**: persistuje se delta dynamického stavu nad statickými katalogy + plán událostí; veškerá odvozená data (ceny, efekty, capy, upgrade efekty) se při loadu deterministicky přehrají znovu.

---

## 13. Mapa závislostí mezi mechanikami

```
                         ┌────────────────────────────┐
                         │  Config / itemList katalogy │  (statická data + fns)
                         └─────────────┬──────────────┘
                                       │ čtou všichni
   Game.run ($timeout)                 ▼
        │            ┌──────────────────────────────────┐
        ├─► Engine.step ──► schedule ──► callFn(fns.*)  │  jednorázové eventy,
        │                                               │  AI tiky, kontrakty,
        ├─► World.step  (kompozitní tick)               │  story pokračování
        │     ├─► Seasons.step ──► season.curSeason ────┼──► Forest/Field/Home (sezónní efekty)
        │     ├─► Home.step ◄── jídlo (foodStore) ◄─────┼─── joby/produkce
        │     │     ├─ populace (awesomeness→migrace)   │
        │     │     ├─ joby+produkce ──► Player.insertInventory ──► inventory/foodStore/zásobníky
        │     │     ├─ daně+upkeep ──► player.gold      │
        │     │     ├─ stavba (projectQueue) ──► building.instances ──► effects
        │     │     └─ kontrakty (contractQueue)        │
        │     ├─► Forest/Mine/Field.step (regenerace zásobníků)
        │     ├─► Market.step (karavana, refresh cen ze serveru)
        │     ├─► Techs.step (exp ze zaměstnanců ──► sector points ──► upgrady mutují katalogy)
        │     └─► processZone (round-robin) ──► zóny: ekonomika/politika/revolty/questy
        ├─► Skills.step (progres ručních akcí)
        └─► autoSave ──► Game.save (lz-string → server)

   Events.startCheck ──► schedule: plagues, skriptované výboje frakcí, processAI
   processAI (schedule) ──► AISTATES automat ──► startBattle / RNG resolve / takeOver
   Battle ($interval 30ms, mimo engine!) ◄── jednotky (homeZone) ◄── gold (nákup+upkeep)
        └─► výsledky ──► liege zón, loot, ztráty populace/inventáře
   Trh (calcMarketPrice) ◄── basePrice/available (server /market)
        └─► getGoldValue ──► AI ekonomické ratingy, kontrakty, opravy budov
```

Slovně – vrstvení závislostí (co na čem stojí):

| Mechanika | Závisí na | Poskytuje |
|---|---|---|
| Engine/schedule | – (jen Game.run smyčka) | čas pro vše; doručení eventů |
| Sezóny | engine | modifikátory produkce, plánovací jednotka eventů |
| Player (transakce) | itemList typy | univerzální pay/canAfford/insertInventory pro vše ostatní |
| Produkce (les/pole/důl + joby) | populace, sezóny, budovy (sloty), techy | suroviny, jídlo |
| Jídlo | produkce, sklady (granary) | přežití populace, morálka |
| Populace | jídlo, bydlení (attractiveness), nemoci/crime | pracovní síla, daně, tech exp |
| Ekonomika/trh | produkce, populace, server /market | gold; oceňování pro AI/kontrakty |
| Budovy | gold/suroviny, builder job, unlocky | effects (kapacity, sloty, attractiveness) |
| Tech strom | populace (exp), academy/university | trvalé mutace katalogů |
| Skilly | hráčova akce | early-game produkce |
| Eventy/kontrakty | engine schedule, fns | progrese, odemykání, obchody, story |
| AI svět | aktivační prahy (AIMechanicStart), trh, kalendář | invaze, tribute, questy, diplomacie |
| Vojsko/bitvy | gold (nákup+upkeep), AI svět | obrana/expanze, změny liege |
| Save | itemList diff, schedule | persistence celé hry |

**Centrální uzly** (vše přes ně teče): `$rootScope.itemList` (datový hub), `Player.pay/insertInventory` (transakční hub), `Engine.schedule + fns` (časový hub), `Home.step` (orchestrátor denní simulace).

---

## 14. Architektonicky podstatné vzory originálu (shrnutí)

1. **Step scheduler s dvojím režimem časování** – jednorázové události v `schedule[step]` (serializovatelné, string-ID + params), periodické mechaniky jako modulo testy uvnitř per-service `step()` funkcí volaných každý krok z kompozitního `World.step`. Drift kompenzace v Game.calcRate. Výjimka: bitvy běží na vlastním `$interval` (30 ms) zcela mimo engine čas.
2. **Data-driven katalogy s runtime linkováním** – 16 JSON listů (`listBuildings, listGoods, listJob, listTechs, listZone, …`; config.js ř. 196–225, fetch ze serveru) se mergují do plochého `itemList`; `linkItemList()` → `build*()` funkce doplní defaulty, callbacky a objektové reference (string id → objekt). Důsledek pro rebuild: **plné katalogy nejsou v repu jako soubory** (jen listfood.js + extracted dump), zbytek je nutné dotěžit dle source mapy.
3. **String-callback registr `$rootScope.fns`** – jediný dispatch bod (`callFn`) pro vše plánované; dělí chování na serializovatelné (string ID ve schedule/kontraktech) a neserializovatelné (přímé funkce `onBuild/applyUpgrade` – ty se při loadu přehrávají znovu).
4. **Polymorfní transakční vrstva** – `cost`/`products` objekty `{key: amount}` s klíči napříč doménami (gold, suroviny, jídlo, pracovníci, techPt, zboží); Player.pay/canAfford/insertInventory dispatchují podle klíče → jednotné API pro stavbu, joby, kontrakty, eventy, bitvy, hniloby.
5. **Agregátní simulace** – populace, jednotky, zdroje i zóny jsou čísla, ne entity; per-entity jsou jen budovy-instance (opotřebení) a NPC (story). Naprostá většina dynamiky = denní/měsíční vzorce + RNG.
6. **Save = komprimovaný diff dynamického stavu** – cleanSaveObj odstraní vše statické/odvozené; load = merge + re-link + re-aplikace upgradů + fixup migrace. Schedule se ukládá → budoucí eventy přežijí restart.
7. **Oddělení služeb podle domén je jen částečné** – chování je sice ve službách per doména, ale veškerý stav je globální na `$rootScope` a UI na něj sahá přímo; Home.js navíc slouží jako super-orchestrátor (populace + jídlo + stavba + kontrakty + festivaly + crime + finance).
8. **Serverové závislosti mimo jádro**: tržní data (`GET /market`), gamesaves REST, chat/socket.io. Veškerá simulace jinak běží klientsky.
9. **Klíčová balanční čísla relevantní pro architekturu**: 0.05 s/krok, 900 kroků/den, 91 dní/sezóna, tech `100×1.25^level`, cena trhu `basePrice×(1.5−avail/max)³`, haggle 1.35/0.6, daně `22×rate×workers`/měsíc, upkeep 108/162, karavana 10 000 a `(30−speed)` dní, revolty od dne 700, AI od dne 630 (90×7), strop běhu ~5×10^8 kroků.

---

## 15. Předpoklady a nejistoty

- Plné katalogy (listBuildings/listGoods/listTechs/listZone…) jsou fetchované JSONy, v repu nejsou – tvrzení o jejich struktuře vychází z linkovacích funkcí v config.js a z `extracted/rootscope-raw-dump.json`; konkrétní položky a čísla balancu je při rebuildu nutné dotěžit z runtime dumpu.
- `dialogue.js` a `academy.js`/`tinkery.js` služby jsou skeletony – reálná logika žije v config.js (importantEvent) a controllerech; analýza to reflektuje.
- Mrtvý/zakomentovaný kód (tradingHouse ordery v market.js, lokální save fallback) popsán jen tam, kde dokládá zamýšlený model.
