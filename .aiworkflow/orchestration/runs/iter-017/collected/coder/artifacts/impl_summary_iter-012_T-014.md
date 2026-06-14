# Impl summary – iter-012 T-014: Fix reload-determinismus `workforce.total` (Option A)

- **Task**: T-014 (coder)
- **Iteration**: iter-012
- **Status**: BLOCKED – scope-fix hotový a korektní, ale plné `npm run ci` NENÍ zelené kvůli 2 preexistujícím determinismus testům, které fix odhalil (root cause mimo scope T-014). NEMASKOVÁNO.
- **Date**: 2026-06-13

---

## Co bylo změněno (3 změny dle designu)

Pozn.: tři scope soubory už byly v repo (commit `66a9ac2` "wip(iter-012): T-014 … coder in-flight").
Ověřil jsem, že obsah **přesně** odpovídá schválenému designu (`fix_reload_determinism_iter-012_T-013.md`, DR-012-02). Žádná odchylka:

1. **`src/core/systems/jobs.js`**
   - Přidán a exportován `deriveWorkforceTotal(state, ctx?)` = `Math.min(population.total, workerSlots(state, ctx))` (ř. 61-72) jako single source of truth.
   - `workerSlots(state, ctx?)` má `ctx` volitelný a běží bez `ctx` přes globální katalog fallback (`hasCatalog/getCatalog('houseTypes')`, ř. 45-59).
   - `autoAssignWorkers` používá helper (ř. 213) – chování beze změny (počítá identickou hodnotu).

2. **`src/save/load.js`**
   - Import `deriveWorkforceTotal` (ř. 10).
   - `loadAndReconstruct` Step 5 "recalculate derived fields" (po `applyPayload`, před `validateInvariants`) přepočítá `state.home.workforce.total = deriveWorkforceTotal(state)` bez `ctx` (ř. 217-225).

3. **`test/iter005-edge.test.js`**
   - G1 vrácen na **plný `hashState(stateC) === hashState(stateA)`** (ř. 100-104). `applyPersist()` obejití, A1 komentář i nepoužitý import `applyPersist` odstraněny. `before()` načtení katalogů ponecháno.

`persistSchema.js`, `tickOrder.js`, `saveStore.js`, tvar save (v3) nedotčeny.

---

## Výsledek gate

| Krok | Výsledek |
|---|---|
| `npm run typecheck` | ZELENÉ (exit 0) |
| `npm run lint:core` | ZELENÉ (core import gate OK, 52 souborů) |
| `npm run smoke` | OK (app rendered, 0 console errors, seeded pop=50) |
| `node --test test/iter005-edge.test.js` (G1 plný hashState) | **ZELENÉ** (16/16 pass) |
| `npm run test` (plné) | **776/778 pass, 2 fail** |
| `npm run ci` | **ČERVENÉ** kvůli těm 2 fail |

### 2 selhávající testy (oba determinismus round-trip, oba selhávají i izolovaně)
- `test/app-bootstrap.test.js` → `S-1: loadAndReconstruct idempotence` → `hashState after round-trip (save→load) then N steps == original state then N steps`
- `test/export-string.test.js` → `export/import round-trip` → `export then run N steps on original; import then run same N steps → same hash`

Oba existují beze změny od iter-008 (commit `129b008`); nejsou ve scope T-014.

---

## Root cause selhání (ověřeno experimentem) – PROČ G1 nelze dotáhnout bez zásahu mimo scope

`jobsAccidents` (quarterDay order 20) běží **před** `autoAssignWorkers` (order 30) na témže quarterDay edge.
quarterDay edge nastává když `sid = (curStep-1) % 900 ∈ {0,225,450,675}` → tedy **už na kroku 1** (`sid=0`).

Tyto dva testy savnou/exportují state na **`curStep=0`** (PŘED prvním tickem), kdy `createInitialState`
dal `workforce.total=0` a žádný tick jej ještě nedopočítal:

- **Path A (kontinuální)**: vstupuje do kroku 1 s `workforce.total=0` (stale, autoAssign ještě neběžel)
  → `jobsAccidents` čte `workers=0` → **přeskočí `rng.next()`** na streamu `'population'`.
- **Path B (load)**: load **správně** přepočítá `workforce.total=9` (Option A fix)
  → `jobsAccidents` na kroku 1 čte `workers=min(60,9)=9>0` → **čerpá `rng.next()`**.

→ Jediné rozcházející pole v hashi: **`rng.streams.population`** (A=`4091662026` vs B=`1628260543`).
Všechna ostatní `home`/`engine`/`player`/`world` pole jsou shodná (0 diffs).

**Důkaz experimentem** (`deriveWorkforceTotal` aplikováno i v Path A PŘED krokem 1, jako to dělá load):
hashA == hashB == `273280195` → **shoda**. Tím je root cause jednoznačně potvrzen.

### Proč to dřív procházelo (falešná shoda, nikoli korektnost)
Před Option A fixem load `workforce.total` nepřepočítával → Path B měla taky stale `0`
→ obě cesty **bugově** přeskočily RNG draw → hashe se shodovaly. Fix tu symetrii (správně) rozbil:
load je nyní deterministicky korektní, ale **kontinuální sim sám má stale `workforce.total=0`
na úplně prvním ticku** (order 20 před order 30) – a tyto testy savnou přesně v tom okamžiku (krok 0).

### Proč iter005-edge G1 prochází a tyto ne
iter005-edge G1 savne až po `BREAK=20` krocích, kdy `autoAssignWorkers` už `workforce.total` na
kroku 1 dopočítal → load přepočítá na **stejnou** hodnotu → shoda. (G1 plný hashState zelený.)

---

## Eskalace (dle pokynu briefu: NEMASKOVAT, zastavit, zapsat, eskalovat)

Scope T-014 (DR-012-02) **zakazuje**: změnu tick logiky, pořadí edge (zamítnutá Option C =
reorder autoAssign před jobsAccidents), jobsAccidents reload-independent (zamítnutá Option B),
změnu tvaru save. Zbylé 2 selhání nelze opravit bez zásahu do jedné z těchto zakázaných oblastí
**nebo** bez přepočtu `workforce.total` už v `createInitialState`/init cestě (mění spojitý sim, mimo scope).

Self-fix T-014 (přepočet na load) je **úplný a korektní pro svůj scope**: G1 v iter005-edge prošel na
plném hashState, smoke OK, typecheck+lint zelené, žádná regrese spojitého simu (deriveWorkforceTotal
v autoAssign je bit-identický s původním inline výpočtem). Zbývající 2 selhání jsou **hlubší,
preexistující determinismus díra** (stale `workforce.total` na prvním ticku spojitého simu),
kterou Option A pouze odhalil tím, že odstranil maskující symetrii.

### Doporučené varianty pro architekta (k rozhodnutí, mimo T-014)
1. **Derive-on-init**: přepočítat `workforce.total` v `createInitialState` (nebo `initRng`/boot)
   tak, aby spojitý sim vstupoval do kroku 1 s dopočítanou hodnotou (== load). Sjednotí obě cesty;
   mění hash spojitého simu (posune i jiné fixtures) → vyžaduje refresh fixtures + souhlas.
2. **Reorder** (Option C, dříve zamítnuto) – autoAssign před jobsAccidents. Širší dopad.
3. **Uznat testy jako křehké**: hra reálně nikdy nesavne na `curStep=0` (save jde až po boot+ticích).
   Posunout save point v těchto 2 testech za první quarterDay edge. Mění cizí testy → mimo scope codera.

Nepřikláním se k žádné bez rozhodnutí architekta – jde o cizí scope (tick order / init / cizí testy).

---

## Soubory
- `src/core/systems/jobs.js` (deriveWorkforceTotal, autoAssign)
- `src/save/load.js` (Step 5 rebuild-on-load)
- `test/iter005-edge.test.js` (G1 plný hashState)
- Blokující (cizí scope, neměněno): `test/app-bootstrap.test.js`, `test/export-string.test.js`
