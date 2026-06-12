# Prosperity – refactoring kandidáti: údržba & architektura (T-002b)

- **Task**: T-002b, iter-001
- **Autor**: architect
- **Datum**: 2026-06-12
- **Navazuje na**: `analysis_keymechanics_iter-001_T-001.md` (dále jen **T-001**) – popis mechanik a mapa závislostí tam, zde jen hodnocení. Kapitoly cituji jako „T-001 §13" apod.
- **Sesterský dokument**: T-002a (výkon / save-offline / server) – záměrně zde NEpokrýváme.
- **Zdroj**: `doc/original_source/modules/prosperity/` (cesty níže relativní k této složce; čísla řádků dle v0.9.5).

> Cíl: identifikovat, **co z architektury originálu nepřenášet** do rebuildu (mobile-first PWA, logika oddělená od UI, data-driven obsah – viz `zadani_projektu.md`), a co místo toho. Žádná implementace.

**Legenda odhadů**: Riziko = pravděpodobnost, že vzor způsobí chyby/zpomalí vývoj rebuildu, pokud bude převzat. Úsilí = náročnost navrhované alternativy v rebuildu (greenfield – neplatíme za přepis originálu, jen za návrh + disciplínu).

---

## A. Provázanost – centrální uzly (T-001 §13)

### A1. `$rootScope` jako globální mutable herní stav — **High**
**Problém.** Veškerý stav (itemList, player, engine, season, world, battles…) žije na jednom globálním objektu, na který sahá každá vrstva. Hustota referencí: `services/config.js` 762×, `services/home.js` 283×, `services/player.js` 117×, `services/game.js` 95× – a dále controllery/direktivy přes two-way binding. Neexistuje hranice „kdo smí co mutovat": UI zapisuje přímo do simulace, simulace do UI flagů (`levelUpUI` je dokonce součást save – `game.js:148`).

**Dopad.** (a) Nelze izolovaně testovat žádnou mechaniku – každý test potřebuje celý svět. (b) Každá změna tvaru stavu je potenciálně breaking pro neznámou množinu čtenářů. (c) Save model musí ručně vyjmenovávat, co ze sdíleného blobu je stav a co ne (viz `cleanSaveObj`, T-001 §12) – třídění stav/statika/UI je dnes implicitní znalost v hlavě autora.

**Alternativa.** Jediný kořenový **state objekt vlastněný simulací** (plain data, serializovatelný by-design), mutovaný výhradně přes doménové systémy (funkce `system(state, ...)`); UI dostává state read-only (render ze snapshotu / selektory) a do simulace mluví jen přes **command API** (intents: `build(id)`, `setRation(level)`, `sendCaravan(order)`…). UI-only stav (otevřené panely, animace) žije mimo herní state a neukládá se.
**Riziko při převzetí: vysoké. Úsilí alternativy: střední** (jde o disciplínu návrhu, ne o extra technologii).

### A2. `Home.step` jako super-orchestrátor — **High**
**Problém.** `services/home.js` (2 665 ř.) v jedné step funkci (ř. ~595–1923, ~1 300 ř.) řeší migraci, joby+produkci, nehody, jídlo, palivo, nemoci, zločin, daně, upkeep, stavbu (projectQueue), kontrakty (contractQueue), festivaly, finanční reporty – tedy ~8 domén, které spolu věcně nesouvisí, propletených sdílenými lokálními proměnnými a modulo-checkpointy (T-001 §3). Produkční logika jobů je uvnitř Home, ačkoli zdroje spravují Forest/Field/Mine.

**Dopad.** Nejrizikovější soubor na změny: úprava jídla může rozbít stavbu, protože sdílí scope a pořadí vedlejších efektů. Pořadí výpočtů v rámci dne je nedokumentovaný kontrakt (efektivita → joby → jídlo → daně…), který se při údržbě snadno poruší. Pro rebuild po iteracích (zadání: „dělit do mnoha iterací") je to nejhorší možný tvar – nelze dodat „jen jídlo" bez celého Home.

**Alternativa.** Rozpad na samostatné systémy s explicitním, **centrálně deklarovaným pořadím ticku**: `tickOrder = [seasons, production, food, housing, health, crime, economy, construction, contracts, …]`, každý systém má vlastní modul, vlastní část stavu a deklarovanou periodu (viz B-vrstva: periodicita jako data, ne modulo testy rozeseté v kódu). Pořadí dne se stane čitelným a testovatelným artefaktem.
**Riziko: vysoké. Úsilí: střední.**

### A3. Čtyřnásobně duplikovaný transakční dispatch v Player — **High**
**Problém.** Klíčový hub `Player` má **čtyři nezávislé copy-paste dispatchery** podle klíče costu: `pay` (ř. 122), `canAfford` (ř. 259), `insertInventory` (ř. 373), `count` (ř. 82) – každý s vlastním, ručně udržovaným výčtem klíčů. Už dnes jsou rozjeté, ověřeno ve zdroji:
- `canAfford` zná jídlo jen jako `'fruit'|'cheese'|'bread'|'meat'|'vegetable'` (ř. 290) – **`fish` chybí** (katalog `lists/listfood.js` fish má) → fish propadne do default větve `count()`, která jej náhodou řeší správně; ale joby zná `canAfford` jen `farmer|miner|lumberjack|hunter|bum`, zatímco `count` navíc `apothecary|tinkerer|researcher` a `pay` dispatchuje obecně přes `type == 'job'`. Tři různé pravdy o téže sémantice.
- `insertInventory`: chybí-li měsíční report, vytvoří **lokální osiřelý objekt** (`curMonthlyReport = {...}` bez zápisu zpět, ř. 376–381) → produkce toho měsíce se tiše nezaúčtuje; `pay` to dělá správně (přiřazuje do `$rootScope.world.council.monthlyReports[...]`, ř. 126).
- `pay` ve větvi `food`: `player.foodVariety = 0` a hned `~~(value / $rootScope.player.foodVariety)` (dělení nulou; proměnná je mrtvá, ale ukazuje stav údržby).

**Dopad.** Každý nový typ zdroje = 4 místa k editaci; zapomenutí = tichá nekonzistence mezi „můžu si to dovolit" a „zaplať" (klasický zdroj duplikací/ztrát zdrojů). Účetnictví (monthlyReports, consumption/productionHistory) je vedlejší efekt zapletený do dispatch větví – nejde vypnout/testovat zvlášť.

**Alternativa.** Jediná **registry-based resource vrstva**: mapa `resourceHandlers[kind] = {get, add, remove, capacity?}` odvozená z katalogu (typ položky určuje handler), nad ní generické `canAfford = ∀k: get(k) ≥ cost[k]`, `pay = ∀k: remove(k)`, `grant = ∀k: add(k)`. Účetnictví jako **observer transakcí** (každá transakce emituje `{key, amount, cause, day}` a reporty se skládají z těchto událostí), ne jako inline mutace.
**Riziko: vysoké. Úsilí: nízké–střední** (jedna tabulka + 3 generické funkce; v greenfieldu levné).

### A4. `itemList` jako univerzální heterogenní hub — **Med**
**Problém.** Jedna plochá mapa míchá ~10 typů entit (building/job/goods/food/zone/character/skill/upgrade/place/policy…), rozlišovaných runtime polem `type`; položky `world.home/forest/...` jsou zároveň „places" v itemListu i kořeny stavu (T-001 §12). Spotřebitelé dispatchují `if (item.type == ...)` a spoléhají, že položka má pole svého typu. Kolize ID napříč typy nic nehlídá; překlepy v ID končí `console.log('no such item')` až za běhu.

**Dopad.** Žádná typová kontrola tvaru položek; přidání pole jednomu typu „prosakuje" do generických smyček přes celý itemList (např. `cleanSaveObj` musí znát sjednocení polí všech typů). Refaktor jednoho typu vyžaduje audit všech generických iterací.

**Alternativa.** **Katalogy per typ** (`catalog.buildings`, `catalog.jobs`, …) se schématem (validace při loadu dat – v JS stačí runtime validátor, ideálně TS typy), + tenký společný index `byId` pro místa, která opravdu potřebují lookup napříč. Oddělit **katalog (immutable definice)** od **stavu instance** (počty, progress) – viz D3, řeší to zároveň save model (T-002a).
**Riziko: střední. Úsilí: střední.**

### A5. `Engine.schedule + fns` jako jediný časový hub pro nesourodé domény — **Med**
**Problém.** Schedule mísí eventy story, AI tiky, kontraktové expirace i návraty karavan v jednom `{step: [{id, params}]}` (T-001 §1). Periodika je naopak rozprostřená jako modulo testy uvnitř `step()` služeb. Kdo a kdy co plánuje, není nikde vidět pohromadě; deduplikace je ad-hoc (`once`, `countEvent` + re-registrace v `Events.startCheck`).

**Dopad.** Dvojí časový režim (schedule vs modulo) = dvě místa, kde hledat „proč se X stalo/nestalo"; opomenutá re-registrace po loadu znamená tiše mrtvou smyčku (originál to záplatuje `countEvent` heuristikou). Rozšíření o novou periodickou mechaniku vyžaduje znalost konvence, ne API.

**Alternativa.** Jeden **deklarativní scheduler**: periodické úlohy jako data (`{id, every: 'day'|'quarterDay'|steps, system}`) registrované při startu (idempotentní – řeší i load), jednorázové eventy jako dnes (serializovatelný `{step, id, params}`), ale s validací `id` proti registru už při insertu (viz B1).
**Riziko: střední. Úsilí: nízké.**

---

## B. Křehkost dispatchů a load pipeline

### B1. String-callback `callFn`/`fns` selhává tiše — **High**
**Problém.** Registr `$rootScope.fns` (config.js ř. 2383–3931, **~146 funkcí / ~1 550 ř.** v jednom objektovém literálu) + dispatcher `callFn` (ř. 3933):
```js
if ($rootScope.fns[fn]) { ... } else { console.log('bad fn or params: ', fn, params); }
```
Překlep v ID (při `Engine.insert`, v kontraktech `onComplete/onExpire/onReject`, v `nextDelay` eventů, v `evalPreconditions` – ř. 3966 stejný vzor) se projeví **až v okamžiku vykonání**, jen jako console log; `Engine.step` navíc každé vykonání balí do try/catch s `console.error` (engine.js ř. 243–246) – událost zmizí, hra běží dál v tiše nekonzistentním stavu. Kontrakt „params must be primitive!" je vynucen pouze komentářem (ř. 2380).

**Dopad.** Přesně třída chyb, kterou hráč nahlásí jako „karavana se nevrátila / kontrakt nic neudělal" a vývojář nemá stopu. Refaktor jména funkce = grep přes stringy v 7 500ř. souboru + v datech eventů. Nulová typová bezpečnost parametrů (serializace přes save může tvar tiše změnit).

**Alternativa.** Ponechat princip string-ID (je správný kvůli serializaci schedule – T-001 §14.3), ale: (1) **registr jako modul** s `register(id, handler, paramsSchema?)`, (2) **fail-fast validace ID při plánování** (insert neznámého ID = vyhozená chyba v dev, telemetrie v prod), (3) vykonání bez polykajícího catch-all – chybu logovat strukturovaně vč. stepu a payloadu a event nechat replayovatelný; (4) parametry validovat schématem nebo aspoň `structuredClone`-testem při insertu (vynutí serializovatelnost).
**Riziko: vysoké. Úsilí: nízké** – pár desítek řádků infrastruktury, hlavní práce je disciplína registrace.

### B2. `config.js` jako 7 500ř. closure „všechno vidí všechno" — **High**
**Problém.** Konstanty, itemList buildery, `fns`, eventy, story, achievementy i utility žijí v jedné funkci/scope. `fns` funkce volají napřímo cokoli z closure i z `$rootScope`; hranice mezi daty a chováním neexistuje (datové definice eventů obsahují inline funkce `text: fn`, `options[].fn`).

**Dopad.** Není možné načíst „jen data" bez chování (blokuje data-driven cíl zadání); každá změna v souboru riskuje konflikt s čímkoli; mrtvý kód je neodhalitelný. Pro multi-agent vývoj (paralelní tasky) je to single-file bottleneck.

**Alternativa.** Rozdělit na: čisté datové katalogy (JSON/JS bez funkcí), registry chování (fns/efekty/preconditions jako pojmenované moduly per doména) a konstanty balancu (D1). Eventy/dialogy deklarativně (text jako šablona, akce jako string-ID do registru – originál už tím směrem jde přes `nextDelay`/`onComplete`).
**Riziko: vysoké (pro údržbu rebuildu). Úsilí: střední.**

### B3. Re-link/re-apply pipeline po loadu je implicitní a sebe-opravná — **Med** (jen údržbová stránka; save model sám je T-002a)
**Problém.** Korektnost stavu po loadu závisí na ručně udržované kaskádě: `cleanSaveObj` (výčet statických polí ke smazání) → deep-merge → `fixup()` (migrace) → `linkItemList()` (ř. 306: 10 `build*()` funkcí, které musí být **idempotentní vůči merged stavu**) → re-aplikace všech `applyUpgrade` → sanitizace. Existence `Home.fixNaNs` (home.js ř. 2209 – opravuje NaN gold/inventář a **kompenzuje hráče** `home.level × 10000` goldu) je přímý důkaz, že pipeline historicky tiše korumpovala stav a místo odstranění příčin přibyla reparační vrstva.

**Dopad.** Každé nové pole entity = nutnost rozhodnout (a nezapomenout) zda patří do cleanSaveObj výčtu, zda ho build* obnoví a zda přežije merge; chyba = tichá ztráta/duplikace stavu projevující se o hodiny hry později. To je čistě údržbový hazard nezávisle na zvoleném save formátu.

**Alternativa.** Obrátit zodpovědnost: **entity deklarují svůj persistentní tvar** (schéma `{persisted: [...], derived: [...]}`), save/load je generický průchod schématem; derived data se počítají jedinou cestou (tatáž funkce při startu nové hry i po loadu – žádná „load-only" větev). Migrace verzí jako explicitní očíslované kroky, ne ad-hoc `fixup`.
**Riziko: střední–vysoké. Úsilí: střední.**

### B4. Polymorfní cost-klíče: překlep = tichá fabrikace zdrojů — **Med**
**Problém.** V `pay`/`insertInventory` je default větev „je to zboží → uber z inventáře". Překlep nebo neexistující klíč v `cost` datech tedy buď jen zaloguje `no such item` (insert), nebo **odečte z `inventory[key] = undefined - value = NaN`** / vytvoří záporné množství (pay default větev nehlídá existenci ani zůstatek – sanitizuje to až load: „záporné inventáře na 0", T-001 §12). `canAfford` může říct ano podle jiné větve, než kterou pak `pay` skutečně použije (A3).

**Dopad.** Balanční data (costs/products v katalozích, kontraktech, eventech) nejsou validována proti žádnému číselníku → chyba v datech se projeví jako NaN kaskáda v ekonomice (proto existuje `fixNaNs`). Pro data-driven rebuild, kde čísla budou editována často, je to kritická díra.

**Alternativa.** Validace všech `cost`/`products` map proti registru zdrojů (A3) při **loadu katalogů** (fail-fast), + invarianta v transakci (remove nikdy pod nulu bez explicitního `allowDeficit`; porušení = chyba, ne tiché NaN).
**Riziko: střední–vysoké. Úsilí: nízké.**

### B5. Křehké výrazy bez testů – ilustrativní nález — **Low** (jako vzor; jednotlivost)
`home.js:970`: `Math.random() < home.consecutiveDiseased * (0.02 + $rootScope.itemList.p_innoculation.running ? 0.01 : 0)` – priorita operátorů dělá z `(0.02 + running) ? 0.01 : 0` vždy `0.01` (resp. `0` při `running undefined`, kdy `0.02+undefined=NaN`). Záměr „základ 0.02 + bonus 0.01" je ztracen; nikdo si nevšiml, protože balanc není testovatelný (D2). Druhý exemplář téhož vzoru: `world.js:568–569` počítá `isNewDay/isNewNoon` z `Engine.curStep` – ta je ovšem **service-level undefined** (service literál `Engine` v engine.js žádnou property `curStep` nemá), zatímco skutečný čítač `$rootScope.engine.curStep` existuje a funguje normálně; `undefined % x` → `NaN` → flagy jsou tiše vždy false a služby si proto den/poledne počítají lokálně z `$rootScope.engine.curStep` (detailně T-002a A6). Dopad: důkaz, že vzorce zadrátované do podmínek bez jednotkových testů degradují. Alternativa: vzorce jako pojmenované čisté funkce s testy (viz D2). **Riziko vzoru: střední. Úsilí: nízké.**

---

## C. UI ↔ logika

### C1. jQuery DOM manipulace uvnitř Engine a herních fns — **High**
**Problém.** Ověřené případy: `engine.js` ř. 22–25 (`$("#gamelog").html/prepend` – gamelog rendruje **scheduler**), ř. 204–214 (`createNotification` skládá DOM notifikace a `$("#notificationBar").append`), ř. 266–270 (Engine při initu věší click-handler na notification bar); `config.js` ř. 2489–2495 – herní `fns` přepínají `$("header").hide()` / `$("#gameContent").addClass("faint")` (story režim) – tj. **serializovatelné herní eventy v schedule přímo manipulují DOM**.

**Dopad.** Simulaci nelze spustit headless (testy, offline catch-up výpočet – vazba na T-002a, zde jde o testovatelnost a přenositelnost). UI redesign (mobile-first!) vyžaduje zásah do enginu. Notifikace/log nejsou stav, takže je nelze ani uložit, ani jinak prezentovat (toast vs. seznam).

**Alternativa.** Engine/logika emitují **doménové události** (`notification`, `log`, `storyMode on/off`) do event-busu / fronty ve stavu; UI vrstva je jediný subscriber, který je rendruje. Gamelog a notifikace jako data (kruhový buffer ve state) → zdarma získáme perzistenci i mobilní prezentaci.
**Riziko: vysoké (přímo proti cílům zadání). Úsilí: nízké–střední.**

### C2. UI čte a zapisuje simulační stav napřímo (two-way binding na `$rootScope`) — **High**
**Problém.** Controllery (obrazovky-mapy) a direktivy (`buildingcard`, `techtree`, `inventory`, `battlemap`…) bindují přímo na `$rootScope` (`controllers/index.js` 82 refs, `militarycouncil.js` 51…) a mutují jej (nákupy, slidery sazeb, klik v bitvě). Validace pravidel je tedy rozprostřená mezi UI handlery a služby; část pravidel existuje jen v UI.

**Dopad.** Nelze garantovat invarianty (UI může nastavit stav, který by služba odmítla); nový frontend (mobile) musí pravidla re-implementovat nebo zdědit AngularJS vzor. Z pohledu údržby: každé UI je potenciální mutátor čehokoli.

**Alternativa.** Command API ze A1: UI smí jen číst snapshot + posílat intents; všechna pravidla (canAfford, limity, unlocky) vyhodnocuje simulace. Bonus: intents jsou logovatelné → replay/debug.
**Riziko: vysoké. Úsilí: střední** (vzniká přirozeně, pokud se dodrží A1).

### C3. Bitva jako druhá časová osa s UI-řízenou logikou — **Med**
**Problém.** `battle.js` běží na vlastním `$interval(30 ms)` mimo engine kroky; hráčovy útoky jsou přímo click-handlery mutující `curBattle` (T-001 §10). Damage model, cooldowny a stav bitvy jsou propletené s prezentačním tempem (tick = animační takt).

**Dopad.** Bitvu nelze simulovat bez UI (testy výsledků, autoresolve, offline) a její čas nejde pauzovat/zrychlit konzistentně s enginem. Údržbově: dvě definice „času" ve hře = trvalý zdroj zmatení (viz i `curStepInSeason` počítající dny, T-001 §2 – pojmenovací dluh stejného druhu).

**Alternativa.** Bitva jako deterministický stavový automat krokovaný enginem (vlastní jemnější sub-step je OK, ale odvozený z téhož časového zdroje), vstupy hráče jako commands; render je jen projekce. Animační tempo řeší UI interpolací.
**Riziko: střední. Úsilí: střední.**

### C4. Achievementy a progrese imperativně rozseté v mechanikách — **Low**
**Problém.** Odemykání achievementů (a řady unlocků) je imperativní volání z míst, kde se věc děje (T-001 §11) – logika „kdy" je rozptýlená po službách.
**Dopad.** Přidání achievementu = zásah do cizí domény; snadno se zapomene některá cesta (např. zboží získané kontraktem vs. produkcí).
**Alternativa.** Deklarativní podmínky nad state/událostmi (`{id, when: predicate-as-data, …}`) vyhodnocované centrálně (denní tick + na transakční události z A3).
**Riziko: nízké. Úsilí: nízké.**

---

## D. Balanc-as-code

### D1. Magická čísla rozsetá ve step funkcích — **High**
**Problém.** Vzorek jen z `home.js`: nemoc `(curWorkers + diseaseFromColdChance*50)/20000` (ř. 887), `chanceToDie = 0.05` / `−0.05*0.25` (ř. 949–951), crime `chance 0.001 + 0.0003/0.0002/−0.0005` (ř. 856–862), festivalové šance `0.8`/`0.35` s prahy `number > 8` (ř. 538–567), šíření infekce `*0.3`, `(rand*0.6+1)` (ř. 931–936)… Totéž ve Forest (regenerační koeficienty 0.004/0.0075), World (`goldDemand = 150×units`, `goldProduction = 50×workers`, prahy převahy 1.5×), Market (1.35/0.6), event eskalace `1.25^n`. Část konstant v configu pojmenovaná je (TAXCENTERBASE, WARRIORUPKEEP…), ale většina balančních čísel žije inline v podmínkách.

**Dopad.** Zadání vyžaduje „věrně replikovat balanc" a „data-driven obsah" + acceptance „smyčka vyladěná" → ladění balancu bude častá operace. Dnes znamená hledat čísla v 17 000 ř. kódu bez záruky, že nezměníš logiku; žádný diff balancu mezi verzemi; nemožné A/B ladit.

**Alternativa.** Jediný **balance modul/soubor** (strukturované konstanty se jmény a komentáři jednotek: `disease.baseChancePer20kPop`, `crime.basePerDay`…), na který se kód odkazuje. Vzorce konstanty pouze čtou. Extrakci čísel z originálu stejně musíme udělat (dotěžení katalogů, T-001 §15) – udělat ji rovnou do balance dat.
**Riziko: vysoké (vůči cílům projektu). Úsilí: nízké–střední** (mechanická extrakce při portu každé mechaniky).

### D2. Vzorce zapletené do řídicí logiky, netestovatelné — **High**
**Problém.** Klíčové křivky hry (`workerEfficiency` clamp skládaný z 6 příspěvků, awesomeness komponenty, `calcMarketPrice` kubika, damage model, migrační akumulátor) jsou vnořené ve step funkcích mezi vedlejšími efekty – nelze je zavolat s argumenty a ověřit výstup (viz důsledek B5: prokazatelná, roky nepovšimnutá chyba ve vzorci).

**Dopad.** „Věrná replikace balancu" se nedá verifikovat: nemáme jak porovnat křivky rebuildu proti originálu jinak než hraním. Každý refaktor okolního kódu riskuje tichou změnu vzorce.

**Alternativa.** Vzorce jako **čisté funkce** `f(inputs, balanceConstants) → number` v samostatném modulu + tabulkové testy (vstup→očekávaný výstup, referenční hodnoty spočtené z originálu). Step funkce je pak jen: posbírej vstupy → zavolej vzorec → aplikuj efekt.
**Riziko: vysoké. Úsilí: nízké.**

### D3. Techy/eventy mutují katalogy in-place (base* dvojníci) — **Med**
**Problém.** `applyUpgrade` přepisuje `products/maxStep/cost` přímo v itemList položkách; původní hodnoty se zálohují v ručně párovaných polích `baseCost/baseProducts/baseMaxStep` a celé se to po loadu přehrává znovu (T-001 §8, §12). `scaleCost` mutuje podle `created`. Aktuální hodnota = výsledek historie mutací, kterou nelze zpětně přečíst.

**Dopad.** Nelze odpovědět „proč má pekař products X?" jinak než replikací historie; nový modifikátor (event, building efekt) musí vědět o všech ostatních, jinak se efekty navzájem přepíšou; zapomenuté base* pole = nevratná mutace v save (originál tomu věnuje fixup větve).

**Alternativa.** **Immutable katalog + vrstva modifikátorů**: efektivní hodnota se počítá `effective(item, attr) = base × ∏ aktivní modifikátory` (modifikátory = data: zdroj, atribut, operace, hodnota). Save ukládá jen seznam aktivních modifikátorů (unlocked techy už ukládá dnes). Řeší i pořadí skládání a UI tooltipy („+15 % z bookKeeping").
**Riziko: střední. Úsilí: střední.**

### D4. Chování v datech jako neserializovatelné inline funkce (`onBuild`, `applyUpgrade`, event `text: fn`) — **Med**
**Problém.** Část obsahu je deklarativní (cost/products/effects – dobře), ale „akce" obsahu jsou inline JS funkce ve velkém switch/case (`onBuild`, config.js ~ř. 872–1300) nebo přímo v definicích eventů. Tím vzniká dvojkolejnost: serializovatelné akce (string fns ID) vs. neserializovatelné (closures), s odlišnými pravidly přežití save/load (T-001 §14.3).

**Dopad.** Obsah nelze přesunout do JSON katalogů (blokuje data-driven cíl a dotěžování katalogů ze zdroje); přidání budovy = editace centrálního switche; dvě mentální kategorie akcí = chyby typu „proč to po loadu nefunguje".

**Alternativa.** Sjednotit na jednu kolej: všechny akce obsahu jako **string-ID do registru efektů** s parametry v datech (`onBuild: {effect: 'createScholars', count: 2}`). Registr je malý a typovaný; obsah je 100% data.
**Riziko: střední. Úsilí: střední.**

---

## Prioritizovaný seznam (pořadí pro návrh rebuildu)

| # | Nález | Priorita | Riziko převzetí | Úsilí alternativy | Proč v tomto pořadí |
|---|---|---|---|---|---|
| 1 | A1 Globální mutable stav, bez hranice UI/simulace | High | vysoké | střední | Základní rozhodnutí – všechna ostatní opatření na něm stojí; nelze dolepit později. |
| 2 | C1+C2 DOM/UI v logice, UI mutuje stav | High | vysoké | nízké–střední | Přímo požadavek zadání (logika odděleně, mobile UI); levné, pokud platí #1. |
| 3 | A3+B4 Transakční vrstva: 1 registry místo 4 dispatcherů + validace costů | High | vysoké | nízké–střední | Hub s prokázanými defekty (fish, osiřelý report, NaN); malé úsilí, velký zisk. |
| 4 | D1+D2 Balanc do dat, vzorce jako čisté funkce s testy | High | vysoké | nízké–střední | Podmínka „věrné replikace balancu"; extrakce čísel se stejně musí udělat. |
| 5 | B1+B2 Fail-fast event/fns registr, rozbití config.js monolitu | High | vysoké | nízké–střední | Princip string-ID zachovat, jen ho udělat bezpečný a modulární. |
| 6 | A2+A5 Rozpad Home.step, deklarativní tick/scheduler | High/Med | vysoké | střední | Umožňuje iterativní dodávku mechanik (zadání: mnoho iterací). |
| 7 | B3 Deklarativní persistence schémat místo clean/re-link kaskády | Med | střední–vysoké | střední | Údržbová stránka loadu; formát save řeší T-002a. |
| 8 | D3 Immutable katalog + modifikátory | Med | střední | střední | Až existují katalogy a tech systém. |
| 9 | D4 Akce obsahu jako data (registr efektů) | Med | střední | střední | Společně s #8 dokončuje data-driven obsah. |
| 10 | A4 Katalogy per typ se schématem | Med | střední | střední | Lze zavádět postupně po doménách. |
| 11 | C3 Bitva na jednotném časovém zdroji | Med | střední | střední | Pozdní systém (riziko nedotažení dle zadání) – navrhnout teď, stavět později. |
| 12 | C4 Deklarativní achievementy/unlocky | Low | nízké | nízké | Quality-of-life; snadné, až bude event bus z #2/#3. |
| 13 | B5 Vzorce s testy (jednotlivé chyby typu home.js:970) | Low | – | – | Pokryto #4; uvedeno jako důkazní materiál. |

**Zvážená alternativa k celku (zamítnuto):** převzít architekturu originálu 1:1 (globální stav + služby) a „jen" vyměnit AngularJS za moderní render – nejlevnější start a nejvěrnější chování, ale konzervuje všech 13 nálezů, znemožňuje headless simulaci (offline progres z acceptance kritérií) a ladění balancu; zamítnuto, protože zadání explicitně žádá oddělenou logiku a data-driven obsah. Druhá alternativa – plný ECS engine – zamítnuta jako overkill: simulace je agregátní (T-001 §14.5), entity-úroveň potřebují jen budovy-instance a NPC; stačí „systems over plain state".

## Předpoklady a nejistoty
- Čísla řádků odpovídají staženému zdroji v0.9.5 v `doc/original_source/`; plné JSON katalogy v repu nejsou (T-001 §15) – nálezy o datech se opírají o linkovací funkce a `lists/listfood.js`.
- Odhady úsilí jsou pro **greenfield rebuild** (vzory nenavrhujeme přepisovat v originálu).
- `chat.js` (plně jQuery DOM) hodnocen jen okrajově – chat/multiplayer je Scope OUT zadání.
