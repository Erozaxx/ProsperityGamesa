# Review – Design M9a Balanční kalibrace (iter-020, T-002)

- **Review ID**: REVIEW-020-002
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-002 (reviewer, Opus)
- **Reviewed**: `context/refs/design_iter-020_T-001.md` (DESIGN-020-001, architect)
- **Brief**: BRIEF-020-002
- **Reviewer**: reviewer
- **Datum**: 2026-06-15
- **Typ**: architektonický gate designu (metodika, NE kód) před tom-proxy

---

## Verdikt: **GO-s-podmínkami**

Design je metodicky správný, matematicky doložený a věrný klíčovému principu R-C (cíle proti
hratelnostnímu feel, ne proti neexistující serverové referenci). Žádný blocker. **3 podmínky**
(viz níže) jsou drobné upřesnění pro coder/tom-proxy, ne přepracování designu.

**Souhrn nálezů:** 0 blocker · 0 major · 4 minor · 3 nit.

---

## Explicitní posouzení 6 kritických bodů

### 1. Cíle proti referenci (R-C) — ✅ PASS bez výhrad

- Princip ověřen proti architektuře: §9.1/D9 + M9 master plán (ř.504) potvrzují „kalibrace **proti
  hratelnostním cílům**, serverová reference NEEXISTUJE, cíle definuje balancér (S-03)". Design tuto
  podmínku formuluje korektně a v §8 explicitně **zamítá** Alt-driftK „věrný server" jako nesplnitelný.
  Tohle je přesně to, co brief žádal — gate splněn.
- **Všechny 3 cíle jsou matematicky odvozené a měřitelné jako automatizované testy.** Nezávisle ověřeno:
  - **CÍL-1** recovery: `0.8^14 = 0.04398 < 0.05` ✓ a `0.8^13 = 0.05498 > 0.05` ✓ → N=14 je přesně
    kalibrovaná hrana pro driftK=0.2. 3denní práh `1−0.8³ = 0.4880 ≥ 0.48` ✓.
  - **CÍL-2** arbitráž: round-trip `0.6/1.35 = 0.4444` (ztráta 55.6 %) ✓ — strukturální invariant ze
    spreadu, ne laditelný cíl. Správně klasifikováno jako regresní pojistka.
  - **CÍL-3** impact persistence: `1−0.2 = 0.80 ≥ 0.60` ✓ s rezervou.
  - **Okno driftK [0.10, 0.40]** ověřeno: hrana 0.40 → 1-day retention = 0.60 (CÍL-3 edge) ✓; hrana
    0.10 → N pro 5 % = `ln0.05/ln0.9 = 28.4 dní` (CÍL-1 edge) ✓. **0.2 leží uprostřed okna** — volba
    doložená, ne arbitrární.
- Kód ověřen: `marketDailyDrift` (market.js:123-132) implementuje `available += k·(baseline−available)`
  s clamp `[0,max]` — geometrická konvergence `(1−k)^n` platí, design empiricky testuje (ne dosazuje
  vzorec) kvůli `Math.round`/clamp efektům → **správný, robustní přístup** (viz CÍL-1 §1).
- `marketInit` (market.js:31): `baseline = round(max·0.5)`, `available=baseline` → mezera při výprodeji
  `available=max` je přesně `0.5·max` ✓ — odpovídá Δ₀ v CÍL-1/CÍL-3.

### 2. Determinismus harness + dekompozice L — ✅ PASS (s MINOR-2, MINOR-3)

- **Determinismus:** Harness staví na `createInitialState({seed})` + `initRng` + `step`/`hashState` —
  všechny ověřeny v repu (`src/core/engine/rng.js:69` hashState, `createInitialState.js`). Vzor
  `test/catchup-sim-qa.test.mjs` reálně existuje a už dnes běží `GAME_YEAR_STEPS = 365·STEPS_PER_DAY`
  v jediném `it()` bez pádu (QA-CATCHUP-1) → harness je proveditelný. `marketDailyDrift` je čistě
  deterministický (žádný RNG) → CÍL testy jsou stabilní. Pravidlo „harness mimo src/core, neimportuje
  UI" je správné (chrání lint:core gate). ✓
- **Dekompozice L (§4.3):** Kvartální segmenty (91 dní = 81 900 kroků, ověřeno
  `BALANCE.engine.stepsPerSeason: 81900`) přes `loadAndReconstruct` (existuje `src/save/load.js:267`)
  jsou proveditelné. Napojení segmentů přes save/load NEzpůsobí drift **za podmínky**, že save round-trip
  je bit-identický — což potvrzuje předchozí review (M8 D10: „save round-trip bit-identický"). Fallback
  na měsíční segmenty popsán. Multi-seed split (smoke/Haiku vs full/Sonnet) je rozumný. ✓
- **MINOR-2 (sampler paths):** §4.3-S2 instruuje sampler číst `state.home.curWorkers`,
  `state.player.gold`, `state.home.foodStore`. **Ověřeno proti kódu:** food žije na
  `state.home.food.store` (createHomeState.js:18), NE `state.home.foodStore`; a `state.home` nemá
  top-level `curWorkers` (jen `maxWorkers`/buildings agregace). Gold je `state.player.gold` ✓. Design
  sám hedguje („ověř přesné cesty v createInitialState") → není to chyba designu, ale coder MUSÍ cesty
  opravit, jinak sampler čte `undefined` → tichý NaN ve `food≤maxFood` assertu. Doplnit do DR-020-01.
- **MINOR-3 (cena plného běhu = hypotéza):** §4.3 správně rozlišuje „world-only QA-CATCHUP je v Node
  sekundy" vs „plný balanc M2–M8 může být dražší". Ale **nemá změřený horní odhad** ceny kvartálu
  s plnými systémy → není 100% jisté, že 1 kvartál = 1 `it()` vejde pod limit. Mitigace (měsíční fallback)
  existuje, takže riziko je nízké, ale coder by měl **změřit cenu 1 kvartálu jako první krok** a podle
  toho zvolit granularitu (kvartál vs měsíc), ne to dělat naslepo.

### 3. Kalibrace = DATA ne logika — ✅ PASS bez výhrad

- Tvrdý invariant „cenový vzorec (`formulas.marketPrice`) + drift vzorec (`marketDailyDrift`) se NEMĚNÍ,
  mění se jen `driftK`/baseline data" je **architektonicky správný a vynutitelný grep-gatem** (§5: reviewer
  ověří „žádná změna formulas.marketPrice / marketDailyDrift / catchupStepCount signatur"). Doporučuji
  tento grep-gate explicitně převzít do tester/reviewer DoD M9a.
- driftK closure: `approximated → calibrated` je **pouze provenance komentář** (balance.js:79), ne změna
  hodnoty (zůstává 0.2) → čistá data změna. ✓ TC-05 (drift 20 %/den existující) platí beze změny.
- baseline `baselineFraction=0.5` ponecháno — design správně argumentuje, že CÍL-1/3 jsou na něm
  **invariantní v relativním poměru** (geometrická mezera). Ověřeno: `marketPrice` při ratio=0.5 dává
  `(1.5−0.5)³ = 1.0` → nominální cena, čistá startovní pozice. ✓

### 4. Cap separace + min kontrakt — ⚠️ PASS-s-podmínkou (MINOR-1)

- Separace (a) technický strop `capTechRealHours=8` vs (b) balanční hodnota je **architektonicky
  správná** (§9.2a/§9.2b ověřeno: ř.435-436). Engine `min(tech, balance)` je správný kontrakt — nikdy
  nepřekročí technický strop. `catchupStepCount(missedMs, capRealMs)` (catchup.js:22) zůstává beze změny
  signatury (clamp už existuje) → drátování `min` patří do volajícího. **Toto NErozbije D10 chování**,
  protože min(8,X≥8)=8 = dnešní efektivní cap. ✓
- **MINOR-1 (cap je dnes hardcoded literal, design to neflaguje) — PODMÍNKA:** Design říká „najdi
  volajícího `catchupStepCount` (pravděpodobně app bootstrap)". Ověřeno: volající = **`src/app/main.js:250`**,
  a cap je `const CATCHUP_CAP_MS = 8 * 3600 * 1000` (main.js:58) — **hardcoded literál, NEodvozený
  z `BALANCE.offline.capTechRealHours`**. Design o tom mlčí. Coder tedy musí udělat 2 věci, ne 1:
  (i) zavést `capBalanceRealHours` do balance.js, (ii) **přepojit `CATCHUP_CAP_MS` aby četl
  `min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * 3_600_000`** — jinak
  zůstane mrtvý literál a nová konstanta nebude mít žádný efekt (latentní past „kalibrace bez dopadu",
  stejná třída jako MAJ-1 firstStarve z M8). Drobné, ale MUSÍ být v DR-020-01 explicitně.
- **MINOR-4 (naming divergence vůči architektuře):** Architektura §9.2b pojmenovává balanční konstantu
  **`offline.capRealHours`** (ř.436), design zavádí **`offline.capBalanceRealHours`**. Jméno designu je
  čitelnější (symetrie s `capTechRealHours`), ale **diverguje od kanonického jména architektury bez
  zaznamenání**. Buď: (a) sjednotit na architekturní `capRealHours`, nebo (b) ponechat
  `capBalanceRealHours` a zapsat to jako vědomou odchylku v DR-020-01 (doporučuji b — jasnější jméno).
  Není blocker, ale traceability vyžaduje explicitní zápis.

### 5. Golden-hash checkpointy + invarianty — ✅ PASS (s NIT-1)

- Golden-hash approach (den 90/180/270/365) jako **verzovaný artefakt** je deterministický a
  regenerovatelný: staví na `hashState` (čistá funkce stavu, ověřeno rng.js:69) + seedovaném běhu →
  **NENÍ flaky** za předpokladu, že běh neobsahuje `Date.now`/`Math.random`/iterační nedeterminismus
  (mitigováno tvrdým invariantem #1). Mechanika „liší se od golden → buď žádoucí změna dat (aktualizuj
  golden) nebo bug (fix)" je správný regresní kontrakt. ✓
- **Invarianty křivek správné jako strážci:** `0 < pop ≤ 10000` (ověřeno `sanityMaxPop:10000`
  balance.js:134), `gold ≥ 0`, `food ≤ maxFood` (`food.maxFood:500`), žádný NaN, ne >30 dní `starved>0`
  — všechny jsou měřitelné a chytají reálné regrese (runaway/kolaps/NaN/trvalý starve). ✓
- **NIT-1:** `pop` anti-spike práh „nemění se o >50 %/den" (§4.2) je rozumný heuristický strážce, ale
  X=50 je sám approximated a může produkovat false-positive při legitimních populačních skocích
  (epidemie/natalita batch). Doporučuji: buď ho označit jako „soft warning, ne hard fail", nebo zvednout
  toleranci a doplnit komentář o provenance prahu. Nízká priorita.

### 6. Split C-020-A / C-020-B — ✅ SOUHLASÍM

- **A (trh: T1+T2)** sahá na market data + nový `marketHarness.mjs`; **B (cap+regression: T3+T4)** sahá
  na offline/health data + regression harness + main.js cap wiring. **Disjunktní soubory** → reálně
  paralelizovatelné, žádná sdílená editace `balance.js`? — **POZOR (NIT-2):** oba tasky upravují
  `balance.js` (A: driftK provenance komentář; B: nová `offline.capBalanceRealHours`). Edity jsou v
  různých blocích (market vs offline), ale **merge na stejném souboru** = drobné riziko konfliktu.
  Doporučuji orchestrátorovi: sekvencovat merge (A pak B) nebo nechat coder B rebase. Nemění to
  paralelizovatelnost práce, jen pořadí integrace.
- **Oba Sonnet:** souhlasím. Žádná nová logika, jen data + testy dle existujícího vzoru
  (`catchup-sim-qa.test.mjs`) + jednořádkové drátování `min`. T4 „L" je dekompozicí §4.3 (kvartální
  `it()`) převeden na zvládnutelný Sonnet rozsah. Smoke varianta (1 seed, invarianty) je vhodná pro
  Haiku jako levný gate. ✓

---

## Vědomá odchylka home.js:970 — ✅ korektně zdokumentovaná (s NIT-3)

- **Ověřeno proti originálu:** `doc/original_source/modules/prosperity/services/home.js:970` obsahuje
  PŘESNĚ citovaný řádek:
  ```js
  if (Math.random() < home.consecutiveDiseased * (0.02 + $rootScope.itemList.p_innoculation.running ? 0.01 : 0)) {
  ```
  Analýza precedence je **technicky správná**: `?:` < `+` → `(0.02 + running) ? 0.01 : 0` = vždy truthy
  → ternár vždy `0.01` → inoculation **bez efektu** (faktická varianta). Zamýšlená varianta
  `0.02 + (running ? 0.01 : 0)` je zjevně autorův záměr (inoculation +0.01). ✓
- **Rozhodnutí (zvol ZAMÝŠLENOU variantu, zapiš jako `original-intended`) je správné a dokumentované
  v datech, NE skrytě** (DR-020-01 + komentář + návrh konstant `health.diseaseRecoveryBase:0.02` /
  `health.inoculationBonus:0.01`). Odůvodnění (věrný rebuild = záměr hry, ne JS-bug; faktická varianta
  dělá inoculation bezcennou; ovlivňuje délku epidemií vs CÍL „ne >30 dní starved") je věcné. ✓
- **Ověřeno: mechanika v core NEEXISTUJE** — grep `consecutiveDiseased|inoculation|innoculation|
  diseaseRecovery` v `src/` = **0 výsledků**. Current health má jen `diseaseChance/diseaseDurationDays/
  diseaseDeathFraction` (balance.js:230-235, formulas.js:206). Design to **správně předvídá** (§4.4 pozn.)
  a instruuje: „pokud mechanika chybí, eviduj jako rozhodnutí pro budoucnost, NEměň kód teď". ✓
- **NIT-3:** Protože mechanika neexistuje, je `home.js:970` odchylka v M9a **čistě dokumentační**
  (zápis do DR + komentář), bez testovatelného dopadu teď. Doporučuji v DR-020-01 explicitně označit
  jako **„deferred — aktivuje se při M-future health rozšíření"**, aby budoucí implementátor rozhodnutí
  nepřehlédl (jinak hrozí, že se omylem zreprodukuje precedence bug). Carry-flag do backlogu.

---

## Souhrn nálezů

| ID | Severity | Oblast | Nález | Návrh |
|---|---|---|---|---|
| MINOR-1 | minor | cap wiring | `CATCHUP_CAP_MS` (main.js:58) je hardcoded literál, neodvozený z BALANCE; design to neflaguje | Coder: přepojit volajícího (main.js:250) na `min(capTech,capBalance)*3.6e6`; zapsat do DR-020-01 |
| MINOR-2 | minor | harness sampler | sampler cesty v §4.3-S2 (`home.curWorkers`, `home.foodStore`) neodpovídají kódu (`home.food.store`, žádný top-level curWorkers) | Coder: opravit cesty proti createHomeState.js, jinak tichý NaN v assertu |
| MINOR-3 | minor | dekompozice L | cena plného-balanc kvartálu je hypotéza bez měření | Coder: změřit 1 kvartál jako první krok, zvolit kvartál/měsíc dle výsledku |
| MINOR-4 | minor | cap naming | `capBalanceRealHours` diverguje od architekturního `capRealHours` (§9.2b) bez zápisu | Ponechat (čitelnější) + zapsat odchylku do DR-020-01, NEBO sjednotit na `capRealHours` |
| NIT-1 | nit | regression invariant | pop anti-spike X=50 %/den je approximated, riziko false-positive | Soft-warning místo hard-fail, nebo doplnit provenance komentář |
| NIT-2 | nit | split merge | A i B editují balance.js (různé bloky) → drobné riziko merge konfliktu | Orchestrátor: sekvencovat merge A→B nebo rebase B |
| NIT-3 | nit | home.js:970 | odchylka je dnes čistě dokumentační (mechanika v core chybí) | Označit v DR-020-01 jako „deferred", carry do backlogu |

**Blocker: 0 · Major: 0 · Minor: 4 · Nit: 3.**

---

## Podmínky pro GO (3)

1. **MINOR-1 (cap wiring):** DR-020-01 musí explicitně instruovat přepojení `CATCHUP_CAP_MS` v main.js
   na `min(capTechRealHours, capBalanceRealHours)`, jinak je nová konstanta mrtvá. (release-critical pro
   smysluplnost capu — latentní past stejné třídy jako M8 firstStarve.)
2. **MINOR-2 (sampler paths):** Coder ověří a opraví state cesty proti `createHomeState.js`
   (`home.food.store`, ne `home.foodStore`) — jinak regression sampler tiše čte undefined.
3. **MINOR-4 (cap naming):** Rozhodnout jméno konstanty (`capBalanceRealHours` vs architekturní
   `capRealHours`) a zaznamenat v DR-020-01 jako vědomou odchylku, ať zůstane traceability.

Body MINOR-3 + NIT-1/2/3 jsou doporučení, ne podmínky.

---

## Stanovisko k tvrdým invariantům (brief)

| Invariant | Stav |
|---|---|
| Cíle-proti-referenci (R-C) | ✅ PASS — DoD proti explicitním hratelnostním cílům, server-ref zamítnut |
| Determinismus harness | ✅ PASS — seedovaný, bez Date.now/Math.random/DOM, hashState-reprodukovatelný |
| Dekompozice L pod limit | ✅ PASS — kvartální it()+save/load+multi-seed; měření granularity = podmínka soft (MINOR-3) |
| Kalibrace = data ne logika | ✅ PASS — formulas.marketPrice/marketDailyDrift/catchupStepCount NEMĚNĚNY, grep-gate vynutitelný |
| Cap separace + min kontrakt | ⚠️ PASS-s-podmínkou — separace správná, ale wiring k literálu chybí (MINOR-1) |
| Vědomé odchylky (data ne skrytě) | ✅ PASS — home.js:970 v DR/komentáři, mechanika v core chybí = deferred |
| Split (paralelní, oba Sonnet) | ✅ SOUHLAS — disjunktní práce, merge balance.js sekvencovat (NIT-2) |

**Doporučení dalšího kroku:** **GO-s-podmínkami → postup na tom-proxy gate (T-003)** pro rozhodnutí
varianty capu (A=8 / B=2 / C=0.5). 3 podmínky jsou implementační upřesnění do DR-020-01, neblokují
předání. Architektonicky je design zdravý a věrný R-C / §9.1 / §9.2a.

---

*Zdroj pravdy pro §/D/R/S/K: `architecture_proposal_iter-002_T-001.md`. Reviewováno proti kódu:
market.js, balance.js, formulas.js, catchup.js, main.js, createHomeState.js, load.js, rng.js + originál
home.js:970.*
