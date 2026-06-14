# Review tří architektonických analýz + konsolidovaný refactoring seznam (T-003)

- **Task**: T-003, iter-001
- **Autor**: reviewer
- **Datum**: 2026-06-12
- **Model**: Opus
- **Vstupy review**: T-001 (klíčové mechaniky), T-002a (výkon/offline/server), T-002b (údržba/architektura)
- **Zdroj pro ověření**: `doc/original_source/modules/prosperity/**`, `.aiworkflow/zadani_projektu.md`
- **Účel**: Quality gate před schválením uživatelem (T-005). Posouzení úplnosti, technické správnosti, proveditelnosti; jeden konsolidovaný prioritizovaný seznam; verdikt GO / GO s úpravami / NO-GO.

---

## 0. Souhrnný verdikt

**GO s úpravami.** Všechny tři analýzy jsou věcné, technicky správné a použitelné jako vstup pro návrh rebuildu. Namátkové ověření 9 high-impact tvrzení proti zdroji: **8 plně potvrzeno, 1 sporné (drobná nepřesnost v citaci, závěr platí)**. Priority dávají pro cíl mobile-first PWA/offline smysl, žádné zásadní over- ani under-engineering. Konsolidace T-002a+T-002b je proveditelná bez nevyřešitelných konfliktů.

**Úpravy před schválením nejsou blokující** – jde o 4 drobné opravy přesnosti/konzistence (viz §5), z nichž **žádná nevyžaduje T-004 architect rework**; stačí lehká redakce, případně poznámka v navazujícím návrhu. Žádný BLOCKER nenalezen.

---

## 1. Verdikt po analýzách

### T-001 – klíčové mechaniky (popisná analýza)
- **Úplnost: vysoká.** Pokrývá všech 12 rovin z Scope IN zadání (engine/čas, sezóny, populace+bydlení, jídlo, produkce les/pole/důl, ekonomika/trh/karavany, budovy, tech+skilly, AI svět+diplomacie, vojsko+bitvy, příběh/eventy/achievementy, save/load) + mapu závislostí (§13) a shrnutí architektonických vzorů (§14). Nic z mechanik Scope IN nechybí.
- **Správnost: vysoká.** Tvrzení, která jsem ověřoval (dvojí časový režim, schedule+callFn dispatch, save = „stav minus katalog", server /market jako jediná neklientská část), sedí se zdrojem.
- **Proveditelnost: N/A** (popis, nehodnotí). Dokument korektně drží roli „popisuje, nedoporučuje".
- **Předpoklady jsou poctivě uvedeny** (§15): plné JSON katalogy nejsou v repu, čísla balancu nutno dotěžit z runtime dumpu – to je reálné riziko, správně eskalované.
- **Verdikt: approve.** Slouží jako spolehlivá referenční báze pro T-002a/b.

### T-002a – výkon / save-offline / server
- **Úplnost: vysoká.** Pokrývá runtime smyčku, kompozitní step, drift/throttling, bitvy, schedule, save serializaci (A); persistence, autosave, save model, load pipeline, offline catch-up (B); katalogy, /market, gamesaves, online prvky (C). Vše navázáno na acceptance criteria.
- **Správnost: vysoká.** Ověřené bugy (Skills 2×, /market precedence, Engine.curStep, server-only save, mrtvá copy smyčka) potvrzeny – viz §3.
- **Proveditelnost & priorita: dobrá.** Formát Problém→Dopad→Priorita→Alternativa→Riziko/úsilí je konzistentní; u kontroverzních bodů (offline catch-up, bitvy, /market) uvádí zamítnuté alternativy s důvodem. Priority odpovídají cíli (viz §4).
- **Drobnost:** citace signatury `Game.save` (viz §5, F2) je nepřesná.
- **Verdikt: approve s drobnou redakcí.**

### T-002b – údržba / architektura
- **Úplnost: vysoká.** Provázanost/centrální uzly (A), křehkost dispatchů a load pipeline (B), UI↔logika (C), balanc-as-code (D). Doplňuje T-002a bez překryvu v jádru (oba se vědomě dělí; překryvy jsou jen tam, kde to dává smysl – viz §6).
- **Správnost: vysoká.** Nejlépe doložená analýza – konkrétní řádky a ověřitelné defekty (4 dispatchery, fish v canAfford, osiřelý monthly report, home.js:970). Vše potvrzeno – viz §3.
- **Proveditelnost & priorita: dobrá.** Závěrečná tabulka má jasné pořadí a zdůvodnění „proč v tomto pořadí"; zamítnuté celkové alternativy (1:1 port, plný ECS) jsou rozumně odůvodněné. ECS-as-overkill je správný call vzhledem k agregátní simulaci (T-001 §14.5).
- **Verdikt: approve.**

---

## 2. Úplnost napříč (chybí něco podstatného?)

Žádná velká mezera. Drobné mezery / témata k doplnění v navazujícím návrhu (ne-blockery, **nevyžadují T-004 rework**, jen evidovat):

- **G1 – RNG determinismus pro catch-up.** T-002a B5 (varianta a, dávkový fast-forward) i T-002b zdůrazňují per-krok RNG. Pro offline catch-up i pro testovatelnost vzorců (T-002b D2) je potřeba **seedovatelný/serializovatelný RNG** (originál používá `Math.random()` + `services/rand.js`). Ani jedna analýza to explicitně nevytahuje jako návrhové rozhodnutí, přitom je to předpoklad reprodukovatelnosti dávkové simulace. Doplnit do návrhu engine. (Priorita: Med.)
- **G2 – Bitvy během catch-upu.** T-002a B5 zmiňuje „auto-resolve obranných bitev" jako balanční otázku k eskalaci, ale konsolidace s T-002b C3 (bitva jako deterministický automat) ji nedotahuje: pokud bitva poběží na jednotném časovém zdroji a bude serializovatelná, auto-resolve při catch-upu je její přirozený důsledek. Spojit obě (viz konsolidovaná položka K7). (Priorita: Med.)
- **G3 – `services/rand.js` a `item.js`** nejsou v žádné analýze zmíněny. Nejsou architektonicky kritické, ale `rand.js` souvisí s G1. Pouze poznámka.
- **G4 – Achievementy/unlocky deklarativně** (T-002b C4) jsou Low; v zadání jsou achievementy Scope IN, takže je správné je mít evidované, ne řešit teď. OK.

Závěr úplnosti: trojice pokrývá zadání. G1/G2 jsou doplňky do návrhové fáze, ne díry v analýze.

---

## 3. Namátkové ověření high-impact tvrzení proti zdroji

| # | Tvrzení | Zdroj | Závěr |
|---|---|---|---|
| V1 | `Skills.step()` voláno 2× za krok | `game.js:18` (Game.run) + `world.js:575` (World.step) – obě volají `Skills.step()` ve stejném tiku | **POTVRZENO** |
| V2 | `Engine.curStep` je undefined → `isNewDay/isNewNoon` vždy false | `world.js:568-569` čte `Engine.curStep` (service property); `engine.js` service literál (ř. 233-258) má jen metody, žádné `curStep` – stav žije na `$rootScope.engine.curStep`. `Engine.curStep` = undefined → `NaN % x` → false | **POTVRZENO** |
| V3 | `/market` precedence bug → fetch každý den, ne každých 5 dní | `market.js:25` `$rootScope.engine.curStep % $rootScope.STEPSPERDAY * 5 == 0`; `%` má vyšší prioritu než `*` → `(curStep % 900) * 5 == 0` → true jen při `curStep % 900 == 0` = denně. Aktivní fetch je `getUpdatedData()` | **POTVRZENO** |
| V4 | `/market` 401 → redirect na `/signin` | `market.js:300-303` v error větvi `getUpdatedData` | **POTVRZENO** |
| V5 | `canAfford` nezná `fish` (food), liší se od `count`/`pay` | `player.js:290` food = `fruit\|cheese\|bread\|meat\|vegetable` (bez fish); `count` (ř. 93) fish má; `listFood` (listfood.js:14) fish definuje → propadne do default `count()`, řeší to náhodou správně | **POTVRZENO** |
| V6 | 3 různé pravdy o jobech: canAfford vs count vs pay | `canAfford` (ř. 298) `farmer\|miner\|lumberjack\|hunter\|bum`; `count` (ř. 83) navíc `apothecary\|tinkerer\|researcher`; `pay` obecně přes `type=='job'` | **POTVRZENO** |
| V7 | `insertInventory` vytvoří osiřelý monthly report (produkce se nezaúčtuje) | `player.js:377-382` při chybějícím reportu vytvoří lokální `curMonthlyReport` bez zápisu zpět do `monthlyReports[...]`; `pay` (ř. 126) to dělá správně | **POTVRZENO** |
| V8 | `home.js:970` precedence bug ve vzorci nemoci | `home.js:970` `(0.02 + $rootScope.itemList.p_innoculation.running ? 0.01 : 0)`; `+` váže před `?:` → `(0.02 + running) ? 0.01 : 0` → vždy `0.01` (resp. NaN→0 když running undefined). Záměr „základ 0.02 + bonus" ztracen | **POTVRZENO** |
| V9 | Save výhradně server REST; mrtvá copy smyčka v `Game.save` | `game.js:113` `var server = true`; `createLocalSave` zakomentovaný (ř. 202+); `game.js:116-118` deep-copy každé itemList položky do `x`, výsledek zahozen; `engine.logs` ukládány celé přes `jQuery.extend(true,{},engine)` (ř. 134) | **POTVRZENO** (s drobností – viz §5 F2) |

**Skóre: 9/9 potvrzeno věcně; 1 (V9) má drobnou nepřesnost v citaci signatury, závěr platí.** Bonus k třem doložil i `Engine.step` try/catch polykající chyby callFn (`engine.js:244-246`) – potvrzeno (podpora pro T-002b B1).

---

## 4. Posouzení priorit pro cíl mobile-first PWA / offline

Priority obou refactoring analýz dávají smysl. Konkrétně:

**Správně High (potvrzuji):**
- Persistence local-first (T-002a B1/C3), katalogy bundle/precache (C1), fixed-timestep + akumulátor (A3), offline catch-up (B5), klientský trh (C2), tick bez render daně (A1) – to je přesně to, co odblokuje acceptance criteria „offline + spolehlivý save". Bez nich projekt nesplní zadání. Souhlasím s prioritou i s argumentem, že tvoří jeden koherentní celek.
- Oddělení stavu od UI (T-002b A1, C1+C2), transakční registry (A3+B4), balanc do dat + vzorce jako čisté funkce (D1+D2), fail-fast fns registr (B1+B2) – High oprávněně: zadání explicitně žádá „logika oddělená od UI, data-driven obsah" a „věrnou replikaci balancu". Bez D1/D2 nelze balanc verifikovat jinak než hraním.

**Správně Med/Low (potvrzuji):**
- Save schéma allowlist (T-002a B3/B4) jako Med: princip „stav minus katalog" je dobrý, řeší se implicitnost – rozumné.
- Schedule heap/index (A7), socket.io/admin API (C4), achievementy (T-002b C4) jako Low – správně odložitelné.

**Žádný nález nepovažuji za over-engineering.** ECS byl správně zamítnut (T-002b). Analytická aproximace offline (T-002a B5 var. b) správně zamítnuta jako primární – dvojí balanc by byl over-engineering proti věrnosti.

**Možné under-engineering / hlídat:**
- **A5/A12 (Skills 2×) jako Med** je obhajitelné, ale je to **balanční past s tichým dopadem** – pokud se zapomene, skilly poběží 2× pomaleji. Doporučuji povýšit viditelnost (ne nutně prioritu): zapéct do balančních dat **hned při portu skillů**, ne „někdy". Stejně tak `/market` denní perioda (z bugu V3) – T-002a to správně bere jako referenční chování; jen ať se to vědomě zapíše do balanc-as-code, ne zopakuje omylem.
- **G1 (seedovatelný RNG)** – chybí jako explicitní High/Med předpoklad catch-upu (viz §2). Mírné under-scoping.

---

## 5. Nálezy vyžadující úpravu (ne-blockery; T-004 rework: NE u všech)

Žádný z těchto nálezů **nevyžaduje T-004 architect rework** – jde o redakční přesnost. Uvádím je pro úplnost a pro čistotu vstupu do návrhu.

- **F1 (T-002a A6 / T-002b B5, Engine.curStep):** Obě analýzy popisují důsledek správně, ale stojí za upřesnit, že `Engine.curStep` je **service-level** undefined, zatímco `$rootScope.engine.curStep` existuje a funguje (proto si služby den počítají lokálně z `$rootScope.engine.curStep`). T-002a A6 to naznačuje („Engine service žádné curStep nemá"), formulace je správná. **Bez rework, jen dobré ponechat přesné.**
- **F2 (T-002a A8/B1, citace `Game.save`):** Text odkazuje na `game.save(true, null, $rootScope.curGameSave)` (to je volání z `autoSave`, ř. 45), ale skutečná definice je `save: function(callback)` (ř. 112) – funkce extra argumenty ignoruje. Substance (server-only, deep copy, dead loop, logy v savu) platí. **Doporučení: opravit citaci signatury. T-004 rework: NE.**
- **F3 (T-002a C2, řádky /market):** Analýza cituje fetch „market.js ř. 263–305" – `getUpdatedData` reálně začíná na ř. 263, 401 redirect ř. 300-303; sedí. Precedence bug je ale na ř. **25** (volání), ne uvnitř fetch funkce – text to má správně oddělené, jen ať číslo ř. 25 zůstane explicitní v konsolidaci. **Bez rework.**
- **F4 (konsolidace G2, bitvy v catch-upu):** T-002a B5 a T-002b C3 řeší bitvu ze dvou stran; konsolidace je musí spojit do jedné položky (K7), jinak hrozí, že se auto-resolve při offline catch-upu navrhne dvakrát nebo nikde. **Vyřešeno v §6 (K7). Bez rework.**

**Závěr: 0 BLOCKER, 0 položek vyžadujících T-004 rework.** F1–F4 jsou volitelná redakce; lze je zohlednit přímo v navazujícím architektonickém návrhu, není nutné reopen T-001/T-002.

---

## 6. JEDEN konsolidovaný prioritizovaný refactoring seznam (T-002a + T-002b)

Sjednoceno, překryvy zmergovány, konflikty priorit vyřešeny. Notace: **[a]** = původ T-002a, **[b]** = T-002b. Priorita = výsledná po konsolidaci. „Vrstva" rozlišuje, zda jde o runtime/save (a) nebo údržba/architektura (b) – řazeno tak, aby šlo stavět odshora.

### Konflikty priorit – jak vyřešeny
- **Stav + hranice UI/simulace:** T-002b A1 (High) je *předpoklad* pro většinu T-002a runtime nálezů (čistý serializovatelný stav umožní levný krok i čistou konstrukci při loadu). Sloučeno do **K0** jako bázové rozhodnutí (nejvyšší).
- **Bitvy:** T-002a A4 (High UX – serializovatelná, na engine čase) + T-002b C3 (Med – deterministický automat). Výsledek **K7 = High**: vyšší ze dvou, protože mobilní přerušení + offline catch-up to dělají kritickým; údržbová stránka (b) je součástí téhož.
- **Save model:** T-002a B3/B4 (Med, formát) + T-002b B3 (Med, údržbová stránka re-link kaskády) → jedna položka **K9 = Med** (deklarativní schéma řeší obojí).
- **Step rozpad:** T-002a A2/A6 (Med, výkon) + T-002b A2/A5 (High/Med, údržba – rozpad Home.step) → **K6 = High** (povýšeno: je to předpoklad iterativní dodávky mechanik *i* levného fast-forwardu; obě analýzy se shodují, že bez něj nejde ani jedno).
- **Skilly 2× / balanc:** T-002a A5 (Med) je podmnožinou balanc-as-code T-002b D1/D2 → **K4** nese D1/D2 jako High a Skills-fix jako jeho konkrétní položku.

### Konsolidovaný seznam

| # | Položka (sjednocené nálezy) | Priorita | Úsilí | Vyžaduje T-004? | Pozn. |
|---|---|---|---|---|---|
| **K0** | **Jediný serializovatelný herní stav vlastněný simulací; UI read-only + command/intent API** [b A1, b C2] | **High** | M | Ano – bázové rozhodnutí návrhu | Vše ostatní na něm stojí; nelze dolepit později |
| **K1** | **Local-first persistence: IndexedDB, generace savů, autosave triggery (perioda + pagehide/visibilitychange + po událostech), `lastSimTimestamp`** [a B1, a B2, a C3] | **High** | S–M | Ano (návrh save vrstvy) | Blokuje acceptance criteria; bez toho nic dalšího nedává smysl |
| **K2** | **Katalogy jako verzované assety v repu, bundle/precache service workerem, loader s fail-stavem** [a C1] | **High** | S | Ne (návazné dotěžení katalogů = samostatný úkol) | Nejlevnější High; blokuje offline start |
| **K3** | **Fixed-timestep engine s akumulátorem: krok bez render daně, dávkování, jeden mechanismus pro drift + background + offline catch-up; cap na catch-up** [a A1, a A3, a B5] | **High** | M | Ano (jádro engine) | Stejný kód pro live i offline; vyžaduje levný krok (K6) a seedovatelný RNG (K10) |
| **K4** | **Balanc do dat + vzorce jako čisté testovatelné funkce; zapéct kompenzaci Skills-2× a vědomou /market periodu** [b D1, b D2, a A5, a C2-perioda, b B5] | **High** | S–M | Ano (definice balanc modulu) | Podmínka „věrné replikace balancu"; extrakce čísel se musí udělat tak jako tak |
| **K5** | **Transakční registry místo 4 dispatcherů (pay/canAfford/insertInventory/count) + validace cost/products klíčů proti registru zdrojů; účetnictví jako observer** [b A3, b B4] | **High** | S–M | Ano (návrh resource vrstvy) | Prokázané defekty (fish, osiřelý report, NaN); malé úsilí, velký zisk |
| **K6** | **Rozpad Home.step na systémy s centrálně deklarovaným pořadím ticku + deklarativní scheduler (periody jako data); odstranit modulo prology a alokace v hot-path; jeden zdroj časových hran (řeší Engine.curStep/isNewDay)** [b A2, b A5, a A2, a A6] | **High** | M | Ano | Předpoklad iterativní dodávky mechanik *i* levného fast-forwardu |
| **K7** | **Klientská tržní simulace (available/max lokální stav, drift, cenový vzorec beze změny); odstranit /market fetch + 401 redirect** [a C2] | **High** | M | Ano (návrh + balanc eskalovat) | Jediná serverová závislost uvnitř jádra; balanc kalibrovat v dedikované iteraci |
| **K8** | **Bitva jako serializovatelný deterministický automat na jednotném časovém zdroji; commands místo click-mutací; auto-resolve při offline catch-upu** [a A4, b C3, a B5-bitvy] | **High** | S–M | Ano (návrh teď, stavět později) | Mobilní přerušení uprostřed bitvy; převod ms→tick 1:1; riziko na „feel" |
| **K9** | **DOM/UI ven z enginu a herních fns: doménové události (notification/log/storyMode) do event-busu ve stavu; gamelog/notifikace jako data (ring buffer)** [b C1] | **High** | S–M | Ano | Přímo proti cílům zadání; levné, pokud platí K0; předpoklad headless simulace (catch-up) |
| **K10** | **Fail-fast string-ID registr (`callFn`/`fns`): register+validace ID při insertu, strukturované logování bez polykajícího catch-all, validace serializovatelnosti params; rozbití config.js monolitu na data + chování + konstanty** [b B1, b B2] | **High** | S–M | Ano | Princip string-ID zachovat (kvůli serializaci schedule), jen bezpečný a modulární |
| **K11** | **Deklarativní persistence schémat per entita (allowlist) místo cleanSaveObj denylistu + merge-load + ad hoc fixup; load jako čistá konstrukce; verzované migrace** [a B3, a B4, b B3] | **Med** | M | Ano (návrh save schématu) | Princip „stav minus katalog + re-aplikace upgradů" zachovat; řeší i fixNaNs reparace |
| **K12** | **Save serializace mimo main thread (Worker), zrušit mrtvou copy smyčku, gamelog neukládat celý** [a A8] | **Med** | S–M | Ne | Z velké části odpadá s K1/K11 |
| **K13** | **Immutable katalog + vrstva modifikátorů (effective = base × ∏ modifikátory); save ukládá jen seznam aktivních modifikátorů** [b D3] | **Med** | M | Ne (až existují katalogy + tech systém) | Řeší base* dvojníky a pořadí skládání; bonus UI tooltipy |
| **K14** | **Akce obsahu jako data (registr efektů, string-ID): `onBuild`/`applyUpgrade`/event akce do registru** [b D4] | **Med** | M | Ne | Dokončuje data-driven obsah spolu s K13 |
| **K15** | **Katalogy per typ se schématem/validací + tenký `byId` index** [b A4] | **Med** | M | Ne (postupně po doménách) | Oddělit katalog (immutable) od stavu instance |
| **K16** | **Seedovatelný/serializovatelný RNG** [nový – G1] | **Med** | S | Ne | Předpoklad reprodukovatelného catch-upu a testů vzorců |
| **K17** | **Schedule: setříděná mapa/heap keyed číslem, `countEvent` → index, zrušit GC; zachovat serializovatelnost** [a A7] | **Low** | S | Ne | Řešit při návrhu nového enginu, ne izolovaně |
| **K18** | **Deklarativní achievementy/unlocky (predikát-as-data, centrální vyhodnocení)** [b C4] | **Low** | S | Ne | QoL; snadné, až bude event bus (K9) |
| **K19** | **Nepřenášet socket.io chat / market admin API; zvážit export/import savu jako string** [a C4] | **Low** | 0 | Ne | Mimo jádro; Scope OUT zadání |

**Koherentní jádro pro iter-001 (engine + čas + sezóny):** K0, K1, K2, K3, K4, K5, K6, K9, K10 + návrhové skici K7, K8, K11. Tyto dohromady dají „offline progres zadarmo" (catch-up = tatáž dávková smyčka nad čistým serializovatelným stavem). K13–K19 jsou navazující iterace.

---

## 7. Rizika a otevřené otázky pro schválení (T-005)

- **R1 – Klientský trh (K7) je jediná část, kterou nelze „věrně opsat"** – serverová dynamika `available` není ve zdroji. Vyžaduje vlastní návrh + balanční kalibraci. Eskalovat jako vědomé rozhodnutí, ne implicitně.
- **R2 – Offline catch-up cap a chování bitev/eventů během catch-upu** je balanční + UX rozhodnutí (K3/K8). Doporučuji rozhodnout před implementací enginu.
- **R3 – Plné katalogy nejsou v repu** (T-001 §15) – dotěžení ze source map je předpoklad K2/K4 a samostatný úkol; bez něj se balanc-as-code nenaplní daty.
- **R4 – Pozdní systémy (AI svět, bitvy)** mají dle zadání riziko nedotažení; konsolidace je správně řadí jako „navrhnout teď, stavět později" (K7/K8) – sledovat, aby návrh nezůstal jen na papíře.

---

## 8. Doporučení dalšího kroku

**APPROVE → GO s úpravami.** Trojice analýz je schválitelná jako vstup pro architektonický návrh. Před/při navazujícím návrhu zohlednit redakční úpravy F1–F4 (§5) a doplnit G1 (seedovatelný RNG) a G2 (bitvy v catch-upu) – **vše bez nutnosti T-004 architect rework**, protože nejde o věcné chyby analýz, ale o přesnost a dvě drobné mezery, které se přirozeně doplní v návrhové fázi.

Pokud orchestrátor/uživatel preferuje čistý vstup, lze F2 (citace signatury `Game.save`) a sloučení K7-bitvy nechat opravit jako rychlý micro-rework T-004 (úsilí < S) – není to však blokující.

---

## Předpoklady a nejistoty (reviewera)
- Ověřoval jsem 9 high-impact tvrzení proti zdroji v0.9.5; ostatní tvrzení (zejména balanční čísla a struktura fetchovaných katalogů) jsem nebral řádek po řádku – opírám se o to, že ověřený vzorek byl 9/9 věcně přesný, což indikuje vysokou spolehlivost zbytku.
- Plné JSON katalogy nejsou v repu (shoda s autory analýz) – tvrzení o obsahu katalogů nelze nezávisle doložit nad rámec `listfood.js` a linkovacích funkcí.
- Konsolidovaný seznam je prioritizace pro plánování, ne implementační plán; pořadí může architekt v návrhu doladit dle závislostí.
