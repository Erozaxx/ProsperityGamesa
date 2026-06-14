# Current Task

- **Task ID**: T-002a (iter-017) — Revize designu M7a-2 (zapracování 2 major + 1 minor z reviewer gate REVIEW-017-002)
- **Brief**: context/inbox/brief_architect_T-002a_iter-017.md (BRIEF-017-002a)
- **Iteration**: iter-017 (M7a-2 – Frakční AI & svět ožívá; dokončuje M7a)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Revize T-002a (M-1/M-2/m-4) — platný doc: `artifacts/final/design_iter-017_T-001.md` (in-place)
- **M-1 (favour migrace)**: §3.1 přepsán na přesnou deterministickou migraci number→{} (NE {originalLiege}, §3.1.1 s odůvodněním). Helper `migrateFavour(saved,def)` se závazným pořadím větví. 3 místa: hydrateZones (world.js:377), persistSchema.js:259 (`|| 0`→typeof-object deep-copy guard), zones.json favour:0→{} (13 zón). Povinný fresh-vs-load + starý-save + neprázdný round-trip test (§7.5, 3 body).
- **M-2 (armFactionAI guard)**: §2.4 — set-difference scan `schedule.filter(id==='world.processFaction').params.factionId` je ZÁVAZNÝ kontrakt (ne alternativa). scheduleCountOf NEPOUŽÍT (scheduler.js:82 indexuje jen podle id). Idempotentní při libovolném stavu schedule (fresh/plný/částečný). [už bylo binding v T-001, ověřeno proti kódu]
- **m-4 (quest gating)**: §5.1 — home.level/militaryCouncil.discovered NEEXISTUJÍ (ověřeno) → existující pole: `home.settlementLevel >= questSettlementMin` + `(player.totWarriors+totArchers)>0` proxy pro hasMilitary. Deterministické fresh==load.
- Minor/nit: n-1 (selektor favour `?.player ?? 0` undefined-safe) zapracován.

## Výstup
**`artifacts/final/design_iter-017_T-001.md`** — pokrývá T2/T3/T6 pro Sonnet codera.
Navazuje na M7a-1 design (§3/§4/§16 = základ), dotahuje na implementační úroveň.
Ověřeno proti kódu (world.js processZone/hydrateZones, contracts.js armContractOffer/contractOffer
vzor self-rearm, scheduler.js scheduleInsert/scheduleCountOf, rng.js makeRng 'world', zones.json
aiStates/factions, persistSchema.js world allowlist:24, load.js+createInitialState hydrateZones,
tickOrder.js periodics, App.js/screens.js/selectors.js UI) a originálu (processAI ř.743–991,
redistributeForces ř.636–742, revolt ř.282–369, quest ř.371–487, gatherTributes ř.527–565).

## Klíčová rozhodnutí
- **SPLIT M7a-2 = NE**: T2(L)+T3(M)+T6(M) do jedné iterace. Datová/wiring kostra hotová v M7a-1
  (world.zones/factions/hydrateZones/katalog/BALANCE.world) → M7a-2 jen čte a mutuje, žádný nový L.
  1×L+2×M pod kapacitou (vzor M5-2). DoD M7a se vyhodnotí po iter-017.
- **Frakční automat (T2)**: AISTATES 0–7 přechodová tabulka jako data (zones.json, přepis placeholderů
  na originál semantiku) + deterministická processAI (1:1 originál); Math.random→rng('world');
  Engine.insert→scheduleInsert (K17). Capital = zóna přes faction.capitalId (katalog = zdroj pravdy).
- **Self-rearm (KRITICKÉ, anti-DR-012-02)**: world.processFaction se re-schedulí NEPODMÍNĚNĚ
  (i pod prahem/incapacitated). Boot/load arm přes armFactionAI(state) se set-difference guardem
  (mirror armContractOffer, main.js:199) — ŽÁDNÁ load-only ani init-only větev. faction.state
  persistován = jádro replay-determinismu.
- **AI-AI bitvy = RNG vzorec** (aiBattleResolve ve formulas.js, 1:1 originál ř.952–981); battle.js
  NEDOTČEN. AI-vs-player → scheduleInsert('startBattle') = M7b stub.
- **Revolty**: favour-drain gated revoltMechanicStart; favour = OBJEKT {factionId:number}
  (oprava M7a-1 number, G-FAVOUR-SHAPE, migrace v hydrateZones).
- **Questy**: deterministicky (questSeq, rng 'world'), getGoldValue oceňování, deadlineStep absolutní;
  acceptQuest/rejectQuest commands; world.quests+questSeq do persist (G-QUEST-PERSIST).
- **Tribute výběr**: world.gatherTributes month edge order 25 (před upkeep.military 30); player grant,
  AI capital gold += getGoldValue.
- **UI (T6)**: WorldZonesScreen (mapa zón/frakce/diplomacie/policy/questy panel) + selektory
  (selectWorldZones/Factions/Quests) + tab. Žádná logika v UI; accept/reject přes commands.

## tickOrder dopady
- world.tick (day 30) beze změny pozice — revolt/quest logika dovnitř processZone (gated bloky).
- NOVÉ periodikum world.gatherTributes (month order 25). NOVÉ schedule handlery (registerWorldEffects):
  world.processFaction/takeOver/AIIsAttacking/questExpire + M7b/M8 stuby (startBattle/warning/danger/
  loadImportantEvent). Boot: armFactionAI za armContractOffer.

## Determinismus
- Jediný makeRng(state,'world'); rng závisí jen na perzistovaném state+curStep.
- Idempotentní self-rearm bez load-only/init-only větve (DR-012-02 třída).
- Replay test (stejný seed → stejné AISTATES přechody) + save/load round-trip uprostřed AI aktivity
  (faction.state + schedule entries přežijí, armFactionAI nevloží duplikát) + fresh-vs-load hashState.

## Dílčí checklist
- [x] AGENTS.md + brief + M7a-1 design (§3/§4/§16) + DR-016-01/DR-013-00/DR-012-02
- [x] Architektura iter-002 §8/§8.2 + master plán §3/iter-014 T2/T3/T6
- [x] Kód: world.js, zones.json, scheduler.js, rng.js, contracts.js, persistSchema.js, load.js,
      createInitialState.js, tickOrder.js, main.js, UI; originál world.js (zdroj pravdy)
- [x] Design napsán (T2/T3/T6, determinismus/self-rearm/replay, persist, AI-AI vzorec, split=NE,
      tickOrder + diagram, kontrakty §8 beze změny, 5 alternativ, rizika, gap-list, dekompozice)
- [x] current-task.md → done
- [x] handoff-out.sh T-001

## Blockery
–
