# Implementační design — M5-2: Kontrakty (K14) + Build UI (iter-014, T-001)

- **Task**: T-001, iter-014 (BRIEF-014-001 / BRIEF-ID BRIEF-014-001)
- **Autor**: architect
- **Datum**: 2026-06-14
- **Milník**: M5-2 (dokončuje M5; split DR-013-01 / M5-D9). Navazuje na M5-1 (`design_iter-013_M5-1.md`, §5/§6/§13 = kostra → tento dokument je plný design).
- **Vstupy**: M5-1 design (`context/refs/design_iter-013_M5-1.md` §5 T5 / §6 T6 / §13), DR-013-00, DR-013-01, architektura iter-002 (§5.4 K14 registr efektů, §5.6 fail-fast fns registr, §6.3–6.4 persist, §7.1 transakce, §8 kontrakty), originál `events.js` + `home.js:2407 insertContract`/`config.js:3248 contract*`/`contractcard.js`, reálný kód: `src/core/registry/effects.js`+`registry.js`, `src/core/systems/buildings.js`, `src/core/engine/scheduler.js`+`tickOrder.js`+`rng.js`, `src/save/load.js`+`persistSchema.js`, `src/ui/{screens,selectors,App}.js`, `src/core/commands/{build,buyCompany,dispatch}.js`, `src/core/resources/transactions.js` (pay/grant), `src/core/systems/market.js` (getGoldValue), `src/app/main.js` (boot wiring).
- **Účel**: detailní design **T5 (kontrakty)** + **T6 (build UI + kontrakty panel)** na úroveň, ze které Sonnet coder implementuje **bez dalšího architektonického rozhodnutí**. Žádný produkční kód. **Žádná změna architektury iter-002** ani command vrstvy (G-BUILD-TXAUDIT zůstává — ctx se commandu nepředává).

---

## Changelog — Revize T-002a (2026-06-14, reviewer gate GO-s-podmínkami)

Tato revize zapracovává **2 blocker + 1 major** z review `review_design_iter-014_T-002.md` (verdikt GO-s-podmínkami). Ověřeno proti kódu (`main.js`, `load.js`, `market.js`, `scheduler.js`, `schema.js`, `migrations.js`, `createHomeState.js`, `build.js`). Žádný kód, žádná změna architektury / command vrstvy (G-BUILD-TXAUDIT zůstává). Detail jednotlivých nálezů níže v §14 (nová sekce). Zbylé major/minor/nit shrnuty tamtéž.

| ID | Závažnost | Co se mění | Sekce |
|---|---|---|---|
| **B1** | blocker | `registerBuild(creg)` + contract commands wired do `bootstrapEngine` — bez něj je build "dark code" (`send('build')` → unknown command) | §6.4, §14.1 |
| **B2** | blocker | `contract.offer` re-arm po loadu přes `armContractOffer(state)` se `scheduleCountOf` guardem (mirror `marketInit`) — jinak staré savy nikdy negenerují kontrakty | §5.1, §6.4, §14.2 |
| **M1** | major | Rozhodnutí: **SAVE_VERSION zůstává 3, žádná migrace polí** (undefined-guard); B2 (schedule re-arm) je nutný NEZÁVISLE na migraci polí | §6.2, §14.3 |
| M2 | major | Init `contractQueue=[]`/`contractSeq=0` v **`createHomeState.js`** (ne createInitialState) | §6.2, §14.4 |
| M-4/NIT | minor/nit | `firstOfferStep ≥ 1`; `title` neukládat (derivovat ze selektoru); `goodsBuyer` mimo min. generátor; hash fresh-vs-roundtrip; G-CONTRACT-SCHED-CLEANUP backlog | §14.5 |

> **Platný dokument po revizi:** **tento** `design_iter-014_T-001.md` (in-place; nový T-002a soubor se NEvytváří). Sekce §5.1/§6.2/§6.4/§10 níže jsou upravené, §14 je nová a je **závazná** tam, kde se kříží se starším textem (§14 má přednost).

---

## 0. Shrnutí rozhodnutí (registr)

| # | Rozhodnutí | Sekce | Opora |
|---|---|---|---|
| M52-D1 | **Zdroj contract dat = DOLOŽITELNÝ z originálu.** `events.js` + `home.js:2407 insertContract` + `config.js:3248 contract*Complete/Expire/Reject` plně definují contract model i lifecycle. Katalog `src/data/contracts.json` je **přepis tohoto modelu** (ne nově vymyšlený), `provenance:'derived'` per pole doložitelné z originálu / `'approximated'` jen pro M5-2 přizpůsobení (absolutní deadlineStep místo countdown, izolace rng). Gap **G-CONTRACTS-CATALOG** se zužuje na "ne všech ~10 originálních contract typů je v min. sadě M5-2" + kalibrace čísel M9. | §2, §3 | events.js:73-417, home.js:2407-2472, config.js:3248-3349 |
| M52-D2 | **`state.home.contractQueue`** = pole serializovatelných kontraktů `{id,type,status,cost,reward,deadlineStep,onComplete,onExpire,onReject}`; **`state.home.contractSeq`** = monotónní čítač (jako `projectSeq`, §2.1 M5-1). Persist přes allowlist (`home.contractQueue`, `home.contractSeq`). | §2 | M5-D8, persistSchema.js, scheduler `_seq` |
| M52-D3 | **Životní cyklus přes registr efektů (K14, §5.4 arch):** `onComplete/onExpire/onReject` = **data** `{effect:'<id>', ...params}` (string-ID do registru efektů + params). NE imperativní háčky. Original `callFn(contract.onComplete,[id])` → `resolve(registry, onComplete.effect)(state, params, ctx)`. | §4 | §5.4 arch, home.js:2456, effects.js |
| M52-D4 | **Expirace přes scheduler:** při `acceptContract` → `scheduleInsert(state, deadlineStep, 'contract.expire', {contractId})`. Handler `contract.expire` v **novém `src/core/systems/contracts.js`**, registrovaný do registru efektů (resolvuje se v schedule fázi tickOrder, §runTick phase 2). **Absolutní deadlineStep** (deterministický), ne per-step countdown originálu (V3-class). | §4, §6 | scheduler.js, tickOrder.js:116-121, home.js:1699 |
| M52-D5 | **Generování kontraktů:** **schedule-driven**, ne polling. Periodický generátor `contract.offer` přes `scheduleInsert(nextStep,'contract.offer',{})` (re-schedule sebe sama na konci). Náhoda (výběr typu) → **izolovaný rng stream `'contracts'`** (nový, K16/D4). M5-2 min. sada: 1–2 typy. Gap **G-CONTRACT-GEN** (perioda + výběrová pravidla = approximated, kalibrace M9). | §5 | events.js:120,192,305 (Engine.insert re-schedule), rng.js STREAM_NAMES |
| M52-D6 | **Commands:** `acceptContract({contractId})`, `rejectContract({contractId})`, `completeContract({contractId})`. Stejná hranice jako build (handler `(state,params)`, bez ctx → G-BUILD-TXAUDIT i pro contract pay/grant). | §6 | dispatch.js:44-59, M-4/M5-D11 |
| M52-D7 | **Build UI + kontrakty panel:** nový `BuildScreen` + `ContractsScreen` v `screens.js`, nové selektory v `selectors.js` (`selectBuildableBuildings`, `selectProjectQueue`, `selectBuilderCapacity`, `selectBuilderCompanies`, `selectContracts`), nové taby v `App.js`. **Jen selektory (read) + commands (write)**, žádná herní logika v UI. | §7 | §3.4 arch, screens.js, selectors.js, App.js |
| M52-D8 | **Boot wiring (NUTNÉ, dnes chybí):** `registerEffects(registry)` se v `bootstrapEngine` (`main.js:86`) **dnes nevolá** → contract.expire/offer/grantReward handlery by se neresolvovaly. M5-2 přidá `registerEffects(registry)` + `registerContractEffects(registry)` do `bootstrapEngine` a `registerContractCommands(creg)`. | §6.4, §8 | main.js:86-103, tickOrder.js:119 resolve |
| M52-D9 | **Determinismus/catch-up-safe:** žádný Date.now/Math.random/DOM v core; contract.id = `contract_${contractSeq}` (ne Date.now); expirace přes serializovatelný schedule (přežije save/load, K17 dedup); generování levné v dávce (schedule one-shot, ne per-step polling); rng jen ve `'contracts'` streamu. | §9 | §10 M5-1, rng.js, scheduler.js |

---

## 1. Kontext a hranice scope

**Co M5-2 přidává** (nad hotové M5-1 v main):
- **T5**: contract systém (queue, lifecycle, generování, expirace, persist) — nový `src/core/systems/contracts.js`, rozšíření `src/core/registry/effects.js`, persist v `load.js`/`persistSchema.js`, init v `createInitialState.js`, balance v `balance.js`, katalog `src/data/contracts.json`, boot wiring v `main.js`.
- **T6**: build UI + kontrakty panel — nové selektory (`selectors.js`), nové screeny (`screens.js`), nové taby (`App.js`), nové UI commands (`cancelProject`, `assignBuilder` volitelně). Build/buyCompany commands UŽ existují (M5-1).

**Co M5-2 NEdělá** (scope OUT):
- Žádný kód (tento dokument je design).
- Žádná změna architektury iter-002 ani command vrstvy. **G-BUILD-TXAUDIT zůstává** (ctx se commandu nepředává; `dispatch.js:44-59` volá `handler(state,params)`). Contract `acceptContract`/`completeContract` volají `pay`/`grant` bez ctx (gold/inventář se mění správně; jen emitTx audit chybí — stejná třída jako M5-1 build). M5-2 to NEřeší (vyžadovalo by změnu signatury `dispatch`/`registerCommand`).
- M6+ obsah: techy, term-contracts (`home.js:2474 addTermContract` — opakované dodávky), AI-svět contract zdroje (warlord/princess), `marbleSeller`/`mercenaryForHire` typy závislé na M6/M7 systémech (granite/marble techy, military zones) → odloženo, gap-report.

---

## 2. T5.1 — `contractQueue` struktura (M52-D2)

`state.home.contractQueue` = pole serializovatelných kontraktů (plain-data, K0). `state.home.contractSeq` = monotónní čítač pro deterministická ID (analogicky `state.home.projectSeq` z M5-1, §2.1).

```
state.home.contractQueue = [
  {
    id:           string,   // 'contract_' + (contractSeq++) — deterministické, NE Date.now (orig. getUniqueContractId home.js:2403)
    type:         string,   // katalogový typ z contracts.json ('goodsSeller', 'goodsBuyer', …)
    status:       'offered' | 'active' | 'completed' | 'expired' | 'rejected',
    cost:         Record<string,number>,   // co hráč DÁ při completion (může být {} ; klíče = resource/goods IDs + 'gold')
    reward:       Record<string,number>,   // co hráč DOSTANE při completion (grant)
    deadlineStep: number,   // ABSOLUTNÍ step expirace (curStep + expirationDays*STEPSPERDAY při aktivaci)
    title:        string,   // lidský popis (z katalogu / generátoru; UI-only text, serializovatelný)
    onComplete:   { effect: string, ...params },  // string-ID do registru efektů + params (K14)
    onExpire:     { effect: string, ...params },
    onReject:     { effect: string, ...params }
  },
  …
]
```

**Mapování na originál (doložitelnost, M52-D1):**

| Pole M5-2 | Originál (`home.js:2407 insertContract` arg / contract obj) | Pozn. |
|---|---|---|
| `id` | `getUniqueContractId()` (`nextContractId++`) | deterministický čítač → `contractSeq` (NE Date) |
| `type` | (odvozené z `onComplete` názvu, např. `contractGoodsBuyerComplete`) | M5-2: explicitní `type` v katalogu |
| `cost` | arg `cost` | shodné |
| `reward` | `extras.reward` (např. events.js:115,185,256) | orig. drží reward v `extras`; M5-2 = first-class pole |
| `deadlineStep` | `curStep=0` + `maxStep=expiration` (countdown, home.js:1682,1699) | **M5-2 ZMĚNA: absolutní deadlineStep** (determin., schedule, ne per-step countdown). approximated jen v reprezentaci, ne v efektu. |
| `title` | arg `title` | shodné (UI text) |
| `onComplete/onExpire/onReject` | args `onComplete/onExpire/onReject` (string ID → `callFn`) | **přímý 1:1**: orig. = string-ID callback, M5-2 = `{effect:id, ...params}` |

> **Klíčové zjištění (M52-D1):** originál NEMÁ imperativní háčky — `onComplete` atd. jsou **už string ID** (`'contractGoodsBuyerComplete'`), volaná přes `$rootScope.callFn(contract.onComplete, [contract.id])` (home.js:2456,2462,1700). To **přesně odpovídá** K14 / §5.4 arch (string-ID do registru + params). M5-2 to jen zaregistruje do reálného registru efektů (effects.js) a předá params v datech (`{effect, ...params}`).

**Status model (M5-2 nový, originál řešil `canComplete` flag + `pctComplete`):**
- `offered`: kontrakt nabídnut, čeká na `acceptContract`/`rejectContract`. NENÍ naplánovaná expirace (nabídka může mít vlastní krátkou platnost — viz §5, ale min. sada M5-2 nechá nabídku v queue dokud hráč nerozhodne).
- `active`: přijat (`acceptContract`). Naplánována expirace `scheduleInsert(deadlineStep,'contract.expire',{contractId})`. Hráč může `completeContract` (pokud `canAfford(cost)`).
- `completed`/`expired`/`rejected`: terminální. Kontrakt se z queue **odebere** po terminálním přechodu (jako orig. `removeContract` home.js:2464). (Volitelně lze ponechat krátce s terminálním statusem pro UI feedback — M5-2 default: odebrat hned, jako originál.)

> **Pozn. `canComplete`/`pctComplete` (orig. home.js:1683,1686) = DERIVÁT**, NEUKLÁDÁ se. UI je počítá v selektoru (`canComplete = canAfford(cost)`, `daysLeft = round((deadlineStep-curStep)/STEPSPERDAY)`) — viz §7.2.

---

## 3. T5 — Zdroj dat kontraktů: `src/data/contracts.json` (M52-D1)

### 3.1 Rozhodnutí o zdroji (DOLOŽITELNÉ vs. approximated)

**Ověřeno v originále** (`events.js` + `home.js` + `config.js`):
- **Mechanika contractu je plně doložitelná**: insert (`home.js:2407`), tick/expirace (`home.js:1678-1703`), complete/reject (`home.js:2454-2462`), completion efekty (`config.js:3248-3349`: `Player.pay(cost)` + `Player.insertInventory(reward)` — uniformní vzorec).
- **Konkrétní typy contractů jsou doložitelné** (`events.js` setupEvents): `ximniTrader`, `goodsBuyer`, `goodsSeller`, `marbleSeller`, `mercenaryForHire`, `houseBuilder`, `mineBuilder`, `mineExpander`. Každý volá `Home.insertContract(title, cost, rewardString, expiration, onComplete, onExpire, onReject, extras)`.

**Závěr (M52-D1):** contract data jsou **DOLOŽITELNÁ**, NIKOLI nově vymyšlená. Katalog `src/data/contracts.json` je **přepis** tohoto modelu. `provenance` per typ:
- `'derived'` pro typy/pole 1:1 z originálu (struktura, cost/reward vzorec, expiration dny).
- `'approximated'` jen pro: (a) absolutní deadlineStep místo countdown (M5-2 reprezentace), (b) izolovaný rng stream, (c) **min. hratelná sada** = ne všech 8 typů (některé závisí na M6/M7 systémech, viz §1 scope OUT), (d) konkrétní čísla cost/reward kde originál používá `Math.random` rozsahy (ty se v M5-2 zafixují deterministicky přes rng stream, kalibrace M9).

**Gap `G-CONTRACTS-CATALOG`** (provenance:'approximated', kalibrace M9): zužuje se z "contract data nedoložitelná" na "min. sada M5-2 nepokrývá všechny originální typy + náhodné rozsahy zafixovány deterministicky". Toto je **informativní gap** (Q3/DR-001), ne blocker, ne DR (mechanika doložitelná, jen rozsah zúžen).

### 3.2 Katalog `src/data/contracts.json` — schéma

Loader (`src/core/catalog/loader.js`) indexuje katalogy přes SECTION_CATALOGS; přidat `contracts` (jako `companies`/`buildings`). Katalog je **immutable** (K13), čte se přes `byId`/`getCatalog('contracts')`.

```jsonc
{
  "_meta": {
    "provenance": "derived (model+lifecycle z originálu) / approximated (deadlineStep repr., min. sada, deterministická čísla)",
    "gap": "G-CONTRACTS-CATALOG",
    "source": "doc/original_source/.../events.js + home.js:2407 + config.js:3248"
  },
  "contracts": [
    {
      "id": "goodsSeller",
      "title": "Kupec nabízí zboží k prodeji",
      "provenance": "derived",            // events.js:198-260 goodsSeller, config.js:3260 contractGoodsSellerComplete
      "_meta": { "source": "events.js:198" },
      "expirationDays": 15,               // events.js:256 expiration=15
      "kind": "supply",                   // viz §3.3 generator pravidlo
      "onComplete": { "effect": "contract.complete" },   // generická completion (pay cost + grant reward) — §4.3
      "onExpire":   { "effect": "noop" },
      "onReject":   { "effect": "noop" }
      // cost/reward NEjsou v katalogu staticky — generují se (events.js goodsSeller: products + getGoldValue*1.4). Viz §5.
    },
    {
      "id": "goodsBuyer",
      "title": "Cestující obchodník chce koupit zboží",
      "provenance": "derived",            // events.js:123-197, config.js:3248 contractGoodsBuyerComplete
      "expirationDays": 50,               // events.js:184
      "kind": "demand",
      "onComplete": { "effect": "contract.complete" },
      "onExpire":   { "effect": "noop" },
      "onReject":   { "effect": "noop" }
    }
    // M5-2 min. sada = goodsSeller (+goodsBuyer). Ostatní typy (ximniTrader, marbleSeller,
    // mercenaryForHire, houseBuilder, mineBuilder) → odloženo, závisí na M6/M7 (gap, §1 OUT).
  ]
}
```

**Minimální hratelná sada M5-2** (brief: "dodávkový kontrakt: dodej X zboží do N dní → odměna gold/techPt; oceňování přes getGoldValue"):
- **`goodsSeller`** ("supply" — hráč dodá/koupí zboží, dostane gold-hodnotné protiplnění): `cost = {goods…}` (zboží které hráč dá) nebo `cost = {gold: getGoldValue(products)*priceMult}`, `reward = {products…}` nebo `{gold/techPt}`. Oceňování přes `getGoldValue(state, basket)` (market.js:91, M4b kontrakt). To je přesně briefem požadovaný "dodávkový kontrakt … oceňování getGoldValue".
- **`goodsBuyer`** (volitelně, demand varianta): hráč prodá přebytek za gold (events.js:123).

> **Pozn. k "techPt odměně":** brief zmiňuje `reward gold/techPt`. `techPt` je platný resource key (`player.techPt`, persistSchema.js:11) → `grant(state,{techPt:N})` funguje (handlerFor). Min. sada smí dát reward `{gold:N}` i `{techPt:N}` — oboje validní basket.

### 3.3 `kind` pole (generátorová klasifikace)
- `"supply"`: kontrakt typu "dodej X do N dní → odměna". cost = zboží/gold, reward = gold/techPt/goods. Toto je hratelné jádro M5-2.
- `"demand"`: hráč prodá přebytek (orig. goodsBuyer). cost = goods z inventáře, reward = gold.
- (M6+: `"build"`, `"military"`, `"unlock"` — odloženo.)

---

## 4. T5.2 — Životní cyklus přes registr efektů (M52-D3, M52-D4)

### 4.1 Nový modul `src/core/systems/contracts.js`

Drží: handler `contract.expire`, handler `contract.offer` (generátor §5), helpery `findContract`, `removeContract`, `activateContract`, generická completion logika. **Registrace handlerů do registru efektů** přes novou exportovanou fn `registerContractEffects(registry)` (volaná v boot, §6.4).

```
// src/core/systems/contracts.js — kostra (DESIGN, ne kód)

findContract(state, contractId) → contract | undefined          // lineární scan contractQueue (malé pole)
removeContract(state, contractId) → void                        // splice z contractQueue (home.js:2464 ekvivalent)

// Handler: expirace (schedule one-shot, §runTick phase 2)
contractExpire(state, params, ctx):
  c = findContract(state, params.contractId)
  if !c || c.status !== 'active': return            // už completed/rejected → no-op (catch-up-safe, idempotentní)
  c.status = 'expired'
  resolveEffect(ctx.registry, c.onExpire, state, { contractId: c.id }, ctx)   // §4.3
  removeContract(state, c.id)

// Handler: generování nabídky (schedule periodický, §5)
contractOffer(state, params, ctx): … viz §5 …

resolveEffect(registry, effectData, state, extraParams, ctx):   // §4.3 — string-ID dispatch
  if !effectData || !effectData.effect: return
  const { effect, ...params } = effectData
  resolve(registry, effect)(state, { ...params, ...extraParams }, ctx)
```

- **Registrace handlerů do registru efektů** (ne do command registru): `contract.expire` a `contract.offer` musí být v **témže registru, který `runTick` resolvuje v schedule fázi** (`tickOrder.js:119 resolve(ctx.registry, entry.id)`). To je `ctx.registry` = `createRegistry()` z `bootstrapEngine`. → `registerContractEffects(registry)` registruje `'contract.expire'`, `'contract.offer'`, `'contract.complete'` (effect helper), `'noop'` (už existuje přes registerCorePeriodics tickOrder.js:146).

### 4.2 Přechody (state machine)

```
acceptContract(contractId)  [command, §6]:
  c.status: 'offered' → 'active'
  c.deadlineStep = state.engine.curStep + expirationDays * STEPSPERDAY
  scheduleInsert(state, c.deadlineStep, 'contract.expire', { contractId })   // serializovatelné, K17

completeContract(contractId) [command, §6]:
  guard: c.status === 'active' && canAfford(state, c.cost)                    // home.js:2455
  resolveEffect(registry, c.onComplete, state, {contractId}, undefined)      // §4.3 — DEFAULT 'contract.complete' = pay(cost)+grant(reward)
  c.status = 'completed'
  removeContract(state, c.id)
  // schedule contract.expire pro tento id zůstane v heapu, ale je no-op (findContract vrátí undefined / status≠active) → idempotentní, K17 dedup; volitelně scheduleCancel (§4.4)

rejectContract(contractId) [command, §6]:
  guard: c.status === 'offered' || 'active'
  c.status = 'rejected'
  resolveEffect(registry, c.onReject, state, {contractId}, undefined)
  removeContract(state, c.id)

contract.expire (schedule handler, §4.1): viz výše — jen pokud stále 'active'.
```

### 4.3 Generická completion efekt `contract.complete` (registr efektů)

Originál má per-typ completion (`contractGoodsBuyerComplete` atd.), ale všechny dělají totéž: `Player.pay(contract.cost)` + `Player.insertInventory(contract.reward)` (config.js:3251-3252,3263-3264,3279-3280,3293-3294). M5-2 to **sjednotí do jednoho generického efektu** (DRY, K14):

```
register(reg, 'contract.complete', (state, params, ctx) => {
  const c = findContract(state, params.contractId)
  if (!c) return
  pay(state, c.cost, 'contract:'+c.id)        // bez ctx → G-BUILD-TXAUDIT (audit skip; gold/goods se odečtou)
  grant(state, c.reward, 'contract:'+c.id)    // bez ctx → audit skip; reward se připíše (transactions.js:57)
})
```

- `pay`/`grant` jsou existující (`transactions.js:29,57`), pracují nad libovolným basketem (gold + goods + techPt přes `handlerFor`). **Bez ctx** (command vrstva ctx nepředává) → G-BUILD-TXAUDIT i pro kontrakty (stejné rozhodnutí jako M5-1 M-4; gold/goods se mění správně, jen emitTx audit chybí; není blocker).
- **Atomicita:** `completeContract` command testuje `canAfford(c.cost)` PŘED voláním efektu (home.js:2455 ekvivalent); `pay` navíc samo testuje `canAfford` (transactions.js:35) a hází při nedostatku → double-guard. Reward grant až po úspěšném pay.
- Speciální typy (M6+): `contractMercenaryComplete` (military), `contractMineBuilderComplete` (unlock+build) — vlastní registrované efekty, NE generický `contract.complete`. Odloženo (§1 OUT).

### 4.4 Úklid schedule při předčasném dořešení (volitelné, K17)
Když `completeContract`/`rejectContract` odebere `active` kontrakt, naplánovaný `contract.expire` pro to ID zůstane v heapu. Handler je **idempotentní no-op** (findContract vrátí nic / status≠active) → **funkčně neškodí** (K17 dedup, žádný double-effect). **Volitelná optimalizace:** `scheduleCancel(state, e => e.id==='contract.expire' && e.params.contractId===id)` (scheduler.js:131 existuje) pro úklid heapu. M5-2 default: **ponechat** (jednoduchost; heap malý; idempotence garantuje korektnost). Reviewer gate: ověřit, že expire na neexistující/terminální kontrakt je no-op.

---

## 5. T5 — Generování kontraktů (M52-D5)

### 5.1 Schedule-driven generátor (ne polling)

Originál nabízí kontrakty přes `Engine.insert(nextStep, 'eventGoodsBuyer', …)` které se re-schedulují (events.js:120,192,305 — `Engine.insert(... + Math.random()*..., 'eventX', null, true)`). M5-2 to převede na **jeden periodický schedule handler** `contract.offer`:

```
contractOffer(state, params, ctx):
  rng = makeRng(state, 'contracts')                          // izolovaný stream (M52-D5, K16/D4)
  // 1. kapacita: nepřekroč maxContracts
  if countActiveOrOffered(state) < BALANCE.contracts.maxContracts:
      type = pickContractType(rng, state)                    // výběr z contracts.json (kind:'supply' v min. sadě)
      contract = buildContractInstance(state, type, rng)     // generuje cost/reward (viz §5.2), id=contractSeq++
      contract.status = 'offered'
      state.home.contractQueue.push(contract)
  // 2. re-schedule sebe sama (periodicita)
  nextStep = state.engine.curStep + contractOfferPeriodSteps(rng)   // BALANCE.contracts.offerPeriodDays ± jitter přes rng
  scheduleInsert(state, nextStep, 'contract.offer', {})
```

- **Bootstrap generátoru (REVIDOVÁNO T-002a B2 — viz §14.2):** ~~naplánovat v `createInitialState.js`~~ **NE**. Plánování VÝHRADNĚ přes jednu idempotentní cestu `armContractOffer(state)`, volanou z boot (`main.js`) hned vedle `marketInit` — běží **fresh i po loadu**. Důvod: `applyPayload` (load.js:90) přepíše `engine.schedule` saved heapem → plán z createInitialState by se po loadu zahodil a staré savy by NIKDY negenerovaly kontrakty. `armContractOffer` = mirror `marketInit` vzoru (main.js:180, idempotentní, běží v obou cestách). Guard `scheduleCountOf(state,'contract.offer')===0` zajistí, že fresh save (který offer už MÁ ze předchozího běhu) se NEpřeplánuje 2×. Insert na `Math.max(state.engine.curStep, BALANCE.contracts.firstOfferStep)` (scheduleInsert hází na step < curStep — scheduler.js:75). Plná specifikace §14.2.
- **Catch-up-safe:** generátor je schedule one-shot re-schedulující se → v catch-up dávce se odpálí přesně tolikrát, kolikrát má (deterministicky dle curStep), žádný per-step polling. Náhoda jen ze `'contracts'` streamu (izolovaná, K16/D4 → přidání kontraktů nerozhodí ostatní RNG systémy).

### 5.2 `buildContractInstance` — generování cost/reward (supply typ)

Min. sada "supply" (dodávkový kontrakt: dodej X zboží do N dní → odměna):
```
buildContractInstance(state, type, rng):
  entry = byId(type).entry                                   // contracts.json
  // supply: vyber zboží + množství deterministicky přes rng
  goods = pickGoods(rng, state)                              // 1–3 goods z goods.json, množství v rozsahu
  cost  = { [goodsId]: qty, … }                              // co hráč dodá
  goldVal = getGoldValue(state, cost)                        // market.js:91 — oceňování baskets
  reward = { gold: round(goldVal * BALANCE.contracts.rewardMult) }   // odměna > hodnota (motivace)
  return {
    id: 'contract_' + (state.home.contractSeq++),
    type, title: entry.title, status:'offered', cost, reward,
    deadlineStep: 0,                                         // nastaví se až při acceptContract
    onComplete: entry.onComplete, onExpire: entry.onExpire, onReject: entry.onReject
  }
```

- `getGoldValue` (market.js:91) je legální závislost (M4b kontrakt, §9.1 arch). Oceňuje basket za aktuální tržní ceny.
- Konkrétní rozsahy (kolik goods, qty, rewardMult) = `BALANCE.contracts.*`, `provenance:'approximated'`, gap G-CONTRACT-GEN, kalibrace M9. Original goodsSeller (events.js:198-260) má pevné produktové balíčky × `getGoldValue*1.4` — M5-2 smí použít stejný `1.4` jako default `rewardMult`.

### 5.3 Balance konstanty → `balance.js` (nová sekce `BALANCE.contracts`)

```
contracts: {
  maxContracts:      5,    // home.js:2414 maxContracts gate. provenance: approximated (orig. dynamický), gap G-CONTRACTS-CATALOG.
  offerPeriodDays:   15,   // perioda nabídek. events.js:305 STEPSPERDAY*15. provenance: approximated, gap G-CONTRACT-GEN.
  offerJitterDays:   5,    // ± náhoda přes 'contracts' rng. provenance: approximated.
  firstOfferStep:    0,    // první nabídka (deterministicky v save). provenance: approximated.
  rewardMult:        1.4,  // odměna = getGoldValue(cost)*1.4. events.js:252 goodsSeller. provenance: derived.
}
```

---

## 6. T5 / T6 — Commands (M52-D6) + Persist + Boot

### 6.1 Contract commands (nový `src/core/commands/contracts.js`)

| Command | Params | Handler (kostra) | Pozn. |
|---|---|---|---|
| `acceptContract` | `{contractId}` | validuj existenci + status==='offered' → status='active', `deadlineStep=curStep+expDays*STEPSPERDAY`, `scheduleInsert(deadlineStep,'contract.expire',{contractId})` | NEpotřebuje ctx; scheduleInsert bere state |
| `rejectContract` | `{contractId}` | validuj existenci → status='rejected', `resolveEffect(onReject)`, removeContract | |
| `completeContract` | `{contractId}` | validuj status==='active' && `canAfford(cost)` → `resolveEffect(onComplete)` (=pay+grant), status='completed', removeContract | atomic: canAfford před efektem (home.js:2455) |

- **Problém: commands nemají `ctx`/`registry`.** `dispatch.js:44-59` volá `handler(state,params)` — žádný registry. Ale `resolveEffect` potřebuje registry (resolve string-ID). **Řešení (BEZ změny arch):** completion/reject efekty min. sady jsou **`contract.complete`/`noop`** = čistá pay+grant logika. M5-2 zavede `completeContract`/`rejectContract` handler, který volá pay+grant **přímo** (ne přes registry resolve) pro generický případ, NEBO drží malou lokální mapu effect-ID→fn v `contracts.js` (modulový import, ne runtime registry). **Doporučení:** completion efekt logika žije jako exportovaná fn ve `contracts.js` (`applyContractComplete(state, contract)` = pay+grant); command ji volá přímo. Registr efektů (`contract.expire`/`contract.offer`) se používá jen pro **schedule-resolvované** handlery (ty ctx/registry MAJÍ, přes runTick phase 2). Tím se vyhneme předávání registry do command vrstvy (= žádná změna arch).
  - **Konkrétně:** `completeContract` command → `applyContractComplete(state, c)` (pay cost + grant reward, lokální fn). `onComplete` v datech (`{effect:'contract.complete'}`) je pak **deklarativní marker** pro generický případ; pro speciální typy (M6+) by se mapovalo na jiné exportované fns. Schedule handler `contract.expire` → `onExpire` efekt přes `resolveEffect(ctx.registry,…)` (má registry). Pro min. sadu `onExpire='noop'`.
  - Toto drží K14 (akce jako data — string-ID v `onComplete`), ale completion běží přes import (command nemá registry) — žádný rozpor s arch (string-ID zůstává v datech; resolve cesta je implementační detail systému, ne command vrstvy).

### 6.2 Persist schéma kontraktů (M52-D2, allowlist §6.3)

Do `persistSchema.js applyPersist` (home blok, vedle `projectQueue`/`projectSeq`) přidat:
```
// contractQueue: serialisable list of contracts (iter-014 M5-2 T5)
if (s.home.contractQueue !== undefined) home.contractQueue = s.home.contractQueue;
// contractSeq: monotonic counter for deterministic contract IDs (iter-014 M5-2 T5)
if (s.home.contractSeq !== undefined)   home.contractSeq = s.home.contractSeq;
```
A zrcadlově v `load.js applyPayload` (home blok):
```
if (payload.home.contractQueue !== undefined) state.home.contractQueue = payload.home.contractQueue;
if (payload.home.contractSeq !== undefined)   state.home.contractSeq = payload.home.contractSeq;
```

- **Ukládá se:** `contractQueue` celé (serializovatelné — id/type/status/cost/reward/deadlineStep/title/onComplete/onExpire/onReject jsou plain-data), `contractSeq`.
- **NEUKLÁDÁ se (derivát):** `canComplete`, `daysLeft`, `pctComplete` (UI počítá v selektoru, §7.2).
- **Schedule eventy (`contract.expire`, `contract.offer`) se ukládají automaticky** — `engine.schedule` + `scheduleCount` jsou už v persistu (persistSchema.js:62-64, load.js:90-91). **Round-trip:** po loadu schedule heap pokračuje → expirace i generátor přežijí save/load (K17 dedup indexem). **POZOR (B2, §14.2):** to platí jen pro savy VYTVOŘENÉ pod M5-2 (které už `contract.offer` v heapu MAJÍ). Staré savy (před M5-2) ho v heapu NEMAJÍ → `applyPayload` přepíše schedule bez offeru → generátor se musí re-armovat zvlášť (§14.2). Expirace tento problém NEMÁ (active kontrakt vzniká až acceptem za běhu M5-2, takže jeho `contract.expire` je vždy v heapu, který se ukládá). **Reviewer gate (round-trip test, povinný):** save uprostřed aktivního kontraktu → load → `contract.expire` se odpálí na původním `deadlineStep` (ne přeplánovaný); contractSeq pokračuje (žádná kolize ID).
- **Init (REVIDOVÁNO T-002a M2 — §14.4):** `home.contractQueue = []`, `home.contractSeq = 0` patří do **`createHomeState.js`** (vedle `projectQueue`/`projectSeq`/`ownedCompanies`, createHomeState.js:36-49), NE do createInitialState (ten home pole jen deleguje). Plánování prvního `contract.offer` NEpatří do init — řeší ho `armContractOffer` v boot (§5.1, §14.2).
- **SAVE_VERSION / migrace (REVIDOVÁNO T-002a M1 — §14.3):** `SAVE_VERSION` **zůstává 3, žádná nová migrace polí.** `contractQueue`/`contractSeq` jsou pod `!== undefined` allowlist-guardem (precedent projectQueue load.js:189-196) → starý v3 save se načte korektně, init z createHomeState doplní `[]`/0. Migrace pole NEpokrývá schedule → B2 re-arm je nutný NEZÁVISLE.

### 6.3 Determinismus / catch-up-safe (M52-D9)
- **Žádný Date.now:** `contract.id = 'contract_'+(contractSeq++)` (NE `getUniqueContractId` přes Date — orig. nepoužíval Date pro contract, ale pro project ano; M5-2 contractSeq je čistý čítač).
- **Žádný Math.random:** generátor (`pickContractType`/`pickGoods`/jitter) → výhradně `makeRng(state,'contracts')`. Nový stream `'contracts'` přidat do `STREAM_NAMES` v `rng.js:9` (na KONEC pole — pořadí je determinismus, přidání na konec nemění seed ostatních streamů; initRng idempotentní pro existující). **Reviewer gate:** přidání streamu nesmí změnit hash existujících saveů (nový stream se seeduje až při prvním initRng nové hry; staré savy stream nemají → makeRng default 0, deterministicky).
- **Žádný DOM/UI v core:** generátor/lifecycle čistě nad state.
- **Levné v dávce:** generátor = schedule one-shot (re-schedule), expirace = one-shot. Žádný per-step ani per-quarterDay polling pro kontrakty (na rozdíl od originálu home.js:1678 který tikal contractQueue per quarterDay — M5-2 to NEpotřebuje, protože deadline je absolutní schedule + canComplete je derivát v selektoru).

### 6.4 Boot wiring (M52-D8 — NUTNÉ, dnes chybí)

**Ověřeno:** `bootstrapEngine` (`main.js:86-103`) **NEvolá `registerEffects(registry)`** — registr efektů je dnes prázdný kromě periodik (registerCorePeriodics registruje system fns + 'noop'). Schedule fáze `runTick` (tickOrder.js:119) resolvuje `entry.id` z `ctx.registry`. Pokud `contract.expire`/`contract.offer` nejsou registrované → `resolve` hodí (registry.js fail-fast) při prvním odpálení.

M5-2 přidá do `bootstrapEngine` (`main.js`) — VČETNĚ B1 (registerBuild):
```
// --- command registry (creg), uvnitř bootstrapEngine, vedle registerBuyCompany (main.js:99) ---
registerBuild(creg);                  // B1 (§14.1) — DNES CHYBÍ; bez něj send('build') = unknown command
registerContractCommands(creg);       // acceptContract, rejectContract, completeContract (§6.1)

// --- effect registry (registry), uvnitř bootstrapEngine, vedle registerCorePeriodics (main.js:88) ---
registerContractEffects(registry);    // contract.expire, contract.offer (noop už je z tickOrder.js:146)
// registerEffects(registry) — VYNECHAT pro min. sadu (MINOR-3, §14.5): M1 stuby s console.log nejsou potřeba
```
- **B1 (registerBuild):** import `registerBuild` z `commands/build.js` (export build.js:147, dnes nikde nevolán) do main.js a zaregistrovat v `bootstrapEngine`. `bootstrapEngine` je volán fresh i po loadu → build dostupný v obou cestách. Plná specifikace §14.1.
- **B2 (armContractOffer):** re-arm generátoru NEpatří do `bootstrapEngine` (ta nemá `state` — staví jen registry/creg), ale do `bootSequence` **PO** sestavení state, vedle `marketInit(state, …)` (main.js:180). Plná specifikace §14.2.
- **Kam contract efekty:** doporučení — `contract.expire`/`contract.offer` registrovat z `contracts.js` (`registerContractEffects`), protože jsou to **systémové schedule handlery** (potřebují ctx). `effects.js` (registr datových efektů onBuild/onUnlock) zůstává pro K14 obsahové efekty; `contract.complete` jako datový efekt smí být i v effects.js, ale completion běží primárně přes command (§6.1). **Min. wiring:** `registerContractEffects(registry)` registruje `contract.expire` + `contract.offer`; to stačí pro funkčnost (expirace + generování). `noop` už registrován (tickOrder.js:146).
- **Reviewer gate:** negativní test — `contract.offer`/`contract.expire` odpálené ze schedule se resolvnou bez throw (registr je naplněn v boot). Bootstrap je volán i po loadu (main.js: registry není v save, znovu se staví) → handlery dostupné po loadu i pro fresh.

---

## 7. T6 — Build UI + kontrakty panel (datový návrh; M52-D7)

Návrh rozhraní (ne pixely): **selektory** (core→UI, read-only, §3.4 arch) v `selectors.js` + **screeny** (preact+htm) v `screens.js` + **taby** v `App.js`. UI volá jen `send(commandType, params)` (command/intent). **Žádná herní logika v UI** — všechny výpočty v selektorech (čisté fns nad snapshotem).

### 7.1 Build screen — selektory (`selectors.js`)

```
selectBuildableBuildings(state):                          // karty budov
  → pro každý buildingId v katalogu (getCatalog('buildings').buildings, type==='buildings'):
    {
      id, name, category,
      cost:          scaleCostByCount(effectiveMap(id,'baseCost',state), totalMade, BALANCE.buildings.costScaleFactor),
                     // scaleCostByCount(base,totalMade,factor) — formulas.js (M5-1 §2.4); base přes effectiveMap (modifier fold)
      canAfford:     canAfford(state, cost),               // transactions.js:14
      created:       state.home.buildings[id]?.created ?? 0,
      totalMade:     state.home.buildings[id]?.totalMade ?? 0,
      unlocked:      entry.unlocked !== false,             // G-BUILD-UNLOCK (M5-1)
      builders:      effective(id,'builders',state),
      maxProgress:   effective(id,'maxProgress',state),
      effectsSummary: normalizeEffects(entry.effects)      // [{attr,op,value}] → krátký text v UI
    }
```
- Cena se scalingem: `scaleCostByCount` (existuje, formulas.js, M5-1 M5-D4). Pro `factor=1.0` (default) = base cost. Selektor cenu jen ČTE (počítá čistě), nemutuje.
- Build → `send('build', {itemId})` (command UŽ existuje, M5-1 `build.js`).

```
selectProjectQueue(state):                                // fronta staveb + oprav
  → pro každý project ve state.home.projectQueue:
    {
      id, buildingId, name: byId(buildingId).entry.name, type,           // 'build' | 'repair'
      progressPct:  round(curProgress*100 / (maxProgress*quarterDaysPerDay)),  // derivát; completionUnits z balance
      builders, removable, instId(repair)
    }

selectBuilderCapacity(state):                             // builder kapacita pro UI
  → {
      assignedBuilders: state.home.jobs?.builder?.number ?? 0,
      companyBuilders:  companyBuildersTotal(state),       // buyCompany.js
      maxActiveProjects: (builderHut.created>0 ? effectFromCatalog('builderHut','maxActiveProjects')*created : 0) + companyMasonTotal(state),
      queueCapacity:    builderHut.created>0 ? effectFromCatalog('builderHut','maxProjectQueue')*created : 0,
      queueUsed:        state.home.projectQueue.length
    }

selectBuilderCompanies(state):                            // builder firmy (buyCompany)
  → pro houseBuilder+mineBuilder v getCatalog('companies'):
    { id, name, type, cost, owned: !!state.home.ownedCompanies?.[id], canAfford, buildersProvided, masonProvided }
```
- Opravy: repair-projekty jsou v `projectQueue` (type==='repair') → zobrazí se v `selectProjectQueue` s `type:'repair'`, `removable:false`. UI je rozliší podle `type`.
- Builder companies → `send('buyCompany', {companyId})` (command UŽ existuje, M5-1).

### 7.2 Kontrakty panel — selektory (`selectors.js`)

```
selectContracts(state):
  → pro každý c ve state.home.contractQueue:
    {
      id, type, title, status,                            // 'offered'|'active'|...
      cost, reward,                                       // baskets {id:qty}
      canComplete:  c.status==='active' && canAfford(state, c.cost),   // DERIVÁT (home.js:1685)
      daysLeft:     c.status==='active'
                      ? Math.max(0, Math.round((c.deadlineStep - state.engine.curStep) / STEPSPERDAY))
                      : null,                              // DERIVÁT (deadlineStep - curStep)
      unaffordable: Object.keys(c.cost).filter(k => !canAfford(state,{[k]:c.cost[k]}))  // home.js:1690
    }
```
- `STEPSPERDAY` z balance/calendar konstanty (existuje). Selektor čistý, jen ČTE.
- Commands: `send('acceptContract',{contractId})`, `send('rejectContract',{contractId})`, `send('completeContract',{contractId})`.

### 7.3 Screeny (`screens.js`) + taby (`App.js`)

- **`BuildScreen({snapshot, send})`**: tabulka/karty z `selectBuildableBuildings` (název, cena, canAfford → disabled tlačítko "Postavit" → `send('build',{itemId})`), sekce "Fronta projektů" z `selectProjectQueue` (progress bar, type build/repair), sekce "Builder kapacita" z `selectBuilderCapacity`, sekce "Stavební firmy" z `selectBuilderCompanies` (tlačítko "Najmout" → `send('buyCompany',{companyId})`, disabled pokud owned/!canAfford). Vzor: `JobsScreen`/`MarketScreen` (screens.js:181,54).
- **`ContractsScreen({snapshot, send})`**: z `selectContracts` — sekce "Nabídnuté" (status==='offered': tlačítka Přijmout/Odmítnout), sekce "Aktivní" (status==='active': deadline `daysLeft`, cost/reward, tlačítko "Splnit" disabled pokud `!canComplete`, "Odmítnout"). Empty-state když prázdné.
- **`App.js` TABS** (App.js:17): přidat `{ id:'build', label:'Stavba' }` a `{ id:'contracts', label:'Kontrakty' }`; v `tab-content` přidat `${activeTab==='build' ? html\`<${BuildScreen} .../>\` : null}` a contracts analogicky. Import nových screenů (App.js:15).

### 7.4 UI commands (volitelné nové, mimo již existující)
| Command | Params | Handler | Pozn. |
|---|---|---|---|
| `cancelProject` | `{projectId}` | odebrat z projectQueue; pokud `removable && type==='build'` → refund přes `grant(state, refundCost)` | refund: orig. buildingcard.js:108 insertInventory; M5-2 volitelné, gap G-BUILD-CANCEL pokud odloženo |
| `assignBuilder` | `{delta}` | proxy na existující `assignJob('builder',delta)` | volitelné; UI smí volat `assignJob` přímo (job 'builder' existuje) → **NEpotřeba nového commandu** |

- **Min. M5-2 UI nevyžaduje nové commands** kromě 3 contract commandů (§6.1). `cancelProject` je enhancement (gap G-BUILD-CANCEL, approximated, lze odložit). `assignBuilder` = alias existujícího `assignJob`.

---

## 8. TickOrder dopady + diagram (živý artefakt §4.3 arch)

**Žádné nové periodikum** — kontrakty NEjsou v `registerCorePeriodics`. Vše běží přes **schedule fázi** (tickOrder.js:116-121 phase 2):
- `contract.offer` (generátor) — one-shot re-schedulující se (perioda ~15 dní ± jitter, §5).
- `contract.expire` (expirace) — one-shot na `deadlineStep` při acceptu.

Oba se resolvují z `ctx.registry` v schedule fázi (mezi calendar a periodics). **NUTNÉ:** registrace v boot (§6.4) — jinak resolve fail-fast.

```
Phase 1 calendar:   advanceCalendar → TimeEdges
Phase 2 schedule:   scheduleDue(curStep) → resolve(registry, id):
                      [contract.offer]NEW   (re-schedule self; generuje 'offered' kontrakt; rng 'contracts')
                      [contract.expire]NEW  (active→expired; resolveEffect(onExpire); removeContract)
Phase 3 periodics:  …(beze změny M5-2; buildings.builders/age z M5-1 zůstávají)…
Phase 4 invariants: devInvariants

event-driven (mimo tick, přes commands):
  acceptContract   → status active + scheduleInsert(deadlineStep,'contract.expire')
  completeContract → applyContractComplete (pay cost + grant reward) + remove
  rejectContract   → resolveEffect(onReject) + remove
```

> **Závazek aktualizace:** `TICK_ORDER` konstanta se NEmění (kontrakty nejsou periodikum). tickOrder.md doplnit poznámkou "schedule phase: contract.offer/contract.expire (one-shot)". Reviewer gate ověří, že contract handlery jsou registrované v ctx.registry (boot) a že žádné nové periodikum nepřibylo (kontrakty jsou schedule, ne polling).

---

## 9. Tvrdá omezení — ověření (determinismus + catch-up-safe)

| Omezení | M5-2 splnění |
|---|---|
| Žádný `Date.now()` | `contract.id='contract_'+contractSeq` (čítač); deadlineStep=curStep+expDays*STEPSPERDAY (z herního času); §6.3 |
| Žádný `Math.random()` | generátor jen `makeRng(state,'contracts')` (nový izolovaný stream rng.js:9); lifecycle deterministický (žádný RNG) §5.1, §6.3 |
| Žádný DOM/UI v core | systems/contracts.js + commands čistě nad state; UI jen selektory+commands §7 |
| Serializovatelnost (K0) | contractQueue/contractSeq plain-data; onComplete/onExpire/onReject = `{effect:string,...primitiveParams}` (structuredClone-safe, §5.6 arch assert) |
| Schedule přežije save/load (K17) | expirace+generátor v `engine.schedule` (persistován); dedup `scheduleCount`; round-trip test §6.2 |
| Levné v dávce / catch-up-safe | schedule one-shot (ne per-step polling); rng izolovaný → nerozhodí ostatní streamy §6.3 |
| Žádná změna arch iter-002 / command vrstvy | command handler zůstává `(state,params)` (dispatch.js:44); completion běží přes import, ne přes ctx.registry §6.1; G-BUILD-TXAUDIT zůstává §4.3 |

---

## 10. Rizika a mitigace (M5-2 specifická)

| # | Riziko | Mitigace |
|---|---|---|
| M52-R1 | `registerEffects`/contract handlery nezavedené v boot → schedule resolve fail-fast (`contract.offer`/`expire` throw) | M52-D8 §6.4: `registerContractEffects(registry)` v `bootstrapEngine` (volán fresh i po loadu); negativní test "schedule contract.* resolvne bez throw" |
| M52-R2 | Expirace na již dořešený kontrakt (completed/rejected) double-effect | `contract.expire` guard `status==='active'` (idempotentní no-op); §4.1; volitelný scheduleCancel §4.4; round-trip/idempotence test |
| M52-R3 | Generátor: (a) po loadu naplánovaný 2× (duplicita) NEBO (b) staré savy ho nikdy nenaplánují | **B2 (§14.2):** jedna idempotentní cesta `armContractOffer(state)` v boot (fresh i po loadu, mirror marketInit) + guard `scheduleCountOf('contract.offer')===0`. (a) fresh save offer už MÁ → guard přeskočí; (b) starý save offer NEMÁ → guard naplánuje. Deterministické, idempotentní. |
| M52-R4 | Nový rng stream `'contracts'` změní hash existujících saveů / determinismus | stream přidán na KONEC `STREAM_NAMES` (rng.js:9); seeduje se až initRng nové hry; staré savy bez streamu → makeRng default 0 deterministicky; reviewer hash test §6.3 |
| M52-R5 | Command nemá ctx/registry → nelze resolvovat onComplete přes registry | completion běží přes exportovanou `applyContractComplete` (import, ne runtime registry); §6.1 — žádná změna command vrstvy |
| M52-R6 | Contract pay/grant bez ctx → emitTx audit chybí (kontrakt se neobjeví v měsíčním reportu) | G-BUILD-TXAUDIT (stejné jako M5-1 build/buyCompany); gold/goods se mění správně; audit dořeší M9; není blocker §4.3 |
| M52-R7 | `getGoldValue` volán před market init (generátor v catch-up) | marketInit běží v boot před loop (main.js:180); generátor se odpálí až za běhu (deadline ≥ firstOfferStep > 0 typicky) → market existuje; reviewer ověří firstOfferStep ≥ 1 quarterDay |

---

## 11. Mapování na K0–K19 / D / §

| Položka | Kde v M5-2 designu |
|---|---|
| K0 (serializovatelný stav) | §2 contractQueue/contractSeq plain-data; §6.2 persist |
| K5 (transakce) | §4.3 pay+grant (existující transactions.js); G-BUILD-TXAUDIT (audit) |
| K11 (persist allowlist, load=čistá konstrukce) | §6.2 (contractQueue/contractSeq v allowlist; deriváty canComplete/daysLeft NEukládat) |
| K13 (immutable katalog) | §3.2 contracts.json immutable, čteno přes byId |
| K14 (akce obsahu jako data) | §4 onComplete/onExpire/onReject = `{effect:string,...params}` (string-ID + params); §4.3 generický contract.complete |
| K16/D4 (RNG streamy) | §5.1, §6.3 izolovaný stream 'contracts' |
| K17 (schedule index/dedup) | §4.4, §6.2 contract.expire/contract.offer přes scheduler (scheduleCount dedup) |
| §5.4 (akce jako data) / §5.6 (fail-fast fns registr) | §4 string-ID dispatch; §6.4 registrace v boot, fail-fast resolve |
| §6.3-6.4 (persist/load) | §6.2 |
| §7.1 (transakce) | §4.3 pay/grant |
| §8 (kontrakty kontrakt) | §2-§6 celé (onComplete/onExpire/onReject dle §5.4 arch) |
| §9.1 (getGoldValue) | §5.2 oceňování contract baskets (M4b kontrakt) |
| §3.4 (selektory read-only) / §3.3 (commands) | §7 selektory + commands; žádná logika v UI |

---

## 12. Dekompozice na Sonnet-proveditelné kroky

| Krok | Co | Soubor(y) | Test | Závisí |
|---|---|---|---|---|
| **T5.1** | `contracts.json` katalog (min. sada goodsSeller/+goodsBuyer) + loader index `contracts` | `src/data/contracts.json`, `catalog/loader.js` | katalog se načte, byId('goodsSeller') vrací entry | — |
| **T5.2** | `BALANCE.contracts` sekce; `state.home.contractQueue=[]`+`contractSeq=0` init; rng stream `'contracts'` | `balance.js`, `createInitialState.js`, `rng.js` | init state má prázdnou queue; stream seeduje deterministicky; hash test starých saveů beze změny | T5.1 |
| **T5.3** | `systems/contracts.js`: findContract/removeContract/applyContractComplete; handlery contract.expire/contract.offer; resolveEffect; registerContractEffects | `systems/contracts.js` | expire na active→expired+remove; expire na terminální=no-op (idempotence); applyContractComplete=pay+grant | T5.2 |
| **T5.4** | generátor `contract.offer` (rng 'contracts', getGoldValue, re-schedule self) + bootstrap první offer v createInitialState (guard scheduleCountOf) | `systems/contracts.js`, `createInitialState.js` | offer generuje 'offered' kontrakt; re-schedulí se; deterministický napříč seedem; po loadu nepřeplánuje 2× | T5.3 |
| **T5.5** | commands `acceptContract`/`rejectContract`/`completeContract` (`commands/contracts.js`) + `registerContractCommands` | `commands/contracts.js` | accept→active+scheduleInsert; complete (canAfford)→pay+grant+remove; reject→remove; complete bez canAfford→ok:false | T5.3 |
| **T5.6** | persist: contractQueue/contractSeq v applyPersist+applyPayload; round-trip (expirace přežije save/load) | `persistSchema.js`, `load.js` | round-trip: save uprostřed active kontraktu→load→expire na původním deadlineStep; contractSeq pokračuje; payload neobsahuje canComplete/daysLeft | T5.5 |
| **T5.7** | boot wiring: `registerEffects`+`registerContractEffects`+`registerContractCommands` v bootstrapEngine | `app/main.js` | schedule contract.offer/expire resolvne bez throw (fresh i po loadu) | T5.3, T5.5 |
| **T6.1** | selektory build: selectBuildableBuildings/selectProjectQueue/selectBuilderCapacity/selectBuilderCompanies | `ui/selectors.js` | čisté fns nad snapshotem; cena se scalingem; canAfford korektní | T5 nezávislé (jen M5-1 stav) |
| **T6.2** | selektor selectContracts (canComplete/daysLeft deriváty) | `ui/selectors.js` | daysLeft=round((deadline-curStep)/STEPSPERDAY); canComplete=canAfford | T5.5 |
| **T6.3** | BuildScreen + ContractsScreen (preact+htm) | `ui/screens.js` | render z selektorů; tlačítka volají send(command); empty-state | T6.1, T6.2 |
| **T6.4** | App.js taby 'build'+'contracts' + import screenů | `ui/App.js` | taby přepínají; screeny dostávají snapshot+send | T6.3 |

---

## 13. Alternativy (min. 1, povinné)

**A1 — Expirace per-step countdown (věrná originálu home.js:1678-1703) místo absolutního scheduleInsert.**
- *Popis:* contractQueue se tiká per quarterDay, `curStep+=0.25`, `if curStep>maxStep → expire`.
- *Zamítnuto:* (1) per-tick polling celé queue = zbytečná práce v catch-up dávce (brief: "levné v dávce"); (2) countdown stav (`curStep`/`maxStep`) je redundantní s herním časem → další perzistované pole + drift riziko; (3) absolutní `deadlineStep`+scheduler je deterministický, serializovatelný (K17), přežije save/load bez tikání, a je konzistentní s M5-1 vzorem (repair/build přes schedule/fronty). **Zvolen scheduleInsert** (M52-D4).

**A2 — Contract completion přes ctx.registry resolve (předat ctx/registry do command vrstvy).**
- *Popis:* `completeContract` by resolvoval `onComplete.effect` z runtime registru → plně data-driven i pro completion.
- *Zamítnuto:* vyžaduje **změnu signatury `dispatch`/`registerCommand`** (`handler(state,params,ctx)`) = změna architektury command vrstvy iter-002 → **mimo scope** (brief OUT: "žádná změna command vrstvy, G-BUILD-TXAUDIT zůstává"). **Zvoleno** (M52-D6/§6.1): completion přes exportovanou `applyContractComplete` (import); string-ID `onComplete` zůstává v datech (K14) jako marker; schedule handlery (expire/offer) MAJÍ ctx (běží přes runTick), takže onExpire JDE přes registry — hybrid bez změny arch.

**A3 — Plný katalog všech 8 originálních contract typů.**
- *Zamítnuto:* `marbleSeller`/`mercenaryForHire`/`mineBuilder`/`houseBuilder`/`ximniTrader` závisí na M6 (granite/marble techy, importantEvent) / M7 (military zones, AI) systémech, které M5-2 nemá. Min. hratelná sada (goodsSeller supply + goodsBuyer demand) pokrývá briefem požadovaný "dodávkový kontrakt → odměna, oceňování getGoldValue". Zbytek = gap G-CONTRACTS-CATALOG (informativní, Q3/DR-001), doplní se s M6/M7. **Zvolena min. sada** (M52-D1/§3.2).

---

## 14. Revize T-002a — B1 / B2 / M1 (závazná; má přednost před starším textem)

> Tato sekce je **závazný** výstup revize reviewer gate (T-002, GO-s-podmínkami). Kde se kříží se starším textem §1–§13, **platí §14.** Vše ověřeno proti reálnému kódu (`main.js`, `load.js`, `market.js`, `scheduler.js`, `schema.js`, `migrations.js`, `build.js`, `engine/index.js`) — citace ř. NNNN odpovídají stavu repo k 2026-06-14. Žádný produkční kód v tomto dokumentu; jen přesné předpisy pro codera (Sonnet).

### 14.1 B1 (blocker) — `registerBuild(creg)` + contract commands wired do `bootstrapEngine`

**Problém (ověřeno proti kódu):** `bootstrapEngine` (`main.js:86–103`) registruje do command registru `creg`: `setSpeed`, `assignJob`, `startSkill`, `setTaxRate`, `buyGoods`, `sellGoods`, `sendCaravan`, `buyCompany` — ale **NE `registerBuild`**. `registerBuild` existuje (`build.js:147`), ale v `main.js` **není ani importován, ani volán** (grep potvrzen: jen def+export, žádný call-site). Build z M5-1 je tedy **dark code**: T6 `BuildScreen` volá `send('build',{itemId})` (§7.3), `dispatch` (`dispatch.js`) nezná command → vrátí `{ok:false, error:'unknown command: build'}` → tlačítko "Postavit" nic neudělá.

**Předpis (PŘESNÁ MÍSTA):**

1. **Import** v `main.js` (vedle ostatních command importů, v bloku `main.js:16–23`):
   ```
   import { registerBuild } from '../core/commands/build.js';
   import { registerContractCommands } from '../core/commands/contracts.js';   // nový modul (§6.1)
   ```
2. **Registrace** uvnitř `bootstrapEngine`, v command-registry bloku **hned za `registerBuyCompany(creg)` (`main.js:99`)**:
   ```
   registerBuyCompany(creg);            // existující (main.js:99)
   registerBuild(creg);                 // B1 — DNES CHYBÍ; bez něj send('build') = unknown command
   registerContractCommands(creg);      // M5-2 — acceptContract / rejectContract / completeContract (§6.1)
   ```
3. **Effect-registry** uvnitř `bootstrapEngine`, v registry bloku **za `registerCorePeriodics(registry)` (`main.js:88`)**:
   ```
   const periodics = registerCorePeriodics(registry);   // existující (main.js:88)
   registerContractEffects(registry);   // M5-2 — 'contract.offer' + 'contract.expire' (§4.1, §6.4)
   ```
   (`registerEffects(registry)` se **NEpřidává** — MINOR-3/§14.5: M1 stuby s `console.log` nejsou pro min. sadu potřeba; menší povrch.)

**Proč to stačí a je bezpečné (ověřeno):**
- `bootstrapEngine` je volán **fresh i po loadu** (`main.js:172`, registry NENÍ součást save) → build i contract commandy dostupné v obou cestách.
- `registerBuild`/`registerContractCommands` registrují **nová** command-ID → žádná kolize s existujícími (`registerCommand` hází jen na ID-kolizi s jinou fn). Contract effect-ID (`contract.offer`/`contract.expire`) jsou nové; `noop` už registrován (`tickOrder.js:146`), takže `onExpire/onReject={effect:'noop'}` se resolvne.

**AC / reviewer gate:** po boot `send('build',{itemId:'<validní>'})` vrátí `{ok:true}` (ne `unknown command`); `send('acceptContract',…)` taktéž resolvuje. Negativní test: schedule `contract.offer`/`contract.expire` odpálené z `runTick` phase 2 se resolvnou bez throw (registr naplněn v boot, fresh i po loadu).

### 14.2 B2 (blocker) — `contract.offer` re-arm pro existující savy (`armContractOffer`)

**Problém (ověřeno proti kódu):** `loadAndReconstruct` (`load.js:239`) staví fresh state přes `createInitialState` (Step 3, ř.255), ale **`applyPayload` (Step 4) přepíše `state.engine.schedule = payload.engine.schedule ?? []` (`load.js:90`) celým saved heapem** + `scheduleCount` (ř.91). → jakýkoli `contract.offer` naplánovaný při init je **zahozen** a nahrazen saved heapem. **Starý save (vytvořený před M5-2)** v saved heapu `contract.offer` **NEMÁ** → po loadu žádný generátor → kontrakty se pro existující hru NIKDY nenabídnou. (Fresh hra problém nemá; expirace problém nemá — `contract.expire` aktivního kontraktu vzniká až acceptem za běhu M5-2, takže je v heapu, který se ukládá.)

**Rozhodnutí — JEDNA idempotentní cesta `armContractOffer(state)` (mirror `marketInit`):**
Plánování `contract.offer` patří **VÝHRADNĚ** do `armContractOffer(state)`, NE do `createInitialState`/`createHomeState`. (DRY — analogie M5-1 M-2 "žádná load-only větev"; jediná cesta běží fresh i po loadu, nelze rozsynchronizovat.)

```
// systems/contracts.js — DESIGN, ne kód
armContractOffer(state):
  if (scheduleCountOf(state, 'contract.offer') === 0):                     // guard (scheduler.js:161)
      const step = Math.max(state.engine.curStep, BALANCE.contracts.firstOfferStep)
      scheduleInsert(state, step, 'contract.offer', {})                    // scheduler.js:74
```

**PŘESNÉ MÍSTO volání — `bootSequence` v `main.js`, hned za `marketInit(state, …)` (`main.js:180`):**
```
marketInit(state, /* goods */ …);          // existující (main.js:180) — idempotentní, fresh i po loadu
armContractOffer(state);                    // B2 — re-arm generátoru; idempotentní, fresh i po loadu
```
- **NEpatří do `bootstrapEngine`** — ta nemá `state` (staví jen registry/creg). Patří do `bootSequence` **PO** sestavení/loadu state, přesně vedle `marketInit` (které už dnes tento "fresh i po loadu" vzor splňuje, main.js:178–180 komentář to potvrzuje). Import: `import { armContractOffer } from '../core/systems/contracts.js';` + `scheduleInsert`/`scheduleCountOf` jsou re-exportovány z `../core/engine/index.js` (ověřeno: `engine/index.js:6`).

**Proč je guard deterministický a idempotentní (ověřeno):**
- **Idempotentní:** `armContractOffer` je čistá fn nad `state`; `scheduleCountOf('contract.offer')` je přesný počet plánovaných offerů v heapu (udržován `scheduleInsert`/`popMin`/`scheduleCancel`, scheduler.js:82/138/162). Druhé (i n-té) volání ve stejném boot → count už `≥1` → **no-op**. Tj. lze volat opakovaně bez duplicit.
- **Deterministický:** žádný RNG, žádný Date/now uvnitř `armContractOffer` (jitter periody se losuje až UVNITŘ `contract.offer` handleru ze streamu `'contracts'`, §5.1 — ne při armování). `step = max(curStep, firstOfferStep)` je čistá fce herního času → identický pro identický state.
- **Pokrývá obě třídy savů jednou cestou:**
  - **fresh hra:** `curStep=0`, heap nemá offer → guard 0 → naplánuje na `max(0, firstOfferStep)`.
  - **save VYTVOŘENÝ pod M5-2:** saved heap offer UŽ MÁ (uložil se) → `applyPayload` ho obnoví → guard `≥1` → **přeskočí** (žádný 2× offer, žádné přeplánování na jiný step).
  - **starý save (před M5-2):** saved heap offer NEMÁ → po `applyPayload` guard 0 → naplánuje na `max(curStep, firstOfferStep)` (typicky `curStep`, protože hra je dál) → existující hra začne generovat kontrakty od dalšího kroku.
- **`scheduleInsert` guard na minulost:** `scheduleInsert` hází pro `step < curStep` (scheduler.js:75). `Math.max(curStep, firstOfferStep)` to **eliminuje** (step ≥ curStep vždy). Proto je `max(...)` v předpisu povinný, ne kosmetický.

**AC / reviewer gate:**
1. Starý save (bez `contract.offer` v heapu) → load → `scheduleCountOf('contract.offer')===1` po `armContractOffer`; do `offerPeriodDays` se objeví `offered` kontrakt.
2. M5-2 save (s offerem v heapu) → load → `armContractOffer` **NEpřidá druhý** (count zůstane 1; offer se odpálí na svém původně naplánovaném kroku, ne přeplánovaný).
3. Dvojí volání `armContractOffer` v jednom boot → count se nezvýší nad 1 (idempotence).

### 14.3 M1 (major) — SAVE_VERSION / migrace: ROZHODNUTÍ

**Rozhodnutí: `SAVE_VERSION` zůstává `3` (`schema.js:14`). ŽÁDNÝ bump, ŽÁDNÁ nová migrace polí.**

**Odůvodnění (ověřeno proti kódu):**
- Nová pole `home.contractQueue`/`home.contractSeq` se v `applyPayload` (`load.js`) i `applyPersist` (`persistSchema.js`) řeší pod **`!== undefined` allowlist-guardem** — **přesný precedent**: `projectQueue` (`load.js:189`), `projectSeq` (`load.js:194`), `ownedCompanies` (`load.js:199`). Starý **v3** save tato pole nemá → guard je přeskočí → init z `createHomeState` doplní `[]`/`0` (§14.4). Round-trip starého v3 save zůstává validní (žádná verze-mismatch v `validateEnvelope`, `load.js:21`).
- Bump na v4 by byl **kontraproduktivní**: `validateEnvelope` hází na `saveVersion !== SAVE_VERSION` (`load.js:22`), takže bump by VYNUTIL napsat v3→v4 migraci jen pro doplnění polí, která allowlist-guard už pokrývá zadarmo. Migrace v `migrations.js` se přidává jen když se mění **tvar/sémantika** existujícího pole — což M5-2 nedělá (jen přidává nová pole).

**KRITICKÉ provázání s B2 (zdůrazněno dle briefu):** **Migrace polí by B2 NEVYŘEŠILA — a B2 je nutný NEZÁVISLE.** Důvody:
- Chybějící generátor je v `state.engine.schedule` (doména `engine`), NE v `state.home`. I kdyby existovala v3→v4 migrace doplňující `contractQueue`/`contractSeq`, schedule heap by stále neobsahoval `contract.offer` (migrace se týká `payload`, ne re-armu heapu).
- Proto re-arm (§14.2) řeší **schedule**, undefined-guard (§14.3/§14.4) řeší **pole** — dvě ortogonální cesty, obě nutné, ani jedna nenahrazuje druhou.
- (Teoretická alternativa "migrace v3→v4 doplní `contract.offer` přímo do `payload.engine.schedule`" je **zamítnuta**: dražší — bump verze, dotek `migrations.js`, nutnost reprodukovat scheduler `seq`/heap invariant v migraci — vs. jedno idempotentní `armContractOffer` v boot, které navíc sjednocuje fresh+load cestu. §14.2 je robustnější a levnější.)

**Podmínka rozhodnutí (escape hatch):** Pokud by coder z JINÉHO důvodu musel bumpnout `SAVE_VERSION` (nesouvisí s M5-2 poli), pak přidá v3→v4 **no-op** migrační krok (`migrations.js` vzor `from:3,to:4`, jen `p.meta.saveVersion=4`) — pole zůstávají pod undefined-guardem i tak. Default M5-2: **nebumpovat**.

### 14.4 M2 (major) — init `contractQueue=[]` / `contractSeq=0` v `createHomeState.js`

**Upřesnění cesty:** init nových polí patří do **`createHomeState.js`** (vedle `projectQueue=[]`/`projectSeq=0`/`ownedCompanies={}`), NE do `createInitialState.js` (ten home pole jen deleguje na `createHomeState`). Bez factory-initu by fresh hra měla `contractQueue===undefined` → generátor `push` hodí, selektor `selectContracts` (Object iterace) hodí. `applyPersist`/`applyPayload` bloky zůstávají jak v §6.2 (analogicky `projectQueue`); `PERSIST_SCHEMA.home` pole se **nerozšiřuje** (precedent: `projectQueue` tam taky není, řeší se ad-hoc `if (… !== undefined)` blokem).

### 14.5 Zbylé minor/nit — rozhodnutí

| ID | Nález | Rozhodnutí M5-2 |
|---|---|---|
| MINOR-3 | `registerEffects` (M1 stuby s `console.log`) v boot | **NEpřidávat.** Jen `registerContractEffects` (offer/expire). Menší povrch, žádné stub `console.log` v prod běhu. (§14.1 krok 3.) |
| MINOR-4 / R7 | `firstOfferStep` nekonzistence (§5.3 dává 0, §10 R7 dává ≥1) | **Sjednoceno: `BALANCE.contracts.firstOfferStep = 1`** (≥1 quarterDay). Garantuje, že generátor (volá `getGoldValue`) se odpálí AŽ po `marketInit` (main.js:180 < první offer). §5.3 tabulku ber jako `firstOfferStep:1`. |
| MINOR-1 | `contractSeq` round-trip / kolize ID | Pokryto M2 (seq v home allowlistu, přežije load). Test T5.6: po loadu save s `contractSeq=N` → další offer dostane `contract_N` (ne `contract_0`). |
| MINOR-2 | osiřelý `contract.expire` v heapu (heap-growth) | Default **ponechat** (idempotentní no-op, guard `status==='active'`). Backlog **G-CONTRACT-SCHED-CLEANUP** (volitelný `scheduleCancel`, scheduler.js:131) pro M9. Není blocker. |
| NIT-1 | hashState: fresh vs round-trip | **fresh hash SE mění** (nová pole `contractQueue=[]`/`contractSeq=0` + lazy stream `'contracts'`) → referenční fresh hash přegenerovat (NE regrese). **round-trip hash starého save stabilní** (save→load→save = totéž). Doplněno do §6.3 ducha. |
| NIT-2 | `title` ukládán v save (UI text v core) | **Doporučení: NEukládat `title`** — derivovat v `selectContracts` přes `byId(type).entry.title` (§7.2). `cost`/`reward` se ukládají (dynamické), `title` je statický z katalogu. Snižuje UI-text v save. (Volitelné; pokud coder ponechá title v queue, je to plain-string-safe — ne blocker.) |
| NIT-3 | `goodsBuyer` "dark" katalog (v katalogu, generátor jen 'supply') | Min. sada: buď generovat i `kind:'demand'` (goodsBuyer), NEBO goodsBuyer označit `provenance:'approximated'` + `m6plus:true` a nedávat do min. generátoru. Default: ponechat goodsSeller (supply) jako jediný generovaný; goodsBuyer = volitelné rozšíření téže iterace. |

### 14.6 Souhrn AC revize T-002a

| AC (brief) | Splnění |
|---|---|
| B1 vyřešen, přesná místa | §14.1 — import + `registerBuild(creg)` + `registerContractCommands(creg)` za `main.js:99`; `registerContractEffects(registry)` za `main.js:88`. |
| B2 vyřešen, přesná místa | §14.2 — `armContractOffer(state)` za `marketInit` (`main.js:180`) v `bootSequence`; guard `scheduleCountOf('contract.offer')===0`. |
| Re-arm deterministický + idempotentní | §14.2 — bez RNG/Date; `scheduleCountOf` guard → druhé volání no-op; `max(curStep,firstOfferStep)` zabrání throw na minulost; pokrývá fresh + M5-2 save + starý save jednou cestou. |
| Jasné rozhodnutí SAVE_VERSION | §14.3 — **zůstává 3, žádná migrace polí** (undefined-guard, precedent projectQueue); B2 nutný NEZÁVISLE (schedule ≠ home pole). |

---

*Konec designu M5-2. Coder (Sonnet) implementuje T5 (§2-§6) + T6 (§7) z této úrovně bez dalšího architektonického rozhodnutí. Kontrakty: serializovatelné (§2,§6.2), deterministické (§9), přes registr efektů / string-ID v datech (§4, K14), expirace+generování přes serializovatelný schedule (§4,§5,§6.2). Zdroj contract dat = DOLOŽITELNÝ z originálu (events.js/home.js/config.js), katalog je přepis, provenance:'derived'/'approximated', gap G-CONTRACTS-CATALOG zúžen na rozsah+kalibraci M9 (§3, M52-D1). Build UI jen selektory+commands (§7, M52-D7). Žádná změna architektury iter-002 ani command vrstvy; G-BUILD-TXAUDIT zůstává (§4.3,§9). NUTNÉ boot wiring registerEffects/contract handlerů (§6.4, M52-D8 — dnes chybí). Kde dokument cituje K/D/§/home.js:NNNN, je zdrojem pravdy architektura iter-002 a originál doc/original_source/.*
