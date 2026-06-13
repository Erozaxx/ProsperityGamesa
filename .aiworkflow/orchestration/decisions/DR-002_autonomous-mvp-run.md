# Decision Record

- **ID**: DR-002
- **Date**: 2026-06-13
- **Status**: accepted
- **Related Iteration**: iter-004 … iter-011 (MVP)

## Context
Uživatel pověřil orchestrátora autonomním provedením plánu od iter-004 do finalizace MVP (iter-011).

## Decision
1. **Autonomní běh iter-004 → iter-011** dle master plánu (iteration_master_plan_iter-003_T-001.md).
2. **Human gates** kolem close/init iterací se berou automaticky jako **ANO** (bez dotazu).
3. Každá iterace se v rámci close **commitne, PR a mergne do main bez ptaní**.
4. **Human-in-the-loop rozhodnutí** se nahrazují **tom-proxy agentem** (zastupuje uživatele dle DR-001 preferencí; eskaluje jen nevratné/scope-měnící/mimo mandát).
5. Model split dle plánu §1.1: detailní návrh = Opus, provedení = Sonnet, test loop = Sonnet/Haiku, review gate = Opus (právo re-run).

## Alternatives Considered
- Option A (zvoleno): plně autonomní s tom-proxy.
- Option B: ptát se uživatele u každé gate – zamítnuto na přání uživatele.

## Trade-offs
- Rychlost a plynulost vs. menší přímá kontrola uživatele; mitigace = decision recordy + tom-proxy dokumentuje rozhodnutí.

## Consequences
- Vznikl agent **tom-proxy** (order 6). Orchestrátor řídí design→impl→test→review smyčku per iterace.

## Follow-up Actions
- Po iter-011 (MVP) zastavit a vyžádat MVP playtest checkpoint (DR-001 Q1).
