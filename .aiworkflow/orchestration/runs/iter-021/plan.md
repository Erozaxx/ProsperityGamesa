# Iteration Plan: iter-021

- **Created**: 2026-06-15
- **Goal**: M9b – Release kandidát: mobilní UX polish, finální PWA audit (evikce/SW update/offline edge), licence/PROVENANCE čistka (R-G, R-F) + release dokumentace. Master plán §3/iter-018(M9b). **Finální R-G licence = explicitní user gate před veřejným vydáním.** Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M9b hotový (design_iter-021_T-001.md): **T1** touch ≥44px (audit-touch-targets.mjs), 0 horizontal overflow @320/360/390px, **render ≤15/s** (KLÍČOVÝ NÁLEZ: render.js dnes ~60/s porušuje §3.4 → fix time-gate RENDER_MIN_INTERVAL_MS=66 + trailing, UI vrstva), iOS Safari (100dvh/safe-area/touch-action). **T2** evikce R-F (persisted()+export prompt >7dní, lastExportAt sidecar MIMO hashState), SW update (auto skipWaiting→message-driven + UI prompt + autosave('hide') před reload), offline edge (cache-miss SPA fallback ✓). **T3 licence**: doporučení **MIT+disclaimer** (alt GPL-3.0/proprietární), finální=USER GATE, PROVENANCE.md §6 placeholder, **žádný LICENSE soubor před rozhodnutím**; audit-provenance.mjs gate. **T4** README přepis (zastaralý!), KNOWN_ISSUES. **Split**: C-021-A (T1+T2 UX/PWA) / C-021-B (T3+T4 licence/docs) disjunktní. DR-021-01. README zastaralý (vedlejší nález)
- [ ] T-002: reviewer – Review designu M9b: PWA audit kompletní (evikce/update/offline edge), mobile UX měřitelné (render perf), PROVENANCE metodika úplná (R-G evidence), žádný determinismus regres riziko (UI-only změny mimo hashState); GO/NO-GO
- [ ] T-003: tom-proxy – Human gate M9b design: produktová rozhodnutí (mobile UX scope, PWA audit scope, **PROVENANCE/licence přístup**); finální licenční ROZHODNUTÍ před veřejným vydáním = **eskalace skutečnému uživateli** (nevratné/právní). SCHVÁLENO/eskalace
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
