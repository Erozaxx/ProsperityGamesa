# Design pro codera (T-016): Dotažení fixu reload-determinismus — Derive-on-init

- **Iteration**: iter-012
- **Task (decision)**: T-015 (architect) → **Derive-on-init** (rozšíření Option A z T-013)
- **Task (impl)**: T-016 (coder)
- **Decision record**: `orchestration/decisions/DR-012-02_reload-determinism-workforce-total.md` (Status: decided-extended)
- **Předchozí**: Option A (rebuild-on-load) je už aplikovaná v `src/save/load.js` Step 5 (T-014) — **NESAHAT, zůstává**.
- **Scope**: POUZE dopočet `workforce.total` při konstrukci stavu (init). Žádné jiné systémy.
- **USER-GATE**: behavior-change spojitého simu → architekt doporučuje eskalaci uživateli PŘED implementací. **Pokud orchestrátor gate neotevřel, NEZAČÍNEJ — počkej.**

---

## 1. Co opravujeme (root cause, ověřeno coderem v T-014)

Option A opravila load cestu, ale odhalila preexistující díru ve **spojitém simu**:

- `createInitialState` (`src/core/state/createInitialState.js`) seeduje `home.population.total` (A1, 50)
  a `home.housing.counts` (`{ tent: 5 }`), ale `home.workforce.total` ponechává na **0**
  (factory default z `createHomeState.js:23`).
- `jobsAccidents` (quarterDay **order 20**) běží **před** `autoAssignWorkers` (order **30**).
  quarterDay edge nastává už na **kroku 1** (`sid = (curStep-1) % 900 = 0`).
- → Spojitý sim vstupuje do kroku 1 se stale `workforce.total=0` → `jobsAccidents` čte `workers=0`
  → **přeskočí `rng.next()`** na streamu `'population'`. Load (Path B, díky Option A) má správnou
  hodnotu → čerpá RNG → **desync** (jediné rozcházející pole `rng.streams.population`).
- 2 testy (`test/app-bootstrap.test.js` S-1, `test/export-string.test.js` round-trip) savnou/exportují
  na `curStep=0` a pak běží N kroků na obou cestách → hashe se rozejdou → **fail**.
- **Důkaz codera (T-014)**: aplikovat `deriveWorkforceTotal` i v Path A PŘED krokem 1 → `hashA == hashB == 273280195`. Root cause potvrzen.

**Fix:** dopočítat `workforce.total` už při konstrukci v `createInitialState` přes **stejnou kanonickou
derivaci** (`deriveWorkforceTotal`), kterou používá load (Step 5) i `autoAssignWorkers`. Tím je init
i load i spojitý sim na kroku 1 identický.

---

## 2. Jediná změna kódu: `src/core/state/createInitialState.js`

`deriveWorkforceTotal(state, ctx?)` už **existuje a je exportovaná** z `src/core/systems/jobs.js`
(přidal coder v T-014, ř. 61-72). `workerSlots` umí běžet **bez `ctx`** přes globální katalog fallback
(`hasCatalog/getCatalog('houseTypes')`). Tj. init cesta (bez ctx) ho použije stejně jako load.

### 2a. Import
Přidej k importům v `createInitialState.js` (vedle `createHomeState`, `BALANCE` na ř. 6-8):

```js
import { deriveWorkforceTotal } from '../systems/jobs.js';
```

(Ověř relativní cestu: `createInitialState.js` je v `src/core/state/`, jobs v `src/core/systems/` →
`'../systems/jobs.js'`.)

### 2b. Dopočet po sestavení `state`, PŘED `return`

`deriveWorkforceTotal` čte `state.home.population.total`, `state.home.housing.counts` a houseTypes
katalog. V `createInitialState` se `home` mutuje (A1 seed) PŘED sestavením `state` objektu, ale
`workforce.total` lze dopočítat až když existuje hotová `state.home` reference. Nejčistší místo:
**sestav `state` do lokální proměnné, dopočítej `workforce.total`, pak vrať.**

Nahraď koncový `return { ... };` (ř. 81-124) tímto vzorem:

```js
  const state = {
    meta: { /* ... beze změny ... */ },
    engine: { /* ... beze změny ... */ },
    rng: { seed, streams: {} },
    season: { /* ... beze změny ... */ },
    player,
    home,
    world: createWorldState(),
    catalogState: { modifiers: [] },
    battle: null,
    story: {},
    log: { entries: [], capacity: logCapacity, head: 0 },
    achievements: { unlocked: {} },
    council: createCouncilState(),
  };

  // A1/T-016 (DR-012-02 dotažení): workforce.total je odvozené pole (NEPERZISTUJE se).
  // Dopočítej ho už při konstrukci přes stejnou kanonickou derivaci jako load.js Step 5
  // a autoAssignWorkers — jinak spojitý sim vstupuje do kroku 1 se stale workforce.total=0
  // a jobsAccidents (order 20, před autoAssign order 30) přeskočí svůj 'population' RNG draw
  // → desync vůči load cestě. Bez ctx → workerSlots použije globální katalog fallback
  // (== chování load); když houseTypes katalog není načten, derivuje 0 (shodné s load i se
  // spojitým simem bez katalogu).
  state.home.workforce.total = deriveWorkforceTotal(/** @type {any} */ (state));

  return state;
```

- **Nepoužívej `ctx`** — `createInitialState` žádný `ctx` nemá; `deriveWorkforceTotal`/`workerSlots`
  spadnou do globálního katalog fallbacku (přesně jako load.js Step 5).
- **Pořadí je kritické**: `home` musí mít naplněné `population.total` a `housing.counts` (A1 seed na
  ř. 75-79 běží před sestavením `state`) — to už je splněno; dopočet jen musí být PO sestavení
  `state` (potřebuje `state.home` referenci).

### Co NEdělat
- NEpřidávej `workforce.total` do `PERSIST_SCHEMA`/`applyPersist` (zůstává odvozené, tvar save v3 beze změny).
- NEduplikuj derivaci — VÝHRADNĚ volej `deriveWorkforceTotal` (single source of truth).
- NEsahej na `load.js` Step 5 (Option A, T-014) — zůstává; init i load teď volají stejný helper, to je záměr.
- NEměň `tickOrder.js` (zamítnutá Option C) ani `jobsAccidents` (zamítnutá Option B).
- NEměň factory `createHomeState.js` (`workforce.total: 0` default tam zůstává — je to neutral default;
  seed/derivace patří do `createInitialState`, kde žije BALANCE, konzistentně s A1).

---

## 3. Edge-cases (MUSÍ platit)

- **houseTypes katalog načtený** (boot cesta + oba failing testy ho loadují v `before()`):
  `workforce.total = min(population, Σ slots)` = reálná hodnota = shodná s load i autoAssign. ✔
- **houseTypes katalog NEnačtený** (čisté `createInitialState()` bez boot, např. některé unit testy):
  `workerSlots → 0` → `workforce.total = 0`. Shodné s load (taky fallback 0) i se spojitým simem bez
  katalogu. Žádný nový desync, žádná regrese. ✔
- **`population.total = 0`** (teoreticky): `min(0, slots) = 0` → `jobsAccidents` early-return jako dřív. ✔
- **`iter012-playability.test.js` A1**: volá `createInitialState()` BEZ katalogu (A1 blok nemá
  `before` loadCatalog před prvním `describe`) → `workforce.total = 0` → A1 asserce (gold/pop/housing/food)
  nedotčeny (workforce neasertuje). ✔

---

## 4. Soubory k úpravě (souhrn)

| Soubor | Změna |
|---|---|
| `src/core/state/createInitialState.js` | Import `deriveWorkforceTotal`; po sestavení `state`, před `return`, dopočítat `state.home.workforce.total = deriveWorkforceTotal(state)` (bez ctx). |

Žádná další změna kódu. `jobs.js` (helper), `load.js` (Step 5), `persistSchema.js`, `tickOrder.js`,
`createHomeState.js`, tvar save (v3) — **nedotčeno**.

---

## 5. Fixtures k (re)generaci

**Pro `npm run ci`: ŽÁDNÉ.** Žádné stored sim-hash golden fixtures v repu neexistují; všechny
determinismus testy porovnávají Path A vs Path B za běhu → behavior-change posune obě cesty stejně.

**Volitelně (mimo CI, pro čistotu committed artefaktů):**
- `node tools/gen-precache.mjs` → přegeneruje `src/precache.js` (PRECACHE_VERSION se změní, protože
  se změnily bajty `createInitialState.js`). **Není CI-gated** (`gen-precache.test.js` neasertuje
  konkrétní verzi), ale je to committed SW-cache artefakt → spusť a commitni výsledný `src/precache.js`,
  aby cache verze odpovídala obsahu. (Pokud lokálně přegeneruje i nesouvisející položky, je to OK —
  obsah je deterministický.)
- `tools/bench-step.mjs` — **NEgeneruj jako gate.** Pouze perf, není v CI, žádný hash. Volitelně
  přeměř pro klid (derive-on-init = jedno `min` + součet slotů jednou při initu, ne hot-path → bez perf dopadu).

---

## 6. Jak ověřit (cílový stav: plné `npm run ci` zelené)

1. **2 dříve failující testy zelené**:
   - `node --test test/app-bootstrap.test.js` → S-1 „loadAndReconstruct idempotence" / „hashState after
     round-trip … N steps" PASS.
   - `node --test test/export-string.test.js` → „export then run N steps … same hash" PASS.
2. **G1 (Option A) drží**: `node --test test/iter005-edge.test.js` → blok „determinism after load (G1)"
   plný `hashState` PASS (16/16).
3. **A1 nedotčen**: `node --test test/iter012-playability.test.js` PASS.
4. **Plné CI**: `npm run ci` (= typecheck + lint:core + test) **zelené** — žádný test se nesmí rozbít.
5. **Smoke**: `npm run smoke` zelené (seeded pop=50, 0 console errors).
6. **Tvar save**: `applyPersist(state)` payload nesmí nově obsahovat `workforce.total` (zůstává jen `assigned`).
7. **Single source of truth**: ověř, že `workforce.total` se derivuje VÝHRADNĚ přes `deriveWorkforceTotal`
   na 3 místech (init / load Step 5 / autoAssign) — žádná čtvrtá inline kopie.

Očekávaná shoda: po fixu `hashA == hashB` na všech round-trip testech (init i load vstupují do kroku 1
s `workforce.total` dopočítaným z téže funkce).

---

## 7. Rizika / pozn.

- **Behavior-change spojitého simu** (RNG na kroku 1) — viz USER-GATE výše. Implementuj jen po
  schválení orchestrátorem/uživatelem.
- **Determinismus**: derivace je čistá funkce `population.total + housing.counts + houseTypes` → žádná
  nová RNG/nedeterministická cesta.
- **Perf**: dopočet běží jednou při konstrukci stavu (init/load), ne v hot-path tick → bez měřitelného dopadu.
- **Konzistence init↔load**: po této změně volají init i load identický `deriveWorkforceTotal` bez ctx
  → jejich `workforce.total` je z definice shodný pro shodný `population/housing/katalog`.
