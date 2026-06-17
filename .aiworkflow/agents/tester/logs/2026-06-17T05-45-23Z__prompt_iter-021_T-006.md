# Brief

- **Brief ID**: BRIEF-021-006
- **Iteration**: iter-021 (M9b – Release kandidát)
- **Task**: T-006 (tester) — test loop M9b + e2e release scénář
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-17

## Goal
Nezávislá QA M9b (mobile UX + PWA audit + licence/PROVENANCE + release docs). Ověřuj EMPIRICKY vlastním během. Přísný na: **determinismus G1 nedotčen** (hashState identický s iter-020 — vše UI/infra), **SW update nesmí ztratit save**, **render ≤15/s při živé dávce**, **PROVENANCE 0 verbatim**, a kompletní **e2e release scénář**. Toto je release gate příprava (DoD M9 = release kandidát).

## Co implementováno (T-004 + T-005)
- **T-004 (C-021-A)**: render-throttle (RENDER_MIN_INTERVAL_MS=66+trailing, render.js) + test (render-throttle.test.js); touch ≥44px (audit-touch-targets.mjs); 0 overflow @320/360/390 (styles.css/App.js); iOS Safari (100dvh/safe-area/meta). Evikce R-F (persisted()+export reminder, lastExportAt sidecar, persist.js); SW message-driven update (service-worker.js/sw-register.js, flushSave před reload); sw-update-flow.test.js.
- **T-005 (C-021-B)**: PROVENANCE.md (§6 licence placeholder, ŽÁDNÝ LICENSE), audit-provenance.mjs (PASS 0 verbatim), _meta provenance (herní data nedotčena); README přepis; KNOWN_ISSUES.md.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail, typecheck). **`npm run smoke`** OK (0 console errors, 0 horizontal overflow @320/360/390 napříč 12 taby).
2. **Determinismus G1 (KRITICKÉ)**: `hashState` IDENTICKÝ s iter-020. Ověř: nula změn v src/core/src/data herních hodnot (jen _meta/UI); golden-hash (m9a-regression) projde beze změny; lint:core (žádný Date.now/Math.random/DOM v core). render-throttle/lastExportAt/_meta vše MIMO hashState.
3. **Render ≤15/s při živé dávce (MINOR-1)**: ověř test pokrývá živou 60fps dirty dávku (ne klid) + trailing render + coalescing. Paint rate skutečně ≤15/s.
4. **SW update bez ztráty savu (KRITICKÉ, R-F)**: message-driven skipWaiting + update prompt → flushSave('hide') PŘED reloadem; save (IndexedDB) přežije update; cache verze se nemíchají. Ověř flow (sw-update-flow.test.js + repro).
5. **Evikce (R-F)**: persisted() detekce + export reminder při daysSinceLastExport>7 || ne-perzistentní; lastExportAt sidecar MIMO hashState (neukládá se do herního stavu).
6. **PROVENANCE/licence**: audit-provenance.mjs PASS (0 verbatim shod vs doc/original_source); ŽÁDNÝ LICENSE soubor (= user gate T-008); PROVENANCE.md §6 placeholder; .md vyloučeny z precache (distribuce čistá).
7. **e2e RELEASE SCÉNÁŘ (KRITICKÉ)**: kompletní cesta — install (PWA manifest/SW) → plná smyčka (nová hra → idle výdělek → nákup → pasivní příjem) → offline (catch-up) → save/restore (export/import round-trip) → bitva → story event. Ověř, že hra je hratelná end-to-end bez crashe.
8. **Mobile UX**: touch ≥44px (audit PASS), 0 overflow @320/360/390, iOS Safari meta/100dvh přítomny.
9. **M9b nerozbil M9a/M8/M7/M5/M6**: všechny předchozí sady zelené.
10. **DoD M9b/release celkově**: acceptance criteria zadání (install mobil, offline hraní, idle smyčka, spolehlivý save vč. offline); done-criteria projektu. Release kandidát hratelný.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper tmp OK.
- Finální volba licence = NEŘEŠ (user gate T-008). Known issues (KNOWN_ISSUES.md) = NE bug.

## Acceptance Criteria (DoD M9b release)
- ci zelené (typecheck), smoke OK (0 overflow).
- G1 hashState identický s iter-020; render ≤15/s živá dávka; SW update save-safe; evikce reminder; PROVENANCE 0 verbatim + žádný LICENSE.
- e2e release scénář projde (install→smyčka→offline→save/restore→bitva→story).
- M9b nerozbil předchozí milníky.
- Verdikt GO/NO-GO (DoD M9b = release kandidát).

## Inputs
- Design: `context/refs/design_iter-021_T-001.md`, DR-021-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-021_T-004.md`, `..._T-005.md`
- Testy: `test/render-throttle.test.js`, `test/sw-update-flow.test.js`, `test/app-persist.test.js`, `test/m9a-regression.test.js`, `tools/audit-touch-targets.mjs`, `tools/audit-provenance.mjs`, `tools/smoke.mjs`
- Kód: `src/ui/render.js`, `service-worker.js`, `src/app/sw-register.js`, `src/app/persist.js`, `PROVENANCE.md`, `README.md`, `KNOWN_ISSUES.md`, `src/save/` (export/import)

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-021_T-006.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-006 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
