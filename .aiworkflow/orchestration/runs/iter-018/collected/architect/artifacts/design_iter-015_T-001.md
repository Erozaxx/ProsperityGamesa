# Implementační design — M6: Výzkum & tech strom (iter-015, T-001)

- **Task**: T-001, iter-015 (BRIEF-015-001 / BRIEF-ID BRIEF-015-001); **revize T-002a** (BRIEF-015-002a)
- **Autor**: architect
- **Datum**: 2026-06-14 (rev. 2026-06-14 T-002a)

---

## Changelog — Revize T-002a (zapracování reviewer gate T-002, GO-s-podmínkami)

Revize zapracovává **2 major + 1 minor** podmínku z review `review_design_iter-015_T-002.md` (DR-015-01). Ověřeno proti kódu: `createHomeState.js`, `catalog/index.js`+`loader.js`, `buildings.js`, `jobs.js`, `createInitialState.js`.

- **M-1 (major) vyřešeno** → nová **§1.3a** (player state init: přesný tvar `createPlayerState` + povinný fresh-vs-load determinismus test). Ověřeno: `createPlayerState` (createHomeState.js:64-66) je plochý objekt bez `unlockedTechs`/`research`.
- **M-2 (major) vyřešeno** → rozšířená **§2.2** (defenzivní guard `hasCatalog('techs')` + `if(!tech)continue`) + nová **§2.6** (catalog API kontrakt). Ověřeno: `rebuildBuildingDerived` (buildings.js:475) běží z `createInitialState:133` bez katalogů; precedent guardu `if(!hasId(buildingId))return` (buildings.js:299); `hasCatalog`/`getCatalog` v `catalog/index.js`.
- **m-3 (minor) vyřešeno** → nová **§2.7** (prokazatelná effective() cesta). **KLÍČOVÉ ZJIŠTĚNÍ proti kódu**: `jobsProduction` (jobs.js:107-130) čte `def.products` i efficiency (`state.home.workerEfficiency`, jobs.js:104) **přímo, NE přes `effective()`** → tech `mul` na `products.bread` / `add` na `farmer.efficiency` je **tichý no-op** (gap G-TECH-JOB-EFFECTIVE, přepojení M9). Demonstrovatelná cesta vede výhradně přes **building agregáty** (`recalcBuildingAggregates` → `effective(buildingId,attr)`, buildings.js:411; agreguje JEN `op:'add'` u `created>0` budov): `storage.*`, `workers`, `attractiveness` (konzumováno `workerSlots` jobs.js:62 a `housing` přes `home.derived`). **Zvolený demo atribut: `storage.food` (target `granary`) + `attractiveness` (target `well`)** — oba targety OVĚŘENY proti `buildings.json`; pův. `target:"house"` byl chybný (`house` neexistuje) → opraveno na `well`. Demo techy překalibrovány (§2.7, §4.3).
- Zbylé minor/nit (m-1, m-2, n-1..n-3) zapracovány bodově v dotčených sekcích (poznámky inline; viz §2.7 závěr).

> **Pozn. k položkám níže**: původní text §1.3/§2.2/§4.3 zůstává jako kontext; **závazné pro codera jsou revidované sekce §1.3a, §2.2 (guard), §2.6, §2.7 a aktualizovaná data §4.3**. Kde se liší od původního textu, platí revize T-002a.
- **Milník**: **M6** (master plán iter-003 §3/iter-013(M6), posunuto +1 dle DR-013-00 → reálná iterace **iter-015**) · **K13 plně** (modifikátory: druhý zdroj = techy) · **K4** (čisté vzorce/balanc).
- **Vstupy (ověřeno proti kódu)**: architektura iter-002 §5.3 (K13), §5.4 (K14), §6.3/§6.4 (persist/load), §7.1 (transakce); master plán §3/iter-013(M6) T1–T4 (řádky 281–295); M5-1 design `design_iter-013_T-001.md` §4 (modifier vrstva — kanonický); DR-013-00 (renumbering), DR-012-02 (reload-determinism, třída bugu); reálný kód `src/core/systems/buildings.js`, `src/core/resources/handlers.js` (techPt), `src/core/balance/formulas.js` (techCap), `src/save/load.js` Step 5, `src/save/persistSchema.js`, `src/core/registry/effects.js`, `src/core/commands/{dispatch,build,buyCompany}.js`, `src/core/engine/tickOrder.js`, `src/core/state/createInitialState.js`, `src/core/catalog/loader.js`, `src/app/catalogs.js`, `src/ui/{App,selectors,screens}.js`, `src/data/techs.json`; originál `doc/original_source/modules/prosperity/services/techs.js`, `doc/original_source_doc.md §6`.
- **Účel**: detailní design **M6 (T1–T4)** na úroveň, ze které Sonnet coder implementuje **bez dalšího architektonického rozhodnutí**. Žádný produkční kód. Žádná změna architektury iter-002 — jen její konkretizace pro M6.

---

## 0. Shrnutí rozhodnutí (registr)

| # | Rozhodnutí | Sekce | Opora |
|---|---|---|---|
| M6-D1 | **techCap(level) JIŽ EXISTUJE** ve `formulas.js:31` = `Math.round(100 × 1.25^level)`, sourced `config.js:1393-1394` + `original_source_doc §6` + originál `techs.js:37 calcCap`. **Coder NEpřidává vzorec — reuse + tabulkový test.** | §1.2 | formulas.js:31, techs.js:36-38 |
| M6-D2 | Stav techů: `state.player.unlockedTechs` = **plain object** `{ [techId]: true }` (deterministické, serializovatelné, persistované raw). Žádné derivované pole se neukládá. | §1.3 | §6.3, createInitialState |
| M6-D3 | `buyTech(techId)` command (nový `commands/buyTech.js`): validace existence + prerekvizity (`prereqs ⊆ unlockedTechs`) + `canAfford(techPt)` → `pay(techPt)` → `unlockedTechs[techId]=true` → **`applyTechModifiers(state)`** (re-derivace). Vrací `CommandResult`. **Cena = `techCap(tech.level)` přes techPt** (G-BUILD-TXAUDIT třída: command bez ctx, `pay` bez ctx — stejně jako build/buyCompany). | §1.4 | dispatch.js:44-59, handlers.js:74 (techPt), transactions.js |
| M6-D4 (KRITICKÉ) | **Techy jako modifikátory K13 PLNĚ**: tech efekty výhradně přes `state.catalogState.modifiers`, `source='tech:<id>'`, `id='tech:<id>:<attr>:<op>'` (přesně tvar arch §5.3 řádek 297). **Žádná ad-hoc cesta.** | §2 | arch §5.3:297, M5-1 §4.3 |
| M6-D5 (KRITICKÉ) | **Generalizace sdílené re-derivace**: zavést **`rebuildDerived(state)`** v `buildings.js` = `rebuildBuildingDerived(state)` (beze změny chování budov, M5-1) **+ `addTechModifiers(state)`** foldem `unlockedTechs`. `rebuildBuildingDerived` se přejmenuje/zabalí → load Step 5 a mutace volají **JEDNU cestu** re-aplikující budovy **I** techy. **Žádná load-only ani tech-only větev** (DR-012-02). | §2.3 | load.js:11+285, buildings.js:475 |
| M6-D6 | Save = **jen `unlockedTechs` (raw) + `catalogState.modifiers`** (ten už ukládán celý, persistSchema.js:53). Modifikátory techů se re-generují idempotentně z `unlockedTechs` v `rebuildDerived` → round-trip identita. | §1.5, §2.3 | persistSchema.js:11+53 |
| M6-D7 | **Academy/university** (`systems/research.js`): denní `research.daily` (edge `day`, order **75**, po `buildings.age` order 70). Akumuluje `exp` per sektor z jobů (per kategorie) + academy/university budov → při `exp ≥ techCap(level)` level-up → `techPt += 1` (`grant`). **Deterministické, žádný RNG** (originál `Math.random` pro university bonus → vynechán M6, gap). Catch-up-safe (1×/den, levné). | §3 | techs.js:46-138, tickOrder.js:214 |
| M6-D8 | **G-LISTTECHS**: `techs.json` = approximovaná min. hratelná sada (sektory + techy + efekty jako modifikátory, `provenance:'approximated'`, kalibrace M9). Wiring: přidat `techs` do `CATALOG_NAMES` (catalogs.js) + `ID_CATALOGS`/loader pro `tree`. Vzorec techCap **doložitelný** (existuje). | §4 | techs.json, catalogs.js:10, loader.js:23 |
| M6-D9 | **UI** (`screens.js TechScreen` + tab `'tech'`): selektory `selectTechTree`/`selectResearchProgress` (čisté, žádná logika v UI) + `send('buyTech',{techId})`. Vzor `selectBuildableBuildings` + `BuildScreen`. | §5 | App.js:15-26, selectors.js:175 |
| M6-D10 | **SPLIT M6 = NE** (T1–T4 souzní do jedné iterace; jen 1× L ekvivalent = generalizace rebuildu, který je drobná nadstavba hotové M5-1 infrastruktury). Odůvodnění §6. | §6 | split-trigger plán; M5-1 hotová |
| M6-D11 | **SAVE_VERSION zůstává 3.** `unlockedTechs` undefined-guard při loadu (precedent `projectQueue` load.js:189, `ownedCompanies` load.js:199) → starý save bez `unlockedTechs` = `{}` = žádné tech modifikátory. Žádná migrace pole. | §1.5 | load.js:189-201, schema.js |

---

## 1. T1 — Tech strom: sektory, techy, techCap, unlockedTechs, buyTech

### 1.1 Model (doložitelný z originálu)

Originál `techs.js` + `original_source_doc §6` definuje:
- **Sektory** s `curLevel`, `scale`, `exp`, `cap`, `points` (sectorid `sector_agriculture`, …; scholarLevels = `['agriculture','civil','crafts','forestry','medicine','military']`, techs.js:70).
- **Cena úrovně sektoru**: `calcCap(sector) = round(techBase × scale^curLevel)` = `round(100 × 1.25^curLevel)` (techs.js:37, techBase=100, scale=1.25).
- **techPt** = globální měna (`increasePt`/`spendPt`, techs.js:20-32); v naší architektuře resource s vlastním handlerem (`handlers.js:74`).
- Originál má **dvě** progresní osy (per-sektor `points` z exp + globální `techPt`). Pro M6 min. hratelnou sadu **sjednocujeme na jednu měnu `techPt`** (research produkuje `techPt`, `buyTech` ho utrácí). Per-sektor `points`/`exp` zůstávají interní pro produkci techPt (§3). To je **approximace** (G-LISTTECHS), kalibrace M9.

### 1.2 techCap — vzorec JIŽ EXISTUJE (M6-D1)

**NIC se nepřidává do `formulas.js`.** `techCap(level)` (formulas.js:31) je `Math.round(100 * Math.pow(1.25, level))`, ověřeno proti `original_source_doc §6` („`cost = round(techBase × scale^curLevel)`, techBase=100, scale=1.25") a originálu `techs.js:37`. **Doložitelnost = HOTOVÁ.**

- Coder reuse: `import { techCap } from '../balance/formulas.js'`.
- Tabulkový test (povinný, T-TEST): `techCap(0)===100`, `techCap(1)===125` (round(125)), `techCap(2)===156` (round(156.25)), `techCap(3)===195` (round(195.3125)), `techCap(10)===931` (round(100×1.25^10=931.32)). Reference z originálního vzorce, ne z hraní (D2 arch).
- `techScale=1.25`, `techBase=100` jsou v `techs.json._meta`/`techs.techBase/techScale` (data) — ALE vzorec je pevně 100/1.25 ve formulas.js; pokud chce balancér jiné base/scale, dodá `techCap` variantu s parametry v M9 (gap G-TECHCAP-PARAM, neblokuje M6).

### 1.3 Stav: `unlockedTechs` (M6-D2)

Nové pole `state.player.unlockedTechs` = **plain object** `{ [techId]: true }`:

```
state.player.unlockedTechs = { "agriculture_irrigation": true, "crafts_bookkeeping": true }
```

- **Plain object, ne Set** (Set serializuje jako `{}` — viz poznámka v `buildings.js:198` o Map). Deterministické iterační pořadí klíčů není potřeba pro korektnost (fold §2.1 řadí `sort by (source,id)`, M-3), ale pro hashState stabilitu je object stabilní.
- Inicializace v `createPlayerState()` (createHomeState.js): `unlockedTechs: {}`.
- **Žádné per-sektor `points`/`exp` zde** — to je v `state.player.research` (§3.1, separátní sub-strom pro academy systém).

### 1.3a (M-1, ZÁVAZNÉ T-002a) — `createPlayerState` init: přesný tvar + fresh-vs-load determinismus test

**Problém (ověřeno proti kódu).** `createPlayerState` (createHomeState.js:64-66) dnes vrací **plochý objekt**:

```
export function createPlayerState() {
  return { gold: 0, techPt: 0, inventory: {}, taxRate: 1, totWarriors: 0, totArchers: 0, diseaseFromColdChance: 0 };
}
```

**Bez** `unlockedTechs` a `research`. Persist/load (M6-D11, §1.5, §3.4) používá undefined-guard precedentu (`ownedCompanies` load.js:199, `projectQueue` load.js:189): starý/nový save bez pole → po loadu pole = `{}`/`{sectors:{}}`. ALE fresh hra by měla `state.player.unlockedTechs === undefined` (a `research === undefined`), kdežto load = `{}`/`{sectors:{}}`. Protože `hashState` = `JSON.stringify(state)` zahrnuje player blok, **`undefined` (klíč chybí) ≠ `{}` (klíč přítomen, prázdný objekt)** → **fresh hashState ≠ load(save(fresh)) hashState** = třída bugu DR-012-02 na player úrovni.

**Závazný edit (coder, krok T1.1 / T3.1).** `createPlayerState` MUSÍ inicializovat oba klíče přesně takto:

```
export function createPlayerState() {
  return {
    gold: 0, techPt: 0, inventory: {}, taxRate: 1,
    totWarriors: 0, totArchers: 0, diseaseFromColdChance: 0,
    unlockedTechs: {},               // M6 T1 — { [techId]: true }; plain object (serializovatelné, deterministické)
    research: { sectors: {} },       // M6 T3 — { sectors: { [sectorId]: { level, exp } } }; lazy per sektor
  };
}
```

- **Umístění oba na `state.player`** (NE `state.home`). Review m-1/M-1 „rozhodni: player" → **rozhodnuto: player** (konzistentní s `techPt`, který je `state.player.techPt`). Tím odpadá nejednoznačnost §3.1 „doporučeno player".
- **Přesný tvar `research`**: `{ sectors: {} }` na top-levelu (sektory vznikají lazy při první akumulaci, §3.2). NE `{}` ani `{ sectors: {}, ... }` — přesně `{ sectors: {} }`, aby fresh === load (load init dá `{ sectors: {} }`, §3.4).
- **Čtecí strany defenzivně** (`?? {}`): `addTechModifiers` čte `state.player.unlockedTechs ?? {}` (§2.2), `selectTechTree` čte `s.player.unlockedTechs ?? {}` (§5.1), `selectResearchProgress` čte `s.player.research?.sectors ?? {}` (§5.1). Defenzíva je belt-and-suspenders; **init v `createPlayerState` je primární záruka determinismu** (defenzíva sama desync NEřeší — `undefined` vs `{}` rozdíl je v serializaci stavu, ne ve čtení).

**Povinný fresh-vs-load determinismus test (T-TEST, ZÁVAZNÝ).** Rozšíření existujícího round-trip vzoru (M5-1 `test/m5-buildings-t4.test.js`):

```
test: "fresh state hashState === load(save(fresh)) hashState (0 techů, 0 research)"
  s0 = createInitialState()            // fresh: createPlayerState dá unlockedTechs:{}, research:{sectors:{}}
  // (volitelně initRng(s0) pro paritu s běžným bootem; bez katalogů)
  blob = save(s0)                       // persist allowlist: unlockedTechs raw + research + modifiers
  s1 = load(blob)                       // load: undefined-guard → {} / {sectors:{}}
  assert hashState(s0) === hashState(s1)   // MUSÍ být identické; jinak DR-012-02 desync
```

- **Akceptační kritérium M-1**: tento test je zelený **i s 0 odemčenými techy a 0 research progress** (nejcitlivější případ — právě tam se projeví `undefined` vs `{}`). Bez init v `createPlayerState` test SELŽE (fresh nemá klíč, load ano).
- **Druhá varianta testu (doporučeno)**: po N×`buyTech` na fresh stavu → save → load → hashState identický (round-trip s nenulovým `unlockedTechs`, ověří i tech modifikátor re-gen přes `rebuildBuildingDerived` (b2), §2.3). To je R1 mitigace (§8).

### 1.4 `buyTech(techId)` command (M6-D3)

Nový soubor `src/core/commands/buyTech.js`, registrace `'buyTech'`. Vzor přesně `buyCompany.js` (idempotency guard + canAfford + pay bez ctx + mark owned).

```
buyTech(state, params):
  techId = params.techId
  1. validace: typeof techId==='string' && techId            → else {ok:false,error}
  2. tech = findTech(techId)  // z techs.json tree (catalog), §4.2
     if !tech: return {ok:false, error:'unknown tech'}
  3. already-unlocked guard: if unlockedTechs[techId]: return {ok:false, error:'already unlocked'}  (idempotence)
  4. prereqs: ∀ p in (tech.prereqs ?? []): unlockedTechs[p] === true   → else {ok:false, error:'prereq missing: '+p}
  5. cost = { techPt: techCap(tech.level) }                   // §1.2; tech.level z dat (per-tech level v sektoru)
  6. if !canAfford(state, cost): return {ok:false, error:'insufficient techPt'}
  7. pay(state, cost, 'tech:'+techId)                         // bez ctx — G-BUILD-TXAUDIT třída (M-4 M5-1)
  8. unlockedTechs[techId] = true
  9. applyTechModifiers(state)                                // §2.2 — přidá tech modifikátory + invalidate + recalc
  10. return {ok:true}
```

- **Krok 9 NEvolá celý `rebuildDerived`** (to by zbytečně re-generovalo i budovy); volá cílený `applyTechModifiers(state)` (§2.2), který je delta-ekvivalent jedné větve `rebuildDerived`. ALE: `applyTechModifiers` MUSÍ být **stejná fn**, kterou volá i `rebuildDerived` (§2.3) → žádná druhá implementace (M5-1 §4.7 princip). Detail v §2.2/§2.3.
- **Cena přes techPt** (handlers.js:74 — `techPt` handler existuje, `canAfford`/`pay` ho rozliší přes `resourceKindOf` → `'techPt'`, handlers.js:181). Žádný nový handler.
- **Command bez ctx** (dispatch.js:44-59 volá `handler(state, params)`): `pay` bez ctx je optional (transactions.js, ověřeno M5-1 M-4) → techPt se odečte, vynechá se jen tx audit. Gap **G-TECH-TXAUDIT** = stejná třída jako G-BUILD-TXAUDIT, dořeší se zavedením ctx do command vrstvy (M9 / vlastní iterace). Neblokuje.

### 1.5 Persist `unlockedTechs` (M6-D6, M6-D11)

- **`persistSchema.js`**: přidat `'unlockedTechs'` do `PERSIST_SCHEMA.player` (řádek 11 — vedle `gold`, `techPt`, `inventory`, …). `applyPersist` player blok (persistSchema.js:70-77) ho uloží automaticky (generický loop přes `PERSIST_SCHEMA.player`). `state.player.unlockedTechs` je plain object → serializovatelné as-is.
- **`load.js`** player blok (load.js:95-99) ho načte automaticky (generický loop). Undefined-guard: starý save bez `unlockedTechs` → pole zůstane `{}` z `createPlayerState` (load merge nepřepíše). **SAVE_VERSION zůstává 3**, žádná migrace (precedent: `projectQueue` load.js:189, `ownedCompanies` load.js:199 — undefined-guard, ne migrace).
- **research sub-strom** (§3.1) persist: viz §3.4.
- **NEUKLÁDÁ se**: tech modifikátory jako separátní pole (jsou v `catalogState.modifiers`, ukládají se tam), `techCap` hodnoty, derivované efekty.

---

## 2. T2 (KRITICKÉ) — Techy jako modifikátory K13 PLNĚ + generalizace re-derivace

### 2.1 Tvar tech modifikátoru (M6-D4)

Tech efekty žijí ve **STEJNÉM** `state.catalogState.modifiers` jako budovy (M5-1 §4.3), čtené stejným `effective(itemId, attr, state)` (buildings.js:120). Tvar **přesně dle arch §5.3 řádek 297**:

```
modifier = { id: 'tech:<techId>:<attr>:<op>',   // DETERMINISTICKÝ, per-(tech,attr,op)
             source: 'tech:<techId>',           // arch §5.3:297 přesně 'tech:bookKeeping'
             target: '<itemId>',                // CÍL efektu (job/budova/resource attr), NE techId
             attr: '<attr>',                     // dot-path pro mapové attr (M5-1 §4.1)
             op: 'add'|'mul'|'set',
             value: <number> }
```

- **`target` = cílová položka, kterou tech ovlivňuje** (např. `target:'baker'`, `attr:'products.bread'`, `op:'mul'`, `value:1.15` — přesně příklad arch §5.3:297). Tím tech modifikuje `effective('baker','products.bread',state)`. To je rozdíl proti building modifikátorům, kde `target===buildingId` (self). Tech může cílit na cokoli (job, budovu, resource kapacitu).
- **Datový tvar `tech.effects` v `techs.json`** (kanonický, pole atomů s `target`):

```
"effects": [
  { "target": "baker",     "attr": "products.bread", "op": "mul", "value": 1.15 },
  { "target": "lumberjack", "attr": "efficiency",     "op": "add", "value": 0.1 },
  { "target": "granary",   "attr": "storage.food",   "op": "add", "value": 100 }
]
```

- **Fold determinismus** je už zajištěn: `effective`/`fold` (buildings.js:64) řadí `sort by (source,id)` (M-3) PŘED foldem → tech i building modifikátory se skládají deterministicky nezávisle na insertion order. **`set` poslední po sortu vyhrává.** Žádná změna fold logiky — jen přibude druhý zdroj do téhož pole.
- **Multiplicita**: tech je odemčen **jednou** (`unlockedTechs[id]===true`, ne počet). Žádné `created` násobení (na rozdíl od budov M5-1 §4.3). `value` = doslova hodnota z dat. → tech modifikátor je triviálnější než building.

### 2.2 `addTechModifiers(state)` / `applyTechModifiers(state)` (M6-D4)

Nové fns v `buildings.js` (vedle `addBuildingModifiers`, aby sdílely `removeAllBuildingSourcedModifiers` vzor a `invalidateModifiers`):

```
// odebere VŠECHNY modifikátory se source.startsWith('tech:'), znovu vygeneruje z unlockedTechs
removeAllTechSourcedModifiers(state):
  mods = state.catalogState.modifiers
  filtruj OUT mods kde typeof source==='string' && source.startsWith('tech:')   // in-place compact, vzor buildings.js:359

addTechModifiers(state):                       // čistá vůči RNG; čte unlockedTechs + catalog techs
  // ── M-2 (ZÁVAZNÉ T-002a) defenzivní guard: chybějící techs katalog ──
  if !hasCatalog('techs'): return              // no-op když katalog nenačten (createInitialState/boot/testy)
  const unlocked = state.player.unlockedTechs ?? {}   // defenzíva (init §1.3a je primární)
  const mods = state.catalogState.modifiers
  for techId in Object.keys(unlocked) where unlocked[techId]===true:
    const tech = findTech(techId)               // catalog, §4.2; vrací null když chybí
    if (!tech) continue                         // ── M-2: NIKDY nečti tech.effects na null → žádný crash ──
    for atom in (tech.effects ?? []):           // atom = {target, attr, op, value}
      mods.push({
        id: `tech:${techId}:${atom.target}:${atom.attr}:${atom.op}`,   // FINÁLNÍ tvar s targetem (n-1) — unikátní per (tech,target,attr,op)
        source: `tech:${techId}`,
        target: atom.target,
        attr: atom.attr,
        op: atom.op === 'mul' ? 'mul' : atom.op === 'set' ? 'set' : 'add',
        value: typeof atom.value==='number' ? atom.value : 0
      })

applyTechModifiers(state):                      // delta cesta volaná z buyTech (§1.4 krok 9)
  removeAllTechSourcedModifiers(state)
  addTechModifiers(state)
  invalidateModifiers(state)                     // bump _modVersion (buildings.js:190)
  recalcBuildingAggregates(state)                // techy mohou měnit agregáty (workers/storage/attractiveness budov) → přepočti
```

- **`id` kolize guard**: pokud jeden tech má 2 atomy se stejným `(attr,op)` ale různým `target`, `id` `tech:${techId}:${attr}:${op}` by kolidoval. **Kanonické řešení: `id` zahrne i target** → `id = 'tech:'+techId+':'+atom.target+':'+atom.attr+':'+atom.op`. Tím je `id` unikátní per (tech,target,attr,op), deterministický, stabilní. (Building `id` má target===buildingId implicitně, proto ho neobsahuje; tech musí.) **Coder: použij `id` s targetem.**
- `removeAllTechSourcedModifiers` + re-add = **idempotentní** (opakované `applyTechModifiers` dá stejný výsledek; žádná akumulace duplicit). Modifikátory z `source.startsWith('building:')` zůstanou **nedotčené** (filtr je `tech:`).
- **`recalcBuildingAggregates`**: techy mohou cílit na budovy (např. `+storage`), proto se po tech změně přepočtou agregáty (buildings.js:387 — JEDNA cesta, M-1). Pokud tech cílí na job efektu (např. `baker` products), agregát budov se nezmění, ale volání je levné a drží invariant (vzor `applyRepair` buildings.js:731).

### 2.3 Generalizace: JEDNA re-derivační cesta `rebuildDerived(state)` (M6-D5 — KRITICKÉ)

**Dnes** (buildings.js:475) `rebuildBuildingDerived(state)` re-aplikuje **jen budovy**: (a) created z instances, (b) re-gen `building:*` modifikátorů, (c) invalidate, (d) `recalcBuildingAggregates`, (e) workforce.total. Volá se z `load.js:285` Step 5 i z mutací budov (buildings.js:553/701/731). **Tech modifikátory zatím NEexistují, takže po loadu by se NEre-aplikovaly** → kdyby coder přidal tech re-aplikaci jen do load.js (load-only větev), vznikne **přesně třída bugu DR-012-02** (fresh hra a load se rozejdou).

**Rozhodnutí (M6-D5): rozšířit `rebuildBuildingDerived` o tech větev → jedna sdílená fn re-aplikující budovy I techy.** Konkrétní návrh (volba A, zvolená):

```
// buildings.js — ROZŠÍŘENÍ existující fn (NE nová paralelní fn)
rebuildBuildingDerived(state):                 // jméno PONECHAT (volá ho load.js:285, createInitialState:133, mutace) — žádný rename ripple
  // (a) created re-derivace z instances.length        — beze změny (M5-1)
  // (b) re-gen BUILDING modifikátorů:
  //       removeAllBuildingSourcedModifiers(state)
  //       for buildingId where created>0: addBuildingModifiers(state, buildingId)
  // (b2) ── NOVÉ ── re-gen TECH modifikátorů (foldem unlockedTechs):
  //       removeAllTechSourcedModifiers(state)
  //       addTechModifiers(state)
  // (c) _modVersion reset 0 → invalidateModifiers → version=1  — beze změny (zajišťuje hashState identitu)
  // (d) recalcBuildingAggregates(state)                — beze změny (JEDNA cesta; čte effective() = building+tech fold)
  // (e) workforce.total = deriveWorkforceTotal(state)  — beze změny
```

- **Proč rozšířit stávající fn (volba A), ne přidat samostatné volání `addTechModifiers` do load.js (volba B)**: volba B = tech re-aplikace jen v load → load-only větev → DR-012-02. Volba A = tech re-aplikace ve **stejné** fn, kterou volají i mutace (`completeBuild`/`destroyInstance`/`applyRepair` přes buildings.js:553/701/731) i `createInitialState:133` i `buyTech` (přes `applyTechModifiers`, který je podmnožinou téže logiky). **Jediná cesta.** Volba A zvolena.
- **Pojmenování**: brief navrhuje `rebuildDerived` NEBO `addTechModifiers do téhož rebuildu`. **Zvoleno: ponechat jméno `rebuildBuildingDerived`** a jen ho rozšířit o krok (b2) — protože ho importuje `load.js:11`, `createInitialState.js:10`, a interně mutace. Rename na `rebuildDerived` by vyžadoval změnit 3 import-site + JSDoc; čistota „budovy I techy v jedné fn" je splněna i bez renamu. *(Alternativně může coder přidat tenký alias `export const rebuildDerived = rebuildBuildingDerived` pro čitelnost call-site `buyTech`/`load`; volitelné, neblokuje. Jméno funkce je interní detail; invariant „jedna cesta" je splněn rozšířením o (b2).)*
- **`applyTechModifiers` (§2.2) vs. krok (b2)**: aby NEvznikly dvě implementace tech re-genu, **krok (b2) `rebuildBuildingDerived` MUSÍ volat tytéž helpery** `removeAllTechSourcedModifiers` + `addTechModifiers` (ne vlastní inline). `applyTechModifiers` (buyTech delta cesta) = `removeAllTechSourced + addTech + invalidate + recalc`; krok (b2) = `removeAllTechSourced + addTech` (invalidate/recalc dělá `rebuildBuildingDerived` jednou na konci v (c)/(d)). **Sdílené atomy = jeden zdroj pravdy** pro tech fold. Reviewer gate: grep, že `addTechModifiers`/`removeAllTechSourcedModifiers` jsou volány JEN z `rebuildBuildingDerived` (b2) a z `applyTechModifiers` — nikde jinde inline.

### 2.4 Round-trip identita budov (žádná regrese M5-1)

- Krok (b2) přidává tech modifikátory, ALE krok (b) budov je **beze změny** → building modifikátory se generují identicky jako v M5-1. `recalcBuildingAggregates` (d) čte `effective()` = fold building+tech; pokud `unlockedTechs={}` (fresh hra bez techů / starý save), `addTechModifiers` je no-op → výsledek **bit-identický s M5-1**. M5-1 round-trip testy (M5-1 §4.8 T4.6) zůstávají zelené.
- **Determinismus**: `effective`/`fold` řadí `sort by (source,id)`; `building:*` < `tech:*` lexikograficky → stabilní pořadí. Load i fresh hra dají bit-identické agregáty (K16).
- **Save = jen `unlockedTechs` + `catalogState.modifiers`** (M6-D6). `catalogState.modifiers` se ukládá celý (persistSchema.js:53), obsahuje building **i** tech modifikátory. Po loadu `rebuildBuildingDerived` (load.js:285) **re-generuje OBOJE z pravdy** (instances + unlockedTechs) → uložené `modifiers` se efektivně přepočtou (load Step 5 je `removeAll + re-add` pro oba zdroje). Tj. uložené modifikátory jsou redundantní s `unlockedTechs`+`buildings`, ale uloží se (allowlist je celý `catalogState`); load je nepoužije „naslepo", přepočte je. **To je v pořádku a žádaný stav** (žádná load-only větev; fold se počítá jedinou cestou — arch §6.4 krok 5).

### 2.5 Invarianty (review gate T2)

- **Žádná ad-hoc cesta tech efektů**: tech efekt NIKDY nemutuje katalog ani nepřičítá hodnoty mimo `catalogState.modifiers`. Reviewer grep: žádný `state.home.*` ani `state.player.*` zápis z tech efektu mimo `unlockedTechs` a `techPt`.
- **Žádná load-only / tech-only větev**: `addTechModifiers` volán JEN z `rebuildBuildingDerived` (b2) + `applyTechModifiers`; `applyTechModifiers` volán JEN z `buyTech`. Reviewer grep.
- **`effective` beze změny**: T2 NEMĚNÍ `effective`/`fold` — jen přidává záznamy do `modifiers`. effective už techy umí číst (filtruje `m.target===itemId && m.attr===attr` bez ohledu na source, buildings.js:146).

### 2.6 (M-2, ZÁVAZNÉ T-002a) — Catalog API kontrakt + defenzivní guard proti chybějícímu `techs` katalogu

**Problém (ověřeno proti kódu).** `rebuildBuildingDerived` (buildings.js:475) se volá z `createInitialState.js:133` (řádek `rebuildBuildingDerived(state)`) — tedy **i při bootu a v testech BEZ načtených katalogů** (`loadAllCatalogs` je async; mnoho testů konstruuje stav přes `createInitialState` bez katalogu — viz precedent fallbacku v `createInitialState.js:139` komentář a `getJobsCatalog`/`workerSlots` fallback v `jobs.js:33,48`). Po rozšíření o krok (b2) zavolá `rebuildBuildingDerived` → `addTechModifiers` → `findTech(techId)` → `getCatalog('techs')`. **`getCatalog` (loader.js:48-52) HODÍ `Error` když katalog není načten** (`if (!cat) throw`). Bez guardu by tedy starý save s odemčeným techem (`unlockedTechs` neprázdné) spadl v `createInitialState`/load i v jakémkoli testu bez `techs` katalogu → tvrdá regrese.

**Catalog API kontrakt (ověřeno proti `catalog/index.js` + `loader.js`).**

| API | Chování | Použití v M6 |
|---|---|---|
| `hasCatalog(name)` | `loader.js:59-61` — `Object.prototype.hasOwnProperty.call(_store, name)`; **nikdy nehodí**, vrací bool | guard PŘED `getCatalog` |
| `getCatalog(name)` | `loader.js:48-52` — vrací katalog, **HODÍ `Error` když nenačten** | volat JEN po `hasCatalog===true` |

Oba jsou re-exportované z `catalog/index.js:2` (`export { ... getCatalog, hasCatalog ... } from './loader.js'`). Import v `buildings.js` je již přítomen (`hasId` se importuje ze stejného modulu — buildings.js používá `import { ... hasId, byId } from '../catalog/index.js'`); coder přidá `hasCatalog, getCatalog` do téhož importu.

**Závazný guard (coder, krok T2.1 / T4.1) — DVĚ úrovně, obě POVINNÉ:**

1. **`addTechModifiers(state)` — early-return guard** (buildings.js, §2.2): hned na začátku
   ```
   if (!hasCatalog('techs')) return;   // no-op když katalog nenačten → createInitialState/boot/test neprojde do findTech
   ```
   Tím je rebuild **bezpečný i s neprázdným `unlockedTechs`** v prostředí bez katalogu (no-op = žádné tech modifikátory, žádný crash; po načtení katalogu a dalším `rebuildBuildingDerived` se modifikátory dogenerují).

2. **`findTech(techId)` — null-safe + smyčka `if(!tech)continue`** (§4.2): `findTech` má **vlastní** `if(!hasCatalog('techs')) return null` (belt-and-suspenders) a `addTechModifiers` smyčka MUSÍ mít:
   ```
   const tech = findTech(techId);
   if (!tech) continue;             // NIKDY nečti tech.effects na null → žádný crash při chybějícím/přejmenovaném techu
   ```
   Tím je odolné i vůči případu, kdy katalog JE načten, ale konkrétní `techId` v něm chybí (např. starý save s techem, který byl z `techs.json` odstraněn).

**Precedent v kódu (stejný defenzivní vzor).** `addBuildingModifiers` / `recalcBuildingAggregates` používají `if (!hasId(buildingId)) continue;` (buildings.js:398) — přesně stejná třída guardu (skip položky, která není v katalogu). `effectFromCatalog` (buildings.js:238) `if (!hasId(buildingId)) return 0;`. M6 tech guard je analogický, jen na úrovni katalogu `techs` (`hasCatalog`) + položky (`if(!tech)continue`).

**Akceptační kritérium M-2.** Test `createInitialState()` BEZ načteného `techs` katalogu **nesmí spadnout** — ani s prázdným `unlockedTechs`, ani (po `unlockedTechs[x]=true` v testu) s neprázdným. Druhý test: `clearCatalogs()` → `rebuildBuildingDerived(stateWithUnlockedTech)` nehodí (early-return v `addTechModifiers`). Bez guardu test SELŽE (`getCatalog('techs')` hodí).

### 2.7 (m-3, ZÁVAZNÉ T-002a) — Prokazatelná `effective()` cesta + překalibrace demo techů

**KLÍČOVÉ ZJIŠTĚNÍ (ověřeno proti kódu).** Tech `mul`/`add` na produkční atribut funguje JEN když produkční systém čte cílovou hodnotu přes `effective(target, attr, state)`. Ověření čtecích cest:

| Systém | Čte přes `effective()`? | Místo | Důsledek pro tech |
|---|---|---|---|
| `jobsProduction` (job produkce) | **NE** — `def.products` čte **přímo z katalogu** (`getJobsCatalog(ctx)` → `def.products`, jobs.js:101,108,127) | jobs.js:107-130 | tech `{target:'baker',attr:'products.bread',op:'mul'}` = **TICHÝ NO-OP** (effective se na produkci nevolá) |
| `jobsProduction` efficiency | **NE** — používá `state.home.workerEfficiency` globálně (jobs.js:104), ne `effective(job,'efficiency')` | jobs.js:104,121 | tech `{target:'farmer',attr:'efficiency',op:'add'}` = **TICHÝ NO-OP** |
| `recalcBuildingAggregates` → `workers` / `attractiveness` / `storage.*` | **ANO** — `effective(buildingId, attr, state)` | buildings.js:411 (`const val = effective(buildingId, attr, state)`) | tech `add` na tyto attr **PROKAZATELNĚ** mění `home.derived` |
| `workerSlots` (jobs) konzumuje `derived.maxWorkers` | nepřímo (přes agregát výše) | jobs.js:62 (`state.home.derived?.maxWorkers`) | tech na `workers` budovy → víc worker slotů |
| `housing` konzumuje `derived.attractiveness` | nepřímo (přes agregát výše) | buildings.js:446 pozn. (`housing.js` čte `derived.attractiveness`) | tech na `attractiveness` budovy → settlementLevel/migrace |

**Závěr: jediná dnes PROKAZATELNÁ cesta tech efektu vede přes building agregáty** (`recalcBuildingAggregates` → `effective()` → `home.derived.{maxWorkers,attractiveness,storageCapacity}`). Job produkce (`products`, `efficiency`) NEčte přes `effective()` → tech na ně je tichý no-op (ladí se až v M9, kdy se produkce přepojí na `effective()`).

**Důležitý detail agregace (ověřeno buildings.js:407).** `recalcBuildingAggregates` agreguje **JEN `atom.op==='add'`** atomy (`if (atom.op !== 'add') continue;`), a JEN pro budovy s `created>0` (buildings.js:397). Tedy **demo tech MUSÍ**: (a) cílit na **budovu** (ne job), (b) na atribut `workers` | `attractiveness` | `storage.<resource>`, (c) `op:'add'`, (d) budova musí být postavená (`created>0`), aby se efekt projevil v `home.derived`. *(Pozn.: `effective()` foldne i `mul`/`set` tech modifikátory korektně, ale `recalcBuildingAggregates` je do agregátu nezapočítá — započítá je jen u `add`. Pro demo proto `add`.)*

**Překalibrované demo techy (ZÁVAZNÉ, nahrazují produkčně-cílené příklady v §4.3).** **OVĚŘENO proti `src/data/buildings.json`** — reálné budovy s `add` efekty na agregované atributy: `granary` (`storage.food` +200), `warehouse` (`storage.goods` +500), `townCenter` (`attractiveness` +50, `workers` +10), `well` (`attractiveness` +5), `workerHouse` (`workers` +5). **Pozn.: žádná budova `house` neexistuje** (původní příklad v §4.3 `target:"house"` byl chybný — opraveno níže). Min. 2 techy s **prokazatelnou** `effective()` cestou cílí na tyto reálné budovy:

```
{ "id":"agriculture_granaries", "sector":"agriculture", "level":1, "name":"Larger Granaries",
  "prereqs":[], "provenance":"approximated",
  "effects":[ { "target":"granary", "attr":"storage.food", "op":"add", "value":200 } ] },
  // target 'granary' OVĚŘEN (buildings.json: granary má storage.food add 200)
  // → effective('granary','storage.food') foldne tech add → recalcBuildingAggregates (buildings.js:411,417-419)
  //   → home.derived.storageCapacity.food +200  (jen když je postavena ≥1 granary; jinak no-op = korektní)

{ "id":"civil_attractiveness", "sector":"civil", "level":0, "name":"Civic Pride",
  "prereqs":[], "provenance":"approximated",
  "effects":[ { "target":"well", "attr":"attractiveness", "op":"add", "value":3 } ] }
  // target 'well' OVĚŘEN (buildings.json: well má attractiveness add 5)
  // → effective('well','attractiveness') foldne tech add → recalcBuildingAggregates (buildings.js:411,415)
  //   → home.derived.attractiveness +3 → housing.js settlementLevel/migrace (jen když je postaven ≥1 well)
```

- **Demonstrovatelnost bez M9 (DoD „tech mění chování")**: T-TEST coder-gate — postav budovu (`granary`, resp. `well`) → změř `home.derived.storageCapacity.food` (resp. `home.derived.attractiveness`) → `buyTech('agriculture_granaries')` (resp. `civil_attractiveness`) → `home.derived` se PROKAZATELNĚ zvýší o tech `value`. To je proveditelné bez jakéhokoli M9 obsahu, čistě přes `effective()` → `recalcBuildingAggregates` cestu, kterou volá `applyTechModifiers` (§2.2 krok recalc).
  - **Přesný cíl assertu — ověřené targety** (buildings.json): `granary`/`storage.food`, `warehouse`/`storage.goods`, `townCenter`/`attractiveness`+`workers`, `well`/`attractiveness`, `workerHouse`/`workers`. Coder zvolí libovolný z těchto (budova musí být postavitelná v testu). `well`/`attractiveness` nebo `granary`/`storage.food` doporučeny (jednoduchá budova, levný build). `townCenter` může být postaven od startu (ověř BALANCE.start) → vhodný i bez explicitního buildu.
- **Ostatní techy v sadě** (job-cílené: `farmer.efficiency`, `baker.products.bread`, `lumberjack.efficiency`, `warrior.upkeep` v §4.3) zůstávají v `techs.json` jako **approximated**, ale jsou označeny jako **tichý no-op do M9** (gap **G-TECH-JOB-EFFECTIVE**: produkce job systému nečte přes `effective()`; přepojení = M9 nebo vlastní iterace). NEblokují M6 — slouží jako strom/UI obsah; funkční demonstrace stojí na 2 building-cílených techech výše.
- **m-2 (minor) potvrzeno**: tech efekt na **job** se NEpromítne do `home.derived` (agregát čte jen budovy), a navíc se ani nepromítne do produkce (job produkce nečte `effective()`). Tech efekt na **budovu** (`add` na workers/attractiveness/storage) se promítne do `home.derived` přes `recalcBuildingAggregates` (jediná cesta, buildings.js:387) → konzumováno `workerSlots`/`housing`. Coder tedy NEhledá „kde se baker bonus aplikuje" — víme, že se (zatím) neaplikuje, a demo stojí na building cestě.

**Aktualizace §4.3 (data).** Min. sada `techs.json` MUSÍ obsahovat ≥2 building-cílené `add` techy výše (`agriculture_granaries` na `storage.food`, `civil_planning` na `house.attractiveness`) jako **prokazatelně funkční**. Job-cílené techy ze §4.3 zůstávají jako obsah s gap G-TECH-JOB-EFFECTIVE. Reviewer gate: ≥1 tech, jehož `(target,attr,op)` je `(budova, workers|attractiveness|storage.*, add)` a `target` je postavitelná budova → demonstrovatelná funkčnost.

---

## 3. T3 — Academy/university: research progres + techPt produkce

### 3.1 Stav: `state.player.research` (M6-D7)

Nový sub-strom (per sektor exp/level):

```
state.player.research = {
  sectors: {
    [sectorId]: { level: number, exp: number }   // sectorId = 'agriculture'|'civil'|'crafts'|'forestry'|'medicine'|'military' (techs.js:70)
  }
}
```

- Init v `createPlayerState`: `research: { sectors: {} }` (lazy: sektor vzniká při první akumulaci, jako jobs M3).
- `techPt` zůstává `state.player.techPt` (existující resource, handlers.js:74). Research produkuje `techPt` při level-upu sektoru.
- **NEukládá se** `cap` (derivát = `techCap(level)`), `progPct` (derivát). Ukládá se jen `level`+`exp` per sektor (§3.4).

### 3.2 `research.daily` systém (M6-D7)

Nový modul `src/core/systems/research.js`, fn `researchDaily(state, _params, ctx)`. Registrace `'research.daily'`, edge **`day`**, order **75** (po `buildings.age` order 70; před month systémy). Port `techs.js:46-138`, determinizováno (BEZ `Math.random`).

```
researchDaily(state, _params, ctx):
  // (1) exp body z jobů per kategorie (techs.js:54-60)
  expPoints = {}  // sectorId → 0
  for jobId, job in state.home.jobs where job.number>0:
    def = catalog job byId
    if def.category:                                 // 'bum' nemá kategorii (techs.js:56)
      sectorId = def.category                          // kategorie jobu == sektor (agriculture/crafts/…)
      expPoints[sectorId] += job.number

  // (2) academy/university budovy → bonus exp (approximace originálu university scholars)
  //     academyExp = effective('academy','researchExp',state) * academy.created   (gap G-RESEARCH-ACADEMY)
  //     university analogicky (university.created); efekt přes effective/modifiers (NE ad-hoc)
  for each researchBuilding in ['academy','university'] where created>0:
    perBuilding = effective(buildingId,'researchExp',state)    // katalog atribut; 0 pokud chybí
    // rozdělit rovnoměrně do sektorů NEBO do sektoru dle building.researchSector (data); min. sada: do všech sektorů +perBuilding
    for sectorId in SECTOR_IDS: expPoints[sectorId] += perBuilding * created

  // (3) akumulace + level-up (techs.js:104-134, determinizováno)
  for sectorId, p in expPoints where p>0:
    sec = state.player.research.sectors[sectorId] ?? {level:0, exp:0}   // lazy init
    sec.exp += p
    cap = techCap(sec.level)                          // §1.2 čistý vzorec
    while sec.exp >= cap:                              // while (catch-up-safe: víc level-upů v jedné dávce)
      sec.exp -= cap
      sec.level += 1
      grant(state, { techPt: 1 }, 'research:'+sectorId, ctx, state.engine.curStep)   // +1 techPt per level
      cap = techCap(sec.level)
    state.player.research.sectors[sectorId] = sec
```

- **Determinismus / catch-up-safe**: žádný `Math.random` (originál ho měl jen pro university `gen` bonus, techs.js:84 — **vynechán** v M6, gap **G-RESEARCH-UNIV-RNG**, `provenance:'approximated'`). Vše čisté: jobs + budovy + `techCap`. `while` smyčka řeší více level-upů v dávce. Day-edge (1×/den) → levné v catch-up dávce.
- **`grant` techPt přes ctx**: research je **tick fn** (volaná z periodics s ctx, tickOrder.js:127) → `ctx` JE k dispozici → `grant(state, {techPt:1}, cause, ctx, step)` plně emituje tx audit (na rozdíl od command vrstvy). Vzor `skills.js:48 grant`.
- **Napojení na joby/efficiency**: exp body = `Σ job.number` per kategorie (techs.js:55). Tj. čím víc dělníků v kategorii, tím rychlejší research toho sektoru. Žádné nové napojení na efficiency v min. sadě (gap G-RESEARCH-EFFICIENCY — originál `scholar` profese ×1.25, techs.js:113, vynecháno M6).

### 3.3 Academy/university budovy

- `academy`/`university` jsou **budovy** (buildings.json; original_source_doc §8 maps academy/university). Stavějí se přes existující `build` command (M5-1). Jejich efekt na research = katalogový atribut `researchExp` čtený přes `effective` (§3.2 krok 2). Pokud chybí v buildings.json → gap **G-RESEARCH-ACADEMY** (doplnit min. `researchExp` per academy, `provenance:'approximated'`).
- **Min. hratelná sada**: i bez academy/university produkuje research techPt z jobů (krok 1). Academy/university = akcelerátor (enhancement). Neblokuje „dlouhodobá progrese funkční" DoD.

### 3.4 Persist research (M6-D7)

- `persistSchema.js`: přidat `home`/`player` blok pro `research`. Doporučeno **`state.player.research`** (vedle techPt). Přidat do `applyPersist` player blok per-sektor `{level, exp}` (analogicky `jobs` persistSchema.js:157-165) a do `load.js` player blok (analogicky load.js:149-155). **NEukládat** `cap`/`progPct` (derivát).
- Undefined-guard: starý save bez `research` → `{sectors:{}}` z init. SAVE_VERSION 3.

### 3.5 tickOrder dopady (M6-D7)

- **Nové periodikum** `research.daily`, edge `day`, order **75**. Vloží se do `registerCorePeriodics` (tickOrder.js:145) a do `periodics[]` (tickOrder.js:184). Pořadí v rámci `day` edge: `workerEfficiency(5) < meal1(10) < settlementLevel(20) < world(30) < market(35) < field(40) < mine(50) < burnWood(60) < buildings.age(70) < research.daily(75) < season`. Research po `buildings.age` (academy budovy musí být aktuální) a po jobech (joby běží na `quarterDay`, stav `job.number` je stabilní v rámci dne).
- `register(registry, 'research.daily', researchDaily)` + `{ id:'research.daily', every:'day', order:75, systemFn:'research.daily' }`.
- `TICK_ORDER` konstanta (tickOrder.js:44) beze změny (jde o fáze, ne konkrétní systémy). `tickOrder.md` (living artefact) doplnit poznámku o `research.daily`.
- **Žádný schedule handler** (research je periodikum, ne one-shot). Žádný nový RNG stream (research je deterministický).

---

## 4. G-LISTTECHS — approximovaný tech strom (M6-D8)

### 4.1 Postup (povinné rozhodnutí)

`techs.json` je dnes kostra (`_meta` + prázdné `sectors`/`tree`, `provenance:'approximated'`). G-LISTTECHS (z M1, odložen na M6) se uzavírá takto:

1. **Vzorec techCap = DOLOŽITELNÝ** (existuje, §1.2) — žádná approximace vzorce.
2. **Tech strom = approximovaný** (`provenance:'approximated'`, kalibrace M9): coder doplní `techs.json` o min. hratelnou sadu sektorů + techů + efektů jako modifikátory. Listing techů (`listTechs`) nebyl v extraktu (techs.json `_meta.notes`) → konstruuje se nově s `provenance:'approximated'` per pole.
3. **Wiring do katalogu**: dnes `techs.json` NENÍ v `CATALOG_NAMES` (catalogs.js:10) ani v `ID_CATALOGS` (loader.js:23). Coder přidá:
   - `'techs'` do `CATALOG_NAMES` (catalogs.js).
   - schema validátor pro `techs` (assertCatalogValid) — min. tvar `{techs:{sectors:[], tree:[]}}`.
   - byId indexaci: `tree` items mají `id` → buď přidat `techs` do `ID_CATALOGS` s adaptérem (items jsou pod `cat.techs.tree`, ne `cat.techs`), NEBO dedikovaný `findTech(techId)` helper čtoucí `getCatalog('techs').techs.tree` (jednodušší, neláme `buildById` který čeká `cat[name]` pole). **Doporučeno: `findTech` helper** (§4.2), bez nutnosti měnit `buildById` strukturu. Kolize ID s ostatními katalogy: tech ID prefixovat (`<sector>_<name>`) → nízké riziko, ale `buyTech` validuje přes `findTech`, ne `byId`.

### 4.2 `findTech(techId)` helper

```
// systems/research.js nebo catalog helper
findTech(techId):
  if !hasCatalog('techs'): return null
  tree = getCatalog('techs').techs?.tree ?? []
  return tree.find(t => t.id === techId) ?? null
```

### 4.3 Min. hratelná sada (data shape, `provenance:'approximated'`)

```
techs.json:
{
  "_meta": { "provenance": "approximated", "notes": "G-LISTTECHS resolved M6; approximated tree, M9 calibration", "source": "doc/original_source/services/techs.js" },
  "techs": {
    "techBase": 100, "techScale": 1.25,
    "sectors": [
      { "id": "agriculture", "name": "Agriculture" },
      { "id": "civil",       "name": "Civil" },
      { "id": "crafts",      "name": "Crafts" },
      { "id": "forestry",    "name": "Forestry" },
      { "id": "medicine",    "name": "Medicine" },
      { "id": "military",    "name": "Military" }
    ],
    "tree": [
      { "id":"agriculture_irrigation", "sector":"agriculture", "level":0, "name":"Irrigation",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"farmer","attr":"efficiency","op":"add","value":0.1} ] },
      { "id":"agriculture_crop_rotation", "sector":"agriculture", "level":1, "name":"Crop Rotation",
        "prereqs":["agriculture_irrigation"], "provenance":"approximated",
        "effects":[ {"target":"granary","attr":"storage.food","op":"add","value":100} ] },
      { "id":"crafts_bookkeeping", "sector":"crafts", "level":0, "name":"Bookkeeping",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"baker","attr":"products.bread","op":"mul","value":1.15} ] },
      { "id":"forestry_axes", "sector":"forestry", "level":0, "name":"Better Axes",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"lumberjack","attr":"efficiency","op":"add","value":0.15} ] },
      { "id":"agriculture_granaries", "sector":"agriculture", "level":1, "name":"Larger Granaries",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"granary","attr":"storage.food","op":"add","value":200} ] },      // §2.7 DEMO (prokazatelné: granary OVĚŘEN v buildings.json)
      { "id":"civil_attractiveness", "sector":"civil", "level":0, "name":"Civic Pride",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"well","attr":"attractiveness","op":"add","value":3} ] },         // §2.7 DEMO (prokazatelné: well OVĚŘEN v buildings.json; pův. target:"house" NEEXISTUJE → opraveno T-002a)
      { "id":"military_drill", "sector":"military", "level":0, "name":"Drill",
        "prereqs":[], "provenance":"approximated",
        "effects":[ {"target":"warrior","attr":"upkeep","op":"mul","value":0.9} ] }
    ]
  }
}
```

- **Pravidla sady**: pokrýt mechaniky efektů přes modifikátory — `add` na efficiency, `add` na kapacitu (storage), `mul` na produkci/upkeep, `add` na attractiveness. Každý tech `level` (pro techCap cenu) + `prereqs` (validace řetězce) + `sector` (UI grupování) + `effects` (atomy `{target,attr,op,value}`). `provenance:'approximated'` per tech.
- **Cíle `target` musí existovat v katalogu** — coder ověří proti jobs.json/buildings.json/military.json; pokud cíl chybí, použij existující ID (reviewer gate: tech `target` ∈ známá ID). Efekt na neexistující ID = tichý no-op v `effective` (filtr nic nenajde), neblokuje, ale ladí se na M9. **OVĚŘENO T-002a proti buildings.json**: budovy `granary`(storage.food), `warehouse`(storage.goods), `townCenter`(attractiveness/workers), `well`(attractiveness), `workerHouse`(workers). **`house` NEEXISTUJE** — pův. `target:"house"` v `civil_planning` opraven na `well` (§2.7). Job targety (`farmer`/`baker`/`lumberjack`/`warrior`) existují, ALE job produkce/efficiency NEčte přes `effective()` (§2.7 tabulka) → job-cílené techy jsou tichý no-op do M9 (gap **G-TECH-JOB-EFFECTIVE**). **Prokazatelně funkční (DoD) jsou jen building-cílené `add` techy** (§2.7 demo).
- **Gap-report**: zapsat G-LISTTECHS jako **vyřešený approximací** (vzorec doložitelný, strom approximovaný, kalibrace M9). Žádná eskalace blokeru (DR-013-00 autonomní doběh; tom-proxy informován v shrnutí).

---

## 5. T4 — UI academy/tech strom screen (M6-D9)

### 5.1 Selektory (čisté, žádná logika v UI)

Do `src/ui/selectors.js` (vzor `selectBuildableBuildings` selectors.js:175):

```
selectTechTree(s):                                // dostupné/odemčené techy + cena + prereqs
  if !hasCatalog('techs'): return []
  tree = getCatalog('techs').techs?.tree ?? []
  unlocked = s.player.unlockedTechs ?? {}
  havePt = s.player.techPt ?? 0
  return tree.map(t => {
    const cost = techCap(t.level)
    const prereqsMet = (t.prereqs ?? []).every(p => unlocked[p]===true)
    const isUnlocked = unlocked[t.id]===true
    return {
      id: t.id, name: t.name ?? t.id, sector: t.sector, level: t.level,
      cost,                                         // techPt cena (techCap)
      prereqs: t.prereqs ?? [],
      unlocked: isUnlocked,
      available: !isUnlocked && prereqsMet,         // koupitelný teď (prereqs OK, neodemčený)
      canAfford: havePt >= cost,
      effects: t.effects ?? []                      // pro tooltip/popis
    }
  })

selectResearchProgress(s):                         // research progres per sektor
  sectors = s.player.research?.sectors ?? {}
  catSectors = getCatalog('techs').techs?.sectors ?? []
  return catSectors.map(sec => {
    const st = sectors[sec.id] ?? {level:0, exp:0}
    const cap = techCap(st.level)
    return { id:sec.id, name:sec.name ?? sec.id, level:st.level, exp:st.exp, cap,
             progPct: cap>0 ? Math.min(100, Math.round(st.exp*100/cap)) : 0 }
  })

selectTechPoints(s): return s.player.techPt ?? 0   // pro HUD/screen
```

- **Žádná logika v UI**: selektory počítají cenu (`techCap`), prereqs, progPct; screen jen renderuje a volá `send`. (Stejný princip jako M5-1 build UI.)

### 5.2 `TechScreen` komponenta + tab

Do `src/ui/screens.js` (vzor `BuildScreen`):

```
TechScreen({ snapshot, send }):
  techPt = selectTechPoints(snapshot)
  progress = selectResearchProgress(snapshot)
  techs = selectTechTree(snapshot)
  render:
    - hlavička: "Tech body: {techPt}"
    - research progres: per sektor {name} lvl {level} — progress bar {progPct}% (exp/cap)
    - seznam techů grupovaný dle sector:
        per tech: {name} (cena {cost} techPt), stav:
          - odemčený → "✓ Odemčeno"
          - available && canAfford → tlačítko "Odemknout" → send('buyTech',{techId:t.id})
          - available && !canAfford → disabled "Nedostatek bodů"
          - !available → "Vyžaduje: {prereqs}"
```

- Do `App.js`: přidat tab `{ id:'tech', label:'Výzkum' }` do `TABS` (App.js:17) + `${activeTab==='tech' ? html\`<\${TechScreen} snapshot=\${snapshot} send=\${send} />\` : null}` (App.js:113 vzor). Import `TechScreen` z `screens.js` (App.js:15).
- **send('buyTech',...)** jde přes `dispatch` (main.js:220 `send`); `buyTech` musí být **registrován** v `bootstrapEngine` (§5.3).

### 5.3 Boot wiring (NUTNÉ)

- `src/app/main.js bootstrapEngine` (main.js:89-111): přidat `import { registerBuyTech } from '../core/commands/buyTech.js'` (main.js:24 vzor) + `registerBuyTech(creg)` (vedle `registerBuild(creg)` main.js:106). Bez toho je `buyTech` dark code (UI by dostalo `{ok:false,error:'unknown command'}`).
- `research.daily` se registruje v `registerCorePeriodics` (§3.5) — automaticky v ctx pro testy i runtime.
- `techs` katalog se načte přes `loadAllCatalogs` (§4.1, přidat do `CATALOG_NAMES`).

---

## 6. Split rozhodnutí (M6-D10): SPLIT = NE

**Doporučení: M6 (T1–T4) běží jako JEDNA iterace, bez splitu.**

Odůvodnění (kritérium split-triggeru = „nesouzní do jedné iterace"):
- **T1** (tech strom, buyTech) — M; techCap už existuje, command je 1:1 vzor `buyCompany`. Malé.
- **T2** (techy jako modifikátory) — M; **nejtěžší část je generalizace rebuildu**, ale ta je drobná nadstavba (krok b2 + 2 helpery `addTechModifiers`/`removeAllTechSourcedModifiers`) nad HOTOVOU M5-1 modifier infrastrukturou (`effective`/`fold`/`recalcBuildingAggregates`/`rebuildBuildingDerived` jsou už v `buildings.js`, ověřeno). Žádné L.
- **T3** (academy/research) — M; 1 nové periodikum, čistý port `techs.js`, deterministický.
- **T4** (UI) — M; 2 selektory + 1 screen + tab, vzor M5-1 build UI.

Žádný task není L; T2 generalizace je nejrizikovější bod, ale je **lokalizovaná** (jedna fn rozšířená o jeden krok + sdílené helpery). Master plán M6 (řádky 288-291) má všechny 4 tasky jako M/Opus→Sonnet. Kritická cesta DR-013-00 je lineární. **Split by přidal režii bez přínosu.** Alternativa (split T1-T2 / T3-T4) zamítnuta: T2 a T3 sdílí `techs.json` + research↔techPt↔buyTech provázanost; rozdělení by zdvojilo katalog/persist wiring.

---

## 7. tickOrder dopady (souhrn) + diagram

- **Nové periodikum**: `research.daily` (edge `day`, order **75**, po `buildings.age` 70). Žádný schedule handler, žádný nový RNG stream (deterministický).
- `TICK_ORDER` fáze konstanta beze změny; `tickOrder.md` poznámka o research.
- Tech modifikátory NEjsou v ticku — re-derivace je **event-driven** (`buyTech` → `applyTechModifiers`; load Step 5 → `rebuildBuildingDerived` (b2)). Žádný per-tick polling (arch §5.3 „ne pollingem").

```
runTick (tickOrder.js:113)
 ├─ phase 1 calendar  → TimeEdges (isNewDay…)
 ├─ phase 2 schedule  → one-shot (contract.offer/expire — beze změny M6)
 ├─ phase 3 periodics (dle edge/order):
 │     quarterDay: jobs.production(10) → jobs.accidents(20) → jobs.autoAssign(30) → buildings.builders(40)
 │     noon:       health.births … food.meal2
 │     day:        workerEfficiency(5) … burnWood(60) → buildings.age(70) → **research.daily(75)** → season
 │     month:      foodSpoilage … council.closeMonth
 └─ phase 4 devInvariants

EVENT-DRIVEN (mimo tick):
  buyTech(command) ──► pay(techPt) ──► unlockedTechs[id]=true ──► applyTechModifiers(state)
                                                                    │ removeAllTechSourced + addTech
                                                                    │ invalidateModifiers (bump _modVersion)
                                                                    └ recalcBuildingAggregates (JEDNA cesta)
  load Step 5 (load.js:285) ──► rebuildBuildingDerived(state)
                                  (a) created  (b) re-gen building:*  (b2) re-gen tech:*  (c) invalidate  (d) recalc  (e) workforce
  createInitialState:133 ──► rebuildBuildingDerived (no-op tech když unlockedTechs={})
  completeBuild/destroyInstance ──► rebuildBuildingDerived (re-aplikuje budovy I techy — jedna cesta)
```

---

## 8. Rizika a mitigace

| Riziko | Dopad | Mitigace |
|---|---|---|
| **R1 (load-only/tech-only větev)** — coder přidá tech re-aplikaci jen do load.js → DR-012-02 desync | vysoký | M6-D5: tech re-gen JEN v `rebuildBuildingDerived` (b2) + `applyTechModifiers`; reviewer grep zákaz inline tech re-genu; round-trip test (fresh vs load po N buyTech = stejný hashState) |
| **R2 (id kolize tech modifikátorů)** — 2 atomy stejného (attr,op) různý target | střední | M6-D4: `id` zahrne `target` → unikátní per (tech,target,attr,op) |
| **R3 (techPt produkce příliš pomalá/rychlá)** — nehratelné | nízký (balanc) | gap G-LISTTECHS/G-RESEARCH-*, kalibrace M9; min. sada produkuje techPt z jobů (vždy nějaký progres) |
| **R4 (tech cílí na neexistující ID)** | nízký | tichý no-op v `effective`; reviewer gate: tech.target ∈ známá ID; ladí M9 |
| **R5 (catalog wiring techs.json láme buildById)** — items pod `cat.techs.tree` | nízký | `findTech` helper místo `byId` (§4.2); `buyTech`/selektory čtou přes `findTech`, ne `byId` |
| **R6 (RNG vynechán z university bonusu mění balanc)** | nízký | G-RESEARCH-UNIV-RNG approximated; determinismus má přednost (S-05); M9 rozhodne |

---

## 9. Dekompozice na Sonnet-proveditelné kroky

| Krok | Co | Soubor | Test | Závisí |
|---|---|---|---|---|
| **T1.1** | `unlockedTechs:{}` init + persist (`PERSIST_SCHEMA.player` += 'unlockedTechs'; undefined-guard load) | `createHomeState.js`, `persistSchema.js`, `load.js` | round-trip unlockedTechs; starý save → `{}` | — |
| **T1.2** | `buyTech` command (validace+prereqs+pay techPt+applyTechModifiers); reuse `techCap` | `commands/buyTech.js`, `main.js` (register) | buy OK; insufficient techPt; missing prereq; already unlocked; dispatch wiring | T1.1, T2.2 |
| **T1.3** | techCap tabulkový test (reuse formulas.js:31) | (test) | techCap(0/1/2/3/10) ref hodnoty | — |
| **T2.1** | `removeAllTechSourcedModifiers` + `addTechModifiers` (fold unlockedTechs → modifiers, id s targetem) | `buildings.js` | unlock tech → modifier per (target,attr,op); effective(target,attr) odráží | T1.1 |
| **T2.2** | `applyTechModifiers` (delta cesta buyTech) = removeAllTech+addTech+invalidate+recalc | `buildings.js` | buyTech → effective změněno; idempotent (2× buyTech stejného = 1 modifier) | T2.1 |
| **T2.3** | **Generalizace**: rozšířit `rebuildBuildingDerived` o krok (b2) tech re-gen (sdílené helpery T2.1) | `buildings.js` | load po N buyTech → effective === fresh po N buyTech (round-trip, NO regrese budov M5-1) | T2.1, T2.2 |
| **T3.1** | `state.player.research.sectors` init + persist (level/exp per sektor) | `createHomeState.js`, `persistSchema.js`, `load.js` | round-trip research | — |
| **T3.2** | `researchDaily` systém (exp z jobů + academy + level-up while → grant techPt) | `systems/research.js`, `tickOrder.js` | exp akumuluje; level-up → techPt+1; while víc level-upů; deterministický (no RNG); catch-up | T3.1 |
| **T4.1** | `findTech` + techs.json wiring (CATALOG_NAMES, schema validator) | `catalogs.js`, `catalog/*`, `data/techs.json` | techs katalog načten; findTech vrací tech | — |
| **T4.2** | `selectTechTree` + `selectResearchProgress` + `selectTechPoints` (čisté) | `ui/selectors.js` | cena=techCap; available/prereqs/canAfford; progPct | T4.1 |
| **T4.3** | `TechScreen` + tab 'tech' v App.js; buyTech button | `ui/screens.js`, `ui/App.js` | render; klik → send('buyTech') | T4.2, T1.2 |
| **G** | `techs.json` approximovaná sada (§4.3) + gap-report G-LISTTECHS resolved | `data/techs.json`, gap-report | schema valid; target ∈ známá ID | — |

---

## 10. Alternativy (povinné, min. 1)

- **A1 (zamítnuto) — samostatný `rebuildTechDerived(state)` + volání jen z load.js**: čistší separace tech/building, ALE = **load-only tech-only větev** → DR-012-02 třída bugu (mutace budov by tech modifikátory nezachovaly při re-genu building modifikátorů, pokud `removeAll` smaže i tech). Zamítnuto. Volba A (rozšířit jednu fn) je bezpečná.
- **A2 (zamítnuto) — tech efekty mimo modifier vrstvu** (přímý zápis do `state.home.derived` při buyTech): rychlejší, ale porušuje K13 (arch §5.3: „Techy přidávají modifikátory"), neserializuje se čistě, load by musel přehrávat imperativně (přesně to, co arch §5.3:302 ruší). Zamítnuto.
- **A3 (zamítnuto) — dvě měny (per-sektor points + techPt) jako originál**: věrnější, ale 2× progresní osa = složitější UI/persist/buyTech pro min. hratelnou sadu. Sjednoceno na techPt (§1.1), per-sektor points → interní exp. Approximace G-LISTTECHS, M9 může rozdělit.
- **A4 (zamítnuto) — rename `rebuildBuildingDerived → rebuildDerived`**: čitelnější jméno, ale 3 import-site ripple (load.js, createInitialState.js, interní) bez funkčního přínosu. Invariant „budovy I techy jedna cesta" splněn rozšířením o (b2). Volitelný alias ponechán coderovi.

---

## 11. Citace D/K/§ (souhrn)

- **K13** (immutable katalog + modifikátory): arch §5.3 (řádek 290-304), modifier tvar řádek 297 `source:'tech:bookKeeping'`. M6 = druhý zdroj modifikátorů (techy) → K13 **plně** (master plán řádek 282/501).
- **K14** (akce obsahu jako data): arch §5.4; tech efekty jako data (`effects[]` atomy), žádný imperativní háček.
- **§6.3/§6.4** (persist/load): allowlist (`unlockedTechs` raw + `modifiers`); load Step 5 = fold jediná cesta (arch řádek 352 „přepočti modifikátory fold + event-driven agregáty").
- **§7.1** (transakce): `canAfford`/`pay` techPt přes resourceHandlers (handlers.js:74).
- **DR-012-02**: zákaz load-only/tech-only derivační větve (R1).
- **DR-013-00**: M6 = reálná iter-015; autonomní doběh; tom-proxy informován.
- **M5-1 §4** (`design_iter-013_T-001.md`): kanonická modifier vrstva — M6 ji jen rozšiřuje o tech zdroj, žádná změna fold/effective/recalc.
- **techCap doložitelnost**: `original_source_doc §6` + `config.js:1393-1394` + originál `techs.js:37` + formulas.js:31 (HOTOVÉ).
