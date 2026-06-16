# Brief (RE-DISPATCH — dokončení T-004)

- **Brief ID**: BRIEF-021-004b
- **Iteration**: iter-021 (M9b)
- **Task**: T-004 = C-021-A (Mobile UX + PWA) — DOKONČENÍ (předchozí běh uříznut)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## ⚠️ Kontext re-dispatch
Předchozí běh T-004 byl **uříznut** (container reclaim) po dokončení jen render-throttle části. Hotovo a commitnuto jako WIP (`601cc59`):
- ✅ **HOTOVO (NEPŘEDĚLÁVEJ, jen ověř že drží)**: render-throttle — `RENDER_MIN_INTERVAL_MS=66` time-gate + trailing render (`src/ui/render.js`, UI-layer `performance.now`, core nedotčen) + `src/app/main.js` wiring (`now`/`setTimeoutFn`/`clearTimeoutFn` injekce). CI 1550/1550.
- ❌ **CHYBÍ (tvůj úkol — dokončit):**

## Scope IN (dokončení)

### T1 — Mobile UX (zbytek)
1. **Render throttle TEST (MINOR-1, KRITICKÉ)**: přidej test, že paint rate je ≤15/s při **živé dávce** (2× rychlost + reálné kroky, ne klid) — využij injektovatelné `now`/`renderFn`/`setTimeoutFn` v render.js (už existují). Bez tohoto je "≤15/s" neověřené.
2. **Touch targets ≥44×44px**: `tools/audit-touch-targets.mjs` (opakovatelný gate) + oprava poddimenzovaných tlačítek v `styles.css`.
3. **0 horizontal overflow @320/360/390px**: 12-tab hlavička scroll/wrap fix (`styles.css`/`src/ui/App.js`); smoke ověří.
4. **iOS Safari**: `100dvh` (URL-bar bug), `env()` safe-area insety, `touch-action:manipulation`, apple-mobile-web-app meta (`index.html`/`styles.css`).

### T2 — PWA audit (celé chybí)
1. **Evikce (R-F)**: `navigator.storage.persisted()/persist()` + **export reminder** při `daysSinceLastExport>7` || ne-perzistentní. `lastExportAt` = **envelope sidecar** vedle `savedAt` (MIMO `payload` → MIMO hashState). Persist = `src/app/persist.js`.
2. **SW update flow**: `service-worker.js` `skipWaiting()` (ř.11) → **message-driven skip-waiting** + UI prompt; `src/app/sw-register.js` poslouchá waiting → prompt → `autosave.requestSave('hide')` (existuje, autosave.js:40-46) PŘED reloadem. Save (IndexedDB) přežije; cache verze se nemíchají.
3. **Offline edge**: cache-miss SPA fallback (ověř ✓), install iOS/Android meta/manifest.

## Scope OUT
- PROVENANCE/licence + README/docs + src/data _meta = C-021-B (T-005). NEsahej.
- **NEMĚŇ core/engine/herní stav.** Žádný Date.now/Math.random/DOM v core.
- **NEREGENERUJ precache** (orchestrátor regeneruje JEDNOU po T-004+T-005, MINOR-2).
- NEPŘEDĚLÁVEJ render-throttle (hotový ve WIP 601cc59) — jen na něj navaž testem.

## Tvrdé invarianty (DR-021-01)
- **Determinismus G1**: `hashState` IDENTICKÝ s iter-020 (vše mimo herní stav). Spusť G1 test — musí projít.
- Render throttle čte čas jen v UI; engine nedotčen. SW update nesmí ztratit save.

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, typecheck) — uveď počet testů (start: 1550).
- `npm run smoke` OK (0 console errors, @320/360/390 bez overflow).
- Determinismus G1 nedotčen (hashState identický); M9a/M8/M7/M5/M6 nedotčené.
- Render ≤15/s test (živá dávka, MINOR-1); touch ≥44px audit; SW update save-safe; evikce reminder.

## Inputs
- Design `context/refs/design_iter-021_T-001.md` (T1/T2), DR-021-01
- WIP: render.js/main.js (601cc59 — render throttle hotový)
- Kód: `src/ui/render.js` (injektovatelné params), `src/ui/App.js`, `styles.css`, `index.html`, `service-worker.js`, `src/app/sw-register.js`, `src/app/persist.js`, `src/app/autosave.js`, `src/app/lifecycle.js`, `manifest.webmanifest`

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-021)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-021_T-004.md` (soubor:funkce, gate, render test, touch/overflow/iOS, SW update, evikce, determinismus G1)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git). NEREGENERUJ precache.
