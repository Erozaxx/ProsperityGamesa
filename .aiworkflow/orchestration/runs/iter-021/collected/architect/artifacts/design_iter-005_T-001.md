# Prosperity rebuild – Detailní implementační návrh iter-005 (M0b)

- **Task**: T-001, iter-005 (BRIEF-015)
- **Autor**: architect (Opus)
- **Datum**: 2026-06-13
- **Vstupy**: `architecture_proposal_iter-002_T-001.md` (§2.1 stack/PWA, §5.1 fail loader, §6 save model, §9.2/D10 cap, §11 M0 DoD, §14 doporučení – §14.1 = doporučení 1 „M0 začít benchmarkem"), `design_iter-004_T-001.md`, reálný kód `src/core/*` (public API `engine/index.js`, `state/createInitialState.js`, `commands/dispatch.js`+`setSpeed.js`, `registry/registry.js`, `engine/clock.js`, `engine/rng.js`, `state/types.d.ts`).
- **Účel**: spec pro Sonnet codera (T-002). **NE implementace** – konkrétní soubory, signatury (JSDoc), datové tvary, algoritmy/pseudo, jak to ověří test. Sonnet implementuje bez dalšího rozhodování.
- **Scope IN**: T1 PWA shell (index.html přepis + `src/app/` bootstrap rAF nad `advance()`, visibilitychange/pagehide autosave hook, vendorovaný preact+htm ESM, minimální UI přes commands), T2 manifest+SW cache-first verzovaný precache + `tools/gen-precache.mjs`, T3 IndexedDB save minimal (stores slots/saves, 1 slot + N=3 generace, lastSimTimestamp, fallback), T4 syntetický benchmark ceny kroku (Node, report → potvrzení/eskalace capu 8h + D13), T5 `navigator.storage.persist()` + error screen. Plus `.github/workflows/ci.yml` (`npm run ci`).
- **Scope OUT**: produkční kód; žádná změna architektury; žádné herní systémy (jen M0b shell/save/benchmark vrstva NAD core). Core zůstává bez DOM.

---

## 0. Globální konvence (platí pro celý iter-005)

- **Zero-build runtime** (§2.1/D1): vše běží jako statické ES moduly bez bundleru. Importy s příponou `.js`/`.mjs`, relativní. UI knihovny **vendorované** jako ESM v `src/vendor/` (žádné `node_modules` v runtime).
- **Vrstvení (§3.1)**: nové vrstvy `src/app/`, `src/ui/`, `src/save/` importují core **jen přes public API** (`src/core/engine/index.js`, `createInitialState`, `dispatch`, `assertSerializable`). Nikdy nesahají do interních modulů core. **Core se v iter-005 NEMĚNÍ** – žádný DOM/IO se do `src/core/` nepřidává; grep gate (`tools/check-core-imports.mjs`) musí dál procházet.
- **Jazyk**: JS ES2022 moduly + JSDoc typy; `app`/`ui`/`save` smí používat DOM API (jsou mimo core) → typecheck těchto vrstev potřebuje `lib: ["DOM"]` (viz §7 – rozšíření tsconfigu).
- **Determinismus**: čas vstupuje do `advance()` jako `nowMs` parametr z `app/` (`performance.now()`), nikdy přímo do core (zachováno z iter-004).
- **Testy**: `node:test` + `node:assert/strict`, `test/<oblast>.test.js`, `node --test`. DOM-závislé části (SW, IndexedDB, preact render) se testují tam, kde to jde, čistou logikou (viz „jak to ověří test" u každého tasku) – plný PWA smoke (install+offline) je manuální/tester check (T-003, §11 N-03), ne unit test.
- **LEGACY STAV (zjištěno z repa)**: `index.html`, `manifest.webmanifest`, `service-worker.js`, `src/js/{main,game,state,storage,ui}.js`, `src/css/style.css` jsou **placeholder „click-game" z M0a kostry, nenapojený na engine core**. iter-005 je **přepisuje/odstraňuje** (viz §8 – plán odstranění legacy). `src/app/`, `src/ui/`, `src/save/`, `src/data/` jsou prázdné (`.gitkeep`). `src/vendor/` neexistuje. `.github/` neexistuje. Node 22.

### 0.1 Reálné public API core (zdroj pravdy pro importy – ověřeno v kódu)

```
// src/core/engine/index.js  (reexport)
import {
  step, advance, createAccumulator, STEP_MS, STEP_SECONDS, STEPS_PER_DAY, SPEED_FACTOR,
  scheduleInsert, scheduleDue, scheduleCancel, scheduleCountOf,
  stepInDay, isDayBoundary,
  initRng, makeRng, hashState,
  runTick, registerCorePeriodics, TICK_ORDER,
} from '../core/engine/index.js';

// src/core/state/createInitialState.js
import { createInitialState } from '../core/state/createInitialState.js';      // (opts?) => GameState

// src/core/registry/registry.js
import { createRegistry, register, resolve, has, assertSerializable } from '../core/registry/registry.js';

// src/core/commands/dispatch.js  +  commands/setSpeed.js
import { createCommandRegistry, registerCommand, dispatch } from '../core/commands/dispatch.js';
import { registerSetSpeed } from '../core/commands/setSpeed.js';

// src/core/state/freeze.js
import { devFreeze, DEV } from '../core/state/freeze.js';
```

**Bootstrap sekvence core (z design_iter-004 §6.5 – reálné API):**
```
const state = createInitialState({ seed });
initRng(state);
const registry = createRegistry();
const periodics = registerCorePeriodics(registry);     // registruje 'noop' + vrací seřazené periodics
const creg = createCommandRegistry(); registerSetSpeed(creg);
const ctx = { registry, periodics };
const acc = createAccumulator(nowMs, state.engine.frameBudget);
// frame: advance(acc, state, ctx, nowMs)  → { stepsRun, dirty }
// UI:    dispatch(creg, state, { type:'setSpeed', params:{ speed:2 } }) → { ok, error? }
```

---

## 1. T1 – PWA shell (index.html + `src/app/` bootstrap + vendor + minimální UI) (komplexita L)

### 1.1 Vendorování preact+htm (`src/vendor/`)

**Soubory k vytvoření (ESM, zero-build, commitnuté):**
```
/src/vendor/preact.module.js          # preact core (ESM build, ~4 kB gz)
/src/vendor/hooks.module.js           # preact/hooks (useState, useEffect…)
/src/vendor/htm.module.js             # htm (tagged-template → vnode), ~700 B
/src/vendor/preact.standalone.js      # malý glue modul (viz níže)
/src/vendor/VENDOR.md                 # provenance: verze, zdroj, licence (MIT), datum, jak upgradovat
```

ROZHODNUTÍ NÁVRHU: zdrojem jsou oficiální ESM buildy z npm balíčků `preact@10.x` (`dist/preact.module.js`), `preact@10.x/hooks/dist/hooks.module.js`, `htm@3.x` (`dist/htm.module.js`). Sonnet je **zkopíruje** (ne přes CDN import za běhu – offline-first, §2.1) a do `VENDOR.md` zapíše přesné verze + MIT licence + odkaz na zdroj (PROVENANCE, §12 R-G). Žádná transpilace (htm nahrazuje JSX → bez build kroku, §2.1).

`src/vendor/preact.standalone.js` (glue – jediný import point pro UI vrstvu, izoluje vendor cesty):
```js
/**
 * Vendored preact + htm bundle entrypoint. UI imports html/render/hooks ONLY from here,
 * so vendor file paths/versions are changeable in one place.
 */
import { h, render } from './preact.module.js';
import { useState, useEffect, useRef } from './hooks.module.js';
import htm from './htm.module.js';
/** Tagged-template html`` bound to preact's h() – use instead of JSX. */
export const html = htm.bind(h);
export { render, useState, useEffect, useRef, h };
```

ROZHODNUTÍ NÁVRHU – proč glue modul: UI komponenty importují `{ html, render, useState }` jen z `preact.standalone.js`. Když se vendor upgraduje nebo cesty změní, mění se jediný soubor. Také to dává čistý bod pro precache (§2.2).

Alternativa (zamítnutá): import přes import-map v `index.html` (`<script type="importmap">`). Zamítnuto – import mapy nejsou v SW precache zachycené jako soubory a komplikují cache-busting; explicitní relativní importy jsou pro zero-build/precache jednodušší a deterministické.

### 1.2 `index.html` (přepis legacy)

Přepiš celý `index.html` (smaž click-game markup). Minimální shell – mount point + loader + error screen kontejner + SW/app bootstrap:

```html
<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#0f1f17" />
  <meta name="description" content="Prosperity – offline idle ekonomická hra (rebuild)." />
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="icon" href="icons/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="icons/icon.svg" />
  <link rel="stylesheet" href="src/ui/styles.css" />
  <title>Prosperity (rebuild)</title>
</head>
<body>
  <div id="app" aria-busy="true">
    <div id="boot-loader" class="boot-loader">Načítám…</div>
  </div>
  <script type="module" src="src/app/main.js"></script>
</body>
</html>
```

ROZHODNUTÍ NÁVRHU: SW registrace **NENÍ** inline ve `<head>` – dělá ji `src/app/main.js` (jediné místo glue, §3.1 „app/ je jediné místo kde se vrstvy potkávají"). Loader `#boot-loader` je statický fallback, než app převezme `#app` (error screen ho při fail nahradí, §5). CSS přesun do `src/ui/styles.css` (legacy `src/css/style.css` se odstraní, §8).

### 1.3 `src/app/` – bootstrap, rAF smyčka, lifecycle

**Soubory:**
```
/src/app/main.js          # entrypoint: SW registrace, env, persist, bootstrap, render mount, error screen wiring
/src/app/loop.js          # rAF smyčka nad advance(); start/stop; dirty→render callback
/src/app/lifecycle.js     # visibilitychange / pagehide → autosave hook (placeholder volá save callback)
/src/app/env.js           # DEV flag pro app/ui (přepíná core/state/freeze chování přes UI hranici)
/src/app/sw-register.js   # navigator.serviceWorker.register glue (no-op v Node/test)
```

#### 1.3.1 `src/app/env.js`

```js
/**
 * Build-free environment flags for the app/ui layer.
 * Core's freeze.js exports its own DEV=true (iter-004). This module is the app-side switch;
 * UI uses APP_DEV to decide whether to devFreeze snapshots before rendering.
 * @type {boolean}
 */
export const APP_DEV = true;   // M0b: hardcoded true; later toggled via served env (e.g. ?prod or build var)
```
ROZHODNUTÍ NÁVRHU: app má vlastní `APP_DEV` (ne import core `DEV`) – core `DEV` řídí core invarianty, `APP_DEV` řídí UI freeze náklad. Oddělené, aby šly nezávisle vypnout. V M0b obě `true`.

#### 1.3.2 `src/app/loop.js` – rAF smyčka

```js
/**
 * @typedef {import('../core/state/types.js').GameState} GameState
 * @typedef {import('../core/state/types.js').TickContext} TickContext
 * @typedef {import('../core/engine/clock.js').Accumulator} Accumulator
 */

/**
 * @typedef {Object} GameLoop
 * @property {() => void} start   - begin rAF scheduling
 * @property {() => void} stop    - cancel rAF (pauses real-time stepping; engine speed unaffected)
 * @property {boolean} running
 */

/**
 * Creates a requestAnimationFrame loop driving core advance().
 * The loop reads the wall-clock via the injected nowFn (performance.now in browser),
 * so core stays time-source-free.
 * @param {Object} deps
 * @param {GameState} deps.state
 * @param {TickContext} deps.ctx
 * @param {Accumulator} deps.acc
 * @param {() => number} deps.nowFn            - injected clock (performance.now); test injects fake
 * @param {(raf: FrameRequestCallback) => number} deps.raf   - requestAnimationFrame (injected)
 * @param {(id: number) => void} deps.cancelRaf                - cancelAnimationFrame (injected)
 * @param {() => void} deps.onDirty            - called once per frame when stepsRun>0 (triggers render)
 * @returns {GameLoop}
 */
export function createGameLoop(deps) { … }
```

Algoritmus `start`/frame callback (pseudo):
```
frame():
  nowMs = deps.nowFn()
  { dirty } = advance(deps.acc, deps.state, deps.ctx, nowMs)   // core public API
  if (dirty) deps.onDirty()
  if (loop.running) rafId = deps.raf(frame)

start(): if running return; running=true; deps.acc.lastTimeMs = deps.nowFn(); rafId = deps.raf(frame)
stop():  running=false; deps.cancelRaf(rafId)
```

ROZHODNUTÍ NÁVRHU – **dependency injection `nowFn`/`raf`/`cancelRaf`**: loop nesahá přímo na `performance`/`requestAnimationFrame` globály; dostává je v `deps`. `app/main.js` je předá reálné (`() => performance.now()`, `requestAnimationFrame.bind(window)`), test předá fake (řízený čas + ruční tick). Tím je smyčka **testovatelná v Node bez DOM** (čistá orchestrace). `stop()` jen zastaví rAF (přestane plynout reálný čas); pauza herní rychlosti je oddělená – přes `dispatch(setSpeed, 0)`, který nuluje akumulátor v `advance` (iter-004). Obojí lze kombinovat (rAF běží i při pauze, jen `advance` vrací 0 kroků – levné).

Alternativa (zamítnutá): `setInterval` smyčka. rAF je standard pro browser frame pacing, automaticky throttluje na pozadí (a po `visibilitychange→visible` akumulátor dožene zameškaný čas, §4.1) – přesně mechanismus z architektury. `setInterval` na pozadí throttluje hůř a tříští čas.

#### 1.3.3 `src/app/lifecycle.js` – autosave hook (placeholder)

```js
/**
 * Wires visibilitychange→hidden and pagehide to an autosave callback (§6.2 trigger 2).
 * In M0b the callback is provided by app/main (calls save layer T3); here it's a thin hook.
 * @param {Object} deps
 * @param {EventTarget} deps.target          - document (injected; test injects fake EventTarget)
 * @param {Window} [deps.win]                - window for pagehide (injected)
 * @param {() => (void | Promise<void>)} deps.onHide   - autosave callback
 * @returns {() => void}  detach function (removes listeners)
 */
export function attachLifecycle(deps) { … }
```

Algoritmus:
```
visHandler = () => { if (deps.target.visibilityState === 'hidden') deps.onHide() }
pageHideHandler = () => deps.onHide()
deps.target.addEventListener('visibilitychange', visHandler)
deps.win?.addEventListener('pagehide', pageHideHandler)
return detach()  // removes both
```
ROZHODNUTÍ NÁVRHU: M0b autosave je **synchronní best-effort** – `onHide` zavolá `saveGame(...)` (T3) a nečeká na promise (`pagehide` nedá čas await). IndexedDB zápis spuštěný před `pagehide` většinou doběhne; spolehlivost řeší periodický autosave (mimo M0b scope – jen hook existuje). `onHide` musí být **idempotentní a rychlý** (jen serializace + `put`). Injekce `target`/`win` → testovatelné fake EventTargetem.

#### 1.3.4 `src/app/main.js` – entrypoint (glue, jediné místo střetu vrstev)

Signatura: `export async function boot()` + auto-spuštění na konci (`boot()`), s try/catch → error screen (§5).

Algoritmus `boot()` (pseudo – pořadí):
```
1. requestPersistentStorage()                                  // T5 §5.1 (best-effort, neblokuje)
2. await registerServiceWorker()                               // sw-register.js (best-effort; fail → jen warn)
3. try:
     const loaded = await loadGame(SLOT_ID)                    // T3 §4.3; null pokud žádný save
     const state = loaded?.state ?? bootstrapNewState(DEFAULT_SEED)
   catch (e):
     showErrorScreen('save', e); return                        // §5 fail savu
4. const { ctx, creg } = bootstrapEngine(state)                // registry+periodics+commands (§0.1)
5. const acc = createAccumulator(performance.now(), state.engine.frameBudget)
6. mountUI(state, creg, requestRender)                         // §1.4 (preact render)
7. const loop = createGameLoop({ state, ctx, acc, nowFn:()=>performance.now(), raf:..., cancelRaf:..., onDirty: requestRender })
8. attachLifecycle({ target: document, win: window, onHide: () => saveGame(SLOT_ID, state) })
9. loop.start()
```

Pomocné (v `main.js` nebo `src/app/bootstrap.js`):
- `bootstrapNewState(seed)`: `createInitialState({ seed }); initRng(state); return state`.
- `bootstrapEngine(state)`: `registry=createRegistry(); periodics=registerCorePeriodics(registry); creg=createCommandRegistry(); registerSetSpeed(creg); return { ctx:{registry,periodics}, creg }`.
- `requestRender`: dirty-flag + `requestAnimationFrame`-coalesced render (max ~10–15×/s, §3.4) – viz §1.4.

ROZHODNUTÍ NÁVRHU: `bootstrapEngine` se volá **i po loadu** (registry/periodics/commands nejsou součást save – idempotentní registrace, §4.2 architektury). Save nese jen `GameState`; engine ctx se rekonstruuje při startu. To je v souladu s tím, že `registerCorePeriodics`/`registerSetSpeed` jsou čisté registrace.

#### 1.3.5 `src/app/sw-register.js`

```js
/**
 * Registers the service worker if supported. Best-effort: failure only warns (offline still works once cached).
 * @returns {Promise<void>}
 */
export async function registerServiceWorker() { … }
```
Algoritmus: `if (!('serviceWorker' in navigator)) return;` `try { await navigator.serviceWorker.register('service-worker.js', { scope: './' }); } catch { /* warn */ }`. (SW soubor v rootu – viz §2.)

### 1.4 Minimální UI (`src/ui/`) – čas, sezóna, pauza/1×/2× přes commands

**Soubory:**
```
/src/ui/App.js            # kořenová komponenta (html`` z vendor/preact.standalone.js)
/src/ui/selectors.js      # čisté selektory ze snapshotu (selectClock, selectSeason, selectSpeed)
/src/ui/render.js         # mount + dirty-coalesced render (drží preact render + requestRender)
/src/ui/styles.css        # minimální styl (přesun z legacy, ořezaný)
```

#### 1.4.1 `src/ui/selectors.js` (čisté, testovatelné v Node bez DOM)

```js
/** @typedef {import('../core/state/types.js').GameState} GameState */

/** @param {GameState} s @returns {{ curStep:number, day:number, dayInSeason:number, year:number }} */
export function selectClock(s) {
  return { curStep: s.engine.curStep, day: s.season.curDay, dayInSeason: s.season.dayInSeason, year: s.season.curYear };
}

/** @param {GameState} s @returns {{ season:number, name:string }} */
export function selectSeason(s) {
  const NAMES = ['Jaro', 'Léto', 'Podzim', 'Zima'];   // matches curSeason 0..3 (types.d.ts)
  return { season: s.season.curSeason, name: NAMES[s.season.curSeason] ?? '?' };
}

/** @param {GameState} s @returns {0|1|2} */
export function selectSpeed(s) { return s.engine.speed; }
```
ROZHODNUTÍ NÁVRHU: selektory jsou čisté funkce nad snapshotem (žádný DOM) → unit-testovatelné. Názvy sezón v UI (lokalizace), ne v core. Pořadí sezón odpovídá `SeasonState.curSeason` komentáři v `types.d.ts` (0=spring…3=winter).

#### 1.4.2 `src/ui/App.js` – komponenta

```js
import { html, useState } from '../vendor/preact.standalone.js';
import { selectClock, selectSeason, selectSpeed } from './selectors.js';

/**
 * Root UI: time/season readout + speed controls (pause / 1× / 2×).
 * Reads a read-only snapshot; mutates ONLY via the injected dispatch (command/intent API §3.3).
 * @param {Object} props
 * @param {import('../core/state/types.js').GameState} props.snapshot   - read-only (devFrozen in DEV)
 * @param {(type:string, params?:object) => {ok:boolean,error?:string}} props.send  - bound dispatch
 */
export function App({ snapshot, send }) { … }
```

Render (pseudo, htm):
```
const clock = selectClock(snapshot); const season = selectSeason(snapshot); const speed = selectSpeed(snapshot);
return html`
  <div class="hud">
    <div class="clock">Rok ${clock.year} · den ${clock.day} (${season.name}, den v sezóně ${clock.dayInSeason}) · krok ${clock.curStep}</div>
    <div class="speed">
      <button class=${speed===0?'on':''} onClick=${() => send('setSpeed', { speed: 0 })}>⏸</button>
      <button class=${speed===1?'on':''} onClick=${() => send('setSpeed', { speed: 1 })}>1×</button>
      <button class=${speed===2?'on':''} onClick=${() => send('setSpeed', { speed: 2 })}>2×</button>
    </div>
  </div>`;
```

ROZHODNUTÍ NÁVRHU: **UI nikdy nemutuje stav** (§3.3) – tlačítka volají `send('setSpeed', {speed})` = tenký wrapper `(type, params) => dispatch(creg, state, { type, params })`. `setSpeed` je jediný command z iter-004; UI je „projekce + intenty". Žádný lokální mutovaný herní stav v komponentě.

#### 1.4.3 `src/ui/render.js` – mount + dirty-coalesced render

```js
import { render } from '../vendor/preact.standalone.js';
import { devFreeze } from '../core/state/freeze.js';
import { APP_DEV } from '../app/env.js';
import { App } from './App.js';

/**
 * Mounts the UI and returns a requestRender() that coalesces re-renders to one per frame.
 * @param {Object} deps
 * @param {import('../core/state/types.js').GameState} deps.state
 * @param {(type:string, params?:object) => {ok:boolean,error?:string}} deps.send
 * @param {HTMLElement} deps.root            - #app element
 * @param {(cb:FrameRequestCallback)=>number} deps.raf
 * @returns {{ requestRender: () => void }}
 */
export function mountUI(deps) { … }
```

Algoritmus:
```
let scheduled = false
function doRender():
  scheduled = false
  const snapshot = APP_DEV ? devFreeze(deps.state) : deps.state   // dev freeze at core→UI boundary (§3.2)
  render(html`<${App} snapshot=${snapshot} send=${deps.send} />`, deps.root)
function requestRender():
  if (scheduled) return
  scheduled = true
  deps.raf(doRender)
doRender()                 // initial paint
return { requestRender }
```
ROZHODNUTÍ NÁVRHU: render je **coalesced** přes rAF + `scheduled` flag → max 1 render/frame i když `onDirty` přijde po každé dávce kroků (cíl ≤10–15 re-renderů/s, §3.4). `devFreeze` se volá **na hranici core→UI** (ne v hot-path kroku) – zachytí náhodné mutace v UI. Pozn.: `devFreeze` zmrazí `state` in-place; protože další `advance()` musí stav **mutovat**, freeze v dev znamená, že snapshot a živý stav jsou týž objekt → **v M0b se freeze aplikuje jen pro render čtení, ale `advance` mutuje zmrazený objekt → throw**. **OŠETŘENÍ (ROZHODNUTÍ NÁVRHU)**: v M0b nech `APP_DEV` render používat `devFreeze` POUZE pokud se renderuje **mělká kopie** read-cesty, NEBO – jednodušší a zvolené – **v M0b render NEfreezuje živý state, ale `APP_DEV` zapne freeze až v M2** (kdy bude snapshot oddělený). Pro M0b: `const snapshot = deps.state;` a `devFreeze` ponech importovaný-ale-nevolaný s `// ENABLE @ M2 (needs decoupled snapshot)` komentářem. Tím se vyhneme „freeze živého stavu pak advance throw" pasti. (Toto je jediná netriviální past T1 – explicitně vyřešena.)

### 1.5 Jak to ověří test (T1 acceptance)

- **selektory** (`test/ui-selectors.test.js`, Node): `createInitialState()` → `selectClock` vrací den 1/rok 1; po N `step()` volání `curStep` roste; `selectSeason(curSeason=1).name==='Léto'`.
- **loop** (`test/app-loop.test.js`, Node, fake `nowFn`/`raf`): vytvoř loop s fake clockem; ručně „odtikej" rAF callbacky s posunem `nowMs` o 100 ms při speed=1 → `state.engine.curStep` vzrostl o 2 (přes core `advance`); `onDirty` zavolán 1× s `stepsRun>0`; `stop()` zastaví další ticky.
- **lifecycle** (`test/app-lifecycle.test.js`, Node, fake EventTarget): dispatch fake `visibilitychange` s `visibilityState:'hidden'` → `onHide` zavolán; `pagehide` → `onHide` zavolán; `detach()` → další event už `onHide` nevolá.
- **commands z UI**: `send('setSpeed',{speed:2})` přes reálný `dispatch(creg,state,...)` → `{ok:true}`, `state.engine.speed===2`; `{speed:5}` → `{ok:false}`.
- **vendor smoke**: `import('../src/vendor/preact.standalone.js')` v Node neselže na syntaxi (modul se naparsuje); `html` je funkce. (Reálný render je browser/tester smoke.)
- **grep gate beze změny**: `npm run lint:core` stále OK – žádný app/ui/save import se nedostal do `src/core/`.

---

## 2. T2 – manifest + service worker (cache-first, verzovaný precache) + `tools/gen-precache.mjs` (komplexita M)

### 2.1 `manifest.webmanifest` (přepis legacy)

Legacy manifest je z velké části vyhovující; **uprav**: `start_url` na `./index.html`, ponech `display:standalone`, `theme/background #0f1f17`, ikona `icons/icon.svg`. Description aktualizuj na rebuild. (Pole zůstávají; žádné build-time generování.)

### 2.2 `tools/gen-precache.mjs` – generátor precache manifestu (Node, bez závislostí)

```js
/**
 * Generates the versioned precache manifest consumed by the service worker.
 * Walks the repo for the static asset allowlist (app shell + core + vendor + ui + data + icons),
 * computes a content hash → cache version, writes src/precache.js (committed output).
 * Run manually after asset changes:  node tools/gen-precache.mjs
 * Zero dependencies (node:fs, node:crypto, node:path only).
 */
```

Algoritmus (pseudo):
```
ROOTS = ['index.html', 'manifest.webmanifest', 'icons/', 'src/app/', 'src/ui/', 'src/vendor/', 'src/core/', 'src/data/']
EXCLUDE = [ /\.test\.js$/, /\.gitkeep$/, /\.d\.ts$/, /\.md$/ ]   // tests/types/docs NEpatří do runtime precache
files = []
for root in ROOTS:
  if isDir(root): walk recursively, push every file not matching EXCLUDE (as './'+relPath)
  else: push './'+root
files.sort()                                  // deterministické pořadí
hash = sha256( concat( for f in files: f + ':' + size(f) + ':' + mtime?  ) )   // viz rozhodnutí níže
version = 'prosperity-' + hash.slice(0,12)
write 'src/precache.js':
  // AUTO-GENERATED by tools/gen-precache.mjs — DO NOT EDIT
  export const PRECACHE_VERSION = '<version>';
  export const PRECACHE_URLS = [ ...files ];
print 'precache: <N> files, version <version>'
```

ROZHODNUTÍ NÁVRHU – **hash ze obsahu, ne z mtime** (determinismus, prostředí bez persistentního storage): verze = `sha256` přes **konkatenaci `relPath + obsah souboru`** všech precachovaných souborů (ne mtime – mtime není reprodukovatelný napříč checkouty). Tím je `src/precache.js` reprodukovatelný (stejný strom → stejná verze) a CI může ověřit „precache je aktuální" (regenerate → diff prázdný). `mtime` v pseudo výše **NEPOUŽÍVAT** – nahraď obsahem.

ROZHODNUTÍ NÁVRHU – **výstup jako ESM modul `src/precache.js`** (commitnutý): SW jej importuje (`import { PRECACHE_VERSION, PRECACHE_URLS } from './src/precache.js'` – viz §2.3). Modul (ne JSON) → SW ho načte přes ESM import bez fetch. Výstup je commitnutý artefakt (§2.1 stack: „jediný generovaný soubor = precache manifest, commitnutý").

### 2.3 `service-worker.js` (přepis legacy – cache-first, verzovaný precache)

Přepiš root `service-worker.js`. ESM service worker importující precache manifest:

```js
/**
 * Hand-written service worker (§2.1). Cache-first, versioned precache list.
 * Version + URL list come from the generated src/precache.js (run tools/gen-precache.mjs to refresh).
 */
import { PRECACHE_VERSION, PRECACHE_URLS } from './src/precache.js';
```

Registrace musí být jako module SW: `navigator.serviceWorker.register('service-worker.js', { type: 'module' })` v `sw-register.js` (§1.3.5) – **doplň `type:'module'`** kvůli ESM importu v SW.

Algoritmus (pseudo – tři lifecycle handlery):
```
install:  event.waitUntil( caches.open(PRECACHE_VERSION).then(c => c.addAll(PRECACHE_URLS)) ); self.skipWaiting()
activate: event.waitUntil( caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== PRECACHE_VERSION).map(k => caches.delete(k)))
          ) ); self.clients.claim()
fetch:    if req.method !== 'GET' return
          event.respondWith(
            caches.match(event.request).then(hit =>
              hit ?? fetch(event.request).then(resp => {
                       const copy = resp.clone()
                       caches.open(PRECACHE_VERSION).then(c => c.put(event.request, copy))
                       return resp
                     }).catch(() => caches.match('./index.html'))   // offline nav fallback
            )
          )
```

ROZHODNUTÍ NÁVRHU – **cache-first** (§2.1): precachované soubory se servírují z cache okamžitě (offline-first); změna verze (nový hash) → nový cache bucket v `install`, starý se smaže v `activate` (verzování). Network fallback při miss + offline nav fallback na `index.html`. ROZHODNUTÍ: `addAll` je atomické – pokud jeden soubor v precache listu chybí, install selže (fail-fast – odhalí nesoulad precache listu, líp než tichý částečný cache). Nav fallback `./index.html` zajistí, že deep-link route v PWA neselže offline.

Alternativa (zamítnutá): network-first / stale-while-revalidate. Pro plně offline PWA bez serveru v jádře (§1) je cache-first správný default (rychlost, offline jistota); aktualizace řeší verzovaný precache, ne revalidace.

### 2.4 Jak to ověří test (T2 acceptance)

- **gen-precache** (`test/gen-precache.test.js`, Node): spusť `gen-precache` ve výchozím stromu → `src/precache.js` obsahuje `index.html`, `manifest.webmanifest`, `src/core/engine/index.js`, `src/vendor/preact.standalone.js`, `src/app/main.js`; **neobsahuje** `*.test.js`, `*.d.ts`, `.gitkeep`, `*.md`. Dvojí spuštění → identický `PRECACHE_VERSION` (determinismus z obsahu).
- **precache freshness (CI-friendly)**: regeneruj do temp a porovnej s commitnutým `src/precache.js` – musí být shodné (test selže, když někdo zapomněl regenerovat). ROZHODNUTÍ: tento test je „warn/soft" v M0b (Sonnet ho zařadí, ale tester rozhodne, zda je blokující) – aby se předešlo flaky CI při legitimní změně. Doporučení: nech ho jako tvrdý test, regenerace je `node tools/gen-precache.mjs`.
- **SW logika**: SW běh nelze plně v Node (Cache API chybí) → testuj **čistou část**: import `src/precache.js` v Node, ověř `PRECACHE_VERSION` (string, prefix `prosperity-`) a `PRECACHE_URLS` (pole, neprázdné, samé `./`-relativní řetězce, žádné duplikáty). Plný install/offline = tester PWA smoke (T-003, §11 N-03).

---

## 3. T3 – IndexedDB save minimal (`src/save/`) (komplexita L)

Realizuje §6.1 (IndexedDB, rotující generace), §6.2 (autosave trigger – hook v T1), §6.5 (plain payload bez komprese). M0b ukládá **celý `GameState`** přes `assertSerializable` (deklarativní persist schémata per doména jsou M2 – §6.3; zde allowlist = celý serializovatelný stav).

### 3.1 Soubory

```
/src/save/idb.js          # tenký promise wrapper nad IndexedDB (~100 ř., §2.1)
/src/save/saveStore.js    # doménová save logika: saveGame / loadGame / rotace generací / fallback
/src/save/schema.js       # DB jméno, verze, store názvy, konstanty (SLOT_ID, N generací)
```

### 3.2 `src/save/schema.js` – konstanty a tvary

```js
/** IndexedDB database name */
export const DB_NAME = 'prosperity';
/** DB schema version (bump → onupgradeneeded migration) */
export const DB_VERSION = 1;
/** Object store: slot metadata (pointer to active generation) */
export const STORE_SLOTS = 'slots';
/** Object store: save records (one per slot×generation) */
export const STORE_SAVES = 'saves';
/** Single slot id for M0b (multi-slot is later) */
export const SLOT_ID = 'main';
/** Rotating generations kept per slot (§6.1) */
export const GENERATIONS = 3;
/** Save envelope version (bump for migrations §6.4 – M2) */
export const SAVE_VERSION = 1;
```

Datové tvary (záznamy v store):
```
SlotRecord  = { slotId: string, activeGen: number, updatedAt: number }
             // keyPath: 'slotId';  activeGen = generace s posledním validním savem
SaveRecord  = { key: string, slotId: string, generation: number,
                savedAt: number,            // Date.now() wall-clock (z app/, ne z core)
                lastSimTimestamp: number,   // wall-clock posledního simulačního kroku (§6.2 bod 4)
                saveVersion: number,        // SAVE_VERSION (envelope, pro migrace)
                gameVersion: string,        // state.meta.gameVersion
                payload: GameState }        // celý serializovatelný stav (M0b allowlist = vše)
             // keyPath: 'key';  key = `${slotId}:${generation}`
```

ROZHODNUTÍ NÁVRHU – **`key = slotId:generation`** jako keyPath store `saves`: generace rotuje 0..N-1 (modulo), takže klíč je stabilní a `put` přepisuje nejstarší generaci → není potřeba `delete` (rotace = overwrite). `SlotRecord.activeGen` ukazuje na poslední validní. `savedAt`/`lastSimTimestamp` dodává **app/** (wall-clock), ne core (core nesmí `Date.now`). ROZHODNUTÍ: `lastSimTimestamp` v M0b = `Date.now()` v okamžiku savu (catch-up mechanismus je M2; M0b ho jen ukládá pro budoucí použití, §6.2/§6.4 bod 7).

### 3.3 `src/save/idb.js` – promise wrapper

```js
/**
 * Opens (and upgrades) the IndexedDB database.
 * @param {string} name
 * @param {number} version
 * @param {(db: IDBDatabase, oldVersion: number) => void} onUpgrade  - create/upgrade stores
 * @returns {Promise<IDBDatabase>}
 */
export function openDB(name, version, onUpgrade) { … }

/**
 * Runs a transaction over stores, awaiting completion. Resolves with the callback's return value.
 * @template T
 * @param {IDBDatabase} db
 * @param {string|string[]} stores
 * @param {IDBTransactionMode} mode               - 'readonly' | 'readwrite'
 * @param {(tx: IDBTransaction) => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export function tx(db, stores, mode, fn) { … }

/** Promisifies an IDBRequest. @template T @param {IDBRequest<T>} req @returns {Promise<T>} */
export function req(req) { … }

/** get by key. @param {IDBObjectStore} store @param {IDBValidKey} key @returns {Promise<any>} */
export function get(store, key) { … }
/** put a record. @param {IDBObjectStore} store @param {any} value @returns {Promise<IDBValidKey>} */
export function put(store, value) { … }
/** getAll records. @param {IDBObjectStore} store @returns {Promise<any[]>} */
export function getAll(store) { … }
```

Algoritmus klíčových wrapperů (pseudo):
```
req(idbRequest): new Promise((res,rej) => { idbRequest.onsuccess=()=>res(idbRequest.result); idbRequest.onerror=()=>rej(idbRequest.error) })
openDB(name,ver,onUpgrade):
  new Promise((res,rej) => {
    const r = indexedDB.open(name, ver)
    r.onupgradeneeded = (e) => onUpgrade(r.result, e.oldVersion)
    r.onsuccess = () => res(r.result)
    r.onerror  = () => rej(r.error)
  })
tx(db, stores, mode, fn):
  new Promise(async (res,rej) => {
    const t = db.transaction(stores, mode)
    let out; t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error)
    out = await fn(t)        // fn uses t.objectStore(name) + req(...)
  })
```
`onUpgrade` (volaný z `openDB` při `DB_VERSION`):
```
if (!db.objectStoreNames.contains(STORE_SLOTS)) db.createObjectStore(STORE_SLOTS, { keyPath: 'slotId' })
if (!db.objectStoreNames.contains(STORE_SAVES)) db.createObjectStore(STORE_SAVES, { keyPath: 'key' })
```
ROZHODNUTÍ NÁVRHU: zero-dependency wrapper (žádný `idb` npm balík – §2.1). `req()` promisifikuje `IDBRequest`; `tx()` resolvuje na `oncomplete` (ne jen na request success) → záruka, že zápis je flushnut před resolve (§6.1 „fsync transakce"). 

### 3.4 `src/save/saveStore.js` – save/load/rotace/fallback

```js
/**
 * @typedef {import('../core/state/types.js').GameState} GameState
 * @typedef {import('./schema.js')} Schema
 */

/**
 * Persists the full game state to the next rotating generation, then advances the slot pointer.
 * Validates serializability via core assertSerializable before writing (fail-fast on non-serializable state).
 * @param {GameState} state
 * @param {Object} [opts]
 * @param {string} [opts.slotId=SLOT_ID]
 * @param {number} [opts.now]               - wall-clock (Date.now()) injected from app/; defaults to Date.now()
 * @returns {Promise<{ generation:number, savedAt:number }>}
 */
export async function saveGame(state, opts = {}) { … }

/**
 * Loads the active generation for a slot. On corrupt/failed load, falls back to the previous generation(s).
 * Returns null if no valid save exists.
 * @param {string} [slotId=SLOT_ID]
 * @returns {Promise<{ state: GameState, record: SaveRecord } | null>}
 */
export async function loadGame(slotId = SLOT_ID) { … }
```

Algoritmus `saveGame` (pseudo):
```
assertSerializable(state)                                  // core public API – fail-fast (no functions/cycles)
db = await openDB(DB_NAME, DB_VERSION, onUpgrade)
slot = await get(slots, slotId) ?? { slotId, activeGen: -1, updatedAt: 0 }
nextGen = (slot.activeGen + 1) % GENERATIONS              // rotace 0..N-1
now = opts.now ?? Date.now()
record = { key: `${slotId}:${nextGen}`, slotId, generation: nextGen,
           savedAt: now, lastSimTimestamp: now, saveVersion: SAVE_VERSION,
           gameVersion: state.meta.gameVersion,
           payload: structuredClone(state) }              // snapshot kopie (oddělí od živého stavu)
await tx(db, [STORE_SAVES, STORE_SLOTS], 'readwrite', t => {
   put(t.objectStore(STORE_SAVES), record)
   put(t.objectStore(STORE_SLOTS), { slotId, activeGen: nextGen, updatedAt: now })  // přepnutí ukazatele AŽ po zápisu savu (atomické v 1 tx)
})
return { generation: nextGen, savedAt: now }
```

Algoritmus `loadGame` (pseudo – fallback na předchozí generace, §6.1/§6.4 bod 1):
```
db = await openDB(...)
slot = await get(slots, slotId)
if (!slot || slot.activeGen < 0) return null
// zkus aktivní generaci, pak sestupně předchozí (rotující, modulo)
order = [slot.activeGen, (slot.activeGen-1+GEN)%GEN, (slot.activeGen-2+GEN)%GEN]   // N=3 kandidátů
for gen in order:
   rec = await get(saves, `${slotId}:${gen}`)
   if (!rec) continue
   try:
     validateEnvelope(rec)            // saveVersion ok? payload je objekt? meta/engine/season přítomné?
     return { state: rec.payload, record: rec }
   catch: continue                    // poškozená generace → další (B4: nikdy tichý půl-stav)
return null                           // všechny generace selhaly → nová hra (app rozhodne)
```

`validateEnvelope(rec)` (pseudo – minimální invarianty, §6.4 bod 6):
```
assert rec.saveVersion === SAVE_VERSION                       // M0b: žádné migrace; nesoulad = nepoužitelné (M2 přidá migrations)
assert rec.payload && typeof rec.payload === 'object'
assert rec.payload.meta && rec.payload.engine && rec.payload.season && rec.payload.rng
assert Number.isFinite(rec.payload.engine.curStep)
assert rec.payload.rng.streams && typeof rec.payload.rng.streams === 'object'
// jinak throw → fallback na předchozí generaci
```

ROZHODNUTÍ NÁVRHU:
- **`structuredClone(state)` do payloadu** – odpojí save snapshot od živého stavu (následný `advance` nesmí mutovat uložený payload). `assertSerializable` před tím garantuje, že clone projde (žádné funkce).
- **Ukazatel `activeGen` se přepíná ve stejné transakci jako zápis savu** → kill uprostřed nikdy nezkoruptuje poslední validní (§6.1): buď proběhne celá tx (nový save + nový pointer), nebo nic (pointer ukazuje na starou validní generaci).
- **Fallback načítá až N kandidátů** (aktivní + 2 předchozí pro N=3) sestupně; první validní vyhraje. Poškozený payload (exception při validaci) → další generace; když všechny selžou → `null` (app spustí novou hru, §5 / §1.3.4 krok 3). Žádná `fixNaNs` sanitizace (§6.4: invarianty jsou asserty, ne tichá oprava).
- **M0b bez migrací**: `saveVersion` nesoulad = nepoužitelná generace (M2 přidá `migrations[]`, §6.4 bod 2). Pro M0b je to korektní (čerstvý projekt, jediná verze).

### 3.5 Jak to ověří test (T3 acceptance)

ROZHODNUTÍ NÁVRHU – **test přes fake-indexedDB**: IndexedDB není v Node nativně. Pro testy save vrstvy použij `fake-indexeddb` jako **dev-only** závislost (`devDependencies`, instalovaná jen pro `npm ci`/test, ne runtime – analogicky `typescript`, §2.2). Test nainjektuje globální `indexedDB`/`IDBKeyRange` z `fake-indexeddb/auto`. Alternativa (zamítnutá): ručně mockovat celé IndexedDB API v testu – křehké a duplikuje `fake-indexeddb`; dev-only balík je v souladu s „dev/CI toolchain" výjimkou §2.2.

- **round-trip**: `state = bootstrapNewState(seed); advance N kroků; await saveGame(state); const loaded = await loadGame()` → `hashState(loaded.state) === hashState(state)` (determinismus + serializovatelnost celého enginu přes save).
- **rotace generací**: 5× `saveGame` → v `saves` jsou jen 3 záznamy (gen 0,1,2 přepisované), `slot.activeGen` cykluje `0→1→2→0→1`; `loadGame` vrací nejnovější.
- **fallback**: ulož 2 generace; ručně „poškoď" aktivní (přepiš `payload` na `{}` přes přímý `put`) → `loadGame` přeskočí poškozenou a vrátí předchozí validní generaci.
- **prázdný stav**: `loadGame` bez jakéhokoli savu → `null`.
- **assertSerializable guard**: `saveGame` se stavem obsahujícím funkci (uměle vložená) → reject/throw (fail-fast), nic se nezapíše.
- **lastSimTimestamp/savedAt**: po `saveGame({now: 1234})` má záznam `lastSimTimestamp===1234` (injektovaný wall-clock).

---

## 4. T4 – syntetický benchmark ceny kroku (`tools/bench-step.mjs`) + report (komplexita M)

Realizuje §14 doporučení 1 („M0 začít benchmarkem kroku") + §9.2a/D10a (potvrzení/eskalace technického stropu capu 8 h **až po benchmarku**) + D13 (main thread vs Worker). Q2/A2: benchmark **syntetický v Node**; reálné zařízení potvrdí uživatel později – report to uvede explicitně.

### 4.1 `tools/bench-step.mjs` – měřicí skript (Node, zero-dependency)

```js
/**
 * Synthetic step-cost benchmark (§14.1 / §9.2a). Measures ns/step for the empty-tick + scheduler core,
 * over X thousand steps, using the real engine bootstrap (no DOM). Node-only (Q2/A2).
 *   node tools/bench-step.mjs [--steps=2000000] [--warmup=200000] [--json]
 * Prints a human report (or JSON with --json) used to confirm/escalate the 8h cap (S-02/D10a) and D13.
 */
```

Algoritmus (pseudo):
```
parse args: STEPS (default 2_000_000), WARMUP (default 200_000), jsonMode
// 1. bootstrap reálného core (stejná sekvence jako app §0.1)
state = createInitialState({ seed: 0x12345 }); initRng(state)
registry = createRegistry(); periodics = registerCorePeriodics(registry)
ctx = { registry, periodics }
// 2. warmup (JIT)
for i in 0..WARMUP: step(state, ctx)
// 3. měření – process.hrtime.bigint() kolem dávky step()  (Node, mimo core → povoleno)
t0 = process.hrtime.bigint()
for i in 0..STEPS: step(state, ctx)
t1 = process.hrtime.bigint()
totalNs = Number(t1 - t0)
nsPerStep = totalNs / STEPS
// 4. odvozené veličiny pro cap rozhodnutí
CAP_HOURS = 8
stepsFor8h = CAP_HOURS*3600 / 0.05          // = 576_000  (§9.2a aritmetika)
catchUpMs8h = (nsPerStep * stepsFor8h) / 1e6
// 5. report
emitReport({ nsPerStep, stepsPerSec: 1e9/nsPerStep, stepsFor8h, catchUpMs8h, env })
```

ROZHODNUTÍ NÁVRHU:
- **měří reálný `step()` z core** (ne mock) – „prázdný tick + scheduler" znamená iter-004 core (calendar + scheduleDue (prázdný heap) + 9 no-op periodik + devInvariants). To je legitimní dolní mez ceny kroku M0 (systémy přidá M2+, §14 doporučení 1: „dřív než se zapustí systémy").
- **`process.hrtime.bigint()`** pro měření (Node-only, mimo core – grep gate se netýká `tools/`). Warmup kvůli JIT (V8). Default 2 M kroků (~3,5× cap 576 k) → stabilní průměr.
- **volitelná varianta scheduleru pod zátěží** (ROZHODNUTÍ NÁVRHU, doporučené): druhý běh, kde se před měřením naplánuje ~1000 budoucích eventů s `noop` handlerem a periodicky se doplňují → změří cenu kroku s neprázdným heapem (realističtější horní odhad). Report uvede oba (prázdný heap = dolní mez, naplněný = horní). Pokud Sonnet času nestihne, stačí prázdný heap + poznámka.

### 4.2 Formát reportu (`docs/benchmark_iter-005.md` – commitnutý artefakt)

Benchmark **zapíše report** do `docs/benchmark_iter-005.md` (Markdown) – vstup pro reviewer gate (§11 M0 DoD). Struktura:

```
# Benchmark ceny kroku – iter-005 (M0b)
- Datum, Node verze, OS/CPU (z process.* / os.*), commit (volitelně)
- METODIKA: SYNTETICKÝ (Node), prázdný tick + scheduler core (iter-004), X kroků, warmup Y.
  ⚠ A2: NENÍ reálné cílové zařízení (low-end mobil). Reálné potvrzení = uživatel/tester později.
- VÝSLEDKY:
  | varianta            | ns/krok | kroků/s   | catch-up 8h (576k kroků) |
  | empty heap          | …       | …         | … ms                     |
  | loaded heap (~1k)   | …       | …         | … ms                     |
- VYHODNOCENÍ CAPU (S-02/D10a):
  - Technický strop 8 h = 576 000 kroků. Při změřené ceně catch-up trvá ~<catchUpMs> ms.
  - ZÁVĚR: [POTVRDIT cap 8h] pokud catchUpMs8h pohodlně < ~pár sekund a cíl ~0,01 ms/krok (10 000 ns) splněn;
           [ESKALOVAT] pokud ns/krok výrazně přes cíl → doporuč D13 (Worker) nebo snížení capu (balance konstanta).
- DOPORUČENÍ D13 (main thread vs Worker): main thread OK pokud catch-up dávka < ~1 s na cílovém HW;
  jinak eskalační cesta Worker (§4.6). M0b syntetický běh dává PŘEDBĚŽNÉ doporučení – závazné až po reálném zařízení.
- PRAHY (explicitní, aby reviewer rozhodl bez interpretace):
  - cíl: ≤ 10 000 ns/krok (0,01 ms, T-002a B5)  → catch-up 8h ≈ ≤ 5,76 s
  - varování: 10 000–50 000 ns/krok → cap 8h dává 5,76–28,8 s; zvážit nižší cap nebo Worker
  - eskalace: > 50 000 ns/krok → 8h catch-up > ~29 s na referenčním HW → D13 Worker NEBO snížit cap
```

ROZHODNUTÍ NÁVRHU – **explicitní prahy v reportu**: report nesmí jen vypsat čísla; musí dát reviewerovi **rozhodovací pravidlo** (potvrdit/varovat/eskalovat) navázané na §9.2a a cíl ~0,01 ms/krok (T-002a B5). Reviewer (T-004, právo re-run) na základě toho potvrdí cap 8 h NEBO eskaluje (Worker/cap) – nikdy „pokračuj paušálně" (§14 doporučení 1, S-02). Syntetické číslo je **dolní/řádový odhad**; report **explicitně** uvádí, že závazné potvrzení vyžaduje reálné zařízení (A2) – to je carry-over pro pozdější ověření uživatelem.

### 4.3 Jak to ověří test (T4 acceptance)

- **bench běh** (`test/bench-step.test.js`, Node): import `runBench({ steps: 50_000, warmup: 5_000 })` (refaktoruj měřicí jádro `bench-step.mjs` na exportovanou funkci `runBench(opts)` + tenký CLI wrapper) → vrací `{ nsPerStep, stepsPerSec, stepsFor8h, catchUpMs8h }`; `nsPerStep > 0`, `stepsFor8h === 576000`, `catchUpMs8h === nsPerStep*576000/1e6` (konzistence aritmetiky).
- **report generování**: `runBench` umí vrátit i markdown string (`formatReport(result)`) – test ověří, že obsahuje sekce METODIKA, VÝSLEDKY, VYHODNOCENÍ CAPU a slovo „SYNTETICKÝ"/„A2" (povinné upozornění).
- **determinismus core během benchmarku**: po `runBench` je stav konzistentní (`Number.isFinite(state.engine.curStep)`); benchmark nemění chování core (jen ho spouští).

ROZHODNUTÍ NÁVRHU: měřicí jádro vyčlenit do `runBench(opts)` (exportované) – CLI `bench-step.mjs` jen parsuje args, volá `runBench`, tiskne `formatReport`/JSON a zapisuje `docs/benchmark_iter-005.md`. Tím je benchmark unit-testovatelný (malý `steps` v testu) i spustitelný jako tool.

---

## 5. T5 – `navigator.storage.persist()` + chybová obrazovka loaderu (komplexita S)

Realizuje §6.1 (`navigator.storage.persist()` proti evikci, R-F) + §5.1 (fail loader = obrazovka chyby, ne tichý nedoběh).

### 5.1 Persist (v `src/app/`)

```js
/**
 * Requests persistent storage to reduce eviction risk (esp. iOS, R-F §12). Best-effort.
 * @returns {Promise<boolean>}  granted?  (false on unsupported / denied – never throws)
 */
export async function requestPersistentStorage() { … }
```
Algoritmus: `if (!navigator.storage?.persist) return false; try { return await navigator.storage.persist(); } catch { return false; }`. Volá se v `boot()` krok 1 (§1.3.4) – **neblokuje** start (best-effort). Umisti do `src/app/persist.js` nebo `main.js`.

### 5.2 Chybová obrazovka loaderu (`src/ui/ErrorScreen.js`)

```js
import { html, render } from '../vendor/preact.standalone.js';

/**
 * Renders a blocking error screen into #app when boot fails (save load failure, catalog load failure §5.1).
 * No silent half-load (§6.4 B4): user sees the failure and a retry/new-game action.
 * @param {HTMLElement} root            - #app
 * @param {Object} info
 * @param {'save'|'catalog'|'boot'} info.kind
 * @param {string} info.message         - human message (cs)
 * @param {Error} [info.error]          - dev detail (shown only in APP_DEV)
 * @param {() => void} [info.onRetry]   - retry action (reload / new game)
 * @returns {void}
 */
export function showErrorScreen(root, info) { … }
```

Render (pseudo):
```
render(html`
  <div class="error-screen" role="alert">
    <h1>Nepodařilo se spustit hru</h1>
    <p>${info.message}</p>
    ${APP_DEV && info.error ? html`<pre class="error-detail">${String(info.error?.stack ?? info.error)}</pre>` : null}
    <div class="error-actions">
      <button onClick=${() => location.reload()}>Zkusit znovu</button>
      ${info.kind === 'save' ? html`<button onClick=${info.onNewGame}>Nová hra</button>` : null}
    </div>
  </div>`, root)
```

ROZHODNUTÍ NÁVRHU – **error screen kategorie**:
- `kind:'save'` – `loadGame` vyhodil a všechny generace selhaly způsobem, který nelze tiše obejít (např. IndexedDB nepřístupný). Nabídne „Nová hra" (`bootstrapNewState`) + „Zkusit znovu". (Pozn.: poškozená *jednotlivá* generace se řeší fallbackem v `loadGame` (§3.4) tiše; error screen je až když **selže i fallback / IndexedDB samo**.)
- `kind:'catalog'` – připraveno pro M1 (fail validace katalogů, §5.1); v M0b ještě žádné katalogy → kategorie existuje jako slot, nevolá se.
- `kind:'boot'` – jakákoli neočekávaná chyba v `boot()` (catch-all v `main.js`).

`boot()` obalí kroky 3–9 v `try/catch`; při chybě zavolá `showErrorScreen(root, { kind, message, error, onRetry, onNewGame })` a `return` (nespustí loop). Tím je splněno §6.4 B4 „nikdy tiše pokračuj s půlkou stavu".

### 5.3 Jak to ověří test (T5 acceptance)

- **persist** (`test/app-persist.test.js`, Node, fake `navigator.storage`): `navigator.storage.persist` vrací `true` → `requestPersistentStorage()===true`; chybějící API → `false`; throw uvnitř → `false` (nikdy nehází).
- **error screen** (logika, ne DOM render): vyčleň `buildErrorModel(info)` (čistá funkce → `{ title, message, showDetail, actions:[...] }`) a testuj ji: `kind:'save'` → akce obsahují „Nová hra"; `APP_DEV=false` → `showDetail===false`. (Plný render = tester smoke.)
- **boot fail path**: zmockuj `loadGame` aby hodil → `boot()` zavolá `showErrorScreen` s `kind:'save'` a loop se nespustí (`loop.start` nezavolán). Ověř přes injektované spy.

---

## 6. CI workflow `.github/workflows/ci.yml` (carry-over SUGGESTION-1 z iter-004)

Vytvoř `.github/workflows/ci.yml` spouštějící `npm run ci` (= `typecheck && lint:core && test`, ověřeno v `package.json`).

```yaml
name: ci
on:
  push:
    branches: [ "**" ]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run ci
```

ROZHODNUTÍ NÁVRHU:
- **`npm ci`** (ne `npm install`) – reprodukovatelná instalace dev závislostí (`typescript`, nově `fake-indexeddb`) z `package-lock.json`. CI gate `tsc --checkJs` je **DoD M0** (§11/R-I) – tento workflow ho vynucuje na každý push/PR.
- **Node 22** (shoda s lokálním Node 22.22, runtime cíl).
- **`fake-indexeddb`** přidat do `devDependencies` v `package.json` (a `package-lock.json` regenerovat) – jinak `test/*save*` v CI selže. To je jediná nová dev závislost iter-005 (v souladu s §2.2 „dev-only, bez transitivního runtime dopadu").
- Workflow **neprovádí build** (zero-build) – jen typecheck + grep gate + testy. Žádný deploy krok (deploy = statické soubory z gitu).

---

## 7. Změny `tsconfig.json` (DOM lib pro nové vrstvy)

iter-004 `tsconfig` má `lib: ["ES2022"]` **bez DOM** (dvojitá pojistka pro core). iter-005 vrstvy `app/`/`ui/`/`save/` používají DOM/IndexedDB API → typecheck je potřebuje. ROZHODNUTÍ NÁVRHU (řeší napětí „core bez DOM" vs „app s DOM"):

**Zvolená varianta – jeden tsconfig s DOM lib + grep gate drží core čistý.** Přidej do `tsconfig.json` `compilerOptions.lib`: `["ES2022", "DOM", "DOM.Iterable", "WebWorker"]` (`WebWorker` kvůli SW `self`/Cache API). `include` rozšiř o `src/app/**`, `src/ui/**`, `src/save/**`, `src/vendor/**.js`, `service-worker.js`, `tools/**.mjs`. 

> **Důsledek (uveď v commitu/poznámce reviewerovi)**: rozšířením `lib` o DOM **přestane** typecheck samostatně chytat `document`/`window` v core. **Čistotu core nadále garantuje grep gate** (`tools/check-core-imports.mjs`, iter-004) – ten je primární mechanická pojistka (R-I). tsc DOM-lib past tím slábne, ale grep gate ji plně nahrazuje a je explicitní. (Plyne z toho, že app/ui/save reálně DOM potřebují a zero-build nemá per-složku build krok.)

**Alternativa (zamítnutá): dva tsconfigy** (`tsconfig.core.json` lib bez DOM + `tsconfig.app.json` lib s DOM) a `npm run typecheck` spouští oba. Plus: zachová tsc-pojistku core bez DOM (trojitá pojistka). Mínus: dvě konfigurace, dvojí `tsc` běh, složitější `include`/`exclude` (core musí být vyloučen z app configu a naopak), vyšší údržba pro M0b. **Zamítnuto pro M0b** kvůli jednoduchosti (preferuj jednoduchost, AGENTS Extra Rules); grep gate je dostatečná pojistka. Pokud reviewer/challenger trvá na zachování tsc core-bez-DOM pojistky, dvojitý tsconfig je připravená eskalační cesta (čistě konfigurační, bez dopadu na kód).

> Pozn.: `vendor/*.module.js` mohou mít typové šumy (minifikované buildy). Doporučení: přidat je do `include` jen pokud projdou; jinak je z typecheck `exclude` a spolehnout se na to, že vendor je hotový upstream kód (`skipLibCheck` už je zapnutý). ROZHODNUTÍ: **vendor vyloučit z typecheck** (`exclude: ["src/vendor/**"]`) – je to cizí hotový kód, ne náš; testovat ho typově nemá hodnotu a minifikace by házela false-positive. Glue `preact.standalone.js` (náš kód) **ponechat** v typecheck.

---

## 8. Odstranění legacy placeholderu (click-game)

Legacy M0a placeholder není napojený na engine core a iter-005 ho nahrazuje. **Odstranit / přepsat:**

| Soubor | Akce | Náhrada |
|---|---|---|
| `index.html` | **přepsat** (§1.2) | nový shell (mount + loader + app/main.js) |
| `manifest.webmanifest` | **upravit** (§2.1) | start_url/description |
| `service-worker.js` | **přepsat** (§2.3) | ESM SW + precache import |
| `src/js/main.js`, `game.js`, `state.js`, `storage.js`, `ui.js` | **smazat** | nahrazeno `src/app/*` + `src/ui/*` + `src/save/*` |
| `src/css/style.css` | **smazat** | nahrazeno `src/ui/styles.css` (ořezaný styl) |

ROZHODNUTÍ NÁVRHU: legacy `src/js/*` a `src/css/` se **smažou** (ne ponechají), aby v repu nebyla mrtvá dvojí pravda (reviewer nález). `gen-precache.mjs` (§2.2) je proto **nesmí** zahrnout do `ROOTS` (chodí jen `src/app/`, `src/ui/`, `src/vendor/`, `src/core/`, `src/data/`, ne `src/js/`/`src/css/`). Pokud Sonnet narazí na referenci na legacy soubor jinde, nahradí ji novou cestou.

---

## 9. Souhrn souborů a pořadí implementace pro Sonnet

| # | Soubor | Task | Závisí na |
|---|---|---|---|
| 1 | `src/vendor/{preact.module,hooks.module,htm.module}.js` + `preact.standalone.js` + `VENDOR.md` | T1 | – (kopie upstream) |
| 2 | `src/app/env.js` | T1 | – |
| 3 | `src/save/schema.js` | T3 | – |
| 4 | `src/save/idb.js` | T3 | schema |
| 5 | `src/save/saveStore.js` | T3 | idb, schema, core `assertSerializable`/`hashState` |
| 6 | `src/ui/selectors.js` | T1 | core types |
| 7 | `src/ui/App.js` | T1 | vendor, selectors |
| 8 | `src/ui/ErrorScreen.js` | T5 | vendor, env |
| 9 | `src/ui/render.js` | T1 | vendor, App, env, core freeze |
| 10 | `src/ui/styles.css` | T1 | – |
| 11 | `src/app/loop.js` | T1 | core `advance` |
| 12 | `src/app/lifecycle.js` | T1 | – |
| 13 | `src/app/persist.js` (nebo v main) | T5 | – |
| 14 | `src/app/sw-register.js` | T1/T2 | – |
| 15 | `src/app/main.js` (boot glue) | T1/T5 | vše app/ui/save + core bootstrap |
| 16 | `index.html` (přepis) | T1 | app/main.js |
| 17 | `tools/gen-precache.mjs` → `src/precache.js` | T2 | (po vytvoření app/ui/vendor) |
| 18 | `service-worker.js` (přepis) | T2 | src/precache.js |
| 19 | `manifest.webmanifest` (úprava) | T2 | – |
| 20 | `tools/bench-step.mjs` (+ `runBench`/`formatReport`) → `docs/benchmark_iter-005.md` | T4 | core bootstrap |
| 21 | `.github/workflows/ci.yml` | CI | package.json |
| 22 | `package.json` + `package-lock.json` (přidat `fake-indexeddb` devDep) | T3/CI | – |
| 23 | `tsconfig.json` (DOM lib + include, vendor exclude) | T1–T5 | – |
| 24 | smazání `src/js/*`, `src/css/style.css` | T1 | po náhradě |
| 25 | testy `test/*.test.js` (selektory, loop, lifecycle, save, gen-precache, bench, persist, error) | všechny | příslušné moduly |

**Pořadí**: vendor → save vrstva → ui selektory/komponenty → app loop/lifecycle/main → index.html → precache+SW → bench → CI/tsconfig → smazání legacy → testy. (Bench je nezávislý na UI – lze paralelně.)

**Cyklická pozn.**: `app/main` importuje vše; `ui/render` importuje `app/env`; `app/loop` importuje jen core – žádné cykly (app→ui jednosměrně, app→core, ui→core, save→core). SW je samostatný (importuje jen `src/precache.js`).

---

## 10. Shrnutí ROZHODNUTÍ NÁVRHU + alternativy

Žádné nové architektonické rozhodnutí (scope: realizace §2.1/§5.1/§6/§9.2/§14). Tam, kde architektura/brief nechávaly volnost, jsem zvolil a zdůvodnil:

1. **Vendor glue modul `preact.standalone.js`** – jediný import point pro UI; izoluje vendor cesty/verze. (Alt: import-map – zamítnuto kvůli precache/cache-bustingu.) §1.1
2. **DI `nowFn`/`raf`/`cancelRaf` do loop** – smyčka testovatelná v Node bez DOM; core dál bez časového zdroje. (Alt: přímé globály – netestovatelné.) §1.3.2
3. **rAF smyčka** (ne `setInterval`) – frame pacing + background throttling = mechanismus z §4.1. §1.3.2
4. **M0b render NEfreezuje živý stav** (`devFreeze` zapnut až M2 s odděleným snapshotem) – vyhne se „freeze pak advance throw" pasti. §1.4.3
5. **Precache verze z obsahu souborů (sha256), výstup jako ESM `src/precache.js`** – reprodukovatelné, SW importuje bez fetch, CI ověří freshness. (Alt: mtime/JSON – nereprodukovatelné/horší DX.) §2.2
6. **Cache-first SW + atomický `addAll` + nav fallback** – offline-first PWA. (Alt: network-first – zamítnuto pro plně offline.) §2.3
7. **Save = celý `GameState` přes `assertSerializable` + `structuredClone`**; persist schémata per doména odloženy na M2 (§6.3). §3.4
8. **Rotace generací overwrite (key=`slot:gen`, gen modulo N), pointer přepnut ve stejné tx** – kill-safe (§6.1). §3.4
9. **Fallback načítá až N generací sestupně, validateEnvelope = asserty (žádný fixNaNs)** – §6.4 B4. §3.4
10. **`fake-indexeddb` dev-only** pro testy save vrstvy. (Alt: ruční mock – křehké.) §3.5
11. **Benchmark měří reálný core `step()`, `hrtime.bigint()`, warmup, prahy v reportu** – syntetický (A2), report dá reviewerovi rozhodovací pravidlo (potvrdit/eskalovat cap), explicitně označí „není reálné zařízení". §4
12. **Jeden tsconfig s DOM lib; čistotu core drží grep gate** (ne tsc lib). (Alt: dva tsconfigy – připravená eskalace, zamítnuto pro jednoduchost M0b.) §7
13. **Legacy `src/js/*`+`src/css/` smazat** (ne ponechat) – žádná dvojí pravda. §8

Tyto volby drží invarianty M0/M0b: core zůstává bez DOM (grep gate prochází), UI mutuje stav jen přes commands (§3.3), save je serializovatelný a kill-safe (§6.1), benchmark předchází potvrzení capu (§14 doporučení 1/S-02), PWA je offline-first (§2.1). DoD M0 (§11): funkční CI gate, benchmark změřen před potvrzením capu, PWA install+offline smoke (tester T-003), save round-trip + determinismus po loadu.

---
*Konec návrhu iter-005 (M0b). Zdroj pravdy pro §/K/D/R položky: `architecture_proposal_iter-002_T-001.md`; reálné core API: `src/core/*` (iter-004). Implementace = Sonnet, T-002.*
