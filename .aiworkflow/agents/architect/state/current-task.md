# Current Task

- **Task ID**: T-001 (iter-005)
- **Brief**: context/inbox/brief_architect_T-001_iter-005.md (BRIEF-015)
- **Iteration**: iter-005 (M0b)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – detailní implementační návrh (spec pro Sonnet codera, T-002) pro všech 5 tasků
iter-005 (M0b) + CI workflow. NE implementace – soubory, signatury (JSDoc), datové tvary,
algoritmy/pseudo, jak to ověří test. Výstup: `artifacts/final/design_iter-005_T-001.md`.

Pokrytí:
- T1: PWA shell – index.html (přepis legacy click-game), src/app/ bootstrap, rAF smyčka nad
  advance(), visibilitychange/pagehide autosave hook, vendorovaný preact+htm (src/vendor/),
  minimální UI (čas/sezóna/pauza/1×/2× přes commands dispatch), env.js DEV flag.
- T2: manifest.webmanifest (přepis), src/sw.js ručně psaný (cache-first, verzovaný precache),
  tools/gen-precache.mjs (generuje precache.js, výstup commitnutý), odstranění legacy SW.
- T3: src/save/ IndexedDB minimal – idb.js promise wrapper, saveStore.js (stores slots/saves,
  1 slot + N=3 rotující generace, lastSimTimestamp, load fallback na předchozí generaci),
  assertSerializable využití, persist allowlist celého GameState.
- T4: tools/bench-step.mjs syntetický benchmark (Node, prázdný tick+scheduler, X tisíc kroků,
  ns/krok) + report → potvrzení/eskalace technického stropu capu 8h (S-02/D10a) + D13 doporučení.
- T5: storage.persist() při startu (app/) + chybová obrazovka loaderu (fail katalogů/savu §5.1).
- CI: .github/workflows/ci.yml (npm ci + npm run ci).

## Dílčí checklist
- [x] T-001: Detailní návrh všech 5 tasků iter-005 (M0b) + CI workflow.

### Pracovní rozpad (interní)
- [x] Přečteno: AGENTS.md, brief BRIEF-015, architektura §2.1/§5.1/§6/§14.1 + §9.2/§11,
      design iter-004, reálný core src/core/* (public API, state, commands, registry, clock)
- [x] Zjištěno: src/js/* + index.html + manifest + service-worker.js jsou LEGACY placeholder
      (click-game), nenapojené na core → spec instruuje přepis/odstranění
- [x] T1–T5 spec + CI (soubory, signatury JSDoc, datové tvary, algoritmy, testy)
- [x] Souhrn souborů + pořadí implementace + ROZHODNUTÍ NÁVRHU + alternativy
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí; volnost vyplněna značeno „ROZHODNUTÍ NÁVRHU":
  vendor preact+htm ESM bez buildu, IndexedDB wrapper bez závislostí, benchmark synteticky
  v Node (Q2/A2), precache manifest jako commitnutý ESM modul, save = celý GameState přes
  assertSerializable (M0b nemá ještě persist schémata per doména – ta jsou M2).
- Implementaci provede Sonnet v T-002.

## Blockery
–
