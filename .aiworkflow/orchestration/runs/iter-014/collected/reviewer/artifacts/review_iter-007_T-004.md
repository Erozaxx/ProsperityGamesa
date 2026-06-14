# Review Gate – iter-007 T-004 (DoD M2a)

- **Reviewer**: reviewer (Opus), pravomoc re-run
- **Datum**: 2026-06-13
- **Brief**: BRIEF-027
- **Vstupy**: design_iter-007_T-001.md, impl_iter-007_T-002a.md, impl_iter-007_T-002b.md, testreport_iter-007_T-003.md, architektura §4.3/§6/§7/§8, reálný kód (`src/core/systems`, `src/core/resources`, `src/save`, `src/core/catalog`, `test/`, `docs/tickOrder.md`).

## VERDIKT: **GO**

0 BLOCKER. DoD M2a splněno. Nálezy: 1 SUGGESTION (high), 2 SUGGESTION, 3 NITPICK – vše M2b/M3 backlog, žádný neblokuje milník.

Vlastní ověření: `npm run ci` → tsc 0 errors, lint:core (grep gate) OK 32 souborů, node --test **460 pass / 0 fail**. Working tree čistý (kód neměněn).

---

## DoD M2a bod po bodu

| DoD | Stav | Důkaz |
|-----|------|-------|
| populace/jídlo/zdraví/krimi deterministicky **live i v dávce** | OK | `population.js`/`food.js`/`health.js`/`crime.js` registrované v `tickOrder.js` jako reálné systemFn; catch-up parita ověřena tester T-003 (hashState A==B na 1/900/1800/4500/27900 krocích). KÓD: čas jen z edges/curStep, náhoda jen `makeRng`, žádný `Date.now`/`Math.random`/DOM (grep gate 32 souborů OK). |
| save **round-trip nových domén** | OK (na úrovni pipeline) | `applyPersist` allowlist + `loadAndReconstruct` 7 kroků; round-trip population/housing/food/health/crime/world/battle zelený (persist.test, contracts.test, edge-m2a). Viz S-1 k napojení do app. |
| stuby world/battle + **kontraktní testy** | OK | `world.js`/`battle.js` no-op/pure; `contracts.test.js` §8 (battle determinismus, world/battle round-trip, schedule survives save/load, S-06). |

## Catch-up-safe invariant (S-05) – posouzení KÓDU (ne jen testů)

**Drží.** Prošel jsem hot-path systémy na skryté ne-determinismy/alokace:
- Čas: všechny systémy berou stav z `state.home`/`BALANCE`/edges; žádné čtení reálného času v core (potvrzeno grepem – jen komentáře v `clock.js`/`formulas.js`).
- Náhoda: jen `makeRng(state,'population')` (disease, crime). RNG stav serializovatelný v `state.rng.streams`, mulberry32 čistě funkční. Migrace/births/retirement/spoilage/meal jsou plně deterministické bez RNG.
- Frakční akumulátor `migrationAcc` drží zbytek per-step (žádný skok závislý na dávce) – správně catch-up-safe.
- Alokace: systémy počítají agregáty z čísel ve stavu (`calcHousingDerivedFromCatalog` iteruje jen přes ~8 house tierů), žádné O(n²), žádné velké kolekce v hot-path. Akceptovatelné pro 900×/den.
- `pay`/`grant` atomické: `canAfford` ověří všechny klíče PŘED jakoukoli mutací → neúspěšná `pay` nemění stav (potvrzeno testem). NaN guard na `add`/`remove`/`pay`/`grant`. Ne-pod-nulu vynuceno, food fair-share jediná výjimka (`consumeFood` PURE + clamp ≥0).

## Kontrakty §8 vč. negativního S-06

- **S-06 (negativní)**: `world.js` neimportuje ani nevolá `goldValue`/`market.inject`. Ověřeno staticky (grep nad `src/core` – `goldValue` existuje JEN v `formulas.js` jako definice; žádný systém ji nevolá) i testem (`contracts.test.js` string-include guard + behaviorální spy, že `world.tick` neemituje žádné tx). OK.
- battle determinismus (prázdná bitva, stejný seed → stejný tick/state), round-trip `world.zones/factions` a `battle`, schedule s AI eventem přežije save/load – všechny zelené.

## Soulad s návrhem

| Položka návrhu | Stav |
|---|---|
| Split M2a-1/M2a-2 | OK (T-002a infra, T-002b systémy) |
| Transakční vrstva (§7) | OK – handlers per kind, canAfford/pay/grant, txEvent přes opt-in `ctx.emitTx` |
| Persist 7 kroků (§6.4) | OK – validate→migrate→construct→apply(allowlist)→recalc(no-op)→invariants→return; žádný `fixNaNs`, invarianty jsou asserty |
| Migrace v1 (§6.3) | OK – prázdný řetěz, `migrate()` volaný v load kroku 2 |
| Catalog hardening (§3) | OK – byId + K10 kolize, itemShape typ/min/max/enum/nullable, B4 cross-ref s food cílem (N-2), productMap (S-3), gap-report blocksMvp/summary (S-2) |
| tickOrder pořadí (§4) | OK – noon: births(10)→retirement(20)→disease(30)→crime(40)→meal2(50); day: meal1(10)→settlement(20)→world(30); month: spoilage(10). `docs/tickOrder.md` aktualizován ve stejné iteraci (living artefakt N-04). |

## Kvalita

- **persist allowlist (ne celý stav)**: `applyPersist` vytahuje JEN allowlistovaná pole, deriváty (housing capacity/workerSlots/attractiveness) se neukládají – OK. **ALE** viz S-1: do reálné save vrstvy ještě nenapojeno.
- **balance čísla**: `balance.js` má source ref komentáře pro extracted hodnoty; nové M2a konstanty (start/food/health/crime/housing) korektně označené `provenance: approximated` a zapsané v impl note jako gapy → kalibrace M9. OK (konzistentní s M1 přístupem).
- **core bez DOM**: grep gate OK.

---

## Nálezy

### SUGGESTION S-1 (HIGH – první v M2b) – persist pipeline není napojen na reálnou save/load cestu
`src/save/saveStore.js:103` stále ukládá `payload: structuredClone(state)` (CELÝ stav vč. derivátů a `engine.frameBudget`), nevolá `applyPersist`. `loadGame` vrací `rec.payload` přímo, když není předán katalog – a `src/app/main.js:62` volá `loadGame(SLOT_ID)` **bez katalogu** → produkční load obchází `loadAndReconstruct` (žádná migrace/čistá konstrukce/invarianty). Navíc `main.js` nikde nevolá `loadCatalog(...)`, takže v běžícím appu `getCatalog('jobs')` v `jobsProduction` vyhodí→catch→prázdné joby (žádná produkce jídla) a `resourceKindOf` padá na fallback `'resource'`.
- **Proč ne BLOCKER**: design §0 explicitně řadí end-to-end bootstrap/catch-up MVP do **M2b** ("zde NE"). DoD M2a-1 (§9) vyžaduje `applyPersist`+`loadAndReconstruct`+round-trip **testy zelené** – to splněno. Pipeline existuje a je ověřená jednotkově; chybí jen glue.
- **Co opravit (M2b, hned na začátku)**: (a) `saveGame` → `payload: applyPersist(state)`; (b) `loadGame` injektovat katalog a vždy přes `loadAndReconstruct`; (c) `main.js` načíst katalogy (`loadCatalog`) + `buildById` před bootstrapem; (d) rozšířit `app-persist.test.js` o save→load přes reálný `saveStore`, ne jen přes holé funkce.

### SUGGESTION S-2 – `createInitialState` volá `createHomeState()` přímo + nepoužité `BALANCE.start`
Návrh §2.1 chtěl `createInitialState` držet catalog-free a `createHomeState` volat z bootstrap/load. Implementace ho volá přímo v `createInitialState.js:57-58`. Funkčně OK (state je vždy naplněný), ale `createHomeState` hardcoduje `population.total:0`, `gold:0`, `housing.counts:{tent:5}` a **ignoruje `BALANCE.start`** (population:50, gold:500, food.bread:20). Takže startovní balanc čísla nikde nežijí v běhu. Sjednotit v M2b (factory čte `BALANCE.start`), jinak je `BALANCE.start` mrtvý kód.

### SUGGESTION S-3 – food handler capuje per-druh na 500
`handlers.js:13,68` `MAX_FOOD=500` clampuje KAŽDÝ druh jídla zvlášť → 6 druhů = až 3000 total, kdežto `population.json.maxFood` je míněn jako agregátní strop osady. `grant` ztichlý clamp neemituje shortfall. Návrh §7.1 zmiňoval `foodAggregate` handler (fair-share napříč druhy) – ten není implementován (food joby grantují per-druh). Pro M2a bez dopadu na determinismus; kalibrovat cap-model v M3/M9.

### NITPICK N-1 – `crime.js` „advance RNG" nic neadvancuje
`crime.js:24` `makeRng(state, 'population')` jen vytvoří objekt; `makeRng` je lazy a stream posune až `.next()`. Komentář "Consume RNG to advance stream" je tedy zavádějící – stream se neposune (crime žádné `.next()` nevolá). Determinismus tím neutrpí (je deterministické tak či tak), ale buď komentář opravit, nebo skutečně volat `.next()`, pokud byl záměr rezervovat RNG pozici pro budoucí stochastiku.

### NITPICK N-2 – sdílený `'population'` RNG stream bez dokumentace
disease (noon/30) i crime (noon/40) sdílí stream `'population'`; migration ho nepoužívá. Návrh §7.2 žádal „drž 1 stream konzistentně, zapiš který". Doplnit krátkou pozn. (kde) o sdílení streamu, ať M3 ví, že přidání RNG do migration/crime posune disease.

### NITPICK N-3 – `migrate()` čte verzi z `payload.meta.saveVersion`, obálka ji má top-level
`migrations.js:31` bere verzi z `p.meta.saveVersion` (default 1), zatímco save record nese `saveVersion` na top-levelu. Pro M2a (prázdný řetěz) bez dopadu; až přibude první migrace, sjednotit zdroj verze, ať se řetěz spustí správně.

---

## Závěr
GO. DoD M2a (deterministické systémy live+dávka, save round-trip nových domén na úrovni pipeline, stuby+kontrakty vč. S-06) je splněno a ověřeno kódem i `npm run ci` (460/460). Catch-up-safe invariant drží i v kódu (žádné skryté ne-determinismy/alokace v hot-path). Nálezy jsou všechny non-blocking – S-1 (napojení persist pipeline + catalog load do app/bootstrap) je **prioritní první úkol M2b**, ostatní M3/M9 backlog. Orchestrátor může uzavřít iter-007 / pustit M2b.
