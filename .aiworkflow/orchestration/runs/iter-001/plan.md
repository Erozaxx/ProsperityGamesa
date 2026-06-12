# Iteration Plan: iter-001

- **Created**: 2026-06-12
- **Goal**: Navrhnout architekturu nové hry – věrný rebuild Prosperity (mobile-first PWA, offline) – stack, struktura, herní engine, save formát, datový model.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Navrhnout architekturu rebuildu Prosperity (stack, struktura projektu, herní engine/smyčka & čas, datový/save model, vrstvy logika↔UI, plán iterací systémů); vstupy: `doc/original_source_doc.md`, `.aiworkflow/zadani_projektu.md`
- [ ] T-002: reviewer – Review architektury (všechny nálezy, nejen blockery)
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
- Schválený architektonický návrh (artefakt v `agents/architect/artifacts/final/`): stack, struktura projektu, herní engine/smyčka, datový + save model, vrstvení, plán iterací systémů.
- Návrh prošel reviewem (T-002) a schválením uživatele (T-004).

## Decisions Made This Iteration
–

## Retrospective Notes
–
