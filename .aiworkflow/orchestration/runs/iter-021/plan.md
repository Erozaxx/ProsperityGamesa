# Iteration Plan: iter-021

- **Created**: 2026-06-15
- **Goal**: M9b – Release kandidát: mobilní UX polish, finální PWA audit (evikce/SW update/offline edge), licence/PROVENANCE čistka (R-G, R-F) + release dokumentace. Master plán §3/iter-018(M9b). **Finální R-G licence = explicitní user gate před veřejným vydáním.** Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M9b hotový (design_iter-021_T-001.md): **T1** touch ≥44px (audit-touch-targets.mjs), 0 horizontal overflow @320/360/390px, **render ≤15/s** (KLÍČOVÝ NÁLEZ: render.js dnes ~60/s porušuje §3.4 → fix time-gate RENDER_MIN_INTERVAL_MS=66 + trailing, UI vrstva), iOS Safari (100dvh/safe-area/touch-action). **T2** evikce R-F (persisted()+export prompt >7dní, lastExportAt sidecar MIMO hashState), SW update (auto skipWaiting→message-driven + UI prompt + autosave('hide') před reload), offline edge (cache-miss SPA fallback ✓). **T3 licence**: doporučení **MIT+disclaimer** (alt GPL-3.0/proprietární), finální=USER GATE, PROVENANCE.md §6 placeholder, **žádný LICENSE soubor před rozhodnutím**; audit-provenance.mjs gate. **T4** README přepis (zastaralý!), KNOWN_ISSUES. **Split**: C-021-A (T1+T2 UX/PWA) / C-021-B (T3+T4 licence/docs) disjunktní. DR-021-01. README zastaralý (vedlejší nález)
- [x] T-002: reviewer – **GO-s-podmínkami** (ověřeno proti kódu): 0 blocker/0 major/3 minor/2 nit. 3 nejrizikovější osy PASS: determinismus nedotčen (hashState rng.js:69 jen payload; render-throttle/lastExportAt sidecar/_meta vše mimo hashState, identický s iter-020 = G1 gate), SW update bez ztráty savu (skipWaiting→message-driven+prompt+autosave('hide') existuje autosave.js:40-46, IndexedDB přežije), licence=user gate (jen doporučení, žádný LICENSE před rozhodnutím). Evikce+mobile UX (render ~60/s potvrzeno) PASS, split A/B disjunktní souhlas. **Podmínky DR-021-01**: MINOR-1 (render test živá dávka ne klid), MINOR-2 (C-021-B edituje data/_meta v precache ROOTS → A+B SEKVENČNĚ + 1 finální gen-precache), MINOR-3 (G1 gate po _meta). NIT: persist=src/app/persist.js
- [x] T-003: tom-proxy – **SCHVÁLENO (DESIGN přístup, v mandátu)**: mobile UX scope OK (touch≥44px, 0 overflow, render≤15/s fix, iOS Safari), PWA audit OK (evikce R-F, SW message-driven save-safe, offline edge), PROVENANCE/licence PŘÍSTUP OK (R-G klasifikace, audit-provenance.mjs gate, MIT+disclaimer jen podklad), README přepis+known issues OK. **Finální licence EXPLICITNĚ eskalována na T-008** (nevratné/právní, tom-proxy NEROZHODUJE; žádný LICENSE soubor, PROVENANCE.md §6 placeholder do té doby)
- [ ] T-004: coder – T1+T2: mobile UX polish (dotykové cíle, layout, render perf, iOS Safari) + finální PWA audit (evikce export prompt R-F, SW update flow, offline edge). UI vrstva, engine/determinismus nedotčen
- [ ] T-005: coder – T3+T4: licence/PROVENANCE čistka (vlastní assety/jména/texty evidence, PROVENANCE.md) + release dokumentace (README hry, known issues, export/import návod)
- [ ] T-006: tester – Test loop M9b (plná kumulativní sada §1.3) + kompletní e2e release scénář (install → plná smyčka → offline → save/restore → bitva → story), PWA audit ověření (evikce/update/offline), mobile render perf, plné ci + smoke
- [ ] T-007: reviewer – **Release gate** (Opus, právo re-run): done-criteria projektu (`project/done-criteria.md`), acceptance criteria zadání (`zadani_projektu.md`), PWA audit čistý, PROVENANCE úplná; otevřené nálezy = re-run; GO = release kandidát
- [ ] T-008: human – **Finální licenční rozhodnutí (USER GATE)** + schválení uzavření → /close-iteration + PR + merge → **M9b hotov = DoD M9 = RELEASE KANDIDÁT** (celý master plán M0–M9 dokončen)

## Quality Gates
- [ ] Architecture/design reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review / release gate (Reviewer) – T-007
- [ ] QA validace + e2e release scénář (Tester) – T-006
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M9b = DoD M9 = release)
- Done-criteria projektu splněna (`project/done-criteria.md`); acceptance criteria zadání splněna (install mobil, offline hraní, idle smyčka, spolehlivý save vč. offline).
- Mobilní UX polished (dotykové cíle, layout, render perf ≤10–15/s); finální PWA audit čistý (evikce/SW update/offline edge, install iOS/Android).
- PROVENANCE úplná (vlastní assety/jména/texty, R-G evidence); **licenční otázka rozhodnuta uživatelem**.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 nedotčen.
- Reviewer GO (release gate) → release kandidát.

## Decisions Made This Iteration
- DR-013-00: posun číslování (iter-018 master plán = iter-021 zde), autonomní doběh.
- **Finální R-G licence = explicitní user gate** (nevratné/právní → tom-proxy NEROZHODUJE, eskaluje skutečnému uživateli).

## Retrospective Notes
- Vstup: master plán §3/iter-018(M9b), architektura §9.2/§9.4 (PWA/storage), R-F (evikce), R-G (licence), done-criteria.
- M9b = poslední milník = DoD M9 = release kandidát → celý master plán M0–M9 hotov.
- Carry-over k posouzení/cleanup: M8 MINOR-1/2 + nity, TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 — known issues do release docs.
- LL-005 (monitor živost přes working-tree mtime), LL-006 (duplicitní spawny + ověřuj proti CI/working-tree).
