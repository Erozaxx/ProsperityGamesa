# Implementační design — M5: Budovy, stavba, kontrakty (iter-013, T-001 → revize T-002a)

- **Task**: T-001 (orig.), revize **T-002a**, iter-013 (BRIEF-013-001 → BRIEF-013-002a)
- **Autor**: architect
- **Datum**: 2026-06-13 (orig.), revize 2026-06-14 (T-002a)
- **Milník**: M5 (master plán iter-003 §3/iter-012, posunuto +1 dle DR-013-00 na iter-013) · K13 (modifikátory z budov), K14 (registr efektů). **Po splitu DR-013-01: tento dokument pokrývá M5-1 (T1–T4); T5/T6 = M5-2/iter-014 — viz §5–§6 (Odloženo).**
- **Vstupy**: architektura iter-002 (§5.3 K13, §5.4 K14, §6.3–6.4 persist, §7.1 transakce, §8 kontrakty), master plán §3/iter-012 + §1.2, DR-013-00, DR-013-01 (split + 4 podmínky), Q3/DR-001 (gap politika), review `review_design_iter-013_T-002.md` (4 major + minor/nit), reálný kód `src/save/load.js`+`persistSchema.js`+`src/core/registry/effects.js`+`src/core/*`+`src/data/*`, originál `doc/original_source/.../home.js`+`config.js`+`buildingcard.js`.
- **Účel**: detailní design **M5-1 (T1–T4)** na úroveň, ze které Sonnet coder implementuje **bez dalšího architektonického rozhodnutí**. Žádný produkční kód. Žádná změna architektury iter-002 — pouze její konkretizace pro M5.

---

## Changelog — Revize T-002a (2026-06-14)

> Tato revize zapracovává **4 major podmínky** z reviewer gate (T-002, GO-s-podmínkami; DR-013-01) a **zužuje scope na M5-1 (T1–T4)**. Originální tělo designu T-001 zůstává; tato sekce je řízená diferenciace a vede čtenáře k upraveným sekcím. **Při rozporu má přednost tento changelog + revidované sekce §1.4, §2.3, §4.**

**Platný dokument**: tento soubor (`design_iter-013_T-001.md`) je po revizi T-002a **jediný platný** design M5-1. Žádný separátní `design_iter-013_T-002a.md` se nevytváří.

### Jak je vyřešeny 4 major (detail v sekcích)

- **M-1 — effects→modifier mapování + JEDNA cesta agregátů** → nová **§4.3** (úplné mapovací pravidlo: op add/mul/set z dat, mapové attr přes dot-path, **per-typ** agregace, deterministické `modifier.id`/`source`) + **§4.4 přepsána**: kanonická cesta agregátů = **fold přes modifikátory** (`recalcBuildingAggregates` sčítá `effective(id,attr)` kde modifikátory už nesou `created×per-instance`). Druhá cesta (`created × effective` jako samostatný součin) **odstraněna** — eliminace rizika dvojího započtení. Viz §4.3 pravidlo „multiplicita instancí je v `value` modifikátoru, ne v agregační smyčce".
- **M-2 — sdílený `rebuildBuildingDerived(state)`, žádná load-only větev** → **§1.4 + §4.6 přepsány** + nová **§4.7**: jediná fn `rebuildBuildingDerived(state)` (created re-derivace + fold modifikátorů z budov + agregáty), volaná z **load Step 5** I z **každé mutace budov** (`completeBuild`/`destroyInstance`/`applyRepair`). Load-only derivační větev **explicitně zakázána** (M5-R1, stejná třída bugu jako DR-012-02). Ověřeno proti `load.js:217-225` (Step 5 dnes počítá JEN `workforce.total`) — coder MUSÍ rozšířit, ne „doplnit jako jobs".
- **M-3 — deterministický fold** → **§4.1 přepsána**: před foldem se modifikátory **řadí `sort by (source, id)` lexikograficky**; `set` bere **poslední po tomto řazení** (ne poslední v pořadí vložení do `modifiers[]`). Pořadí už NEzávisí na insertion order → fold je deterministický nová-hra i load (K16). Tabulkový test se dvěma `set` různého source.
- **M-4 — build command bez ctx → pay bez emitTx** → **§2.3 přepsána** (s ověřením kódu): `dispatch.js:44-59` volá `handler(state, params)` → **commandu se ctx NEpředává**; předat ctx (Volba A) by vyžadovalo **změnu signatury `dispatch`/`registerCommand`** = změna architektury command vrstvy iter-002 → **mimo povolený scope**, NEDĚLÁ se. `transactions.js:29,45` potvrzuje `pay(...,ctx)` má ctx **optional** (`if(ctx&&ctx.emitTx)`) → `pay` bez ctx funguje korektně, jen vynechá audit. **Zvolena Volba B = vědomý gap G-BUILD-TXAUDIT** (M-4): stavba se neobjeví v měsíčním tx reportu (neblokuje hratelnost; gold se odečte), dořeší M5-2/M9 zavedením ctx do command vrstvy.

### Scope změny

- **Zúženo na M5-1 (T1–T4)**: §5 (T5 kontrakty) a §6 (T6 build UI) jsou **přesunuty do §13 „Odloženo na M5-2/iter-014"** (jen krátká poznámka, plný design udělá architekt v iter-014). Sekce §5/§6 v těle ponechány jako **archiv** pro M5-2 a označeny „[ODLOŽENO M5-2]" — coder M5-1 je IGNORUJE.
- **T4 dekompozice (§4.8, dříve §4.4)** aktualizována tak, aby T4.3/T4.4/T4.6 reflektovaly sdílený `rebuildBuildingDerived` (M-2) a jednu cestu agregátů (M-1); přidána §4.6 (sdílená derivační fn) + §4.7 (mutace volají sdílenou cestu) + §4.3 (mapování effects→modifier).
- Minor/nit zapracovány: m-1 (dot-path zafixován, §4.1/§4.3), n-2 (param `count`/`builtCount`, §2.4), m-2 (payload grep test, §4.5/§4.8 T4.6), n-3 (rozšířit i 4 existující budovy, §9), m-5 (T4.5 ověřit integrační body za běhu).

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
| M5-D7 | Modifier vrstva (K13): `effective(itemId, attr, state)` čistá fold add→mul→set s **deterministickým řazením `sort by (source,id)`** (M-3); memoizace mimo cache objektu s verzí, invalidace bump verze při změně `catalogState.modifiers`; **JEDNA cesta agregátů** = fold přes modifikátory (M-1), multiplicita instancí v `value` modifikátoru. **Save = JEN `catalogState.modifiers`** (ověřeno persistSchema.js:41 — `catalogState` ukládán celý). | §4 | §5.3, createInitialState.js:115, persistSchema.js:41 |
| **M5-D7a (T-002a)** | **Sdílený `rebuildBuildingDerived(state)`** (M-2): created re-derivace + fold modifikátorů z budov do `catalogState.modifiers` + `recalcBuildingAggregates`. Volaný z **load Step 5 I z každé mutace budov** (complete/destroy/repair). **Load-only derivační větev zakázána.** | §1.4, §4.6, §4.7 | M-2, load.js:217-225 (Step 5 dnes jen workforce.total — DR-012-02) |
| **M5-D7b (T-002a)** | **Mapování `building.effects → modifier`** (M-1): pravidlo op (add/mul/set), mapový attr přes dot-path, **per-typ** agregace (multiplicita v `value`), deterministické `modifier.id`/`source`. | §4.3 | M-1, §5.3 arch |
| M5-D8 | **[ODLOŽENO M5-2]** Kontrakty (K14): `state.home.contractQueue` = pole; `onComplete/onExpire/onReject` = string-ID do registru efektů + params v datech; expirace přes `scheduleInsert`. | §13 (orig. §5) | §5.4, effects.js, scheduler.js |
| M5-D9 | **Split POTVRZEN (DR-013-01): iter-013 = M5-1 (T1–T4) / iter-014 = M5-2 (T5–T6).** | §8, DR-013-01 | split-trigger §3/iter-012 |
| M5-D10 | G-LISTBUILDINGS: doplnit buildings.json autonomně na ≥6 budov, `provenance:'approximated'` per pole; min. hratelná sada v §9; **rozšířit i 4 existující budovy o nová pole** (n-3). | §9 | Q3/DR-001, gap-report |
| **M5-D11 (T-002a)** | **build command txAudit** (M-4): Volba A (předat ctx) zamítnuta — vyžaduje změnu signatury `dispatch`/`registerCommand` (arch iter-002, mimo scope). **Volba B zvolena**: `pay` bez ctx (ctx je optional, `transactions.js:45`), vědomý gap **G-BUILD-TXAUDIT** (audit dořeší M5-2/M9). | §2.3 | M-4, dispatch.js:44-59, transactions.js:29,45 |

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
- `destroyInstance`: odebere instanci z pole, `created--`, **přepočítá modifikátory budovy + invaliduje cache + recalc agregátů přes sdílenou cestu** (§4.7, M-2) protože budovy nesou agregáty.
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
- Load Step 5 (recalculate, `load.js:217-225` — dnes počítá JEN `workforce.total`, M-2): po `applyPayload` zavolat **sdílený `rebuildBuildingDerived(state)`** (§4.6) = (a) `created = instances.length` per budova, (b) re-gen building modifikátorů, (c) `recalcBuildingAggregates` (jedna cesta, §4.4). Tatáž fn volaná z mutací (§4.7) → **žádná load-only větev** (M5-R1, §6.4). Pořadí: `rebuildBuildingDerived` PŘED `deriveWorkforceTotal` (workforce čte `derived.maxWorkers`).

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

**M-4 (T-002a) — build command bez `ctx` → `pay` bez `emitTx` audit. ROZHODNUTÍ + ověření kódu:**

- **Ověřeno** (`dispatch.js:44-59`): `dispatch(creg, state, cmd)` volá `handler(state, params)` — **command handleru se NEpředává `ctx`**. Signatura command vrstvy je `(state, params)` (pevná v architektuře iter-002 command/snapshot hranice).
- **Ověřeno** (`transactions.js:29,45`): `pay(state, cost, cause, ctx, step)` má `ctx` **optional** — řádek `if (ctx && ctx.emitTx) ctx.emitTx(...)`. Tedy `pay(state, cost, 'build:'+itemId)` **bez ctx funguje korektně** (žádný throw), jen tiše vynechá emitTx audit událost. Gold se odečte správně; chybí jen řádek v transakčním auditu/měsíčním reportu (K5/K18 observer).
- **Volba A (preferovaná briefem) — předat ctx do build commandu**: vyžadovala by **rozšířit signaturu `dispatch`/`registerCommand` o ctx** (`handler(state, params, ctx)` + propagovat ctx z volajícího). To je **změna architektury command vrstvy iter-002** → **mimo povolený scope** ("žádná změna architektury iter-002"). **Proto Volba A se NEDĚLÁ v M5-1.**
- **Volba B (zvolená) — vědomý gap `G-BUILD-TXAUDIT`**: M5-1 volá `pay(state, cost, 'build:'+itemId)` bez ctx → stavba se neodrazí v měsíčním tx reportu. **NEblokuje hratelnost** (gold se odečte; accounting je enhancement). Dořeší se v **M5-2/M9** zavedením ctx do command vrstvy (čistá změna arch, vlastní iterace). Gap zapsat do gap-reportu, `provenance:'approximated'`.
- **Reviewer/coder ověří před implementací**: že `pay` s vynechaným ctx skutečně neháže (potvrzeno výše `transactions.js:45`) a že žádný jiný invariant accounting (K5/K18) nevyžaduje povinné emitTx pro korektnost stavu (jen pro report). Není blocker.

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

**Fold pořadí (add → mul → set)** — striktní (§5.3 arch "add → mul → set") s **deterministickým řazením (M-3, T-002a)**:

```
fold(base, mods):
  // M-3: PŘED foldem deterministicky seřaď, NE podle pořadí vložení do modifiers[]
  sorted = mods.slice().sort(cmpModifier)          // cmpModifier viz níže
  add = sum(sorted where op==='add' .value)
  result = base + add
  for m in sorted where op==='mul' (v pořadí sorted): result *= m.value
  setMods = sorted where op==='set'
  if setMods.length: result = setMods[setMods.length-1].value   // POSLEDNÍ po sort vyhrává (ne insertion order)
  return result

cmpModifier(a, b):
  if a.source !== b.source: return a.source < b.source ? -1 : 1   // lexikograficky dle source string
  if a.id     !== b.id:     return a.id     < b.id     ? -1 : 1   // tie-break dle id (taky lexikograficky)
  return 0
```

- `modifier = { id, source, target, attr, op:'add'|'mul'|'set', value }` (přesně tvar §5.3 arch).
- **Deterministické řazení (M-3 — proč je nutné)**: `add` (součet) a `mul` (součin) jsou komutativní → pořadí výsledek nemění. ALE `set` (poslední vyhrává) je **pořadím rozhodnut**. `state.catalogState.modifiers` je pole; jeho insertion order se může lišit nová-hra vs. load (load aplikuje modifikátory přes `rebuildBuildingDerived` v jiném pořadí než postupná stavba) → bez řazení by `set` foldoval nedeterministicky (porušení K16). Proto se **vždy** řadí `sort by (source, id)` lexikograficky před foldem, pro VŠECHNY op (ne jen set), aby byl fold bit-identický nová-hra i load.
- **Mapové atributy (m-1, dot-path ZAFIXOVÁN)**: pro mapový attr (`baseCost = {wood:30, stone:10}`) je **kanonický tvar attr = dot-path** (`'baseCost.wood'`, `'baseCost.stone'`). Modifikátor cílí na jeden listový klíč; `effective` voláné s `'baseCost'` (bez dot-path) vrací rekonstruovanou mapu = `{k: effective(id,'baseCost.'+k)}` přes všechny klíče base mapy. Coder NEVOLÍ — dot-path je fixní (konzistence T4.1 ↔ T4.3 ↔ persist).
- **Tabulkový test (M-3)** — dva `set` různého `source`: mods `[{source:'B',op:'set',value:9},{source:'A',op:'set',value:5}]` (vloženo v tomto pořadí) → po sort `A` před `B` → `set` poslední = `B`(9). Otoč insertion order → výsledek STEJNÝ (9). Determinismus nezávislý na insertion order.

### 4.2 Memoizace + invalidace

Cache **mimo perzistentní stav** (NIKDY se neukládá — derivát):

```
state.catalogState._effCache = { version: number, map: Map<string,number> }   // _-prefix = neperzistentní (allowlist ho nezahrne)
state.catalogState._modVersion = number                                        // bump při každé změně modifiers
```

- `effective` čte cache jen pokud `_effCache.version === _modVersion`, jinak `_effCache.map.clear()` + `version = _modVersion`.
- **Invalidace = bump `_modVersion`** kdykoli se mění `catalogState.modifiers` (stavba/destrukce budovy, tech v M6, event). Helper `invalidateModifiers(state)`.
- `_effCache`/`_modVersion` mají `_` prefix → **persist allowlist je nepokrývá** (§6.3, ukládá se jen deklarované). Po loadu se `_modVersion` resetuje na 0 a cache je prázdná → první `effective` přepočítá. **Save = JEN `catalogState.modifiers`** (M5-D7, už v allowlistu přes `catalogState`).

### 4.3 Mapování `building.effects → modifier` (M-1, T-002a — pravidlo jádra K13)

**Toto je úplné mapovací pravidlo** (review M-1: dříve jen příklad). `building.effects` (data z `buildings.json`) → záznamy `modifier` v `state.catalogState.modifiers`. Žádné architektonické rozhodnutí pro codera.

**Datový tvar `building.effects` v `buildings.json`** (kanonický, pole atomů — explicitní op):

```
"effects": [
  { "attr": "workers",        "op": "add", "value": 5 },        // skalární atribut
  { "attr": "storage.food",   "op": "add", "value": 200 },      // mapový atribut přes dot-path
  { "attr": "attractiveness", "op": "add", "value": 3 },
  { "attr": "marketSellMul",  "op": "mul", "value": 1.1 }        // multiplikativní
]
```

- **op typy**: `'add'` (sčítá), `'mul'` (násobí), `'set'` (přepisuje, poslední po sort vyhrává — §4.1). Všechny tři přípustné z dat; `op` chybějící → default `'add'` (zpětně kompatibilní s legacy tvarem `{workers:5}`, viz níže).
- **Mapové atributy**: cíl je listový klíč přes dot-path (`'storage.food'`, `'baseCost.wood'`) — shodné s fold dot-path konvencí §4.1. Nikdy se necíluje na celou mapu.
- **Legacy/zkrácený tvar** (volitelná tolerance): `"effects": {"workers": 5, "attractiveness": 3}` → každý pár `(attr, num)` → atom `{attr, op:'add', value:num}`. Coder smí normalizovat oba tvary do kanonického pole atomů při generování modifikátorů.

**Generování modifikátoru** `addBuildingModifiers(state, buildingId)` (volaný z `completeBuild`, T4.3):

```
for atom in normalizeEffects(byId(buildingId).effects):
  mod = {
    id:     `bld:${buildingId}:${atom.attr}:${atom.op}`,   // DETERMINISTICKÝ, per-TYP (ne per-instance) — viz níže
    source: `building:${buildingId}`,                       // DETERMINISTICKÝ, per-budova-typ
    target: buildingId,
    attr:   atom.attr,
    op:     atom.op,
    value:  atom.value * created_pro_op_add_a_set ? ... viz "Per-typ agregace"
  }
```

**Per-typ agregace (ROZHODNUTÍ M-1 — multiplicita instancí je v `value`, NE v agregační smyčce):**

- Modifikátor je **JEDEN na (buildingId, attr, op)** — NE jeden per instance. `id`/`source` proto NEobsahují `instId` → žádná kolize, deterministické, stabilní napříč save/load.
- **Multiplicita instancí (`created`) je zapečená do `value` modifikátoru** podle op:
  - `op:'add'` → `value = atom.value * created` (5 workers/instance × 3 instance = modifier value 15).
  - `op:'mul'` → `value = atom.value ^ created` (každá instance násobí; 1.1 × 1.1 × 1.1 pro 3 instance). *(Pozn.: pro M5 min. sadu §9 jsou per-typ mul efekty vzácné; pokud balancér nechce kumulativní mul per instance, alternativa `value = atom.value` nezávisle na created — coder řídí konstantou `BALANCE.buildings.mulPerInstance` default `false` = mul nezávislý na count; gap G-BUILD-MULSTACK, approximated.)*
  - `op:'set'` → `value = atom.value` (set nezávisí na count — definuje absolutní hodnotu atributu).
- Při změně počtu instancí (`completeBuild`/`destroyInstance`) se modifikátor **přepočítá** (znovu vygeneruje s aktuálním `created`) přes `addBuildingModifiers`/`removeBuildingModifiers` + `invalidateModifiers`. To je jediné místo, kde `created` vstupuje do agregátů.

> **Důsledek pro M-1 (jedna cesta agregátů)**: protože `created` je už ve `value` modifikátoru, agregační smyčka §4.4 čte JEN `effective(id, attr)` a **NIKDY** ji nenásobí `created`. Tím je odstraněna druhá cesta (`created × effective`) → žádné dvojí započtení.

### 4.4 Event-driven agregáty — JEDNA kanonická cesta (M-1, T-002a)

Agregáty NEjsou per-attr `effective` na jedné budově — jsou **součty napříč budovami**. **JEDINÁ kanonická cesta = fold přes modifikátory** (`effective` už nese multiplicitu instancí ve `value`, §4.3). Přepočet **event-driven**, ne polling (§5.3 arch "ne pollingem"):

```
recalcBuildingAggregates(state):
  // JEDNA CESTA: effective(id, attr) už zahrnuje created (multiplicita je ve value modifikátoru, §4.3).
  // NIKDY nenásob created v této smyčce → eliminace dvojího započtení (M-1).
  state.home.derived.maxWorkers      = Σ over buildingId in state.home.buildings: effective(id,'workers',state)
  state.home.derived.storageCapacity = Σ over buildingId: effective(id,'storage.<resource>',state)  // per-resource, dot-path
  state.home.derived.attractiveness  = Σ over buildingId: effective(id,'attractiveness',state)
  // settlementLevel pak čte attractiveness (formulas.settlementLevel — už existuje)
```

- **ODSTRANĚNÁ druhá cesta (M-1)**: dřívější `Σ created * effective(id,'workers')` je **zrušena**. `created × per-instance` je nyní výhradně ve `value` modifikátoru (§4.3). Smyčka sčítá pouze `effective(id, attr)`. Existuje tedy **jen jedna definice** "kolik workers dává budova X" = `effective(X,'workers')` (= base + Σ add-modifikátorů, kde building modifikátor už má `value = perInstance*created`).
- `state.home.derived` = **neperzistentní** kontejner derivátů (jako `_effCache`). Allowlist ho NEzahrne; `rebuildBuildingDerived` (load Step 5) ho přepočítá.
- **Triggery přepočtu** (event-driven): (1) `completeBuild`, (2) `destroyInstance`/`applyRepair` (mění modifikátory/HP), (3) přidání/odebrání modifikátoru (M6 techy), (4) load Step 5 přes `rebuildBuildingDerived`. Žádný per-tick polling. Všechny tyto cesty volají `recalcBuildingAggregates` přes sdílenou fn → viz §4.7.
- Napojení: `jobs.workerSlots` (m-5: coder ověří aktuální fn/řádek, kód se posunul od extrakce arch) dnes čte jen `houseTypes`; M5 rozšíří o `state.home.derived.maxWorkers` z budov (gap G-POP-WORKFORCE odkazuje na M5). `housing.settlementLevel` čte `derived.attractiveness`.

### 4.5 Kritický invariant (review gate)

- **Žádné in-place `applyUpgrade` mutace** katalogu: `effective` NIKDY nemutuje `byId(itemId).entry`. Katalog je immutable (`Object.freeze` v dev). Modifikátory jsou data v `state.catalogState.modifiers`, ne `base*` dvojníci.
- **Derivovaná data se NEUKLÁDAJÍ**: `_effCache`, `_modVersion`, `home.derived`, `progressPct`, `created` (re-derived) — žádné v persist allowlistu. Reviewer grep (formalizovat jako test, m-2): persist payload nesmí obsahovat `derived`/`_effCache`/`maxWorkers`.

### 4.6 `rebuildBuildingDerived(state)` — JEDINÁ sdílená derivační cesta (M-2, T-002a)

**Toto je centrální anti-bug rozhodnutí (M-2).** Dnes `load.js` Step 5 (ověřeno `load.js:217-225`) počítá JEN `workforce.total` přes `deriveWorkforceTotal` — žádný obecný rebuild budov. Pokud coder "doplní blok jako jobs" a postaví load-only derivační větev, vznikne **přesně stejná třída bugu jako DR-012-02** (reload desync): nová hra a load se rozejdou. **Proto se zavádí JEDNA sdílená funkce.**

```
// src/core/systems/buildings.js (čistá vůči RNG; jen čte instances + katalog + přepisuje modifiers/derived)
rebuildBuildingDerived(state):
  // (a) created re-derivace z pravdy = instances.length (ochrana proti driftu, §1.4)
  for buildingId in state.home.buildings:
    b.created = b.instances.length

  // (b) fold modifikátorů Z BUDOV do catalogState.modifiers
  //     = odeber všechny modifikátory se source `building:*`, znovu je vygeneruj z aktuálního stavu budov
  removeAllBuildingSourcedModifiers(state)              // filtr source.startsWith('building:')
  for buildingId in state.home.buildings (created > 0):
    addBuildingModifiers(state, buildingId)             // §4.3 — value už nese created
  invalidateModifiers(state)                             // bump _modVersion (§4.2)

  // (c) agregáty JEDNOU kanonickou cestou (§4.4)
  recalcBuildingAggregates(state)
```

- **Volá se ze DVOU míst, jinak NIKDY**:
  1. **load Step 5** (`load.js`, po `applyPayload`, vedle/po `workforce.total` — pořadí: nejdřív `rebuildBuildingDerived` pak `deriveWorkforceTotal`, protože workforce může číst `derived.maxWorkers`).
  2. **každá mutace budov za běhu** přes §4.7 (`completeBuild`/`destroyInstance`/`applyRepair`).
- **M5-R1 (zákaz load-only větve, T-002a)**: NEEXISTUJE žádná derivační logika, kterou by volal jen load a ne mutace (ani naopak). Reviewer gate: grep, že `recalcBuildingAggregates`/`addBuildingModifiers` nejsou volány přímo z `load.js` — pouze přes `rebuildBuildingDerived`. Round-trip test povinný (§4.8 T4.6).
- **Proč fold idempotentní (b)**: `removeAllBuildingSourcedModifiers` + re-add zaručí, že opakované volání `rebuildBuildingDerived` dá stejný výsledek (žádná akumulace duplicit). Modifikátory z jiných zdrojů (M6 techy, eventy, `source` ≠ `building:*`) zůstanou nedotčené.
- **Determinismus**: po (b) je `catalogState.modifiers` v pořadí generování, ALE fold (§4.1) řadí `sort by (source,id)` → výsledek `effective` je nezávislý na pořadí re-addu. Load i nová hra dají bit-identické agregáty.

### 4.7 Mutace budov volají sdílenou cestu (M-2)

Každá mutace, která mění počet/stav budov, **MUSÍ** projít sdílenou derivační cestou — buď celý `rebuildBuildingDerived(state)`, nebo (optimalizace) cílený delta přes stejné helpery `addBuildingModifiers`/`removeBuildingModifiers` + `recalcBuildingAggregates`. **Žádná mutace nesmí počítat deriváty vlastní logikou.**

| Mutace | Kde (§) | Co volá | Pozn. |
|---|---|---|---|
| `completeBuild(state, project, ctx)` | §2.2 | `instances.push` + `created++` + `totalMade++` → `addBuildingModifiers(buildingId)` + `invalidateModifiers` + `recalcBuildingAggregates` | nová instance mění `created` → value modifikátorů (§4.3) se musí přepočítat |
| `destroyInstance(state, buildingId, instId, ctx)` | §1.2 | odebrat instanci + `created--` → `addBuildingModifiers` (re-gen s novým created) nebo `removeBuildingModifiers` při created==0 + `invalidate` + `recalcBuildingAggregates` | |
| `applyRepair(state, project, ctx)` | §2.2 | `inst.hp += resistance` + `inst.inRepair=false` → `recalcBuildingAggregates` (HP nemění modifikátory, ale držíme jednu cestu) | repair nemění `created`; agregáty se nemění, ale volání je levné a drží invariant |

- **Doporučená implementace (M-2 jednoduchost)**: protože re-gen modifikátorů jedné budovy je levný a počet typů budov je malý (≤ desítky), coder smí v `completeBuild`/`destroyInstance` volat rovnou celé `rebuildBuildingDerived(state)` místo cíleného delta — kód je pak triviálně shodný s load Step 5 (jedna fn, jeden test). Delta optimalizace je volitelná a NESMÍ zavést druhou derivační logiku.

### 4.8 POVINNÁ dekompozice L na Sonnet-proveditelné kroky (§1.2) — aktualizováno T-002a

T4 je **L** — rozpad na 6 atomických kroků, každý samostatně testovatelný, žádný nevyžaduje architektonické rozhodnutí. **T-002a**: T4.3/T4.4/T4.6 přepsány tak, aby reflektovaly sdílený `rebuildBuildingDerived` (M-2), jednu cestu agregátů (M-1) a deterministický fold (M-3).

| Krok | Co | Soubor | Test (Sonnet) | Závisí |
|---|---|---|---|---|
| **T4.1** | `effective(itemId, attr, state)` + `fold(base, mods)` čistá fn (add→mul→set) s **deterministickým `sort by (source,id)`** (M-3); dot-path pro mapové attr (m-1, ZAFIXOVÁN) | `catalog/effective.js` | tabulkový: base bez mods = base; add+mul+set pořadí; **dva `set` různého source → výsledek nezávislý na insertion order** (M-3) | — |
| **T4.2** | Memoizace: `_effCache`/`_modVersion` + `invalidateModifiers(state)`; `effective` čte/plní cache | `catalog/effective.js` | cache hit po 2× volání; po `invalidate` přepočet; jiný výsledek po změně mods | T4.1 |
| **T4.3** | **Mapování effects→modifier (M-1)**: `addBuildingModifiers(state, buildingId)` / `removeBuildingModifiers` dle §4.3 — op add/mul/set z dat, dot-path mapové attr, **per-typ** (`id=bld:${buildingId}:${attr}:${op}`, `source=building:${buildingId}`), **multiplicita `created` ve `value`** (NE per-instance modifikátor) | `systems/buildings.js` | postav budovu → 1 modifier per (attr,op) v seznamu; 2. instance → `value` se zdvojnásobí (add); znič → re-gen/zmizí; round-trip seznamu | T4.1, T4.2 |
| **T4.4** | **`recalcBuildingAggregates(state)` JEDNA cesta (M-1)** → `state.home.derived.{maxWorkers,storageCapacity,attractiveness}` = `Σ effective(id,attr)` **bez násobení `created`** (created je ve value); volat jen přes §4.6/§4.7 | `systems/buildings.js` | 2 budovy → součet; po destrukci klesne; **assert: agregát = Σ effective (žádné dvojí ×created)** | T4.3 |
| **T4.5** | Napojení agregátů: `jobs.workerSlots` čte `derived.maxWorkers`; `housing.settlementLevel` čte `derived.attractiveness`. **m-5: ověřit aktuální fn/řádek za běhu** (kód se posunul od extrakce arch, ne slepě jobs.js:45) | `systems/jobs.js`, `systems/housing.js` | maxWorkers ovlivní autoAssign; attractiveness ovlivní level | T4.4 |
| **T4.6** | **Sdílený `rebuildBuildingDerived(state)` (M-2)** = `created=instances.length` + re-gen building modifikátorů + `recalcBuildingAggregates`; **volaný z load Step 5 I z mutací** (§4.7); **zákaz load-only větve** (reviewer grep: `recalcBuildingAggregates` nevolán přímo z `load.js`). **Save = jen `catalogState.modifiers`** (ověřit `persistSchema.js:41` ukládá `catalogState` celý). Persist blok pro `home.buildings`/`projectQueue`/`projectSeq` přidat do `applyPersist`/`applyPayload` (m-2: payload grep test) | `save/load.js`, `save/persistSchema.js`, `systems/buildings.js` | save (jen modifiers) → load → `derived` === před save (round-trip); `created===instances.length` po loadu; payload grep neobsahuje `derived`/`_effCache`/`maxWorkers` | T4.4, T4.3 |

> **Pozn. k `applyPersist` (M-1 realizace, ověřeno)**: `applyPersist` (`persistSchema.js:36-195`) je psaný **imperativně per doména** (home má bloky pro population/housing/food/.../jobs/skills, NE generický loop). Coder MUSÍ přidat blok pro `home.buildings` (per id `{created,totalMade,instances:[{instId,hp,inRepair}]}`), `home.projectQueue`, `home.projectSeq` — analogicky k `jobs` bloku (ř. 150-158). Není to "jen řádek do allowlist tabulky".

---

## 5. T5 — Kontrakty (K14)  **[ODLOŽENO M5-2 / iter-014 — viz §13. Coder M5-1 IGNORUJE §5–§6.]**

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

## 6. T6 — UI build screen + kontrakty panel (data/selektory/commandy)  **[ODLOŽENO M5-2 / iter-014 — viz §13. Coder M5-1 IGNORUJE.]**

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

## 7. TickOrder dopady (živý artefakt §4.3 arch) + diagram

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

1. **T4 je L s povinnou 6-krokovou dekompozicí** (§4.8) — sám o sobě naplní kapacitu iterace. T1–T4 = T1(M)+T2(M)+T3(M)+T4(L=~6 sub-kroků) ≈ 9 efektivních jednotek práce + test loop + review. To je horní hranice jedné iterace.
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
| M5-R1 | `effective` fold se rozejde mezi novou hrou a loadem (load-only větev) | Jediná sdílená fn `rebuildBuildingDerived` (§4.6) volaná z complete/destroy/repair (§4.7) I load Step 5; load-only větev explicitně zakázána; round-trip test T4.6 (M-2) |
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

## 13. Odloženo na M5-2 / iter-014 (T-002a)

> **Scope M5-1 (tento design, závazné pro codera) = T1, T2, T3, T4 (§1–§4, §7–§12).** Sekce **§5 (T5 kontrakty)** a **§6 (T6 build UI)** jsou ponechány v těle jako **archiv pro architekta iter-014** a označeny `[ODLOŽENO M5-2]`. **Coder M5-1 je NEimplementuje.**

| Co | Sekce (archiv) | Kam | Pozn. |
|---|---|---|---|
| **T5 — Kontrakty (K14)**: `contractQueue`, onComplete/onExpire/onReject jako string-ID+params, expirace přes schedule, registr efektů rozšíření, persist kontraktů | §5 (§5.1–§5.4) | **M5-2 / iter-014** | Plný design udělá architekt v iter-014 (závisí na T2 pay/fronty + T4 effective). Archiv §5 je vstup, ne finální spec. |
| **T6 — UI build screen + kontrakty panel**: selektory (`selectBuildableBuildings`/`selectProjectQueue`/`selectBuilderCapacity`/`selectContracts`), commandy (`build`/`cancelProject`/`assignBuilder`/`acceptContract`/...) | §6 (§6.1–§6.3) | **M5-2 / iter-014** | M5-1 je hratelné přes commandy/testy (build command §2.3 + builder + builderHut kapacita), ne přes obrazovku (review §4: build screen smí být až M5-2; m-4: DoD M5-1 to explicitně uvede). |

**Dependency hranice (potvrzeno review §4)**: T5/T6 závisí na T2 (pay/fronty) a T4 (effective), ne naopak → M5-1 je samostatně koherentní a otestovatelný základ. Split DR-013-01 POTVRZEN (M5-D9).

**Gapy přenesené do M5-2/iter-014/M9**: `G-BUILD-TXAUDIT` (M-4, emitTx pro stavbu — vyžaduje ctx v command vrstvě, M5-2/M9), `G-CONTRACT-GEN` (zdroj nabídek kontraktů, T5), `G-BUILDER-COMPANIES` (firmy jako enhancement, §3.2). M5-1 gapy (`G-LISTBUILDINGS`, `G-BUILD-COSTSCALE`, `G-BUILD-RESISTANCE`, `G-BUILD-SPACE`, `G-BUILD-TECHBONUS`, `G-REPAIR-RECYCLING`, `G-BUILDER-CAP`, `G-BUILD-MULSTACK`) řešeny `provenance:'approximated'` autonomně (Q3/DR-001).

---

*Konec designu. **Scope po revizi T-002a = M5-1 (T1–T4).** Coder (Sonnet) implementuje **T1–T4** (§1–§4) z této úrovně bez dalšího architektonického rozhodnutí; **§5/§6 (T5/T6) jsou ODLOŽENY na M5-2/iter-014 (§13) a coder je IGNORUJE.** 4 major podmínky vyřešeny: M-1 (§4.3 mapování + §4.4 jedna cesta), M-2 (§4.6 sdílený rebuildBuildingDerived + §4.7), M-3 (§4.1 deterministický sort), M-4 (§2.3 gap G-BUILD-TXAUDIT). Split DOPORUČEN/POTVRZEN (§8, DR-013-01). G-LISTBUILDINGS řešen autonomně (§9). Kde dokument cituje K/D/§/home.js:NNNN, je zdrojem pravdy architektura iter-002 a originál `doc/original_source/`.*
