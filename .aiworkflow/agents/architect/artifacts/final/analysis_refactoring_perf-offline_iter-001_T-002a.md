# Prosperity rebuild – refactoring kandidáti: výkon & runtime, save/offline, serverové závislosti (T-002a)

- **Task**: T-002a, iter-001 (BRIEF-002a)
- **Autor**: architect
- **Datum**: 2026-06-12
- **Vstupy**: `analysis_keymechanics_iter-001_T-001.md` (dále „T-001"), zdroj `doc/original_source/modules/prosperity/services/` (engine.js, game.js, world.js, market.js, home.js, skills.js, battle.js, config.js), `.aiworkflow/zadani_projektu.md`
- **Scope**: jen výkon & runtime + save/offline + serverové závislosti. Provázanost, string-callback dispatch, UI↔logika a balanc-as-code řeší paralelní **T-002b**. Mechaniky samotné viz T-001 (kap. 1, 12, 14) – zde se neopakují.

Hodnocení je vůči cíli: **mobile-first PWA, plně offline, spolehlivý save + offline progres** (zadani_projektu.md, acceptance criteria).

Formát nálezu: **Problém → Dopad → Priorita → Doporučená alternativa → Riziko/úsilí.** Riziko = riziko věrnosti/regrese při změně, úsilí = odhad náročnosti v rebuildu (S/M/L).

---

## A. Výkon & runtime

### A1. Herní smyčka přes `$timeout` → plný Angular digest 20×/s
**Problém.** `Game.run()` (game.js ř. 13–27) plánuje každý krok rekurzivním `$timeout(run, delay)`. V AngularJS každý `$timeout` po doběhnutí spustí **kompletní digest cyklus** nad `$rootScope` – tj. při 1× rychlosti 20 dirty-check průchodů celého watcher stromu za sekundu, nezávisle na tom, zda se něco viditelného změnilo. Veškerý herní stav je na `$rootScope` a UI na něj váže přímo (T-001 kap. 0), takže watcherů jsou stovky.
**Dopad.** Na desktopu to originál unese; na mobilu je to dominantní žrout CPU/baterie – simulace sama (modulo checkpointy, viz A2) je levná, drahý je framework okolo. Zároveň to svazuje rychlost simulace s renderem: nelze levně zrychlit hru ani dělat catch-up (A3), protože každý krok platí digest.
**Priorita: High.**
**Alternativa.** V rebuildu oddělit tick simulace od renderu: fixed-timestep smyčka (akumulátor reálného času → N×`step()` v jedné dávce), render notifikovaný max ~10–15×/s (nebo `requestAnimationFrame` + dirty flagy). Žádný framework-digest na krok; UI čte snapshot/eventy. (Pozn.: návrh hranice UI↔logika patří do T-002b; zde jde o runtime vlastnost „krok nesmí platit render".)
**Riziko/úsilí.** Riziko věrnosti nulové (čistě technika běhu), úsilí S–M – jde o základ nové kostry, ne o přepis mechanik.

### A2. Kompozitní `World.step()`: 8 služeb volaných každý krok, většina no-op; obří `Home.step()`
**Problém.** `World.step()` (world.js ř. 566–592) volá každý krok `Seasons/Home/Forest/Mine/Field/Skills/Market/Techs.step()`. Skoro všechny uvnitř jen testují modulo (`curStep % STEPSPERDAY…`, home.js ř. 601–617) a většinu kroků nedělají nic – ale prolog se vyhodnocuje vždy: `Home.step` např. každý krok počítá 7 modulo testů a alokuje `Object.keys(home.jobs)` (ř. 615) i v krocích, kdy se joby nezpracují; stavební fronta běží `% 3 == 0` (ř. 1708) a iteruje celou `projectQueue`; migrační akumulátor běží každý krok (T-001 kap. 3). Agregační přepočty (`calcAll`, `calcMaxJobNumbers`, quarterDay smyčka přes všechny joby × instance budov) jsou O(itemList) a opakují se, i když se vstupy nezměnily.
**Dopad.** Per-krok režie je dnes malá, ale škáluje špatně pro dvě věci, které rebuild potřebuje: **catch-up po offline** (statisíce kroků v dávce, viz B5) a vyšší rychlosti. Zbytečné alokace v hot-path navíc generují GC tlak na mobilu.
**Priorita: Med** (sama o sobě), **High v kombinaci s B5** – bez levného kroku není proveditelný fast-forward.
**Alternativa.** (a) Centrální časový dispatcher: engine sám zná periody (krok/den/poledne/čtvrtden/měsíc/rok) a volá handlery jen v okamžicích, kdy nastávají – per-service modulo testy zmizí. (b) Agregáty (max workers, sloty jobů, kapacity, attractiveness) přepočítávat event-driven (po stavbě/techu/loadu), ne polling – originál to z větší části už tak dělá (`calcAll` po událostech), dotáhnout důsledně. (c) Žádné alokace v každokrokovém prologu.
**Riziko/úsilí.** Riziko nízké – pořadí vyhodnocení v rámci dne je nutné zachovat (newDay → newMonth vnořené, quarterDay joby; jinak se změní balanc jídla/daní). Úsilí M.

### A3. Drift kompenzace `calcRate()`: žádný akumulátor, min. delay 10 ms, throttling na pozadí
**Problém.** `calcRate()` (game.js ř. 29–41) měří reálný čas mezi tiky a při zpoždění zkrátí příští delay na min. 10 ms – tj. **max ~100 kroků/s dohánění, vždy 1 krok na 1 timeout** (a 1 digest, viz A1). Není tu akumulátor: pokud zařízení nestíhá trvale, hra prostě běží pomaleji, herní čas ≠ deklarovaná rychlost. Kritické pro mobil: prohlížeče throttlují `setTimeout` na pozadí (až 1 tick/min), takže **minimalizovaná PWA se de facto zastaví** – a po návratu se nic nedohání.
**Dopad.** Na mobilu (časté přepínání aplikací, zhasnutý displej) je „reálný čas" hry nedeterministický; pomalé zařízení = trvale zpomalená hra; doháněcí smyčka 10ms-timeout+digest je navíc nejhorší možný způsob, jak dohánět (death-spiral na slabém HW).
**Priorita: High.**
**Alternativa.** Fixed-timestep s akumulátorem: `elapsed = now - lastTick; stepsDue = floor(elapsed/stepDuration)`; vykonat dávku kroků (s horním limitem na frame, zbytek nechat do dalšího framu), render až po dávce. `visibilitychange`/resume → tentýž mechanismus spočte zameškané kroky = **stejný kód řeší drift, pozadí i offline catch-up (B5)**. Alternativa B (zamítnutá): Web Worker pro simulaci – řeší throttling jen částečně (workery na pozadí také throttlují timery, ale ne výpočet) a přidává serializaci stavu; zvážit až pokud dávkový krok nebude stíhat, ne jako default.
**Riziko/úsilí.** Riziko nízké (RNG mechaniky jsou per-krok, dávkování je nemění), úsilí S. Nutné jen ohlídat, aby UI eventy (story screeny zastavující engine) uměly přerušit dávku.

### A4. Bitvy na vlastním `$interval` 30 ms mimo engine čas
**Problém.** Bitva běží na samostatné reálné časové ose: `$interval(tick, 30)` (battle.js ř. 8, 224), tj. ~33 digestů/s navíc vedle engine smyčky. Důsledky: (1) bojový čas ignoruje rychlost/pauzu enginu i throttling – minimalizace aplikace uprostřed bitvy bitvu zkreslí (intervaly se zclampují, AI reakce/cooldowny se rozjedou vůči očekávání), (2) `curBattle` se neukládá (save ukládá jen `battles` statistiky, game.js ř. 142) – kill aplikace uprostřed bitvy = nedefinovaný stav, (3) dvě časové osy = dva zdroje pravdy pro „teď" (T-001 kap. 14.1 to označuje za výjimku architektury).
**Dopad.** Na mobilu je přerušení uprostřed bitvy běžný scénář (notifikace, zhasnutí displeje). Výkonově 33 Hz digest během bitvy znatelně hřeje zařízení.
**Priorita: High** (pro mobile UX), Med výkonově.
**Alternativa.** Bitevní tick navěsit na hlavní fixed-timestep smyčku (1 bitevní tick = K ms simulovaného času, akumulátor sdílený) → pauza/throttling/catch-up řeší jedna mechanika; stav bitvy serializovatelný (čísla + cooldowny), takže přežije save/kill. Alternativa (zamítnutá): nechat bitvy real-time a jen pauzovat na `visibilitychange` – neřeší save uprostřed bitvy a ponechává druhou časovou osu.
**Riziko/úsilí.** Riziko střední na věrnost „feel" bitvy (reakční časy AI, cooldowny v ms → převést na ticky 1:1, 30 ms = 1 tick). Úsilí S–M.

### A5. Dvojí volání `Skills.step()` v jednom kroku (bug originálu)
**Problém.** `Game.run()` volá `Skills.step()` (game.js ř. 18) a `World.step()` ho volá také (world.js ř. 575) → skilly progresují **2× za krok**. Skill s `maxStep` N reálně doběhne za N/2 kroků.
**Dopad.** Výkonově zanedbatelné; podstatné pro **věrnost balancu**: efektivní rychlost skillů v originále je 2× nominál. Rebuild, který si přečte `maxStep` z katalogu a bude tikat 1×, bude mít skilly poloviční rychlostí než originál.
**Priorita: Med** (balanční past při rebuildu, snadno přehlédnutelná).
**Alternativa.** V rebuildu tikat 1× a **zapéct kompenzaci do dat** (efektivní maxStep = katalogový/2), s poznámkou v balančních datech. Nepřenášet dvojité volání.
**Riziko/úsilí.** Riziko jen dokumentační, úsilí S (jedno rozhodnutí + zápis do balančních poznámek; samotná čísla patří do balanc-as-code v T-002b).

### A6. Mrtvé/rozbité runtime flagy: `Engine.curStep` v `World.step`
**Problém.** `World.step` počítá `$rootScope.isNewDay/isNewNoon` z `Engine.curStep % STEPSPERDAY` (world.js ř. 568–569) – ale `Engine.curStep` je **service-level undefined**: service literál `Engine` (engine.js) žádnou property `curStep` nemá. Skutečný čítač `$rootScope.engine.curStep` přitom existuje a funguje normálně – rozbitý je jen tento odkaz na service. `undefined % x` → `NaN` → flagy jsou **vždy false**. Cokoli na nich závisí, nikdy nenastane; služby si proto den/poledne počítají každá znovu lokálně z `$rootScope.engine.curStep` (home.js ř. 601+).
**Dopad.** Přímý dopad na hru malý (mechaniky mají vlastní výpočty), ale je to ukázka rizika duplikovaných výpočtů času: každá služba si odvozuje kalendářní hrany sama a může se rozjet (viz též `season.curStepInSeason` počítající dny, T-001 kap. 2).
**Priorita: Low** (samo o sobě), ale potvrzuje doporučení A2a.
**Alternativa.** Jediný zdroj pravdy pro časové hrany (dispatcher z A2 vystaví `isNewDay`, `isNoon`, … jako vypočtené jednou za krok), služby je jen konzumují.
**Riziko/úsilí.** S, součást A2.

### A7. Engine.schedule: GC a lineární skeny – přijatelné, ale s ostny
**Problém.** Schedule je `{step: [event]}`; vykonané sloty se mažou hned (engine.js ř. 250), `clearPastEvents()` každých 10 000 kroků (ř. 253) je tedy skoro vždy no-op pojistka – ale iteruje **všechny klíče** schedule a porovnává stringové klíče s číslem. `countEvent()` (ř. 38–57) je plný sken schedule (O(sloty×eventy)) a volá se při každém `Events.startCheck` (start/load) pro deduplikaci AI smyček; `insert(..., findNextEmpty)` lineárně hledá volný slot. Navíc `maxStep = 5×10^8` je tichý strop běhu.
**Dopad.** Při běžné velikosti schedule (desítky až stovky slotů) měřitelně nebolí; bolet začne při fast-forwardu (B5), kdy se schedule zpracovává v dávkách a `countEvent`/GC běží uprostřed. Hlavně je to křehké: stringové klíče objektu nezaručují pořadí ani typovou bezpečnost.
**Priorita: Low.**
**Alternativa.** Min-heap / setříděná mapa keyed číselným krokem; `countEvent` nahradit indexem `eventId → počet` udržovaným při insert/execute; GC zrušit (netřeba při okamžitém mazání). Zachovat serializovatelnost (pole dvojic `[step, events]`).
**Riziko/úsilí.** Riziko nulové, úsilí S; dělat při návrhu nového enginu, ne jako izolovanou opravu.

### A8. Save serializace na main threadu + mrtvý kód v `Game.save`
**Problém.** Každý autosave dělá: deep copy celého `itemList`, `player`, `engine` (vč. schedule a **logů** – `engine.logs` až `maxlogs` položek se ukládají celé), `JSON.stringify`, `LZString.compressToBase64` – vše synchronně na main threadu (game.js ř. 112–199). Přesná citace: definice je `save: function(callback)` (game.js ř. 112); `autoSave` ji volá jako `game.save(true, null, $rootScope.curGameSave)` (ř. 45) – extra argumenty volání funkce ignoruje. Navíc ř. 116–118 obsahují **mrtvou smyčku**, která deep-copyne každou položku itemListu a výsledek zahodí (`var x = jQuery.extend(true, {}, …)`) – tj. celá kopie katalogu navíc, zbytečně. `cleanSaveObj` při každém save navíc `JSON.parse` celého `itemlistbk` z localStorage (ř. 258), přestože jediný konzument (`deleteSame`) je zakomentovaný (ř. 351).
**Dopad.** Na mobilu citelný jank spike každý autosave (~7,5 min, B2); zbytečná práce je významný podíl celkového času save.
**Priorita: Med.**
**Alternativa.** (a) Ukládat explicitní serializovatelný stav (viz B3), žádné deep copy + denylist; (b) kompresi (a případně stringify) přesunout do Web Workeru, nebo zvážit, zda je komprese pro IndexedDB vůbec nutná (lz-string měl smysl pro REST payload); (c) gamelog neukládat do save, nebo jen omezený buffer.
**Riziko/úsilí.** Riziko nízké, úsilí S–M (souvisí s B3).

---

## B. Save / offline

### B1. Persistence výhradně přes serverový REST (`gamesaves`), lokální fallback zakomentovaný
**Problém.** `Game.save` (definice `save: function(callback)`, game.js ř. 112) ukládá jen přes `Gamesaves.$save/$update`; komentář „always save to server now!" sedí u volání z `autoSave` (ř. 45), které předává extra argumenty, jež funkce ignoruje. Lokální záchrana `createLocalSave` je zakomentovaná (ř. 202–209, 231, 251) a error handlery save jsou **prázdné**. `localStorage` drží jen katalogový backup `itemlistbk` a drobnosti. Load jde rovněž jen ze serveru (`Gamesaves.get`, ř. 372).
**Dopad.** V offline PWA **neexistuje žádná persistence**: bez konektivity se progres nikdy neuloží a uložená hra nejde načíst. Selhání save je navíc tiché (jen krátký `saveError` flag). To je přímý konflikt s acceptance criteria („postup se spolehlivě ukládá a obnovuje").
**Priorita: High (blokující).**
**Alternativa.** Local-first: primární úložiště IndexedDB (localStorage jako nouzový fallback má ~5MB limit a synchronnost; sejvy v originále jsou stovky kB i po kompresi), více slotů + rotující autosave generace (ochrana proti korupci při killu uprostřed zápisu – zapsat nový záznam, pak přepnout ukazatel). Server sync je v zadání explicitně out-of-scope. Alternativa (zamítnutá): localStorage jako primární – synchronní blokující zápis velkých stringů na main threadu, limit velikosti.
**Riziko/úsilí.** Riziko nulové (originál tu nemá co replikovat), úsilí S–M.

### B2. Autosave perioda 10 herních dní a jen za běhu enginu; nic na pagehide
**Problém.** Autosave běží v `Game.run` jen když `engine.state` a `curStep % (STEPSPERDAY*10) == 0` (game.js ř. 19) → při 1× rychlosti **každých 7,5 min reálného času**. Žádný save při pauze, opuštění stránky, minimalizaci. V kombinaci s A3 (throttling) na mobilu hrozí, že krokový checkpoint dlouho nepadne.
**Dopad.** Mobilní OS zabíjí backgroundované taby bez varování → běžná ztráta až 7,5+ min progresu; u PWA je „swipe away" standardní ukončení.
**Priorita: High** (mobile), v originále na desktopu jen Med.
**Alternativa.** Tři spouště: (1) periodický autosave (kratší, např. 1–2 min reálného času nebo herní den – levné po B3/A8), (2) `visibilitychange→hidden` / `pagehide` synchronní rychlý save (proto musí být save levný a malý), (3) save po významných událostech (bitva, levelup, kontrakt). Ukládat i `lastSimTimestamp` pro offline catch-up (B5).
**Riziko/úsilí.** Riziko nulové, úsilí S (závisí na B1/B3).

### B3. Save model „stav minus katalog": ruční denylist, vypnutý generický diff, křehká rekonstrukce
**Problém.** `cleanSaveObj` (game.js ř. 257–362) maže z **každé** itemList položky ručně vyjmenovaná statická pole (~40 `delete` výrazů, místy duplicitní – `products` 2×, `citySpace` 2× ř. 303/305); generický diff `deleteSame` proti `itemlistbk` existuje, ale volání je zakomentované (ř. 351) – tj. reálně se ukládá „vše kromě denylistu", ne skutečný diff. Model je **implicitní**: co není v denylistu, to se uloží (i odvozené/derivované hodnoty); co v denylistu je, musí load umět zrekonstruovat (`linkItemList` + re-aplikace `applyUpgrade` všech unlocked techů + `fixup` migrace, ř. 390–509, T-001 kap. 12).
**Dopad.** Tři rizika: (1) **drift schémat** – nové pole v katalogu se tiše začne ukládat (bloat, konflikt při loadu se změněným katalogem), nebo naopak smazané pole rozbije starý save; (2) **závislost na idempotenci** `applyUpgrade` – funguje jen proto, že load nejdřív smaže odvozená pole a re-link je obnoví z base; každý nový upgrade musí tuhle disciplínu dodržet, nic ji nevynucuje; (3) migrace = ad hoc `fixup()` bez verzování kroků. Pro PWA navíc platí, že **katalog se může změnit aktualizací service workeru pod existujícími savy** – přesně scénář, na který je dnešní model nejcitlivější.
**Priorita: Med** (princip „stav minus katalog" je správný a pro rebuild doporučený – problém je implicitnost, ne idea).
**Alternativa.** Invertovat na **allowlist**: každá doména deklaruje svůj serializovatelný stav explicitně (schema/serialize funkce per typ položky: building → `{created, totalMade, instances, unlocked}`, zone → `{liege, numWorkers, …}` …). Load = vytvoř čistý stav z katalogu → aplikuj save → přehraj upgrady (zachovat, je to dobrý vzor) → spusť verzované migrace (`saveVersion`, seznam migračních kroků místo monolitického `fixup`). Alternativa (zamítnutá): ukládat kompletní stav bez diffu – jednodušší, ale ztrácí odolnost vůči změnám katalogu/balancu mezi verzemi, která je pro iterativní vývoj PWA klíčová.
**Riziko/úsilí.** Riziko nízké (návrhové rozhodnutí nové kostry), úsilí M – ale ušetří průběžně; bez toho každá změna katalogu ohrožuje existující savy.

### B4. Load pipeline: deep-merge do globálního stavu + sanitizace následků
**Problém.** `processLoad` merguje save přes `jQuery.extend(true, $rootScope[key], value)` (ř. 415–423) do už-naběhlého stavu a pak **uklízí následky**: nulování záporných inventářů (ř. 473), `Home.fixNaNs`, oprava `totalMade < created`, deduplikace projectQueue, ruční patch person.fn (ř. 481–486). Celé v jednom `try/catch`, který chybu jen zaloguje – částečně načtený stav zůstane.
**Dopad.** Merge (nikoli replace) znamená, že stará pole ze savu a nová pole z kódu koexistují → přesně zdroj NaN/záporných hodnot, které se pak záplatují. Failure mode „tiše pokračuj s půlkou stavu" je pro hru s autosavem nebezpečný (poškozený stav se vzápětí uloží).
**Priorita: Med.**
**Alternativa.** Load jako čistá konstrukce (viz B3): nový stav se staví od nuly, save je jediný vstup; validace schématu před aplikací; při selhání **neaktivovat** hru a nabídnout předchozí autosave generaci (B1). Sanitizace (NaN/negativní) zůstat může, ale jako asserty/telemetrie, ne tichá oprava.
**Riziko/úsilí.** Riziko nízké, úsilí součást B3 (M).

### B5. Žádná offline simulace / catch-up
**Problém.** Hra simuluje výhradně za běhu otevřené záložky (A3); po návratu/loadu se zameškaný čas nijak nekompenzuje – save neobsahuje žádný reálný timestamp (jen herní `curStep`), takže ani není z čeho počítat. Zadání přitom explicitně požaduje „offline progres" a „včetně offline výpočtu" (acceptance criteria).
**Dopad.** Bez toho rebuild nesplní acceptance criteria; zároveň je to největší **návrhové** rozhodnutí téhle domény, protože ovlivňuje engine (A2/A3), save (B2) i balanc.
**Priorita: High.**
**Alternativa – dvě varianty s trade-off:**
- **(a) Dávkový fast-forward (doporučeno):** uložit `lastSimTimestamp`; po loadu/resume spočíst zameškané kroky a přehrát je standardním `step()` v dávkách (chunky po ~10–50k kroků s progress UI, ideálně ve Workeru), s **capem** (např. max 8–24 h) jako u běžných idle her. Vyžaduje levný krok (A2) – při ~0,01 ms/krok je 8 h ≈ 576 000 kroků ≈ jednotky sekund. Plus: 100% věrnost mechanik (eventy, sezóny, AI, schedule fungují beze změny), žádný druhý model. Minus: cena roste lineárně s časem, nutný cap a optimalizace kroku.
- **(b) Analytická aproximace:** uzavřený vzorec „co se stane za N dní" (produkce, spotřeba, populace). Plus: O(1). Minus: druhá implementace všech mechanik → dvojí balanc, diverguje od krokové simulace (schedule eventy, AI svět a bitvy aproximovat prakticky nejdou) – **zamítnuto** jako primární řešení; přípustné nejvýš jako hrubý odhad nad capem varianty (a).
Rozhodnutí o capu a chování bitev/eventů během catch-upu (např. obranné bitvy → auto-resolve) eskalovat jako balanční otázku.
**Riziko/úsilí.** Varianta (a): riziko nízké (stejný kód jako live simulace), úsilí M (chunking, progress UI, cap, auto-resolve politika). Varianta (b): riziko vysoké, úsilí L.

---

## C. Serverové závislosti (co v offline PWA padá)

### C1. Katalogy: 16 JSON listů přes `$http.get`, bez error handlingu
**Problém.** Config fetchuje `modules/prosperity/list*.json` (16 souborů, config.js ř. 196–225); `finished()` (→ `linkItemList`, `configged = true`) se zavolá až po **všech** úspěších a chybová větev neexistuje. Při jediném selhání hra nikdy nenastartuje (`World.checkReady` přesměruje pryč, world.js ř. 22–28). Pozn. upřesňující T-001 kap. 14.2: jsou to **statické soubory z vlastního app path**, ne dynamické API – pro offline tedy stačí precache.
**Dopad.** Offline bez precache = hra se vůbec nespustí. Zároveň nejlevnější závislost na vyřešení.
**Priorita: High (blokující offline start), úsilí nejnižší z High nálezů.**
**Alternativa.** Katalogy jako verzované statické assety v repu (zadání to beztak vyžaduje – katalogy je nutné dotěžit, T-001 kap. 15), precache service workerem, nebo rovnou bundlované moduly (bez fetch fáze úplně – odpadá i race „hra běží dřív, než je configged"). Loader s explicitním fail stavem.
**Riziko/úsilí.** Riziko nulové, úsilí S (samotné dotěžení katalogů je samostatný, už evidovaný úkol).

### C2. `/market`: serverová tržní data, periodický fetch, 401 → redirect na signin
**Problém.** Tržní `basePrice/available/max` přicházejí z `GET /market` a přepisují lokální položky (market.js ř. 263–305). Volá se z `Market.step` s podmínkou `curStep % STEPSPERDAY * 5 == 0` – **precedence bug**: `%` váže těsněji než `*`, takže `(curStep % 900) * 5 == 0` → fetch běží **každý herní den** (45 s reálného času), ne každých 5 dní. Error větev: při 401 **přesměruje hráče na `/signin`** (ř. 300–303). Bez dat: `calcMarketPrice` vrací 0 a loguje error (ř. 120–122).
**Dopad.** Offline kaskáda: ceny zamrznou na posledním stavu, nebo (čistý offline start) jsou 0 → `getGoldValue` vrací 0 → **rozbité AI ekonomické ratingy, ocenění kontraktů, repair projektů a tributů** (T-001 kap. 6, 9). V nejhorším případě 401 vyhodí hráče ze hry. Trh je jediné místo, kde jádro simulace není klientské (T-001 kap. 14.8).
**Priorita: High.**
**Alternativa.** Plně klientská tržní simulace: `available/max` jako lokální stav per zboží, inicializovaný z katalogu; hráčovy nákupy/prodeje a karavany `available` posouvají; pomalý drift/regenerace k baseline simuluje „okolní svět" (volitelně navázat na AI zóny – produkční zóny doplňují trh). Cenový vzorec `basePrice×(1.5−avail/max)³` zůstává beze změny. Periodu obnovy stanovit vědomě (originál kvůli bugu de facto denní – vzít denní jako referenční chování). Alternativa (zamítnutá): cache posledních serverových dat – neřeší čistý offline start a konzervuje závislost.
**Riziko/úsilí.** Riziko střední na věrnost (originální server-side dynamika `available` není ve zdroji klienta vidět – nutno navrhnout a vybalancovat lokální náhradu; eskalovat do balanční iterace). Úsilí M.

### C3. `gamesaves` REST + Authentication
Viz **B1** – stejná závislost z druhé strany: save i load vyžadují přihlášeného uživatele a server. V offline PWA padá kompletně; náhrada = local-first persistence (B1). Admin-only cesta `load(savestring)` (game.js ř. 366) zaniká. **Priorita: High (řešeno v B1).**

### C4. socket.io chat, market admin API, ostatní online prvky
**Problém.** `Chat.init()` v `Game.init` (game.js ř. 109) – socket.io; `addToMarket/updateToMarket/deleteFromMarket` (market.js ř. 317–352) – admin CRUD; signin/users moduly MEAN.js.
**Dopad.** Mimo jádro hry (T-001 kap. 14.8); v offline PWA nemají co dělat.
**Priorita: Low.**
**Alternativa.** Nepřenášet (zadání: multiplayer/účty out-of-scope). Jediné, co za zachování stojí, je export/import savu jako string (užitečné pro přenos mezi zařízeními bez serveru) – levná náhrada za serverové savy.
**Riziko/úsilí.** Riziko nulové, úsilí 0 (vypuštění).

---

## D. Prioritizovaný seznam nálezů (této domény)

| # | Nález | Priorita | Úsilí | Pozn. |
|---|---|---|---|---|
| 1 | **B1/C3** Persistence jen přes server REST → local-first (IndexedDB, generace savů) | High | S–M | Blokuje acceptance criteria; bez toho nic dalšího nedává smysl |
| 2 | **C1** Katalogy fetchované bez error handlingu → bundlovat/precache | High | S | Blokuje offline start; nejlevnější High |
| 3 | **A3** Drift kompenzace bez akumulátoru + background throttling → fixed-timestep s dávkováním | High | S | Základ smyčky; stejný mechanismus předpoklad pro #4 |
| 4 | **B5** Žádný offline catch-up → dávkový fast-forward s capem (varianta a) | High | M | Acceptance criteria; závisí na #3 a #6 |
| 5 | **C2** `/market` server data (+ precedence bug periody, 401 redirect) → klientská tržní simulace | High | M | Jediná serverová závislost uvnitř jádra simulace; balanc eskalovat |
| 6 | **A1** Tick přes `$timeout`/digest 20×/s → krok bez render daně | High | S–M | Výkonový základ pro mobil i pro #4 |
| 7 | **A4** Bitvy na vlastním 30ms `$interval` → bitevní tick na engine čase, serializovatelný | High (UX) | S–M | Mobilní přerušení uprostřed bitvy; riziko na „feel" – převod ms→tick 1:1 |
| 8 | **B2** Autosave 7,5 min jen za běhu → častěji + pagehide + po událostech | High | S | Závisí na #1; levné po #10 |
| 9 | **B3/B4** Implicitní denylist save model + merge-load + ad hoc fixup → explicitní allowlist schéma, verzované migrace, load jako čistá konstrukce | Med | M | Princip „stav minus katalog + re-aplikace upgradů" zachovat |
| 10 | **A8** Save serializace na main threadu, mrtvá copy smyčka, logy v savu | Med | S–M | Z velké části odpadá s #9 |
| 11 | **A2/A6** Kompozitní every-step `step()` s modulo prology, alokace v hot-path, duplikované odvozování času | Med | M | Stává se High v kombinaci s #4 (cena fast-forwardu) |
| 12 | **A5** Dvojí `Skills.step()` za krok (bug) → tikat 1×, kompenzaci zapéct do dat | Med | S | Balanční past; předat do balanc-as-code (T-002b) |
| 13 | **A7** Schedule GC / `countEvent` lineární skeny, stringové klíče | Low | S | Vyřešit při návrhu nového enginu |
| 14 | **C4** socket.io chat, market admin API | Low | 0 | Nepřenášet; zvážit export/import savu |

**Souhrnné doporučení pro návrh (iter-001 jádro engine):** položky 1–6 tvoří jeden koherentní celek – fixed-timestep engine s levným krokem, local-first save s timestampem a bundlovanými katalogy dohromady dávají offline progres „zadarmo" (catch-up = tatáž dávková smyčka). Bitvy (7) a save schéma (9) navrhnout hned, implementovat lze později. Položky 5 a 12 mají balanční dopad → propsat do balanc-as-code agendy (T-002b/orchestrátor).

## Předpoklady a nejistoty
- Serverová strana `/market` (jak se hýbe `available` mezi fetchi) není v repu – klientská náhrada (C2) bude vyžadovat balanční kalibraci, nelze ji „věrně" opsat.
- Odhad ceny kroku pro fast-forward (B5) je řádový; před commitnutím capu změřit na prototypu kroku.
- Throttling chování se liší per prohlížeč/OS; fixed-timestep s akumulátorem je na něm nezávislý, ale limity dávky je třeba ověřit na reálném mobilu.
