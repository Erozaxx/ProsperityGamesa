# Brief

- **Brief ID**: BRIEF-021-007
- **Iteration**: iter-021 (M9b – Release kandidát)
- **Task**: T-007 (reviewer) — **RELEASE GATE** (Opus, právo re-run)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-17

## Goal
**Závěrečný RELEASE GATE** celého projektu (master plán M0–M9). Hodnotíš PROTI KÓDU, ne tvrzením. GO = **release kandidát**. Ověř: **done-criteria projektu** + **acceptance criteria zadání** splněna, M9b implementace correct, **determinismus G1 nedotčen** (hashState identický s iter-020), PWA audit kompletní/save-safe, PROVENANCE úplná + **licence správně odložena na user gate T-008**. Otevřené blokující nálezy = re-run. Tester T-006 dal GO (17/17 AC empiricky).

## Rozsah review (produkční diff M9b)
`git diff $(git merge-base HEAD main)..HEAD -- src/ test/ tools/ *.md *.js *.html *.webmanifest`. Klíčové:
```
src/ui/render.js (render-throttle), src/ui/App.js, src/ui/styles.css, index.html (mobile/iOS)
service-worker.js, src/app/sw-register.js (SW update flow), src/app/persist.js (evikce/sidecar), src/app/main.js
src/data/contracts.json (POUZE _meta — ověř žádná herní hodnota)
PROVENANCE.md, README.md, KNOWN_ISSUES.md, tools/audit-provenance.mjs, tools/audit-touch-targets.mjs
test/render-throttle.test.js, test/sw-update-flow.test.js, test/app-persist.test.js
src/precache.js (regen, .md vyloučeny)
```

## Acceptance criteria zadání (ověř SPLNĚNO — release done-criteria)
1. **Hratelná hra v repu** (index.html, src/), funkční offline.
2. **Install na mobil + offline hraní** (PWA manifest/SW; iOS/Android meta).
3. **Idle smyčka vyladěná** (výdělek→nákup→pasivní příjem→offline progres) — M9a kalibrace.
4. **Spolehlivý save/obnova vč. offline výpočtu** (export/import round-trip, SW update neztratí save).

## Tvrdé invarianty (MUSÍ platit — jinak blocker/major)
1. **Determinismus G1 (KLÍČOVÉ)**: `hashState` IDENTICKÝ s iter-020. Ověř proti kódu: `git diff src/core/` vs iter-020 baseline = prázdný; src/data změna = JEN `_meta` (žádná herní hodnota); golden-hash projde; lint:core (žádný Date.now/Math.random/DOM v core). render-throttle/lastExportAt sidecar/_meta vše MIMO hashState.
2. **SW update save-safe (KLÍČOVÉ, R-F)**: `flushSave()` PŘED `skipWaiting/postMessage`; save (IndexedDB) přežije; cache verze se nemíchají; offline start zachován.
3. **Render ≤15/s (MINOR-1)**: test pokrývá ŽIVOU dávku (ne klid) — paint ≤15/s reálně.
4. **Licence = USER GATE**: ŽÁDNÝ `LICENSE` soubor (ověř repo ho nemá); PROVENANCE.md §6 placeholder; audit-provenance 0 verbatim; .md vyloučeny z precache (distribuce čistá).

## Na co se zaměřit
1. **Correctness** invariantů (proti kódu).
2. **Soulad s designem** `context/refs/design_iter-021_T-001.md` + DR-021-01 (MINOR-1/2/3 vyřešené?) + architekturou (§9.2/§9.4 PWA, R-F, R-G, §3.4 render).
3. **Reuse/mrtvý kód**; UI bez herní logiky.
4. **DoD M9 / release celkově**: master plán M0–M9 kompletní? Hra je release kandidát (hratelná, instalovatelná, offline, vyladěná, spolehlivý save)?
5. **Known issues** (KNOWN_ISSUES.md) — korektně dokumentované, žádný z nich blokující release?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + `soubor:řádek` + návrh.
- Explicitní verdikt: **GO (release kandidát)** / **GO-s-podmínkami** / **NO-GO (re-run)**.
- Explicitní stanovisko: done-criteria + acceptance criteria splněna, G1 nedotčen, SW save-safe, licence=user gate, DoD M9.

## Inputs
- Design: `context/refs/design_iter-021_T-001.md`; QA: `context/refs/qa_report_iter-021_T-006.md`; DR-021-01
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§9.2/§9.4, R-F, R-G, §3.4)
- Zadání: `zadani_projektu.md` (acceptance ř.40-46); `project/done-criteria.md`
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-021_T-004.md`, `..._T-005.md`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_iter-021_T-007.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-007 "<verdikt + DoD M9/release + počet nálezů>"`
- NEcommituj (git), NEopravuj kód.

## Constraints
- Determinismus G1 (hashState identický) + SW update save-safe + licence=user gate (žádný LICENSE soubor) + acceptance criteria zadání prověř obzvlášť pečlivě — to je release gate, ověřuj proti kódu.
