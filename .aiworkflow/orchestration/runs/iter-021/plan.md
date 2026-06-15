# Iteration Plan: iter-021

- **Created**: 2026-06-15
- **Goal**: M9b – Release kandidát: mobilní UX polish, finální PWA audit (evikce/SW update/offline edge), licence/PROVENANCE čistka (R-G, R-F) + release dokumentace. Master plán §3/iter-018(M9b). **Finální R-G licence = explicitní user gate před veřejným vydáním.** Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Design M9b (Opus): mobile UX polish (dotykové cíle, layout obrazovek, render perf ≤10–15 re-renderů/s, iOS Safari specifika), finální PWA audit (evikce storage R-F → export prompt, SW update flow, offline edge cases, install iOS/Android), licence/PROVENANCE metodika (R-G: vlastní assety/jména/texty, evidence; doporučení licence pro user gate), release dokumentace osnova. Split tasků
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
