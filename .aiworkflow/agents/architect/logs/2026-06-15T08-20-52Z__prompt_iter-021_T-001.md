# Brief

- **Brief ID**: BRIEF-021-001
- **Iteration**: iter-021 (M9b – Release kandidát)
- **Task**: T-001 (architect) — design M9b
- **From**: Orchestrator
- **To**: architect (Opus)
- **Date**: 2026-06-15

## Goal
Navrhni **design M9b = release kandidát** (NE produkční kód): mobile UX polish, finální PWA audit, licence/PROVENANCE metodika a release dokumentaci. Toto je **poslední milník** (DoD M9 = release). Klíč: vše release-critical, žádný determinismus regres (UI/PWA změny mimo deterministický stav/hashState), a **finální licence = explicitní user gate** (architektura ji směruje na uživatele).

## Source of truth
- Architektura `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`: PWA/SW/storage (§9.2/§9.4), K2 (precache úplný výčet), R-F (evikce storage), R-G (licence/assety). 
- Master plán `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` §3/iter-018(M9b) — T1 mobile UX, T2 PWA audit, T3 licence, T4 release docs.
- Zadání `zadani_projektu.md` (ř.32/52: originální grafiky/obsah 1:1 NE → vlastní assety/licence; PROVENANCE), `project/done-criteria.md`.

## Scope IN (navrhni)
1. **T1 — Mobile UX polish**: dotykové cíle (min velikost), layout obrazovek (úzké viewporty), **render perf ≤10–15 re-renderů/s** (jak měřit/omezit; existující render loop), iOS Safari specifika (safe-area, 100vh bug, touch). Co je měřitelné = test/audit.
2. **T2 — Finální PWA audit**: 
   - **Evikce storage (R-F)**: detekce/varování + **export prompt po dlouhé době** (uživatel vyzván k exportu savu); `navigator.storage.persist()` strategie.
   - **SW update flow**: nová verze precache (PRECACHE_VERSION), aktivace, skip-waiting vs prompt; `service-worker.js`/`sw-register.js`.
   - **Offline edge cases**: install iOS/Android, offline start, cache miss fallback.
3. **T3 — Licence/PROVENANCE (R-G)**: metodika evidence — všechny assety/jména/texty **vlastní/parafráze** (ne 1:1 originál); `PROVENANCE.md` struktura (co je vlastní, co data-fakta, co odvozeno ze struktury). **Doporučení licence** (např. typ) PRO user gate — ale **finální rozhodnutí = uživatel** (nevratné/právní; tom-proxy NEROZHODUJE, eskaluje).
4. **T4 — Release dokumentace**: README hry (co to je, jak hrát, install), known issues (carry-over gapy: M8 MINOR-1/2, TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1), export/import návod.

## Tvrdé invarianty
- **Determinismus nedotčen**: mobile UX + PWA = UI/prezentační/infra vrstva, MIMO deterministický herní stav (žádná změna hashState, žádný Date.now/Math.random/DOM v core).
- PWA precache = úplný výčet souborů (K2, gen-precache); SW update nesmí ztratit save.
- PROVENANCE: čísla/fakta (army prahy, ceny) nepodléhají R-G; znění/grafika/jména ano.

## Acceptance Criteria
- Design `design_iter-021_T-001.md`: T1 (měřitelné UX/perf cíle), T2 (PWA audit checklist evikce/update/offline), T3 (PROVENANCE metodika + licence doporučení k user gate), T4 (release docs osnova).
- Split coder tasků (T1+T2 UX/PWA, T3+T4 licence/docs — navrhni).
- DR-021-01 impl poznámky.
- Min 1 alternativa kde relevantní (zejm. SW update strategie, licence typ).
- Realizovatelné Sonnet coderem; release-critical jasně označeno.

## Inputs
- Architektura §9.2/§9.4, K2, R-F, R-G
- Master plán §3/iter-018
- Kód: `service-worker.js`, `src/app/sw-register.js`, `manifest.webmanifest`, `src/precache.js` (PRECACHE_VERSION/URLS), `tools/gen-precache.mjs`, `src/ui/` (render loop, styles.css, App.js), `src/save/` (export/import), `README.md` (existuje), `doc/` (PROVENANCE zdroje)

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-021_T-001.md`
- `orchestration/decisions/` DR-021-01 (pokud vyžaduje)

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<design hotový + split + licence doporučení>"`
- NEcommituj (git).
