# Iteration Plan: iter-001

- **Created**: 2026-06-12
- **Goal**: Architektonicky analyzovat původní hru Prosperity – vypíchnout klíčové mechaniky, identifikovat neefektivní/problematické mechaniky a doporučit kandidáty na refactoring pro další vývoj.
- **Status**: active
- **Pozn. k modelu**: Architektonické tasky (T-001, T-002) běží na modelu **Fable** s požadavkem na maximální analytickou hloubku (xhigh) – experiment k otestování capability modelu.

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Architektonická analýza původní hry: vypíchnout klíčové mechaniky a jejich engine/datový model (čas/engine, populace, ekonomika/trh, výzkum, vojsko/AI svět, save). Vstupy: `doc/original_source/`, `doc/original_source_doc.md`. Model: Fable (xhigh).
- [~] T-002: SPLIT na T-002a + T-002b (po stream idle timeoutu na Fable rozděleno na kratší tasky)
- [ ] T-002a (in-flight): architect – Refactoring kandidáti: výkon & runtime + save/offline + serverové závislosti (pohledem mobile PWA/offline). Model: Fable (xhigh).
- [x] T-002b: architect – Refactoring kandidáti: údržba & architektura (provázanost, string-callback křehkost, UI↔logika + DOM, balanc-as-code). Model: Fable (xhigh).
- [ ] T-003: reviewer – Review analýz a doporučení (T-001 + T-002a + T-002b); úplnost, technická správnost, proveditelnost; konsolidace prioritizovaného seznamu
- [ ] T-004: architect – Zapracovat nálezy z review (pokud reviewer něco našel)
- [ ] T-005: human – Review a schválení analýzy uživatelem (blocker)
- [ ] T-006: human – Schválení uzavření iterace (review výsledků před /close-iteration)

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Analýza prošla reviewer review a případnou opravou (T-003, T-004)
- [ ] Analýza schválena uživatelem (T-005)

## Exit Criteria
- Architektonická analýza (artefakt v `agents/architect/artifacts/final/`): klíčové mechaniky + jejich engine/datový model, a seznam neefektivních mechanik s doporučeními na refactoring (priorita, dopad, alternativy).
- Analýza prošla reviewem (T-003) a schválením uživatele (T-005).

## Decisions Made This Iteration
–

## Retrospective Notes
–
