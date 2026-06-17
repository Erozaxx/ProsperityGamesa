# Impl Summary — iter-021 T-004 (C-021-A: Mobile UX + PWA audit) — DOKONČENÍ

- **Task**: T-004 (iter-021 M9b), C-021-A
- **Agent**: coder (Sonnet)
- **Datum**: 2026-06-17
- **Status**: done
- **Brief**: BRIEF-021-004b (re-dispatch — dokončení po uříznutí předchozího běhu)

## Gate výsledek
- `npm run ci` — **ZELENÉ, 1566/1566 pass** (0 fail). Zahrnuje `typecheck` (tsc --noEmit, čistý) + `lint:core` (core import gate OK, 66 souborů — žádný Date.now/Math.random/DOM v core) + `test`. Start byl 1550 → **+16 nových testů**.
- `npm run smoke` — **OK**: app rendered, 0 console/page errors, **0 horizontal overflow @320/360/390px napříč 12 taby**.
- **Determinismus G1 — NEDOTČEN**: žádná změna v `src/core/**`, `src/data/**`, `balance.js` (`git status` potvrzuje). hashState je strukturálně identický s iter-020. 60 hashState/determinismus testů (edge/save-store/m9a-regression) zelených.
- **precache.js NEREGENEROVÁN**: side-effect z `test/gen-precache.test.js` vrácen do commitnutého stavu (`git checkout`). Orchestrátor regeneruje JEDNOU po T-004+T-005 (MINOR-2).

## Změněné / nové soubory (soubor : funkce)

### T1 — Mobile UX
- `test/render-throttle.test.js` (NOVÝ) — render throttle TEST (MINOR-1):
  - `makeFakeEnv()` — fake clock + rAF/timeout fronty, DOM-free (injektuje now/raf/setTimeoutFn/clearTimeoutFn/renderFn do `mountUI`).
  - 3 testy: ≤15 paintů/s při živé 60fps dirty dávce (1s simulace); trailing render po dávce; coalescing burst → 1 paint. Žádný prohlížeč, deterministické.
- `src/ui/styles.css`:
  - global `button { min-block-size:44px; touch-action:manipulation; -webkit-tap-highlight-color:transparent }` — touch ≥44px + iOS tap delay/double-tap zoom.
  - `#app` — `min-height:100vh; min-height:100dvh` (iOS URL-bar bug) + `padding: max(1rem, env(safe-area-inset-*))` (notch/dynamic island) + `overflow-x:hidden; max-width:100%`.
  - `html,body { overflow-x:hidden }` (UX-2 rubber-band fix).
  - `.tabs` — single-row horizontální scroller (`overflow-x:auto; flex-wrap:nowrap; scroll-snap-type:x`) místo 3-řádkového wrapu; `.tab-btn { min-block-size:44px }`.
  - `.speed button { min-inline-size:44px }`, `.save-actions button`, `.banner` styly.
- `index.html` — apple-mobile-web-app meta: `apple-mobile-web-app-capable`, `-status-bar-style=black-translucent`, `-title`, `mobile-web-app-capable` (iOS/Android standalone bez chrome).
- `tools/audit-touch-targets.mjs` (NOVÝ) — opakovatelný statický CSS gate. Parsuje deklarace, flagne interaktivní selektory (`button`/`[role=tab]`/`.tab-btn`) bez ≥44px min-height/padding; restyle-only rules (color/hover) přeskočí; uznává global button base. **PASS** (0 nálezů). Exit≠0 při nálezu (CI/tester gate).
- `tools/smoke.mjs` — rozšířen: po renderu projde 12 tabů × 3 šířky (320/360/390), assertuje `scrollWidth - clientWidth <= 1`.

### T2 — PWA audit
- `src/app/persist.js`:
  - `requestPersistentStorage()` (beze změny), `isStoragePersisted()` (NOVÉ — `navigator.storage.persisted()`, best-effort).
  - `getLastExportAt()/setLastExportAt()` — **sidecar** `lastExportAt` v localStorage (klíč `prosperity.lastExportAt`), MIMO save payload → MIMO persist schema → MIMO hashState. Injektovatelný `store` pro testy.
  - `evaluateExportReminder({persisted, lastExportAt, now, reminderDays=7})` — čistá funkce: `show=true` při `!persisted` (reason `not-persisted`) || nikdy-exportováno (`never`) || `daysSinceLastExport > 7` (`stale`).
- `service-worker.js` — `install` už **nevolá** `skipWaiting()` automaticky (nová verze čeká v `waiting`); přidán `message` listener → `skipWaiting()` jen na `{type:'SKIP_WAITING'}`. `activate`/`fetch` (SPA fallback) nedotčeny.
- `src/app/sw-register.js` (PŘEPSÁN):
  - `wireUpdateFlow(deps)` — čistá injektovatelná logika: detekce waiting workeru (updatefound→statechange installed && controller) → `onUpdateReady(accept)`; `accept()` = `flushSave()` (autosave.requestSave('hide'))→ až po settle `waiting.postMessage(SKIP_WAITING)`; `controllerchange` → **jednorázový** reload (loop guard). Fresh install (bez controllera) NEpromptuje.
  - `registerServiceWorker({onUpdateReady, flushSave})` — registruje + zapojí update flow.
- `src/ui/App.js` — 2 dismissable bannery (props `updateReady`/`onApplyUpdate`, `exportReminder`/`onDismissExportReminder`): "Nová verze připravena — Aktualizovat" a "Zálohuj svůj postup — Exportovat teď".
- `src/app/main.js` — wiring:
  - SW registrace přesunuta ZA `bootSequence` (aby `flushSave`/`onUpdateReady` z bootu byly k dispozici → save flush PŘED reloadem, invariant 3).
  - `onExport` nyní volá `setLastExportAt(now())` + zhasne reminder.
  - boot-time `evaluateExportReminder` (injektované `getPersisted`/`getLastExportAt`, `Date.now()` jen v app vrstvě) → banner.
  - `onUpdateReady`/`flushSave` (=`autosave.flush()`) vraceny z `bootSequence`.
- `test/app-persist.test.js` — +9 testů (sidecar round-trip, corrupt tolerance, 4× reminder logika, konfigurovatelný práh).
- `test/sw-update-flow.test.js` (NOVÝ) — 6 testů (no waiting→no prompt, waiting→prompt, flushSave PŘED postMessage + jednorázový reload, updatefound→installed→prompt, fresh install→no prompt).

## Klíčové invarianty (ověřeno)
- **Render throttle čte čas jen v UI** (`render.js`, `performance.now`); core/clock.js nedotčen. Test ≤15/s při živé dávce.
- **`lastExportAt` MIMO hashState** — localStorage sidecar, nikdy v persist payloadu.
- **SW update save-safe** — `autosave.requestSave('hide')`/`flush()` PŘED reloadem; save v IndexedDB (mimo caches); test ověřuje pořadí flush→postMessage.
- **Determinismus G1 identický** — 0 změn v core/data/balance.
- **M9a/M8/M7/M5/M6 nedotčené** — plné CI zelené.

## Předpoklady / nejistoty
- Reálné iOS/Android install + safe-area na notchi ověří uživatel na zařízení (smoke/grep pokrývá přítomnost meta/CSS, ne pixel-rendering) — Q2 syntetická náhrada dle designu §8.
- Render throttle = 15 fps (UI konstanta `RENDER_MIN_INTERVAL_MS=66`); lze zvýšit bez dopadu na determinismus, pokud by progress bary působily trhaně.
- precache regenerace = orchestrátor (MINOR-2), ne tady.
