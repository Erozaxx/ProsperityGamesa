# Review návrhu architektury rebuildu Prosperity (iter-002, T-002)

- **Task**: T-002, iter-002 (BRIEF-006)
- **Autor**: reviewer
- **Datum**: 2026-06-12
- **Model**: Opus
- **Předmět review**: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
- **Vstupy review**: rozcestník `project/architecture/iter-02-input-rozcestnik.md`; iter-01 review T-003 (K0–K19, R1–R4); analýza T-002a (výkon/offline/server); zadání `zadani_projektu.md`; doména `doc/original_source_doc.md` (kontrola čísel)
- **Účel**: Quality gate před schválením uživatelem (T-004). Posouzení správnosti, úplnosti, proveditelnosti, konzistence s iter-01 a s cíli PWA/offline. Verdikt GO / GO s úpravami / NO-GO.

---

## 0. Souhrnný verdikt

**GO s úpravami.**

Návrh je věcný, technicky správný a je přímou, poctivou realizací konsolidovaného seznamu K0–K19 a otevřených otázek R1–R4 z review T-003. Mapování K0–K19 (§10) je úplné (všech 20 položek pokryto, s odkazem na sekci i milník) a **reálné**, ne jen pojmenované – u každé položky existuje konkrétní mechanismus, ne deklarace. R1–R4 jsou skutečně rozhodnuté (D9–D12) s uvedením trade-offů a pojistek, ne odsunuté. Tři body, které architekt sám označil ke kritické kontrole (D1 no-build, D10/R2 cap 8 h, R1 drift trhu), jsem prošel cíleně – **všechny tři jsou obhajitelné a proveditelné**, s drobnými výhradami níže.

**Žádný BLOCKER, žádná položka nevyžadující T-003 architect rework.** Návrh lze předložit uživateli ke schválení. Nálezy (§5) jsou typu SUGGESTION/NITPICK – doporučené redakční a upřesňující úpravy, které **nemění architekturu** a dají se zapracovat buď lehkou redakcí návrhu, nebo přenést jako poznámky do prvního implementačního milníku (M0/M1) a kalibrace (M9). Pokud orchestrátor/uživatel preferuje čistý vstup, lze S-01 a S-02 (§5) zapracovat micro-úpravou; není to blokující.

Klíčové zjištění: největší reálné riziko návrhu **není** v žádném z tří kriticky kontrolovaných bodů, ale v **disciplíně bez build kroku** (R-I) a v **balanční věrnosti cap/trh** (R-C/R2) – obojí návrh sám korektně identifikuje a deleguje na CI gate, resp. na kalibrační milník M9. To je legitimní strategie.

Ověření proti zdroji (doména): cenový vzorec trhu v §9.1 `price = round(basePrice × (1.5 − min(available,max)/max)³, 3)` sedí s popisem domény; časové konstanty (krok 0,05 s, 900 kroků/den, den 45 s, sezóna 91 dní = 81 900 kroků) sedí se zadáním a T-001; aritmetika capu 8 h = 28 800 s ÷ 0,05 = **576 000 kroků ≈ 640 herních dní** je správně.

**Doporučení dalšího kroku: APPROVE → předat uživateli ke schválení (T-004).** Úpravy zohlednit jako redakci/poznámky; nejsou blokující.

---

## 1. Posouzení D1 (ES2022 + JSDoc, no-build) – kritická kontrola

**Závěr: rozhodnutí je správné a obhajitelné pro daný rozsah a omezení. SUGGESTION na vyjasnění tooling-závislosti (S-01).**

**Co sedí:**
- **No-build přímo plní tvrdé omezení zadání** „vše v gitu, bez build kroku, prostředí nemá persistentní storage" (zadání §Omezení; rozcestník §4). Argument „repo = deploy, žádný drift zdroj↔artefakt" (§2.2) je věcně správný a je nejsilnějším důvodem pro volbu. Alt A (TS+Vite+React) je zamítnut korektně: build pipeline by buď vyžadovala `node_modules` při každém sezení, nebo commit `dist/` (dvojí pravda, obří diffy). Dobře odůvodněný trade-off, ne ideologie.
- **Typová bezpečnost bez TS je řešena, ne ignorována**: `tsc --noEmit --checkJs` jako povinný CI gate (D1, §2.1) drží typovou síť i bez TS syntaxe – standardní funkční vzorec; pokryje drtivou většinu chyb, které by chytil TS. Návrh poctivě přiznává slabiny (generika, ukecanost JSDoc – §2.2 „Proti") a navrhuje mitigaci (typy do `types.d.ts`). Vyvážené.
- **Headless core bez závislostí** (§2.2) je správně vyzdvižen jako benefit testovatelnosti v `node:test` (navazuje na T-002b D2: vzorce jako čisté testovatelné funkce) a je předpokladem benchmarku/catch-upu v Node.
- **Alt B/C** (herní engine; vanilla bez preactu) jsou zamítnuty/ponechány jako fallback s rozumnými důvody (formulářové/karetní UI = DOM > canvas; render technologie je vyměnitelná za snapshot/command hranicí). Splňuje požadavek „min. 1 alternativa".

**Výhrada (SUGGESTION S-01):** Návrh tvrdí „bez build kroku", ale fakticky zavádí **tři nástrojové závislosti na Node**: (1) `tsc --checkJs` jako *povinný* CI gate, (2) `tools/extract` (M1), (3) generátor SW precache manifestu. Není to rozpor – běh *hry* zůstává zero-build (deploy = statické soubory) – ale *vývojový/CI* tok Node vyžaduje, a `tsc` potřebuje dev `node_modules`. Tatáž třída problému, kterou návrh vytýká Alt A (závislost na `node_modules` v prostředí bez storage), se v menší míře vrací u `tsc`. Doporučuji v návrhu **explicitně odlišit „runtime: zero-build" od „dev/CI: vyžaduje Node toolchain"** a říct, jak se `tsc` provozuje v prostředí bez persistentního storage (commitnuté výstupy toolingu to řeší jen zčásti). **Nevyžaduje rework**, jen větu upřesnění; riziko R-I (§12) disciplínu už eviduje.

**Udržitelnost pro rozsah hry:** Rozsah je velký (M0–M9, ~14 systémů). JSDoc je únosný *za podmínky* disciplíny `types.d.ts` + povinný `checkJs` od M0. Riziko reálné, ale v registru rizik s mechanickou mitigací (CI gate, grep na zakázané importy). Akceptovatelné pro MVP. Doporučuji jen, aby `tsc --checkJs` byl explicitní DoD M0.

Verdikt D1: **správné, proveditelné. Drobná redakce (S-01). Bez rework.**

---

## 2. Posouzení D10 / R2 (cap offline catch-upu 8 h) – kritická kontrola

**Závěr: technicky proveditelné a architektonicky čisté; cap je správně oddělen jako balanční konstanta. SUGGESTION na pořadí ověření a default hodnotu (S-02).**

**Co sedí:**
- **Aritmetika a proveditelnost**: 8 h = 28 800 s ÷ 0,05 s/krok = 576 000 kroků; při cílových ~0,01 ms/krok ≈ **jednotky sekund** výpočtu. Sedí s T-002a B5 a §4.6. Chunking ~25 k kroků s yieldem na UI (progress) je rozumný proti blokování main threadu.
- **Architektura nezávislá na hodnotě capu**: cap je `balance.offline.capRealHours` (§9.2) – změna hodnoty nevyžaduje zásah do enginu. To je správné oddělení; M9 ji kalibruje. Tím je samotná „8 h" debata mimo architektonické riziko.
- **Pozastavení na interaktivním eventu** (§4.1, §9.2): catch-up se na engine-stopping eventu přeruší, zbytek akumulátoru zůstane a pokračuje po odkliknutí. Návrh správně argumentuje, proč zahazovat zbytek je horší (story event krátce po odchodu by jinak sežral celý offline progres). Mechanika `stopPending` v `engine.step` (§4.1) je konzistentní a serializovatelná.
- **Bitvy auto-resolve** v catch-upu týmž deterministickým automatem bez hráčových commandů (§8.1, G2) – přesně realizuje konsolidaci K8 a požadavek G2 z T-003. Žádná druhá implementace bitvy. Velmi dobré.
- **Determinismus catch-upu** je podložen D4 (seedovatelný RNG, pojmenované streamy) – „stejný save + stejný zameškaný čas → stejný výsledek" (G1). Návrh tu vazbu explicitně drží (§4.4).

**Výhrada (SUGGESTION S-02):** Návrh sám (§9.2, pozn. pod §12) přiznává, že 8 h ≈ 640 herních dní je **balančně velmi silné** a cap „pravděpodobně půjde dolů". Tím ale default 8 h ztrácí oporu – je to spíš technický strop (co engine zvládne) než herní záměr (kolik progresu je zdravé). Doporučuji:
  - (a) explicitně označit `capRealHours: 8` jako **technický horní strop**, a zavést *oddělenou* herně-balanční hodnotu, kterou ladí M9 (může být výrazně nižší), aby se nemíchal „co engine unese" s „co je pro hru zdravé";
  - (b) **benchmark ceny kroku (M0) udělat dříve, než se cap potvrdí** – návrh to v §14.1 doporučuje, ať je to i v DoD M0 a v §9.2 (revize capu *po* benchmarku, ne paušální 8 h předem).
  Nemění architekturu (konstanta v datech), proto **bez rework**.

**Drobnost (NITPICK N-01):** Pozn. pod §12 a §9.2 se k „cap pravděpodobně dolů" vrací dvakrát mírně odlišně; sjednotit formulaci, ať je jasné, že 8 h je strop a ne doporučená hodnota.

Verdikt D10/R2: **proveditelné, čistě oddělené. S-02 + N-01 redakce. Bez rework.**

---

## 3. Posouzení R1 / §9.1 (klientská tržní simulace) – kritická kontrola

**Závěr: nejvyšší inherentní nejistota návrhu (přiznaná), ale architektonicky korektně izolovaná na jednu konstantu. Návrh je věrný tam, kde věrný být může, a poctivý tam, kde nemůže. SUGGESTION na rozšíření kalibračního kritéria (S-03).**

**Co sedí:**
- **Cenový vzorec beze změny** (§9.1): `price = round(basePrice × (1.5 − min(available,max)/max)³, 3)`, spread haggleBuy 1.35 / haggleSell 0.6. Ověřeno proti doméně – sedí. Tím zůstává věrná ta část trhu, která ve zdroji je (klientský vzorec). To je správné: nezavádí se nový cenový model.
- **Jediný neznámý prvek je serverová dynamika `available`** (T-002a C2 potvrzuje, že není ve zdroji). Náhrada je minimalistická: hráčovy transakce hýbou `available` (okamžitá zpětná vazba) + denní mean-reversion drift `available += k × (baseline − available)`, `k` v balance datech (default 0,2/den). **Celá nová neznámá je tím zúžena na jednu konstantu `k`** – to je z hlediska kalibrace i rizika ideální (R-C: „jediný nový prvek je drift `k`"). Architektonicky čisté.
- **Stabilita simulace**: mean-reversion k baseline je matematicky stabilní (konvergentní k baseline při absenci transakcí, žádná divergence/oscilace pro 0 < k ≤ 1). Pro k = 0,2/den se `available` po šoku vrací k baseline geometricky – žádné runaway ceny. Drift na denním ticku = vědomá reference chování originálu (bug V3, denní perioda) – konzistentní s K4.
- **Kontrakt `market.inject` + `getGoldValue`** jako jediné oceňovací API (§9.1) řeší kaskádu z T-002a C2 (AI ratingy, kontrakty, opravy, tributy závisely na tržní ceně). Vazba world→market je explicitní kontrakt od M4, drift ji krmí do M7. Dobře navržené pořadí závislostí.

**Výhrady:**
- **(SUGGESTION S-03) Věrnost vs. „feel" — kalibrační kritérium je vágní.** Návrh správně přiznává (§13 bod 3), že „věrnost se měří proti feel, ne proti referenci", protože serverová pravda chybí. Ale §9.1 mluví o „referenčních křivkách (cena vs. objem obchodů)" v M9, aniž by řekl, *odkud* tyto reference vzniknou, když serverová data nejsou. Doporučuji v M9 DoD upřesnit, že referencí bude **hratelnostní cíl** (např. „cena se po velkém výprodeji vrátí k baseline za N dní", „arbitráž nákup/prodej není zisková kvůli spreadu") definovaný balancérem, ne mýtická serverová křivka. Jinak hrozí, že „kalibrace proti referenčním křivkám" je nesplnitelná podmínka. **Nemění architekturu** (jen definice DoD M9).
- **(NITPICK N-02) Hraniční chování `available`.** Vzorec ceny dělí `available/max`; prodej zvyšuje `available` – návrh by měl (alespoň poznámkou) potvrdit clamp `available ∈ [0, max]`, aby velký výprodej nepřekročil `max` (cena by jinak mohla jít pod baseline spektrum) a velký nákup nešel pod 0 (riziko `(1.5 − 0)³` = horní mez, OK, ale 0 hranice ať je explicitní). Drobné, patří do formulas/resource validace.

Verdikt R1/§9.1: **správné, stabilní, dobře izolované. S-03 + N-02. Bez rework** (kalibrace je explicitně M9, eskalace jen při zásadní odchylce feel — to je legitimní).

---

## 4. Úplnost vůči zadání T-001 a konzistence s iter-01

### 4.1 Úplnost vůči bodům zadání T-001 (rozcestník §5)

Návrh pokrývá **všech 9 doporučených bodů** obsahu návrhu projektu:

| Bod zadání (rozcestník §5) | Pokrytí v návrhu | Hodnocení |
|---|---|---|
| 1. Volba stacku + zdůvodnění + ≥1 alternativa | §2 (D1), Alt A/B/C | Úplné |
| 2. Struktura + vrstvení (headless core ↔ UI snapshot/command) | §3 (D2), ASCII §3.5 | Úplné |
| 3. Engine & čas (fixed-timestep, jeden mechanismus, RNG) | §4 (D3, D4, D13) | Úplné |
| 4. Datový model & katalogy (immutable + modifikátory, balanc-as-data) | §5 (D5, K4/K13–K15) | Úplné |
| 5. Save model (IndexedDB, generace, lastSimTimestamp, deklarativní schéma) | §6 (D6) | Úplné |
| 6. Resource vrstva (K5), string-ID registr (K10), rozpad Home.step (K6) | §7, §5.6, §4.3 | Úplné |
| 7. Rozpad do iterací/milníků (MVP vs. navazující) | §11 (M0–M9, MVP M0–M4) | Úplné |
| 8. Rozhodnutí R1–R4 | §9 (D9–D12) | Úplné, reálně rozhodnuté |
| 9. Rizika + mitigace + předpoklady | §12 (R-A…R-J), §13 | Úplné |

**Nic podstatného nechybí.** Pokrytí je nadprůměrné – návrh jde i nad rámec (transakční observery pro účetnictví/achievementy §7.2, AI svět kontrakty §8.2).

### 4.2 Konzistence s iter-01 (K0–K19, R1–R4, žádné rozpory)

- **Mapování K0–K19 (§10) je úplné a reálné.** Prošel jsem všech 20 položek proti review T-003 §6. Každá má v návrhu konkrétní mechanismus (ne jen jméno) i milník. Namátkou ověřeno: K0 → jediný serializovatelný strom §3.2 + command API §3.3 (sedí); K5 → resource registry handlers §7.1 (sedí, řeší V5–V7 defekty 4 dispatcherů); K10 → fail-fast registr §5.6 s validací ID při insertu (sedí); K16 → pojmenované RNG streamy §4.4 (sedí, naplňuje G1); K17 → `countEvent` → udržovaný index §4.2 (sedí). **Žádná položka K0–K19 není jen pojmenovaná bez realizace.**
- **R1–R4 jsou skutečně rozhodnuté**, ne odložené: R1→D9 (konkrétní vzorec + drift), R2→D10 (konkrétní cap + chování eventů/bitev), R3→D11 (extrakční pipeline M1 + gap report + dílčí eskalace), R4→D12 (kontrakty §8 + stub-registrace od M2 + kontraktní testy + milestone DoD). R4 má navíc explicitní pojistky proti „zůstane na papíře" (§9.4) – přesně to, co T-003 §7 R4 žádal hlídat.
- **Vědomé odchylky originálu** (Skills 2× → efektivní maxStep/2; market denní perioda bug V3; home.js:970 precedence) jsou zapečené do dat s poznámkou (§4.3, §5.5) – konzistentní s K4 a doporučením T-003 §4 („zapéct hned při portu, ne omylem zopakovat").
- **G1/G2 z review T-003** (seedovatelný RNG; bitvy v catch-upu) jsou zapracované jako D4 a D8/D10 – návrh to v §1 explicitně přiznává.
- **Žádný rozpor s iter-01 jsem nenašel.** Návrh nepřekrucuje žádný nález; tam, kde T-003 nechal otevřené (cap hodnota, drift kalibrace), návrh to drží otevřené a deleguje na M9, místo aby předstíral rozhodnutí.

---

## 5. Posouzení milníků M0–M9 / MVP M0–M4

**Závěr: dělení je realistické a pořadí závislostí správné. Jedna SUGGESTION na vyjasnění M2 zátěže (S-04) a jedna na catch-up položku (S-05).**

**Co sedí:**
- **Risk-first řazení** (§11 závěr): nejdražší nejistoty (cena kroku, extrakce dat, catch-up) jsou v M0–M2; pozdní systémy mají kontrakty + stuby od M0/M2, takže M7 je „naplnění slotů", ne přestavba. To je správná strategie proti R4 (riziko nedotažení pozdních systémů ze zadání).
- **MVP = M0–M4** odpovídá acceptance criteria zadání (instalace, offline, idle smyčka výdělek→nákup→pasivní příjem→offline progres, spolehlivý save vč. offline výpočtu). M4 = „MVP jádro hotové" je dobře umístěné: po M4 je idle smyčka + ekonomika + trh + offline progres kompletní. Sedí.
- **M0 začíná benchmarkem** (§14.1) – rozhoduje D13 (Worker?) a cap; správné dát to první.
- **M1 (extrakce) blokuje M2+** je správně identifikováno (§9.3) – obsahové milníky potřebují katalogy.
- **Persist schémata „současně se systémem"** (§14.3, reviewer gate) – dobrá disciplína, brání driftu save modelu.

**Výhrady:**
- **(SUGGESTION S-04) M2 je nejhustší milník** – nese resource vrstvu (K5), persist schémata + migrace v1 (K11), 5 systémů (population/food/housing/health/crime), **a** end-to-end offline catch-up vč. capu a summary UI, **a** autosave triggery komplet. To je hodně „prvních" věcí najednou (první catch-up, první save round-trip, první migrace, první resource transakce). Riziko, že M2 nabobtná. Doporučuji zvážit rozdělení nebo aspoň explicitně označit, že catch-up MVP v M2 smí být minimální (jeden systém) a plní se s dalšími. Nemění architekturu.
- **(SUGGESTION S-05) Catch-up vs. systémy.** End-to-end catch-up v M2 závisí na tom, že všechny systémy běžící v dávce jsou deterministické a levné. Systémy z M3 (produkce/joby) a M4 (ekonomika/trh) ale v M2 ještě nejsou – catch-up v M2 tedy nutně doháněl jen populaci/jídlo. To je OK, ale návrh by měl říct, že **catch-up se rozšiřuje s každým milníkem** (každý nový systém musí být catch-up-safe), ne že je „hotový" v M2. Souvisí se S-04.
- **(NITPICK N-03) M9 nese kalibraci R1 i R2 i UX polish i PWA audit i licence/PROVENANCE** – podobně jako M2 je to nabitý milník, ale na konci a méně rizikový. Jen poznámka, že PWA audit (install/offline/evikce) je spíš průběžný (od M0) než až M9.

Verdikt milníky: **realistické, správné pořadí. S-04/S-05/N-03 zpřesnění. Bez rework.**

---

## 6. Souhrn nálezů

Notace: **BLOCKER** (brání schválení) / **SUGGESTION** (doporučená úprava, neblokuje) / **NITPICK** (redakce). Sloupec „T-003 rework?" = zda nález vyžaduje vrácení návrhu architektovi k přepracování.

| # | Typ | Nález | Kde | T-003 rework? | Doporučení |
|---|---|---|---|---|---|
| S-01 | SUGGESTION | „Bez build kroku" zastírá 3 Node tooling závislosti (tsc/extract/SW manifest); odlišit runtime zero-build vs. dev/CI Node | §2.1, §2.2 | Ne | Věta upřesnění; DoD M0: `tsc --checkJs` gate |
| S-02 | SUGGESTION | Cap 8 h je technický strop, ne herní záměr; oddělit technický strop od balanční hodnoty; benchmark M0 *před* potvrzením capu | §9.2, §14.1 | Ne | Redakce + DoD M0; M9 ladí balanční hodnotu |
| S-03 | SUGGESTION | Kalibrační „referenční křivky" trhu nemají zdroj (server chybí); definovat reference jako hratelnostní cíle | §9.1, §13.3 | Ne | Upřesnit DoD M9 |
| S-04 | SUGGESTION | M2 přetížený (resource+migrace+5 systémů+catch-up+autosave) – riziko nabobtnání | §11 | Ne | Zvážit split / minimální catch-up MVP |
| S-05 | SUGGESTION | Catch-up není „hotový" v M2; rozšiřuje se s každým systémem (catch-up-safe invariant) | §11, §4.1 | Ne | Doplnit invariant do milestone DoD |
| S-06 | SUGGESTION | `getGoldValue`/`market.inject` kontrakt existuje od M4, ale AI svět (M7) na něm závisí – ověřit, že stub world v M2–M6 nevolá oceňování dřív, než trh existuje (M4) | §8.2, §9.1 | Ne | Kontraktní test: stub world před M4 neoceňuje |
| N-01 | NITPICK | Dvojí mírně odlišná formulace „cap pravděpodobně dolů" | §9.2 + §12 pozn. | Ne | Sjednotit |
| N-02 | NITPICK | Explicitně potvrdit clamp `available ∈ [0, max]` | §9.1 | Ne | Poznámka ve formulas/validaci |
| N-03 | NITPICK | PWA audit je průběžný (od M0), ne až M9 | §11 (M9) | Ne | Posunout/rozprostřít |
| N-04 | NITPICK | ASCII diagram §3.5 a tickOrder §4.3 jsou výborné jako dokumentace – udržet je živé (riziko zastarání) | §3.5, §4.3 | Ne | Poznámka: tickOrder = živý artefakt (návrh to už říká §4.3) |

**Žádný nález nevyžaduje T-003 architect rework.** Všechny jsou redakce nebo rozhodnutí přenositelná do implementačních milníků.

---

## 7. Rizika identifikovaná návrhem – posouzení reviewera

Registr rizik §12 (R-A…R-J) považuji za **úplný a dobře mitigovaný**. Doplnění z pohledu reviewera:
- **R-I (disciplína bez build kroku) je největší reálné riziko**, ne D1 sám o sobě. Mitigace (CI `tsc --checkJs`, grep zakázaných importů, reviewer checklist) je mechanická a vynutitelná – správně. Doporučuji povýšit viditelnost: bez funkčního CI gate od M0 se no-build výhoda mění v údržbovou past. Souvisí se S-01.
- **R-B (cena kroku) a R-C (drift trhu)** jsou správně Med/Med s benchmarkovou/kalibrační mitigací. Eskalační cesty (Worker D13, snížení capu) jsou reálné.
- **R-E (pozdní systémy na papíře)** – pojistky D12 (stub + kontraktní testy + milestone DoD) jsou adekvátní; přidávám S-06 jako konkrétní kontraktní test vazby world→market.
- Žádné chybějící riziko jsem nenašel kromě upozornění, že **catch-up determinismus je závislý na disciplíně „žádný `Date.now()`/`Math.random()` v core"** (§3.1) – to je v R-I/R-B implicitně, ale stojí za samostatný CI grep (návrh ho v §3.1 a R-I zmiňuje – OK).

---

## 8. Předpoklady a nejistoty (reviewera)

- Ověřoval jsem soulad návrhu s iter-01 artefakty (T-003 §6–7, T-002a) a vybraná čísla proti `original_source_doc.md` (cenový vzorec, časové konstanty, cap aritmetika). Plné JSON katalogy nejsou v repu (shoda se všemi předchozími agenty) – tvrzení o úplnosti extrakce (R3/M1) nelze nezávisle doložit; návrh to korektně drží jako předpoklad ověřitelný až M1 gap reportem.
- Neposuzoval jsem implementační detail (to je T-003/coder), ale architekturu, rozhodnutí a jejich proveditelnost – dle zadání briefu.
- Stabilitu tržního driftu jsem posoudil analyticky (mean-reversion je konvergentní); empirická věrnost „feel" je nezjistitelná bez serverové reference – návrh to přiznává a deleguje na M9.

---

## 9. Verdikt a doporučení dalšího kroku

**VERDIKT: GO s úpravami.**

- **Správnost**: vysoká. Žádný architektonický defekt; tři kriticky kontrolované body (D1, D10/R2, R1) obstály.
- **Úplnost**: vysoká. Všech 9 bodů zadání T-001 pokryto; K0–K19 úplně a reálně namapováno; R1–R4 skutečně rozhodnuto.
- **Proveditelnost**: vysoká v daných omezeních (PWA/offline/git/no-build). Hlavní rizika (cena kroku, trh, disciplína no-build) jsou identifikována a delegována na benchmark/kalibraci/CI – legitimní.
- **Konzistence s iter-01**: úplná, bez rozporů.

**Doporučení: APPROVE → předat uživateli ke schválení (T-004).** Žádný nález nevrací návrh do T-003 architect reworku. Úpravy S-01…S-06 a N-01…N-04 zapracovat jako lehkou redakci návrhu nebo jako poznámky/DoD do M0/M1/M9 – nejsou blokující. Pokud uživatel/orchestrátor chce čistý vstup do implementace, prioritně zapracovat **S-01** (vyjasnit no-build vs. dev toolchain) a **S-02** (cap jako technický strop + benchmark před potvrzením), protože ovlivňují očekávání hned v M0.

---

*Konec review. Zdrojem pravdy pro citované K/R/D/A/V/G položky jsou review T-003 §6–7, analýza T-002a a předmět review (architecture_proposal_iter-002_T-001).*
