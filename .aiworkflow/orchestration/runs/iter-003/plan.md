# Iteration Plan: iter-003

- **Created**: 2026-06-13
- **Goal**: Cizelovat plán – ze schválené architektury a milníků (M0–M9) vytvořit kompletní end-to-end plán všech iterací, nařezaný tak, aby tasky šly detailně navrhnout Opus agentem a provést Sonnet agentem, s povinným test loop (Sonnet/Haiku tester) + review gate (Opus reviewer, právo re-run) na konci každé iterace.
- **Status**: closed

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: project-manager – Z architektury (`agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`) a milníků M0–M9 vytvořit kompletní end-to-end plán VŠECH iterací do cíle. Milník ≠ nutně 1 iterace; řez podle komplexity. Pro každou iteraci: tasky s odhadem komplexity + doporučeným modelem (Opus návrh tasku / Sonnet provedení), závislosti, DoD a povinný závěrečný test loop (Sonnet/Haiku tester) + review gate (Opus reviewer s pravomocí re-run). Model: Fable.
- [x] T-002: reviewer – Review plánu (úplnost cesty M0→cíl, správnost řezu tasků na Opus-návrh+Sonnet-provedení, závislosti/kritická cesta, konzistence test loop + review gate u každé iterace). Všechny nálezy, nejen blockery. Model: Opus.
- [x] T-003: project-manager – Zapracovat všechny nálezy z review do plánu + rework note. Model: Fable.
- [x] T-004: human – Review a schválení kompletního plánu uživatelem (blocker před zahájením implementačních iterací)
- [x] T-005: human – Schválení uzavření iterace (review výsledků před /close-iteration)

## Quality Gates
- [x] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [x] PM plán prošel reviewer review a případnou opravou (T-002, T-003)
- [x] Každá naplánovaná iterace má test loop (Sonnet/Haiku) + review gate (Opus, právo re-run)
- [x] Tasky jsou nařezané na komplexitu Opus-návrh + Sonnet-provedení
- [x] PM plán schválen uživatelem (T-004)
- [ ] Code review (Reviewer) – N/A (plánovací iterace, žádný kód)
- [ ] QA validace (Tester) – N/A (plánovací iterace, žádný kód)

## Exit Criteria
- Existuje kompletní, schválený plán všech iterací od M0 po koncový cíl s rozpadem na tasky, modely, závislostmi a test/review gates.

## Decisions Made This Iteration
- Vznikl nový agent **project-manager** (Fable) pro tvorbu a údržbu plánu iterací.

## Retrospective Notes
–
