# Code Review — iter-012 T-011 (playability A1–A5 + reload-determinismus fix)

- **Agent**: reviewer
- **Iteration**: iter-012
- **Task**: T-011 — code review celé implementace iter-012
- **Date**: 2026-06-13
- **Branch**: feature/iter-012-init
- **Diff**: `git diff 1418072..HEAD -- src/ tools/ test/` (18 souborů, +453/−63)
- **Vstupy**: brief BRIEF-012-011, DR-012-01, DR-012-02, architektura T-003, impl summaries T-005-009/T-014/T-016, QA report T-010
- **Metoda**: čtení diffu + okolního kódu (formulas.js, population.js, health.js, jobs.js, load.js, createInitialState.js), kontrola souladu s architekturou/DR, ověření determinismus cest a derivovaných polí.

## VERDIKT: **GO**

Implementace je věcně správná, čistá, dobře komentovaná v invariantních místech (zejm. RNG/determinismus) a v souladu s architekturou T-003 i DR-012-01/02. QA (T-010) dala GO empiricky; tento review potvrzuje **kvalitu kódu**. Nalezeny **0 blocker, 0 major, 3 minor, 4 nit**. Žádný nález nebrání mergi — minor/nit jdou do backlogu (per AC briefu: blocker/major → reopen; minor/nit → backlog).

---

## Souhrn nálezů

| # | Závažnost | Oblast | Soubor:řádek |
|---|-----------|--------|--------------|
| F-1 | minor | A4 births — clamp shrinkuje over-cap loaded pop | `src/core/systems/health.js:51-57` |
| F-2 | minor | A4 — duplikace sanity-cap výrazu (health vs population helper) | `src/core/systems/health.js:52` |
| F-3 | minor | A1/load — `_catalog` param zůstává mrtvý, lze časem odstranit | `src/save/load.js:191,196` |
| F-4 | nit | A4 — `retRate/DAYS_PER_YEAR` se počítá inline na 3 místech (health+pop+testy) | `health.js:43`, `population.js:107` |
| F-5 | nit | balance.json mirror `sanityMaxPop` chybí (odchylka coder #1, zdůvodněná) | `src/core/balance/balance.js:133` |
| F-6 | nit | A3 test — `crime.level=1.0`, ale `crimeCount` cap neověřen pro extrémní gold | `test/health-crime.test.js:241` |
| F-7 | nit | iter005-edge G1 — přesun `hashA` za Path B je korektní, ale netriviální; chybí 1řádkový komentář | `test/iter005-edge.test.js:99` |

---

## Correctness (jádro reviewu)

### A1 — Start seed (createInitialState single source of truth) — OK
- `createInitialState.js:70-78`: seed z `BALANCE.start` na jediném místě (gold 500, pop 50, housing `{...start.housing}`, food merge nad zero-store). **Žádný dvojí seed**: `createHomeState.js` byl správně zredukován na neutrální default (`pop 0`, `counts {}`), chybné čtení `startTents`/`startPopulation` (neexistující klíče) odstraněno. `load.js:211-212` override smazán → fresh i load sdílí **jednu** seed cestu, `applyPayload` (allowlist) přepíše uložená pole. Přesně dle architektury §1 a DR.
- **Konzistence pop/housing/food/gold ověřena**: housing je `{...BALANCE.start.housing}` (mělká kopie → no shared-ref leak, pokryto testem `iter012-playability.test.js:52`). Food merge `{...zeroStore, ...start.food}` garantuje všech 6 klíčů (R-A1-2, test ř. 43). R-A1-1 (save bez home → seed default) pokryto testem ř. 85.

### A2 — Resolver gold/techPt early-return — OK
- `handlers.js:179-181`: `if (key==='gold') return 'gold'; if (key==='techPt') return 'techPt';` **PŘED** `byId`. Přesně Option A z DR-012-01/architektura §2.3. S katalogem no-op (gold/techPt v `resources.json` s `kind==id`), catalog-less vrací správný handler místo `'resource'`. **Žádný regres jiných zdrojů** — ostatní klíče padají do nezměněné `try/byId` větve. Invariance test (s katalogem i bez) + grep-gate pokrývá R-A2-1. Komentář u early-return jasně označuje, že jde o defense-in-depth, ne bug fix.

### A3 — Crime no-throw — OK
- `crime.js` **nezměněn** (správně — clamp `Math.min(floor, player.gold)` + dvojitý guard už chrání). Přidán pouze regress test (`health-crime.test.js:236`) přes pop∈{0,1,50,1000,10000} × gold∈{0,1,5,100} + broke-settlement clamp. Soulad s architektura §3. **Žádný throw, gold nikdy záporný** — ověřeno assertem.

### A4 — Sanity-cap + denní sazba — OK s 1 minor (F-1)
- **Denní sazba**: `health.js:43` `matRate / DAYS_PER_YEAR`, `population.js:107` `retRate / DAYS_PER_YEAR`. `DAYS_PER_YEAR = 4 * BALANCE.season.seasonDays` (= 364) — derivováno z jediného zdroje pravdy (`population.js:62`), **žádný off-by-one** (test ř. potvrzuje =364). `natality` zůstala čistá `floor(pop*rate)` — sazba zvenčí, dle architektury §4.
- **Sanity hard-cap**: births (`health.js:51-57`) i migrace (`population.js:92-94`) clampují na `max(capacity, sanityMaxPop)` — symetricky (review MINOR-3 z architektury vyřešen). `sanityMaxPop=10000` v `balance.js:133`. Retirement cap nemá — **správně**, retirement jen klesá.
- **Přetečení/off-by-one**: `bornTotal` používá `Math.max(0, cappedBorn)` → nikdy nezáporný přírůstek (čistě ošetřeno pro případ `pop ≥ cap`). Cap stress test (QA AC3) potvrdil `overshoot=0` na 10000.
- **Determinismus**: births/retirement bez RNG (čistý `floor`) → změna sazby deterministická; `healthDisease` RNG stream nedotčen (R-A4-1). Ověřeno.

> **F-1 (minor)** `health.js:51-57`: pro **loaded** save s `pop > sanityCap` (existující „explodovaný" save) a `born > 0` platí `newTotal = min(pop+born, sanityCap) = sanityCap < pop` → `population.total` se **sníží** z např. 15000 na 10000. To je v rozporu s architekturou R-A4-3 („existující savy s explodovanou populací zůstanou … jen další růst se zastropuje"). Migrace tuto vlastnost nemá (clamp jen uvnitř `if (toAdd>=1)`), takže chování je navíc nekonzistentní mezi births a migrací.
> **Návrh**: clampovat jen *přírůstek*, ne absolutní pop: `const newTotal = pop >= sanityCap ? pop : Math.min(pop + actualBorn, sanityCap);` (tj. nikdy neshrinkovat již-nad-cap populaci, jen zastavit další růst). Dopad je nízký (default seed sem nedojde; jen ručně/legacy nafouklé savy), proto minor, ne major — ale formálně to odporuje deklarovanému invariantu R-A4-3.

### Reload-determinismus fix (DR-012-02) — OK, jádro správně
- **`deriveWorkforceTotal` jako single source of truth** (`jobs.js:69-72`): `min(population.total, workerSlots(state, ctx))`. Volán na **3 kanonických místech** a nikde jinde:
  - `createInitialState.js:134` (derive-on-init, T-016)
  - `load.js:224` (rebuild-on-load Step 5, T-014)
  - `jobs.js:213` `autoAssignWorkers` (`availableWorkers = deriveWorkforceTotal(state, ctx)`)
  - Ověřeno: **žádná 4. inline kopie** (`autoAssign` dříve měl inline `Math.min(pop, slots)` → nahrazen helperem, bit-identický). Grep `workforce.total =` → jen tato 3 místa. Init↔load↔autoAssign konzistence drží.
- `workerSlots` `ctx` zneškodněno na optional (`jobs.js:46`) s global-catalog fallbackem — init i load volají bez `ctx`, autoAssign s `ctx`; fallback vrací identickou hodnotu (== chování load), pokrytu komentářem.
- **RNG cesta nedotčena**: fix přidává hodnotu derivovaného pole PŘED krokem 1, nemění pořadí edge ani počet `rng.next()`. `jobsAccidents` (order 20) nyní čte na obou cestách (init/load) stejnou ne-stale hodnotu → `'population'` stream se čerpá ve stejném okamžiku → žádný desync. Root cause (stale `workforce.total=0` na 1. ticku) odstraněn, ne maskován. Komentáře v `createInitialState.js:127-133` a `load.js:218-223` invariant explicitně vysvětlují — výborné pro maintainability.
- **Save tvar (v3) nezměněn**: `workforce.total` zůstává neperzistované (QA AC6 potvrdil `applyPersist` bez `total`). G1 v `iter005-edge.test.js` vrácen na **plný `hashState`** (applyPersist obejití odstraněno) — dle DR-012-02 acceptance. QA AC5 potvrdil bit-shodu plného hashState na 10 save-pointech vč. kroku 0/1/2.

---

## Reuse / simplify

- **F-2 (minor)** `health.js:52`: `Math.max(capacity, BALANCE.population.sanityMaxPop)` duplikuje logiku exportovaného helperu `populationSanityCap(capacity)` (`population.js:104`), který migrace už používá. **Návrh**: importovat a použít `populationSanityCap(capacity)` i v `healthBirths` → jediná definice sanity-cap výrazu, konzistence mezi births a migrací. (health.js už importuje z population.js, takže přidání jednoho jména je triviální.)
- **F-4 (nit)** `health.js:43`, `population.js:107`: výraz `annualRate / DAYS_PER_YEAR` se opakuje inline na obou call-sites + v testech. Architektura §4 to explicitně povolila („převod v místě volání … méně duplikace zdroje pravdy"), takže je to vědomé a obhajitelné. Nit pro případ budoucí změny modelu sazby (M9 tuning).
- **F-3 (minor)** `load.js:191,196`: `_catalog` param zůstal jen kvůli signature-compat, je nepoužitý (seed jde z `createInitialState`). Funkčně OK (volající `loadGame(slot, {})` ho předává), ale je to mrtvý povrch. **Návrh** (backlog): až se ověří, že žádný caller `loadAndReconstruct` nespoléhá na 2. arg, odstranit param úplně — sníží matoucí povrch API. Nízká priorita.

---

## Maintainability

- Komentáře u netriviálních invariantů jsou **nadstandardní** (RNG/determinismus v `createInitialState.js`, `load.js`, `jobs.js`; defense-in-depth v `handlers.js`; sanity-cap provenance v `balance.js`). Pojmenování konzistentní (`deriveWorkforceTotal`, `populationSanityCap`, `DAYS_PER_YEAR`). Splňuje „kód čitelný bez autora".
- **Test coverage nových cest**: A1 (seed + old-save override + R-A1-1/2), A2 (invariance s/bez katalogu + grep-gate + handler reads player.gold), A3 (no-throw matice + clamp), A4 (denní sazba births/retirement + hard-cap exactly/overshoot + helper asserty), determinismus (G1 plný hashState + S-1 + export round-trip přes QA). Coverage je **adekvátní až dobrá**.
- **F-6 (nit)** `health-crime.test.js:241`: A3 matice nastavuje `crime.level=1.0` pro „max incidents", ale neověřuje, že `crimeCount` cap drží i pro velmi vysoký `pop` (10000) — test spoléhá, že `goldLoss` clamp ochrání throw, což ano. Doplnit assert na konkrétní `goldLoss ≤ player.gold` by zpřesnilo, ale není nutné (no-throw + `gold≥0` invariant pokrývá podstatu). Nit.
- **F-7 (nit)** `iter005-edge.test.js:99`: přesun výpočtu `hashA` z místa po `makeState(TOTAL)` až ZA Path B je **korektní** (`stateA` je nezávislý objekt, Path B ho nemutuje; global katalog je sdílený, ale `step` ho nemění) — ale čtenáři to může připadat jako záměna pořadí. 1řádkový komentář „hashA computed after Path B; stateA is independent" by ušetřil budoucí dohledávání. Nit.

---

## Soulad s architekturou + DR

| Oblast | Architektura/DR předepisuje | Implementace | Soulad |
|--------|------------------------------|--------------|--------|
| A1 seed | createInitialState single source, smazat load 211-212, čistit createHomeState | přesně tak | ✅ |
| A2 | Option A early-return v resourceKindOf (DR-012-01) | přesně tak | ✅ |
| A3 | žádná změna kódu, jen regress test | přesně tak | ✅ |
| A4 | denní sazba ÷364, hard-cap births i migrace symetricky | implementováno; **F-1** odchylka u shrink over-cap loaded pop vs R-A4-3 | ⚠️ minor |
| A5 | scroll wrapper + responsivní CSS, reuse var(--) | `.table-scroll` wrapper + CSS, reuse `var(--btn-bg)` apod. | ✅ |
| Determinismus | deriveWorkforceTotal single source, 3 místa, save v3, G1 plný hashState | přesně dle DR-012-02 | ✅ |
| balance.json mirror | architektura doporučila zrcadlit sanityMaxPop | **F-5**: nezrcadleno — odchylka coder #1, zdůvodněná (auto-revert generovaného souboru, nic z JSON nečte sanityMaxPop) | ✅ akceptováno |
| smoke.mjs typecheck fix | mimo scope, ale nutné pro green CI | type-annotation-only, zero behavior change | ✅ |

- **F-5 (nit)** `balance.js:133` vs `src/data/balance.json`: `sanityMaxPop` chybí v JSON mirroru. Coder zdůvodnil (generovaný soubor se auto-revertuje, runtime i testy čtou `BALANCE` z balance.js). Akceptuji jako vědomou odchylku — žádný čtenář `sanityMaxPop` z JSON neexistuje. Nit jen pro evidenci.

---

## Determinismus — explicitní závěr (core invariant)
RNG cesty a derivovaná pole prověřeny obzvlášť pečlivě (per brief):
- **Žádné nové/odebrané `rng.next()`/`makeRng`/`rng.chance` volání.** A1/A2/A4 jsou bez RNG; reload-fix mění jen *hodnotu* derivovaného pole před 1. tickem, ne RNG sekvenci.
- **`workforce.total` derivace sjednocena** na 1 funkci, 3 call-sites, žádná 4. kopie → init/load/autoAssign produkují bit-identickou hodnotu.
- G1 plný hashState zelený na obou cestách (QA AC5, 10 save-pointů). Accounting invariant drží (QA AC4, maxStepDiscrepancy=0).
- Závěr: **determinismus invariant je dodržen.** F-1 je balanc/loaded-save edge, ne determinismus regrese (births bez RNG).

---

## Doporučení dalšího kroku
**APPROVE / GO.** Žádný blocker ani major → orchestrátor nemusí reopovat coderovi. 3 minor (F-1 nejhodnotnější — formálně odporuje R-A4-3) + 4 nit do backlogu. F-1 zvážit při příštím dotyku A4 (M9 balance tuning je beztak přepíše).
