# Impl note: iter-008 T-002 (RE-RUN 1 – M2b integration wiring)

## Co bylo opraveno (B-1..B-4)

### B-1: Katalogy napojen v main.js (loadAllCatalogs → loadGame(SLOT_ID, catalog))
- `src/app/main.js`: extrahována funkce `bootSequence(env)` s injektovanými deps (no DOM).
- Boot sekvence: `env.loadCatalogs()` (= loadAllCatalogs) → error screen při selhání → `env.loadGame(SLOT_ID, {})` s katalogem → jde cestou `loadAndReconstruct` (7-step pipeline, migrace, invarianty).
- Dříve: `loadGame(SLOT_ID)` bez katalogu → obcházel `loadAndReconstruct`.

### B-2: Catch-up smyčka napojena po loadu
- Po loadu: `missedMs = now() - lastSimTimestamp`, `catchupStepCount(missedMs, CATCHUP_CAP_MS)`.
- `runCatchupBatch(...)` s `onChunk` → aktualizuje `catchupProgress`, volá `requestRender()`.
- Po doběhnutí: `buildOfflineSummary(...)` → `offlineSummary` → dostupné v UI.
- Autosave po kompletním catch-upu (`!result.interrupted`): `autosave.requestSave('event')`.

### B-3: createAutosave napojen (3 triggery)
- `createAutosave({ doSave: async () => env.saveGame(state), minIntervalMs: 60_000 })`.
- Periodic: `env.setInterval(60_000, () => autosave.requestSave('periodic'))`.
- Hide bypass: `attachLifecycle({ onHide: () => autosave.requestSave('hide') })` – obchází throttle.
- Odstraněn raw `saveGame(state)` v `onHide`.
- Default autosave interval: 60 s (dle design §5.2 / N-1).

### B-4: Export/import + OfflineSummary/CatchupProgress napojeny do UI
- `render.js`: přidána podpora `getExtraProps?: () => object` → předává extra props do `App`.
- `bootSequence` předává `mountUI` deps s `getExtraProps: () => ({ offlineSummary, catchupProgress, onDismissOfflineSummary, onExport, onImport })`.
- `onExport`: `exportToString(state, { lastSimTimestamp: now() })` (S-6 envelope s časovým razítkem).
- `onImport`: `importFromString(str, {})` → `Object.assign(state, result.state)` + aktualizace `lastSimTimestamp`.
- `App.js` bylo již korektně wired pro tyto props (B-4 fix v App.js byl z předchozí iterace).

## Doplněno (S-5..S-7)
- S-5: `catalogs.js` validuje PŘED loadem (assertCatalogValid → loadCatalog → buildById) – bylo již opraveno.
- S-6: `exportString.js` exportuje envelope `{saveVersion, gameVersion, lastSimTimestamp, payload}` – bylo již hotové; opraveny testy `export-string.test.js` ať používají `{ state, lastSimTimestamp }` z importFromString.
- S-7: `balance.json offline` doplněno o `capRealHours`, `chunkSteps`, `progressThresholdSteps` (provenance: approximated).
- N-1: `createAutosave` default `minIntervalMs = 60_000` (design §5.2).

## Integrační test (povinný)
- `test/boot-integration.test.js`: 12 testů, 5 suitů.
- Testuje `bootSequence(env)` s fake env (no DOM, no real IDB).
- B-1: call order (loadCatalogs < loadGame), catalog arg non-undefined, catalog error → null.
- B-2: catch-up běží při missedMs>0, offlineSummary set, fresh game → null summary.
- B-3: autosave vrácen, hide event → save, setInterval → save.
- B-4: getExtraProps injektován do mountUI, onExport volá exportToString.
- Full path: katalogy→save s lastSimTimestamp→catch-up→autosave→summary (jeden test ověří vše najednou).
- Test SELŽE, pokud chybí jakékoliv wiring (verified – odstranil jsem každý wiring a test správně failoval).

## CI výsledky
- `tsc --noEmit`: 0 errors
- `lint:core`: OK (33 souborů)
- `node --test`: **541/541 PASS** (bylo 529/529 + 12 nových integračních testů)
- Předchozí 7 failing testů (export-string.test.js) opraveny aktualizací na nové API importFromString.

## Architekturální poznámky
- `bootSequence(env)` je čistá funkce testovatelná bez DOM – všechny browser deps injektovány (`raf`, `cancelRaf`, `setInterval`, `lifecycleTarget`, `showError`, `mountUI`, `loadCatalogs`, `loadGame`, `saveGame`, `exportToString`, `importFromString`).
- `boot()` = browser entrypoint = wraps `bootSequence(env)` se skutečnými browser APIs.
- Auto-start `boot()` chráněn podmínkou `if (typeof document !== 'undefined')` → nespouští se v Node testech.
- Catch-up = týž `step()` kód jako live loop (G1 invariant zachován).
