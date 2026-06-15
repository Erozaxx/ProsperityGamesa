# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-021-003 (human gate M9b DESIGN — release kandidát)
- **Iteration**: iter-021
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo — human gate M9b (DESIGN přístup k release kandidátu) vydán jménem Toma. SCHVÁLENO. Finální licence NEROZHODNUTA → eskalace na T-008 (user gate).

## Dílčí checklist
- [x] Přečíst brief BRIEF-021-003 (source of truth)
- [x] Přečíst design_iter-021_T-001 (T1 mobile UX, T2 PWA, T3 PROVENANCE/licence, T4 docs) + DR-021-01
- [x] Přečíst zadani_projektu.md (ř.32/52 PROVENANCE/licence) + done-criteria
- [x] Posoudit mobile UX scope, PWA audit scope, PROVENANCE/licence PŘÍSTUP, README/known issues
- [x] Rozlišit DESIGN přístup (rozhoduji) vs finální licence (eskalace T-008)
- [x] Vydat verdikt → artifacts/final/gate_iter-021_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M9b — DESIGN přístup). Klasifikace: rozhodnuto v mandátu; finální licence eskalována na T-008.
1. **Mobile UX scope** OK release-quality (touch ≥44px, 0 overflow, render ≤15/s fix render.js, iOS Safari) — UI vrstva mimo core, determinismus nedotčen.
2. **PWA audit scope** OK finální (evikce R-F export reminder >7d, SW message-driven update prompt + autosave před reloadem, offline edge) — save v IndexedDB přežije.
3. **PROVENANCE/licence PŘÍSTUP** přijatelný (R-G klasifikace, audit-provenance.mjs gate, PROVENANCE.md, doporučení MIT+disclaimer jako podklad). **Finální licence = NEROZHODNUTA → T-008.** Žádný LICENSE soubor; §6 PLACEHOLDER.
4. **README přepis + known issues do docs** OK (README zastaralý; 36 gapů low/medium, žádný blocker).

## Předpoklady
- Mandát default = rozhodni a pokračuj; eskaluj nevratné/scope/právní. Body 1–4 v mandátu (reverzibilní UI/PWA/docs); jen finální licence eskaluje (nevratné/právní).
- Reviewer GO-s-podmínkami (0 blocker/0 major); MINOR-1/2/3 + G1 vyřešeny v DR-021-01.
- Determinismus: hashState identický s iter-020 (test G1). C-021-A→C-021-B sekvenčně, jediný finální gen-precache.
- Precedens gatů iter-013..020 T-003 (vše SCHVÁLENO).

## Blockery
–
