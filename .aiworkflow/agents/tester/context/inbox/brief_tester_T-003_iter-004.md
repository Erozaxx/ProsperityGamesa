# Brief
- **Brief ID**: BRIEF-013
- **Iteration**: iter-004 (M0a)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop iterace iter-004 dle master plánu §1.3/iter-004. Ověř, že engine core je správný a deterministický; doplň chybějící edge testy.
## Scope IN
- Spusť `npm run ci` (tsc --noEmit, grep gate, node --test) – musí být zelené.
- Ověř determinism: `hash(simulate(seed,N))` stabilní napříč běhy; stejný seed → stejný hash, jiný seed → jiný.
- Ověř časové hrany: přechod dne (STEPS_PER_DAY), sezóny (4×91 dní), roku (364 dní), 5/10denní periodika napříč hranicí roku (_absDay).
- Ověř scheduler determinismus (tie-breaker _seq), save/serializaci stavu (assertSerializable – žádné fce/Map/Date ve stavu).
- Pokud některý z těchto edge testů chybí v test/, DOPLŇ ho (node:test) a nech projít.
- Negativní: grep gate musí spadnout na uměle vloženém `Date.now()` v core (ověř, pak vrať zpět) – jen lokálně, necommituj rozbití.
## Inputs
- Kód v src/, test/; návrh `agents/architect/artifacts/final/design_iter-004_T-001.md`; impl note `agents/coder/artifacts/final/impl_iter-004_T-002.md`; `agents/tester/AGENTS.md`
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky (počty testů, hash hodnoty, co bylo doplněno).
- Při FAIL: přesně co a proč selhalo (orchestrátor pak reopenne coder).
## Expected Outputs
- `agents/tester/artifacts/final/testreport_iter-004_T-003.md`
- Případné nové testy v `test/`
