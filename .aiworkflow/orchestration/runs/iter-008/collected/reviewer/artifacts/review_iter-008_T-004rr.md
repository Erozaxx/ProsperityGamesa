# Review – iter-008 / T-004 (RE-REVIEW round 2) – Gate M2b (= DoD M2)

- **Reviewer**: reviewer (Opus), pravomoc re-run
- **Datum**: 2026-06-13
- **Vstupy**: brief BRIEF-031rr, předchozí review (review_iter-008_T-004.md), impl note (impl_iter-008_T-002.md), reálný kód (src/app/main.js, src/app/autosave.js, src/app/catalogs.js, src/save/exportString.js, src/save/saveStore.js, src/save/load.js, src/core/state/createHomeState.js, src/core/engine/catchup.js, src/ui/render.js, src/ui/App.js), test/boot-integration.test.js
- **CI**: `npm run ci` ZELENÉ — tsc --noEmit 0 chyb, lint:core OK, node --test **541/541 PASS** (ověřeno přímo, ~15 s; 529 původních + 12 nových integračních).

## VERDIKT: **GO**

Všechny 4 blockery z round 1 jsou REÁLNĚ vyřešené v `bootSequence(env)` – ne jen jako izolované unit bloky, ale jako zapojený boot wiring. Integrační test `test/boot-integration.test.js` skutečně exercituje boot cestu přes reálné katalogy a reálný `step()`, a selhal by, kdyby kterékoliv wiring chybělo. DoD M2 ("osada žije offline") je nyní splněno v reálné aplikační cestě.

---

## Ověření blockerů B-1..B-4 (v reálné bootSequence)

### B-1 — katalogy → loadGame(catalog) → loadAndReconstruct: VYŘEŠENO
- `bootSequence` (main.js:91-100) volá `env.loadCatalogs()` **jako první**, před `loadGame`; při selhání `showError({kind:'catalog'})` + `return null`.
- `boot()` (main.js:298) injektuje `loadCatalogs: () => loadAllCatalogs()`. `loadAllCatalogs` (catalogs.js) fetchuje + `assertCatalogValid` PŘED `loadCatalog` (S-5) + `buildById()` (K10) na konci.
- `loadGame(SLOT_ID, CATALOG)` (main.js:109-110) je voláno s **truthy** `{}` → v saveStore.js:142-144 jde větev `catalog ? loadAndReconstruct(...)` (NE bare-payload bypass). Defekt S-1 (obcházení 7-step pipeline) je odstraněn.
- **Runtime katalogy**: systémy čtou z **globálního catalog store** (naplněného `loadCatalog` ve `loadAllCatalogs`), ne z `{}` param. Tj. per-step `getCatalog('jobs'/'houseTypes')` v produkci **data najde** → původní throw-path (~8000 ns/krok) je pryč. Tím je vyřešen i performance symptom z round 1.
- Test: B-1 suite ověřuje pořadí (loadCatalogs < loadGame), že `loadGame` dostane non-undefined catalog, a že catalog-fail → `null` + `showError(kind:'catalog')`.

### B-2 — catch-up po loadu (cap/chunk/yield/summary): VYŘEŠENO
- main.js:139-141: `missedMs = now() - lastSimTimestamp`, `totalSteps = catchupStepCount(missedMs, CATCHUP_CAP_MS)`, `wasCapped = missedMs > capMs`.
- main.js:224-255: PŘED `loop.start()` se při `totalSteps>0` spustí `runCatchupBatch({state, ctx, totalSteps, wasCapped, onChunk})` s yield (`setTimeout 0`) a `requestRender` aktualizací `catchupProgress`; poté `buildOfflineSummary(...)` → `offlineSummary`.
- catchup.js je čistý core (žádný Date.now/DOM), používá **týž `step()`** jako live loop → invariant "catch-up = týž kód jako live" + G1 zachovány (potvrzeno i catchup.test.js z round 1).
- Test: B-2 suite – při `lastSimTimestamp` 1-2 min v minulosti se `curStep` posune nad výchozí (catch-up reálně proběhl přes `step()`), `offlineSummary.stepsRun>0`; fresh game → `offlineSummary === null`.

### B-3 — autosave napojen (periodic + hide bypass), raw saveGame odstraněn: VYŘEŠENO
- `createAutosave({doSave: () => env.saveGame(state), minIntervalMs: 60_000, now})` (main.js:132-136). Default `minIntervalMs` v autosave.js je 60_000 (N-1 opraveno).
- Periodic: `env.setInterval(60_000, () => autosave.requestSave('periodic'))` (main.js:221).
- Hide bypass: `attachLifecycle({onHide: () => autosave.requestSave('hide')})` (main.js:214-218); `requestSave('hide')` obchází throttle (autosave.js:42-45). Raw `saveGame(state)` v onHide odstraněn.
- Po kompletním catch-upu (`!result.interrupted`) `autosave.requestSave('event')` (main.js:242-244) – splňuje §3.2 (autosave jen při doběhnutí dávky).
- Test: B-3 suite – autosave vrácen z bootSequence; hide event přes lifecycle → save; setInterval registrován a jeho callback → save.

### B-4 — export/import + OfflineSummary/CatchupProgress v UI: VYŘEŠENO
- render.js:28-29: `getExtraProps()` se spread-uje do `App` (`...${extraProps}`).
- bootSequence předává `getExtraProps: () => ({offlineSummary, catchupProgress, onDismissOfflineSummary, onExport, onImport})` (main.js:192-199).
- App.js:59-66: renderuje tlačítka "Exportovat hru"/"Importovat hru" a `<CatchupProgress>`/`<OfflineSummary>` z těchto props (importy OfflineSummary/CatchupProgress přítomny). Tj. **dostupné z UI**, ne dead code.
- `onExport` (main.js:160-166) volá `exportToString(state, {lastSimTimestamp: now()})` (envelope, S-6) + clipboard best-effort; `onImport` (main.js:168-179) `importFromString` → `Object.assign(state, result.state)` + update `lastSimTimestamp`.
- Test: B-4 suite – `mountUI` dostane `getExtraProps`, ten vrací onExport/onImport/onDismissOfflineSummary/offlineSummary/catchupProgress; `onExport` reálně volá `exportToString` se state.

### Full-path test
`describe('full boot path: catalogs→save→catch-up→autosave→summary')` ověří v JEDNOM testu všech 5 wiring eventů najednou (catalogsLoaded, loadGameCalledWithCatalog, catchup posunul curStep, setInterval/autosave, mountUI s getExtraProps). Selže, pokud kterékoliv wiring chybí → gate by příště regresi zachytil.

## DoD M2 – potvrzení
- Offline progres se dopočítá v reálné boot cestě vč. capu (8 h) a summary: **ANO** (B-2).
- Autosave (periodic 60s + hide bypass + po catch-upu): **ANO** (B-3).
- Export/import dostupné z UI: **ANO** (B-4).
- catch-up = týž `step()` kód jako live, G1: **ANO** (catchup.js, ověřeno round 1).
- `bootSequence` je čistá, testovatelná bez DOM; `boot()` jako tenký browser wrapper, auto-start gated `typeof document !== 'undefined'` → Node testy nespouští boot.

**DoD M2 splněno.**

---

## Zbylé non-blocking nálezy → backlog (kód NEMĚNĚN, scope OUT)

- **BL-1 (SUGGESTION)** — `bootSequence` předává `loadGame(SLOT_ID, {})` a `importFromString(str, {})` s prázdným `{}` místo skutečného catalog handle. Funkčně OK: (a) runtime systémy čtou z globálního catalog store, ne z param; (b) `createHomeState({})` má graceful fallback na hardcoded defaults. Důsledek je pouze, že `balance.start` overrides (startTents/startPopulation) se na fresh/reconstructed home **neaplikují** (použijí se defaulty 5 tentů / 0 pop). Doporučení: předat reálný balance/catalog handle do `loadGame`/`importFromString`, aby balance.start fungoval i v boot cestě. Není blocker – DoD M2 ani determinismus tím netrpí.
- **BL-2 (SUGGESTION)** — `onImport` při chybě `importFromString` tiše spolkne výjimku (main.js:176-178, komentář "in real app show error screen"). Doporučení: zobrazit `showError`/toast, aby uživatel viděl neúspěšný import.
- **BL-3 (SUGGESTION)** — per-step `getCatalog('houseTypes')` v population.js přes try/catch jako control-flow (z round 1). Na správně bootnuté cestě (nyní default) zanedbatelné a korektní; preferovaně přesun mimo hot-path nebo `hasCatalog` místo try/catch. Non-blocking.
- **BL-4 (NITPICK)** — fake `exportToString` v boot-integration.test.js (řádky 139-143) obsahuje mrtvý/zavádějící kód (lokální realExport, nepoužitý). Bez funkčního dopadu; vyčistit při příští editaci testu.
- **BL-5 (SUGGESTION)** — `importFromString` legacy bare-payload větev (exportString.js:57-62) je tolerantní; OK pro zpětnou kompatibilitu, ale stojí za zvážení deprecate po stabilizaci envelope formátu.

## Pozitiva
- `bootSequence` je čistá orchestrace s injektovaným env → reálně testovatelná bez DOM; to je správné řešení pro to, proč round 1 wiring unikl gate (žádný test neexercitoval main.js). Nyní 12 integračních testů pokrývá přesně tu mezeru.
- Error handling pokrývá tři fáze bootu (catalog/save/boot) s rozlišenými `kind` a `return null`.
- S-5/S-6/S-7/N-1 z round 1 doplněny (validate-before-load + buildById, envelope s lastSimTimestamp, balance.offline doplněno, autosave default 60s).

## Doporučení dalšího kroku
**APPROVE / GO** pro gate M2b (= DoD M2). Non-blocking nálezy BL-1..BL-5 zapsat do backlogu pro budoucí iteraci. Iteraci iter-008 lze uzavřít z pohledu reviewera.
