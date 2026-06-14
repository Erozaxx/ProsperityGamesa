# Review: Architektura Playability hardening (iter-012, T-002)

- **Reviewer**: reviewer
- **Iterace**: iter-012
- **Brief**: BRIEF-012-002
- **Předmět**: `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md`
- **Datum**: 2026-06-13
- **Metoda**: review proti reálnému kódu (ne na slovo) + empirické probe skripty (node)

---

## VERDIKT: GO S PODMÍNKAMI

Návrh je z velké části kvalitní, dobře strukturovaný a realizovatelný. **ALE obsahuje jeden
zásadní faktický omyl**: oblast **A2 (deklarovaná jako jediný BLOCKER) v aktuálním kódu
NEEXISTUJE** – premisa návrhu je empiricky vyvrácena. Stejný omyl propaguje i §3 (A3),
§7 (accounting) a §9 diagram. Implementace smí pokračovat **až po opravě návrhu** (přepsat A2/A3/§7,
viz podmínky níže). Reálně hodnotné a správně diagnostikované jsou A1, A4, A5.

### Počty nálezů podle severity
- **BLOCKER**: 1 (B1 – A2 premisa je fakticky nesprávná)
- **MAJOR**: 3 (M1 – §7 accounting analýza navazuje na špatnou premisu; M2 – A3 „latentní riziko"
  nepravdivé; M3 – playtest finding #2 nutno re-diagnostikovat, jinak coder „opraví" neexistující bug)
- **MINOR**: 5 (DAYS_PER_YEAR=364 ne 360/365; market 6 sloupců ne 5; A4 sanity-cap interakce
  s migrací; A1 load.js přesnost; A4 test `unlimited growth` název)
- **NIT**: 3 (komentářové/kosmetické)

---

## 1. Ověření tvrzení proti kódu (co jsem reálně spustil/přečetl)

| Tvrzení návrhu | Ověřeno | Výsledek |
|---|---|---|
| A1: fresh start gold 0, pop 0, bread 0, tent 5 | `node` probe `createInitialState()` | **PRAVDA**: gold=0, pop=0, bread=0, housing={tent:5} |
| A1: `createHomeState` čte neexistující `startTents`/`startPopulation` | `createHomeState.js:21-22` + `balance.js:145-151` | **PRAVDA** – klíče v `BALANCE.start` neexistují (jsou `population`/`housing.tent`) |
| A1: `createPlayerState` vrací `gold:0` natvrdo | `createHomeState.js:46-48` | **PRAVDA** |
| **A2: `gold`/`techPt` NEJSOU v `ID_CATALOGS` → `byId` throw → fallback 'resource'** | `node` probe `resourceKindOf('gold')` + `resources.json` + `loader.js:23-24` | **NEPRAVDA – viz B1** |
| A2: handler `gold` čte přes `home.store` (=0) → insufficient funds | `node` probe `handlerFor('gold').get` | **NEPRAVDA**: vrací `player.gold` (=500) správně |
| A3: před A2 crime `pay({gold})` hodí vždy při incidents>0 | odvozeno z B1 | **NEPRAVDA** (premisa A2 neplatí) |
| A4: `matRate=0.04` roční aplikovaná denně | `health.js:41` + `balance.js:121-122` + `tickOrder` noon | **PRAVDA** |
| A4: tent `capacity:null` → births bez stropu | `houseTypes.json:9` + `population.js:28` + `health.js:47` | **PRAVDA** |
| A4: `populationRetirement` má stejný bug (roční retRate denně) | `population.js:85-88` | **PRAVDA** |
| A4: births/retirement bez RNG (čistý floor) | `health.js:40-51`, `population.js:85-88`, `formulas.natality` | **PRAVDA** – determinismus na RNG nedotčen |
| A5: `styles.css` nemá žádné pravidlo pro `.market-table` | `styles.css` (55 řádků) | **PRAVDA** – žádné table/market pravidlo |
| A5: market tabulka má 5 sloupců | `screens.js:80-111` | **ČÁSTEČNĚ** – header má **6** sloupců (viz MINOR-2), fix tím netrpí |
| §6: save version zůstává 3, tvar stavu se nemění | `createInitialState.js:52`, `persistSchema.js` | **PRAVDA** – seedují se jen hodnoty allowlistovaných polí |
| Suite je zelená dnes | `node --test` | **PRAVDA**: 762 pass / 0 fail |

---

## 2. Nálezy

### BLOCKER

#### B1 — A2 „BLOCKER" v aktuálním kódu neexistuje; premisa je fakticky nesprávná
**Soubor/řádek návrhu:** §2 A2, řádky 96-139 (zejm. 99-101).
**Tvrzení návrhu:** „`gold` a `techPt` NEJSOU v `ID_CATALOGS` … Měny nejsou katalogové položky.
→ `byId('gold')` throw → fallback `'resource'`."

**Realita (empiricky ověřeno):**
- `src/data/resources.json:7-27` obsahuje **přímo** položky `{"id":"gold","kind":"gold"}` a
  `{"id":"techPt","kind":"techPt"}`.
- `resources` JE v `ID_CATALOGS` (`src/core/catalog/loader.js:23-24`).
- `resources` se nahrává na bootu i v testech: `src/app/catalogs.js:10-21` (CATALOG_NAMES obsahuje
  `'resources'`), `loadAllCatalogs` volá `buildById()`.
- Probe potvrdil: `resourceKindOf('gold') === 'gold'`, `resourceKindOf('techPt') === 'techPt'`,
  `handlerFor('gold').get({player:{gold:500},...}) === 500`.

**Tedy:** `resourceKindOf` se NEdostane do `catch` větve, `byId('gold')` **nehází**, handler
`resourceHandlers['gold']` čte/píše `state.player.gold` **správně už dnes**. Proto je
`accounting-invariant.test.js` (762/762) zelený – ne „triviálně přes špatný handler", ale protože
gold reálně teče do `player.gold`.

**Důsledek:** Doporučená oprava A2 (early-return `if (key==='gold'||key==='techPt') return key`)
je **no-op** – jen by zdvojila chování, které již zajišťuje katalog. Není to bug fix, je to
redundance. Riziko: coder ji implementuje, „ověří" green suite (která byla green i bez ní) a tým
získá falešnou jistotu, že byl opraven kritický bug, který neexistoval.

**Proč playtest #2 přesto pozoroval „Zlato 0"/insufficient funds:** plně to vysvětluje **A1 sám**
– fresh start má `pop=0` a `gold=0`. S `pop=0`: `crimeDaily` early-return (`crime.js:29`), taxes
generují 0, market nemá co utratit. „Zlato 0" = A1, ne resolver. Finding #2 je s vysokou
pravděpodobností **misdiagnóza navrstvená na #1**.

**Návrh řešení (podmínka GO):**
1. Přepsat §2: A2 **NENÍ bug** v aktuálním kódu; ponechat max jako **defensivní invariant test**
   (grep-gate „`gold`/`techPt` musí být v katalogu s kind", nebo unit `resourceKindOf('gold')==='gold'`)
   – ne jako kódovou změnu resolveru.
2. Pokud chce tým early-return jako pojistku proti budoucímu odstranění gold/techPt z katalogu,
   označit ji explicitně jako **redundantní hardening, ne fix** (a otestovat, že nezmění chování).
3. Reklasifikovat: jediný skutečný start-crash blocker je **A1** (prázdný stav → nuda/„nic na práci",
   ne crash). Pokud existoval reálný crash, musí pocházet odjinud – viz M3.

---

### MAJOR

#### M1 — §7 (accounting invariant) navazuje na vyvrácenou premisu
**Návrh §7, řádky 343-359.** Tvrzení „Před A2 `grant/pay({gold})` zapisovaly do `home.store.gold`,
NE do `player.gold` … invariant byl reálně porušen v běhu" je **nepravdivé** (viz B1). V běhu
gold teče do `player.gold` už dnes (katalog resolvuje správně). `accounting-invariant.test.js`
proto měří smysluplně už teď. Doporučení „posílit assertion po A2" je OK jako *hardening*, ale
**ne** jako náprava porušeného invariantu. **Podmínka GO:** přepsat §7 tak, aby netvrdil
historické porušení invariantu; ponechat jen volitelné posílení testu (assert `grant({gold:N})`
zvýší `player.gold` o N).

#### M2 — A3 „skutečné latentní riziko throw vždy při incidents>0" je nepravdivé
**Návrh §3, řádky 156-157.** Vyplývá z B1. Crime `pay({gold})` dnes NEhází kvůli resolveru.
Reálná analýza A3 je jinak **správná**: `goldLoss = Math.min(floor(incidents*0.5), player.gold)`
(`crime.js:45`) je už clampnutý + `>0` guard + `player.gold>0` guard (`crime.js:44`) → `pay`
za normálních okolností nehází. **A3 je tedy fakticky no-op / již ošetřeno** – návrh to nakonec
sám připouští (řádky 159-168), ale chybně přes „závislost na A2". **Podmínka GO:** přepsat
zdůvodnění A3: clamp je správný *sám o sobě*, ne „po A2"; ponechat jen invariant-test
„crime nikdy nehodí pro pop∈{0..N}, gold∈{0..M}" (hodnotný regress guard).

#### M3 — Re-diagnóza playtest findingu #2 je nutná PŘED implementací
**Riziko procesu.** Playtest-findings-mvp.md #2 i architektova A2 sdílejí stejný omyl. Pokud
orchestrátor/uživatel schválí návrh „as-is", coder dostane task „oprav resolver gold/techPt"
na neexistující bug, zatímco **skutečná příčina** pozorovaného chování (A1 prázdný stav) je
sice pokrytá, ale jakýkoli *jiný* reálný crash z playtestu zůstane neidentifikovaný.
**Podmínka GO:** explicitně v návrhu (a v briefu pro codera) uvést, že #2 byl re-verifikován
proti kódu jako **neplatný**, a že observované symptomy řeší A1. Pokud playtest zaznamenal
konkrétní stack-trace „insufficient funds" za běhu se `pop>0`, je nutné ho dohledat – jinak
nelze tvrdit, že iter-012 onboarding crash skutečně odstraní.

---

### MINOR

#### MINOR-1 — `DAYS_PER_YEAR` je odvoditelné: 364, ne „360 vs 365"
Návrh §4 (ř. 205-206) a P1 (ř. 463-464) nechává konstantu otevřenou. Kalendář:
`BALANCE.season.seasonDays = 91` (`balance.js:28`) × 4 sezóny = **364 dní/rok**
(`stepsPerSeason 81900 = 900×91`, `stepsPerDay 900`). Doporučení: předepsat `DAYS_PER_YEAR = 364`
(nebo `4 * BALANCE.season.seasonDays`) místo „coder ověří 360/365". Zmenší to prostor pro chybu
a zajistí konzistenci births/retirement.

#### MINOR-2 — Market tabulka má 6 sloupců, ne 5
Návrh §5 (ř. 263) píše „5 sloupců". Realita (`screens.js:82-89`): Zboží, Dostupné, Nákupní cena,
Prodejní cena, V inventáři, Akce = **6** (a `colspan="6"` na ř. 93). Fix (scroll wrapper +
`.market-actions` CSS) tím netrpí – `.market-actions` třída v markupu existuje (`screens.js:101`).
Jen opravit počet pro přesnost; CSS pravidla jsou jinak aplikovatelná as-is.

#### MINOR-3 — A4 sanity cap: migrace zůstává neošetřená i pro non-tent
Návrh §4 řeší hard-cap v `healthBirths`, ale `populationMigration` (`population.js:72`) má pro
`capacity<=0` limit `MAX_SAFE_INTEGER`. Pro tent-only je attractiveness 0 (dopad nulový – návrh to
zmiňuje), ALE `hovel` má attractiveness **-1** a `publichouse` **-10** (`houseTypes.json`).
Negativní attractiveness → `migrationRatePerStep < 0` → `migrationAcc` může jít do záporu a
`Math.floor` záporného čísla je ≤ -1 → `toAdd<0`, `actualAdd=max(0,…)=0` → bez efektu. Tedy
reálný únik populace přes migraci je nepravděpodobný, ale doporučuji do návrhu přidat větu, že
globální sanity-cap (`Math.min(pop, sanityMaxPop)`) je vhodné aplikovat **jednotně** (i v migraci),
ne jen v births – jinak je strop asymetrický a budoucí kladná migrace bez budov by ho obešla.

#### MINOR-4 — A1/load.js: doporučení je správné, ale ať coder NEzdvojí seed
Návrh §1 (ř. 61-70) správně identifikuje, že `load.js:211-212` přepisuje `home`/`player` přes
`createHomeState(catalog)`/`createPlayerState()` PO `createInitialState`. Po refaktoru musí seed
zůstat před `applyPayload`. Upřesnění: nejjednodušší je v `load.js` **odstranit** řádky 211-212
(`state.home`/`state.player` už jsou nasídlené z `createInitialState`) – ne přidávat druhou seed
cestu. `applyPayload` (allowlist) pak přepíše uložené hodnoty. Doporučuji to v návrhu uvést
explicitně jako „smazat 211-212", ať coder nevytvoří dvě divergentní seed větve.

#### MINOR-5 — A4 test `allows unlimited growth with null-capacity housing` (population.test.js:254)
Po zavedení globálního sanity hard-capu přestane být „unlimited" doslova pravda. Při pop=1000 a
capu ~10000 test stále projde (1000+born < 10000), ale **název/intent** je zavádějící. Doporučuji
v návrhu §8 do „Aktualizace existujících" přidat i tento test (přejmenovat na „grows up to sanity
cap" / upravit assertion), ne jen births/retirement hodnoty. Návrh R-A4-4 zmiňuje obecně
„population.test.js" – konkretizovat o tento případ.

---

### NIT

- **NIT-1** (§3 ř. 159-168): A3 sekce je rozvláčná pro „žádná změna kódu". Zkrátit na: clamp je
  správný, přidat regress test, hotovo.
- **NIT-2** (§9 diagram, ř. 425-440): větev „PŘED A2 (bug)" → `byId('gold') THROW` →
  `home.store.gold` je fiktivní (B1). Po opravě návrhu diagram zjednodušit/odstranit bug větev.
- **NIT-3** (§0 tabulka, ř. 27-29): „A1 a A2 jsou provázané … po opravě A1 by hra spadla na A2"
  – odstranit, neplatí (A2 neexistuje).

---

## 3. Posouzení pořadí implementace

Návrh doporučuje A2→A1→A3→A4→A5. Po korekci B1:

- **A2 odpadá** jako kódová změna (max redundantní hardening/test). Pořadí „A2 první, aby
  odblokoval A1/A3" ztrácí smysl – nic neodblokovává, A1 funguje samostatně.
- **Doporučené nové pořadí:**
  1. **A1** – jediná reálná start-state oprava (seed z `BALANCE.start` v `createInitialState`
     + `load.js` smazat 211-212 + odstranit chybné čtení v `createHomeState`).
  2. **A4** – denní sazba (matRate/retRate / 364) + globální sanity hard-cap v `healthBirths`
     (a jednotně v migraci, MINOR-3); nezávislé na A1 logikou.
  3. **A3** – jen regress test (no-throw invariant), bez kódové změny; nezávislé na A1/A4.
  4. **A5** – čistě UI/CSS; nezávislé; poslední.
  5. **(volitelně) A2-hardening** – pokud tým chce, jako poslední, explicitně označené jako
     redundance, ne fix.
- A1 a A4 spolu generují nové fresh-state / long-sim hashe – párovat jejich fixture update
  (§6 návrhu je tu jinak správný a užitečný).

---

## 4. Dopad na determinismus / save-hash / accounting (posouzení)

- **Determinismus**: návrh §6 je **správný** v jádru – A1/A4 nemění počet ani pořadí RNG draws
  (births/retirement jsou čistý `floor` bez RNG, ověřeno; `crimeDaily`/`healthDisease` konzumují
  `population` stream beze změny). Round-trip determinismus držen. **GO** na determinismus.
- **Save-hash**: §6 správně – fresh-state hash se změní (gold 500/pop 50/bread 20), long-sim
  trajektorie po A4 se změní; save version zůstává 3 (žádná změna tvaru, jen hodnot allowlistovaných
  polí – ověřeno proti `persistSchema.js`). Doporučení „přepočítat jen dotčené fixtures, ne
  hromadně" je správné.
- **Accounting invariant**: §7 je **fakticky špatně** (M1) – invariant NEbyl porušen; gold teče
  do `player.gold` už dnes. Po korekci §7 je dopad **neutrální** (žádná změna accountingu z A1/A4/A5;
  A3 beze změny). `accounting-invariant.test.js` zůstane zelený.

---

## 5. Mezery / co v návrhu chybí

1. **Empirické ověření A2 proti katalogu** – návrh tvrdí „Ověřeno: gold/techPt nejsou v ID_CATALOGS"
   (ř. 136-137), ale to je opak pravdy. Architekt neověřil `resources.json`. **Klíčová mezera.**
2. **Re-diagnóza skutečné příčiny playtest crashe** (M3) – pokud byl reálný „insufficient funds"
   crash se `pop>0`, návrh ho nevysvětluje (A2 ho nezpůsobuje).
3. **Migrace sanity-cap** (MINOR-3) – cap jen v births, ne jednotně.
4. **Konkrétní `DAYS_PER_YEAR`** (MINOR-1) – ponecháno otevřené, přitom odvoditelné (364).
5. **`population.test.js:254` přejmenování** (MINOR-5) – chybí v seznamu test-update.

---

## 6. Co je v návrhu DOBŘE (nepřehlížet)

- **A1** – diagnóza i doporučení (seed v `createInitialState`, single source of truth, factory
  jako neutral defaults) jsou **správné a dobře zdůvodněné**. Alternativa (seed ve factory)
  oprávněně zamítnuta.
- **A4** – diagnóza roční-vs-denní sazby + chybějícího housing stropu je **správná a hodnotná**;
  volba globálního hard-capu místo změny sdílené `calcHousingDerivedFromCatalog` je rozumně
  konzervativní (R-A4-2 mitigace dobrá). Zahrnutí retirement bugu je správné.
- **A5** – minimální CSS fix bez přepisu komponenty je vhodný; reuse `var(--…)` proměnných
  správně doporučeno; card layout správně odložen na M9.
- **§6 determinismus/save** – analýza RNG-neutrality a allowlist-kompatibility je správná a
  užitečná pro codera.
- Struktura (root cause s řádky, doporučená varianta + zamítnutá alternativa, rizika) je vzorná.

---

## 7. Podmínky pro GO (musí být splněno před dispatchem coderovi)

1. **B1**: Přepsat §2 (A2) – uznat, že gold/techPt JSOU v `resources.json` a resolvují správně;
   A2 reklasifikovat z BLOCKER na (volitelný) redundantní hardening + test. Žádný „fix resolveru"
   jako bug.
2. **M1**: Přepsat §7 – netvrdit historické porušení accounting invariantu.
3. **M2**: Přepsat §3 (A3) – clamp je správný sám o sobě, ne „po A2"; ponechat regress test.
4. **M3**: Doplnit re-diagnózu playtest #2 (neplatný proti kódu; symptomy řeší A1) a, pokud
   existuje konkrétní runtime stack-trace, dohledat skutečnou příčinu.
5. **MINOR-1**: Předepsat `DAYS_PER_YEAR = 364` (= 4×seasonDays).
6. **MINOR-3, MINOR-5**: Doplnit migrační sanity-cap a `population.test.js:254` do scope.

Po splnění 1–6 (zejm. 1–4) je návrh připraven k implementaci s pořadím A1→A4→A3→A5.
A1, A4, A5 mohou jít do implementace **bez čekání** na zbytek (jejich diagnóza je platná) –
blokující je pouze odstranění mylného A2/§7/§3 narrativu, ať coder neimplementuje no-op a tým
nezíská falešnou jistotu o opraveném „blockeru".

---

## 8. Předpoklady a nejistoty reviewera

- **U1**: Probe skripty běžely v Node (stejné prostředí jako `node --test`); produkční boot
  (`src/app/catalogs.js`) nahrává `resources` přes `fetch` – ověřeno čtením, že CATALOG_NAMES
  obsahuje `'resources'` a `loadAllCatalogs` volá `buildById()`. Považuji za jisté, že B1 platí
  i v prohlížeči.
- **U2**: Nemám přístup k surovému playtest stack-trace (jen sumář v `playtest-findings-mvp.md`).
  M3 stojí na tom, že observované „Zlato 0" plně vysvětluje A1. Pokud playtest viděl crash se
  `pop>0`, je nutné dohledat – proto podmínka, ne blocker.
- **U3**: Long-sim determinism fixture jsem nehledal vyčerpávajícím způsobem; §6 návrhu „pokud
  existuje" ponechávám na coderovi (suite je dnes zelená, žádný takový fixture nehavaroval).
