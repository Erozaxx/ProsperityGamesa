# Iteration Plan: iter-002

- **Created**: 2026-06-12
- **Goal**: Navrhnout projekt/architekturu na vytvoření hry – věrný rebuild Prosperity (mobile-first PWA, offline) – na základě materiálů z iter-01 (vstup = rozcestník).
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Navrhnout architekturu projektu rebuildu (stack + zdůvodnění, struktura a vrstvení logika↔UI, herní engine & čas + offline catch-up, datový + save model, katalogy/balanc, rozpad systémů do iterací, rozhodnutí k R1–R4, rizika). POVINNÝ VSTUP: `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md` (+ materiály z iter-01, na které odkazuje)
- [ ] T-002 (in-flight, retry po transientní socket chybě): reviewer – Review architektury (všechny nálezy, nejen blockery)
- [ ] T-003: architect – Zapracovat nálezy z review (pokud reviewer něco našel)
- [ ] T-004: human – Review a schválení architektury uživatelem (blocker před implementací)
- [ ] T-005: human – Schválení uzavření iterace (review výsledků před /close-iteration)

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Architect návrh prošel reviewer review a případnou opravou (T-002, T-003)
- [ ] Architect návrh schválen uživatelem (T-004)
- [ ] Code review (Reviewer)
- [ ] QA validace (Tester)

## Exit Criteria
- Schválený návrh projektu (artefakt v `agents/architect/artifacts/final/`): volba stacku + zdůvodnění, struktura/vrstvení, herní engine & čas + offline catch-up, datový + save model, katalogy/balanc, rozpad systémů do iterací/milníků, rozhodnutí k R1–R4, rizika + mitigace.
- Návrh prošel reviewem (T-002) a schválením uživatele (T-004).
- Návrh vychází z materiálů iter-01 (rozcestník + analýzy + review K0–K19).

## Decisions Made This Iteration
–

## Retrospective Notes
–
