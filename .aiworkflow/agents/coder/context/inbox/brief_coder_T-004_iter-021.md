# Brief

- **Brief ID**: BRIEF-021-004
- **Iteration**: iter-021 (M9b)
- **Task**: T-004 = C-021-A (Mobile UX polish + PWA audit)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **C-021-A**: mobile UX polish (T1) + finální PWA audit fixes (T2). Vše UI/prezentační/infra vrstva — **determinismus NEDOTČEN** (`hashState` identický s iter-020). Design je source of truth. (NESPAWNUJ sub-agenty; udělej práci sám a řádně ji ukonči.)

## Source of truth
`agents/coder/context/refs/design_iter-021_T-001.md` — čti **T1 (mobile UX), T2 (PWA audit)**. **DR-021-01** (podmínky — zejm. MINOR-1 render test!). tom-proxy gate T-003 SCHVÁLENO.

## Scope IN

### T1 — Mobile UX polish
1. **Render throttle (KLÍČOVÝ — render.js dnes ~60/s porušuje §3.4)**: time-gate `RENDER_MIN_INTERVAL_MS=66` + **trailing render** (poslední stav se vždy nakonec vykreslí). Čistě v UI render loopu (`src/ui/render.js`/`src/app/loop.js`), čte `performance.now()` jen v UI, **NE v core/engine**. **MINOR-1**: test MUSÍ pokrýt živou dávku (2× rychlost + kroky), ne klid — jinak ≤15/s falešně PASS.
2. **Touch targets ≥44×44px**: CSS audit (`tools/audit-touch-targets.mjs` jako opakovatelný gate) + oprava poddimenzovaných tlačítek (`styles.css`).
3. **0 horizontal overflow @320/360/390px**: 12-tab hlavička scroll fix (`styles.css`/`App.js`); smoke ověří.
4. **iOS Safari**: `100dvh` (URL-bar bug), `env()` safe-area insety, `touch-action:manipulation`, apple-mobile-web-app meta (`index.html`/`styles.css`).

### T2 — PWA audit
1. **Evikce (R-F)**: `navigator.storage.persisted()/persist()` detekce + **export reminder** při `daysSinceLastExport>7` || ne-perzistentní. `lastExportAt` = **envelope sidecar** vedle `savedAt` (MIMO `payload` → MIMO hashState). Persist je `src/app/persist.js` (NIT: ne src/save/persist.js).
2. **SW update flow**: `service-worker.js` `skipWaiting()` (ř.11) → **message-driven skip-waiting** + UI prompt; `src/app/sw-register.js` poslouchá updatefound/waiting → prompt → `autosave.requestSave('hide')` (existuje, autosave.js:40-46) PŘED reloadem. Save (IndexedDB) přežije; cache verze se nemíchají.
3. **Offline edge**: cache-miss SPA fallback (ověř ✓), install iOS/Android meta/manifest.

## Scope OUT
- PROVENANCE/licence + README/docs = C-021-B (T-005). NEsahej src/data/_meta, PROVENANCE.md, README.
- **NEMĚŇ core/engine/herní stav.** Žádný Date.now/Math.random/DOM v core.
- **Precache: NEREGENERUJ** (orchestrátor regeneruje JEDNOU po T-004 i T-005, MINOR-2). *(Pokud změníš manifest soubory, jen je nech — regen řeší orchestrátor.)*

## Tvrdé invarianty (DR-021-01)
- **Determinismus G1**: `hashState` IDENTICKÝ s iter-020 (render throttle/sidecar mimo herní stav). Přidej/spusť G1 test (iter005-edge nebo determinismus sada) — musí projít beze změny.
- Render throttle čte čas jen v UI; engine nedotčen.
- SW update nesmí ztratit save.

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, typecheck) — uveď počet testů.
- `npm run smoke` OK (0 console errors, layout @320/360/390 bez overflow).
- Determinismus G1 nedotčen (hashState identický); M9a/M8/M7/M5/M6 nedotčené.
- Render ≤15/s test (živá dávka, MINOR-1); touch ≥44px audit; SW update save-safe.

## Inputs
- Design `context/refs/design_iter-021_T-001.md` (T1/T2), DR-021-01
- Kód: `src/ui/render.js`, `src/app/loop.js`, `src/ui/App.js`, `styles.css`, `index.html`, `service-worker.js`, `src/app/sw-register.js`, `src/app/persist.js`, `src/app/autosave.js`, `src/app/lifecycle.js`, `manifest.webmanifest`

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-021)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-021_T-004.md` (soubor:funkce, gate výstup, render throttle, SW update, determinismus G1)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git). NEREGENERUJ precache.
