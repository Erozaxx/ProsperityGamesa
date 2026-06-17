# Design pro codera (T-014): Fix reload-determinismus `workforce.total`

- **Iteration**: iter-012
- **Task (decision)**: T-013 (architect) → **Option A — rebuild-on-load**
- **Task (impl)**: T-014 (coder)
- **Decision record**: `orchestration/decisions/DR-012-02_reload-determinism-workforce-total.md` (Status: decided)
- **Scope**: POUZE reload-determinismus `workforce.total`. Žádné jiné systémy.

---

## 1. Co opravujeme (root cause, ověřeno proti kódu)

- `jobsAccidents` (`src/core/systems/jobs.js:152-158`) počítá
  `workers = min(population.total, workforce.total || 0)` a při `workers <= 0` **early-return → nečerpá `rng.next()`** ze streamu `'population'`.
- `workforce.total` je **odvozené** pole (NEPERZISTUJE se — `persistSchema.js:7`, `applyPersist` ukládá jen `workforce.assigned` na ř. 144-147).
- `load.js::applyPayload` (`src/save/load.js:126-130`) po načtení obnoví **jen `workforce.assigned`**; `workforce.total` zůstane na defaultu z `createInitialState` (**0**).
- Refresh `workforce.total` proběhne až v `autoAssignWorkers` (`jobs.js:204-206`), který v tickOrder běží **až po** `jobsAccidents` (quarterDay order 30 vs 20 — `tickOrder.js:178-179`).
- → **První post-load quarterDay tick**: `jobsAccidents` čte stale `workforce.total=0` → `workers=0` → přeskočí RNG draw → **desync streamu `'population'`** → vlčí útoky/úmrtí padnou jinak než ve spojitém simu → rozejde se i perzistovaná `population.total`.
- Před iter-012 startovala pop na 0 → `workers` vždy 0 → bug se neprojevil. A1 seed (pop 50) ho aktivoval.

**Fix:** po načtení přepočítat `workforce.total` z téže kanonické derivace, kterou používá `autoAssignWorkers`, aby první post-load tick byl identický se spojitým simem.

---

## 2. Kanonická derivace (single source of truth)

Ve spojitém simu `autoAssignWorkers` (`jobs.js:197-206`) počítá:

```
slots            = workerSlots(state, ctx)                  // Σ houseTypes[].workers * housing.counts[id]
availableWorkers = min(population.total, slots)
workforce.total  = availableWorkers
```

Tuto derivaci vytáhni do **jedné exportované, ctx-volitelné** funkce v `jobs.js` a používej ji na OBOU místech (autoAssign i load) — žádná duplikace.

### 2a. Nový export v `src/core/systems/jobs.js`

Přidej (a exportuj) helper. `workerSlots` už dnes umí běžet **bez `ctx`** přes globální katalog fallback (`jobs.js:46-50`: `hasCatalog('houseTypes')`/`getCatalog('houseTypes')`), takže load cesta nepotřebuje předávat `ctx`.

```js
/**
 * Canonical derivation of workforce.total (derived field, NEVER persisted).
 * Single source of truth shared by autoAssignWorkers (tick) and load.js (rebuild-on-load).
 * ctx is optional: workerSlots falls back to the module-global catalog when ctx is absent.
 * @param {GameState} state
 * @param {TickContext} [ctx]
 * @returns {number}
 */
export function deriveWorkforceTotal(state, ctx) {
  const slots = workerSlots(state, ctx);
  return Math.min(state.home.population.total, slots);
}
```

Poznámka: `workerSlots(state, ctx)` při `ctx === undefined` spadne do větve `hasCatalog('houseTypes')`. Když houseTypes katalog NENÍ načten, vrátí `0` → `workforce.total = 0`. To je **shodné** s chováním spojitého simu bez katalogu (taky derivuje 0), takže to determinismus neporušuje.

### 2b. `autoAssignWorkers` použije helper (žádná změna chování)

V `jobs.js:197-206` nahraď inline výpočet voláním helperu — výsledek musí být bit-identický:

```js
const availableWorkers = deriveWorkforceTotal(state, ctx);   // = min(pop, workerSlots(state, ctx))
const assigned = totalAssigned(state);
let free = availableWorkers - assigned;

if (state.home.workforce) {
  state.home.workforce.total = availableWorkers;
}
```

(`slots`/`availableWorkers` se přepočítají uvnitř helperu přes stejný `workerSlots(state, ctx)`; chování i hodnota zůstanou identické.)

---

## 3. Místo přepočtu po load: `src/save/load.js`

### 3a. Import

Přidej k importům v `load.js`:

```js
import { deriveWorkforceTotal } from '../core/systems/jobs.js';
```

### 3b. Přepočet v `loadAndReconstruct`, Step 5 ("recalculate derivates")

V `loadAndReconstruct` je dnes na ř. 216 prázdný krok:

```js
  // Step 5: recalculate derivates (no-op for M2a-1)
```

Nahraď ho přepočtem derivovaného `workforce.total` **po** `applyPayload` (Step 4) a **před** `validateInvariants` (Step 6):

```js
  // Step 5: recalculate derived fields (architecture §9.1 K11 — derived, NEVER persisted).
  // workforce.total is derived from population + housing.counts + houseTypes catalog.
  // It is NOT persisted (persistSchema.js); applyPayload restores only workforce.assigned.
  // Without this rebuild the first post-load quarterDay tick reads a stale workforce.total=0,
  // making jobsAccidents skip its 'population' RNG draw → desync vs the continuous sim
  // (DR-012-02). Rebuild here so the first post-load tick matches the uninterrupted run.
  if (state.home && state.home.workforce) {
    state.home.workforce.total = deriveWorkforceTotal(/** @type {any} */ (state));
  }
```

- Volej **bez `ctx`** — load cesta nemá `ctx`; `deriveWorkforceTotal`/`workerSlots` použijí globální katalog fallback.
- Guard `state.home && state.home.workforce`: `createInitialState` `workforce` vždy vytvoří, ale guard je laciný a bezpečný vůči budoucím tvarům.

### Edge-case po load (MUSÍ platit)
- **houseTypes katalog načtený** (běžná boot cesta + G1 test `before()` ho loaduje): `workforce.total` = reálná derivovaná hodnota = shodná se spojitým simem. ✔
- **houseTypes katalog NEnačtený**: `workerSlots → 0` → `workforce.total = 0`. Shodné se spojitým simem bez katalogu (ten derivuje taky 0). Žádný nový desync. ✔
- **`population.total = 0`** (staré pre-iter-012 saves): `min(0, slots) = 0` → `jobsAccidents` early-return jako dřív. Žádná regrese pro staré saves. ✔

### Co NEdělat
- NEpřidávej `workforce.total` do `PERSIST_SCHEMA` ani do `applyPersist`/`applyPayload` allowlistu (tvar save v3 se nesmí změnit; pole zůstává odvozené).
- NEměň pořadí periodics v `tickOrder.js` (to je zamítnutá Option C).
- NEpřepínej `jobsAccidents` na `workerSlots` napřímo (zamítnutá Option B).

---

## 4. G1 test: vrátit na plný `hashState`

Soubor: `test/iter005-edge.test.js`, blok `describe('iter-005: determinism after load (G1)')` (ř. 80-112).

- **Odstraň** `applyPersist` obejití (ř. 106-107) i doprovodný iter-012 A1 komentář (ř. 101-105).
- Vrať assertion na **plný `hashState(state)`** (celý stav včetně derivovaných polí):

```js
    const hashA = hashState(stateA);
    const hashC = hashState(stateC);

    assert.equal(hashC, hashA,
      `determinism broken: interrupted+resumed (${hashC}) ≠ uninterrupted (${hashA})`);
```

- Odeber import `applyPersist`, pokud už není v souboru jinde použit (zkontroluj — používá se jen v tomto testu, pak ho z `import` na ř. 36 vyhoď).
- Po Option A fixu **MUSÍ** `hashState(stateC) === hashState(stateA)` projít, protože `workforce.total` je po load identický se spojitým simem. Pokud neprojde s plným hashem → fix je neúplný (zkontroluj, že `before()` loaduje `houseTypes` — loaduje, ř. 48).

---

## 5. Soubory k úpravě (souhrn)

| Soubor | Změna |
|---|---|
| `src/core/systems/jobs.js` | Přidat+exportovat `deriveWorkforceTotal(state, ctx?)`; `autoAssignWorkers` ji použije (bez změny chování). |
| `src/save/load.js` | Import `deriveWorkforceTotal`; Step 5 přepočítá `state.home.workforce.total` po `applyPayload`, před `validateInvariants`. |
| `test/iter005-edge.test.js` | G1 zpět na plný `hashState`; odstranit `applyPersist` obejití + A1 komentář + nepoužitý import. |

Žádná změna: `persistSchema.js`, `tickOrder.js`, `saveStore.js`, tvar save (v3).

---

## 6. Jak ověřit

1. **G1 přísný**: `node --test test/iter005-edge.test.js` — blok „determinism after load (G1)" zelený s plným `hashState`.
2. **Plný CI**: `npm run ci` zelené (žádná jiná hash fixtures se nesmí pohnout — fix mění jen post-load derivaci, ne spojitý sim).
3. **Smoke**: `npm run smoke` zelené.
4. **Spojitý sim nedotčen**: hash spojitého běhu (Path A v G1) se nesmí změnit — `deriveWorkforceTotal` v `autoAssignWorkers` produkuje identickou hodnotu jako dnešní inline výpočet. Pokud se pohnou fixtures spojitého simu → refaktor 2b není bit-identický, oprav.
5. **Tvar save**: `applyPersist(state)` payload nesmí nově obsahovat `workforce.total` (zůstává jen `assigned`).

---

## 7. Rizika / pozn.

- **Riziko**: refaktor `autoAssignWorkers` (2b) je nepovinný pro funkčnost fixu (load by mohl volat samostatnou derivaci), ale je žádoucí kvůli „single source of truth". Pokud by 2b nešel udělat bit-identicky, ponech `autoAssignWorkers` beze změny a `deriveWorkforceTotal` použij JEN v load.js — fix bude stále korektní. Preferuj však sdílení.
- **Nedeterminismus**: derivace je čistá funkce `population.total + housing.counts + houseTypes` → žádná nová RNG/nedeterministická cesta.
- **Frekvence nehod**: `jobsAccidents` čte stejnou hodnotu jako ve spojitém simu, jen teď správně naplněnou → frekvence nehod beze změny.
</content>
</invoke>
