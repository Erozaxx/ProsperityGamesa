# Current Task

- **Task ID**: T-001 (iter-021) — DESIGN M9b (Release kandidát: mobile UX polish, finální PWA audit, licence/PROVENANCE metodika, release docs; poslední milník = DoD M9 = release)
- **Brief**: context/inbox/brief_architect_T-001_iter-021.md (BRIEF-021-001)
- **Předchozí**: iter-020 T-001 (M9a) — done
- **Iteration**: iter-021 (M9b — Release kandidát; uzavírá R-F evikce, R-G licence; DoD M9 = release)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Checklist (z briefu)
- [x] T1 Mobile UX: touch ≥44px (statický audit), 0 horizontal overflow @360px (smoke), render ≤15/s (Node test — DOPLNIT throttle do render.js, dnes ~60/s), iOS Safari (dvh, env safe-area, touch-action, apple meta)
- [x] T2 PWA audit: evikce R-F (export prompt po `daysSinceLastExport`>7 + persisted()===false; metadata MIMO hashState), SW update flow (message-driven skip-waiting + prompt + autosave před reload), offline edge (install iOS/Android, cache miss fallback, precache úplnost)
- [x] T3 Licence/PROVENANCE (R-G): klasifikace fakta(NE)/texty+jména+grafika(ANO), metodika evidence + audit-provenance.mjs verbatim sken, PROVENANCE.md §1–6 struktura, DOPORUČENÍ MIT (alt GPL/proprietární) → user gate; ŽÁDNÝ LICENSE soubor před rozhodnutím
- [x] T4 Release docs: README přepis (ne starý tap-to-earn skelet), known issues (gap-report 36 + TXAUDIT/G-WORLD-*/G-AIBATTLE-DEDUP/G-MILITARY-STATS/V1/V2/MIN-1), export/import návod
- [x] Split coder tasků (C-021-A T1+T2 UX/PWA / C-021-B T3+T4 licence/docs — disjunktní, paralelní); DR-021-01 impl poznámky; min 1 alternativa (SW update strategie, licence typ, install ikona, throttle umístění)

## Výstup
**`artifacts/final/design_iter-021_T-001.md`** — T1 měřitelné UX/perf cíle, T2 PWA audit checklist, T3 PROVENANCE metodika + licence doporučení (user gate), T4 release docs osnova, split, DR-021-01.

## Klíčová rozhodnutí
- **Vše MIMO determinismus**: žádná změna `src/core/**`, herních dat, balance.js, RNG. UI/PWA v `src/ui`, `src/app`, SW, CSS, docs. Důkaz: `hashState` identický s iter-020 (test loop ověří G1).
- **Render throttle (UX-3) = jediná logická změna, 100% UI**: dnes `render.js` renderuje ~60/s (1× per rAF); přidat time-gate `RENDER_MIN_INTERVAL_MS=66` (~15 fps) + trailing render. Konstanta UI, NE balance.js. `clock.js`/core beze změny.
- **SW update**: přechod z auto `skipWaiting()` na **message-driven skip-waiting + UI prompt** (DR-021-01 §1); autosave('hide') před reload → save (IndexedDB) přežije. Alt: ponechat auto (zamítnuto, míchání cache verzí) / čistý waiting bez promptu.
- **R-F export prompt**: `lastExportAt` sidecar MIMO hashState; výzva při `persisted()===false` || `daysSinceLastExport>7`. Dismissable (idle žánr).
- **Licence = ARCHITEKTURA NEROZHODUJE**: doporučení MIT+disclaimer (alt GPL-3.0 / proprietární-nevydat); finální = **explicitní user gate (T-008)**, tom-proxy eskaluje, nerozhoduje. PROVENANCE.md §6 = PLACEHOLDER, žádný LICENSE soubor před rozhodnutím.
- **R-G klasifikace**: čísla/balanc/mechaniky = fakta (NEpodléhají); texty/jména/grafika/příběh = vlastní/parafráze (podléhají, M8 už ověřil verbatim=0). audit-provenance.mjs = opakovatelný gate.
- **Split**: C-021-A (T1+T2 UX/PWA, M) ∥ C-021-B (T3+T4 licence/docs, M) — disjunktní soubory, paralelní; oba → re-run gen-precache + commit precache.js před T-006.
