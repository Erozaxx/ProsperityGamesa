# Design – M9a Balanční kalibrace (iter-020, T-001)

- **Design ID**: DESIGN-020-001
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-001 (architect, Opus)
- **Brief**: `context/inbox/brief_architect_T-001_iter-020.md` (BRIEF-020-001)
- **Autor**: architect
- **Datum**: 2026-06-15
- **Status**: final

> **Klíčový princip (R-C / S-03):** originál NEMÁ ve zdroji serverovou tržní dynamiku
> (`available` se měnilo serverem, není v dumpu – T-002a C2, §9.1/D9). DoD M9a se proto
> **NEformuluje proti rekonstrukci serverových křivek** (nesplnitelná podmínka), ale proti
> **EXPLICITNÍM, měřitelným hratelnostním cílům**, které definuje tento design. „Věrnost" = feel,
> ne číselná shoda s neexistujícím referenčním logem.

> **Tvrdé invarianty (platí pro VŠECHNY tasky):**
> 1. **Determinismus**: harness používá `createInitialState({seed})` + `initRng(state)` + `step(state, ctx)`;
>    žádný `Date.now`/`Math.random`/DOM v core; výsledek reprodukovatelný přes `hashState`.
> 2. **Kalibrace = změna DAT, ne logiky**: měníme jen hodnoty v `balance.js` (driftK, capTechRealHours)
>    a případně `baselineFraction`/`max` v `src/data/goods.json`. **Cenový vzorec
>    (`formulas.marketPrice`) a drift vzorec (`market.marketDailyDrift`) se NEMĚNÍ.**
> 3. **Cíle = automatizované testy**: každý cíl T1 je vyjádřitelný jako `node:test` assert; tester je
>    převezme 1:1.
> 4. **Dlouhé běhy segmentované**: žádný jednotlivý test nesmí překročit časový limit prostředí –
>    povinná dekompozice v T4.

---

## 0. Východiska z kódu (ověřeno v repu)

| Fakt | Místo | Hodnota |
|---|---|---|
| Cenový vzorec (kubika) | `src/core/balance/formulas.js:18` `marketPrice` | `round(basePrice·(1.5−ratio)³·1000)/1000`, `ratio=clamp(available,0,max)/max` |
| Spread buy | `balance.js:76` `market.haggleBuy` | 1.35 |
| Spread sell | `balance.js:78` `market.haggleSell` | 0.6 |
| Drift mean-reversion | `market.js:123` `marketDailyDrift` | `available += k·(baseline−available)`, clamp `[0,max]`, denní edge |
| driftK (G-MARKET-DRIFT) | `balance.js:80` `market.driftK` | **0.2** (approximated, kalibrace M9) |
| baseline init | `market.js:31` `marketInit` | `baseline = round(max·baselineFraction)`, `available=baseline` |
| Goods katalog | `src/data/goods.json` | tools/cloth/gems/spice/silk; všechny `baselineFraction:0.5` (provenance approximated) |
| Offline tech cap | `balance.js:208` `offline.capTechRealHours` | **8** |
| Cap aplikace | `src/core/engine/catchup.js:22` `catchupStepCount` | `floor(clamp(missedMs,0,capRealMs)/STEP_MS)` |
| Sim harness vzor | `test/catchup-sim-qa.test.mjs:56-63` | `runSteps(state,ctx,n)`; `GAME_YEAR_STEPS = 365·STEPS_PER_DAY` |
| Arbitráž test (existuje) | `test/m4b-market-caravan.test.js` TC-01 | nákup→prodej není ziskový (kontrola spreadu) |

**Důsledek pro spread (analyticky, nezávisle na datech):** okamžitý round-trip 1 jednotky = zaplatím
`P·1.35`, dostanu `P·0.6` → návratnost `0.6/1.35 ≈ 0.444` (ztráta ~55,6 % na jednotku, před dopadem na
`available`). Arbitráž je tedy **strukturálně neztrátová už ze spreadu** – kalibrace ji nesmí porušit
(je to invariant, ne laditelný parametr; viz CÍL-2).

---

## 1. T1 — Hratelnostní cíle trhu jako MĚŘITELNÉ testy (S-03, §9.1)

Tři cíle z §9.1 finalizované na měřitelné podmínky. Každý: definice → přesná podmínka → jak se testuje
(seedovaný headless běh) → laditelné parametry.

### CÍL-1 — Návrat k baseline po velkém výprodeji (mean-reversion recovery)

- **Záměr (feel):** velký výprodej dočasně srazí cenu; „okolní svět" (drift) ji obnoví do několika dní,
  ale **ne okamžitě** (jinak je drift neviditelný a CÍL-3 padá).
- **Měřitelná podmínka (urči N):** po jednorázovém naplnění `available = max` (maximální výprodej →
  cena na dolní mezi vzorce) se `available` vrátí na **≤ 5 % odchylku od `baseline`** během
  **N = 14 herních dní** (čistě z driftu, bez dalších hráčových akcí ani world-inject).
  - Při `driftK=0.2`: zbytková odchylka po n dnech = `(1−k)^n`. `0.8^14 ≈ 0.044 < 0.05` → splněno přesně
    pro N=14. `0.8^13 ≈ 0.055 > 0.05`. → **N=14 je kalibrovaný cíl pro driftK=0.2**; tester ho ověří
    empiricky, ne dosadí vzorec (drift má clamp + round na celé available při jiných hodnotách max).
  - **Sekundární podmínka (rychlost feel):** po **3 dnech** musí být obnoveno **≥ 48 %** počáteční
    mezery (`1−0.8³ = 0.488`) – „cena se zjevně hýbe zpět", ale ne skokem.
- **Jak se testuje (headless):**
  1. `state = createInitialState({seed: 0xCA11B}); initRng(state); marketInit(state, goods)`.
  2. Pro každé goods nastav `ms[id].available = ms[id].max` (maximální výprodej; baseline je `0.5·max`,
     mezera = `0.5·max`).
  3. Volej `marketDailyDrift(state,{},ctx)` 14×; po každém kroku zaznamenej `|available−baseline|/baseline`.
  4. Assert: po 14. dni `≤ 0.05`; po 3. dni `≥ 0.48` (vůči počáteční mezeře).
- **Laditelné:** `driftK` (mění N i 3denní procento). Změna `baselineFraction`/`max` v goods nemění
  geometrický poměr (relativní mezera), takže CÍL-1 je **citlivý jen na driftK** → ideální pro
  kalibraci driftu (T2).

### CÍL-2 — Arbitráž okamžitý nákup→prodej NENÍ zisková (spread invariant)

- **Záměr (feel):** trh není bankomat; spread brání „buy low / sell high" ve stejném ticku.
- **Měřitelná podmínka:** pro libovolné goods a libovolné `available ∈ [0, max]`:
  `sellingPrice(state,id) < buyingPrice(state,id)`. Silnější forma: round-trip K jednotek
  (buy K, pak sell K) skončí s **čistou ztrátou gold** > 0 (po zaokrouhlení na 2 dp, vč. dopadu na
  `available`). Buy nejdřív zvedne cenu (snižuje available), sell pak dostává ještě méně → ztráta je
  ostře větší než samotný spread.
- **Jak se testuje (headless):**
  1. Tabulkově přes `available ∈ {0, 0.25·max, 0.5·max, 0.75·max, max}` × všech 5 goods.
  2. Assert `sellingPrice < buyingPrice` v každém bodě (čistý spread invariant).
  3. E2e: dispatch `buyGoods` K jednotek pak `sellGoods` K jednotek (K = 10) přes command registr,
     assert `gold_po < gold_pred` (round-trip ztrátový). *(Rozšiřuje existující TC-01.)*
- **Laditelné:** žádné – tohle je **invariant, ne cíl ke kalibraci**. Drží, dokud `haggleSell < haggleBuy`
  (0.6 < 1.35). Slouží jako **regresní pojistka**: jakákoli změna spread-dat v T2 ji nesmí porušit.

### CÍL-3 — Drift NEVYHLADÍ hráčův cenový dopad během jednoho dne (impact persistence)

- **Záměr (feel):** když hráč hne trhem (velký nákup/prodej), efekt musí **přežít aspoň den** –
  jinak je market manipulace zbytečná a obchod nezajímavý. Drift je „pozadí světa", ne „undo button".
- **Měřitelná podmínka:** po hráčově dopadu, který posune `available` o Δ₀ od baseline, jeden den driftu
  zachová **≥ 60 %** dopadu: `|available_po_1_dni − baseline| ≥ 0.60 · |Δ₀|`.
  - Při `driftK=0.2`: zbytek po 1 dni = `1−0.2 = 0.80 ≥ 0.60` → splněno s rezervou.
  - **Horní strážce (proti CÍL-1 napětí):** zároveň `driftK ≥ 0.10`, aby drift vůbec konvergoval do
    rozumného N (jinak CÍL-1 selže). → **přípustné okno `driftK ∈ [0.10, 0.40]`**; mimo něj jeden z cílů
    padá. (0.40: zbytek po dni = 0.60, hrana CÍL-3; 0.10: N pro 5 % = `ln0.05/ln0.9 ≈ 28 dní`, hrana
    CÍL-1 pokud bychom chtěli N≤28.)
- **Jak se testuje (headless):**
  1. `marketInit`; nastav `available = max` (max dopad výprodeje, Δ₀ = 0.5·max).
  2. Jeden `marketDailyDrift`.
  3. Assert `|available−baseline| ≥ 0.60·Δ₀`.
- **Laditelné:** `driftK` (přímo). CÍL-3 je **horní strážce driftK**, CÍL-1 **dolní strážce** – společně
  definují okno.

### Souhrn T1 – tabulka cílů

| ID | Podmínka | Param N / práh | Laditelné | Role |
|---|---|---|---|---|
| CÍL-1 | recovery k baseline | ≤5 % za **N=14 dní**; ≥48 % za 3 dny | driftK | dolní strážce driftK |
| CÍL-2 | arbitráž neztrátová | `sell<buy` vždy; round-trip ztráta | – (invariant) | regresní pojistka spreadu |
| CÍL-3 | impact persistence | ≥60 % dopadu zachováno za 1 den | driftK | horní strážce driftK |

**Výsledek kalibrace driftK (doporučení):** **ponech driftK = 0.2**. Leží uprostřed okna [0.10, 0.40],
splňuje všechny tři cíle s rezervou (N=14, 80 % impact za den). G-MARKET-DRIFT se uzavírá tím, že 0.2 je
nyní **doložené proti cílům**, ne approximated – coder změní provenance komentář na `calibrated`
(viz DR-020-01).

---

## 2. T2 — Metodika kalibrace trhu + simulační harness (G-MARKET-DRIFT closure)

### 2.1 Harness (deterministický, seedovaný)

Znovupoužij existující vzor z `test/catchup-sim-qa.test.mjs`. **Nový sdílený helper**
`test/helpers/marketHarness.mjs` (čistě testovací, mimo `src/core` – neporušuje lint:core gate):

```
makeMarketState(seed) → { state, ctx }   // createInitialState + initRng + marketInit(goods)
driftDays(state, ctx, n)                 // n× marketDailyDrift, vrací pole snapshotů available/baseline
recoveryDays(state, id, tol)             // počet dní než |dev| ≤ tol (empiricky, ne vzorcem)
```

- Determinismus: bez RNG (drift je čistě deterministický), ale state přesto inicializuj `initRng` kvůli
  konzistenci a budoucímu rozšíření.
- **Harness NESMÍ importovat nic z UI/app vrstvy** – jen `src/core/systems/market.js`,
  `src/core/balance/*`, `src/data/goods.json` přes `loadCatalog`.

### 2.2 Metodika ladění (parameter sweep, čistě data)

1. **driftK sweep:** spusť CÍL-1 + CÍL-3 pro `driftK ∈ {0.10, 0.15, 0.20, 0.25, 0.30, 0.40}`, tabuluj
   N(recovery 5 %) a impact-retention(1 den). Vyber hodnotu splňující obě – **0.2 vychází jako bezpečný
   střed** (viz T1). Tabulku zapiš do designu testu jako komentář (audit trail kalibrace).
2. **baseline kalibrace:** `baselineFraction` v goods.json je dnes uniformně 0.5. **Doporučení: ponech
   0.5** – při 0.5 je startovní cena `basePrice·(1.5−0.5)³ = basePrice·1.0` (= „nominální" cena), což je
   čistá, vysvětlitelná startovní pozice. Kalibrace baseline NENÍ potřeba pro CÍL-1/3 (jsou na ní
   invariantní v relativním poměru); měň ji jen pokud playtest ukáže, že nějaká komodita startuje příliš
   draho/levně vůči ekonomice hráče (to je M9a-volitelné, ne povinné).
3. **Co se NESMÍ ladit:** cenový vzorec, drift vzorec, spread (1.35/0.6 – chrání CÍL-2). Změna kterékoli
   z nich = překročení scope (logika, ne data) → decision record + eskalace.

### 2.3 Výstup T2

- driftK potvrzen = 0.2 (provenance `calibrated`, ref design §1/CÍL-1+3).
- Sweep tabulka jako audit (v testu nebo v komentáři balance.js).
- Harness helper pro tester (přebírá ho do test loopu).

---

## 3. T3 — Offline cap hodnota (R2b / D10b)

### 3.1 Kontext (dvě oddělené hodnoty – §9.2a, N-01)

- **(a) Technický strop `offline.capTechRealHours = 8`** = co engine unese (576 000 kroků ≈ 640 herních
  dní). Hypotéza potvrzená benchmarkem M0. **Neměň** – to je technický strop, ne balanc.
- **(b) Balanční hodnota** = kolik offline progresu je pro hru *zdravé*. Engine aplikuje `min(a,b)`.
  Architektura §9.2b očekává **výrazně nižší než technický strop** („spíš ekvivalent desítek herních dní").

> **Pozn. k repu:** dnes existuje jen `capTechRealHours`; **balanční hodnota jako oddělená konstanta
> ještě NEexistuje**. Tento task ji zavádí jako **NOVOU konstantu** `offline.capBalanceRealHours`, aby
> zůstala zachována separace (a)/(b) dle §9.2a. Engine `catchupStepCount` dostane efektivní cap =
> `min(capTechRealHours, capBalanceRealHours)` převedený na ms. To je **přidání dat + jednořádkové
> drátování capu**, ne změna logiky catch-up algoritmu (clamp už existuje).

### 3.2 Doporučená hodnota + zdůvodnění

**Doporučení: `capBalanceRealHours = 12` (= 0.5 reálného dne).**

Převod na herní čas: 12 h = 43 200 s ÷ 0,05 s/krok = 864 000 kroků? — **pozor**, technický strop 8 h =
576 000 kroků, takže 12 h reálných by technický strop překračovalo. To je **záměrné a bezpečné**: engine
bere `min(8h, 12h) = 8h`. Smysl balanční hodnoty 12 h je **deklarovat záměr „až půl dne offline se plně
dohání"**, přičemž technický strop ji zatím zastropuje na 8 h (≈ 640 herních dní). 

**To ale odporuje §9.2b** („výrazně nižší než technický strop, desítky herních dní"). Proto **dvě
varianty k rozhodnutí tom-proxy** (gate T-003, reverzibilní config):

| Var | capBalanceRealHours | Herní ekvivalent (900 kr/den) | Feel | Doporučení |
|---|---|---|---|---|
| **A (doporučená)** | **8** (= rovno tech. stropu) | ~640 herních dní | „Vrátíš se po pracovním dni a vše doženeš." Maximální idle odměna, žádný pocit ztráty. Vhodné pro casual mobilní idle hru. | **DOPORUČENO** – nejvíc idle-friendly, nulové riziko frustrace „přišel jsem o progres". |
| B (konzervativní, dle §9.2b) | 2 | ~160 herních dní | Štědré, ale ne extrémní; nad cap se objeví „byl jsi pryč dlouho" v summary. | Alternativa, pokud tom-proxy chce blíž k §9.2b záměru. |
| C (idle-žánr balanc) | 0.5 (30 min realtime → ~52 herních dní) | ~52 herních dní | Klasický idle pattern – offline příjem decentní, ale vrací hráče do hry. | Pro hru s denní retencí; mění feel směrem k „comeback loop". |

**Architekt doporučuje variantu A (8 h = ztotožnit balanční hodnotu s technickým stropem).** Důvody:
1. **Žánr.** Zadání = casual mobilní idle PWA s důrazem na „zavři a vrať se" (acceptance criteria MVP).
   V idle hrách je **velkorysý offline cap feature, ne bug** – frustrace z „přišel jsem o offline progres"
   je horší než „mám hodně zdrojů".
2. **Reverzibilita.** Konstanta v datech; snížit na 2/0.5 později je triviální a nemění architekturu.
   Začít štědře a utahovat dle playtestu je bezpečnější než naopak (utahování po vydání = negativní feel).
3. **Žádný exploit.** Catch-up je *deterministická simulace stejné logiky* – hráč nedostane nic, co by
   nedostal hraním. „Exploit" by byl jen ten, kdo nechá hru zavřenou 640 dní – ale to je legitimní idle
   chování, ne zneužití. Anti-exploit už řeší to, že nad cap se čas nepřičítá (norma žánru, §9.2a).

**Varianty B/C jsou validní, pokud tom-proxy upřednostní „comeback loop" feel** (denní retence) před
maximální velkorysostí. Toto je **balanc/UX rozhodnutí, ne architektonické** → patří tom-proxy
(reverzibilní config gate T-003). User-eskalace jen pokud tom-proxy zvolí variantu měnící feel zásadně
(C); A/B jsou bezpečné autonomně.

### 3.3 Implementační poznámka (T3)

- Přidat `offline.capBalanceRealHours: 8` do `balance.js` (komentář: balanc hodnota dle §9.2b, separace
  od capTechRealHours, ref design §3, provenance `calibrated`/rozhodnutí tom-proxy).
- V místě, kde se počítá `capRealMs` pro `catchupStepCount`, použít
  `min(capTechRealHours, capBalanceRealHours) * 3_600_000`. Najdi volajícího `catchupStepCount`
  (pravděpodobně `src/app/` bootstrap nebo catch-up orchestrace) – **POZOR**: pokud volající žije v
  app vrstvě, drátování patří tam; pokud je čistá funkce v core, nech ji parametrizovanou a `min` spočti
  ve volajícím. `catchupStepCount` samotná se NEMĚNÍ (zůstává `(missedMs, capRealMs)`).
- Test: `catchupStepCount(missedMs > capMs, capMs)` vrací přesně `floor(capMs/STEP_MS)` (cap aplikován).

---

## 4. T4 — Balanc regression metodika + POVINNÁ dekompozice (L)

### 4.1 Cíl

Dlouhé deterministické běhy (rok+ herního času) – křivky **populace / gold / jídlo** vs **definované
OČEKÁVÁNÍ** (ne serverová data). Detekuje regrese: runaway růst, kolaps na nulu, NaN, monotónní drift bez
stabilizace.

### 4.2 Definovaná OČEKÁVÁNÍ (reference = hratelnostní, ne serverová)

Místo absolutních čísel (která nemáme z čeho odvodit) definuj **kvalitativní invarianty křivek** +
**toleranční pásma** odvozená z prvního kalibračního běhu (= „golden run", uložený jako checkpoint hash):

| Metrika | Očekávání (invariant) | Měřitelně |
|---|---|---|
| Populace | neexploduje, nekolabuje; respektuje `sanityMaxPop=10000` | `0 < pop ≤ 10000` po celý rok; `pop` se nemění o >X %/den (X=50, anti-spike) |
| Gold | nesmí trvale klesat k 0 ani exponenciálně růst do ∞ | `gold ≥ 0` vždy; medián derivace přes rok konečný; žádný NaN |
| Jídlo (zásoby) | nestarve trvale; nesmí přetéct nad `maxFood` per typ | `0 ≤ food[type] ≤ maxFood`; ne >D po sobě jdoucích dní `starved>0` (D=30) |
| Determinismus | `hashState` po N krocích stabilní napříč běhy téhož seedu | `hash(run(seed,N)) == hash(run(seed,N))` |

**„Golden run" approach:** první běh při kalibrovaných datech vyprodukuje křivky → uložíme **checkpoint
hashe** ve vybraných bodech (den 90/180/270/365) jako referenci. Regrese = budoucí běh téhož seedu se
od golden hashů liší → red flag (buď žádoucí změna dat → aktualizuj golden, nebo bug → fix). Tím se
„očekávání" stává **konkrétním, verzovaným artefaktem**, ne subjektivním odhadem.

### 4.3 POVINNÁ dekompozice L (časový limit prostředí)

Rok = `365 · STEPS_PER_DAY = 365 · 900 = 328 500 kroků`. Jeden `step` je řádově ~µs, takže rok je v Node
sekundy – ALE plný balanc (všechny systémy M2–M8 aktivní, ne jen world jako v QA-CATCHUP) může být
výrazně dražší, a víceletý běh × více seedů × více metrik překročí limit jednoho testu. **Dekompozice na
seedované segmenty + checkpointy:**

**S1 — Segmentace běhu (checkpoint přes save/load):**
- Běh se NEdělá jako jeden 328k-krokový test. Místo toho **kvartální segmenty** (≈ 91 dní = 81 900 kroků):
  Q1→checkpoint→Q2→… Po každém kvartálu: zaznamenej metriky (pop/gold/food snapshot + `hashState`),
  volitelně `applyPersist`→`loadAndReconstruct` (ověří, že save/load uprostřed dlouhého běhu nemění
  trajektorii – využívá existující `loadAndReconstruct` z `src/save/load.js`).
- Každý kvartální segment = **samostatný `it()`** s vlastním časovým rozpočtem → žádný jediný test
  nepřekročí limit. Stav mezi segmenty se předává buď přímo (sdílený `state` v `describe` scope) nebo
  přes serializovaný checkpoint (robustnější proti izolaci).

**S2 — Granularita měření:** metriky vzorkuj **1×/herní den** (ne každý krok) – `isNewDay` edge už
existuje; sampler čte `state.home.curWorkers`, `state.player.gold`, `state.home.foodStore` (ověř přesné
cesty v `createInitialState`). Pole denních vzorků (365 čísel × 3 metriky) je levné.

**S3 — Více seedů paralelizovatelně:** každý seed = samostatný test soubor / `describe` blok
(`0xA1`, `0xB2`, `0xC3`) → běží nezávisle, lze rozdělit mezi smoke (Haiku) a plný loop (Sonnet).
**Smoke varianta** = 1 seed, 1 rok, jen invarianty (rychlá). **Plný loop** = 3 seedy, golden hashe.

**S4 — Víceletý běh (rok+):** pokud chceme 2–3 roky, NErozšiřuj jeden test – přidej **další kvartální
segmenty** (Y2Q1…). Limit prostředí se drží tím, že každý `it()` zpracuje ≤ 1 kvartál. Pokud i kvartál
je moc, fallback na měsíční segmenty (30 690 kroků).

### 4.4 Vědomá odchylka home.js:970 (posouzení)

**Nález (original `services/home.js:970`):**
```js
if (Math.random() < home.consecutiveDiseased * (0.02 + $rootScope.itemList.p_innoculation.running ? 0.01 : 0)) {
```
**Posouzení (architekt):** Toto je **klasický JS operátorový bug v originálu** – `?:` má nižší prioritu
než `+`, takže výraz se vyhodnotí jako:
```js
(0.02 + $rootScope.itemList.p_innoculation.running) ? 0.01 : 0
```
tj. `(0.02 + truthy)` je **vždy truthy** → ternár vrací **vždy 0.01**, bez ohledu na inoculation.
Zamýšlený záměr autora byl zjevně `0.02 + (running ? 0.01 : 0)` (inoculation zvyšuje šanci uzdravení o
0.01). **Faktická varianta** (co kód dělá): šance uzdravení = `consecutiveDiseased · 0.01` konstantně.
**Zamýšlená varianta**: `consecutiveDiseased · (0.02 + (inoculation ? 0.01 : 0))`.

**Rozhodnutí (DR-020-01, zapsat do dat/komentáře, ne skrytě):**
- **Zvol ZAMÝŠLENOU variantu** `consecutiveDiseased · (0.02 + (inoculation ? 0.01 : 0))`. Důvod:
  (1) rebuild je „věrný rebuild" k **záměru hry**, ne k reprodukci JS-precedence bugů; (2) faktická
  varianta dělá inoculation tech **bezcennou** (nemá žádný efekt na uzdravení), což je zjevně nezamýšlené
  a poškozuje balanc tech stromu; (3) baseline 0.02 vs 0.01 ovlivňuje délku epidemií (balanc regression
  CÍL „ne >30 dní starved/diseased").
- **Zapiš jako vědomou odchylku** v komentáři u disease/health logiky + v `balance.js` (pokud se
  konstanty 0.02/0.01 přesunou do dat – doporučeno: `health.diseaseRecoveryBase: 0.02`,
  `health.inoculationBonus: 0.01`, provenance `original-intended` s poznámkou o precedence bugu).
- **Pozn.:** Tato disease-recovery logika **pravděpodobně ještě není v current core** (M2a health byl
  zjednodušený – `diseaseChance`/`diseaseDurationDays`/`diseaseDeathFraction` v balance.js). Pokud
  `consecutiveDiseased`/inoculation mechanika v core NEexistuje, **odchylka se eviduje jako rozhodnutí
  pro budoucí implementaci** (zapiš do DR-020-01 + komentář v health systému), nikoli jako změna kódu
  teď. Coder ověří přítomnost mechaniky; pokud chybí, jen dokumentuje rozhodnutí.

### 4.5 Výstup T4

- `test/balance-regression.test.mjs` (+ smoke varianta) se segmentací S1–S4.
- Golden checkpoint hashe (den 90/180/270/365) jako verzovaný artefakt.
- Invarianty pop/gold/food jako asserty.
- home.js:970 rozhodnutí zapsané (DR-020-01 + komentář).

---

## 5. Split coder tasků

Rozdělení dle briefu (T1+T2 trh, T3+T4 cap+regression). Závislosti dovolují **2 souběžné coder tasky**:

| Coder task | Obsah | Kompl. | Závislost | Soubory |
|---|---|---|---|---|
| **C-020-A — Trh** | T1 cíle jako test fixtures + T2 driftK sweep/potvrzení 0.2 + harness helper | M | – | `test/helpers/marketHarness.mjs`, `test/market-goals.test.mjs`, `balance.js` (komentář driftK→calibrated) |
| **C-020-B — Cap + Regression** | T3 capBalanceRealHours + drátování `min` + T4 balanc regression segmentovaný + home.js:970 evidence | M | – (nezávislé na A) | `balance.js` (offline.capBalanceRealHours), catch-up volající (`min`), `test/balance-regression.test.mjs`, DR-020-01 |

- **A a B jsou nezávislé** (A sahá na market data, B na offline/health data + regression harness) → mohou
  běžet paralelně. Žádný L: oba M (data + testy, žádná nová logika). T4 je „L" v plánu kvůli dlouhým
  během, ale **dekompozice §4.3 ho dělá zvládnutelným Sonnetem** (kvartální segmenty = běžné `it()`).
- **Společný invariant:** ani jeden task nemění cenový/drift/catch-up **logiku** – jen data + testy +
  jednořádkové drátování capu. Reviewer ověří grep-gate „žádná změna formulas.marketPrice /
  marketDailyDrift / catchupStepCount signatur".

---

## 6. DR-020-01 — Implementační poznámky pro coder/tester

> Zda založit formální `orchestration/decisions/DR-020-01.md`: **ANO** – obsahuje 2 rozhodnutí s dopadem
> na balanc (driftK closure + home.js:970 odchylka + cap separace). Orchestrátor: `make new-decision
> ID=DR-020-01 TOPIC=m9a-kalibrace`. Obsah níže.

**Rozhodnutí zaznamenaná:**
1. **G-MARKET-DRIFT closure:** `driftK = 0.2` potvrzeno proti CÍL-1/CÍL-3 (okno [0.10, 0.40], 0.2 =
   bezpečný střed). Provenance `approximated` → `calibrated`. **Cenový ani drift vzorec se nemění.**
2. **Offline cap separace:** zavedena `offline.capBalanceRealHours` jako oddělená konstanta od
   `capTechRealHours` (§9.2a). Doporučená hodnota **8 (var. A)**; B=2 / C=0.5 jako alternativy →
   **rozhoduje tom-proxy** (reverzibilní config gate T-003). Engine aplikuje `min(tech, balance)`.
3. **home.js:970 odchylka:** zvolena **zamýšlená** varianta (`0.02 + (inoculation ? 0.01 : 0)`), ne
   faktický precedence-bug. Pokud mechanika v core chybí, eviduje se jako rozhodnutí pro budoucnost.

**Carry rizika:**
- **R-C (trh diverguje od feel):** mitigováno – DoD proti explicitním cílům, ne serverové referenci.
  Zbytkové riziko: cíle jsou *náš* návrh feel; pokud playtest ukáže jiný feel, re-kalibruj driftK v okně
  (data, ne logika).
- **R2b (cap UX):** rozhodnutí delegováno na tom-proxy; var A štědrá = nízké riziko frustrace.
- **Časový limit prostředí (T4 L):** mitigováno segmentací §4.3; pokud i kvartál překročí limit →
  měsíční segmenty (fallback popsaný).

**Tester přebírá:**
- T1 cíle (CÍL-1/2/3) jako `node:test` asserty 1:1 z §1.
- T4 segmentovaný regression (smoke = 1 seed/invarianty pro Haiku; plný = 3 seedy/golden hashe pro Sonnet).
- Regrese: žádný dřívější tabulkový test (TC-01 arbitráž, TC-05 drift 20 %/den) se nesmí rozbít –
  driftK=0.2 zůstává, takže TC-05 (existující) platí beze změny.

**Sonnet-proveditelnost:** vše = úprava dat + psaní testů dle vzoru `catchup-sim-qa.test.mjs` +
jednořádkové drátování `min` capu. Žádný nový algoritmus, žádná změna core logiky.

---

## 7. Vědomé odchylky (souhrn – zapsané, ne skryté)

| Odchylka | Místo | Varianta | Provenance |
|---|---|---|---|
| driftK kalibrace | `balance.js:80` | 0.2 potvrzeno proti cílům | `approximated`→`calibrated` |
| offline cap balanc vs tech | `balance.js:206-208` | nová `capBalanceRealHours` (var A=8) | `calibrated` / tom-proxy |
| home.js:970 disease recovery | health logika / DR-020-01 | zamýšlená (`0.02 + (inoc?0.01:0)`) ne faktická | `original-intended` |
| baseline goods | `goods.json` | `baselineFraction=0.5` ponecháno | `approximated` (citlivost nulová na CÍL-1/3) |

---

## 8. Alternativy (povinné – min. 1)

- **Alt-driftK „věrný server" (zamítnuto):** rekonstruovat serverovou tržní dynamiku regresí z chování
  hry. **Zamítnuto:** server data NEexistují (§9.1/R-C) → nesplnitelné; přesně to, čemu se brief vyhýbá.
- **Alt-cap „min(tech,balance)" s balance=2 (var B):** blíž §9.2b záměru. Zvoleno A místo B jako default,
  protože velkorysost > konzervatismus pro idle PWA; B ponecháno jako tom-proxy alternativa.
- **Alt-regression „absolutní čísla":** porovnávat pop/gold proti pevným číslům. **Zamítnuto:** nemáme
  referenční čísla → invarianty + golden-hash checkpointy jsou robustnější a verzovatelné.
- **Alt-T4 „jeden velký běh":** nesegmentovat. **Zamítnuto:** porušuje povinnou dekompozici L / časový
  limit prostředí.

---

*Konec designu. Zdroj pravdy pro §/D/R/S/K: `architecture_proposal_iter-002_T-001.md`. Plán:
`iteration_master_plan_iter-003_T-001.md` §3/iter-017 (M9a).*
