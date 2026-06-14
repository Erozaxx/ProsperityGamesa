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
- [x] T-004: coder – T1 hotový: world.js worldTick (day-index round-robin _absDay, M-1 fix), processZone (ekonomika/politika + M7a-2 stuby), sdílená hydrateZones (fresh+load id-based merge, anti-DR-012-02); createWorldState init zones/factions; zones.json 13 zón+8 aiStates+4 frakce (approximated); home.store persist fix. ci 1131/1131, smoke OK, G1+M5+M6 nedotčen, fresh-vs-load M-2 zelený (3 bugy opraveny cestou)
- [x] T-005: coder – T4 hotový: recruitUnit command (validace, gold cost warrior 1080/archer 1620 z military.json, canAfford+pay, inkrement totWarriors/totArchers) + registerRecruitUnit v bootstrapu; reuse upkeep.military (M4a, žádný duplicit). ci 1163/1163, smoke OK, G1+M5+M6+M7a nedotčen, 32 testů
- [x] T-006: coder – T5 hotový: processZone volá marketInject (produkční +floor(qty*0.1), válčící -warConsumption); signatury §8.2 beze změny; S-06 negativní→pozitivní; pořadí world.tick(30)<market.drift(35) ověřeno. ci 1179/1179, smoke OK, G1+M5+M6+M7a fresh-vs-load+M4b market nedotčen, 16 testů. M7a-1 implementace kompletní
- [x] T-007: tester – Test loop M7a-1 GO: všech 9 AC PASS empiricky (1179/1179, smoke OK). Zone tick se REÁLNĚ tiká (M-1 fix: 12/12 ne-home zón má goldDemand po roce, round-robin 13 zón/13 dní), fresh-vs-load determinismus identický hashState (M-2), catch-up 1 rok 328500 kroků/143ms batch==incremental, market inject +/- clamp, recruitUnit+upkeep korektní, M7a-1 nerozbil M5/M6/M4b (44/44+19/19+62/62+16/16), persist round-trip 12 polí, jediný rng('world')
- [x] T-008: reviewer – Review gate M7a-1 GO; DoD M7a-1 SPLNĚNO. Všech 6 tvrdých invariantů proti kódu (M-1 round-robin reálně tiká _absDay%slot, M-2 sdílená hydrateZones+id-merge bez load-only větve, §8.2 beze změny, battle.js nedotčen, reuse upkeep, jediný rng world). ci 1179/1179. 0 blocker/0 major/4 minor/2 nit. MINOR-1 mrtvý kód calcMilitary/EconomicRating; MINOR-2 goldDemand/goldProduction persist odchylka (chybí DR); MINOR-3/4 homeZone komentář + tickOrder.md STUB drift
- [ ] T-008a: coder – Oprava minor: MINOR-1 odstranit mrtvý calcMilitaryRating/calcEconomicRating (world.js:299-328); MINOR-2 dokumentovat persist odchylku goldDemand/goldProduction (komentář v persistSchema.js + gap G-WORLD-PERSIST-DERIVED proč kvůli M-2 hash stabilitě); MINOR-3/4 opravit zavádějící homeZone komentář (world.js:179) + docs/tickOrder.md world.tick LIVE (ne STUB). Gate: ci zelené, smoke OK, determinismus nedotčen
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
