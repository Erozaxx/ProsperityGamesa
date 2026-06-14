# Iteration Plan: iter-016

- **Created**: 2026-06-14
- **Goal**: M7a – AI svět & jednotky: zóny (zone tick, ekonomika/politika), frakční AI automat (AISTATES), revolty/questy/tribute, jednotky (warriors/archers + upkeep), napojení trhu na zóny (market.inject). Dle master plánu §3/iter-014(M7a). Posun číslování viz DR-013-00. Split-trigger M7a-1(T1,T4,T5)/M7a-2(T2,T3,T6) — rozhodne architekt.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M7a hotový (design_iter-016_T-001.md, zdroj originál world.js). Zone tick bezstavový round-robin (zoneIndex=curStep/dist%len, přežije save/load) + processZone vzorce 1:1; frakční automat AISTATES jako data + rng('world') + scheduleInsert (K17); AI-AI bitvy vzorcem (battle.js NEDOTČEN); jednotky reuse upkeep.military (M4a) + recruitUnit command; market.inject beze změny signatur (§8.2). SPLIT ANO: M7a-1(T1 zone+T4 jednotky+T5 trh)/M7a-2(T2 frakce+T3 revolty/questy+T6 UI). G-LISTZONE approximací ~13 zón. Determinismus: jediný stream 'world', re-hydratace static zón z katalogu na load (anti-DR-012-02). tickOrder: world.gatherTributes month order 25
- [ ] T-002: reviewer – Review designu M7a (zone tick determinismus, frakční automat serializovatelný, kontrakt market.inject §8 beze změny signatur, rng 'world' izolovaný, catch-up-safe AI v dávce, soulad s architekturou) + posouzení splitu
- [ ] T-003: tom-proxy – Human gate: schválení M7a designu + splitu (mandát dle DR-013-00, auto-ano v rámci scope)
- [ ] T-004..T-00x: coder – implementační tasky dle schváleného designu/splitu (orchestrátor doplní po T-003: zone tick, jednotky, market.inject napojení; případně frakční AI/revolty/UI pokud bez splitu)
- [ ] T-TEST: tester – Test loop M7a (sada §1.3): determinismus world streamu, zone round-robin přežije save/load, AI automat replay test, catch-up-safe (AI svět v dávce), market.inject kontrakt, jednotky/upkeep, persist round-trip, plné `npm run ci` + `npm run smoke`
- [ ] T-REV: reviewer – Review gate M7a: DoD bod po bodu, kontrakty §8.2 naplněny beze změny signatur, determinismus AI/zone, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-CLOSE: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-REV
- [ ] QA validace (Tester) – T-TEST
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M7a)
- AI svět tiká deterministicky: zóny (round-robin 5day), frakční automat (pokud v M7a-1 scope), jednotky existují + upkeep.
- Trh dostává zónové injekce (market.inject kontrakt z M4b plněn); válčící zóny odčerpávají.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe (AI svět v dávce) nedotčen.
- Reviewer GO.

## Decisions Made This Iteration
- DR-013-00: posun číslování, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-014(M7a), architektura §8.2 (zone tick), §8 (kontrakty), stuby world.js/battle.js (z M2a), katalogy zones.json/military.json (approximované).
- Carry-overy na M9/iter-018+: G-BUILD-TXAUDIT, V1 tech→joby, V2 univ RNG (z M5-2/M6).
- LL-005: monitor 15min hlídá živost agentů.
- Bitvy (battle automat) = M7b/iter-017; M7a staví jednotky+zóny+frakce, M7b je battle automat.
