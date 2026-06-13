# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-017
- **Iteration**: iter-005
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M0b (PWA+save+benchmark).

## Předpoklady
- Produkční kód implementován coderem T-002 (M0b: src/app/, src/ui/, src/save/, tools/, index.html, service-worker.js, manifest.webmanifest, src/precache.js).

## Blockery
–

## Checklist (z briefa)
- [x] `npm install && npm run ci` zelené (tsc, grep gate, node --test)
- [x] Save round-trip (deep equal stav po save→load přes hashState)
- [x] Rotace generací N=3 (0→1→2→0→1)
- [x] Fallback na předchozí generaci při poškození aktivní
- [x] Kill-safe pointer (atomická tx)
- [x] Determinismus po loadu (load+pokračování = stejný hash jako nepřerušená, G1)
- [x] PWA smoke: manifest validní JSON s povinnými poli
- [x] Precache list konzistentní s reálnými soubory
- [x] gen-precache deterministický (2× = stejný výstup)
- [x] Benchmark sanity (bench-step běží, ns/krok < 10000)
- [x] Edge testy doplněny (test/iter005-edge.test.js, 15 nových testů)
- [x] Negativní ověření: všechny 3 generace corrupt → null
- [x] Verdikt zapsán do artifacts/final/testreport_iter-005_T-003.md
