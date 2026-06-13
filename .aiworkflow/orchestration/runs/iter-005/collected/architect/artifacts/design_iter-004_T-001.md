# Prosperity rebuild – Detailní implementační návrh iter-004 (M0a)

- **Task**: T-001, iter-004 (BRIEF-011)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Vstupy**: `architecture_proposal_iter-002_T-001.md` (§3.1, §3.2, §3.3, §4.1–4.4, §5.6), `iteration_master_plan_iter-003_T-001.md` (§3 iter-004, §1.3)
- **Účel**: spec pro Sonnet codera (T-002). **NE implementace** – konkrétní soubory, signatury (JSDoc), datové tvary, algoritmy/pseudo, jak to ověří test. Sonnet implementuje bez dalšího rozhodování.
- **Scope IN**: T1 struktura repa + CI gate, T2 state container, T3 clock + akumulátor, T4 scheduler heap, T5 RNG streamy, T6 tickOrder + calendar/seasons + fail-fast registr + commands skeleton.
- **Scope OUT**: produkční kód; jakákoli změna architektury. Tam, kde architektura ponechává volnost, **volím a zdůvodňuji** (značeno „ROZHODNUTÍ NÁVRHU").

---

## 0. Globální konvence (platí pro všechny soubory)

- **Jazyk**: JavaScript ES2022 moduly (`.js`, `export`/`import`), typy přes JSDoc; sdílené typy v `*.d.ts`. Zero-build runtime: kód běží v Node 22 i v prohlížeči bez transpilace. Importy v core jen **relativní s příponou `.js`** (např. `import { step } from '../engine/clock.js'`) – funguje v Node ESM i v browseru bez import map.
- **Zákaz v `src/core/`** (vynuceno grep gate, T1): žádné `document`, `window`, `globalThis`, `fetch`, `Date.now`, `Date(` konstruktor v hot-path, `Math.random`, `performance.now`, `setTimeout`/`setInterval`, `import` z `../ui`/`../app`/`../save`/`../data`/`vendor`. Čas a náhoda vstupují do core jen jako parametry (kroky, RNG state).
- **Pojmenování**: soubory `camelCase.js`; typové aliasy `PascalCase`; konstanty `UPPER_SNAKE` jen pro modulové neměnné (např. `STEP_SECONDS`).
- **Mutace stavu**: systémy a command handlery mutují `state` in-place (perf, §4.1 architektury – žádné alokace v hot-path). Žádné `structuredClone` v kroku.
- **Determinismus**: žádný zdroj nedeterminismu v core. Iterace nad objekty, kde záleží na pořadí, musí jít přes **explicitní pole klíčů** (ne `for…in` / `Object.keys` bez seřazení tam, kde pořadí ovlivňuje RNG spotřebu).
- **Testy**: `node:test` + `node:assert/strict`, soubory `test/<oblast>.test.js`, spouštěné `node --test`.
- **JSDoc styl**: každý exportovaný symbol má JSDoc s `@param`/`@returns`/`@typedef`. Importy typů: `/** @typedef {import('../state/types.js').GameState} GameState */` (typedef host soubor `types.d.ts` reexportovaný, viz T2).

---

## 1. T1 – Struktura repa + CI gate + grep gate (komplexita M)

### 1.1 Adresářová struktura k vytvoření (dle §3.1)

Vytvořit přesně tuto kostru (prázdné moduly s `export` placeholdery tam, kde to T2–T6 naplní; jinak `.gitkeep`):

```
/index.html                      # PWA shell placeholder (T1)
/package.json                    # type:module, scripts, devDep typescript
/tsconfig.json                   # checkJs, noEmit
/.gitignore                      # node_modules, *.bak
/manifest.webmanifest            # NEVYTVÁŘET v iter-004 (iter-005) → .gitkeep není potřeba
/tools/
  check-core-imports.mjs         # grep gate skript (T1)
  .gitkeep
/test/
  .gitkeep                       # testy doplní T-TEST a jednotlivé tasky
/src/
  core/
    engine/
      clock.js                   # T3
      scheduler.js               # T4
      timeEdges.js               # T4 (výpočet hran času)
      tickOrder.js               # T6
      rng.js                     # T5
      index.js                   # reexport engine API
    state/
      createInitialState.js      # T2
      freeze.js                  # T2 (dev Object.freeze snapshot)
      types.d.ts                 # T2 (sdílené typy)
    systems/
      calendar.js                # T6
      .gitkeep
    registry/
      registry.js                # T6 (fail-fast fns registr)
    commands/
      dispatch.js                # T6 (command/intent API)
      setSpeed.js                # T6 (první command handler)
    catalog/      .gitkeep       # naplní M1
    balance/      .gitkeep       # naplní M1
    resources/    .gitkeep       # naplní M2
    events/       .gitkeep       # naplní M2
  data/           .gitkeep       # M1
  save/           .gitkeep       # M0b
  ui/             .gitkeep       # M0b
  app/            .gitkeep       # M0b
/docs/
  tickOrder.md                   # živý artefakt (§4.3) – T6
  architecture-diagram.md        # živý artefakt (§3.5) – kopie ASCII diagramu, T1
```

ROZHODNUTÍ NÁVRHU: živé artefakty (tickOrder, ASCII diagram) ukládám do `/docs/` jako samostatné `.md` soubory, aby je reviewer gate snadno kontroloval a aby `tickOrder.js` (data) a `tickOrder.md` (dokumentace pořadí + zdrojové odkazy) byly oba v repu. DoD iter-004 vyžaduje existenci obou živých artefaktů.

### 1.2 `package.json` (přesný obsah)

```json
{
  "name": "prosperity-rebuild",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Prosperity v0.9.5 faithful rebuild – headless ES-module simulation core (M0a).",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint:core": "node tools/check-core-imports.mjs",
    "test": "node --test",
    "ci": "npm run typecheck && npm run lint:core && npm run test"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

Pozn.: `tsconfig.json` má `checkJs` zapnutý, takže `tsc --noEmit` čte i `.js` (proto skript `typecheck` nemá `--checkJs` flag – je v configu). `ci` skript je **povinný CI gate** (DoD iter-004, R-I).

### 1.3 `tsconfig.json` (přesný obsah)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": false,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.js", "src/**/*.d.ts", "tools/**/*.mjs"]
}
```

ROZHODNUTÍ NÁVRHU:
- `lib: ["ES2022"]` **bez `"DOM"`** v core typecheck → pokud někdo v core napíše `document`/`window`, `tsc` selže typově **navíc** ke grep gate (dvojitá pojistka R-I). `app/`/`ui/` (M0b) potřebují DOM lib – až tehdy se přidá samostatný tsconfig nebo se DOM zapne; v iter-004 žádný DOM kód neexistuje, takže `lib` bez DOM je správně.
- `moduleResolution: "Bundler"` umožní importy s `.js` příponou a je nejtolerantnější pro zero-build ESM. (Alternativa `NodeNext` by vynucovala přísnější ESM pravidla, ale komplikuje typecheck `.mjs` toolingu – proto Bundler.)
- `strict: true` = silná typová síť (vynucuje K10/K15 disciplínu); `skipLibCheck` kvůli rychlosti.

### 1.4 Grep gate skript `tools/check-core-imports.mjs` (spec + algoritmus)

Node skript bez závislostí. Projde všechny `src/core/**/*.js` (rekurzivně přes `node:fs`), pro každý soubor zkontroluje obsah proti seznamu zakázaných vzorů. Při nálezu vypíše `soubor:řádek: porušení (vzor)` a na konci `process.exit(1)`; jinak vypíše `core import gate OK (N souborů)` a `exit(0)`.

**Zakázané vzory** (regex, case-sensitive, hledá se ve zdrojovém textu řádek po řádku; řádky obsahující `// gate-allow` se přeskočí – únikový ventil pro doloženě bezpečné případy):

```
/\bdocument\b/                          DOM
/\bwindow\b/                            DOM
/\bglobalThis\b/                        global
/\bfetch\s*\(/                          IO
/\bDate\.now\s*\(/                      nedeterminismus
/\bnew\s+Date\b/                        nedeterminismus
/\bMath\.random\s*\(/                   nedeterminismus
/\bperformance\.now\s*\(/               nedeterminismus
/\bsetTimeout\s*\(/                     timer
/\bsetInterval\s*\(/                    timer
/\brequestAnimationFrame\b/             render
/import[^\n]*['"][^'"]*\/(ui|app|save|data)\//   import mimo core
/import[^\n]*['"][^'"]*\/vendor\//      import vendor
/localStorage|indexedDB/                IO
```

**Algoritmus (pseudo):**
```
files = walk('src/core', filter: .js)
violations = []
for f in files:
  for (i, line) in enumerate(readLines(f)):
    if line includes '// gate-allow': continue
    for (rx, label) in PATTERNS:
      if rx.test(line): violations.push({file:f, line:i+1, label, text:line.trim()})
print each violation
if violations.length: exit(1) else print OK; exit(0)
```

ROZHODNUTÍ NÁVRHU: čistě řádkový regex grep (žádný AST parser) – zero-dependency, deterministický, rychlý; falešné pozitivy (např. slovo „window" v komentáři) řeší `// gate-allow`. Komentář v JSDoc, který by chytil regex (`@param {Document}`), se v iter-004 nevyskytuje; pokud nastane, použít `// gate-allow`.

### 1.5 `index.html` placeholder (minimální)

```html
<!doctype html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prosperity (rebuild)</title></head>
<body><div id="app">Prosperity rebuild – M0a skeleton (no UI yet, see iter-005).</div></body>
</html>
```
(UI/app bootstrap je iter-005; zde jen aby repo bylo servovatelné.)

### 1.6 Pravidla vrstvení (zapsat do `/docs/architecture-diagram.md` jako textová sekce + zkopírovat ASCII diagram §3.5)

- `core/` importuje výhradně `core/` (relativní `.js`).
- `data/` = jen JSON (žádné funkce). `ui/` → snapshot + `commands`. `save/` ↔ core přes persist schémata. `app/` jediné místo, kde se vrstvy potkávají.
- Vynuceno: grep gate (mechanicky) + reviewer gate (konvence).

### 1.7 Jak to ověří test (T1 acceptance)
- `npm run typecheck` (tsc) → exit 0 na prázdné kostře.
- `npm run lint:core` → na čisté kostře OK; **negativní test**: dočasně vložit `const x = Date.now()` do core souboru → skript exit 1 (T-TEST ověří uměle rozbitým souborem, smaže ho).
- Struktura adresářů odpovídá §3.1 (reviewer kontrola).

---

## 2. T2 – State container (komplexita M)

**Soubory**: `src/core/state/createInitialState.js`, `src/core/state/freeze.js`, `src/core/state/types.d.ts`.

### 2.1 Datový tvar `GameState` (dle §3.2 – plain-data, serializovatelný)

Jeden plain-data strom. V iter-004 jsou naplněné jen domény potřebné pro engine core (`meta`, `engine`, `rng`, `season`, `log`); ostatní domény (`player`, `home`, `world`, `catalogState`, `battle`, `story`, `achievements`) jsou **deklarované v typech a inicializované na prázdné/neutrální hodnoty jako sloty** (architektura: sloty existují od začátku, žádné pozdější dolepování). Pole, která naplní pozdější milníky, dostanou minimální tvar.

```
GameState = {
  meta:   { saveVersion: number, gameVersion: string, startedAtStep: 0, seed: number },
  engine: { curStep: 0, speed: 1, running: true, frameBudget: number,
            schedule: ScheduleEntry[],            // serializovatelný heap, viz T4
            scheduleCount: { [id: string]: number } },  // index id→počet (K17)
  rng:    { seed: number, streams: { [name: string]: number } }, // viz T5 (každý stream = 1 uint32 stav)
  season: { curStep: 0, curDay: 1, curMonth: 1, curYear: 1, curSeason: 0, dayInSeason: 1 },
  player: {},            // slot (M2+)
  home:   {},            // slot (M2+)
  world:  {},            // slot (M2/M7)
  catalogState: { modifiers: [] },   // slot (M5/M6)
  battle: null,          // slot (M7)
  story:  {},            // slot (M8)
  log:    { entries: [], capacity: number, head: 0 },  // ring buffer (K9)
  achievements: { unlocked: {} }     // slot (M8)
}
```

### 2.2 `createInitialState.js` – signatura a chování

```js
/**
 * @typedef {import('./types.d.ts').GameState} GameState
 * @typedef {import('./types.d.ts').InitOptions} InitOptions
 */

/**
 * Postaví čistý počáteční stav (jediný zdroj pravdy o tvaru stavu).
 * Žádný I/O, žádný katalog (katalog je M1) – jen neutrální výchozí hodnoty.
 * @param {InitOptions} [opts]
 * @returns {GameState}
 */
export function createInitialState(opts = {}) { … }
```

`InitOptions` (typedef): `{ seed?: number, gameVersion?: string, logCapacity?: number, frameBudget?: number }`.
Defaulty (ROZHODNUTÍ NÁVRHU – konstanty v jednom místě nahoře souboru, přesun do `balance.js` v M1):
- `seed` default `0x9E3779B9` (deterministický, dokud loader savu nedodá vlastní).
- `gameVersion` default `'0.0.0-m0a'`; `saveVersion` = `1`.
- `logCapacity` default `200`; `frameBudget` default `8` (kroků/frame, ladí benchmark M0b).

Algoritmus: vrátí objektový literál přesně dle tvaru §2.1; `season` na den 1/měsíc 1/rok 1/sezóna 0/dayInSeason 1; `engine.curStep=0`, `speed=1`, `running=true`, `schedule=[]`, `scheduleCount={}`; `rng.streams` se **inicializuje v T5** (`initRng(state)`), zde jen `rng = { seed, streams: {} }`. `log.entries=[]`.

ROZHODNUTÍ NÁVRHU: `createInitialState` **nevolá** `initRng` ani neregistruje periodika – ty se dělají v explicitním bootstrap kroku (T5 `initRng`, T6 `registerPeriodics`), aby `createInitialState` zůstala čistá konstrukce stavu (load po něm aplikuje save, §6.4 architektury). Bootstrap pořadí pro iter-004: `s = createInitialState(); initRng(s); registerCorePeriodics(registry)`.

### 2.3 `freeze.js` – dev snapshot

```js
/**
 * Hluboce zmrazí stav pro UI čtení v dev módu (zachytí náhodné mutace mimo systémy).
 * V prod (DEV===false) je no-op a vrací vstup beze změny (žádná kopie, žádná daň).
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function devFreeze(value) { … }

/** @type {boolean} dev flag – v iter-004 odvozen z env, default true */
export const DEV = …;
```

Algoritmus `devFreeze`: pokud `!DEV` → `return value`. Jinak rekurzivně `Object.freeze` na objektech a polích (chráň proti cyklům přes `WeakSet` visited; `battle:null` a primitiva přeskoč). ROZHODNUTÍ NÁVRHU: `DEV` se v core odvodí z `globalThis` BEZ porušení gate? Ne – `globalThis` je zakázané. Místo toho `freeze.js` exportuje `DEV` jako modulovou konstantu `true`, a `app/` (M0b) ji bude přepínat přes build-free mechanismus (např. samostatný `env.js` modul, který `app` přepíše). Pro iter-004: `export const DEV = true;` (hardcoded; `// gate-allow` netřeba, žádný zakázaný symbol). Mutace state v kroku NESMÍ jít přes zmrazený snapshot – proto se `devFreeze` volá jen na hranici core→UI (M0b), ne uvnitř kroku.

Pozn.: `devFreeze` se v iter-004 nikam nevolá v hot-path (žádné UI); je připravený a unit-testovaný. Jeho použití na snapshot je iter-005.

### 2.4 `types.d.ts` – základ sdílených typů

Obsahuje `@typedef`/`interface` pro: `GameState`, `EngineState`, `SeasonState`, `RngState`, `LogState`, `LogEntry`, `ScheduleEntry`, `InitOptions`, `Speed` (`0 | 1 | 2`), `StreamName` (union literálů: `'population'|'forest'|'mine'|'field'|'market'|'world'|'battle'|'events'`). Tvar přesně dle §2.1. Pro sloty (`player`, `home`, …) zatím `Record<string, unknown>` s TODO komentářem odkazujícím na milník, kde se naplní.

ROZHODNUTÍ NÁVRHU: streamy pojmenovávám `population, forest, mine, field, market, world, battle, events` – sjednocení §3.2 (`population, forest, market, world, battle, events`) a §4.4 (`forest`, `population`, `market`, `world`, `battle`, `events`) + tickOrder §4.3 zmiňuje mine/field periodika; přidávám `mine`, `field` jako vlastní streamy, protože mají vlastní RNG spotřebu (accidents, regenerace) a izolace streamů per systém je explicitní cíl D4. Pokud pozdější milník stream nepoužije, je to neškodné (jen nevyčerpaný stav).

### 2.5 Jak to ověří test (T2 acceptance)
- `createInitialState()` vrací objekt; `JSON.parse(JSON.stringify(state))` je hluboce rovný originálu (serializovatelnost – žádné funkce/cykly).
- Dvě volání se stejnými opts → hluboce rovné stavy (čistota).
- `season` má den 1, sezóna 0, dayInSeason 1.
- `devFreeze(state)` v DEV: pokus o mutaci `state.engine.curStep = 5` vyhodí v strict mode (test přes `assert.throws`) / je no-op a hodnota se nezmění (test `assert.equal`). V `!DEV` větvi vrací beze změny (test přes dočasné přepnutí flagu, je-li exponován; jinak ověř jen DEV větev).
- `tsc --noEmit` projde (typy konzistentní).

---

## 3. T3 – Clock + akumulátor (komplexita M)

**Soubor**: `src/core/engine/clock.js`. Implementuje §4.1 (fixed-timestep, akumulátor, frame budget, dávková smyčka) – **bez catch-up UI** (to je M2b).

### 3.1 Konstanty (modulové, dle §4.1 – přesun do balance.js v M1)

```
STEP_SECONDS = 0.05          // 1 krok = 0,05 s herního času (1× rychlost)
STEP_MS = 50                 // 0.05 s * 1000
STEPS_PER_DAY = 900          // den = 45 s = 900 kroků
SPEED_FACTOR = { 0: 0, 1: 1, 2: 2 }   // Pause / 1× / 2×
```

ROZHODNUTÍ NÁVRHU: `clock.js` neimportuje `balance.js` (neexistuje do M1); konstanty drží lokálně s komentářem `// MOVE TO balance.js @ M1 (source: T-001 §1–2)`. Tím nevzniká falešná závislost.

### 3.2 `step` – jeden krok simulace

```js
/**
 * Provede JEDEN simulační krok (0,05 s herního času). Posune curStep,
 * deleguje na tickOrder.runTick (T6). Levný, bez alokací v hot-path.
 * @param {GameState} state
 * @param {TickContext} ctx   // viz T6: { registry, rng, periodics }
 * @returns {void}
 */
export function step(state, ctx) { … }
```
Algoritmus: `state.engine.curStep += 1;` poté `runTick(state, ctx)` (T6). ROZHODNUTÍ NÁVRHU: `curStep` se inkrementuje **na začátku** kroku, takže první krok běhu je `curStep=1` (krok 0 = počáteční stav před prvním tickem). tickOrder čte `state.engine.curStep` jako „aktuální krok".

### 3.3 `createAccumulator` / `advance` – akumulátorová smyčka

ROZHODNUTÍ NÁVRHU: akumulátor držím jako **samostatný objekt mimo `state`** (UI-orchestrace, ne herní stav – nesmí do save; čas mezi framy je efemérní). `app/` (M0b) ho vlastní; core poskytuje čistou funkci.

```js
/**
 * @typedef {{ accMs: number, lastTimeMs: number, frameBudget: number }} Accumulator
 */

/**
 * @param {number} nowMs        // čas zvenčí (performance.now z app/ – core ho NEčte sám)
 * @param {number} frameBudget  // max kroků za jeden advance (zbytek příště)
 * @returns {Accumulator}
 */
export function createAccumulator(nowMs, frameBudget) { … }

/**
 * Spočítá počet dlužných kroků z uplynulého reálného času a rychlosti,
 * provede max frameBudget kroků, zbytek nechá v akumulátoru.
 * Pauza (speed 0) → 0 kroků; akumulátor se NEplní (čas se zahazuje při pauze).
 * @param {Accumulator} acc
 * @param {GameState} state
 * @param {TickContext} ctx
 * @param {number} nowMs        // performance.now() dodaný z app/ (core ho needetekuje)
 * @returns {{ stepsRun: number, dirty: boolean }}
 */
export function advance(acc, state, ctx, nowMs) { … }
```

Algoritmus `advance` (přesně dle §4.1 pseudo):
```
factor = SPEED_FACTOR[state.engine.speed]            // 0 | 1 | 2
elapsed = nowMs - acc.lastTimeMs
acc.lastTimeMs = nowMs
if (factor === 0) {                                   // pauza: nehromadit dluh
  acc.accMs = 0
  return { stepsRun: 0, dirty: false }
}
acc.accMs += elapsed * factor
stepsDue = Math.floor(acc.accMs / STEP_MS)
steps = Math.min(stepsDue, acc.frameBudget)
for (i=0; i<steps; i++) {
  step(state, ctx)
  if (state.engine.running === false) break          // stopPending (interaktivní event) – zbytek příště
}
acc.accMs -= steps * STEP_MS                          // jen skutečně provedené kroky odečíst
return { stepsRun: steps, dirty: steps > 0 }
```

ROZHODNUTÍ NÁVRHU:
- **Pauza zahazuje nahromaděný čas** (`accMs=0`) – při pauze se reálný čas nemá kde počítat a po odpauzování nemá smysl „dohánět" pauzu. (Catch-up po zavření hry je jiný mechanismus, M2b, řízený `lastSimTimestamp`, ne tímto akumulátorem.)
- `advance` odečítá jen `steps * STEP_MS` (ne `stepsDue`), takže při vyčerpání frame budgetu zbytek dluhu zůstává a dožene se příští frame (§4.1 „zbytek příští frame").
- `running===false` v půlce dávky přeruší smyčku (slot pro stopPending interaktivních eventů, §4.1) – v iter-004 nic `running` nevypíná, ale mechanismus existuje.
- `step` se volá `frameBudget`-krát; mezi nimi žádné alokace.

### 3.4 `index.js` (engine reexport)
`src/core/engine/index.js` reexportuje `{ step, advance, createAccumulator }` z clock, `{ scheduleInsert, scheduleDue, makeScheduleCtx }` z scheduler (T4), `{ computeTimeEdges }` z timeEdges (T4), `{ initRng, makeRng }` z rng (T5), `{ runTick, registerCorePeriodics }` z tickOrder (T6).

### 3.5 Jak to ověří test (T3 acceptance)
- `advance` se `speed=1`, `nowMs` posunutý o `100 ms` → `stepsRun === 2` (100/50); `curStep` vzrostl o 2.
- `speed=2`, `+100 ms` → `stepsRun === 4`.
- `speed=0` (pauza) → `stepsRun === 0`, `curStep` beze změny, `accMs===0`.
- frame budget: `frameBudget=3`, `+1000 ms` při 1× (=20 dlužných) → `stepsRun===3`, zbytek dluhu zůstává; další `advance(+0 ms)` provede další 3 (akumulátor se nevyprázdnil).
- determinismus: tatáž posloupnost `nowMs` → tentýž `curStep` (žádný `Date.now`/`performance.now` v core – grep gate to garantuje; `nowMs` jde vždy zvenčí).

---

## 4. T4 – Scheduler (komplexita L)

**Soubory**: `src/core/engine/scheduler.js` (one-shot min-heap + index id→počet), `src/core/engine/timeEdges.js` (výpočet hran času). Dle §4.2, K6, K17.

> Dekompozice L tasku (§1.2 plánu) na kroky proveditelné Sonnetem: (A) datový tvar + insert/peek/pop heapu, (B) index `scheduleCount`, (C) `scheduleDue` výběr a dispatch, (D) `timeEdges` výpočet hran, (E) testy A–D. Každý krok je samostatný a testovatelný.

### 4.1 Datový tvar scheduleru (serializovatelný – K17)

`state.engine.schedule` je **binární min-heap jako pole** položek; klíč řazení = `step` (číslo kroku, kdy se má událost provést). Položka:

```
ScheduleEntry = { step: number, id: string, params: object }   // params: jen primitiva/plain objekty (serializovatelné)
```

ROZHODNUTÍ NÁVRHU: heap jako pole objektů (ne pole `[step,[…]]` z §3.2 ilustrace) – §3.2 ukazoval `schedule: [[step, [{id,params}]], …]` jako koncept; volím **flat binární heap pole `ScheduleEntry[]`** s heap invariantem, protože:
1. je serializovatelný stejně dobře (pole plain objektů → JSON),
2. `insert`/`pop` jsou O(log n) bez realokací mapy,
3. „bucket per step" ([step,[…]]) komplikuje pop-due, když je více událostí na stejný krok – heap to řeší přirozeně (popuj, dokud `peek().step <= curStep`).
Tím se princip originálu (string-ID schedule) zachová a jen se zefektivní (K17 „min-heap / setříděná mapa"). Tvar zapsat do `types.d.ts`.

`state.engine.scheduleCount` = `{ [id]: number }` – udržovaný index počtu naplánovaných výskytů daného `id` (nahrazuje `countEvent` sken originálu, K17). Inkrementuje se při insert, dekrementuje při pop/cancel.

### 4.2 API scheduleru (signatury)

```js
/**
 * Vloží one-shot událost. Validuje serializovatelnost params (T6 registry udělá ID validaci).
 * Udržuje heap invariant a scheduleCount index.
 * @param {GameState} state
 * @param {number} step    // absolutní krok, kdy se má provést (musí být >= curStep; jinak dev throw)
 * @param {string} id      // string-ID handleru (validace existence ID dělá registry při dispatchi, §5.6)
 * @param {object} [params]
 * @returns {void}
 */
export function scheduleInsert(state, step, id, params = {}) { … }

/**
 * Vyzvedne a ODSTRANÍ všechny události s entry.step <= curStep, v pořadí rostoucího step
 * (ties: FIFO dle pořadí vložení – viz tie-breaker níže). Vrací je k dispatchi (T6 je vykoná).
 * @param {GameState} state
 * @param {number} curStep
 * @returns {ScheduleEntry[]}   // může být prázdné
 */
export function scheduleDue(state, curStep) { … }

/**
 * Zruší naplánované události dle predikátu (např. cancel by id). Aktualizuje scheduleCount.
 * @param {GameState} state
 * @param {(e: ScheduleEntry) => boolean} pred
 * @returns {number}  // počet zrušených
 */
export function scheduleCancel(state, pred) { … }

/** @param {GameState} state @param {string} id @returns {number} počet naplánovaných daného id */
export function scheduleCountOf(state, id) { … }
```

### 4.3 Heap algoritmy (pseudo – binární min-heap nad polem)

```
parent(i)=floor((i-1)/2); left(i)=2i+1; right(i)=2i+2
less(a,b) = a.step < b.step || (a.step===b.step && a.seq < b.seq)   // tie-breaker, viz níže

insert(state, step, id, params):
  assert step >= state.engine.curStep (dev)
  entry = { step, id, params, seq: state.engine._seq++ }   // _seq monotónní vkládací pořadí
  heap.push(entry); siftUp(heap, heap.length-1)
  scheduleCount[id] = (scheduleCount[id] ?? 0) + 1

popMin(state):
  if heap.empty: return undefined
  top = heap[0]; last = heap.pop()
  if heap.length: heap[0]=last; siftDown(heap, 0)
  scheduleCount[top.id] -= 1; if scheduleCount[top.id]===0 delete scheduleCount[top.id]
  return top

scheduleDue(state, curStep):
  out=[]
  while heap.length && heap[0].step <= curStep: out.push(popMin(state))
  return out
```

ROZHODNUTÍ NÁVRHU – **tie-breaker `seq`**: pro determinismus musí být pořadí událostí naplánovaných na stejný krok stabilní. Přidávám monotónní `state.engine._seq` (číslo, součást serializovatelného stavu, inicializuje T2 na `0`) jako sekundární klíč → FIFO v rámci stejného `step`. `_seq` se ukládá v `entry.seq`; je serializovatelný. (Bez tie-breakeru by pořadí záviselo na heap implementaci → nedeterminismus napříč refaktory.) Doplnit `_seq: 0` do `EngineState` v T2 (zpětně – uvést v T2 typu).

> Pozn. pro T2: `EngineState` musí obsahovat i `_seq: number` (default 0). Uvedeno zde, protože vychází z potřeby scheduleru; T2 typ to zahrne.

### 4.4 Periodika jako data (§4.2) – tvar a registrace

Periodické úlohy nejsou v heapu – jsou **deklarovaná data** registrovaná při startu (idempotentně). Definice tvaru zde, registrace konkrétních periodik je T6 (`registerCorePeriodics`).

```
PeriodicTask = {
  id: string,                 // string-ID do fns registru
  every: EdgeName | number,   // 'step'|'quarterDay'|'noon'|'day'|'5days'|'10days'|'month'|'season'|'year' | N (každých N kroků)
  order: number,              // pořadí v rámci stejné hrany (nižší dřív) – deterministické
  systemFn: string            // string-ID handleru v registry
}
EdgeName = 'step'|'quarterDay'|'noon'|'day'|'5days'|'10days'|'month'|'season'|'year'
```

ROZHODNUTÍ NÁVRHU: periodika držím v **registry/in-memory listu** (ne v `state`), protože jsou deklarativní a idempotentně se registrují při každém startu/loadu (architektura §4.2: „idempotentní registrace řeší i load") – nepatří do save. T6 `registerCorePeriodics(registry)` je naplní; engine je čte z `ctx.periodics` (seřazené pole).

### 4.5 `timeEdges.js` – výpočet hran času (§4.2, §4.3)

```js
/**
 * @typedef {{ isNewDay:boolean, isQuarterDay:boolean, isNoon:boolean,
 *   isNewMonth:boolean, isNew5Days:boolean, isNew10Days:boolean,
 *   isNewSeason:boolean, isNewYear:boolean }} TimeEdges
 */

/**
 * Spočítá hrany času pro AKTUÁLNÍ krok JEDNOU za tick (§4.2 – ne per-service modulo).
 * Vstup = season stav PO posunu calendarem (T6 calendar běží jako první v tickOrder).
 * @param {SeasonState} season   // už posunutý calendarem pro tento krok
 * @param {number} curStep
 * @returns {TimeEdges}
 */
export function computeTimeEdges(season, curStep) { … }
```

Algoritmus (ROZHODNUTÍ NÁVRHU – definice hran odvozené z §4.1 konstant; přesné balanční pořadí se dotěží per mechanika v pozdějších milnících, zde struktura):
- `STEPS_PER_DAY = 900`, `STEPS_PER_QUARTER = 225` (900/4), `noon` = polovina dne = krok `450` v rámci dne.
- `stepInDay = (curStep - 1) % 900` (krok 1 = první krok dne, stepInDay 0).
- `isNewDay` = `stepInDay === 0` (první krok nového dne).
- `isQuarterDay` = `stepInDay % 225 === 0`.
- `isNoon` = `stepInDay === 450`.
- `isNewMonth` = `isNewDay && (season.curDay - 1) % 30 === 0` — ROZHODNUTÍ NÁVRHU: měsíc = 30 dní (sezóna 91 dní ≈ 3 měsíce; přesný kalendář originálu dotěží M1/port; zde deklaruji 30denní měsíc a označím `// CALENDAR: month=30d provisional, confirm @ M1`). Hrana `isNew5Days`/`isNew10Days` = `isNewDay && (season.curDay) % 5===0` resp `%10===0` (počítáno na absolutní den roku — viz níže).
- **Sezóna 91 dní, 4 sezóny = rok 364 dní** (§4.4: „4×91 dní"; brief T6: „sezóna 4×91"). `isNewSeason` = `isNewDay && season.dayInSeason === 1`. `isNewYear` = `isNewDay && season.curDay === 1 && season.curMonth === 1` (resp. dle calendaru – viz T6 kde je rozhodnut tvar `curDay/curMonth/curYear`).

ROZHODNUTÍ NÁVRHU – konzistence calendaru a hran: aby `timeEdges` a `calendar` (T6) nepočítaly kalendář dvakrát, **calendar je autorita** – v tickOrder běží calendar první, posune `season.*`, a `timeEdges` čte hotový `season`. Proto většina hran se odvozuje z `season.dayInSeason`/`season.curDay`, ne z přepočtu `curStep`. `timeEdges` tak vrací hrany na základě toho, **co calendar právě změnil** (calendar nastaví pomocné flagy nebo timeEdges porovná `dayInSeason`). Detailní propojení je v T6 (§5.2) – tam je calendar jediným místem výpočtu data; `timeEdges` z něj jen čte. Aby nedošlo k duplicitě, **finální rozhodnutí: calendar v T6 vyprodukuje `TimeEdges` přímo** (vrátí je z `advanceCalendar`), a `timeEdges.js` obsahuje jen čisté pomocné funkce (`stepInDay(curStep)`, `isDayBoundary(...)`) volané calendarem. Viz §5.2.

### 4.6 Jak to ověří test (T4 acceptance)
- insert 3 events na kroky `[10, 5, 5]` → `scheduleDue(state, 5)` vrátí oba `step=5` v pořadí vložení (tie-breaker `seq`), `step=10` zůstává.
- `scheduleCount[id]` odpovídá počtu naplánovaných; po popu klesá; po vyčerpání klíč zmizí.
- serializovatelnost: `JSON.parse(JSON.stringify(state.engine.schedule))` zachová pořadí pop výsledků (heap invariant po deserializaci stále platí).
- heap property fuzz: vlož N náhodných (ze seedovaného RNG, ne Math.random) kroků, popMin opakovaně → výstup je neklesající v `step`.
- `computeTimeEdges`: pro `curStep` na hranicích dne/quarter/noon/sezóny/roku vrací správné booleany (tabulkový test s konkrétními kroky: krok 1 → isNewDay; krok 451 → isNoon; krok 901 → isNewDay; krok 81901 → isNewSeason).

---

## 5. T5 – RNG streamy (komplexita S, zkrácený návrh)

**Soubor**: `src/core/engine/rng.js`. Dle §4.4, K16, D4.

### 5.1 PRNG – mulberry32 (ROZHODNUTÍ NÁVRHU)

Volím **mulberry32**: stav = jediný `uint32`, výstup deterministický, dostatečně kvalitní pro herní RNG, triviálně serializovatelný (1 číslo per stream). xoshiro128** (4×uint32) zamítám pro iter-004 – mulberry32 stačí, menší stav v save (`xoshiro` lze nasadit později beze změny API, pokud kvalita nestačí; rozhraní je stejné).

```js
/**
 * Vrátí generátor svázaný se stavem streamu v state.rng.streams[name].
 * Čtení/zápis stavu jde PŘÍMO do state (serializovatelné, přežije save).
 * @param {GameState} state
 * @param {StreamName} name
 * @returns {Rng}
 */
export function makeRng(state, name) { … }

/**
 * @typedef {Object} Rng
 * @property {() => number} next       // float v [0,1)
 * @property {(maxExclusive:number) => number} int   // celé číslo [0, maxExclusive)
 * @property {(min:number,max:number) => number} range // float [min,max)
 * @property {(p:number) => boolean} chance           // true s pravděpodobností p
 */

/**
 * Inicializuje všechny pojmenované streamy ze seedu (deterministicky, různé per stream).
 * Idempotentní pouze pokud streamy ještě neexistují – po loadu se NEvolá (stav je v save).
 * @param {GameState} state
 * @returns {void}
 */
export function initRng(state) { … }

/** Stabilní hash celého stavu pro determinism test (FNV-1a nad JSON). @param {GameState} state @returns {number} */
export function hashState(state) { … }
```

### 5.2 Algoritmy (pseudo)

```
mulberry32(a):                    // a = uint32 stav
  a |= 0; a = (a + 0x6D2B79F5) | 0
  t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296    // [0,1)

makeRng(state, name):
  return {
    next: () => { s = state.rng.streams[name]; [val, s2] = mulberryStep(s); state.rng.streams[name] = s2; return val }
    int: (n) => Math.floor(next() * n)
    range: (lo,hi) => lo + next()*(hi-lo)
    chance: (p) => next() < p
  }
  // mulberryStep vrací (hodnota, nový uint32 stav) – stav se ukládá zpět do state

initRng(state):
  base = state.rng.seed >>> 0
  for (i, name) in enumerate(STREAM_NAMES):
    // odvoď různý seed per stream deterministicky (splitmix-like skok), aby streamy nekorelovaly
    state.rng.streams[name] = (base + (i+1)*0x9E3779B9) >>> 0

STREAM_NAMES = ['population','forest','mine','field','market','world','battle','events']  // pevné pořadí (determinismus)
```

ROZHODNUTÍ NÁVRHU:
- **Stav streamu = `uint32` přímo v `state.rng.streams[name]`** – žádný wrapper objekt v save, čisté číslo. `makeRng` je tenký closure, který čte/zapisuje toto číslo; lze ho vytvořit ad-hoc v každém systému (`makeRng(state,'forest')`) bez ukládání generátoru.
- **Seed per stream** odvozen `base + (i+1)*0x9E3779B9` – levné, deterministické, dekorelované pro různé streamy. (Plný splitmix64 je overkill pro 8 streamů.)
- `hashState` = FNV-1a 32-bit nad `JSON.stringify(state)` (deterministická serializace – pozor: objekty s neuspořádanými klíči; ROZHODNUTÍ: hash počítá nad `JSON.stringify` s **stabilním replacerem**, který klíče řadí, aby pořadí klíčů neovlivnilo hash). Slouží determinism testu `hash(simulate(seed,N))`.

### 5.3 Jak to ověří test (T5 acceptance)
- Stejný seed → `initRng` dá identické `streams`; `next()` sekvence je reprodukovatelná.
- Streamy nekorelují: prvních 5 hodnot `forest` ≠ prvních 5 hodnot `market` (různé seedy).
- `next()` ∈ [0,1); `int(6)` ∈ {0..5}; `chance(0)` vždy false, `chance(1)` vždy true.
- **Determinism hash** (DoD iter-004): `simulate(seed, N)` = `createInitialState({seed}); initRng; registerCorePeriodics; advance/step N-krát s pevnou nowMs sekvencí` → `hashState` je stabilní napříč běhy a po `JSON` round-tripu stavu.
- Stav streamu po `next()` se uloží zpět do `state.rng.streams[name]` (save-resume: znovuvytvořený `makeRng` pokračuje tam, kde skončil).

---

## 6. T6 – tickOrder + calendar/seasons + fail-fast registr + commands skeleton (komplexita L)

**Soubory**: `src/core/engine/tickOrder.js`, `src/core/systems/calendar.js`, `src/core/registry/registry.js`, `src/core/commands/dispatch.js`, `src/core/commands/setSpeed.js`. Dle §4.3, §5.6, §3.3.

> Dekompozice L (§1.2): (A) registry fail-fast, (B) calendar/seasons + propojení s timeEdges, (C) tickOrder runTick + registerCorePeriodics (data), (D) commands dispatch + setSpeed, (E) testy. Pořadí implementace A→B→C→D (C závisí na A,B; D závisí na A).

### 6.1 (A) Fail-fast fns registr `registry/registry.js` (§5.6, K10)

```js
/**
 * @typedef {(state: GameState, params: object, ctx: TickContext) => void} HandlerFn
 */

/** Vytvoří prázdný registr. @returns {Registry} */
export function createRegistry() { … }

/**
 * Zaregistruje handler pod string-ID. Idempotentní pro IDENTICKÝ handler;
 * re-registrace JINÉHO handleru pod stejné ID = chyba (kolize ID, fail-fast).
 * @param {Registry} reg
 * @param {string} id
 * @param {HandlerFn} handler
 * @returns {void}
 */
export function register(reg, id, handler) { … }

/**
 * Vyzvedne handler. Neznámé ID = výjimka v DEV (fail-fast); v prod strukturovaný log + no-op.
 * @param {Registry} reg @param {string} id @returns {HandlerFn}
 */
export function resolve(reg, id) { … }

/** True pokud ID existuje. @param {Registry} reg @param {string} id @returns {boolean} */
export function has(reg, id) { … }

/**
 * Validuje serializovatelnost params (kontrakt „params must be primitive", §5.6).
 * Hodí v DEV, pokud params obsahují funkci/cyklus/nesalizovatelnou hodnotu.
 * @param {object} params @returns {void}
 */
export function assertSerializable(params) { … }
```

`Registry` typedef: `{ handlers: Map<string, HandlerFn> }`.

Algoritmus:
- `register`: pokud `id` už existuje a `handlers.get(id) !== handler` → `throw new Error('registry: id collision: '+id)` (v DEV). Jinak set.
- `resolve`: pokud chybí → v DEV `throw new Error('registry: unknown id: '+id)`; v prod vrať no-op `() => {}` + (později) telemetrie. (V iter-004 DEV=true, takže throw.)
- `assertSerializable`: `try { structuredClone(params) } catch { throw }` + dodatečná kontrola, že žádná hodnota není `function` (rekurzivně, mělce – primitiva/plain objekty/pole). ROZHODNUTÍ NÁVRHU: `structuredClone` je dostupný v Node 22 i v browseru, není zakázaný (není DOM/IO/nedeterminismus) → použít.

ROZHODNUTÍ NÁVRHU: registr je **instance předávaná v `ctx`** (ne modulový singleton) – testovatelnost a žádný skrytý globální stav. Bootstrap vytvoří jeden registr, naplní ho (`registerCorePeriodics`, command handlery, později systémy).

### 6.2 (B) Calendar/seasons `systems/calendar.js` (§4.3 bod 1)

Calendar je **jediná autorita kalendáře** – posune datum a vyprodukuje `TimeEdges` (řeší duplicitu z §4.5).

```js
/**
 * Posune kalendář o jeden krok (volá se jako PRVNÍ v tickOrder).
 * Aktualizuje season.* a vrátí hrany času pro tento krok (čte je tickOrder/periodika).
 * @param {GameState} state
 * @returns {TimeEdges}
 */
export function advanceCalendar(state) { … }
```

Datový model kalendáře (ROZHODNUTÍ NÁVRHU – sezóna 91 dní, 4 sezóny/rok = 364 dní/rok; měsíc provizorně 30 dní, potvrdí M1 při portu):

```
season = { curStep, curDay, curMonth, curYear, curSeason, dayInSeason }
konstanty: STEPS_PER_DAY=900, DAYS_PER_SEASON=91, SEASONS_PER_YEAR=4, DAYS_PER_YEAR=364, DAYS_PER_MONTH=30
```

Algoritmus `advanceCalendar` (pseudo):
```
season.curStep = state.engine.curStep
stepInDay = (curStep - 1) % 900                       // 0..899
isNewDay = (stepInDay === 0)
if (isNewDay && curStep > 0):                          // posun dne (krok 1 = první den, žádný posun; den se posouvá od kroku 901)
   advanceDay(season)                                  // viz níže
edges = {
  isNewDay,
  isQuarterDay: stepInDay % 225 === 0,
  isNoon:       stepInDay === 450,
  isNewMonth:   isNewDay && (season.curDay - 1) % 30 === 0,
  isNew5Days:   isNewDay && season.absDay % 5 === 0,
  isNew10Days:  isNewDay && season.absDay % 10 === 0,
  isNewSeason:  isNewDay && season.dayInSeason === 1,
  isNewYear:    isNewDay && season.curSeason === 0 && season.dayInSeason === 1
}
return edges

advanceDay(season):
  season.dayInSeason += 1
  if (season.dayInSeason > 91):
     season.dayInSeason = 1
     season.curSeason = (season.curSeason + 1) % 4
     if (season.curSeason === 0): season.curYear += 1
  // curDay = absolutní den v roce (1..364), curMonth odvozen (1..12 provisional)
  season.curDay = season.curSeason*91 + season.dayInSeason     // 1..364
  season.curMonth = floor((season.curDay - 1) / 30) + 1
```

ROZHODNUTÍ NÁVRHU – **inicializace a hrana prvního dne**: na `curStep=0` (počáteční stav) je den 1, sezóna 0, dayInSeason 1. První `step` dělá `curStep=1` → `stepInDay=0` → `isNewDay=true`, ale `curStep>0` je true, takže by se posunul den hned. Aby den 1 „trval" 900 kroků, `advanceDay` se volá jen když `isNewDay && curStep > 1` … **přesněji**: den se posouvá při přechodu na krok, který je první v novém dni a NENÍ úplně první krok hry. Implementačně: `if (isNewDay && curStep !== 1) advanceDay(season)`. Tím den 1 = kroky 1..900, den 2 začíná krokem 901. Tento detail explicitně otestovat (viz 6.6). `absDay` = monotónní čítač dní od startu (`season._absDay`, inkrementuje se v `advanceDay`; do T2 typu přidat `_absDay:1`).

Pozn. pro T2: `SeasonState` zahrne `_absDay: number` (default 1). Hrany `isNew5Days`/`isNew10Days` se počítají z `_absDay` (monotónní), ne z `curDay` (cyklický 1..364), aby nevznikaly mezery na hranici roku.

### 6.3 (C) tickOrder `engine/tickOrder.js` (§4.3) – kostra jako data + runTick

`tickOrder` deklaruje pořadí vyhodnocení jako data a `runTick` ho vykoná. V iter-004 jsou **reálně aktivní jen calendar a schedule dispatch**; periodika jsou registrovaná jako **no-op sloty** (architektura: sloty existují od začátku), aby tickOrder byl kompletní živý artefakt, ale systémy se naplní v M2+.

```js
/**
 * Pořadí vyhodnocení v rámci JEDNOHO kroku (deklarovaná data – živý artefakt §4.3).
 * @type {ReadonlyArray<{phase:string, note:string}>}
 */
export const TICK_ORDER = [ … ];   // viz níže – odpovídá §4.3 1:1

/**
 * Vykoná jeden tick v deklarovaném pořadí. Volá clock.step (T3) per krok.
 * @param {GameState} state
 * @param {TickContext} ctx   // { registry, periodics }
 * @returns {void}
 */
export function runTick(state, ctx) { … }

/**
 * Idempotentně zaregistruje core periodika jako DATA (PeriodicTask[]) + jejich (zatím no-op) handlery.
 * @param {Registry} registry @returns {PeriodicTask[]}  // seřazené pole pro ctx.periodics
 */
export function registerCorePeriodics(registry) { … }
```

`TICK_ORDER` (data – přepis §4.3, každá fáze s poznámkou a zdrojem):
```
[
  { phase:'calendar',   note:'posun dne/měsíce/roku/sezóny – produkuje TimeEdges' },
  { phase:'schedule',   note:'one-shot události se step<=curStep přes fns registr' },
  { phase:'periodics',  note:'periodika dle hran v deklarovaném order (viz registerCorePeriodics)' },
  { phase:'eventFlush', note:'dev-invarianty (NaN/záporné zásoby) – v iter-004 jen NaN guard na curStep' }
]
```

Algoritmus `runTick` (pseudo):
```
runTick(state, ctx):
  edges = advanceCalendar(state)                          // fáze 1
  due = scheduleDue(state, state.engine.curStep)          // fáze 2
  for entry in due:
     handler = resolve(ctx.registry, entry.id)
     handler(state, entry.params, ctx)
  for task in ctx.periodics:                              // fáze 3 (seřazené dle (edge order, task.order))
     if edgeActive(task.every, edges, state.engine.curStep):
        resolve(ctx.registry, task.systemFn)(state, {}, ctx)
  devInvariants(state)                                    // fáze 4: assert Number.isFinite(curStep) atd.

edgeActive(every, edges, curStep):
  if typeof every === 'number': return curStep % every === 0
  switch every:
    'step' -> true
    'quarterDay' -> edges.isQuarterDay
    'noon' -> edges.isNoon
    'day' -> edges.isNewDay
    '5days' -> edges.isNew5Days
    '10days' -> edges.isNew10Days
    'month' -> edges.isNewMonth
    'season' -> edges.isNewSeason
    'year' -> edges.isNewYear
```

`registerCorePeriodics` (iter-004 – **no-op sloty** dle §4.3 struktury; reálná logika M2+):
```
periodics = [
  {id:'population.migration', every:'step',       order:10, systemFn:'noop'},
  {id:'skills.progress',      every:'step',       order:20, systemFn:'noop'},
  {id:'jobs.production',      every:'quarterDay',  order:10, systemFn:'noop'},
  {id:'health.births',        every:'noon',        order:10, systemFn:'noop'},
  {id:'meal.daily',           every:'day',         order:10, systemFn:'noop'},
  {id:'forest.regen',         every:'10days',      order:10, systemFn:'noop'},
  {id:'localTaxes',           every:'5days',       order:10, systemFn:'noop'},
  {id:'taxes.monthly',        every:'month',       order:10, systemFn:'noop'},
  {id:'season.change',        every:'season',      order:10, systemFn:'noop'},
]
register(registry, 'noop', () => {})        // jediný sdílený no-op handler
return periodics.sort by (edgePriority(every), order)   // edgePriority dle pořadí v §4.3: step<quarterDay<noon<day<5days<10days<month<season<year
```

ROZHODNUTÍ NÁVRHU: všechna iter-004 periodika ukazují na sdílený `'noop'` handler – tickOrder je tím **kompletní a testovatelný** (hrany se opravdu vyhodnocují a no-op se volá ve správné momenty), ale žádná herní logika se nepíše (to je scope pozdějších milníků). `registerCorePeriodics` vrací seřazené pole, které bootstrap uloží do `ctx.periodics`. tickOrder.md (`/docs/`) je textová kopie tohoto seznamu + závazek věrnosti (§4.3).

### 6.4 (D) Commands skeleton `commands/dispatch.js` + `commands/setSpeed.js` (§3.3)

```js
/**
 * @typedef {{ type: string, params?: object }} Command
 * @typedef {{ ok: boolean, error?: string }} CommandResult
 */

/** Registr command handlerů (oddělený od fns registry – jiný kontrakt). @returns {CommandRegistry} */
export function createCommandRegistry() { … }

/**
 * @param {CommandRegistry} creg @param {string} type
 * @param {(state:GameState, params:object) => CommandResult} handler
 */
export function registerCommand(creg, type, handler) { … }

/**
 * Jediný vstup UI→core. Validuje serializovatelnost commandu, najde handler, provede.
 * Neznámý type = { ok:false, error } (ne throw – UI nesmí spadnout); v DEV navíc warn.
 * @param {CommandRegistry} creg @param {GameState} state @param {Command} cmd
 * @returns {CommandResult}
 */
export function dispatch(creg, state, cmd) { … }
```

`setSpeed.js`:
```js
/**
 * Command handler setSpeed: validuje speed ∈ {0,1,2}, nastaví state.engine.speed.
 * @param {GameState} state @param {{ speed: number }} params @returns {CommandResult}
 */
export function setSpeed(state, params) { … }
/** Registruje setSpeed do command registru. @param {CommandRegistry} creg @returns {void} */
export function registerSetSpeed(creg) { … }
```

Algoritmus `dispatch`: `assertSerializable(cmd.params ?? {})`; pokud `!creg.has(cmd.type)` → `{ok:false, error:'unknown command: '+cmd.type}`; jinak `return handler(state, cmd.params ?? {})`. `setSpeed`: pokud `![0,1,2].includes(params.speed)` → `{ok:false, error:'invalid speed'}`; jinak `state.engine.speed = params.speed; return {ok:true}`.

ROZHODNUTÍ NÁVRHU: command registr je **oddělený** od fns registru (`registry.js`) – jiný kontrakt (commandy vrací `CommandResult`, validují pravidla; fns handlery mutují stav v ticku a nevrací nic). §3.3 popisuje commandy jako vlastní vrstvu. `dispatch` **nehází** na neznámý command (UI robustnost), zatímco `resolve` ve fns registru hází (interní bug = fail-fast). setSpeed je „první command" dle briefu T6.

### 6.5 Bootstrap (lepidlo pro testy a iter-005 app)

ROZHODNUTÍ NÁVRHU: přidat `src/core/engine/index.js` reexport (viz §3.4) + dokumentovat bootstrap sekvenci v `tickOrder.md`:
```
const state = createInitialState({ seed });
initRng(state);
const registry = createRegistry();
const periodics = registerCorePeriodics(registry);
const creg = createCommandRegistry(); registerSetSpeed(creg);
const ctx = { registry, periodics };
// smyčka: advance(acc, state, ctx, nowMs)   |   UI: dispatch(creg, state, { type:'setSpeed', params:{ speed:2 } })
```
(Žádný runtime soubor `bootstrap.js` v core se v iter-004 nevytváří – bootstrap vlastní `app/` v M0b; zde je jen jako referenční sekvence + používá ho test harness.)

### 6.6 Jak to ověří test (T6 acceptance)
- **registry**: `register` stejného ID s jiným handlerem → throw; `resolve` neznámého ID → throw (DEV); `assertSerializable({fn:()=>{}})` → throw.
- **calendar**: krok 1..900 = den 1 (`dayInSeason===1`); krok 901 → den 2; krok 91*900+1 → sezóna 1, dayInSeason 1, `isNewSeason`; krok 364*900+1 → rok 2, `isNewYear`. `_absDay` monotónně roste.
- **tickOrder/runTick**: spy/counter na no-op handler ukáže, že `population.migration` (every step) se volá každý krok; `meal.daily` (every day) jen na isNewDay; `season.change` jen na hranici sezóny. Pořadí: calendar před schedule před periodika (ověř přes side-effect order).
- **schedule integrace**: naplánuj event na krok 5, registruj jeho handler → po 5 krocích advance se handler zavolá právě jednou; `scheduleCount` klesne.
- **commands**: `dispatch(creg,state,{type:'setSpeed',params:{speed:2}})` → `{ok:true}`, `state.engine.speed===2`; `speed:5` → `{ok:false}`; neznámý type → `{ok:false}`, žádný throw.
- **end-to-end determinismus** (DoD iter-004): bootstrap + N kroků s pevnou `nowMs` sekvencí → `hashState` stabilní; po `JSON` round-tripu stavu a pokračování → tentýž hash jako bez round-tripu (serializovatelnost celého enginu).

---

## 7. Souhrn souborů a závislostí (pořadí implementace pro Sonnet)

| # | Soubor | Task | Závisí na |
|---|---|---|---|
| 1 | `package.json`, `tsconfig.json`, `.gitignore`, `index.html`, adresářová kostra | T1 | – |
| 2 | `tools/check-core-imports.mjs` | T1 | – |
| 3 | `src/core/state/types.d.ts` | T2 | – |
| 4 | `src/core/state/createInitialState.js` | T2 | types |
| 5 | `src/core/state/freeze.js` | T2 | – |
| 6 | `src/core/engine/rng.js` | T5 | T2 (state.rng) |
| 7 | `src/core/engine/timeEdges.js` (čisté pomocné fns) | T4 | – |
| 8 | `src/core/engine/scheduler.js` | T4 | T2 (state.engine) |
| 9 | `src/core/engine/clock.js` | T3 | T2, T6 runTick |
| 10 | `src/core/registry/registry.js` | T6 | T2 |
| 11 | `src/core/systems/calendar.js` | T6 | T2, T4 timeEdges |
| 12 | `src/core/engine/tickOrder.js` | T6 | T4 scheduler, T6 calendar+registry |
| 13 | `src/core/commands/dispatch.js`, `commands/setSpeed.js` | T6 | T2, T6 registry |
| 14 | `src/core/engine/index.js` (reexport) | T3/T6 | vše výše |
| 15 | `/docs/tickOrder.md`, `/docs/architecture-diagram.md` (živé artefakty) | T1/T6 | – |

**Cyklická pozn.**: `clock.step` volá `tickOrder.runTick`, který je v jiném modulu → žádný cyklus (clock → tickOrder → {calendar, scheduler, registry}). `index.js` reexport řeší veřejné API bez cyklů.

## 8. Konzistence s architekturou + otevřené volby (shrnutí ROZHODNUTÍ NÁVRHU)

Žádné nové architektonické rozhodnutí. Tam, kde architektura nechávala volnost, jsem zvolil a zdůvodnil:
1. **Heap jako flat `ScheduleEntry[]`** (ne `[step,[…]]` bucket) – serializovatelné, O(log n), tie-breaker `_seq` pro determinismus. (§4.1)
2. **mulberry32** (ne xoshiro) – 1×uint32 stav per stream, menší save, stejné API. (§5.1)
3. **8 RNG streamů** vč. `mine`,`field` – izolace per systém (D4). (§2.4)
4. **Pauza zahazuje akumulovaný čas**; catch-up je oddělený mechanismus (M2b). (§3.3)
5. **Calendar je autorita kalendáře**, produkuje `TimeEdges` → `timeEdges.js` jen čisté helpery (žádný dvojí výpočet). (§4.5/§6.2)
6. **Měsíc 30 dní, rok 364 dní (4×91)** provizorně, potvrzení při portu M1 (`// CALENDAR: provisional`). (§6.2)
7. **Periodika jako data mimo state** (idempotentní registrace), iter-004 = no-op sloty → kompletní živý tickOrder bez herní logiky. (§6.3)
8. **Command registr oddělený od fns registru** (jiný kontrakt: result vs. mutace; dispatch nehází, resolve hází). (§6.4)
9. **`tsconfig` lib bez DOM** v core → dvojitá pojistka R-I (tsc + grep). (§1.3)

Tyto volby drží engine `catch-up-safe` od počátku (žádný `Date.now`/`Math.random` v core; čas a náhoda jen jako parametry/serializovaný stav) – splňuje S-05 invariant a determinism hash test (DoD iter-004).

---
*Konec návrhu iter-004. Zdroj pravdy pro K/D/R/§ položky: `architecture_proposal_iter-002_T-001.md`. Implementace = Sonnet, T-002.*
