# Current Task

- **Task ID**: T-006
- **Brief**: BRIEF-021-006
- **Iteration**: iter-021
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-17
- **Completed**: 2026-06-17

## Co teď dělám
Dokončeno. Nezávislá QA M9b (mobile UX + PWA audit + licence/PROVENANCE + release docs) + kompletní e2e release scénář.
Verdikt **GO** (DoD M9b = release kandidát) — 17/17 AC empiricky ověřeno vlastním během, 0 FAIL.
CI 1566/1566 pass / 0 fail; smoke OK (0 console err, 0 overflow @320/360/390 × 12 tabů).

## Předpoklady
- T-004 (C-021-A mobile UX + PWA) + T-005 (C-021-B licence/PROVENANCE + docs) implementoval coder (iter-021).
- Scope OUT: žádná změna produkčního kódu (dočasný e2e helper smazán; necommituji — orchestrátor).
- Licence = user gate T-008 (neřešeno, správně žádný LICENSE soubor). KNOWN_ISSUES gapy = NE bug.

## Blockery
–

## Checklist (z briefu BRIEF-021-006)
- [x] AC1: `npm run ci` zelené 1566/1566/0 fail (typecheck+lint:core OK); `npm run smoke` OK (0 console err, 0 overflow @320/360/390 × 12 tabů)
- [x] AC2: Determinismus G1 IDENTICKÝ s iter-020 — src/core diff PRÁZDNÝ; jediná src/data změna = contracts.json `_meta` only; golden-hash test (iter-020-baked, byte-unchanged) 17/17 PASS na HEAD; lint:core čistý
- [x] AC3: Render ≤15/s ŽIVÁ dávka (MINOR-1) — render-throttle 3/3; 60fps burst paints≤16 a ≥10; trailing+coalescing
- [x] AC4: SW update save-safe (KRITICKÉ) — message-driven skipWaiting; flushSave PŘED postMessage; save v IndexedDB; sw-update-flow 5/5
- [x] AC5: Evikce R-F — persisted()+evaluateExportReminder(>7d/never/not-persisted); lastExportAt localStorage sidecar MIMO hashState; app-persist 9/9
- [x] AC6: PROVENANCE 0 verbatim (audit PASS); ŽÁDNÝ LICENSE (user gate); §6 placeholder; .md mimo precache (grep=0)
- [x] AC7: e2e release scénář — install (precache idempotent, version regen) → nová hra → 30d idle (27000 kroků) → export(4200) → import round-trip hash MATCH → deterministická kontinuace MATCH; bitva/story/offline sady zelené; bez crashe
- [x] AC8: Mobile UX — touch ≥44px audit PASS; 0 overflow; iOS meta + 100dvh/env/touch-action přítomny
- [x] AC9: M9b nerozbil M9a(35)/M8(129)/M7(168)/M6(81)/M5(177); CI 1566/1566
- [x] AC10: DoD M9b release celkově — release kandidát hratelný
- [x] QA report: artifacts/final/qa_report_iter-021_T-006.md (verdikt GO — DoD M9b)
