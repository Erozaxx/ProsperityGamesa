# Brief

- **Brief ID**: BRIEF-021-005
- **Iteration**: iter-021 (M9b)
- **Task**: T-005 = C-021-B (Licence/PROVENANCE + Release dokumentace)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-17

## Goal
Implementuj **C-021-B**: licence/PROVENANCE čistka (T3) + release dokumentace (T4). Design je source of truth. (NESPAWNUJ sub-agenty; udělej práci sám a řádně ji ukonči.)

⚠️ **LICENCE = USER GATE**: NEvytvářej `LICENSE` soubor, NEvol konkrétní licenci. `PROVENANCE.md §6 (licence)` = PLACEHOLDER s doporučením (MIT+disclaimer) k rozhodnutí uživatele v T-008. Finální volba je uživatelova.

## Source of truth
`agents/coder/context/refs/design_iter-021_T-001.md` — čti **T3 (PROVENANCE/licence), T4 (release docs)**. **DR-021-01** (zejm. MINOR-3 G1 gate po _meta!). tom-proxy gate T-003 SCHVÁLENO (licence eskaluje na T-008).

## Scope IN

### T3 — Licence/PROVENANCE (R-G)
1. **`PROVENANCE.md`** (root): struktura dle designu — co je VLASTNÍ/parafráze (texty/jména/grafika), co jsou FAKTA (čísla/balanc/mechaniky — nepodléhají R-G), co odvozeno ze STRUKTURY originálu. §6 licence = **placeholder** s doporučením (MIT+disclaimer, alt GPL-3.0/proprietární) → **rozhodnutí uživatele T-008**.
2. **`_meta.provenance`** v `src/data/*.json`: doplň/ujednoť flag tam kde chybí (texty=`original-paraphrased`, fakta=`extracted`/`calibrated`). NEMĚŇ herní DATA (čísla/ID/struktura) — **jen `_meta` pole** (mimo persist allowlist → mimo hashState).
3. **`tools/audit-provenance.mjs`** (NOVÝ): opakovatelný gate — ověří, že textové assety mají provenance flag a (kde lze) nejsou verbatim shody s originálem (M8 už verbatim=0). 

### T4 — Release dokumentace
1. **`README.md`** PŘEPIS (zastaralý — popisuje starý tap-to-earn skelet): co hra je (věrný rebuild Prosperity v0.9.5, offline-first PWA), jak hrát (smyčka), install (iOS/Android PWA), export/import savu, odkaz na PROVENANCE.
2. **`KNOWN_ISSUES.md`** (NOVÝ): carry-over gapy jako known issues — M8 MINOR-1/2, TXAUDIT (G-BUILD/RECRUIT), V1 tech→joby, V2 univ RNG, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 player-ATTACKING; každý 1 řádek + dopad.
3. Export/import návod (do README nebo samostatně).

## Scope OUT
- Mobile UX + PWA audit = C-021-A (T-004, HOTOVO). NEsahej render.js/styles.css/service-worker.js/sw-register.js/persist.js/App.js/main.js/index.html.
- **NEMĚŇ core/engine/herní DATA** (jen `_meta` v src/data). **NEVYTVÁŘEJ LICENSE soubor.**
- **NEREGENERUJ precache** (orchestrátor regeneruje JEDNOU na konci).

## Tvrdé invarianty (DR-021-01)
- **MINOR-3 — Determinismus G1 gate (KRITICKÉ)**: po `_meta` změnách spusť G1 test — `hashState` MUSÍ zůstat IDENTICKÝ (`_meta` je mimo persist allowlist/herní stav). Pokud by se hashState změnil → `_meta` proniklo do stavu = chyba, oprav.
- PROVENANCE: fakta (čísla) nepodléhají R-G; znění/grafika/jména ano.
- Žádný LICENSE soubor před user rozhodnutím.

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, typecheck) — uveď počet testů (start 1566).
- `npm run smoke` OK.
- **Determinismus G1 nedotčen (hashState identický, MINOR-3)**; M9a/M8/M7/M5/M6 nedotčené.
- PROVENANCE.md úplná; audit-provenance.mjs PASS; README přepsán; KNOWN_ISSUES.md.

## Inputs
- Design `context/refs/design_iter-021_T-001.md` (T3/T4), DR-021-01
- Kód/data: `src/data/*.json` (_meta), `README.md` (přepis), `doc/` (PROVENANCE zdroje, originál), `zadani_projektu.md` (R-G/PROVENANCE ř.32/52), carry-over gapy (plan retrospektivy iter-014..020)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-005 (iter-021)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-021_T-005.md` (soubor:funkce, gate, PROVENANCE, licence placeholder, G1 po _meta)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git). NEREGENERUJ precache. NEVYTVÁŘEJ LICENSE.
