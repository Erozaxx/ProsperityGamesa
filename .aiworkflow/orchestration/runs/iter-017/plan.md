# Iteration Plan: iter-017

- **Created**: 2026-06-14
- **Goal**: M7a-2 – Frakční AI & svět ožívá: frakční automat (AISTATES 0–7 přechodová fn processAI), revolty/questy/tribute výběr, AI-AI bitvy RNG vzorcem, UI world/zones screen. Dokončuje M7a (DoD M7a se vyhodnotí zde). Dle master plánu §3/iter-014(M7a) T2/T3/T6 + design iter-016 §3/§4/§16. Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M7a-2 hotový (design_iter-017_T-001.md, zdroj originál world.js). processAI automat AISTATES 0-7 (1:1, rng('world'), scheduleInsert); self-rearm determinismus (world.processFaction nepodmíněně re-schedulí + armFactionAI set-difference guard z bootSequence, žádná load-only/init-only větev, faction.state persistován=replay); AI-AI bitvy aiBattleResolve vzorcem (battle.js NEDOTČEN, AI-vs-player→startBattle M7b stub); revolty favour-drain + questy (questSeq/getGoldValue/accept-reject) + gatherTributes month order 25; UI WorldZonesScreen+selektory. POZN: favour number→objekt (G-FAVOUR-SHAPE, migrace hydrateZones). Split NE. [orig]
- [x] T-002: reviewer – Review designu M7a-2: GO-s-podmínkami; split NE (souhlas); self-rearm determinismus OK. 0 blocker/2 major/5 minor/3 nit. M-1 favour migrace by rozbila M7a-1 round-trip (persistSchema.js:259 `||0` + hydrateZones number→objekt {factionId:number}); M-2 armFactionAI guard nesmí spoléhat na scheduleCountOf (indexuje jen podle id, nerozliší frakce) → per-faction guard; m-4 quest gating čte neexistující state pole. Viz DR-017-01
- [x] T-002a: architect – Revize hotová (design §3.1/§2.4/§5.1): M-1 migrateFavour helper number→{} (3 místa: hydrateZones, persistSchema deep-copy guard, zones.json favour {}) + povinný migrační test; M-2 armFactionAI per-faction guard scan dle params.factionId (ne scheduleCountOf – potvrzeno korektní, idempotentní); m-4 quest gating přes existující pole (home.settlementLevel>=questSettlementMin, totWarriors+totArchers>0). Ověřeno proti kódu
- [x] T-003: tom-proxy – Human gate SCHVÁLENO (jménem uživatele): svět ožívá OK, favour migrace na věrnost OK, AI-AI bitvy vzorcem OK, approximace OK s pozn. (sledovat gap-list M9). Bez eskalace → implementace M7a-2 běží
- [x] T-004: coder – T2 hotový [zachráněno – 2 spawny: WIP favour + dokončení jádra]: processAI 8-stavový AISTATES automat (rng('world'), scheduleInsert), processFaction nepodmíněný self-rearm, armFactionAI per-faction guard (params.factionId), registerWorldEffects+boot, migrateFavour number→{}. ci 1192/1192, G1+M7a-1 round-trip nedotčen, favour migrace fresh-vs-load identický, 9 T2 testů. Hook pro T3 (AI-AI/revolty/questy)
- [x] T-005: coder – T3 hotový: processRevolt (favour-drain 1:1 orig), processQuestGen (gating settlementLevel+hasMilitary, questSeq, absolutní deadlineStep), gatherTributes (month order 25), aiBattleResolve vzorec (1:1 orig), quest commands accept/reject. battle.js NEDOTČEN. ci 1227/1227, smoke OK, G1+M7a-1+T2+M5/M6/M4b nedotčen, 35 testů
- [x] T-006: coder – T6 hotový: WorldZonesScreen (zóny/frakce/diplomacie/questy panel accept-reject), selektory selectWorldZones/selectFactions/selectQuests (ratingy/daysLeft/canAccept deriváty), tab 'Svět'. ci 1255/1255, smoke OK (renderuje), G1+M7a-1+T2+T3+M5/M6/M4b nedotčen, battle.js nedotčen, 28 testů. M7a-2 implementace kompletní
- [x] T-007: tester – Test loop M7a-2 GO (DoD M7a komplet): všech 11 AC PASS empiricky (1255/1255, smoke OK tab Svět). processAI replay determinismus (seed→stejný faction.state), armFactionAI self-rearm set-difference (ne scheduleCountOf), favour migrace bez M7a-1 regrese (m7a-world-t1 34/34), catch-up 1 rok 328500 kroků batch==incremental, battle.js nedotčen, 0 regresí (m5/m6/m4b 165/165, G1 16/16). M7a hratelný
- [x] T-008: reviewer – Review gate M7a-2 GO; DoD M7a SPLNĚNO. Determinismus potvrzen proti kódu (processAI 1:1 jediný rng('world'), self-rearm nepodmíněný+set-difference guard ne scheduleCountOf, favour migrace symetrická, battle.js NEDOTČEN ověřeno git). 0 blocker/0 major/4 minor/1 nit. F-1 zones.json favour:0→{} (neškodné, migrateFavour absorbuje); F-2 aiBattleResolve dvojí maintenance→M9; F-3 (N-04) tickOrder.md gatherTributes month 25 chybí
- [ ] T-008a: coder – Oprava minor: F-1 zones.json favour 0→{} (13 zón, kontrakt §3.1.2); F-3 (N-04) docs/tickOrder.md doplnit world.gatherTributes month order 25 + nové schedule handlery (processFaction/takeOver/questExpire). F-2 (aiBattleResolve dedup) → zapsat gap G-AIBATTLE-DEDUP pro M9 (NErefaktorovat determinismus-citlivý processAI teď). Gate: ci zelené, smoke OK, determinismus G1+M7a nedotčen
- [ ] T-009: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → DoD M7a hotovo

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-008
- [ ] QA validace (Tester) – T-007
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M7a komplet)
- Frakční svět ožívá: frakce mění politiky/útočí (AISTATES processAI), revolty/questy/tribute běží, AI-AI bitvy vzorcem.
- UI world/zones screen funkční (mapa, frakce, diplomacie, questy).
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe (AI svět v dávce) nedotčen; battle.js NEDOTČEN (M7b).
- Žádná logika v UI; serializovatelný schedule bez load-only větve; derivovaná data se neukládají.
- Reviewer GO. → **DoD M7a (AI svět tiká deterministicky: zóny + frakce + jednotky + napojení trhu) kompletní.**

## Decisions Made This Iteration
- DR-013-00 / DR-016-01: posun číslování, split M7a-1/M7a-2, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-014(M7a) T2/T3/T6, design iter-016 §3 (frakční automat) / §4 (revolty/questy/tribute/AI-AI) / §16 (odloženo M7a-2), architektura §8.2/§8.
- M7a-1 (iter-016) dodalo zóny/jednotky/napojení trhu; M7a-2 uzavírá M7a frakční AI + UI.
- Bitvy (battle automat hráčských bitev) = M7b/iter-018; M7a-2 AI-AI bitvy jen RNG vzorcem.
- Carry-overy na M9: G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-* (kalibrace).
- LL-005: monitor hlídá živost přes working-tree mtime (ne .output stub); reclaim kontejneru může zabít agenty+monitor (re-dispatch, kód v gitu bezpečný).
