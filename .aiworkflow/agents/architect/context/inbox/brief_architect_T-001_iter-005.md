# Brief
- **Brief ID**: BRIEF-015
- **Iteration**: iter-005 (M0b)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní implementační spec (pro Sonnet) pro všechny tasky iter-005 (M0b): PWA shell, manifest+SW+precache generátor, IndexedDB save minimal, syntetický benchmark, storage.persist + error screen. Napojení na existující engine core z iter-004.
## Context
- iter-004 dodal headless engine core (src/core/*). Teď M0b přidává UI/PWA vrstvu (src/app, src/ui) a save (src/save) NAD core – core zůstává bez DOM.
- Q2 rozhodnuto: benchmark SYNTETICKY (Node + dostupný prohlížeč); reálné zařízení potvrdí uživatel později – report to uvede explicitně (A2).
## Scope IN (navrhni všechny)
- T1 PWA shell: index.html + src/app/ bootstrap (rAF smyčka volající engine advance s nowMs, visibilitychange/pagehide → autosave hook placeholder), vendorovaný preact+htm (do src/vendor/, zero-build ESM), minimální UI (čas, sezóna, pauza/1×/2× přes commands dispatch).
- T2 manifest.webmanifest + ručně psaný service worker (cache-first, verzovaný precache list) + tools/gen-precache.mjs (generuje precache manifest, výstup commitnutý).
- T3 IndexedDB save minimal (§6.1): promise wrapper, stores slots/saves, 1 slot + rotující generace N=3, lastSimTimestamp, load fallback na předchozí generaci. Persist = serializovatelný GameState (využij assertSerializable).
- T4 benchmark ceny kroku (§14.1): prázdný tick + scheduler, X tisíc kroků, měření ns/krok; report → potvrzení/eskalace technického stropu capu 8h (S-02/D10a) + doporučení D13 (main thread vs Worker). Syntetický (Node) + volitelně browser perf.
- T5 navigator.storage.persist() při startu + chybová obrazovka loaderu (fail katalogů/savu §5.1).
- Plus: .github/workflows/ci.yml spouštějící `npm run ci` (carry-over SUGGESTION-1 z iter-004).
## Inputs (POVINNÉ)
- Architektura: architecture_proposal_iter-002_T-001.md (§2.1 stack/PWA, §6 save model, §14.1 benchmark, §5.1 fail)
- iter-004 návrh + kód: design_iter-004_T-001.md, src/core/*
- Master plán §3/iter-005; `agents/architect/AGENTS.md`
## Acceptance Criteria
- Spec pokrývá T1–T5 + CI workflow: soubory, signatury, datové tvary, SW cache strategii, IndexedDB schéma, benchmark metodiku + formát reportu.
- Core zůstává bez DOM; UI/save vrstvy importují core jen přes public API.
## Expected Outputs
- `agents/architect/artifacts/final/design_iter-005_T-001.md`
## Constraints
- Zero-build: preact+htm vendorované jako ESM, žádný bundler. SW a manifest ručně. Benchmark běží i v Node (bez DOM).
