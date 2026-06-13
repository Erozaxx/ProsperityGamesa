# Detailní návrh (spec pro Sonnet) – iter-008 / T-001 – M2b (offline catch-up)

- **Task**: T-001, iter-008 (BRIEF-028, M2b)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Typ**: DETAILNÍ IMPLEMENTAČNÍ SPEC pro coder (Sonnet). **Žádný produkční kód, žádná změna architektury.**
- **Vstupy (reálné)**: architektura iter-002 §4.1/§4.3/§6/§6.2/§6.5/§9.2 (D3/D6/D10); review_iter-007_T-004 (S-1 HIGH); reálný kód `src/save/{saveStore,load,persistSchema,migrations,schema,idb}.js`, `src/app/{main,loop,lifecycle,persist,env}.js`, `src/core/engine/{clock,index,tickOrder,rng}.js`, `src/core/catalog/{loader,validate,index}.js`, `src/core/state/{createHomeState,createInitialState}.js`, `src/ui/{App,render,ErrorScreen}.js`, `src/core/commands/dispatch.js`, `test/*`.

---

## 0. Shrnutí scope a vodítka pro coder

M2b uzavírá M2 = **offline progres** (acceptance criteria zadání: spolehlivý save/restore + offline výpočet). Implementuje 6 dílčích úkolů:

| # | Úkol | Soubory (hlavní) | Charakter |
|---|------|------------------|-----------|
| **S-1** | persist napojení: `saveGame`→`applyPersist`, bootstrap katalogů, `loadGame` přes `loadAndReconstruct`, error screen | `saveStore.js`, `main.js`, nový `app/catalogs.js`, `createHomeState.js` | glue + drobné |
| **T1** | catch-up smyčka end-to-end (load→missedMs→chunky→cap→dohnání) | nový `core/engine/catchup.js`, `main.js` | čisté core + app glue |
| **T2** | přerušitelnost dávky (`stopPending`) | `catchup.js`, `clock.js` (existující slot) | core |
| **T3** | offline summary UI (textový výčet) + progress UI nad prahem | nový `ui/OfflineSummary.js`, `ui/CatchupProgress.js`, `App.js`, `main.js` | UI |
| **T4** | autosave triggery komplet (periodicky / visibilitychange / pagehide / události) | nový `app/autosave.js`, `lifecycle.js`, `main.js`, `loop.js` | app glue |
| **T5** | export/import savu jako string (JSON→komprese→base64) | nový `save/exportString.js`, `vendor/lzstring.standalone.js`, UI tlačítka | save + UI |

**Klíčové invarianty (NEPORUŠIT):**
1. **Core bez DOM a bez reálného času.** `nowMs` se do core injektuje z app (jako `advance()` už dělá). Catch-up je core funkce, dostane `missedMs` jako parametr – nikdy nečte `Date.now()`/`performance.now()`.
2. **Catch-up = TÝŽ kód jako live** (`step(state, ctx)` z `clock.js`). Žádná druhá implementace simulace. To je důvod, proč `catchup-invariant.test.js` (S-05) prochází a proč determinismus G1 platí i offline.
3. **Catch-up dohání POUZE systémy M2** (populace/bydlení/jídlo/zdraví/krimi + stuby world/battle). To je automatické: catch-up volá `step()`, který běží `runTick()`, který spouští jen registrované systémy z `registerCorePeriodics()`. Nová systémová logika M3+ se přidá tím, že se zaregistruje do `tickOrder` – catch-up ji pak dohání zadarmo, **pokud je catch-up-safe** (§7 zde, invariant S-05). Žádný catch-up kód se kvůli novému systému M3+ nemění.
4. **Determinismus G1**: stejný save + stejný `missedMs` → stejný výsledný stav (`hashState` shoda). Chunkování NESMÍ změnit výsledek: dávka N kroků rozdělená na chunky musí dát identický stav jako jedna dávka N kroků (to už `catchup-invariant.test.js` ověřuje pro souvislou dávku; T1 přidá test "chunked == single batch").

---

## 1. S-1 (PRVNÍ) – napojení persist pipeline na reálnou save/load cestu

### 1.1 Problém (z review S-1, ověřeno v kódu)
- `saveStore.js:103` ukládá `payload: structuredClone(state)` = CELÝ stav vč. derivátů a `engine.frameBudget`; nevolá `applyPersist`.
- `main.js:62` volá `loadGame(SLOT_ID)` **bez katalogu** → `loadGame` (saveStore.js:142) vrací `rec.payload` přímo, obchází `loadAndReconstruct` (žádná migrace/čistá konstrukce/invarianty).
- `main.js` nikde nevolá `loadCatalog(...)` → v běhu `getCatalog('jobs')` v `jobsProduction` vyhodí → prázdné joby (žádná produkce jídla), `resourceKindOf` fallback.
- `createInitialState` volá `createHomeState()` přímo a ignoruje `BALANCE.start` (review S-2) → startovní balanc nikde nežije.

### 1.2 Cíl
Reálný tok: **bootstrap katalogů (validace) → loadGame(slot, catalog) → loadAndReconstruct (7 kroků) → běh**; save přes `applyPersist` allowlist; error screen při selhání katalogů nebo savu.

### 1.3 Změny

#### (a) `src/save/saveStore.js` – ukládat allowlist
- Import: `import { applyPersist } from './persistSchema.js';`
- V `saveGame` (řádek 103) nahradit `payload: structuredClone(state)` za `payload: applyPersist(state)`.
- `assertSerializable(state)` ponechat PŘED `applyPersist` (kontrola celého stavu na fce/cykly je správně fail-fast; payload z applyPersist je podmnožina).
- **Pozn.**: `applyPersist` vrací nový objekt (čte ze `state`), takže odpadá `structuredClone` – ale ponech defensivně `structuredClone(applyPersist(state))` NENÍ nutné, applyPersist kopíruje top-level pole referencí; IndexedDB `put` provede strukturální klon při zápisu. Coder ověří, že `assertSerializable` (a tedy IDB) projde i nad payloadem (`log` ring buffer, `catalogState`, `rng` jsou plain data).

#### (b) `src/save/saveStore.js` – `loadGame` vždy přes pipeline když je katalog
- Signatura zůstává: `loadGame(slotId = SLOT_ID, catalog)`. Beze změny logiky (řádek 142 už má větev `catalog ? loadAndReconstruct(rec.payload, catalog) : rec.payload`).
- **Změna v `main.js`**: vždy předat `catalog` (viz níže), takže produkční load JDE přes `loadAndReconstruct`. Větev `: rec.payload` zůstává jen pro testy/diagnostiku.

#### (c) Nový `src/app/catalogs.js` – načtení + validace katalogů (app vrstva)
App vrstva je jediné místo, kde se data fyzicky natahují (core dostává data injektovaná přes `loadCatalog`). V prohlížeči se JSON natáhne `fetch`em (no-build, statické soubory); v Node testech se natáhne `readFileSync` (jako dělá `catchup-invariant.test.js`). Spec:

```js
// src/app/catalogs.js
import { loadCatalog, assertCatalogValid, buildById } from '../core/catalog/index.js';

/** Katalogy, které app natahuje při bootu (musí pokrýt to, co M2 systémy čtou). */
export const REQUIRED_CATALOGS = [
  'resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population',
  'buildings', 'goods', 'companies', 'sectors', 'techs', 'zones', 'skills', 'balance',
];
// MIN set pro běh M2 systémů = ['resources','food','houseTypes','jobs','military','achievements','population'].
// Zbytek je dostupný pro byId/budoucí systémy; coder smí REQUIRED zúžit, pokud validace zbytku selže
// na chybějícím schématu – ale pak to MUSÍ zapsat jako gap, ne tiše vynechat.

/**
 * Natáhne a zvaliduje všechny katalogy. Při chybě vyhodí (boot → error screen kind:'catalog').
 * @param {(name: string) => Promise<object>} fetchJson - injektovaný loader (fetch v browseru, fs v testu)
 * @returns {Promise<void>}
 */
export async function loadAllCatalogs(fetchJson) {
  for (const name of REQUIRED_CATALOGS) {
    const data = await fetchJson(name);          // throw → propaguje se
    assertCatalogValid(name, data);              // throw na první chybě schématu (fail-fast K15)
    loadCatalog(name, data);
  }
  buildById();                                   // K10 kolize ID napříč typy = throw při bootu
}

/** Browser fetch loader. */
export function browserFetchJson(base = 'src/data') {
  return async (name) => {
    const res = await fetch(`${base}/${name}.json`);
    if (!res.ok) throw new Error(`catalog: fetch ${name} → HTTP ${res.status}`);
    return res.json();
  };
}
```

**Pozn. k validaci**: `assertCatalogValid` (catalog/validate.js) hází jen pro katalogy, které mají schéma v `SCHEMAS`. Pokud některý z `REQUIRED_CATALOGS` schéma nemá, `validateCatalog` vrátí chybu `no schema registered`. Coder ověří, které katalogy mají schéma (čte `core/catalog/schemas.js`), a u těch bez schématu buď schéma doplní (mimo scope – pak gap), nebo je z `REQUIRED_CATALOGS` vyřadí s poznámkou. **Nesmí** validaci tiše obejít.

#### (d) `src/app/main.js` – bootstrap sekvence
Cílový tvar `boot()` (zachovává existující strukturu kroků 1–10, vkládá katalogy a catch-up):

```
boot():
  root = #app
  1. requestPersistentStorage()              // beze změny
  2. await registerServiceWorker()            // beze změny
  3. NOVÉ: try { await loadAllCatalogs(browserFetchJson()) }
        catch e → showErrorScreen(root, {kind:'catalog', message:'Nepodařilo se načíst herní data.', error:e}); return;
  4. catalog = buildCatalogHandle()           // objekt předaný do loadAndReconstruct/createHomeState (viz 1.4)
  5. try {
        loaded = await loadGame(SLOT_ID, catalog)   // ZMĚNA: předat catalog → jde přes loadAndReconstruct
        state = loaded?.state ?? bootstrapNewState(DEFAULT_SEED, catalog)
        lastSimTimestamp = loaded?.record.lastSimTimestamp ?? null
     } catch e → showErrorScreen(root, {kind:'save', ..., onNewGame: () => boot()}); return;
  6. { ctx, creg } = bootstrapEngine()
  7. acc = createAccumulator(performance.now(), state.engine.frameBudget)
  8. send, mountUI, createGameLoop  (beze změny, ale viz T3/T4 pro napojení)
  9. NOVÉ (T1): pokud lastSimTimestamp != null:
        missedMs = Date.now() - lastSimTimestamp    // Date.now() je v APP vrstvě OK
        await runCatchup({ state, ctx, missedMs, ... })  // viz §2; po doběhnutí render summary (T3)
  10. attachAutosave(...)  (T4, nahrazuje samotný attachLifecycle)
  11. loop.start()
```

**Pořadí (důležité)**: catch-up běží PO mountUI (aby šel zobrazit progress/summary) ale PŘED `loop.start()` (živá smyčka nesmí konkurovat dávce). `bootstrapNewState` se rozšíří o `catalog` param a zavolá `createHomeState(catalog)` (viz 1.4 a S-2).

#### (e) `createHomeState` čte BALANCE.start (review S-2)
Mimo úzký scope, ALE S-1 vyžaduje funkční start (jinak prázdná osada → catch-up nemá co dohánět = nelze otestovat end-to-end). Spec:
- `createHomeState(catalog)` přečte `catalog.balance.start` (population/gold/food) a `createInitialState`/`bootstrapNewState` jej použije. Pokud `BALANCE.start` chybí, ponech současné approximated defaulty + zapiš gap.
- `createInitialState` ponech catalog-free (volá `createHomeState()` s prázdnem); skutečné naplnění start hodnot dělá bootstrap/load (`loadAndReconstruct` už volá `createHomeState(catalog)` na load.js:158). Coder sjednotí: factory bere `catalog` a čte `start`; `bootstrapNewState` ji předá.
- **Hranice**: pokud by sjednocení `createInitialState` znamenalo větší refaktor, coder smí omezit S-2 na "bootstrapNewState a loadAndReconstruct předávají catalog a aplikují BALANCE.start" a zbytek nechat jako gap pro M3. Hlavní cíl S-1 (funkční reálný tok) tím není ohrožen.

### 1.4 `catalog` handle – tvar
`loadAndReconstruct(payload, catalog)` a `createHomeState(catalog)` očekávají objekt. Reálné systémy ale čtou data přes modul-singleton `getCatalog(name)`/`byId(id)` (loader.js `_store`). Takže `catalog` předávaný do těchto funkcí je dnes prakticky **nepoužitý** (`createHomeState` má `_catalog` reserved). Spec:
- `buildCatalogHandle()` vrátí lehký objekt `{ balance: getCatalog('balance'), byId, get: getCatalog }`. Slouží jen pro `createHomeState` (čtení `balance.start`) a jako "katalog je načtený" signál pro `loadGame` (aby zvolila pipeline větev).
- Důležité je, že `loadAllCatalogs` proběhl PŘED tím (naplnil `_store`), takže systémy v `step()` mají data dostupná globálně. Catalog handle je tenký, ne kopie dat.

### 1.5 Jak ověří test
Rozšířit `test/app-persist.test.js` (dnes testuje jen `requestPersistentStorage`) NEBO nový `test/app-bootstrap.test.js`:
1. **save→load přes reálný `saveStore`**: natáhni katalogy (fs loader), `bootstrapNewState`, naběhni ~5 dní (`step` smyčka), `saveGame(state,{slotId,now})`, `loadGame(slotId, catalogHandle)`. Assert: `hashState(loaded.state)` == `hashState` stavu po re-konstrukci (round-trip přes allowlist + 7 kroků). Pozn.: hash se může lišit od původního stavu, pokud původní nesl deriváty mimo allowlist – test musí porovnávat stav PO `loadAndReconstruct(applyPersist(state))` se stavem `applyPersist→load` podruhé (idempotence pipeline), nebo porovnat jen allowlistovaná pole.
2. **payload je allowlist**: `applyPersist(state)` NEobsahuje `engine.frameBudget`, neobsahuje deriváty housing (capacity/workerSlots) – assert klíče (persist.test.js už to testuje na úrovni funkce; přidat ověření, že to teče i přes `saveStore`).
3. **catalog fail → throw**: `loadAllCatalogs` s loaderem, který vrátí nevalidní katalog → `assertCatalogValid` hodí → boot ukáže error screen kind:'catalog' (testuj `buildErrorModel({kind:'catalog'})` z ErrorScreen.js – pozn.: dnešní `buildErrorModel` přidává 'Nová hra' jen pro kind:'save'; pro 'catalog' nech jen retry – už tak je).
4. **loadGame bez katalogu (diagnostika)** stále vrací raw payload – ponech existující testy zelené.

---

## 2. T1 – Catch-up smyčka end-to-end (§4.1 režim 3, §9.2 D10)

### 2.1 Princip
Po loadu spočti zameškaný čas, ořízni capem, převeď na kroky a doháněj je v **chuncích** s **yieldem na UI** mezi chunky. Dohnání = volání `step(state, ctx)` (TÝŽ kód jako live), takže dohání jen registrované systémy M2.

### 2.2 Nový soubor `src/core/engine/catchup.js`
Core (bez DOM, bez reálného času). `missedMs` přichází jako parametr z app.

```js
/**
 * Catch-up: dohnání zameškaného offline času dávkou kroků v chuncích.
 * Core – žádný Date.now/performance.now; missedMs injektuje app.
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */
import { step, STEP_MS } from './clock.js';

/** Velikost chunku (kroků mezi yieldy) – ladí UI plynulost vs. overhead. */
export const CATCHUP_CHUNK_STEPS = 25_000;          // §4.1 "~25k kroků"
/** Práh (kroků), nad kterým se ukazuje progress UI. */
export const CATCHUP_PROGRESS_THRESHOLD_STEPS = 5_000;  // ~0.4 herního dne; balance konstanta (default)

/**
 * Spočítá počet kroků k dohnání po aplikaci capu.
 * @param {number} missedMs            - zameškaný reálný čas (z app)
 * @param {number} capRealMs           - min(technický, balanční) cap v ms (z balance dat)
 * @returns {number} kroků (>= 0)
 */
export function catchupStepCount(missedMs, capRealMs) {
  const clamped = Math.max(0, Math.min(missedMs, capRealMs));
  return Math.floor(clamped / STEP_MS);
}

/**
 * @typedef {Object} CatchupResult
 * @property {number} stepsRun        - kolik kroků se skutečně dohnalo
 * @property {number} stepsRequested  - kolik se mělo dohnat (po capu)
 * @property {boolean} interrupted    - true pokud přerušeno stopPending (T2)
 * @property {boolean} capped         - true pokud missedMs > cap (čas se zahodil nad cap)
 */

/**
 * Dohnání kroků v chuncích. Mezi chunky volá onChunk (app yieldne na UI).
 * @param {Object} deps
 * @param {GameState} deps.state
 * @param {TickContext} deps.ctx
 * @param {number} deps.totalSteps                 - z catchupStepCount
 * @param {boolean} deps.wasCapped
 * @param {number} [deps.chunkSteps]               - default CATCHUP_CHUNK_STEPS
 * @param {(done: number, total: number) => Promise<void> | void} [deps.onChunk] - yield + progress
 * @returns {Promise<CatchupResult>}
 */
export async function runCatchupBatch(deps) {
  const { state, ctx, totalSteps, wasCapped } = deps;
  const chunkSteps = deps.chunkSteps ?? CATCHUP_CHUNK_STEPS;
  let done = 0;
  let interrupted = false;

  while (done < totalSteps) {
    const n = Math.min(chunkSteps, totalSteps - done);
    let i = 0;
    for (; i < n; i++) {
      step(state, ctx);
      if (state.engine.running === false) { interrupted = true; break; } // T2 stopPending
    }
    done += i;
    if (interrupted) break;
    if (deps.onChunk) await deps.onChunk(done, totalSteps);   // yield na UI mezi chunky
  }

  return { stepsRun: done, stepsRequested: totalSteps, interrupted, capped: wasCapped };
}
```

### 2.3 Cap – min(technický, balanční) (§9.2 D10)
Cap je **balance konstanta**, ne hardcode. V `src/data/balance.json` přidat (nebo ověřit existenci) sekci `offline`:
```json
"offline": { "capTechRealHours": 8, "capRealHours": 8, "progressThresholdSteps": 5000, "chunkSteps": 25000 }
```
- `capTechRealHours: 8` = technický strop (§9.2a) – 8 h = 576 000 kroků.
- `capRealHours: 8` = balanční hodnota (§9.2b), dočasně = technický strop; ladí M9.
- App spočítá `capRealMs = min(capTechRealHours, capRealHours) * 3_600_000` a předá do `catchupStepCount`.
- Konstanty se čtou z `balance` katalogu; pokud `offline` chybí, coder ji DOPLNÍ do `balance.json` s `provenance: "approximated"` poznámkou v `_meta` (a do gap-reportu). Architektura na hodnotách nezávisí.

### 2.4 Napojení v `main.js` (app yield + progress)
```
runCatchup({ state, ctx, missedMs, balance, ui }):
  capRealMs = min(balance.offline.capTechRealHours, balance.offline.capRealHours) * 3.6e6
  total = catchupStepCount(missedMs, capRealMs)
  wasCapped = missedMs > capRealMs
  if total === 0: return null               // nic k dohnání (krátká nepřítomnost)
  showProgress = total >= balance.offline.progressThresholdSteps
  if showProgress: ui.showCatchupProgress(0, total)     // T3
  result = await runCatchupBatch({
     state, ctx, totalSteps: total, wasCapped,
     chunkSteps: balance.offline.chunkSteps,
     onChunk: async (done, t) => {
        if (showProgress) ui.updateCatchupProgress(done, t)
        await yieldToUI()                    // viz níže
     },
  })
  if showProgress: ui.hideCatchupProgress()
  ui.showOfflineSummary(buildSummary(stateBefore, state, result))   // T3
  return result
```

**`yieldToUI()`** (app util) – uvolní hlavní vlákno mezi chunky, aby progress UI překreslil a stránka nezamrzla (constraint "dávka nesmí blokovat UI, yield"):
```js
const yieldToUI = () => new Promise(res =>
  (typeof requestAnimationFrame !== 'undefined'
     ? requestAnimationFrame(() => res())
     : setTimeout(res, 0)));
```

**`stateBefore`** pro summary: PŘED catch-upem si app uloží snapshot relevantních metrik (ne celý stav – jen čísla pro diff): `{ curStep, population.total, bornTotal, diedTotal, food total, gold, season }`. Levné, žádný `structuredClone` celého stavu.

### 2.5 Catch-up dohání POUZE systémy M2 – jak a rozšiřitelnost M3+
- **Jak**: `runCatchupBatch` volá `step(state, ctx)` → `runTick` → spustí jen periodics registrované v `registerCorePeriodics()` (tickOrder.js). Dnes to jsou populace/zdraví/krimi/jídlo/housing + stuby world/battle (no-op). Žádný "seznam systémů pro catch-up" neexistuje – je to automaticky množina živých systémů. **Tím je zaručeno, že catch-up dohání právě to, co live běh.**
- **Rozšiřitelnost M3+ (catch-up-safe invariant, S-05)**: nový systém (M3 produkce, M4 trh, ...) se přidá registrací do `registerCorePeriodics` + do `PERSIST_SCHEMA`. Catch-up ho začne dohánět **bez jakékoli změny `catchup.js`**. Podmínka: systém je *catch-up-safe* (§7). To je už vynucené `catchup-invariant.test.js` (každý nový systém přidá svůj live==batch test). `catchup.js` je tedy stabilní mechanismus napříč milníky.
- **Co M2b NEdělá**: auto-resolve bitev (M7), interaktivní eventy v catch-upu (pozastavení – mechanismus T2 existuje, ale obsahové eventy přijdou M8). V M2b stub `battle.tick`/`world.tick` jsou no-op → catch-up jimi proběhne triviálně.

### 2.6 Jak ověří test (`test/catchup.test.js`)
1. **catchupStepCount**: `(missedMs, capRealMs)` → správný počet; cap ořízne (missedMs > cap → cap/STEP_MS); záporné/0 → 0.
2. **Determinismus G1 / chunked == single batch (KLÍČOVÉ)**: dva identické stavy (stejný seed), jeden dohnat `runCatchupBatch` s `chunkSteps=25000`, druhý s `chunkSteps=totalSteps` (jeden chunk). `assert hashState(a) === hashState(b)`. Také proti `runBatch` z `catchup-invariant.test.js` na stejném N. → chunkování nemění výsledek.
3. **stepsRun == totalSteps** po doběhnutí (bez přerušení).
4. **cap**: `missedMs` = 100 h, cap 8 h → `stepsRequested == 576000`, `capped == true`.
5. **onChunk volán** (total/chunk)× (zaokrouhleno nahoru) – počet yieldů; injektovaný `onChunk` čítač.
6. **prázdný catch-up**: total 0 → `runCatchup` vrací null, žádný `step`.

---

## 3. T2 – Přerušitelnost dávky (stopPending, D10)

### 3.1 Princip
Interaktivní (engine-stopping) event uprostřed dávky → dávka se přeruší, **zbytek zameškaného času zůstane** a pokračuje po odkliknutí (§9.2). Mechanismus už existuje jako slot: `clock.js:77` `if (state.engine.running === false) break;` a `runCatchupBatch` jej replikuje.

### 3.2 Spec
- **Signál**: systém/handler nastaví `state.engine.running = false` (stopPending). V M2b žádný obsahový event to nedělá (eventy = M8), takže T2 je **mechanismus + test**, ne živá feature. To je v pořádku – architektura slot drží od začátku (D12).
- **`runCatchupBatch`** (§2.2) už `running === false` testuje uvnitř chunku i po něm → vrátí `interrupted: true`, `stepsRun < totalSteps`. **Zbytek = `totalSteps - stepsRun`** se NEZAHAZUJE: app si pamatuje `remainingSteps` a po `acknowledgeEvent` (resume) zavolá `runCatchupBatch` znovu s `totalSteps = remainingSteps` a `state.engine.running = true`.
- **Persistence zbytku přes reload**: zbytek je implicitně v `lastSimTimestamp` – pokud hráč zavře appku během přerušeného catch-upu, příští boot spočítá `missedMs` znovu od `lastSimTimestamp` (který se autosavem neposunul, protože catch-up neukončený autosave neprovedl). **Pravidlo**: autosave po catch-upu se provede až po `stepsRun == stepsRequested` (kompletní doběhnutí), ne při přerušení – jinak by se zbytek zahodil. Coder to zajistí: T4 "po významné události → autosave" se NEpouští při `interrupted`.
- **App stav resume**: app drží `pendingCatchup = { remainingSteps, wasCapped }`. UI ukáže event (M8) → `acknowledgeEvent` command → `state.engine.running = true` → app pokračuje `runCatchupBatch`.

### 3.3 Hranice M2b
Protože v M2b žádný systém `running=false` nenastaví, T2 dodá: (1) parametr/větev v `runCatchupBatch` (hotovo §2.2), (2) **app resume logiku** (pendingCatchup), (3) **test** s uměle vloženým stop. Plné napojení na obsahové eventy je M8.

### 3.4 Jak ověří test (`test/catchup.test.js`, sekce T2)
1. **Přerušení**: registruj do ctx fiktivní periodic/scheduled handler, který na N-tém kroku nastaví `state.engine.running = false`. Spusť `runCatchupBatch(totalSteps=10000)`. Assert: `interrupted == true`, `stepsRun == N` (kroku, kde se stoplo, vč. toho kroku), zbytek `10000 - N > 0`.
2. **Resume == souvislý běh (determinismus)**: stav A dohnán souvisle 10000 kroků; stav B dohnán 1× do přerušení na N, pak `running=true` + druhé volání na `10000 - N`. `assert hashState(A) === hashState(B)` → přerušení a pokračování nemění výsledek (zbytek se neztratil ani nezdvojil).

---

## 4. T3 – Offline summary UI + catch-up progress UI (§9.2)

### 4.1 Princip
- **Progress UI**: nad prahem (`progressThresholdSteps`) zobraz jednoduchý progress bar / text "Doháním offline progres… X %" během dávky. Pod prahem nic (catch-up je instant).
- **Summary UI**: po doběhnutí prostý **textový výčet** (produkce/změny, události, kolik času doběhlo). Žádná grafika (vědomě minimální, S-04).

### 4.2 `buildSummary` – čistý builder (testovatelný bez DOM)
Nový `src/ui/offlineSummary.js` (model) + `src/ui/OfflineSummary.js` (preact view). Model:
```js
/**
 * @param {object} before  - snapshot metrik před catch-upem (§2.4)
 * @param {GameState} after - stav po catch-upu
 * @param {CatchupResult} result
 * @returns {{ realTime: string, gameDays: number, lines: string[], capped: boolean, interrupted: boolean }}
 */
export function buildOfflineSummary(before, after, result) {
  const gameDays = (result.stepsRun) / 900;          // STEPS_PER_DAY
  const lines = [];
  const dPop = after.home.population.total - before.population;
  lines.push(`Obyvatel: ${before.population} → ${after.home.population.total} (${signed(dPop)})`);
  lines.push(`Narozeno: +${after.home.population.bornTotal - before.bornTotal}, zemřelo: -${after.home.population.diedTotal - before.diedTotal}`);
  lines.push(`Jídlo: ${before.food} → ${foodTotal(after)} (${signed(foodTotal(after)-before.food)})`);
  lines.push(`Zlato: ${before.gold} → ${after.player.gold} (${signed(after.player.gold-before.gold)})`);
  if (after.home.health.diseaseActive) lines.push(`Probíhá nemoc (${after.home.health.diseaseDaysLeft} dní)`);
  return {
    realTime: formatDuration(result.stepsRun * 50),   // STEP_MS
    gameDays: Math.floor(gameDays),
    lines,
    capped: result.capped,
    interrupted: result.interrupted,
  };
}
```
- `before` pochází z app snapshotu (§2.4). `signed(n)` = `n>=0?'+'+n:String(n)`. `formatDuration(ms)` = "X h Y min" (UI util).
- Pokud `capped`: přidej řádek "Část offline času nad limit (8 h) se nezapočítala."
- Pokud `interrupted`: summary se NEZOBRAZÍ (catch-up neskončil) – místo toho event UI (M8). V M2b interrupted nenastane obsahově.

### 4.3 View komponenty
- `OfflineSummary.js`: modal/panel renderující `lines` + tlačítko "Pokračovat" (zavře). Čte model z `buildOfflineSummary`, nemutuje stav. Po zavření → `loop.start()` pokračuje (nebo už běží, summary je překryv).
- `CatchupProgress.js`: jednoduchý bar `width: done/total*100%` + text procent. Aktualizuje se z `onChunk` (§2.4). Protože catch-up běží PŘED `loop.start()`, progress se kreslí přímo render voláním v `onChunk` (po `yieldToUI`), ne přes `requestRender` smyčku.
- **Integrace s `App.js`/`render.js`**: nejjednodušší – app drží malý UI-only stav `{ catchup: {active,done,total} | null, summary: model | null }` mimo `state` (UI stav se neukládá, §3.2). `mountUI` rozšířit o předání tohoto UI stavu nebo render summary/progress samostatným `render()` voláním do dedikovaného overlay elementu. Coder zvolí jednodušší: samostatný `render(html\`<${CatchupProgress} .../>\`, overlayRoot)` z `main.js` (overlay je mimo hlavní App strom) → nezasahuje do `App.js` smyčky.

### 4.4 Jak ověří test (`test/offline-summary.test.js`)
1. `buildOfflineSummary(before, after, result)` – čistý unit test bez DOM: ověř řádky (pop diff, food diff, gold diff), `gameDays = floor(stepsRun/900)`, `realTime` formát, `capped`/`interrupted` flagy.
2. Hranice: `stepsRun==0` → prázdné/triviální summary (ale §2.4 už pro total 0 summary nevolá).
3. Práh: `total < threshold` → progress se nezobrazí (testuj rozhodovací funkci `shouldShowProgress(total, threshold)`).
4. View komponenty: smoke render (jako `error-screen.test.js` testuje `buildErrorModel`) – testuj model builder, ne DOM.

---

## 5. T4 – Autosave triggery komplet (§6.2)

### 5.1 Cílový stav (§6.2 čtyři triggery)
1. **Periodicky**: každý herní den (900 kroků = 45 s reál při 1×) NEBO min. 60–120 s reálného času.
2. **`visibilitychange → hidden` / `pagehide`**: okamžitý save (už částečně v `lifecycle.js`).
3. **Po významných událostech**: konec bitvy, level města (settlementLevel↑), dokončený kontrakt/tech, návrat karavany. V M2b reálně: **settlementLevel↑** a **konec catch-upu** (ostatní eventy = M3+/M7).
4. Vždy se ukládá `lastSimTimestamp` (saveStore už ukládá `now` jako `lastSimTimestamp`).

### 5.2 Nový `src/app/autosave.js` – koordinátor
Drží debounce/throttle a jediný save call. App vrstva (smí `Date.now`).
```js
/**
 * @param {Object} deps
 * @param {() => Promise<unknown>} deps.doSave         - () => saveGame(state, {now: Date.now()})
 * @param {number} [deps.minIntervalMs]                - throttle, default 60_000
 * @param {() => number} [deps.now]                    - Date.now (injektovatelné pro test)
 * @returns {{ requestSave: (reason: string) => void, flush: () => Promise<void> }}
 */
export function createAutosave(deps) { /* throttle: ignoruj save, pokud od posledního < minIntervalMs,
   KROMĚ reason==='hide' (pagehide/hidden = vždy, i přes throttle) */ }
```
- `requestSave('periodic'|'event'|'hide')`: 'hide' obejde throttle (mobil swipe-away = poslední šance). 'periodic'/'event' respektují `minIntervalMs`.
- `flush()`: vynutí save (pro `pagehide`, kde nemusí být čas na async).

### 5.3 Napojení triggerů
- **(2) visibility/pagehide**: `attachLifecycle` (lifecycle.js) už existuje a volá `onHide`. V `main.js` `onHide: () => autosave.requestSave('hide')`. **Pozn.**: `pagehide` je sync-citlivý – `saveGame` je async (IndexedDB). Best-effort: zavolej save, neblokuj. (Spolehlivost na mobilu řeší rotující generace + periodický save; dokonalý sync save do IDB není garantovaný – akceptováno, R-F.)
- **(1) periodicky**: dvě cesty, coder zvolí jednu primární:
  - **(a) přes herní den**: v `loop.js` `frame()` po `advance`, pokud `dirty` a překročena denní hrana (`isNewDay`) → `onDayBoundary()` → `autosave.requestSave('periodic')`. Vyžaduje propagaci edge z `advance`/`runTick`. Jednodušší: app si pamatuje poslední uložený `curStep` a porovná `Math.floor(curStep/900)`.
  - **(b) reálný timer**: `setInterval(() => autosave.requestSave('periodic'), 90_000)`. Jednoduché, nezávislé na rychlosti. **Doporučeno (b)** pro M2b (méně invazivní do loop.js); throttle 60 s v autosave krytí dvojí spuštění.
- **(3) události**: po catch-upu (`runCatchup` doběhl kompletně, NE interrupted) → `requestSave('event')`. SettlementLevel↑: nejčistší přes observer transakční/doménové události; v M2b stačí app po každém renderu porovnat `settlementLevel` se zapamatovanou hodnotou a při změně `requestSave('event')`. (Plný event-driven observer = K5/K18, M8.)

### 5.4 `loop.js` minimální dotyk
Pokud coder zvolí periodický autosave přes herní den, `createGameLoop` rozšířit o volitelný `onDayBoundary` callback volaný z `frame()` při překročení denní hranice. Pokud zvolí reálný timer, `loop.js` se NEMĚNÍ (preferováno). Buď jedna, ne obě.

### 5.5 Jak ověří test (`test/autosave.test.js`)
1. **Throttle**: `createAutosave({doSave: spy, minIntervalMs:60000, now: fakeNow})`; dvě `requestSave('periodic')` v rozmezí < 60 s → `doSave` 1×; 'hide' → vždy projde (i v throttle okně).
2. **flush** vynutí save.
3. **lifecycle**: `attachLifecycle` s fake target → `visibilitychange`(hidden) a `pagehide` → `onHide` volán (existující `app-lifecycle.test.js` rozšířit, že volá autosave).
4. **periodic přes den** (pokud cesta a): překročení 900 kroků → 1 save; nepřekročení → 0.
5. **lastSimTimestamp**: save zapíše `now` (`Date.now` injektovaný) → `loadGame` vrátí stejný `lastSimTimestamp` (kryje vstup catch-upu).

---

## 6. T5 – Export/import savu jako string (§6.5, K12/K19)

### 6.1 Formát
`JSON → komprese → base64` (a zpět). Přenos savu mezi zařízeními bez serveru (jediný "online" pozůstatek nahrazený lokálně).

### 6.2 Komprese
- Vendoruj malou lz-string knihovnu jako ESM: `src/vendor/lzstring.standalone.js` (compressToBase64 / decompressFromBase64). Ručně vendorováno (jako preact), bez build kroku. Alternativně (pokud vendor problém) coder smí použít `compressToBase64` ekvivalent vlastní ~tenkou implementací, ale **lz-string je standard a malý** – doporučeno.
- **Důležité**: komprese je pro **export string** (přenositelnost/velikost při copy-paste), NE pro IndexedDB payload (ten zůstává plain, §6.5). Export/import je oddělená cesta od `saveStore`.

### 6.3 Nový `src/save/exportString.js`
```js
import { applyPersist } from './persistSchema.js';
import { loadAndReconstruct } from './load.js';
import { SAVE_VERSION } from './schema.js';
import { compressToBase64, decompressFromBase64 } from '../vendor/lzstring.standalone.js';

/**
 * Exportuje aktuální stav jako přenositelný string.
 * @param {GameState} state
 * @param {number} now - Date.now z app (lastSimTimestamp do obálky)
 * @returns {string} base64 komprimovaný JSON obálky
 */
export function exportSaveString(state, now) {
  const envelope = {
    saveVersion: SAVE_VERSION,
    gameVersion: state.meta.gameVersion,
    lastSimTimestamp: now,
    payload: applyPersist(state),         // STEJNÝ allowlist jako disk save (žádný drift)
  };
  const json = JSON.stringify(envelope);
  return compressToBase64(json);
}

/**
 * Importuje string → rekonstruovaný stav (přes 7-krokovou pipeline = validace+migrace+invarianty).
 * @param {string} str
 * @param {object} catalog
 * @returns {{ state: GameState, lastSimTimestamp: number }}
 * @throws při nevalidním stringu/obálce
 */
export function importSaveString(str, catalog) {
  const json = decompressFromBase64(str);
  if (!json) throw new Error('export: nečitelný / poškozený řetězec');
  const env = JSON.parse(json);                // throw na nevalidní JSON
  const state = loadAndReconstruct(env, catalog);  // env má saveVersion+payload → validateEnvelope projde
  return { state, lastSimTimestamp: env.lastSimTimestamp ?? Date.now() };
}
```
- **Klíčové**: export používá `applyPersist` (stejný allowlist) a import jde přes `loadAndReconstruct` (stejná pipeline jako disk load) → **import savu je validovaný, migrovaný a invariantovaný stejně jako disk load**. Žádná druhá load cesta. Pozn.: `loadAndReconstruct` (load.js:141) přijímá buď `{saveVersion,payload}` nebo holý payload – `env` má `saveVersion`, takže větev wrapper projde a `validateEnvelope` ověří verzi/required pole.

### 6.4 UI copy/paste
- Do `App.js` (nebo malý panel/menu) přidat dvě akce: **Export** (zobraz `exportSaveString` v `<textarea readonly>` + tlačítko "Kopírovat" přes `navigator.clipboard.writeText`), **Import** (`<textarea>` pro vložení + tlačítko "Načíst" → `importSaveString` → po úspěchu nahraď `state` a restartuj loop / nebo `saveGame` nového stavu a `boot()`).
- Import flow: po úspěšném `importSaveString` ideálně **ulož přes `saveGame`** (aby se nový stav stal aktivní generací) a znovu `boot()` / reinicializuj loop nad novým `state`. Coder zvolí: nejjednodušší je `saveGame(imported.state)` + `location.reload()` (PWA) NEBO in-place výměna `state` reference (složitější kvůli closures v loop). Doporučeno: ulož + reload.
- Chyba importu → `showErrorScreen`/inline hláška (kind nepotřebný, stačí inline text "Neplatný kód savu").

### 6.5 Jak ověří test (`test/export-string.test.js`)
1. **Round-trip**: `state` → `exportSaveString(state, now)` → `importSaveString(str, catalog)` → `hashState(imported.state)` == `hashState` rekonstruovaného originálu (přes stejnou pipeline). `lastSimTimestamp` zachován.
2. **Komprese netriviální**: `str.length < JSON.stringify(envelope).length` (komprese funguje) – měkký assert.
3. **Poškozený string**: `importSaveString('xxx-not-base64', catalog)` → throw (nečitelný / JSON / envelope chyba).
4. **Verze mismatch**: obálka s `saveVersion: 999` → `loadAndReconstruct` throw (version mismatch z `validateEnvelope`).
5. **Allowlist parita**: export payload má stejné klíče jako `applyPersist(state)` (žádný drift mezi disk save a export).
6. **Determinismus napříč zařízeními**: export→import→běh N kroků dá stejný `hashState` jako originál→běh N kroků (G1 přes přenos).

---

## 7. Catch-up-safe invariant a rozšiřitelnost v M3+ (průřezově, S-05)

**M2b NErozšiřuje množinu dohnaných systémů** – dohání přesně živé systémy M2 (viz §2.5). Pro M3+ platí kontrakt, který coder zapíše do `docs/tickOrder.md` / komentáře `catchup.js`:

> Každý systém přidaný do `registerCorePeriodics` v M3–M8 je catch-upem dohnán automaticky a MUSÍ být **catch-up-safe**:
> 1. **Deterministický** – čas jen z `curStep`/`TimeEdges`, náhoda jen z `makeRng(state, stream)`; žádný `Date.now()`/`Math.random()`/DOM (vynuceno CI grep gate).
> 2. **Levný v dávce** – žádné alokace v hot-path, žádné O(n²); 576 000 kroků (8 h cap) musí proběhnout v jednotkách sekund (R-B).
> 3. **Frakční akumulátory** drží zbytek per-step (jako `migrationAcc`) – žádný skok závislý na velikosti dávky.
> 4. **Nový systém přidá svůj `live == batch` test** do `catchup-invariant.test.js` (S-05).
>
> Mechanismus (`catchup.js`) se kvůli novému systému NEMĚNÍ. "Systém běží live, ale rozbíjí catch-up" = neprošlý milník (DoD §11 architektury).

M3+ rozšíření, která se napojí na EXISTUJÍCÍ sloty catch-upu (bez změny mechanismu): auto-resolve bitev (M7, stub `battle.tick` se nahradí reálným automatem – `battleStep` bez hráčových commandů), interaktivní eventy v catch-upu (M8, využijí T2 stopPending – `running=false` + resume). Oba sloty v M2b existují (no-op / mechanismus), takže M7/M8 jsou "naplnění slotu", ne přestavba.

---

## 8. Souhrn nových/změněných souborů (pro coder)

| Soubor | Akce | Úkol |
|--------|------|------|
| `src/save/saveStore.js` | změna: `payload: applyPersist(state)` | S-1 |
| `src/app/catalogs.js` | **nový**: load+validace katalogů, browserFetchJson | S-1 |
| `src/app/main.js` | změna: katalogy → loadGame(slot,catalog) → catch-up → autosave | S-1/T1/T4 |
| `src/core/state/createHomeState.js` | změna: čte `balance.start` (S-2) | S-1 |
| `src/core/engine/catchup.js` | **nový**: catchupStepCount, runCatchupBatch, konstanty | T1/T2 |
| `src/core/engine/index.js` | změna: re-export catchup API | T1 |
| `src/data/balance.json` | změna/ověření: sekce `offline` (cap/chunk/threshold) | T1 |
| `src/ui/offlineSummary.js` | **nový**: buildOfflineSummary (model) | T3 |
| `src/ui/OfflineSummary.js` | **nový**: preact view | T3 |
| `src/ui/CatchupProgress.js` | **nový**: preact progress | T3 |
| `src/app/autosave.js` | **nový**: createAutosave (throttle/flush) | T4 |
| `src/app/lifecycle.js` | (beze změny API; napojí se onHide→autosave) | T4 |
| `src/save/exportString.js` | **nový**: export/import string | T5 |
| `src/vendor/lzstring.standalone.js` | **nový**: vendorovaná komprese | T5 |
| `src/ui/App.js` | změna: export/import tlačítka | T5 |
| `test/catchup.test.js` | **nový**: T1+T2 (vč. chunked==batch, cap, interrupt/resume) | T1/T2 |
| `test/offline-summary.test.js` | **nový**: T3 model | T3 |
| `test/autosave.test.js` | **nový**: T4 throttle/triggers | T4 |
| `test/export-string.test.js` | **nový**: T5 round-trip/G1 | T5 |
| `test/app-bootstrap.test.js` | **nový**: S-1 save→load přes saveStore + catalog fail | S-1 |
| `docs/tickOrder.md` | změna: pozn. catch-up-safe kontrakt M3+ (§7) | S-05 |

---

## 9. Alternativy (s důvody zamítnutí)

**Alt 1 – catch-up jako samostatná "rychlá" simulace (agregátní vzorce místo per-step).** Místo dohánění 576k kroků by se offline progres spočítal uzavřenými vzorci (např. "za N dní přibude X lidí"). Plus: rychlejší než per-step dávka. **Zamítnuto**: (1) rozbíjí determinismus G1 – výsledek by se lišil od live běhu; (2) každý nový systém by potřeboval DRUHOU implementaci (vzorcovou) → zdroj defektů a údržbová past (přesně co architektura §4.1 "jeden mechanismus" odmítá); (3) review M2a potvrdilo, že per-step dávka je levná (~0,01 ms/krok, 8 h ≈ jednotky sekund). Per-step dohánění je jednodušší, věrné a testovatelné (`live == batch`).

**Alt 2 – catch-up bez chunkování (jedna dávka, žádný yield).** Jednodušší kód. **Zamítnuto**: dlouhá dávka (statisíce kroků) zablokuje hlavní vlákno → zamrzlé UI, žádný progress, na mobilu riziko "page unresponsive". Constraint briefu výslovně žádá yield. Chunky + `requestAnimationFrame` yield jsou nutné minimum. (Chunkování nesmí změnit výsledek – ověřeno testem chunked==batch.)

**Alt 3 – komprese i pro IndexedDB payload (T5 + disk).** Sjednotit kompresi pro disk i export. **Zamítnuto**: §6.5 architektury – IndexedDB nemá REST payload limit jako originál, komprese přidá CPU daň při každém (častém) autosave a ztíží diagnostiku/migrace. Komprese má smysl jen pro copy-paste string (velikost/přenositelnost). Disk = plain, export = komprimovaný.

---

## 10. Předpoklady, nejistoty, gapy pro coder

1. **`balance.json` sekce `offline`** nemusí existovat – coder ji doplní (cap/chunk/threshold) s `provenance: approximated`; hodnoty ladí M9 (architektura nezávislá).
2. **lz-string vendor** – pokud vendorování dělá problém (ESM export), coder smí dočasně použít `btoa(encodeURIComponent(JSON))` bez komprese a kompresi označit jako follow-up gap; round-trip/G1 testy musí platit i tak. Doporučeno ale vendorovat (malé, standard).
3. **`createInitialState`/`createHomeState` sjednocení (S-2)** – plný refaktor je nad úzký scope; minimum = bootstrap a load aplikují `BALANCE.start`. Zbytek gap pro M3.
4. **Schémata katalogů** – ne všechny `REQUIRED_CATALOGS` mají `SCHEMAS` záznam; coder ověří v `schemas.js` a katalogy bez schématu buď nevaliduje (gap), nebo zúží min-set. Nesmí tiše obejít validaci.
5. **Sync save na `pagehide`** – IndexedDB je async, garantovaný sync save při zavření tabu neexistuje (R-F); spoléháme na rotující generace + periodický save + best-effort. Akceptováno.
6. **`Date.now()` v app vrstvě je OK** (catch-up `missedMs`, autosave `now`). V core NIKDY – `catchup.js` dostává `missedMs`/`totalSteps` jako parametry.

---

*Konec spec. Navazuje na architekturu iter-002 (§4.1/§6/§9.2, D3/D6/D10) a review iter-007 (S-1). Catch-up je TÝŽ kód jako live (`step`), dohání jen živé systémy M2; rozšíření M3+ jde registrací do tickOrder + catch-up-safe invariant, bez změny `catchup.js`. Determinismus G1 ověřen testem chunked==single-batch a export→import round-trip.*
