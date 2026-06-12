# Prosperity – Design & Mechaniky (reverse-engineering originálu v0.9.5)

> Zdroj: <https://prosperity-web.dsolver.ca/>, staženo 2026-06-12. Plný zdroj v
> `prosperity-original/`, strojový výtah v `extracted/config-extract.json`.
> Tento dokument je analýza pro **věrný rebuild** – co hra dělá, s potvrzenými čísly
> a odkazy, kde data v originále žijí (source map).

## 1. Žánr a jádro
Středověká **ekonomická simulace městského státu** v reálném čase (real-time s pauzou).
Hráč vede osadu od pár lidí k městu/říši: produkce surovin a jídla, populace a bydlení,
výzkum (tech strom), obchod (trh + karavany), a v pozdní hře diplomacie, vojsko a bitvy
proti AI frakcím. Není to klikací idle – je to **management/builder** (žánrově blízko
Banished / The Settlers / Kittens Game).

## 2. Čas, engine, sezóny
- **Step-based engine** (`services/engine.js`): globální `curStep`, plán událostí
  `schedule[step] = [{id, params}]`, každý krok se spustí naplánované funkce přes
  `$rootScope.callFn`.
- `BASEENGINERATE = 0.05 s/step` → ~20 kroků/s. Rychlosti: **Pause / 1× / 2×**
  (2× = rate/2). `slowRate = 2.8` pro zpomalené pasáže.
- **STEPSPERDAY = 900**. Den → měsíc (30 dní) → rok (12 měsíců).
- **Sezóny** (`services/seasons.js`): Spring/Summer/Autumn/Winter, každá **91 dní**
  (`stepsPerSeason = 900 × 91 = 81 900` kroků). Start hry: **Winter, 16. den, měsíc 12,
  rok 922**. Sezóna ovlivňuje produkci (pole v zimě neprodukuje atd.).
- `maxStep ≈ 5×10^8` (~5 herních let).

## 3. Populace a bydlení
- Lidé = **workers** (+ jednotky: warriors, archers). Lidé mají jména, úkoly (`jobtasks`),
  mohou **umřít** (14 příčin, `CAUSESOFDEATH`).
- **Bydlení – tiery** (`houseTypes`, potvrzená čísla):

  | typ | workers | capacity | attractiveness |
  |---|---|---|---|
  | tent | 3 | – | 0 |
  | hovel | 3 | 200 | −1 |
  | house | 5 | 600 | 0 |
  | mansion | 6 | 1000 | +4 |
  | manor | 10 | 1400 | +8 |
  | chateau | 20 | 3000 | +25 |
  | estate | 20 | 10000 | +100 |
  | publichouse | 25 | … | −10 |

  `attractiveness` ovlivňuje příliv/odliv lidí; `capacity` strop populace; `workers`
  počet pracovních slotů.
- **Pozdní mechaniky**: `revoltMechanicStart` (revolty), `AIMechanicStart`
  (`STEPSPERDAY × 90 × 7`) – aktivace AI soupeřů.

## 4. Suroviny, jídlo, ekonomika
- **Jídlo** (`lists/listfood.js`): bread, cheese, fish, fruit, meat, vegetable. Sytí
  populaci; granary skladuje a **jídlo časem hnije** (nutná udržitelná produkce).
- **Suroviny**: wood (les; strom zraje `TREEMATURETIME = 36`), ore/kámen (důl), nářadí,
  a další zboží.
- **Gold** + **daně**: `TAXCENTERBASE = 22`, městská stráž `CITYGUARDBASE = 56`.
- **Trh** (`services/market.js`): dynamická cena podle nabídky –
  `cena = basePrice × (1.5 − min(available,max)/max)^3` (zaokrouhleno). `getGoldValue`
  oceňuje koš zboží; **karavany** (`BASECARAVANCAPACITY = 10000`) vozí zboží mezi zónami.
- **Builder companies** (`companies`, potvrzené ceny):
  - houseBuilder: Kutting Korners (hovel, 2 000 g) → Bricking Bad (house, 9 000 g) →
    Honestly Good (mansion, 30 000 g) → Lawyered Up (manor, 200 000 g).
  - mineBuilder: Strike Gold Inc. (10 000 g + 2 400 wood).
  - explorer: The Explorers (zpřístupní mapy field/market/academy/tinkery/council).

## 5. Budovy
- **Esenciální**: `granary` (sklad jídla), `warehouse` (sklad zboží, může se naplnit),
  `builderHut`. Plus servisní budovy a domy.
- Budovy jsou položky v `$rootScope.itemList` s `cost`/`baseCost`; cena typicky roste
  s počtem (`scaleCost`, `baseCost` se škáluje). Stavba přes `$rootScope.build`.

## 6. Výzkum / tech strom
- **Sektory** výzkumu s úrovněmi; cena bodů: `cost = round(techBase × scale^curLevel)`
  s **`techBase = 100`**, **`scale = 1.25`** (`services/techs.js`, `config.js`). Hráč
  utrácí `techPt`. Tech strom (`techTree`) + UI `directives/techtree.js`, `techcard.js`.
- Oblasti vědění přes **academy** a **university**.

## 7. Dovednosti (skills)
- `services/skills.js`: dovednost progreduje (`curStep`/`maxStep` → `progPct`), po
  dokončení vloží `products` do inventáře, může mít `cost` a `onStart/onFull` callbacky.
  Spuštění vyžaduje, že je dovednost „discovered" a hráč si může dovolit cenu.

## 8. Vojsko a diplomacie (pozdní hra)
- Jednotky: **warrior** (cena `108×10` g, upkeep 108), **archer** (cena `108×15` g,
  upkeep `round(108×1.5)`). Městská stráž.
- **AI svět** (`services/world.js`): zóny s politikami `ZONEPOLICIES`
  (Growth / Resource / Military), stavy `AISTATES`, frakce **theWarlord, thePsychopath,
  thePrincess, player**. Zóny rostou, generují armády, mění politiku podle populace/zlata,
  mohou **revoltovat**.
- **Bitvy** (`services/battle.js`, `directives/battlemap.js`, controller `battlefight`):
  bandité (`triggerBandit`), invaze, dobývání malých kmenů (`smallTribes`).

## 9. Oblasti / obrazovky (mapy)
`maps = [main, home, forest, mine, field, market, tinkery, academy, council]` + další
controllery: pub, masonsguild, militarycouncil, wall, reliquary, intro, devlog,
milontitale (příběh). UI: angular-material/bootstrap, font-awesome/iconmoon, d3 (grafy).

## 10. Příběh, eventy, UX
- **Intro/tutoriál**, story screeny (`directives/storyscreen.js`,
  `services/dialogue.js`), postavy a dialogy, **achievementy** (15: settlement→village→
  town→city, centurion/cohort/legion, benevolence/feared/might, goldHoarder/luxury/
  extravagance, unhygienic, survivedWinter), confetti, herní log, browser notifikace,
  hudba (`musicPlayer`).
- **Ukládání**: lokální i serverové (`services/game.js`, modul `gamesaves`), **lz-string**
  komprese, autosave; náznaky online prvků (socket.io, invite kódy).

## 11. Source map (kde co v originále hledat)
| Systém | Soubor (v `prosperity-original/`) |
|---|---|
| Konstanty, houseTypes, companies, season, engine, techTree, achievements | `modules/prosperity/services/config.js` |
| Herní smyčka / scheduler | `modules/prosperity/services/engine.js` |
| Sezóny | `modules/prosperity/services/seasons.js` |
| Populace, inventář, platby, jídlo | `modules/prosperity/services/player.js` |
| Trh, ceny, karavany | `modules/prosperity/services/market.js` |
| Les / Pole / Důl (produkce surovin) | `services/forest.js`, `field.js`, `mine.js` |
| Výzkum | `services/techs.js`, `controllers/academy.js`, `university.js` |
| Dovednosti | `services/skills.js` |
| AI svět, zóny, diplomacie | `services/world.js` |
| Bitvy | `services/battle.js`, `directives/battlemap.js` |
| Eventy / příběh / dialogy | `services/events.js`, `dialogue.js`, `directives/storyscreen.js` |
| Ukládání | `services/game.js`, modul `gamesaves` |
| UI komponenty | `modules/prosperity/directives/*` |

## 12. Doporučené pořadí rebuildu (návrh pro orchestrátora)
1. **Jádro smyčky + čas + sezóny** (engine, step scheduler, pauza/rychlosti).
2. **Populace + bydlení + jídlo** (workers, houseTypes, granary, hlad/úmrtí).
3. **Produkce surovin** (les/pole/důl) + sklady (warehouse/granary).
4. **Ekonomika a trh** (gold, daně, dynamické ceny, karavany).
5. **Výzkum (tech strom)** + dovednosti.
6. **Budovy & stavba** (builder companies, scaling cen).
7. **AI svět + diplomacie + vojsko + bitvy**.
8. **Příběh, achievementy, eventy, UX, ukládání/offline**.

> Pozn.: rebuild stavíme jako **mobile-first PWA, offline** (viz `zadani_projektu.md`).
> Stack je předmětem architektonické iterace – původní AngularJS NEpřebíráme 1:1,
> přenášíme **mechaniky a balanc**, ne implementaci.
