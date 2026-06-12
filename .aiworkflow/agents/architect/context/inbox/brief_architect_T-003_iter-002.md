# Brief

- **Brief ID**: BRIEF-007
- **Iteration**: iter-002
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Zapracovat všechny nálezy z review T-002 (S-01..S-06 + N-01..N-04) do návrhu architektury (architecture_proposal_iter-002_T-001.md).

## Context
Reviewer (T-002) dal verdikt GO s úpravami – 0 blockerů, žádný nález nevyžaduje rework jako
takový, ale uživatel si přeje zapracovat **všechny** nálezy do návrhu, než schválí (T-004).
Plné znění nálezů: `agents/reviewer/artifacts/final/review_iter-002_T-002.md` §6 (tabulka) a §7.
Jde o **light redakci/doplnění** existujícího návrhu, ne přepis.

## Scope IN (zapracovat přesně tyto nálezy)
- **S-01** (§2.1/§2.2): odlišit *runtime zero-build* od *dev/CI Node toolingu* (tsc/extract/SW
  manifest jsou dev/CI závislosti, ne runtime); doplnit DoD M0 = funkční `tsc --checkJs` CI gate.
- **S-02** (§9.2/§14.1): oddělit **technický strop** catch-upu (8 h) od **balanční hodnoty**;
  doplnit DoD M0 = benchmark ceny kroku *před* potvrzením capu; balanční hodnotu ladit v M9.
- **S-03** (§9.1/§13.3): kalibrační „referenční křivky" trhu nemají serverový zdroj → definovat
  je jako **hratelnostní cíle**; upřesnit DoD M9.
- **S-04** (§11): M2 je přetížený (resource+migrace+5 systémů+catch-up+autosave) → zvážit
  split / minimální catch-up v MVP; uprav rozpad nebo zdůvodni.
- **S-05** (§11/§4.1): catch-up není „hotový" v M2, rozšiřuje se s každým systémem → doplnit
  **catch-up-safe invariant** do milestone DoD.
- **S-06** (§8.2/§9.1): kontrakt `getGoldValue`/`market.inject` je od M4, ale AI svět (M7) na něm
  závisí → doplnit kontraktní test, že stub world v M2–M6 neoceňuje dřív, než trh existuje (M4).
- **N-01** (§9.2+§12): sjednotit dvojí formulaci „cap pravděpodobně dolů".
- **N-02** (§9.1): explicitně potvrdit clamp `available ∈ [0, max]`.
- **N-03** (§11/M9): PWA audit je průběžný od M0, ne až M9 → posunout/rozprostřít.
- **N-04** (§3.5/§4.3): poznámka, že ASCII diagram a tickOrder jsou **živé artefakty** (riziko zastarání).
- Zvaž povýšení viditelnosti rizika **R-I** (disciplína no-build) dle §7 reviewera.

## Scope OUT
- Žádná nová architektura ani re-strukturace; jen cílené úpravy výše.
- Žádná implementace. Nedotýkej se review artefaktu reviewera.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-003: Zapracovat S-01..S-06 + N-01..N-04 do návrhu; zapsat rework note.

## Inputs (soubory / reference)
- `agents/reviewer/artifacts/final/review_iter-002_T-002.md` (§6, §7 – přesné znění nálezů).
- `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (edit – předmět).
- Kontext: `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md`, `.aiworkflow/zadani_projektu.md`.

## Acceptance Criteria
- Všech 10 nálezů (S-01..S-06, N-01..N-04) zapracováno do návrhu na příslušných místech.
- Registr rozhodnutí / DoD milníků aktualizován tam, kde to nález vyžaduje (M0/M1/M9).
- Krátká **rework note** s mapou „nález → kde a jak zapracován".
- Žádná změna mimo Scope IN; struktura návrhu zachována.

## Expected Outputs (cesty k souborům)
- Upravený: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
- Nový: `agents/architect/artifacts/final/rework_iter-002_T-003.md` (rework note)

## Risks / Constraints
- Light zásah – neměň podstatu schválených rozhodnutí, jen upřesni/doplň dle nálezů.
- Pokud Write tool blokuje .md, použij Edit/Bash. Model: **Fable**.
