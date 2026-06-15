# Review – iter-008 / T-004 – Gate M2b (= DoD M2)

- **Reviewer**: reviewer (Opus), pravomoc re-run
- **Datum**: 2026-06-13
- **Vstupy**: design_iter-008_T-001, impl_iter-008_T-002, testreport_iter-008_T-003, architektura §4.1/§6, reálný kód (src/core/engine/catchup.js, src/core/systems/population.js, src/save/*, src/app/*, src/ui/*, test/*, tools/bench-step.mjs)
- **CI**: `npm run ci` ZELENÉ — tsc 0, lint:core OK (33 souborů), node --test **529/529 PASS** (ověřeno přímo, 15.4 s).

## VERDIKT: **RE-RUN**

CI je zelené a jednotlivé stavební bloky (catchup.js, autosave.js, exportString.js, catalogs.js, offline summary/progress, saveStore allowlist) jsou kvalitní a dobře unit-otestované. **ALE jádro acceptance M2 – "osada žije offline" – v reálné aplikaci NENÍ splněno, protože `src/app/main.js` žádnou z M2b funkcí nenapojuje.** Zelené CI to nezachytí, protože žádný test neexercituje boot wiring (`main.js` / `runCatchup` integraci nikdo netestuje). To je rozpor mezi impl note / test reportem (tvrdí "main.js bootstrap: katalogy→loadGame(slot,catalog)→catch-up") a skutečným kódem.

---

## BLOCKERY

### B-1 (BLOCKER) — main.js nenapojuje katalogy: S-1 v reálné boot cestě NEVYŘEŠENO
`src/app/main.js:62` volá `loadGame(SLOT_ID)` **bez katalogu** → `saveStore.loadGame` jde větví `: rawPayload` (saveStore.js:144-146), tj. **obchází `loadAndReconstruct`** (žádná migrace, čistá konstrukce, invarianty). To je přesně defekt S-1, který měl tento iter opravit.
Navíc `loadAllCatalogs()` se v `main.js` **nikde nevolá** (grep potvrdil: jediný consumer `loadAllCatalogs` je definice v catalogs.js, žádný call). Důsledky v běhu:
- `getCatalog('jobs')`/`('houseTypes')` v systémech nemá data → produkce jídla mrtvá, `populationMigration` jede throw/catch fallback (prázdné houseTypes) každý krok.
- Reálný boot běží na ~8000 ns/krok cestě (ne ~470 ns), kterou tester měřil jen v opraveném benchi — produkční app katalogy nemá.
**Oprava**: implementovat boot sekvenci dle design §1.3(d): `loadAllCatalogs(...)` (s error screen kind:'catalog') → `buildCatalogHandle()` → `loadGame(SLOT_ID, catalog)`.

### B-2 (BLOCKER) — catch-up smyčka není napojena: offline progres se v appce NEDOPOČÍTÁ
`runCatchupBatch`/`catchupStepCount` existují a jsou otestované v izolaci, ale `main.js` je **nikde nevolá** (grep: jediný consumer je `core/engine/index.js` re-export + test). `main.js` po loadu nepočítá `missedMs`, nevolá catch-up, rovnou `loop.start()`. **Acceptance "osada žije offline – progres se dopočítá po návratu" tedy v reálné aplikaci NENÍ splněno.** Jádro DoD M2 chybí na úrovni integrace.
**Oprava**: dle design §2.4 — po mountUI, před loop.start(): spočítat `missedMs = Date.now() - lastSimTimestamp`, `runCatchup(...)` s cap/chunk/yield, zobrazit summary.

### B-3 (BLOCKER) — autosave koordinátor + triggery nenapojeny
`createAutosave` existuje, ale `main.js:108` stále volá raw `saveGame(state)` přímo v `onHide` (žádný throttle, žádný 'hide' bypass, žádný periodický/event trigger). DoD M2 "autosave pokrývá mobilní swipe away" je naplněno jen částečně (jen onHide best-effort), ostatní 3 triggery (periodicky, settlementLevel↑, konec catch-upu) chybí. `lastSimTimestamp` se navíc bez napojení catch-upu posune i při nedokončené dávce — viz design §3.2 (autosave po catch-upu jen při kompletním doběhnutí), což zde nelze dodržet, protože catch-up není napojen.
**Oprava**: napojit `createAutosave` v main.js a routovat onHide→requestSave('hide'), periodicky, event.

### B-4 (BLOCKER) — export/import savu není dostupné z UI
`exportToString`/`importFromString` (exportString.js) + `OfflineSummary`/`CatchupProgress` komponenty existují, ale **nejsou importovány v `App.js` ani `main.js`** (grep potvrdil: reference jen uvnitř vlastních souborů). DoD M2 "export/import funguje" = z pohledu uživatele nedostupné (žádné tlačítko). Jde o dead code dokud se nenapojí UI.
**Oprava**: dle design §6.4 přidat Export/Import akce do App.js (copy/paste + reload), wire OfflineSummary/CatchupProgress overlay.

---

## NÁLEZ: per-step getCatalog('houseTypes') v populationMigration — **SUGGESTION (ne blocker)**

`src/core/systems/population.js:41-48` `getHouseTypesCatalog()` volá `getCatalog('houseTypes')` v try/catch KAŽDÝ krok.

**Analýza nákladu** (potvrzeno čtením `catalog/loader.js:48-52`):
- **S načtenými katalogy** (produkční cesta, jak MÁ být po B-1): `getCatalog` = `_store[name]` + truthiness check + return. Jednotky ns, žádný throw. Tester naměřil ~470 ns/krok celkem (catch-up 8h ≈ 270 ms << 5760 ms strop). **Plně akceptovatelné.**
- **Bez katalogů**: throw + catch každý krok ≈ ~3000–8000 ns/krok. Toto je drahé, ALE je to symptom B-1, ne příčina v population.js. Jakmile se B-1 opraví (katalogy načtené při bootu), throw path zmizí.

**Klasifikace: SUGGESTION.** Pattern `getCatalog + try/catch` jako control-flow je výkonnostně OK na produkční cestě a determinismus G1 neporušuje (data jsou neměnná během dávky). Try/catch jako fallback na "katalog nenačten" je ale **maskování chyby** — v korektně bootnuté hře katalog VŽDY existuje; tichý fallback na `[]` skryje regresi (migrace se tváří, že běží, ale s nulovou attractiveness). Doporučení (po opravě blockerů, ne nutné pro gate):
1. **Preferováno**: zvednout houseTypes jednou na začátku dávky/kroku mimo hot-path — buď cache referencí v ctx při bootu, nebo číst přes `params`/`ctx` (systémy už `_ctx` dostávají). Odpadne per-step lookup i try/catch.
2. Minimum: nahradit try/catch za `hasCatalog('houseTypes') ? ... : []` (loader.js:59 už `hasCatalog` má) — vyhne se throw i v degradovaném stavu a je čitelnější než catch-jako-flow.

Není to gate blocker: na správně bootnuté cestě je cena zanedbatelná a chování korektní.

---

## DALŠÍ NÁLEZY (SUGGESTION / NITPICK)

- **S-5 (SUGGESTION)** — `src/app/catalogs.js:35-38`: volá `loadCatalog(name, data)` PŘED `assertCatalogValid(name, data)`. Design §1.3(c) i fail-fast princip (K15) chtějí validovat PŘED loadem. Nevalidní katalog se takto nejdřív zapíše do `_store` a teprve pak hodí — store zůstane "špinavý". Navíc **chybí `buildById()`** po loadu (design §1.3c: K10 kolize ID při bootu). Prohodit pořadí a doplnit buildById.

- **S-6 (SUGGESTION)** — `src/save/exportString.js`: implementace exportuje **holý `applyPersist(state)`**, ne envelope `{saveVersion, gameVersion, lastSimTimestamp, payload}` dle design §6.3. Důsledky: (1) `lastSimTimestamp` se v export stringu NEPŘENÁŠÍ → po importu se offline čas počítá od `Date.now()` (import = "čerstvý" save), ztráta informace o stáří savu; (2) verze se opírá jen o `loadAndReconstruct` wrap s aktuální `SAVE_VERSION` → import staršího exportu by neprošel migrací podle uložené verze (verze se dosadí aktuální). Round-trip testy projdou (same-version), ale cross-version a lastSimTimestamp parita s design chybí. Klasifikováno jako suggestion, ne blocker — export/import stejně není v UI (B-4); při napojení sjednotit na envelope.

- **S-7 (SUGGESTION)** — `balance.json` `offline` má jen `capTechRealHours: 8`; chybí `capRealHours`, `chunkSteps`, `progressThresholdSteps` (design §2.3). `runCatchup` (až bude napojen) je čte. Doplnit s `provenance: approximated`.

- **N-1 (NITPICK)** — `createAutosave` default `minIntervalMs = 30_000`; design §5.2 uvádí default 60_000. Bez dopadu (volá se s explicitní hodnotou), ale konzistence s designem.

- **Pozitiva**: `catchup.js` je čistý core (žádný Date.now/DOM, missedMs jako param) — invariant "catch-up = týž kód jako live" (`step`) dodržen, G1 chunked==batch==live je reálně otestován (catchup.test.js). `saveStore.saveGame` přes `applyPersist` allowlist je správně (frameBudget vynechán). assertSerializable zůstává před applyPersist. Tyto části jsou GO-ready — problém je výhradně **integrace v main.js**.

---

## Proč zelené CI nestačí
`npm run ci` je zelené (ověřeno), ale pokrytí míří na izolované funkce (catchupStepCount, runCatchupBatch, createAutosave, buildOfflineSummary, applyPersist round-trip). **Žádný test neexercituje `main.js` / boot integraci** (grep: 0 testů na main.js/loadAllCatalogs-jako-boot/runCatchup-integraci). Proto 4 integrační blockery projdou bez povšimnutí. Test report tvrdí "main.js bootstrap … catch-up", což kód nepotvrzuje — testreport/impl note jsou v tomto bodě nepřesné.

## Doporučení pro re-run (coder)
1. **main.js** (priorita): napoj boot sekvenci dle design §1.3(d)/§2.4/§5.3/§6.4 — `loadAllCatalogs`→error screen, `loadGame(slot, catalog)`, `runCatchup`, `createAutosave`, export/import + summary UI. To řeší B-1..B-4 najednou.
2. catalogs.js: validate→load pořadí + `buildById()` (S-5).
3. exportString.js: envelope dle §6.3 (S-6); balance.offline doplnit (S-7).
4. **Přidat integrační test boot cesty** (jmock document/fetch) — aby gate příště zachytil chybějící wiring.
5. population.js getCatalog: po napojení katalogů volitelně přesun mimo hot-path / `hasCatalog` místo try/catch (SUGGESTION, ne blocker).

Po opravě B-1..B-4 znovu dispatch coder → tester (přidat boot integraci) → reviewer re-gate.
