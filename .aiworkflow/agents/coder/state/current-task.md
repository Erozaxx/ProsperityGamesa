# Current Task
- **Task ID**: T-004 (iter-021 M9b — C-021-A Mobile UX + PWA audit)
- **Iteration**: iter-021
- **Status**: done
- **Done**: 2026-06-17
- **Gate**: CI 1566/1566 pass (0 fail, typecheck + lint:core OK), smoke OK (0 console errors, 0 horizontal overflow @320/360/390 napříč 12 taby). Determinismus G1 nedotčen (žádná změna v src/core/**, src/data/**, balance — hashState strukturálně identický s iter-020; 60 hashState/determinismus testů zelených). Render throttle hotový (WIP 601cc59) + nově ověřen testem ≤15/s při živé dávce. precache.js NEREGENEROVÁN (vrácen do commitnutého stavu — orchestrátor regeneruje JEDNOU po T-004+T-005).

## Dílčí checklist
- [x] T1.1 Render throttle TEST (MINOR-1): test/render-throttle.test.js — ≤15/s při živé 60fps dávce + trailing render + coalescing (injektovatelné now/raf/setTimeoutFn/renderFn)
- [x] T1.2 Touch ≥44×44px: tools/audit-touch-targets.mjs gate (PASS) + styles.css (global button min-block-size:44px, touch-action:manipulation, .tab-btn/.speed/.save-actions)
- [x] T1.3 0 horizontal overflow @320/360/390: .tabs single-row horizontal scroller + overflow-x:hidden; smoke rozšířen (overflow check napříč 12 taby × 3 šířky)
- [x] T1.4 iOS Safari: 100dvh + env() safe-area insety (styles.css), apple-mobile-web-app meta (index.html)
- [x] T2.1 Evikce (R-F): isStoragePersisted() + evaluateExportReminder() + lastExportAt sidecar (localStorage, MIMO hashState) v persist.js; banner v App.js; wiring v main.js
- [x] T2.2 SW update: service-worker.js message-driven skip-waiting (skipWaiting() jen na SKIP_WAITING); sw-register.js wireUpdateFlow (updatefound→prompt→flushSave PŘED reloadem, controllerchange jednorázový reload); banner v App.js
- [x] T2.3 Offline edge: cache-miss SPA fallback ověřen (nedotčen); apple/mobile meta + manifest
- [x] Gate: npm run ci zelené (1566), npm run smoke OK, determinismus G1 nedotčen
