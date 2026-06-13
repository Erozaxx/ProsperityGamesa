# Iteration Plan: iter-004

- **Created**: 2026-06-13
- **Goal**: M0a – Kostra repa & engine core: headless engine v čistých ES modulech (čas, scheduler, RNG, jeden serializovatelný stav), CI typový gate `tsc --checkJs` + grep gate. Dle master plánu §3/iter-004 (tasky T1–T6).
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Detailní návrh (Opus) všech tasků iterace T1–T6 (struktura repa §3.1, state container §3.2, clock+akumulátor §4.1, scheduler heap+periodika §4.2, RNG streamy §4.4, tickOrder §4.3 + calendar/seasons + commands skeleton §3.3) → implementační spec pro Sonnet. Model: Opus.
- [x] T-002: coder – Implementace (Sonnet) celé iterace dle návrhu T-001: src/ struktura, engine core, CI gate tsc+grep, package.json, node:test. Model: Sonnet.
- [x] T-003: tester – Test loop (Sonnet/Haiku): tsc --checkJs zelené, node:test suite, determinism hash, grep gate, jednotkové testy clock/scheduler/RNG hran (den/sezóna/rok). Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run): DoD iter-004, hranice vrstev, živé artefakty (tickOrder + diagram). Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Implementace prošla test loop (tester) – tsc + node:test zelené
- [ ] Review gate GO (reviewer Opus)
- [ ] tickOrder + ASCII diagram existují jako živé artefakty

## Exit Criteria
- core běží v Node bez DOM; čas/sezóny se posouvají; determinism hash test v CI; tsc --checkJs + grep gate zelené; reviewer GO.

## Decisions Made This Iteration
–

## Retrospective Notes
–
