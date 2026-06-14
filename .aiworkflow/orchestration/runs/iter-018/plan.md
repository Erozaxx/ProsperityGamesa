# Iteration Plan: iter-018

- **Created**: 2026-06-15
- **Goal**: M7b – Bitvy: battle automat (battleState + battleStep, sub-step 30ms, cooldowny charge/volley 1:1), damage/revival vzorce, battleCommand + obranná AI (auto-resolve v catch-upu = stejný automat G2), invaze + bandité, battle UI. Naplňuje battle.js stub + startBattle stub z M7a-2. Dle master plánu §3/iter-015(M7b). Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M7b hotový (design_iter-018_T-001.md, zdroj originál battle.js). battleStep signatura beze změny (§8.1); battleTick adaptér akumulátoru (subAccMs+=50, while≥30 battleStep BATTLE_TICK_MS=30); cooldowny 1:1 (charge80/volley120); damage vzorce→formulas.js (battleDamage/Defense/revive, tabulkové); obranná AI auto-resolve. G2 auto-resolve==live STRUKTURÁLNĚ ZADARMO (battle.tick every:'step' → catch-up i live volají stejný step→battleStep, offline=prázdná queue→AI). Kill-resume bit-identický (celý state.battle v save). SPLIT NE. G-MILITARY-STATS approx player staty. startBattleStub→naplnit, banditRaid schedule, resolveBattleOutcome→offline summary. [orig]
- [ ] T-002: reviewer – Review designu M7b (battle automat deterministický+serializovatelný, kill-resume, auto-resolve catch-up == live G2, kontrakt §8.1, rng('battle') izolovaný, napojení startBattle z M7a-2) + posouzení splitu
- [ ] T-003: tom-proxy – Human gate: schválení M7b designu + splitu (mandát dle DR-013-00, auto-ano v rámci scope)
- [ ] T-004..T-00x: coder – implementační tasky dle schváleného designu/splitu (orchestrátor doplní po T-003: battle automat, damage vzorce, battleCommand+obranná AI, invaze/bandité, UI)
- [ ] T-TEST: tester – Test loop M7b (sada §1.3): determinismus bitvy (replay), kill-resume uprostřed bitvy, auto-resolve v catch-up dávce = stejný automat, tabulkové damage testy vs originál, invaze/bandité, persist round-trip state.battle, M7b nerozbil M7a/M5/M6, plné `npm run ci` + `npm run smoke`
- [ ] T-REV: reviewer – Review gate M7b: DoD bod po bodu, kontrakt §8.1 dodržen, determinismus bitvy + auto-resolve, stuby z M2a plně nahrazeny, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-CLOSE: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → **M7 hotov** (battle automat live i offline)

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-REV
- [ ] QA validace (Tester) – T-TEST
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M7b = DoD M7 komplet)
- Pozdní hra funguje: invaze, bitvy live (battleCommand) i offline auto-resolve (stejný automat G2); battleState serializovatelný (kill-resume).
- Stuby z M2a (battle.js) + startBattle z M7a-2 plně nahrazeny.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 (replay bitvy) + catch-up-safe nedotčen.
- Reviewer GO. → **DoD M7 (AI svět + bitvy) kompletní.**

## Decisions Made This Iteration
- DR-013-00 / DR-016-01: posun číslování, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-015(M7b), architektura §8.1 (battle automat), battle.js stub (kontrakt §8.1 z M2a), startBattle stub z M7a-2 (world.js:1083/1189), military.json (jednotky bez combat statů).
- M7b naplňuje poslední stub z M2a (battle.js) → M7 hotov.
- Carry-overy na M9: G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS (kalibrace bitev).
- LL-005 (monitor živost přes working-tree mtime), LL-006 (duplicitní spawny – ověřuj working tree, ne tvrzení; TaskStop redundantní agenty).
