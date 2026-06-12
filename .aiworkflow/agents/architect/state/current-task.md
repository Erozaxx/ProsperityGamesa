# Current Task

- **Task ID**: T-003 (iter-002)
- **Brief**: context/inbox/brief_architect_T-003_iter-002.md (BRIEF-007)
- **Iteration**: iter-002
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-12
- **Completed**: 2026-06-12

## Co teď dělám
Hotovo – zapracování všech nálezů z review T-002 (S-01..S-06, N-01..N-04 + povýšení R-I)
do `artifacts/final/architecture_proposal_iter-002_T-001.md` (light redakce, podstata
rozhodnutí D1–D13 beze změny). Mapa „nález → kde a jak zapracován" v rework note:
`artifacts/final/rework_iter-002_T-003.md`.

Shrnutí zásahů:
- **S-01**: §2.2 nový odstavec runtime zero-build vs. dev/CI Node toolchain; DoD M0 =
  funkční `tsc --checkJs` CI gate (§11/M0); úprava D1 řádku a §2.1.
- **S-02**: §9.2 cap rozdělen na technický strop (`capTechRealHours: 8`, potvrzení po
  benchmarku M0) a balanční hodnotu (`capRealHours`, ladí M9); engine uplatňuje min;
  D10 řádek + §14.1 aktualizovány.
- **S-03**: §9.1 kalibrace = hratelnostní cíle (ne serverové křivky); upřesněn DoD M9 + §13.3.
- **S-04**: §11 M2 zmenšen na catch-up MVP + nový odstavec se zdůvodněním a povoleným
  splitem M2a/M2b.
- **S-05**: §4.1 catch-up-safe invariant; zařazen do DoD všech milníků od M2 (§11).
- **S-06**: negativní kontraktní test – stub world neoceňuje před M4 (§8.2, §9.4, §9.1).
- **N-01**: §9.2 = kanonická formulace capu; pozn. pod §12 jen odkazuje.
- **N-02**: §9.1 explicitní clamp `available ∈ [0, max]`.
- **N-03**: PWA smoke check průběžně od M0 (§11 úvod + M0 + M9).
- **N-04**: ASCII diagram §3.5 a tickOrder §4.3 označeny jako živé artefakty, kontrola
  v reviewer gate (§11).
- **R-I**: dopad povýšen na Vysoký + označen jako největší reálné riziko dle review.

## Dílčí checklist
- [x] T-003: Zapracovat S-01..S-06 + N-01..N-04 do návrhu; zapsat rework note.

### Pracovní rozpad (interní)
- [x] Přečteno: AGENTS.md, brief BRIEF-007, review T-002 (§6 tabulka, §7)
- [x] S-01, S-02 (M0 DoD, cap split), S-03 (M9 DoD)
- [x] S-04 (M2), S-05 (invariant), S-06 (kontraktní test)
- [x] N-01..N-04 + povýšení R-I
- [x] Rework note + aktualizace hlavičky návrhu
- [x] Validace + handoff

## Předpoklady
- Light zásah dle Scope IN briefu – žádné nové architektonické rozhodnutí; struktura
  návrhu (§0–§14) zachována; review artefakt reviewera nedotčen.

## Blockery
–
