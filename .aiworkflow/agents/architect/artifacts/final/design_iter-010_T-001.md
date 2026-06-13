# Detailní návrh (spec pro Sonnet) – iter-010 (M4a): gold/daně/upkeep/účetnictví

- **Task**: T-001, iter-010 (BRIEF-036, M4a)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Typ**: DETAILNÍ implementační spec pro coder agenta (Sonnet). **Žádný produkční kód.**
- **Staví na**: M3 (iter-009) – produkce/joby/workerEfficiency/skilly; resource vrstva (K5) z M2a; txEvent slot už v typech.
- **Autoritativní zdroje použité v návrhu**:
  - Architektura §7 (resource/transakce + účetnictví observer K5/K18), §7.2, §5.5 (balance+formulas), §4.3 (tickOrder), §3.3 (commands), §3.1 (vrstvy), §11 (M4).
  - Originál: `services/home.js` (monthly block 678–823, localTaxes 825–848, burnWood 470–498), `services/player.js` (pay 122–171 / insertInventory report observer 376–445, recordConsumption/recordProduction 8–60), `services/config.js` (22/24/28/32 konstanty), `services/techs.js` (techPt 24–33).
  - REÁLNÝ src: `core/resources/{transactions,handlers,index}.js`, `core/engine/{tickOrder,clock,catchup,index,log}.js`, `core/commands/{dispatch,setSpeed,assignJob}.js`, `app/main.js` (bootstrapEngine), `core/state/types.d.ts`, `core/balance/{balance,formulas}.js`, `save/persistSchema.js`, `ui/{App,selectors,screens,render}.js`, `src/data/{balance.json,military.json,buildings.json}`.

---

## 0. Executive summary + registr rozhodnutí

M4a doplňuje **ekonomickou polovinu MVP jádra** (engine→čas→populace→produkce už hotové): tok zlata (daně dovnitř, upkeep ven), denní topení (burnWood), napojení foodSpoilage na účetnictví a **účetnictví jako čistý observer txEventů** (žádná inline mutace reportu v platební větvi – to byl přesně anti-pattern originálu `player.js:146`). Plus end-to-end app integrace: `setTaxRate` command **registrovaný v `bootstrapEngine`**, `ctx.emitTx` **zapojený v bootstrapEngine** (jediné místo, kde txEvent stream začne reálně téct do observeru), a UI council/finanční panel napojený na `App.js`.

| # | Rozhodnutí | Sekce |
|---|---|---|
| DA1 | Účetnictví = **observer nad txEvent streamem**; `ctx.emitTx` zapojen v `bootstrapEngine`, agreguje do `state.council.monthlyReports[month]`; na `month` edge se report uzavře (snapshot) a začne nový. Žádná mutace reportu uvnitř `pay`/`grant`. | §4 (T3) |
| DA2 | Daně: `localTaxes` (5days) + `taxes` (month) jako **grant gold přes resource vrstvu** s `cause:'tax:local'`/`'tax:monthly'`; vzorec `rate × curWorkers (× TAXCENTERBASE u monthly)`; `setTaxRate` command nastaví `state.player.taxRate` (0..N). | §2 (T1) |
| DA3 | Upkeep (month) = **pay gold** za vojsko `warriors×108 + archers×162` přes resource vrstvu `allowDeficit`-aware (insufficient → flag `notEnoughMilitaryFunding`, ne výjimka); burnWood (day) = pay `firewood` (resource) sezónně; foodSpoilage emituje txEvent. | §3 (T2) |
| DA4 | `emitTx` přidán do `ctx` v `bootstrapEngine` → automaticky pokrývá **live loop i catch-up** (oba sdílí `ctx`). Účetní observer je catch-up-safe (deterministický, žádný DOM/Date.now). | §4, §6 |
| DA5 | **Účetní invariant** (testovatelný): `Σ txEvent.amount kde key==='gold'` přes interval == `gold_after − gold_before`. Vynuceno: VŠECHNY změny goldu v tick path jdou přes `pay`/`grant` (žádný přímý `state.player.gold +=`). | §5, §7 |
| DA6 | UI: nový `CouncilScreen` (tab „Rada"): aktuální zlato, daňová sazba se `setTaxRate` ovladačem, poslední uzavřený měsíční report (příjmy/výdaje/čistý tok). Napojeno přes selektory + `send`. | §8 (T4) |

**Scope OUT (potvrzeno z briefu)**: žádný trh/karavany/getGoldValue dynamika (M4b/iter-011), žádné `taxCenter`/`cityGuardHQ` budovy (M5 – v `buildings.json` zatím nejsou), žádné techPt utrácení za techy (M6). techPt handler/grant existuje už z M2a – jen ověřit (§2.4).

---

## 1. Co už existuje (ověření – NEDUPLIKOVAT)

Coder MUSÍ vyjít z těchto faktů (ověřeno v REÁLNÉM src):

1. **`gold` a `techPt` handlery hotové** v `core/resources/handlers.js` (`resourceHandlers.gold`, `.techPt`) – get/add/remove vč. NaN guardu a `allowDeficit`. **NEPŘIDÁVAT znovu.** T1 „gold/techPt handlery" je tedy z větší části hotovo z M2a – úkol je je *použít* v daňových/upkeep systémech, ne reimplementovat.
2. **`pay(state, cost, cause, ctx, step)` a `grant(state, prod, cause, ctx, step)`** v `core/resources/transactions.js` už emitují txEvent `{key, amount, cause, step}` **pokud** `ctx.emitTx` existuje. Dnes `ctx.emitTx` NIKDE není přiřazen → txEventy se zahazují. **Toto je hlavní wiring gap T3.**
3. **`TxEvent` typ + `TickContext.emitTx?`** už v `core/state/types.d.ts:185-191,278`. Nepřidávat typ, jen ho zapojit.
4. **tickOrder má `localTaxes` (5days, order 10) a `taxes.monthly` (month, order 20) jako `systemFn:'noop'`** v `core/engine/tickOrder.js:179,181` – sloty existují, jen je naplnit reálnou fn + registrovat.
5. **`foodSpoilage` systém existuje** (`core/systems/food.js:101`, registrovaný `food.spoilage` month order 10) – jen doplnit emit txEventu (dnes mutuje store bez záznamu).
6. **`military.json`** má `warrior upkeep 108`, `archer upkeep 162` (extracted). **`balance.js` má `army.warriorUpkeep:108`, `archerUpkeep:162`, `tax.centerBase:22`, `tax.cityGuardBase:56`.** Čísla už extrahovaná – použít je.
7. **`ctx` se sdílí** mezi `loop.js` (live) a `catchup.js` (offline) – obě cesty volají `step(state, ctx)`. Zapojení `emitTx` do `ctx` v `bootstrapEngine` tedy pokryje obě. Catchup si NEvytváří vlastní ctx (ověřeno `main.js:257-268` předává `ctx`).
8. **commands**: `dispatch.js` + `setSpeed`/`assignJob`/`startSkill` registrované v `bootstrapEngine` (`main.js:82-84`). `setTaxRate` přidat stejným vzorem.

---

## 2. T1 – Daně + gold/techPt + setTaxRate

### 2.1 State rozšíření (player + council)

`core/state/types.d.ts` – `PlayerState` doplnit:

```ts
export interface PlayerState {
  gold: number;
  techPt: number;
  inventory: Record<string, number>;
  /** Daňová sazba nastavená hráčem. Násobí daňové vzorce. Default 1. iter-010 M4a. */
  taxRate: number;
  /** Počet vojáků (upkeep). M4a placeholder – plnění M7; default 0. */
  totWarriors: number;
  /** Počet lukostřelců (upkeep). M4a placeholder – plnění M7; default 0. */
  totArchers: number;
}
```

Nový top-level slot `council` (drží finanční účetnictví – doména „rada"). `types.d.ts`:

```ts
/** Jeden měsíční finanční řádek (income/expense kategorie). */
export interface MonthlyReport {
  month: number;          // season.curMonth, kdy report vznikl
  year: number;           // season.curYear
  goldEarned: number;     // Σ kladných gold txEventů (daně, inn, prodej…)
  goldSpent: number;      // Σ záporných gold txEventů (upkeep, nákup…), kladné číslo
  /** Rozpad podle cause: { 'tax:local': +X, 'upkeep:military': -Y, ... } */
  byCause: Record<string, number>;
  /** Spotřeba surovin/jídla (productionHistory/consumptionHistory ekvivalent). */
  consumed: Record<string, number>;  // klíč = resource key, hodnota = Σ |amount| při amount<0
  produced: Record<string, number>;  // klíč = resource key, hodnota = Σ amount při amount>0
}

/** Doména rady – účetnictví. */
export interface CouncilState {
  /** Aktuálně budovaný (otevřený) report za běžící měsíc. */
  current: MonthlyReport;
  /** Posledních N uzavřených reportů (nejnovější první). Ring s cap 12. */
  history: MonthlyReport[];
}
```

`GameState` doplnit `council: CouncilState;` (vedle `home`, `player`).

`core/state/createInitialState.js` – v `createPlayerState()` (`core/state/createHomeState.js`) přidat `taxRate: 1, totWarriors: 0, totArchers: 0`. V `createInitialState` přidat:

```js
council: createCouncilState(),   // nový helper
```

`createCouncilState()` (nový soubor `core/state/createCouncilState.js` nebo do createHomeState.js):

```js
export function createCouncilState() {
  return {
    current: emptyReport(/*month*/ 1, /*year*/ 1),
    history: [],
  };
}
export function emptyReport(month, year) {
  return { month, year, goldEarned: 0, goldSpent: 0, byCause: {}, consumed: {}, produced: {} };
}
```

> **Pozn. k originálu**: originál drží `world.council.monthlyReports[curMonth]` jako mapu keyovanou měsícem (`player.js:126`, `home.js:817`). My zjednodušujeme na `{current, history[]}` – funkčně ekvivalentní, ale serializace je kompaktní (ring s cap), ne neomezeně rostoucí mapa (drift savu, B3/R-J). `byCause` nahrazuje originálovou roztříštěnou strukturu `goldSpent/goldEarned/o/i` jednotnou kategorizací podle `cause`.

### 2.2 balance.js – daňové vzorce vstupy

`core/balance/balance.js` – `tax` blok rozšířit (existuje `centerBase:22`, `cityGuardBase:56`):

```js
tax: {
  centerBase: 22,        // dump.TAXCENTERBASE – monthly tax center (M5 budova; vzorec připraven)
  cityGuardBase: 56,     // dump.CITYGUARDBASE – M5
  /**
   * Sazba lokálních daní (5days). gold = localRate × curWorkers × taxRate.
   * Source intent: home.js:829,846 itemList.taxes.rate × curWorkers. provenance: approximated
   * (rate hodnota není v dumpu; default zvolen pro hratelný tok). gap G-TAX-LOCALRATE (M9 kalibrace).
   */
  localRate: 2,
  /**
   * Sazba měsíčních daní. gold = monthlyRate × curWorkers × taxRate × TAXCENTERBASE.
   * V M4a bez taxCenter budovy → použij monthlyRate jako přímý násobič (taxCenter level=1 ekvivalent).
   * Source intent: home.js:682 taxCenter.curRate × curWorkers × TAXCENTERBASE. provenance: approximated.
   * gap G-TAX-MONTHLYRATE (M9). M5 nahradí monthlyRate skutečným taxCenter.curRate.
   */
  monthlyRate: 1,
  /** Min/max daňové sazby nastavitelné hráčem (setTaxRate clamp). provenance: approximated. */
  rateMin: 0,
  rateMax: 5,
},
```

> **Věrnost vs. gap**: přesný originálový `home.curWorkers` = počet zaměstnaných (≈ `workforce.assigned`). Použij **`state.home.workforce.assigned`** jako `curWorkers` (gap G-TAX-CURWORKERS: originál `world.home.curWorkers` je počet aktivních pracovníků; v M3 ekvivalent = `workforce.assigned`). Pokud `workforce` chybí, fallback `home.population.total`.

### 2.3 formulas.js – čisté daňové funkce

`core/balance/formulas.js` – přidat čisté funkce (tabulkově testovatelné):

```js
/**
 * Lokální daně (5days). Source intent: home.js:829,846.
 * Formula: floor(localRate × curWorkers × taxRate)
 * @param {number} curWorkers - počet zaměstnaných (workforce.assigned)
 * @param {number} taxRate - hráčem nastavená sazba (player.taxRate)
 * @param {number} localRate - balance.tax.localRate
 * @returns {number} gold collected
 */
export function localTaxAmount(curWorkers, taxRate, localRate) {
  return Math.floor(localRate * curWorkers * taxRate);
}

/**
 * Měsíční daně. Source intent: home.js:682 (taxCenter.curRate × curWorkers × TAXCENTERBASE).
 * M4a: bez budovy, taxCenterLevel=1 default. Formula: floor(monthlyRate × curWorkers × taxRate × centerBase × taxCenterLevel)
 * @param {number} curWorkers
 * @param {number} taxRate
 * @param {number} monthlyRate - balance.tax.monthlyRate
 * @param {number} centerBase - balance.tax.centerBase (22)
 * @param {number} [taxCenterLevel] - default 1 (M5 budova)
 * @returns {number}
 */
export function monthlyTaxAmount(curWorkers, taxRate, monthlyRate, centerBase, taxCenterLevel = 1) {
  return Math.floor(monthlyRate * curWorkers * taxRate * centerBase * taxCenterLevel);
}

/**
 * Měsíční vojenský upkeep. Source: home.js:770, config.js:28,32.
 * Formula: warriors × warriorUpkeep + archers × archerUpkeep
 */
export function militaryUpkeep(warriors, archers, warriorUpkeep, archerUpkeep) {
  return warriors * warriorUpkeep + archers * archerUpkeep;
}

/**
 * Denní spotřeba palivového dřeva (burnWood). Source: home.js:476-479.
 * Winter: floor(0.5 × curWorkers); Spring/Autumn: floor(0.2 × curWorkers); Summer: 0.
 * @param {number} curWorkers
 * @param {number} seasonIndex - 0=Jaro,1=Léto,2=Podzim,3=Zima (selektor pořadí selectors.js)
 * @returns {number} firewood needed
 */
export function firewoodNeeds(curWorkers, seasonIndex) {
  if (seasonIndex === 3) return Math.floor(0.5 * curWorkers);       // Zima
  if (seasonIndex === 0 || seasonIndex === 2) return Math.floor(0.2 * curWorkers); // Jaro/Podzim
  return 0; // Léto
}
```

> **POZOR na season index**: originál testuje stringy `'Winter'/'Spring'/'Autumn'`. Náš `season.curSeason` je číslo. `selectors.js:6` `SEASON_NAMES=['Jaro','Léto','Podzim','Zima']` → index 0=Jaro(Spring), 1=Léto(Summer), 2=Podzim(Autumn), 3=Zima(Winter). Tabulkový test MUSÍ ověřit mapping (Zima=0.5, Léto=0). gap G-SEASON-START: `balance.season.startSeason='Winter'` → ale `createInitialState` startuje `curSeason:0` (Jaro). Coder zapíše do `firewoodNeeds` komentář, že mapping je dle selectors pořadí, a M9 sjednotí start season (mimo M4a scope).

### 2.4 Daňové systémy (core/systems/taxes.js – NOVÝ)

Nový soubor `core/systems/taxes.js`. Dvě fn, obě dostávají `ctx` (kvůli `emitTx`):

```js
import { grant } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';
import { localTaxAmount, monthlyTaxAmount } from '../balance/formulas.js';
import { logEntry } from '../engine/log.js';

/** curWorkers proxy: workforce.assigned (gap G-TAX-CURWORKERS). */
function curWorkers(state) {
  const wf = state.home.workforce;
  return (wf && typeof wf.assigned === 'number') ? wf.assigned : state.home.population.total;
}

/** localTaxes – 5days edge, order 10. Source: home.js:825-831. */
export function localTaxes(state, _params, ctx) {
  const cw = curWorkers(state);
  const rate = state.player.taxRate ?? 1;
  const amt = localTaxAmount(cw, rate, BALANCE.tax.localRate);
  if (amt > 0) grant(state, { gold: amt }, 'tax:local', ctx, state.engine.curStep);
}

/** taxes.monthly – month edge, order 20. Source: home.js:678-694,843-848. */
export function monthlyTaxes(state, _params, ctx) {
  const cw = curWorkers(state);
  const rate = state.player.taxRate ?? 1;
  const amt = monthlyTaxAmount(cw, rate, BALANCE.tax.monthlyRate, BALANCE.tax.centerBase);
  if (amt > 0) {
    grant(state, { gold: amt }, 'tax:monthly', ctx, state.engine.curStep);
    logEntry(state, `Daně: vybráno ${amt} zlata`);
  }
}
```

**tickOrder zapojení** (`core/engine/tickOrder.js`): nahradit `systemFn:'noop'` u `localTaxes` a `taxes.monthly`:
- registrace v `registerCorePeriodics`: `register(registry, 'taxes.local', localTaxes); register(registry, 'taxes.monthly', monthlyTaxes);`
- periodics: `{ id:'localTaxes', every:'5days', order:10, systemFn:'taxes.local' }`, `{ id:'taxes.monthly', every:'month', order:20, systemFn:'taxes.monthly' }`.
- import `import { localTaxes, monthlyTaxes } from '../systems/taxes.js';`

> **Pořadí v rámci month edge (KRITICKÉ pro účetní invariant a věrnost)**: originál pořadí (home.js): nejprve **monthly taxes (in)** → **upkeep (out)** → potom report uzávěrka. V našem tickOrder month edge má dnes: `food.spoilage`(order 10) → `taxes.monthly`(order 20). Doplníme `upkeep.military`(order 30) a `council.closeMonth`(order 40, POSLEDNÍ). Pořadí dle `EDGE_PRIORITY` + `order`: spoilage(10) < taxes(20) < upkeep(30) < closeMonth(40). closeMonth MUSÍ být order ≥ všech ostatních month systémů, aby report zachytil všechny txEventy daného měsíce PŘED snapshotem.

### 2.5 techPt (ověření, žádná změna)

`techPt` handler hotový (`handlers.js:74`). techPt grant: originál `techs.js:24` `player.techPt += amt` při výzkumu academy/university (M6). V M4a **žádná produkce techPt** (academy je M6) – jen ověřit, že handler existuje a že případný budoucí `grant(state,{techPt:n},...)` projde observerem (techPt amount jde do `produced`/`byCause`, ne do gold invariantu). T1 „techPt handler" = ověřeno hotové, nic neimplementovat.

### 2.6 setTaxRate command (core/commands/setTaxRate.js – NOVÝ)

Vzor přesně dle `setSpeed.js`:

```js
import { registerCommand } from './dispatch.js';
import { BALANCE } from '../balance/balance.js';

/** params: { rate: number }. Clamp do [tax.rateMin, tax.rateMax]. */
export function setTaxRate(state, params) {
  const rate = params.rate;
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return { ok: false, error: `setTaxRate: rate must be a finite number, got ${rate}` };
  }
  const { rateMin, rateMax } = BALANCE.tax;
  const clamped = Math.min(Math.max(rate, rateMin), rateMax);
  state.player.taxRate = clamped;
  return { ok: true };
}

export function registerSetTaxRate(creg) {
  registerCommand(creg, 'setTaxRate', setTaxRate);
}
```

**REGISTRACE v `app/main.js` `bootstrapEngine()`** (kritické – jinak RE-RUN):
```js
import { registerSetTaxRate } from '../core/commands/setTaxRate.js';
// uvnitř bootstrapEngine, vedle registerSetSpeed/registerAssignJob/registerStartSkill:
registerSetTaxRate(creg);
```

**Jak ověří test**: `test/commands-setTaxRate.test.js` – dispatch `{type:'setTaxRate',params:{rate:3}}` → `state.player.taxRate===3`; clamp `rate:99` → `rateMax`; `rate:-5` → `rateMin`; `rate:'x'` → `{ok:false}`. + `boot-integration.test.js` rozšířit: po bootSequence je `setTaxRate` v `creg.handlers` (registrace ověřena end-to-end).

---

## 3. T2 – Upkeep + burnWood + foodSpoilage napojení

### 3.1 Upkeep systém (core/systems/upkeep.js – NOVÝ)

month edge, order 30. Source: home.js:767-782.

```js
import { pay, canAfford } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';
import { militaryUpkeep } from '../balance/formulas.js';
import { logEntry } from '../engine/log.js';

/** upkeep.military – month edge, order 30. Source: home.js:770-782. */
export function upkeepMilitary(state, _params, ctx) {
  const w = state.player.totWarriors || 0;
  const a = state.player.totArchers || 0;
  const amt = militaryUpkeep(w, a, BALANCE.army.warriorUpkeep, BALANCE.army.archerUpkeep);
  if (amt <= 0) { state.home.notEnoughMilitaryFunding = false; return; }
  if (canAfford(state, { gold: amt })) {
    pay(state, { gold: amt }, 'upkeep:military', ctx, state.engine.curStep);
    state.home.notEnoughMilitaryFunding = false;
  } else {
    // Originál: neplatí, jen flag (home.js:780). NEvyhazovat výjimku.
    state.home.notEnoughMilitaryFunding = true;
    logEntry(state, 'Nedostatek financí na vojsko');
  }
}
```

> **Invariant ochrana**: upkeep při nedostatku goldu **NEvolá pay** (žádný částečný odpočet) → účetní invariant drží (žádný txEvent → žádná delta). Toto je věrné originálu (home.js:776-781). `state.home.notEnoughMilitaryFunding` přidat do `HomeState` typu (boolean) + persist schéma `home`.
>
> M4a má `totWarriors=totArchers=0` (vojsko je M7), takže upkeep je fakticky no-op, ale systém + vzorec + test existují (kontrakt R4/D12 – „slot existuje od dřív"). Test injektuje `totWarriors:5` aby ověřil platbu a flag.

`buildingUpkeep` (taxCenter/cityGuardHQ/hospital/inn měsíční budovy z home.js:697-765) je **M5** (budovy nejsou v `buildings.json`). V M4a NEimplementovat – jen poznámka `gap G-BUILDING-UPKEEP (M5)` v upkeep.js.

### 3.2 burnWood (core/systems/burnWood.js – NOVÝ nebo do upkeep.js)

day edge. Source: home.js:470-498. POŘADÍ: v originálu `burnWood()` běží v denním bloku **po jídle** (home.js:837-839: eatFood → burnWood). U nás day edge: `workerEfficiency.daily`(5) → `food.meal1`(10) → ... → `burnWood`(order 60, po meal1). firewood je `resource` kind (skladuje se v `home.store`).

```js
import { pay, canAfford } from '../resources/transactions.js';
import { firewoodNeeds } from '../balance/formulas.js';

/** burnWood – day edge, order 60 (po meal1). Source: home.js:470-498. */
export function burnWood(state, _params, ctx) {
  const cw = (state.home.workforce && state.home.workforce.assigned) || state.home.population.total;
  const season = state.season.curSeason;
  const needs = firewoodNeeds(cw, season);
  if (needs <= 0) {
    if (state.player.diseaseFromColdChance > 0) state.player.diseaseFromColdChance = 0;
    return;
  }
  if (canAfford(state, { firewood: needs })) {
    pay(state, { firewood: needs }, 'burn:firewood', ctx, state.engine.curStep);
    // úleva od zimy (home.js:488-492)
    const c = state.player.diseaseFromColdChance || 0;
    state.player.diseaseFromColdChance = c >= 3 ? c - 3 : 0;
  } else {
    state.player.diseaseFromColdChance = (state.player.diseaseFromColdChance || 0) + 1;
  }
}
```

> **`firewood` resource**: kind je `'resource'` (default fallback `resourceKindOf`) → skladuje se v `state.home.store.firewood`. NENÍ v M4a žádný producent firewood (woodcutter vyrábí `wood`, ne firewood – gap G-FIREWOOD-SOURCE, M5 craftsman převádí wood→firewood). V M4a tedy `canAfford(firewood)` většinou false → `diseaseFromColdChance++` (věrné rané hře bez zásob). Test injektuje `home.store.firewood:100` aby ověřil platbu. `diseaseFromColdChance` přidat do `PlayerState` (number, default 0) + persist.
>
> **Alternativně** (jednodušší, doporučeno coderem pokud firewood resource přidává moc komplexity): burnWood platí `wood` místo `firewood` (wood je reálná surovina z woodcutter joba). Rozhodnutí necháno na coderovi s poznámkou do designu – ale **musí jít přes `pay` s emitTx** (invariant). Default spec: `firewood` (věrné originálu), s gap flagem.

tickOrder: `register(registry,'home.burnWood',burnWood); { id:'home.burnWood', every:'day', order:60, systemFn:'home.burnWood' }`.

### 3.3 foodSpoilage napojení na účetnictví

`core/systems/food.js:101 foodSpoilage` dnes mutuje `state.home.food.store[id]` přímo. Napojit na observer = emitovat txEvent přes resource vrstvu. **Refactor**: místo přímé mutace použít `pay` s kind `food` a `allowDeficit` (spoilage nikdy nepadá pod 0, ale je to spotřeba):

```js
export function foodSpoilage(state, _params, ctx) {
  const rates = getSpoilageRates();
  const store = state.home.food.store || {};
  for (const [foodId, rate] of Object.entries(rates)) {
    const current = store[foodId] || 0;
    if (current > 0) {
      const lost = spoilage(rate, current);   // formulas.spoilage, beze změny
      if (lost > 0) {
        // pay přes food handler → emit txEvent {key:foodId, amount:-lost, cause:'spoilage'}
        pay(state, { [foodId]: lost }, 'spoilage:food', ctx, state.engine.curStep);
      }
    }
  }
}
```

> `pay` s food kind: `handlerFor(foodId)` → kind `food` (food.json items mají kind food / `resourceKindOf` přes byId). Pokud byId food vrací kind `food`, projde food handlerem (cap maxFood na add, remove fair). spoilage `lost ≤ current` → canAfford projde. **POZOR**: `pay` je atomické přes celý cost map; volat per-foodId (jak výše) ať jeden chybějící netorpéduje ostatní. Emit jde do `consumed[foodId]` v reportu.
>
> Test: `food.test.js` rozšířit – po spoilage je v `council.current.consumed[foodId]` == `lost` a store snížen o `lost` (chování beze změny + nově záznam).

### 3.4 HomeState/PlayerState typy + persist

`types.d.ts`:
- `HomeState`: `+ notEnoughMilitaryFunding?: boolean;`
- `PlayerState`: `+ taxRate, totWarriors, totArchers, diseaseFromColdChance` (viz §2.1).

`save/persistSchema.js`:
- `PERSIST_SCHEMA.player`: `['gold','techPt','inventory','taxRate','totWarriors','totArchers','diseaseFromColdChance']`
- `home`: doplnit serializaci `notEnoughMilitaryFunding` (přidat do `applyPersist` home blok).
- **`council` doména**: přidat do `applyPersist` – `payload.council = { current: s.council.current, history: s.council.history }` (celý objekt, je to plain data; history má cap 12 → bounded). Přidat `'council'` do infrastructure save listu NEBO vlastní blok. Doporučeno vlastní blok (validace cap).

---

## 4. T3 – Účetnictví jako OBSERVER (K5/§7.2)

### 4.1 Princip (žádná inline mutace)

Architektura §7.2: „Každá transakce emituje `txEvent` → měsíční reporty a consumption/productionHistory se **skládají z událostí (observer)**, nejsou inline mutací v platebních větvích." Originál to dělal ŠPATNĚ (`player.js:146` mutuje `curMonthlyReport.goldSpent` přímo v `pay`). **Náš observer je oddělený od `pay`/`grant`** – `pay`/`grant` jen emitují neutrální txEvent; observer je čistá funkce nad streamem.

### 4.2 Observer modul (core/resources/accounting.js – NOVÝ)

```js
/**
 * Accounting observer (K5/§7.2). Čistá agregace txEventů do měsíčního reportu.
 * NEMUTUJE platební logiku – je volán z ctx.emitTx, který pay/grant emitují.
 */
import { emptyReport } from '../state/createCouncilState.js';

/**
 * Zaúčtuje jeden txEvent do běžícího reportu state.council.current.
 * @param {GameState} state
 * @param {TxEvent} tx
 */
export function recordTx(state, tx) {
  if (!state.council) return; // defenzivně (starý save bez council → migrace doplní)
  const r = state.council.current;
  // kategorizace dle cause
  r.byCause[tx.cause] = (r.byCause[tx.cause] || 0) + tx.amount;
  if (tx.key === 'gold') {
    if (tx.amount >= 0) r.goldEarned += tx.amount;
    else r.goldSpent += -tx.amount;
  }
  if (tx.amount >= 0) r.produced[tx.key] = (r.produced[tx.key] || 0) + tx.amount;
  else r.consumed[tx.key] = (r.consumed[tx.key] || 0) + (-tx.amount);
}

/**
 * Uzávěrka měsíce (month edge, POSLEDNÍ order). Push current do history, otevři nový.
 * @param {GameState} state
 */
export function closeMonth(state, _params, _ctx) {
  if (!state.council) return;
  state.council.history.unshift(state.council.current);
  const CAP = 12;
  if (state.council.history.length > CAP) state.council.history.length = CAP;
  state.council.current = emptyReport(state.season.curMonth, state.season.curYear);
}
```

> `recordTx` NEemituje další txEvent (žádná rekurze). `closeMonth` je deterministický a NEmění gold → neporušuje invariant.

### 4.3 Zapojení emitTx do ctx (KRITICKÝ WIRING – jinak observer mrtvý)

`app/main.js` `bootstrapEngine()` – `ctx.emitTx` musí volat `recordTx(state, tx)`. Ale `bootstrapEngine` nemá `state` v okamžiku tvorby ctx (state se tvoří dřív v `bootSequence`). **Řešení**: `emitTx` je closure nad `state`, ale `state` se v `bootSequence` po importu může reassignovat (load vs new). Vzor:

```js
// V bootSequence, PO získání `state`, PŘED loop/catchup:
const { ctx, creg } = bootstrapEngine();
ctx.emitTx = (tx) => recordTx(state, tx);   // closure nad finálním state
```

Tj. `bootstrapEngine` vrací ctx bez emitTx, a `bootSequence` ho doplní jakmile zná `state` (řádek ~158 v `main.js`, hned po `const { ctx, creg } = bootstrapEngine();`). To pokryje **live loop i catchup** (oba dostanou týž `ctx`). Import `import { recordTx } from '../core/resources/accounting.js';` v main.js.

> **Pozn. k onImport** (`main.js:197-208`): `Object.assign(state, result.state)` zachová referenci `state` → closure `emitTx` dál ukazuje na správný objekt. OK. (Pokud by coder měnil na `state = result.state`, emitTx by se rozbil – proto MUSÍ zůstat `Object.assign`.)

### 4.4 closeMonth v tickOrder

`registerCorePeriodics`: `register(registry,'council.closeMonth',closeMonth); { id:'council.closeMonth', every:'month', order:40, systemFn:'council.closeMonth' }`. Order 40 > spoilage(10),taxes(20),upkeep(30) → uzávěrka po všech month txEventech.

---

## 5. Účetní invariant (DA5 – testovatelný)

**Invariant**: pro libovolný interval kroků platí
```
Σ { tx.amount | tx.key === 'gold' }  ==  gold_after − gold_before
```

**Jak je vynucen**:
1. Všechny gold mutace v tick path jdou VÝHRADNĚ přes `pay`/`grant` (žádné `state.player.gold +=` v systémech). grep-gate: `core/systems/*` nesmí obsahovat `player.gold` přiřazení (jen `handlers.js` smí). Reviewer + CI grep.
2. `pay`/`grant` emitují txEvent s přesně tím amount, který mění gold (`transactions.js:45,61` – ověřeno).
3. Observer `recordTx` jen čte, nemění gold.

**Test `test/accounting-invariant.test.js`** (M4a hlavní acceptance):
```
- setup state, emitTx → recordTx (přes ctx jako v bootstrapEngine)
- spusť N kroků přes několik měsíců s nenulovou taxRate a injektovaným totWarriors (in + out)
- track goldBefore; po N krocích goldAfter
- Σ všech gold txEventů (sečti current.byCause gold složky + history reportů: goldEarned-goldSpent napříč) == goldAfter-goldBefore
- per-měsíc: report.goldEarned - report.goldSpent == změna goldu za daný měsíc (změř snapshotem goldu na month edge)
```
Doporučeno: test si přidá vlastní `emitTx` collector (pole txEventů) PARALELNĚ s recordTx a ověří, že `Σ gold amounts == delta`. To testuje invariant nezávisle na observeru i observer samotný.

---

## 6. Catch-up-safe (S-05) – průřezově

Všechny nové systémy (taxes/upkeep/burnWood/closeMonth/spoilage refactor):
- **Deterministické**: žádný `Math.random`/`Date.now`. (Daně/upkeep/burnWood jsou plně deterministické – žádné RNG.)
- **Levné**: O(1)/O(#jobs)/O(#food) per edge, žádné alokace v step hot-path (běží na 5days/month/day edge, ne every-step).
- **Bez DOM**: čisté core. emitTx → recordTx je čistá agregace.
- **catch-up funguje**: `ctx.emitTx` zapojený v bootSequence → catchup batch (sdílí ctx) účtuje stejně jako live. Po catch-upu `council.history` obsahuje reporty za zameškané měsíce (offline summary je může zobrazit – volitelné, mimo nutný scope).

Test `test/catchup-invariant.test.js` rozšířit: po catch-up batch přes ≥2 měsíce platí účetní invariant (gold delta == Σ tx) a `council.history.length` odpovídá počtu uzavřených měsíců.

---

## 7. Migrace savu

`save/migrations.js` – nová verze `saveVersion` (z 1 na 2). Migrace `v1→v2`:
- `player.taxRate` chybí → `1`; `totWarriors/totArchers/diseaseFromColdChance` → `0`.
- `council` chybí → `createCouncilState()`.
- `home.notEnoughMilitaryFunding` → `false`.

Load pipeline (§6.4 architektury) volá migrace před rekonstrukcí. `recordTx` má defenzivní `if (!state.council) return` pro jistotu, ale migrace je primární cesta. Test `persist.test.js`/`save-store.test.js`: round-trip nového state (s council+taxRate) == identita; v1 save → po migraci má council.

---

## 8. T4 – UI: Council / finanční panel napojený na App.js

### 8.1 Selektory (ui/selectors.js)

```js
/** Finanční přehled pro council panel. */
export function selectFinance(s) {
  const last = (s.council && s.council.history[0]) || null;
  return {
    gold: s.player.gold,
    taxRate: s.player.taxRate ?? 1,
    lastReport: last,                 // {month,year,goldEarned,goldSpent,byCause,...} | null
    notEnoughMilitaryFunding: !!(s.home && s.home.notEnoughMilitaryFunding),
  };
}
```

### 8.2 CouncilScreen (ui/screens.js – přidat export)

Vzor dle existujících screens (JobsScreen). Tab „Rada":

```js
export function CouncilScreen({ snapshot, send }) {
  const fin = selectFinance(snapshot);
  const setRate = (r) => send('setTaxRate', { rate: r });
  return html`
    <div class="screen screen-council">
      <h2>Rada</h2>
      <dl>
        <dt>Zlato</dt><dd>${fin.gold}</dd>
        <dt>Daňová sazba</dt><dd>
          <button onClick=${() => setRate(Math.max(0, fin.taxRate - 1))}>−</button>
          ${fin.taxRate}
          <button onClick=${() => setRate(fin.taxRate + 1)}>+</button>
        </dd>
      </dl>
      ${fin.notEnoughMilitaryFunding ? html`<p class="warning">Nedostatek financí na vojsko!</p>` : null}
      <h3>Poslední měsíční report</h3>
      ${fin.lastReport ? html`
        <dl class="report">
          <dt>Měsíc</dt><dd>${fin.lastReport.year}/${fin.lastReport.month}</dd>
          <dt>Příjmy (zlato)</dt><dd>+${fin.lastReport.goldEarned}</dd>
          <dt>Výdaje (zlato)</dt><dd>−${fin.lastReport.goldSpent}</dd>
          <dt>Čistý tok</dt><dd>${fin.lastReport.goldEarned - fin.lastReport.goldSpent}</dd>
        </dl>
        <ul class="report-causes">
          ${Object.entries(fin.lastReport.byCause).map(([c, v]) => html`<li key=${c}>${c}: ${v}</li>`)}
        </ul>
      ` : html`<p class="empty-state">Zatím žádný uzavřený měsíc.</p>`}
    </div>`;
}
```

### 8.3 App.js napojení

`ui/App.js`:
- import `CouncilScreen` z screens.js.
- `TABS` přidat `{ id: 'council', label: 'Rada' }`.
- tab-content: `${activeTab === 'council' ? html\`<${CouncilScreen} snapshot=${snapshot} send=${send} />\` : null}`.
- (volitelně) HUD overview: zlato už zobrazuje (`App.js:100`) – ponechat.

> `send` už teče do App (`render.js:29`, `main.js:185 dispatch`). `setTaxRate` přidaný do creg (§2.6) → `send('setTaxRate',{rate})` projde. **Žádná další wiring práce** – stejná cesta jako `setSpeed`/`assignJob`.

**Jak ověří test** `test/ui-selectors.test.js` (rozšířit): `selectFinance` nad state s council vrací správný gold/taxRate/lastReport. `test/app-bootstrap.test.js` / `boot-integration.test.js`: po bootSequence je `setTaxRate` registrovaný; `send('setTaxRate',{rate:3})` vrátí `{ok:true}` a změní `state.player.taxRate`.

---

## 9. tickOrder – finální month/day pořadí (živý artefakt §4.3)

Po M4a (aktualizovat TICK_ORDER komentáře + periodics):

```
day   : workerEfficiency.daily(5) → food.meal1(10) → housing.settlementLevel(20)
        → world.tick(30) → field.daily(40) → mine.daily(50) → home.burnWood(60)
5days : localTaxes(10)
month : food.spoilage(10) → taxes.monthly(20) → upkeep.military(30) → council.closeMonth(40)
```

closeMonth POSLEDNÍ v month (zachytí všechny měsíční txEventy). burnWood po meal1 (věrné home.js:837-839).

---

## 10. ASCII diagram – tok zlata a účetní observer (M4a)

```
        ┌──────────────── UI (App.js / CouncilScreen) ────────────────┐
        │ daň. sazba [- N +]  ·  zlato  ·  poslední měsíční report     │
        └──────┬───────────────────────────────────────▲──────────────┘
               │ send('setTaxRate',{rate})              │ selectFinance(snapshot)
        ┌──────▼──────────────┐                         │
        │ commands.setTaxRate │ → state.player.taxRate  │
        │ (REG v bootstrapEng)│                         │
        └─────────────────────┘                         │
                                                         │
  ┌──── CORE tick (month/5days/day edge) ───────────────┴───────────────┐
  │ taxes.local/monthly ─grant(gold,'tax:*')─┐                          │
  │ upkeep.military ─────pay (gold,'upkeep')─┤                          │
  │ burnWood ───────────pay (firewood,'burn')┤   resources.pay/grant    │
  │ food.spoilage ──────pay (food,'spoilage')┘   ───emit txEvent──┐     │
  │                                                                │     │
  │   ctx.emitTx (zapojen v bootSequence) ◄────────────────────────┘     │
  │        │                                                             │
  │        ▼  recordTx(state, tx)   [OBSERVER – žádná mutace v pay]      │
  │   council.current { goldEarned, goldSpent, byCause, consumed,        │
  │                     produced }                                       │
  │        │ month edge, order 40 (POSLEDNÍ)                             │
  │        ▼  council.closeMonth → history.unshift(current) (cap 12)     │
  └─────────────────────────────────────────────────────────────────────┘
   INVARIANT: Σ gold txEvent.amount == Δ player.gold  (test: accounting-invariant)
```

---

## 11. Soubory – delta (co coder vytvoří/změní)

**Nové:**
- `core/systems/taxes.js` (localTaxes, monthlyTaxes)
- `core/systems/upkeep.js` (upkeepMilitary; gap building upkeep M5)
- `core/systems/burnWood.js` (nebo do upkeep.js)
- `core/resources/accounting.js` (recordTx, closeMonth)
- `core/commands/setTaxRate.js`
- `core/state/createCouncilState.js` (createCouncilState, emptyReport) – nebo do createHomeState.js
- `test/commands-setTaxRate.test.js`, `test/taxes.test.js`, `test/upkeep-burnwood.test.js`, `test/accounting-observer.test.js`, `test/accounting-invariant.test.js`

**Změněné:**
- `core/state/types.d.ts` (PlayerState +4 pole, HomeState +1, CouncilState/MonthlyReport, GameState +council)
- `core/state/createInitialState.js` + `createHomeState.js` (taxRate/tot*/diseaseFromColdChance, council)
- `core/balance/balance.js` (tax.localRate/monthlyRate/rateMin/rateMax)
- `core/balance/formulas.js` (localTaxAmount, monthlyTaxAmount, militaryUpkeep, firewoodNeeds)
- `core/systems/food.js` (foodSpoilage → pay s emitTx)
- `core/engine/tickOrder.js` (registrace + 4 periodics: taxes.local/monthly, upkeep.military, home.burnWood, council.closeMonth; nahradit 2× noop)
- `app/main.js` (`bootstrapEngine`/`bootSequence`: registerSetTaxRate; `ctx.emitTx = tx => recordTx(state,tx)`)
- `save/persistSchema.js` (player pole, home flag, council blok)
- `save/migrations.js` (v1→v2)
- `ui/selectors.js` (selectFinance)
- `ui/screens.js` (CouncilScreen)
- `ui/App.js` (tab Rada + import)
- `core/catalog/*` pouze pokud `firewood`/`taxes` potřebují katalog entry pro `resourceKindOf` (viz §3.2 pozn.)

---

## 12. Rizika a mitigace (M4a)

| # | Riziko | Mitigace |
|---|---|---|
| RA-1 | `emitTx` nezapojen → observer mrtvý (opakování M2b/M3 wiring chyby) | §4.3 explicitně: `ctx.emitTx=tx=>recordTx(state,tx)` v bootSequence; test `boot-integration` ověří, že po měsíci je `council.history` neprázdná |
| RA-2 | `setTaxRate` neregistrovaný v main.js → UI mrtvé tlačítko | §2.6: registerSetTaxRate v bootstrapEngine; `boot-integration` test ověří registraci + funkční send |
| RA-3 | Účetní invariant rozbit přímou mutací goldu | §5: grep-gate „žádný `player.gold` mimo handlers.js"; všechny systémy přes pay/grant |
| RA-4 | `firewood`/`taxes` nemají katalog kind → `resourceKindOf` fallback `resource` (OK pro firewood, ale ověřit food spoilage food kind) | §3.2/§3.3 pozn.; test ověří handler routing; alternativa burnWood na `wood` |
| RA-5 | curWorkers ≠ originál home.curWorkers (gap G-TAX-CURWORKERS) | workforce.assigned proxy + komentář; M9 kalibrace; nezasahuje strukturu |
| RA-6 | season index mapping (Zima=0.5 vs start curSeason=0=Jaro) – gap G-SEASON-START | firewoodNeeds dle selectors pořadí + tabulkový test; M9 sjednotí start season |
| RA-7 | rostoucí monthlyReports mapa v savu (R-J) | `{current, history[]}` cap 12 místo neomezené mapy keyované měsícem |

---

## 13. Alternativy (zamítnuté, min. 1 dle quality gate)

**Alt A – účetnictví inline v pay/grant (jako originál player.js:146).** Mutovat `council.current` přímo v `pay`/`grant`. **Zamítnuto**: porušuje §7.2 (observer, ne inline), nejde vypnout/testovat zvlášť, a smíchává platební sémantiku s reportingem (přesně defekt originálu). Náš observer je oddělitelný a invariant testovatelný nezávisle.

**Alt B – emitTx jako globální event bus modul (singleton) místo ctx.emitTx closure.** **Zamítnuto**: globální singleton v core porušuje K0 (jediný serializovatelný stav, žádný skrytý stav mimo state) a rozbíjí determinismus/testovatelnost (sdílený mezi testy). `ctx.emitTx` closure nad `state` je čisté, per-instance, testovatelné. (Existující typ `TickContext.emitTx` je přesně tento záměr.)

**Alt C – taxRate jako command-only bez balance min/max (volný rozsah).** **Zamítnuto**: bez clampu může hráč zadat extrémní/záporné/NaN sazby → NaN ekonomika (B4). `setTaxRate` clamp do `[rateMin,rateMax]` + finite guard chrání invariant.

**Alt D – burnWood/upkeep mimo resource vrstvu (přímý odpočet goldu/woodu).** **Zamítnuto**: druhá platební cesta = třída defektů K5 + porušení účetního invariantu (txEvent by chyběl). Vše přes `pay`/`grant`.

---

## 14. Acceptance pro coder handoff (DoD M4a)

1. T1: `localTaxes`(5days)+`monthlyTaxes`(month) grantují gold dle vzorců; `setTaxRate` registrovaný v main.js a funkční z UI; tabulkové testy formulas (localTaxAmount/monthlyTaxAmount) proti referenčním hodnotám.
2. T2: `upkeepMilitary`(month) platí dle `w×108+a×162`, insufficient→flag bez výjimky; `burnWood`(day) sezónně (Zima 0.5×, Léto 0); `foodSpoilage` emituje txEvent.
3. T3: `recordTx` observer (žádná mutace v pay/grant); `ctx.emitTx` zapojen v bootSequence; `closeMonth`(month order 40, poslední) → history cap 12; consumed/produced agregace.
4. T4: `CouncilScreen` v App.js tab „Rada", `selectFinance`, setTaxRate ovladač – end-to-end přes send.
5. **Účetní invariant** `Σ gold tx == Δ gold` zelený test (live i catch-up).
6. catch-up-safe všechny nové systémy; persist schéma + migrace v1→v2 round-trip zelené; tickOrder + diagram aktualizované (živý artefakt §4.3).

---

*Konec specu. Scope OUT: trh/karavany/getGoldValue dynamika a budovy taxCenter/cityGuardHQ/hospital/inn = M4b/iter-011 + M5. Čísla bez dump-zdroje (localRate/monthlyRate/taxRate default) nesou provenance:approximated + gap-flag pro M9 kalibraci.*
