# MVP GATE Review – iter-011 / T-004 (DoD M4 = MVP)

- **Task**: T-004, iter-011 (BRIEF-043)
- **Autor**: reviewer (Opus) – MVP GATE s pravomocí re-run
- **Datum**: 2026-06-13
- **Vstupy (přečteno)**: design_iter-011_T-001, impl_iter-011_T-002, testreport_iter-011_T-003, zadani_projektu.md, architektura §11, AGENTS.md. Reviduný reálný kód: market.js, caravan.js, crime.js, buyGoods/sellGoods/sendCaravan.js, main.js (bootSequence/bootstrapEngine), screens.js + App.js + selectors.js, migrations.js + persistSchema.js, tickOrder.js, goods.json, contracts.test.js.

---

## VERDIKT: **GO – MVP HOTOVÉ**

`npm run ci` zelené: **tsc 0 errors, lint:core OK (52 files), node --test 762 pass / 0 fail**.
Žádný BLOCKER. Idle smyčka uzavřená a hratelná end-to-end. Wiring (commandy + UI + persist + periodics) reálně napojený, ne jen unit.

---

## Potvrzení MVP acceptance criteria (body 1–7)

### 1. Instalace + offline (PWA) — ✅ POTVRZENO
- `manifest.webmanifest` (name, start_url, scope, display:standalone, icons) v rootu.
- `service-worker.js`: install → `cache.addAll(PRECACHE_URLS)`, activate → cleanup starých verzí, fetch → cache-first s fallbackem na `./index.html`. Precache list versioned (`src/precache.js`, gen-precache.mjs).
- `src/app/sw-register.js` registruje SW. Offline start kryt cache-first + precache.

### 2. Reálný-čas engine, sezóny, pauza/1×/2× — ✅ POTVRZENO
- `clock.js`: `SPEED_FACTOR = {0:0, 1:1, 2:2}` → pauza (debt se zahazuje, žádný catch-up po unpause), 1×, 2×. Accumulator + frame budget.
- `timeEdges.js`: `DAYS_PER_SEASON = 91`, rok = 4×91. Day/season/year hrany.
- `setSpeed` command registrovaný.

### 3. Populace + bydlení + jídlo + úmrtí (M2) — ✅ POTVRZENO
- `systems/population.js`, `housing.js`, `food.js` přítomné a v periodics (M2 hotové z dřívějších iterací, regrese zelená v CI).
- TC-19b/e2e: „populace jí, produkce běží" bez chyby.

### 4. Produkce surovin (les/pole/důl) + joby/skilly (M3) — ✅ POTVRZENO
- `systems/{forest,field,mine}.js`, `jobs.js`, `skills.js`, `workerEfficiency.js` přítomné. `assignJob`/`startSkill` commandy registrované. M3 regrese zelená.

### 5. Ekonomika: gold, daně, dynamické ceny, karavany (M4) — ✅ POTVRZENO (jádro této iterace)
- **Daně/gold (M4a)**: `setTaxRate` command, council účetnictví, `pay`/`grant` přes resource vrstvu.
- **Dynamické ceny**: `priceOf` = `formulas.marketPrice` (kubika basePrice×(1.5−ratio)³) z `marketState[id].{available,max}`; spread `haggleBuy=1.35`/`haggleSell=0.6`. Ceny se reálně mění s available (nákup ↑ cenu, prodej ↓).
- **buyGoods/sellGoods**: validace → canAfford → pay/grant → clamp available∈[0,max] (N-02). Atomicita ošetřena (pay nemění stav při nedostatku).
- **Karavany**: `sendCaravan` (kapacita, idle check, expenditures, scheduleInsert na curStep+27000=30 dní) + `caravanReturns` schedule handler (grant recGoods s ctx → emitTx). Obojí registrované (command v bootstrapEngine, handler v registry).
- **Drift**: `marketDailyDrift` mean-reversion k=0.2, day order 35, clamp, catch-up-safe.

### 6. Idle smyčka uzavřená (výdělek→nákup→pasivní příjem→offline) — ✅ POTVRZENO
- Smyčka kompletní: joby produkují → daně/gold → trh nákup/prodej → karavany pasivní příjem → offline catch-up dopočítá drift + návrat karavany. TC-19 e2e (fresh boot, idle den, save/load, offline catch-up) PASS.
- UI tlačítka reálně volají `send(...)` → `dispatch(creg,...)` → registrovaný handler (ověřeno v screens.js + App.js + main.js). Žádné mrtvé UI (poučení M2b/M3/M4a ošetřeno).

### 7. Spolehlivý save vč. offline výpočtu — ✅ POTVRZENO
- `catchup.js` (catchupStepCount/runCatchupBatch) napojený v bootSequence; offlineSummary.
- Autosave + `saveGame`/`loadGame` (idb), export/import přes `exportToString`/`importFromString` napojené v UI (onExport/onImport handlers, main.js ~208-216).
- Persist allowlist rozšířen o `marketState`+`caravan`; migrace v2→v3 deterministická a idempotentní (marketState={} → marketInit doplní z katalogu při bootu, available zachován u v3 round-trip).

---

## Cílené kontroly z briefu

- **Commandy dosažitelné v runtime**: ✅ `registerBuyGoods/SellGoods/SendCaravan` v `bootstrapEngine` (main.js:94-96); buildCtxCatalog zahrnuje `'goods'` (main.js:67); `marketInit` v bootSequence (main.js:177). TC-18 ověřuje `creg.handlers.has(...)`.
- **MarketScreen napojený**: ✅ import + tab `{id:'market',label:'Trh'}` + render větev s `send` (App.js:15,23,110). Tlačítka Koupit/Prodat/Poslat karavanu → správné send params; Prodat disabled při owned<10; karavana disabled při onRoad.
- **getGoldValue/marketInject (S-06 pozitivní)**: ✅ contracts.test.js negativní asserce nahrazeny pozitivními (exporty + value semantics + clamp + no-op). getGoldValue gold 1:1, koš oceněn marketPrice.
- **Arbitráž sanity**: ✅ spread 0.6/1.35≈0.444 → buy→sell vždy ztráta ~55.6 %, cenový dopad to zhoršuje. TC-01 PASS pro všech 5 komodit.
- **crime fix (DA5 grep-gate)**: ✅ `grep "player.gold =" src/core/systems/` ČISTÝ; crime.js používá `pay(state,{gold},'crime:loss',ctx,step)`. Žádná přímá mutace gold/inventory v systems.
- **persist v2→v3**: ✅ SAVE_VERSION=3, migrace přidává marketState/caravan, round-trip + migrace testy PASS (TC-17/20/21).

---

## Nálezy

**BLOCKER: žádný.**

**SUGGESTION (mimo MVP, backlog – neblokuje GO):**
- S-1 (UI/UX): MarketScreen má pevné qty=10 a karavana fixní preset (koupit 10 tools). Pro plnou hratelnost je nice-to-have qty input a buy/sell editor karavany. Designem vědomě odloženo (MVP).
- S-2 (balance): basePrice/max/driftK jsou `approximated` (gap G-LISTGOODS/G-MARKET-DRIFT) – kalibrace plánovaná M9.
- S-3 (katalog): goods IDs (tools/cloth/gems/spice/silk) se liší od design tabulky (wood/ore) kvůli K10 ID-collision (byId je plochý cross-catalog index). Vědomé, zdokumentované v impl note; testy psány dle skutečného katalogu. Bez dopadu na MVP.

**NITPICK:** žádný blokující.

---

## Mimo MVP (M5–M9) – potvrzení, že plán řeší dál
Výzkum/budovy (M5), AI svět/tribute (M6/M7), vojsko (M8), příběh + finální kalibrace (M9) NEJSOU předmětem této gate. Architektura má připravené kontrakty (`marketInject` pro M7 zóny, getGoldValue jako jediné oceňovací API pro tribute, caravan speed pro road techy M5). Gapy explicitně evidované (G-LISTGOODS, G-MARKET-DRIFT, G-HAGGLE-MODS, G-CARAVAN-ROADS). Žádný únik scope do MVP.

---

## Doporučení dalšího kroku
**APPROVE – uzavřít iter-011 jako MVP hotové.** Backlog S-1..S-3 přenést do M5/M9 plánu. Žádný re-run.
