# Brief

- **Brief ID**: BRIEF-021-002
- **Iteration**: iter-021 (M9b – Release kandidát)
- **Task**: T-002 (reviewer) — review designu M9b
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Review **designu M9b** (release kandidát metodika, ne kód) před implementací. Ověř, že PWA audit je kompletní (evikce/SW update/offline edge bez ztráty savu), mobile UX cíle měřitelné, render-throttle fix nerozbije determinismus (UI vrstva, mimo hashState), PROVENANCE metodika úplná a licence správně směrována na user gate (NErozhoduje se v workflow). Architektonický gate před tom-proxy. Toto je poslední milník (DoD M9 = release).

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-021_T-001.md`

## Na co se zaměřit (kritické)
1. **Determinismus nedotčen (KLÍČOVÉ)**: render-throttle (`RENDER_MIN_INTERVAL_MS=66`, trailing render), evikce sidecar (`lastExportAt`), SW update — vše UI/prezentační/infra vrstva MIMO deterministický herní stav. `hashState` musí zůstat IDENTICKÝ s iter-020. Ověř, že žádná změna nezasáhne core/herní stav (žádný Date.now/Math.random/DOM v core; throttle čte čas jen v UI render loopu, ne v engine).
2. **SW update nesmí ztratit save (KLÍČOVÉ, R-F)**: přechod auto-`skipWaiting()` → message-driven skip-waiting + UI prompt + `autosave('hide')` před reloadem. Ověř, že save (IndexedDB) přežije update; cache verze se nemíchají za běhu; offline start zachován.
3. **Evikce export prompt (R-F)**: `persisted()` detekce + prompt při `daysSinceLastExport>7` || ne-perzistentní; `lastExportAt` sidecar MIMO hashState (neukládá se do herního stavu/neovlivní determinismus). Správné?
4. **Mobile UX měřitelné**: touch ≥44px (statický audit), 0 horizontal overflow @320/360/390, render ≤15/s (test). render.js ~60/s nález správný (§3.4)? Fix proveditelný v UI vrstvě?
5. **Licence/PROVENANCE (R-G)**: metodika evidence úplná (čísla=fakta, znění/grafika/jména=vlastní/parafráze); PROVENANCE.md struktura; **licence = USER GATE** (doporučení MIT+disclaimer OK jako návrh, ale rozhodnutí eskaluje uživateli; žádný LICENSE soubor před rozhodnutím). audit-provenance.mjs jako gate. Posuď.
6. **Split** (C-021-A UX/PWA, C-021-B licence/docs) — disjunktní soubory, oba Sonnet? Souhlasíš? (Pozor: oba re-run gen-precache → orchestrátor řeší sekvenčně.)
7. **DoD M9b/release**: pokrývá design done-criteria + acceptance criteria zadání (install mobil, offline, idle smyčka, spolehlivý save)?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení: determinismus nedotčen, SW update bez ztráty savu, evikce, mobile UX měřitelné, licence=user gate, split.

## Inputs
- Design: `context/refs/design_iter-021_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§9.2/§9.4 PWA/SW, K2, R-F, R-G, §3.4 render)
- Master plán: §3/iter-018(M9b); Zadání: `zadani_projektu.md` (PROVENANCE/licence), `project/done-criteria.md`
- Kód: `service-worker.js`, `src/app/sw-register.js`, `src/ui/render.js`, `styles.css`, `src/save/persist.js`, `src/precache.js`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-021_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + determinismus/SW/licence + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- Determinismus nedotčen (hashState identický) + SW update bez ztráty savu + licence=user gate prověř obzvlášť pečlivě — to jsou nejrizikovější body release.
