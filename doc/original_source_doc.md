# Prosperity – kompletní popis původní hry (reverse-engineering)

> **Účel dokumentu:** úplný, samostatný popis původní hry „Prosperity" (v0.9.5) jako
> podklad pro **věrný rebuild**. Vznikl reverse-engineeringem živé webové verze.
> Doprovodná syrová data a kompletní zdroj jsou v `doc/original_source/`.

---

## 0. Provenance

| | |
|---|---|
| Zdroj | <https://prosperity-web.dsolver.ca/> |
| Staženo | 2026-06-12 |
| Verze | **0.9.5** (`a/b/1 . update . patch`) |
| Stack originálu | AngularJS 1.x (MEAN.js), socket.io, lz-string, d3, jQuery/jQuery-UI, angular-material + bootstrap, font-awesome/iconmoon |
| Komunita | r/ProsperityGame (odkaz v herním logu) |

**Autorství:** jde o cizí hru. Tento materiál je reference pro reimplementaci, ne k převzetí
1:1. Při veřejném vydání je nutné vyřešit licenci a přepracovat chráněný obsah (jména,
příběh, grafika). Viz `doc/original_source/PROVENANCE.md`.

---

## 1. Co to je za hru

Středověká **ekonomická simulace městského státu v reálném čase** (s pauzou). Hráč vede
osadu od hrstky lidí k městu/říši. Vrstvy hry, jak postupně narůstají:

1. **Přežití & produkce** – jídlo, dřevo, ruda, populace.
2. **Ekonomika** – zlato, daně, trh s dynamickými cenami, karavany.
3. **Růst** – bydlení, budovy, výzkum (tech strom), dovednosti.
4. **Pozdní hra** – AI sousedé, diplomacie, revolty, vojsko a bitvy.
5. **Příběh & meta** – intro/tutoriál, dialogy, achievementy, ukládání.

Žánrově blízko **Banished / The Settlers / Kittens Game** – je to **builder/management**,
nikoli klikací idle.

---

## 2. Čas, engine, sezóny

### Engine (`services/engine.js`)
Krokový simulátor: globální čítač `curStep` a plán událostí
`schedule[step] = [{ id, params }]`. Každý krok engine spustí naplánované funkce přes
`$rootScope.callFn(id, params)`. Funkce se plánují přes `insert(start, funcId, params)` /
`once(start, funcId)`.

| Konstanta | Hodnota | Význam |
|---|---|---|
| `BASEENGINERATE` | `0.05` s/krok | ~20 kroků za sekundu reálného času |
| rychlosti | Pause / 1× / 2× | 2× = `rate / 2`; Pause zastaví engine |
| `slowRate` | `2.8` | zpomalené pasáže |
| `STEPSPERDAY` | `900` | kroků na herní den |
| `maxStep` | `5×10^8` | ~5 herních let |

### Kalendář a sezóny (`services/seasons.js`)
- Den (900 kroků) → měsíc (30 dní) → rok (12 měsíců).
- **4 sezóny**, každá **91 dní** → `stepsPerSeason = 900 × 91 = 81 900` kroků.
- Pořadí: Spring → Summer → Autumn → Winter → (rok+1).
- **Start hry:** `Winter`, den `16`, měsíc `12`, rok `922`.
- Sezóna ovlivňuje produkci (např. pole v zimě neprodukuje).

---

## 3. Populace a bydlení

- Obyvatelé jsou **workers** (+ bojové jednotky warriors/archers). Mají jména a úkoly
  (`directives/jobtasks.js`, `person.js`).
- **Úmrtí** – 14 příčin (`CAUSESOFDEATH`), od „bad accident" po „died of boredom, literally"
  či „smoking weird herbs picked up in the forest" (humorný tón hry).
- **Bydlení – tiery** (`houseTypes`, potvrzená čísla z dat):

  | typ | workers | capacity | attractiveness |
  |---|---:|---:|---:|
  | tent | 3 | – | 0 |
  | hovel | 3 | 200 | −1 |
  | house | 5 | 600 | 0 |
  | mansion | 6 | 1 000 | +4 |
  | manor | 10 | 1 400 | +8 |
  | chateau | 20 | 3 000 | +25 |
  | estate | 20 | 10 000 | +100 |
  | publichouse | 25 | 3 000 | −10 |

  - `workers` = pracovní sloty, `capacity` = strop populace, `attractiveness` = vliv na
    příliv/odliv obyvatel (vyšší = víc lidí přichází).
- **Pozdní mechaniky populace:**
  - `revoltMechanicStart = STEPSPERDAY × 700` – aktivace revolt.
  - `AIMechanicStart = STEPSPERDAY × 90 × 7` – aktivace AI soupeřů.

---

## 4. Suroviny, jídlo, ekonomika

### Suroviny a jídlo
- **Jídlo** (`lists/listfood.js`): `bread, cheese, fish, fruit, meat, vegetable`. Sytí
  populaci. Skladuje se v **granary** a **časem hnije** → nutná udržitelná produkce, ne
  hromadění.
- **Dřevo** – les; strom dospívá `TREEMATURETIME = 36` (kroků/jednotek).
- **Ruda / kámen** – důl. Dále nářadí a další zboží.

### Peníze a daně
| Konstanta | Hodnota |
|---|---|
| `TAXCENTERBASE` | 22 |
| `CITYGUARDBASE` | 56 |
| `BASECARAVANCAPACITY` | 10 000 |

### Trh (`services/market.js`)
- **Dynamická cena podle nabídky:**
  `cena = round( basePrice × (1.5 − min(available, max) / max)^3 , 3 )`.
  Čím víc je zboží na trhu (`available` blíž `max`), tím nižší cena – a naopak.
- `getGoldValue(koš)` ocení koš zboží (gold se počítá 1:1).
- **Karavany** vozí zboží mezi zónami; kapacita `BASECARAVANCAPACITY`.

### Builder companies (`companies`, potvrzené ceny)
- **houseBuilder** (staví domy daného typu):
  | firma | typ | cena |
  |---|---|---|
  | Kutting Korners | hovel | 2 000 g |
  | Bricking Bad | house | 9 000 g |
  | Honestly Good | mansion | 30 000 g |
  | Lawyered Up Conglomeration | manor | 200 000 g |
- **mineBuilder:** Strike Gold Inc. – 10 000 g + 2 400 wood.
- **explorer:** The Explorers – zpřístupní mapy `field, market, academy, tinkery, council`.

---

## 5. Budovy

- **Esenciální budovy:** `granary` (sklad jídla), `warehouse` (sklad zboží – může se
  naplnit, `warehouseFull`), `builderHut`.
- Budovy jsou položky v `$rootScope.itemList` s `cost` / `baseCost`. Cena typicky **roste
  s počtem** (`scaleCost`, škálování `baseCost`). Stavba přes `$rootScope.build(obj)`.
- Servisní budovy (`serviceBuildings`) + domy (viz výše).

---

## 6. Výzkum (tech strom) a dovednosti

### Tech strom (`services/techs.js`, `config.js: techTree`)
- Výzkum je rozdělen do **sektorů** s úrovněmi (`curLevel`, `scale`).
- **Cena bodů:** `cost = round( techBase × scale^curLevel )` s **`techBase = 100`** a
  **`scale = 1.25`** → každá úroveň je o 25 % dražší.
- Hráč utrácí **`techPt`** (technologické body). UI: `directives/techtree.js`, `techcard.js`.
- Vědění se získává přes **academy** a **university**.

### Dovednosti (`services/skills.js`)
- Dovednost **progreduje** (`curStep / maxStep → progPct`). Po dokončení:
  - vloží `products` do inventáře (`Player.insertInventory`),
  - může mít `cost` (zaplatí se na startu) a callbacky `onStart` / `onFull`.
- Spuštění vyžaduje, že je dovednost **„discovered"** a hráč si může dovolit cenu.

---

## 7. Vojsko a AI svět (pozdní hra)

### Jednotky
| Jednotka | Cena | Upkeep |
|---|---|---|
| warrior | 1 080 g (`108×10`) | 108 |
| archer | 1 620 g (`108×15`) | 162 (`round(108×1.5)`) |

Plus městská stráž (`CITYGUARDBASE`).

### AI svět (`services/world.js`)
- Svět je rozdělen na **zóny** s politikami `ZONEPOLICIES`:
  **Growth** (růst populace) / **Resource** (suroviny) / **Military** (armáda).
- Zóny mají AI stavy (`AISTATES`), produkují/spotřebovávají zdroje, generují armády a
  podle populace a zlata **mění politiku** nebo se dostávají do krize.
- **Frakce:** `theWarlord`, `thePsychopath`, `thePrincess`, `player`.
- Zóny mohou **revoltovat** proti svému lennímu pánovi (`liege`).

### Bitvy (`services/battle.js`, `directives/battlemap.js`, controller `battlefight`)
- **Bandité** (`triggerBandit`), **invaze** (`invasions`), dobývání malých kmenů
  (`smallTribes`). Bitevní mapa, počítání `battleCount`.

---

## 8. Oblasti / obrazovky

`maps = [ main, home, forest, mine, field, market, tinkery, academy, council ]`
plus controllery: `pub`, `masonsguild`, `militarycouncil`, `wall`, `reliquary`,
`university`, `intro`, `devlog`, `milontitale` (příběh), `initializing`.

UI komponenty (`directives/`): `buildingcard`, `techcard`, `techtree`, `contractcard`,
`battlemap`, `inventory`, `jobtasks`, `person`, `progressbar`, `sector`, `storyscreen`,
`skillbtn`, `hint`, `confetti`.

---

## 9. Příběh, eventy, meta

- **Intro / tutoriál**, story screeny (`directives/storyscreen.js`), postavy a dialogy
  (`services/dialogue.js`), eventy (`services/events.js`), devlog.
- **Achievementy (15):**
  `achieveSettlement` („Settled Down"), `achieveVillage`, `achieveTown`, `achieveCity`,
  `achieveCenturion`, `achieveCohort`, `achieveLegion`, `achieveBenevolence`,
  `achieveFeared`, `achieveMight`, `achieveGoldHoarder`, `achieveLuxury`,
  `achieveExtravagance`, `achieveUnhygienic`, `achievementSurvivedWinter`
  („A year has passed and you have not given up").
- **Notifikace** (herní log + browser Notifications), **confetti**, **hudba**
  (`musicPlayer`).
- **Ukládání** (`services/game.js`, modul `gamesaves`): lokální i serverové,
  **lz-string** komprese, autosave. Náznaky online prvků (socket.io, invite kódy).

---

## 10. Source map – kde co v originále hledat

Cesty relativně k `doc/original_source/`.

| Systém | Soubor |
|---|---|
| Konstanty, houseTypes, companies, season, engine, techTree, achievements, story | `modules/prosperity/services/config.js` |
| Herní smyčka / scheduler | `modules/prosperity/services/engine.js` |
| Sezóny | `modules/prosperity/services/seasons.js` |
| Populace, inventář, platby, jídlo | `modules/prosperity/services/player.js` |
| Trh, ceny, karavany | `modules/prosperity/services/market.js` |
| Les / Pole / Důl (produkce) | `services/forest.js`, `field.js`, `mine.js` |
| Domov / budovy | `services/home.js`, `config.js` |
| Výzkum | `services/techs.js`, `controllers/academy.js`, `university.js` |
| Dovednosti | `services/skills.js` |
| AI svět, zóny, diplomacie | `services/world.js` |
| Bitvy | `services/battle.js`, `directives/battlemap.js`, `controllers/battlefight.js` |
| Eventy / příběh / dialogy | `services/events.js`, `dialogue.js`, `directives/storyscreen.js` |
| Ukládání | `services/game.js`, modul `gamesaves` |
| Inventář / tinkery (řemeslo) | `services/item.js`, `tinkery.js`, `controllers/tinkery.js` |
| Náhoda | `services/rand.js` |
| UI komponenty | `modules/prosperity/directives/*` |
| Formátování (čísla/měna/markdown) | `modules/prosperity/filters/*` |

---

## 11. Přiložená syrová data (`doc/original_source/`)

| Cesta | Obsah |
|---|---|
| `modules/prosperity/**` | Kompletní herní modul originálu (69 souborů) – autoritativní zdroj |
| `application-config.js` | Root app config originálu |
| `index.html` | Původní HTML shell (seznam všech assetů) |
| `PROVENANCE.md` | Původ a poznámka k autorství |
| `extracted/config-extract.json` | Kurátorovaný strojový výtah statické konfigurace (houseTypes, companies, achievements, season, engine konstanty, techScale, CAUSESOFDEATH…) |
| `extracted/rootscope-raw-dump.json` | Syrový dump `$rootScope` z runtime extrakce (širší, vč. pomocných struktur) |

**Jak vznikl výtah:** stažen herní modul, statická konfigurace vytažena Node harness, který
stubuje AngularJS a spustí službu `Config` (+ `reset`/`linkItemList`) a serializuje
`$rootScope`. Dynamicky stavěné katalogy (budovy/zboží/techy) se těží přímo ze zdroje dle
source mapy výše.

---

## 12. Pozn. k rebuildu

Cíl je **mobile-first PWA hratelná offline** (viz `.aiworkflow/zadani_projektu.md`).
Přenášíme **mechaniky a balanc**, nikoli implementaci – původní AngularJS se nepřebírá 1:1.
Návrh pořadí iterací: engine+čas+sezóny → populace+bydlení+jídlo → produkce surovin →
ekonomika+trh → výzkum+dovednosti → budovy+stavba → AI svět+vojsko+bitvy → příběh+meta+save.
