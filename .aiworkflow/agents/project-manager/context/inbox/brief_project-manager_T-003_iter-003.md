# Brief

- **Brief ID**: BRIEF-010
- **Iteration**: iter-003
- **From**: Orchestrator
- **To**: project-manager
- **Date**: 2026-06-13

## Goal
Zapracuj všechny nálezy z review T-002 (S-1…S-5 + N-1…N-4) do master plánu iterací a napiš rework note s mapou „nález → kde a jak zapracován".

## Context
- Tvůj master plán (T-001) prošel review (reviewer, Opus, T-002): **verdikt GO s úpravami, 0 blockerů**, 5 SUGGESTION + 4 NITPICK. Žádný nález nemění strukturu plánu ani architekturu – jde o lehkou redakci (split-triggery, oprava diagramu, doplnění vět o re-planningu/eskalaci/PWA smoke).
- Po tomto reworku jde plán uživateli ke schválení (T-004).

## Scope IN
Zapracuj do `iteration_master_plan_iter-003_T-001.md` všech 5 SUGGESTION (povinné) a dle uvážení 4 NITPICK (doporučené – N-1, N-3 mají věcnou hodnotu):
- **S-1**: do iter-007 doplnit explicitní split-trigger (analogicky iter-012): pokud Opus návrhy ukážou, že transakční vrstva + persist + 4 systémy nesouzní do 1 iterace, orchestrátor smí split (infrastruktura / systémy+stuby) bez dopadu na architekturu. Totéž zvážit pro iter-014 (zone tick vs. frakční AI automat).
- **S-2**: opravit ASCII diagram kritické cesty (§2.2) tak, aby obě hrany do iter-007 (z iter-005 i iter-006) byly jednoznačně tvrdé závislosti (sjednotit diagram s textem „M1 blokuje M2+").
- **S-3**: do §2.2 doplnit, jak se re-planning checkpoint po iter-006 (gap report) promítne – při materiální změně rozsahu PM vydá decision record a iterace M6/M7 (iter-013–015) se re-scopují PŘED zahájením; kritická cesta MVP (iter-007→011) zůstává nezávislá na gap reportu pozdních systémů.
- **S-4**: vyřešit PWA smoke nekonzistenci – buď doplnit „+ PWA smoke" do T-TEST iter-006 a iter-007, NEBO přidat do §1.3 větu, že kumulativní sada platí i tam, kde T-TEST výčet neopakuje každou položku.
- **S-5**: do §1.4 doplnit dopad eskalace po 3. neúspěšném re-run kole na kritickou cestu – navazující iterace se nezahajují, dokud zaseklá iterace není uzavřena nebo re-scopována decision recordem.
- **N-1** (doporučeno): v iter-008 T1 kosmeticky uvést, že catch-up dohánění předpokládá catch-up-safe invariant zavedený v iter-007.
- **N-2** (pokud přijmeš S-1): konzistentní názvosloví splitů.
- **N-3** (doporučeno): u iter-017 T4 zmínit riziko časových limitů dlouhých simulačních běhů.
- **N-4**: bez akce (potvrzení konzistence).

## Scope OUT
- Neměň strukturu plánu ani architekturu/rozhodnutí D1–D13/R1–R4. Žádné nové iterace/milníky. Jde o redakční zpřesnění.
- Otázky Q1–Q3 NEŘEŠ – ty jdou uživateli při T-004, ne tobě (reviewer to explicitně uvedl).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-003: Zapracovat S-1…S-5 (povinné) + N-1/N-3 (doporučené) do master plánu; napsat rework note.

## Inputs (soubory / reference)
- Tvůj plán k úpravě: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`
- Review (zdroj nálezů): `agents/reviewer/artifacts/final/review_iteration_master_plan_iter-003_T-002.md`
- Reference architektury: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`

## Acceptance Criteria
- Všech 5 SUGGESTION zapracováno v plánu (ověřitelné v textu na uvedených místech).
- Rework note obsahuje mapu „nález → kde a jak zapracován" pro S-1…S-5 + rozhodnutí o N-1…N-4.
- Struktura plánu (15 iterací, §1–§5) zachována; žádné nové architektonické rozhodnutí.

## Expected Outputs (cesty k souborům)
- Upravený `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`
- Nový `agents/project-manager/artifacts/final/rework_iter-003_T-003.md` (rework note)

## Risks / Constraints
- Light zásah – neměň podstatu rozhodnutí ani řez iterací; jen zpřesni dle nálezů.
- Při handoffu jako output-path uveď rework note (orchestrátor na něj čeká).
