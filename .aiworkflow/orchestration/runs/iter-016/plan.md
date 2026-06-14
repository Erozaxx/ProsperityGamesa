# Iteration Plan: iter-016

- **Created**: 2026-06-14
- **Goal**: M7a-1 – Zóny, jednotky & napojení trhu: zone tick (processZone ekonomika/politika, day-index round-robin), jednotky (recruitUnit, reuse upkeep.military), napojení trhu na zóny (market.inject). Frakční AI + revolty/questy/tribute + UI = M7a-2/iter-017 (split ANO dle DR-016-01). Dle master plánu §3/iter-014(M7a). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M7a hotový (design_iter-016_T-001.md, zdroj originál world.js). Zone tick bezstavový round-robin (zoneIndex=curStep/dist%len, přežije save/load) + processZone vzorce 1:1; frakční automat AISTATES jako data + rng('world') + scheduleInsert (K17); AI-AI bitvy vzorcem (battle.js NEDOTČEN); jednotky reuse upkeep.military (M4a) + recruitUnit command; market.inject beze změny signatur (§8.2). SPLIT ANO: M7a-1(T1 zone+T4 jednotky+T5 trh)/M7a-2(T2 frakce+T3 revolty/questy+T6 UI). G-LISTZONE approximací ~13 zón. Determinismus: jediný stream 'world', re-hydratace static zón z katalogu na load (anti-DR-012-02). tickOrder: world.gatherTributes month order 25
- [x] T-002: reviewer – Review designu M7a: GO-s-podmínkami; split ANO (M7a-1/M7a-2). Determinismus model správný (jediný rng('world'), re-hydratace, bezstavový round-robin). 0 blocker/2 major/3 minor/3 nit. M-1 round-robin day-edge mrtvý (curStep%dist nikdy 0 → zónová ekonomika no-op) → day-index round-robin; M-2 re-hydratace 3 díry (world.zones/factions chybí v createWorldState; generický Object.assign→id-based merge; sdílená hydrateZones bez load-only větve). Viz DR-016-01
- [x] T-002a: architect – Revize hotová (design §2.1/§8.1/§16): M-1 day-index round-robin přes season._absDay (vzorec daysPerZoneSlot=max(1,ceil(5/len)); day%slot===0; zoneIndex=floor(day/slot)%len; bezstavový); M-2 §8.1 createWorldState init zones/factions + sdílená hydrateZones (init+load, žádná load-only větev) + id-based merge + persist/re-hydratace tabulka + fresh-vs-load test; tribute M7a-1 jen akumuluje (výběr M7a-2). Scope zúžen M7a-1 (T1/T4/T5), T2/T3/T6→§16 odloženo
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (bez výhrad): split OK, G-LISTZONE approx OK, G-WORLD-DAYEDGE OK (catch-up tvrdý požadavek, M-1 opravil correctness), AI-AI bitvy vzorcem OK. Bez eskalace → implementace M7a-1 běží
- [ ] T-004: coder – T1: zone tick – worldTick processZone (day-index round-robin přes 5denní periodu, ekonomika/politika vzorci z balance.world), createWorldState init world.zones/factions, sdílená hydrateZones (re-hydratace static zón z katalogu na load, id-based merge, bez load-only větve), G-LISTZONE approximovaný obsah ~13 zón+AISTATES do zones.json, persist (jen dynamický stav zón) + fresh-vs-load test
- [ ] T-005: coder – T4: jednotky – recruitUnit command (warrior/archer z military.json, gold cost), zónové jednotky v persist; reuse existující player.totWarriors/totArchers + upkeep.military (M4a), žádný nový upkeep
- [ ] T-006: coder – T5: napojení trhu na zóny – produkční zóny marketInject(+), válčící odčerpávají(−); kontrakt §8.2 beze změny signatur (negativní test S-06 → pozitivní); worldTick (order 30) před market.drift (35)
- [ ] T-007: tester – Test loop M7a-1 (sada §1.3): determinismus world streamu, zone round-robin se reálně tiká na day-edge + přežije save/load (fresh-vs-load identita), catch-up-safe (zóny v dávce), market.inject kontrakt, jednotky/upkeep, persist round-trip, G1+M5/M6 nedotčeno, plné `npm run ci` + `npm run smoke`
- [ ] T-008: reviewer – Review gate M7a-1: DoD bod po bodu, kontrakty §8.2 beze změny signatur, determinismus zone/re-hydratace (žádná load-only větev), derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-009: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge

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
