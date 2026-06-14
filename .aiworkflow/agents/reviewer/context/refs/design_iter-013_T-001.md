# Implementační design — M5: Budovy, stavba, kontrakty (iter-013, T-001)

- **Task**: T-001, iter-013 (BRIEF-013-001)
- **Autor**: architect
- **Datum**: 2026-06-13
- **Milník**: M5 (master plán iter-003 §3/iter-012, posunuto +1 dle DR-013-00 na iter-013) · K13 (modifikátory z budov), K14 (registr efektů)
- **Vstupy**: architektura iter-002 (§5.3 K13, §5.4 K14, §6.3–6.4 persist, §7.1 transakce, §8 kontrakty), master plán §3/iter-012 + §1.2, DR-013-00, Q3/DR-001 (gap politika), reálný kód `src/core/*`, `src/data/*`, originál `doc/original_source/.../home.js`+`config.js`+`buildingcard.js`.
- **Účel**: detailní design T1–T6 na úroveň, ze které Sonnet coder implementuje **bez dalšího architektonického rozhodnutí**. Žádný produkční kód. Žádná změna architektury iter-002 — pouze její konkretizace pro M5.

---

## 0. Shrnutí rozhodnutí (registr)

| # | Rozhodnutí | Sekce | Opora |
|---|---|---|---|
| M5-D1 | Stav budov: `state.home.buildings[id] = { created, totalMade, instances:[{instId, hp, inRepair}] }`; `created === instances.length` (invariant, derivovatelné, ale ukládá se kvůli prostotě—viz §1.4). | §1 | §6.3, home.js:260-291, 338 |
| M5-D2 | `ageBuildings` na **day** edge (ne quarterDay); RNG stream `'buildings'` (nový, izolovaný — K16/D4). | §1, §7 | tickOrder §4.3, home.js:2309 |
| M5-D3 | Opravy: repair je **projekt v projectQueue** typu `'repair'`, cena = `round(getGoldValue(baseCost)/4)` v gold. | §1.3 | home.js:2328-2357, §9.1 |
| M5-D4 | `scaleCostByCount(base, created)` **nová** čistá fn ve `formulas.js`; geometrický růst `pct = scaleFactor^created`. Existující `scaleCost(base, pct)` zůstává beze změny. Vzorec je `provenance:'approximated'` (originál budovy neškáluje — §2.4). | §2.4 | formulas.js:54, config.js:1170 |
| M5-D5 | `projectQueue` jako pole serializovatelných projektů ve `state.home.projectQueue`; builder postup na **quarterDay** slotu (sdílí cadence s jobs §M3). | §2 | tickOrder, home.js:1720-1840 |
| M5-D6 | `build(itemId)` command: validace (unlock, space, canAfford, kapacita fronty) → `pay()` → push projektu do fronty. Žádná okamžitá instance — instance vzniká až po dokončení projektu. | §2.3 | dispatch.js, buildingcard.js:84-101 |
| M5-D7 | Modifier vrstva (K13): `effective(itemId, attr, state)` čistá fold add→mul→set; memoizace v `state`-mimo cache objektu s verzí, invalidace bump verze při změně `catalogState.modifiers`; agregáty (maxWorkers, kapacity, attractiveness) event-driven přepočet. **Save = JEN `catalogState.modifiers`** (už existuje). | §4 | §5.3, createInitialState.js:115 |
| M5-D8 | Kontrakty (K14): `state.home.contractQueue` = pole; `onComplete/onExpire/onReject` = **string-ID do registru efektů + params v datech**; expirace přes `scheduleInsert` (serializovatelné). | §5 | §5.4, effects.js, scheduler.js |
| M5-D9 | **Split DOPORUČEN: ANO** → M5-1 (T1–T4) / M5-2 (T5–T6). | §8 | split-trigger §3/iter-012 |
| M5-D10 | G-LISTBUILDINGS: doplnit buildings.json autonomně na ~10 budov, `provenance:'approximated'` per pole; min. hratelná sada v §9. | §9 | Q3/DR-001, gap-report |

---

## 1. T1 — Building instances + opotřebení + opravy + persist

### 1.1 Stavová reprezentace (M5-D1)

Nový sub-strom `state.home.buildings` (analogicky k `state.home.jobs`):

```
state.home.buildings = {
  [buildingId]: {
    created:    number,              // počet stojících instancí = instances.length (invariant)
    totalMade:  number,              // kumulativní počet kdy postavených (nikdy neklesá; vstup do scaleCost + genName)
    instances: [
      { instId: string, hp: number, inRepair: boolean }
    ]
  }
}
```

- `instId` = deterministický řetězec `\`${buildingId}_${totalMade_v_okamžiku_stavby}\`` (home.js:284 `building.id + "_" + building.totalMade`). **Žádné `Date.now()`** (originál bug — viz §6 determinismus).
- `hp` start = `effective(buildingId, 'resistance', state)` (max HP instance; default v katalogu `resistance`).
- `created` se po každé změně synchronizuje z `instances.length` (home.js:338, 1975 `b.created = b.instances.length`) — viz invariant §1.4.
- Sub-strom je **prázdný** v nové hře; klíč pro `buildingId` vzniká lazy při první stavbě (jako jobs).

Katalogové pole instance (immutable, z `buildings.json`, čteno přes `effective`): `resistance` (max HP / odolnost), `maxProgress` (dny stavby), `builders` (kolik builderů projekt vyžaduje), `spaceType` + množství (forest/field/mine space — derived, gap §9), `effects` (modifikátory, viz T4), `category`, `unlocks`, `onBuild`.

### 1.2 `ageBuildings` systém (opotřebení) — M5-D2

Nový modul `src/core/systems/buildings.js`, fn `ageBuildings(state, _params, ctx)`. Registrace `buildings.age`, edge **`day`**, order **70** (po `home.burnWood` order 60; opotřebení je denní údržbová fáze na konci dne).

Algoritmus (port home.js:2309-2368, determinizováno):

```
rng = makeRng(state, 'buildings')            // nový izolovaný stream (M5-D2, K16/D4)
for buildingId in state.home.buildings:
  resistance = effective(buildingId, 'resistance', state)
  for inst in buildings[buildingId].instances:
    if !Number.isFinite(inst.hp): inst.hp = resistance       // NaN guard (home.js:2314)
    if state.season.curSeason === WINTER_INDEX: inst.hp -= 1  // zimní opotřebení (home.js:2317)
    if (rng.next() + buildingsAgeBias) > inst.hp / resistance: // pravděpodobnostní opotřebení
        inst.hp -= 1
    if inst.hp / resistance <= repairThreshold && !inst.inRepair:
        enqueueRepair(state, buildingId, inst, ctx)          // §1.3
        inst.inRepair = true
    else if inst.inRepair && inst.hp <= 0:
        destroyInstance(state, buildingId, inst.instId, ctx)  // odebrat instanci, invalidovat modifier cache
```

- `buildingsAgeBias` = `0.2` (home.js:2320 `Math.random() + 0.2`), balance konstanta.
- `repairThreshold` = `0.25` (home.js:2324), balance konstanta.
- `WINTER_INDEX`: ověřit mapování season indexu (calendar.js používá 0=Spring..3=Winter; `BALANCE.season.startSeason='Winter'`). Coder čte aktuální index z `state.season.curSeason`.
- `destroyInstance`: odebere instanci z pole, `created--`, **invaliduje modifier cache** (T4 §4.3) protože budovy nesou agregáty. Po destrukci se přepočtou event-driven agregáty.
- **Catch-up-safe**: vše přes `rng.stream('buildings')`, žádný DOM/Date.now/Math.random (S-05, §4.1 arch). Day-edge → levné v dávce (1× za herní den, ne per step).

### 1.3 Opravy (repair projekt) — M5-D3

`enqueueRepair(state, buildingId, inst, ctx)` (port home.js:2328-2359):

```
baseCost = effective(buildingId, 'baseCost', state)          // mapa {resourceId: amount}
repairGold = Math.round(getGoldValue(state, baseCost) / 4)   // oceňování přes market API (§9.1 arch, M4b kontrakt)
project = {
  id:         deterministicProjectId(state),                  // §2.1, ne Date.now()
  type:       'repair',
  buildingId, instId: inst.instId,
  curProgress: 0,
  maxProgress: effective(buildingId,'maxProgress',state) / 4, // oprava je 4× rychlejší (home.js:2349)
  builders:    effective(buildingId,'builders',state),
  cost:        { gold: repairGold },
  paid:        false,
  removable:   false
}
state.home.projectQueue.push(project)
```

- Oprava se **platí až v builder systému** (home.js:1732 `project.type=='repair' && !project.paid`) — odložená platba, ne při zařazení. Po dokončení: `inst.hp += resistance` (home.js:1754-1763 ekvivalent), `inst.inRepair=false`, projekt se z fronty odebere bez `onBuild`.
- Repair cost zaokrouhlení a `/4` faktory jsou balance konstanty (`repairCostDivisor=4`, `repairProgressDivisor=4`).
- Granite/marble recycling slevy (home.js:2331-2341) jsou **mimo M5** (techy = M6) → gap `G-REPAIR-RECYCLING`, `provenance:'approximated'` (zatím bez slev).

### 1.4 Persist schéma budov — M5-D1 (deklarativní allowlist, §6.3)

Do `PERSIST_SCHEMA` přidat `home.buildings`:

```
// PERSIST_SCHEMA.home (komentář): home.buildings: per id { created, totalMade, instances:[{instId,hp,inRepair}] }
// home.projectQueue: pole projektů (serializovatelné) — viz §2.1
```

`applyPersist`/`applyPayload` (load.js) doplnit blok analogický `jobs`:

- **Ukládá se**: `created`, `totalMade`, `instances` (každá: `instId`, `hp`, `inRepair`). `projectQueue` celé (je serializovatelné).
- **NEUKLÁDÁ se (derivované)**: `effective()` hodnoty, agregáty (maxWorkers, kapacity, attractiveness), `progressPct` projektu (derivát `curProgress/maxProgress`), modifikátory z budov (ty jsou v `catalogState.modifiers`, ukládají se tam — viz T4).
- **Pozn. k `created` (invariant vs. derivace)**: `created === instances.length` je invariant. Architektura §6.3 dovoluje ukládat dynamiku; `created` ukládáme **explicitně** kvůli konzistenci s originálem (`created`/`totalMade` jsou kanonická perzistentní pole, T-001 §12) a `totalMade` se uložit **musí** (není odvoditelné z `instances`). Load-time se `created` re-derivuje z `instances.length` (load Step 5, jako `b.created = b.instances.length`) → ochrana proti driftu. Reviewer gate: pokud `created !== instances.length` po loadu → invariant violation.
- Load Step 5 (recalculate, load.js:217): po `applyPayload` zavolat `rebuildBuildingDerived(state)` = (a) `created = instances.length` per budova, (b) **fold modifikátorů + event-driven agregáty** (T4 §4.4). To je jediná cesta výpočtu derivátů — shodná pro novou hru i load (žádná load-only větev, §6.4).

### 1.5 Balance konstanty → `balance.js`

Nová sekce `BALANCE.buildings`:

```
buildings: {
  ageBias:              0.2,   // home.js:2320 (Math.random()+0.2). provenance: extracted.
  repairThreshold:      0.25,  // home.js:2324. provenance: extracted.
  winterHpLoss:         1,     // home.js:2318. provenance: extracted.
  repairCostDivisor:    4,     // home.js:2356 getGoldValue(cost)/4. provenance: extracted.
  repairProgressDivisor:4,     // home.js:2349 maxProgress/4. provenance: extracted.
  defaultResistance:    100,   // fallback max HP když budova nemá 'resistance'. provenance: approximated, gap G-BUILD-RESISTANCE.
  costScaleFactor:      1.0,   // viz §2.4 scaleCostByCount; 1.0 = bez škálování (věrné originálu). provenance: approximated, gap G-BUILD-COSTSCALE.
}
```

> Pozn. `costScaleFactor` viz §2.4 — defaultně `1.0` (věrné originálu); orchestrátor/balancér může v M9 zvednout pro progresi.

---

## 2. T2 — projectQueue + builder + build() + scaleCost

### 2.1 `projectQueue` struktura

`state.home.projectQueue` = pole serializovatelných projektů:

```
project = {
  id:          string,    // deterministické ID (viz níže)
  type:        'build' | 'repair',
  buildingId:  string,
  instId?:     string,    // jen u 'repair'
  curProgress: number,    // akumulovaný stavební progres
  maxProgress: number,    // cíl (dny × cadence — viz §2.2)
  builders:    number,    // požadovaný počet builderů
  cost:        Record<string,number>, // jen u 'repair' (platí se v builderu); u 'build' už zaplaceno → {} nebo audit kopie
  paid:        boolean,   // jen 'repair' (build je placen při zařazení)
  removable:   boolean,   // build=true, repair=false
  delay:       number     // počet quarterDay slotů bez postupu (re-queue heuristika)
}
```

**Deterministické `project.id`** (NAHRADIT home.js:2344 `(new Date()).getTime()` — to je nedeterministické, zakázané v core): zavést `state.home.projectSeq` (monotónní čítač, persistovaný), `deterministicProjectId(state) = 'proj_' + (state.home.projectSeq++)`. Analogie `engine._seq` ve scheduleru.

Persist: `projectQueue` + `projectSeq` v allowlistu (§1.4).

### 2.2 Builder systém — quarterDay (M5-D5)

Nový modul fn `buildersProcess(state, _params, ctx)`. Registrace `buildings.builders`, edge **`quarterDay`**, order **40** (po `jobs.autoAssign` order 30 — buildeři musí být přiřazení dřív, viz tickOrder dopad §7).

Cadence (port home.js:1722, kde `masonStep` × `STEPSPERDAY × 2`): originál běžel builder loop per-step; rebuild ho přesouvá na quarterDay (4×/den) s ekvivalentním `masonStep` přepočítaným na 1 quarterDay dávku.

```
totalBuilders = state.home.jobs['builder']?.number ?? 0     // builder job (jobs.json, již existuje stub)
maxActiveProjects = effective('builderHut','maxActiveProjects',state) nebo BALANCE.buildings.maxActiveProjects (gap)
masonStep = BALANCE.buildings.masonStep                       // progres za 1 quarterDay na projekt
i = 0
for project in projectQueue (do maxActiveProjects):
  project.maxProgress je v "dnech" → completionUnits = project.maxProgress * quarterDaysPerDay
  if type=='repair' && !paid:
     if canAfford(cost): pay(cost,'repair:'+buildingId,ctx,step); paid=true; delay=0
     else: delay++ ; continue
  if builders <= totalBuilders:
     project.curProgress += masonStep
     totalBuilders -= builders
     delay = 0
  else:
     delay++
  if delay > BALANCE.buildings.requeueDelay:    // home.js:1773 STEPSPERDAY/3 → přepočet na quarterDay
     move project to end of queue; delay=0
  else if project.curProgress > completionUnits:
     if type=='build':
        completeBuild(state, project, ctx)        // §2.3 — vznikne instance
     else: // repair
        applyRepair(state, project, ctx)          // inst.hp += resistance; inst.inRepair=false
     remove project from queue
```

- Construction tech bonusy (home.js:1747-1752 `constructionWood`/`constructionWood2`) = M6 techy → gap `G-BUILD-TECHBONUS`, `provenance:'approximated'` (zatím bez bonusů).
- `completeBuild`: vytvoří instanci (push do `state.home.buildings[id].instances`, `created++`, `totalMade++`), aplikuje `onBuild` efekt přes registr (string-ID, §5.4 arch), **přidá modifikátory budovy** (T4) + **invaliduje agregáty**. `onBuild` z dat: `building.onBuild = {effect:'...', ...params}` → `resolve(registry, effect)(state, params, ctx)`.
- **Catch-up-safe**: žádný RNG potřeba (deterministický postup), quarterDay levné.

### 2.3 `build(itemId)` command — M5-D6

Nový soubor `src/core/commands/build.js`, registrace command typu `'build'`. Vrací `CommandResult` (dispatch.js).

```
build(state, params):
  itemId = params.itemId
  1. validace existence: hasId(itemId) && byId(itemId).type==='buildings'   → else {ok:false, error}
  2. unlock gate: budova musí být odemčená (gap G-BUILD-UNLOCK: do M6 techů jsou všechny unlocked; pole building.unlocked default true) 
  3. space gate: spaceAvailable(spaceType) >= effective(itemId, spaceType)   → gap G-BUILD-SPACE (forest/field/mine space; M5 zjednodušení viz §9)
  4. queue kapacita: projectQueue.length < maxProjectQueue * builderHut.created (home.js:84) → else {ok:false}
  5. cost = scaleCostByCount(effective(itemId,'baseCost',state), buildings[itemId]?.totalMade ?? 0)   // §2.4
  6. if !canAfford(state, cost): return {ok:false, error:'insufficient'}
  7. pay(state, cost, 'build:'+itemId, txCtx, state.engine.curStep)    // transakční vrstva §7.1 arch
  8. project = { id:deterministicProjectId(state), type:'build', buildingId:itemId,
                 curProgress:0, maxProgress:effective(itemId,'maxProgress',state),
                 builders:effective(itemId,'builders',state), removable:true, delay:0, paid:true, cost:{} }
  9. projectQueue.push(project)
  10. return {ok:true}
```

- **Command vs. tick separace** (dispatch.js komentář): command **smí** mutovat (pay + push) — je to UI→core intent, ne tick fn. Platba je atomická (`pay` §7.1 — kontroluje canAfford před mutací).
- Pozn.: command nemá `ctx` (dispatch signatura je `(state, params)`). `txCtx` pro emitTx: buď command registry rozšířit o ctx (mimo scope iter-002), NEBO `pay(state, cost, cause)` bez emitTx (audit tx pro stavbu lze odložit — accounting observer je K5/K18, ne blocker M5). **Rozhodnutí**: M5 volá `pay(state, cost, cause)` bez ctx (emitTx je optional v transactions.js:29). Gap `G-BUILD-TXAUDIT` (stavba se neobjeví v měsíčním reportu do doplnění ctx do command vrstvy — neblokuje hratelnost).

### 2.4 `scaleCostByCount(base, created)` — M5-D4 (čistá fn → formulas.js)

**Zdroj/dolož**: Originál `scaleCost(cost, pct)` (config.js:1170) je `floor(amt*pct)` a **NEškáluje budovy podle počtu** — budovy v originále mají fixní `cost` (buildingcard.js:88 `cost: scope.building.cost`, žádné násobení počtem). Per-count cenový růst je tedy **designová addice M5** pro progresi (brief T2), nikoli věrná replikace. Proto `provenance:'approximated'`, gap `G-BUILD-COSTSCALE`, kalibrace M9.

Nová čistá fn (existující `scaleCost(base,pct)` ponechat beze změny — používá market/jiné):

```
/**
 * Cost of the (created+1)-th building instance.
 * Geometric growth: pct = scaleFactor^created. scaleFactor=1.0 → no scaling (faithful to original).
 * Source: DESIGN M5 §2.4 (original buildings have fixed cost; scaling is an approximated progression addition).
 * provenance: approximated, gap G-BUILD-COSTSCALE (M9 calibration).
 */
scaleCostByCount(baseCost, created, scaleFactor) {
  const pct = Math.pow(scaleFactor, Math.max(0, created));
  return scaleCost(baseCost, pct);   // reuse existing floor(amt*pct)
}
```

- `scaleFactor` z `BALANCE.buildings.costScaleFactor` (default `1.0` = bez škálování, věrné originálu; balancér zvedne např. na `1.15` pro progresi).
- `created` argument = `totalMade` (kumulativní, ne aktuální `created` — aby destrukce+znovustavba nezlevňovala). Coder předává `buildings[itemId]?.totalMade ?? 0`.
- **Čistá** (žádný state/RNG/Date) → tabulkový test: `scaleCostByCount({wood:30}, 0, 1.15) == {wood:30}`, `({wood:30}, 1, 1.15) == {wood:34}` (floor(30×1.15)), `(_, n, 1.0) == base` pro všechna n.

---

## 3. T3 — Builder companies

### 3.1 Katalogová data (companies.json — ověřeno, doplnit)

`companies.json` už existuje s `explorer`, `houseBuilder`, `mineBuilder`. Pro M5 builder firmy (najímání builderů/masonů) je relevantní struktura `houseBuilder`/`mineBuilder` (cena za odemčení/úroveň builder kapacity). Loader už indexuje `companies.{explorer,houseBuilder,mineBuilder}` (loader.js:28 SECTION_CATALOGS).

Doplnit pole pro **kapacitu builderů** (gap — chybí v extraktu):

```
houseBuilder[].buildersProvided: number   // kolik builder slotů firma poskytuje. provenance: approximated, gap G-BUILDER-CAP.
houseBuilder[].masonProvided?:   number    // mason = řídí maxActiveProjects (home.js:84). provenance: approximated.
```

### 3.2 Logika výběru / kapacit

- **Builder kapacita** = `builder` job (jobs.json `builder` stub, `category:'builder'`, již existuje). Builder se přiřazuje jako ostatní joby, ale `noProduction:true` → `jobsProduction` ho přeskakuje (jobs.js:103), `autoAssignWorkers` ho přeskakuje (jobs.js:228 `category!=='builder'`). Builder se přiřazuje **explicitně** přes `assignJob('builder', delta)` (existující command) NEBO přes builder firmy.
- **mason** (`maxActiveProjects`, `maxProjectQueue`): odvozeno z postavených `builderHut` budov (home.js:84 `mason.maxProjectQueue * mason.number`). M5: `maxActiveProjects = effective('builderHut','maxActiveProjects')` × `builderHut.created`, `maxProjectQueue` analogicky. Pokud `builderHut.created===0` → fronta kapacita 0 (nelze stavět bez builder hut — odpovídá originálu, builderHut je startovní budova).
- **Firmy** = volitelný unlock/boost (companies): `selectBuilderCompany(state, companyId)` command (mimo kritickou cestu M5 hratelnosti — gap `G-BUILDER-COMPANIES`, lze stub do M5-2/M6). **Min. hratelné M5 NEvyžaduje firmy** — stačí builder job + builderHut. Firmy jsou enhancement.

> **Pozn. orchestrátorovi**: T3 (companies) je nejméně kritický task pro hratelnost; pokud kapacita iterace tlačí, T3 lze zúžit na "builder job + builderHut kapacita" a firmy odložit. Neblokuje DoD "město roste".

---

## 4. T4 (L) — Modifier vrstva plně pro budovy (K13, §5.3)

### 4.1 `effective(itemId, attr, state)` API

Čistá funkce v novém modulu `src/core/catalog/effective.js`:

```
effective(itemId, attr, state):
  base = baseAttr(itemId, attr)                          // z katalogu přes byId(itemId).entry, podpora dot-path 'baseCost.wood'
  mods = state.catalogState.modifiers.filter(m => m.target===itemId && m.attr===attr)
  return fold(base, mods)
```

**Fold pořadí (add → mul → set)** — striktní (§5.3 arch "add → mul → set"):

```
fold(base, mods):
  add = sum(mods where op==='add' .value)
  result = base + add
  for m in mods where op==='mul' (stable order by source): result *= m.value
  setMods = mods where op==='set'
  if setMods.length: result = last(setMods).value    // 'set' přepisuje vše; poslední dle source order vyhrává
  return result
```

- `modifier = { id, source, target, attr, op:'add'|'mul'|'set', value }` (přesně tvar §5.3 arch).
- Stabilní pořadí v rámci `op`: dle `source` string (deterministické, K16). Pro mapové atributy (`baseCost` = `{wood:30}`) fold pracuje per-resource klíč (attr `'baseCost.wood'`), nebo `effective` vrací celou mapu a fold se aplikuje per klíč — coder zvolí dot-path variantu (jednodušší, konzistentní s persistem).

### 4.2 Memoizace + invalidace

Cache **mimo perzistentní stav** (NIKDY se neukládá — derivát):

```
state.catalogState._effCache = { version: number, map: Map<string,number> }   // _-prefix = neperzistentní (allowlist ho nezahrne)
state.catalogState._modVersion = number                                        // bump při každé změně modifiers
```

- `effective` čte cache jen pokud `_effCache.version === _modVersion`, jinak `_effCache.map.clear()` + `version = _modVersion`.
- **Invalidace = bump `_modVersion`** kdykoli se mění `catalogState.modifiers` (stavba/destrukce budovy, tech v M6, event). Helper `invalidateModifiers(state)`.
- `_effCache`/`_modVersion` mají `_` prefix → **persist allowlist je nepokrývá** (§6.3, ukládá se jen deklarované). Po loadu se `_modVersion` resetuje na 0 a cache je prázdná → první `effective` přepočítá. **Save = JEN `catalogState.modifiers`** (M5-D7, už v allowlistu přes `catalogState`).

### 4.3 Event-driven agregáty (maxWorkers, kapacity skladů, attractiveness)

Agregáty NEjsou per-attr `effective` — jsou **součty napříč budovami**. Přepočet **event-driven**, ne polling (§5.3 arch "ne pollingem"):

```
recalcBuildingAggregates(state):
  state.home.derived.maxWorkers      = Σ over buildings: created * effective(id,'workers',state)
  state.home.derived.storageCapacity = Σ ... effective(id,'storage',state)
  state.home.derived.attractiveness  = Σ ... effective(id,'attractiveness',state)
  // settlementLevel pak čte attractiveness (formulas.settlementLevel — už existuje)
```

- `state.home.derived` = **neperzistentní** kontejner derivátů (jako `_effCache`). Allowlist ho NEzahrne; load Step 5 ho přepočítá.
- **Triggery přepočtu** (event-driven): (1) `completeBuild`, (2) `destroyInstance`, (3) přidání/odebrání modifikátoru (M6 techy), (4) load Step 5. Žádný per-tick polling.
- Napojení: `jobs.workerSlots` (jobs.js:45) dnes čte jen `houseTypes`; M5 rozšíří o `state.home.derived.maxWorkers` z budov (gap G-POP-WORKFORCE odkazuje na M5). `housing.settlementLevel` čte `derived.attractiveness`.

### 4.4 POVINNÁ dekompozice L na Sonnet-proveditelné kroky (§1.2)

T4 je **L** — rozpad na 6 atomických kroků, každý samostatně testovatelný, žádný nevyžaduje architektonické rozhodnutí:

| Krok | Co | Soubor | Test (Sonnet) | Závisí |
|---|---|---|---|---|
| **T4.1** | `effective(itemId, attr, state)` + `fold(base, mods)` čistá fn (add→mul→set), dot-path pro mapové attr | `catalog/effective.js` | tabulkový: base bez mods = base; add+mul+set pořadí; set přepíše | — |
| **T4.2** | Memoizace: `_effCache`/`_modVersion` + `invalidateModifiers(state)`; `effective` čte/plní cache | `catalog/effective.js` | cache hit po 2× volání; po `invalidate` přepočet; jiný výsledek po změně mods | T4.1 |
| **T4.3** | Modifikátory z budov: `addBuildingModifiers(state, buildingId)` / `removeBuildingModifiers` — z `building.effects` (data) generuje `modifier` záznamy do `catalogState.modifiers` + `invalidate` | `systems/buildings.js` | postav budovu → modifier v seznamu; znič → zmizí; round-trip seznamu | T4.1, T4.2 |
| **T4.4** | `recalcBuildingAggregates(state)` → `state.home.derived.{maxWorkers,storageCapacity,attractiveness}`; volat z complete/destroy | `systems/buildings.js` | 2 budovy → součet; po destrukci klesne | T4.3 |
| **T4.5** | Napojení agregátů: `jobs.workerSlots` čte `derived.maxWorkers`; `housing.settlementLevel` čte `derived.attractiveness` | `systems/jobs.js`, `systems/housing.js` | maxWorkers ovlivní autoAssign; attractiveness ovlivní level | T4.4 |
| **T4.6** | Load re-aplikace: load Step 5 `rebuildBuildingDerived(state)` = `created=instances.length` + `recalcBuildingAggregates` (fold ze seznamu modifikátorů). **Save = jen modifiers** (ověřit allowlist) | `save/load.js`, `save/persistSchema.js` | save (jen modifiers) → load → derived === před save (round-trip) | T4.4 |

### 4.5 Kritický invariant (review gate)

- **Žádné in-place `applyUpgrade` mutace** katalogu: `effective` NIKDY nemutuje `byId(itemId).entry`. Katalog je immutable (`Object.freeze` v dev). Modifikátory jsou data v `state.catalogState.modifiers`, ne `base*` dvojníci.
- **Derivovaná data se NEUKLÁDAJÍ**: `_effCache`, `_modVersion`, `home.derived`, `progressPct`, `created` (re-derived) — žádné v persist allowlistu. Reviewer grep: persist payload nesmí obsahovat `derived`/`_effCache`/`maxWorkers`.

---

## 5. T5 — Kontrakty (K14)

### 5.1 `contractQueue` struktura

`state.home.contractQueue` = pole serializovatelných kontraktů:

```
contract = {
  id:         string,                    // deterministické (contractSeq, jako projectSeq §2.1)
  type:       string,                    // katalogový typ (z events/contracts data)
  status:     'offered'|'active'|'completed'|'expired'|'rejected',
  cost:       Record<string,number>,     // co hráč dá (volitelné)
  reward:     Record<string,number>,     // co hráč dostane (grant při complete)
  deadlineStep: number,                  // absolutní step expirace
  onComplete: { effect: string, ...params },   // string-ID + params (K14, §5.4)
  onExpire:   { effect: string, ...params },
  onReject:   { effect: string, ...params }
}
```

- `onComplete/onExpire/onReject` jsou **data** (string-ID do registru efektů + params), NE imperativní háčky (M5-D8, §5.4 arch: "onComplete/onExpire/onReject — vše jako string-ID do registru efektů s parametry v datech").

### 5.2 Kontraktové eventy přes schedule (serializovatelné)

- **Expirace**: při aktivaci kontraktu `scheduleInsert(state, contract.deadlineStep, 'contract.expire', { contractId })`. Handler `contract.expire` (v effects.js / nový `systems/contracts.js`) najde kontrakt; pokud stále `active` → spustí `onExpire` efekt přes registr, `status='expired'`.
- **Nabídka kontraktů**: periodický generátor (gap G-CONTRACT-GEN — zdroj nabídek; M5 stub: ručně přes command nebo prostý schedule). Generace přes `rng.stream('events')` (existující stream), day/week edge.
- **Completion**: command `completeContract(contractId)` / `rejectContract(contractId)` (§6) → resolve příslušného efektu z registru, `grant(reward)` / `pay(cost)`.

### 5.3 Registr efektů — rozšíření (K14)

`effects.js` (existující kostra) doplnit handlery pro kontraktové efekty (M1 stuby → M5 implementace):

```
register(reg, 'contract.grantReward', (state, params, ctx) => grant(state, params.reward, 'contract:'+params.id))
register(reg, 'contract.expire',      (state, params, ctx) => { ...najdi, status='expired', resolve(onExpire) })
register(reg, 'contract.penalty',     (state, params, ctx) => pay(state, params.penalty, 'contract-penalty', undefined))
```

- Handlery jsou **registrované při startu** (idempotentní, registry.js:30). Params **serializovatelné** (registry assertSerializable). `onComplete` efekt v datech odkazuje na registrované ID — neznámé ID = fail-fast (registry.js:44, DEV throw).

### 5.4 Persist kontraktů

- **Ukládá se**: `contractQueue` celé (serializovatelné), `contractSeq`. Přidat do allowlistu (`home.contractQueue`, `home.contractSeq`).
- Schedule expirace (`contract.expire` v `engine.schedule`) se ukládá automaticky (`engine.schedule` už v persistu). Po loadu schedule pokračuje → expirace přežije save/load (§4.2 arch, deduplikace indexem K17).
- **NEUKLÁDÁ se**: derivované UI flagy (progress %, time-left — derivát `deadlineStep - curStep`).

---

## 6. T6 — UI build screen + kontrakty panel (data/selektory/commandy)

Návrh rozhraní (ne pixely): selektory (core→UI, read-only, §3.4 arch) + commandy (UI→core, §3.3).

### 6.1 Build screen — selektory

```
selectBuildableBuildings(state):                 // karty budov
  → [{ id, name, category, cost:scaleCostByCount(effective(baseCost),totalMade,factor),
       canAfford:canAfford(state,cost), created, totalMade, spaceNeeded, spaceAvailable, unlocked,
       effectsSummary:[...] }]
selectProjectQueue(state):                        // fronta staveb
  → [{ id, buildingId, name, type, progressPct:round(curProgress*100/completionUnits),
       builders, buildersWorking, removable }]
selectBuilderCapacity(state):                     // { assignedBuilders, maxActiveProjects, queueCapacity, queueUsed }
```

### 6.2 Kontrakty panel — selektory

```
selectContracts(state):
  → [{ id, type, status, cost, reward, daysLeft:round((deadlineStep-curStep)/stepsPerDay), description }]
```

### 6.3 Commandy (registrovat v command registry)

| Command | Params | Handler |
|---|---|---|
| `build` | `{itemId}` | §2.3 |
| `cancelProject` | `{projectId}` | odebere z fronty; pokud `removable && type==='build'` → refund přes `grant(cost)` (buildingcard.js:108 `insertInventory`) |
| `assignBuilder` | `{delta}` | proxy na `assignJob('builder', delta)` (existující) |
| `acceptContract` | `{contractId}` | status `offered`→`active`, scheduleInsert expirace |
| `completeContract` | `{contractId}` | resolve `onComplete`, grant reward |
| `rejectContract` | `{contractId}` | resolve `onReject`, status `rejected` |

- Commandy nemutují přímo derived data; jen state + fronty. UI re-render přes dirty flag (§3.4).

---

## 7. TickOrder dopady (živý artefakt §4.3) + diagram

Nové periodiky (registrovat v `registerCorePeriodics`, tickOrder.js):

```
quarterDay:
  jobs.production   order 10   (existuje)
  jobs.accidents    order 20   (existuje)
  jobs.autoAssign   order 30   (existuje)
  buildings.builders order 40  ← NOVÝ (po autoAssign: buildeři musí být přiřazení dřív)
day:
  workerEfficiency  order 5    (existuje)
  ...
  home.burnWood     order 60   (existuje)
  buildings.age     order 70   ← NOVÝ (denní opotřebení, na konci dne; před měsíčními)
```

Kontraktové eventy: `contract.expire` jsou **one-shot schedule** (ne periodika) — běží v phase 2 (schedule) tickOrder, ne v periodics. Generátor nabídek (pokud periodický) → day edge, order ~80 (po age).

**Pořadí odůvodnění**:
- `buildings.builders` **po** `jobs.autoAssign` (order 40 > 30): autoAssign nejdřív rozdělí volné pracovníky (builder job se nepřiřazuje auto, ale total workforce musí být ustálen), pak buildeři postupují s aktuálním `builder.number`.
- `buildings.age` **po** `burnWood` (order 70 > 60): opotřebení je poslední denní údržbová fáze; agregáty se přepočtou event-driven při destrukci, ne v tomto pořadí závislé.
- `ageBuildings` čerpá `rng.stream('buildings')` — izolovaný stream → přidání budov **nerozhodí determinismus** ostatních systémů (K16/D4, §4.4 arch).

ASCII diagram dopadu (rozšíření §3.5 arch — sekce SYSTEMS):

```
quarterDay:  jobsProduction → jobsAccidents → autoAssignWorkers → [buildersProcess]NEW
day:         workerEff → meal1 → settlementLevel(←derived.attractiveness) → world → market.drift
             → field → mine → burnWood → [ageBuildings]NEW
schedule:    [contract.expire]NEW (one-shot, deadlineStep)
event-driven (mimo tick): completeBuild/destroyInstance → addBuildingModifiers → invalidate
             → recalcBuildingAggregates → derived.{maxWorkers,storageCapacity,attractiveness}
```

> **Závazek aktualizace**: `TICK_ORDER` konstanta + tento diagram + tickOrder.md se aktualizují ve stejném commitu jako registrace nových periodik (N-04, §4.3 arch). Reviewer gate ověří.

---

## 8. Rozhodnutí: Split M5-1 / M5-2 — **DOPORUČUJI ANO**

**Doporučení: split na M5-1 (T1–T4) a M5-2 (T5–T6).**

Odůvodnění (split-trigger §3/iter-012, master plán §A3 — iterace ~4–6 tasků + test + review):

1. **T4 je L s povinnou 6-krokovou dekompozicí** (§4.4) — sám o sobě naplní kapacitu iterace. T1–T4 = T1(M)+T2(M)+T3(M)+T4(L=~6 sub-kroků) ≈ 9 efektivních jednotek práce + test loop + review. To je horní hranice jedné iterace.
2. **T4 a T5 nesouzní do jedné iterace**: T4 (modifikátory, K13) je *infrastrukturní* (effective/fold/agregáty/cache/load round-trip) s vlastním náročným review gate (žádné in-place mutace, derivát se neukládá). T5 (kontrakty, K14) je *obsahový* systém s vlastním schedule/registr/persist. Mísení dvou nezávislých review gates v jedné iteraci zvyšuje riziko re-run celé iterace kvůli jednomu systému.
3. **Čistá dependency hranice**: T5/T6 závisí na T2 (`pay`/transakce, fronty) a T4 (effective pro odměny/efekty), ne naopak. M5-1 dodá modifier vrstvu a stavbu jako stabilní základ; M5-2 staví kontrakty + UI nad hotovým a otestovaným základem. M5-1 je samostatně hratelné ("město roste, stavby mají scaling a opotřebení, modifikátory čistě") — splňuje podstatnou část DoD už po M5-1.
4. **Bez dopadu na architekturu** (split-trigger to explicitně dovoluje): názvosloví `M5-1`/`M5-2` dle konvence (písmenné a/b vyhrazeny pro milníkové splity).

**Mapování**: M5-1 = T1, T2, T3, T4 (+ test loop sada 1.3 pro scaleCost/effective/modifikátory round-trip + review gate "žádné applyUpgrade, derivát se neukládá"). M5-2 = T5, T6 (+ test loop kontrakty round-trip/expirace přes save/load + review).

**Alternativa (zamítnutá)**: vše v jedné iteraci iter-013. Zamítnuto: 6 tasků vč. L + dva oddělené review gates (K13 infra + K14 obsah) překračuje bezpečnou kapacitu jedné iterace (§A3), riziko re-run celé iterace kvůli izolovanému nálezu v kontraktech. Split izoluje riziko.

> **Poznámka orchestrátorovi**: doporučuji rozdělit iter-013 na **iter-013 (M5-1: T1–T4)** a **iter-013b/iter-013-2 (M5-2: T5–T6)** dle konvence názvosloví splitů. M6 (původně iter-013 dle DR-013-00) se posune za M5-2.

---

## 9. Rozhodnutí: G-LISTBUILDINGS gap — postup dle Q3/DR-001

**Postup (autonomní, Q3/DR-001)**: `buildings.json` je neúplný (4 budovy, `provenance:'derived'`, gap-report `G-LISTBUILDINGS`). Plný `listBuildings.json` není v extraktu. Dle Q3/DR-001: **chybějící data → `provenance:'approximated'`, doplnit autonomně, uživatel je jen informován (ne blocker); decision record jen při materiální díře.**

**Doplnit `buildings.json` autonomně** na min. hratelnou sadu. Každá doplněná budova: `provenance:'approximated'` per chybějící pole, `_meta.gap:'G-LISTBUILDINGS'`. Pole potřebná pro M5 (z mechanik §1–4): `id, name, category, baseCost{}, resistance, maxProgress, builders, spaceType, effects{}, unlocked`.

**Minimální hratelná sada M5** (≥6 budov pokrývajících mechaniky — opotřebení, agregáty, kapacity, attractiveness):

| id | category | účel / efekt (modifikátor) | proč nutné pro M5 |
|---|---|---|---|
| `builderHut` (exist.) | production | `maxActiveProjects`, `maxProjectQueue`, builder kapacita | bez něj nelze stavět (kapacita fronty) |
| `granary` (exist.) | storage | `storage` food kapacita (agregát) | testuje storageCapacity agregát |
| `warehouse` (exist.) | storage | `storage` goods kapacita | testuje storageCapacity agregát |
| `townCenter` (exist.) | service | `attractiveness`, `maxWorkers` | testuje attractiveness→settlementLevel + maxWorkers |
| `house` (NOVÁ) | housing | `workers` (maxWorkers agregát) | testuje maxWorkers z budov (napojení jobs.workerSlots) |
| `well`/`hut` (NOVÁ) | service | `attractiveness` malá | levná budova pro testy scaleCost/age (nízký cost) |

- **Resistance/maxProgress/builders** = `provenance:'approximated'` (originál hodnoty neznámé): coder zvolí rozumné defaulty (`resistance:100`, `maxProgress:5-20 dnů`, `builders:1-3`) s odkazem na `BALANCE.buildings.defaultResistance`.
- **effects** = modifikátory v tvaru použitelném T4.3 (`{ workers: +5 }` → modifier `{op:'add', attr:'workers', value:5}` per instance). Mapování `building.effects → modifier` definuje T4.3.
- **Eskalace**: pouze **informativní** v shrnutí orchestrátorovi (ne blocker). Decision record jen pokud by aproximace měla materiální balanční dopad — pro M5 (mechaniky, ne kalibrace; čísla se ladí v M9) **nemá** → bez DR, jen `provenance` flagy + gap-report aktualizace.

---

## 10. Tvrdá omezení — ověření (determinismus + catch-up-safe)

- **Žádný `Date.now()`**: `project.id`/`contract.id`/`instId` → deterministické čítače (`projectSeq`/`contractSeq`/`totalMade`), ne `(new Date()).getTime()` (originál home.js:2344 — vědomě nahrazeno, §2.1, §5.1).
- **Žádný `Math.random()`**: `ageBuildings` → `rng.stream('buildings')` (nový izolovaný stream, M5-D2). Builder/build/kontrakty completion jsou deterministické (žádný RNG). Generátor nabídek kontraktů → `rng.stream('events')`.
- **Žádný DOM/UI v core**: vše v `src/core/*`; UI jen selektory + commandy (§6).
- **Levné v dávce**: `ageBuildings` day-edge (1×/den), `buildersProcess` quarterDay (4×/den) — ne per-step. Agregáty event-driven (ne polling). `effective` memoizováno (§4.2). Catch-up-safe invariant (S-05, §4.1 arch) splněn.
- **Žádná změna architektury iter-002**: vše konkretizuje existující K13 (§5.3)/K14 (§5.4)/persist (§6.3)/transakce (§7.1)/kontrakty (§8). Nové stavové sub-stromy respektují K0 (serializovatelné), persist allowlist (§6.3), command/snapshot hranici (§3.3-3.4).

---

## 11. Rizika a mitigace (M5-specifická)

| # | Riziko | Mitigace |
|---|---|---|
| M5-R1 | `effective` fold se rozejde mezi novou hrou a loadem (load-only větev) | Jediná cesta `recalcBuildingDerived` volaná z complete/destroy I load Step 5; round-trip test T4.6 |
| M5-R2 | `created` drift vůči `instances.length` po loadu | Load re-derivuje `created=instances.length`; reviewer invariant gate (§1.4) |
| M5-R3 | Modifier cache se omylem uloží (derivát v savu) | `_`-prefix + `home.derived` mimo allowlist; reviewer grep na payload (§4.5) |
| M5-R4 | Cena budov škáluje jinak než originál (originál neškáluje) | `costScaleFactor=1.0` default = věrné; `provenance:'approximated'`, gap G-BUILD-COSTSCALE, kalibrace M9 |
| M5-R5 | Builder cadence (per-step→quarterDay) změní rychlost staveb | `masonStep` přepočítán na quarterDay dávku; tabulkový test completionUnits; balance konstanta laditelná M9 |
| M5-R6 | Repair odložená platba (paid až v builderu) rozbije atomicitu | `pay` je atomické (canAfford před mutací, transactions.js); paid flag persistován |

---

## 12. Mapování na K0–K19 / D / §

| Položka | Kde v M5 designu |
|---|---|
| K0 (serializovatelný stav) | §1.1, §2.1, §5.1 — sub-stromy plain-data |
| K5 (transakce) | §2.3 `pay`, §5.3 `grant` přes existující resources vrstvu (§7.1 arch) |
| K11 (persist allowlist, load=čistá konstrukce) | §1.4, §4.6, §5.4 |
| K13 (immutable katalog + modifikátory) | §4 celé (effective/fold/cache/agregáty/save jen modifiers) |
| K14 (akce obsahu jako data) | §2.2 onBuild, §5.1-5.3 onComplete/onExpire/onReject = string-ID+params |
| K16/D4 (RNG streamy) | §1.2 `rng.stream('buildings')`, §10 |
| K17 (schedule index) | §5.2 `contract.expire` přes scheduler (deduplikace scheduleCount) |
| §6.3-6.4 (persist/load) | §1.4, §4.6 |
| §8 (kontrakty kontrakt) | §5 — onComplete/onExpire/onReject dle §5.4 arch |
| §9.1 (getGoldValue) | §1.3 repair oceňování (M4b kontrakt, smí se volat) |

---

*Konec designu. Coder (Sonnet) implementuje T1–T6 z této úrovně bez dalšího architektonického rozhodnutí. Split DOPORUČEN (§8). G-LISTBUILDINGS řešen autonomně (§9). Kde dokument cituje K/D/§/home.js:NNNN, je zdrojem pravdy architektura iter-002 a originál `doc/original_source/`.*
