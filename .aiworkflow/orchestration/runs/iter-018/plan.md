# Iteration Plan: iter-018

- **Created**: 2026-06-15
- **Goal**: M7b – Bitvy: battle automat (battleState + battleStep, sub-step 30ms, cooldowny charge/volley 1:1), damage/revival vzorce, battleCommand + obranná AI (auto-resolve v catch-upu = stejný automat G2), invaze + bandité, battle UI. Naplňuje battle.js stub + startBattle stub z M7a-2. Dle master plánu §3/iter-015(M7b). Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M7b hotový (design_iter-018_T-001.md, zdroj originál battle.js). battleStep signatura beze změny (§8.1); battleTick adaptér akumulátoru (subAccMs+=50, while≥30 battleStep BATTLE_TICK_MS=30); cooldowny 1:1 (charge80/volley120); damage vzorce→formulas.js (battleDamage/Defense/revive, tabulkové); obranná AI auto-resolve. G2 auto-resolve==live STRUKTURÁLNĚ ZADARMO (battle.tick every:'step' → catch-up i live volají stejný step→battleStep, offline=prázdná queue→AI). Kill-resume bit-identický (celý state.battle v save). SPLIT NE. G-MILITARY-STATS approx player staty. startBattleStub→naplnit, banditRaid schedule, resolveBattleOutcome→offline summary. [orig]
- [x] T-002: reviewer – Review designu M7b: GO-s-podmínkami; split NE (souhlas). G2 auto-resolve==live ZADARMO potvrzeno proti kódu (advance+runCatchupBatch→stejný step, battle.tick every:'step' order 30); kill-resume serializovatelnost dosažitelná (full passthrough, žádné closury). 0 blocker/3 major/5 minor/3 nit. M-1 baseRevival neexistuje→fallback z BALANCE; M-2 opponent AI cd dvakrát za tick (port 1:1); M-3 crit rng.next() pevný počet (1×/útok po guardu). Viz DR-018-01
- [x] T-002a: architect – Revize hotová (design §6.1a/§7.3/§4/§8.1a): M-1 baseRevival fallback BALANCE.battle.baseRevivalDefault(0.25 approx, ?? ne ||, pure revivePlayer); M-2 cd double-decrement 1:1 sekvence (cd-- po attackWith každý tick, warriors→archers, guard) + reaction test; M-3 crit rng.next() přesně 1×/útok s focus po guardu; F-1 tabulka zákazu neserializovatelného (žádná cyklická army ref, string liege/lastAttackId, JSON round-trip test). Ověřeno proti kódu/originálu
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (jménem uživatele): bitvy dokončují M7 OK, G2 auto-resolve==live zdarma OK, G-MILITARY-STATS approx OK s pozn. (provenance flag, M9), 1:1 originál port vč. kuriozit OK. Bez eskalace → implementace M7b běží
- [x] T-004: coder – T1+T2 hotový: battle.js battleStep (7-krokový pure automat §8.1 signatura beze změny), battleTick sub-step, createBattleState/resolveBattleOutcome/startBattle/banditRaid; formulas damage/revival (1:1 orig tabulkové), military combat staty, BALANCE.battle. M-1/M-2/M-3/F-1/G2 vyřešeny, kill-resume bit-identický (BR-2). ci 1297/1297, G1+M7a+M5/M6/M4b nedotčen, 37 testů. Hook T3: state.battle.queue; T4: resolveBattleOutcome/startBattle naplněny
- [x] T-005: coder – T3 hotový: battleCommand.js (validace bitva aktivní+side+action, enqueue do queue plain data) + registerBattleCommands v bootstrapu. ci 1332/1332, G1+M7b+M7a nedotčen, 35 testů
- [ ] T-006: coder – T4: invaze + bandité – naplnit startBattleStub (world.js:1189, AI-vs-player invaze z M7a-2 → createBattleState), banditRaid přes schedule, resolveBattleOutcome (mutace zón/inventáře/kapitálů + revival) → výsledky do offline summary (PURE model)
- [ ] T-007: coder – T5: battle UI (commands/progress/log – selektory+commands, žádná logika v UI) + tab; playtest feel poznámky pro M9
- [ ] T-008: tester – Test loop M7b + DoD M7 (sada §1.3): determinismus bitvy replay, kill-resume uprostřed bitvy (save→load bit-identický), auto-resolve catch-up dávka == live (advance==catchup G2 §10.4), tabulkové damage/revival vs originál, cd double-decrement reaction timing, crit rng pevný počet, invaze/bandité, persist state.battle, M7b nerozbil M7a/M5/M6, plné npm run ci + smoke
- [ ] T-009: reviewer – Review gate M7b + DoD M7: kontrakt §8.1 beze změny signatury, determinismus bitvy + G2 auto-resolve == live, serializovatelnost (žádné cyklické/funkční ref v state.battle), 1:1 originál (cd/crit/revival), stuby z M2a plně nahrazeny, derivovaná data se neukládají, tickOrder aktuální (právo re-run)
- [ ] T-010: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → **M7 hotov** (AI svět + bitvy)

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
