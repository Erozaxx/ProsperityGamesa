# Iteration Plan: iter-012

- **Created**: 2026-06-13
- **Goal**: Zprovoznit MVP jako reálně hratelné — opravit start seed, resolver gold/techPt, crime pay a sanity-cap populace; zavést browser-smoke + dlouhý sim do gate.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Navrhnout architekturu řešení playability hardeningu (start seed přes BALANCE.start, resolver gold/techPt, crime pay clamp, populace cap, market UI overflow); struktura, dotčené moduly, alternativy, rizika, dopad na determinismus/save-hash
- [x] T-002: reviewer – Review architektury (všechny nálezy, nejen blockery) → GO s podmínkami: 1 blocker (mylná A2 premisa), 3 major, 5 minor, 3 nit; viz DR-012-01
- [x] T-003: architect – Zapracovat nálezy z review (přepsáno §2/§3/§7/§9, re-diagnóza, pořadí A1→A4→A3→A5→A2(Option A), DAYS_PER_YEAR=364) → architecture_playability_iter-012_T-003.md (supersedes T-001)
- [x] T-004: human – Review a schválení architektury uživatelem (blocker před implementací) → SCHVÁLENO (varianta „Schvaluji, implementuj"; architektovo doporučení vč. A2 Option A)
- [ ] T-005: coder – Start seed: createInitialState předá katalog do factory + createHomeState/createPlayerState čtou BALANCE.start (population/gold/food/housing); fresh hra startuje populovaná (in-flight: T-005–T-009 v jednom běhu codera)
- [ ] T-006: coder – Fix resolveru zdrojů: resourceKindOf vrací pro 'gold'/'techPt' dedikovaný handler (ne 'resource'); pay/grant/canAfford konzistentní se state.player.gold
- [ ] T-007: coder – Crime pay robustnost: integer-clamp goldLoss na floor(available), broke osada nespadne (žádná výjimka z pay)
- [ ] T-008: coder – Sanity-cap populace: porody/migrace omezené bydlením a jídlem (zamezit explozi 50→~8749/rok); ne plná M9 kalibrace
- [ ] T-009: coder – Market UI overflow fix na úzkém mobilu (horizontální přetékání)
- [ ] T-010: tester – QA: npm run ci zelené (+ aktualizace testů na seedovaný start), npm run smoke OK, dlouhý seedovaný sim (≥2 herní roky) bez crashe; ověřit accounting invariant u gold po fixu resolveru
- [ ] T-011: reviewer – Code review celé implementace (correctness + reuse/simplify)
- [ ] T-012: human – Schválení uzavření iterace (review výsledků před /close-iteration)

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Architect návrh prošel reviewer review a případnou opravou (T-002, T-003)
- [ ] Architect návrh schválen uživatelem (T-004)
- [ ] Code review (Reviewer)
- [ ] QA validace (Tester)

## Exit Criteria
- Fresh hra startuje populovaná (populace/zlato/jídlo > 0) a v UI se zlato reálně hýbe (taxes/grant → state.player.gold).
- `npm run ci` zelené, `npm run smoke` OK, dlouhý seedovaný sim ≥2 herní roky bez crashe a bez explozivního růstu populace.
- Accounting invariant (Σ tx == Δ gold) drží i po fixu resolveru.

## Decisions Made This Iteration
–

## Retrospective Notes
- Vstup: doc/playtest-findings-mvp.md (nálezy z reálného browser playtestu po M0–M4).
