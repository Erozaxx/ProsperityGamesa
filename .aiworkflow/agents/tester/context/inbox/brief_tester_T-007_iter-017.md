# Brief

- **Brief ID**: BRIEF-017-007
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-007 (tester) — plný test loop M7a-2 + **DoD M7a (komplet)**
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-15

## Goal
Nezávislá QA M7a-2 (frakční automat + revolty/questy/tribute + AI-AI bitvy + UI) a ověření, že **celý milník M7a je hotový** (zóny/jednotky/trh z M7a-1 + frakční AI/revolty/questy/UI z M7a-2). Ověřuj EMPIRICKY vlastním během. Přísný na **determinismus frakčního automatu v dávce** (processAI replay, self-rearm, favour migrace — třída DR-012-02) a že M7a-2 nerozbil M7a-1/M5/M6/M4b.

## Co implementováno (T2/T3/T6)
- T2: `processAI` AISTATES 0–7 automat, `armFactionAI` per-faction self-rearm, `registerWorldEffects` + boot, `migrateFavour` (number→{}).
- T3: `processRevolt`, `processQuestGen` (+ acceptQuest/rejectQuest), `gatherTributes` (month), `aiBattleResolve` vzorec.
- T6: WorldZonesScreen + selektory + tab Svět.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail). **`npm run smoke`** OK (tab Svět renderuje, 0 console errors).
2. **processAI replay determinismus (kritické)**: stejný seed → stejné AISTATES přechody frakcí přes N dní; frakce reálně mění state 0–7 (ne tichý no-op). Žádný Math.random/Date.now/DOM v core.
3. **armFactionAI self-rearm (DR-012-02)**: `world.processFaction` entry pro každou frakci se nepodmíněně re-schedulí (nikdy nezmizí); starý save (bez processFaction entries) → armFactionAI doplní per-faction (set-difference, ne scheduleCountOf); idempotentní (víc volání); fresh/plný/částečný schedule.
4. **favour migrace (M7a-1 regrese)**: starý M7a-1 save (favour=number) → load → favour objekt `{}` deterministicky; fresh-vs-load hashState identický; M7a-1 round-trip (m7a-world-t1) nedotčen.
5. **Revolty/questy/tribute deterministické**: revolty (favour-drain) deterministické; questy generování (questSeq, gating settlementLevel+hasMilitary) + accept/reject reálně mění stav; tribute (gatherTributes month) akumuluje→home. Vše rng('world').
6. **AI-AI bitvy vzorcem**: `aiBattleResolve` deterministický (1:1 originál); **battle.js NEDOTČEN**; AI-vs-player → scheduleInsert('startBattle') stub (M7b).
7. **Catch-up-safe (AI svět v dávce)**: dlouhý seedovaný sim (≥1 herní rok) s frakční aktivitou (přechody/revolty/questy/bitvy) v offline dávce → bez crashe, deterministický (stejný seed+čas → stejný hashState), levný. Batch == incremental.
8. **M7a-2 nerozbil M7a-1/M5/M6/M4b**: m7a-world-t1 + m7a2-world-t2 + m5/m6/m4b + G1 (iter005-edge) nedotčené.
9. **Persist round-trip M7a-2 domén**: world.factions (state 0–7), world.quests/questSeq, zone favour (objekt); + M7a-1 domény; staré savy (undefined-guard / migrace).
10. **UI funkční**: WorldZonesScreen renderuje (zóny/frakce/questy); accept/reject quest tlačítko reálně mění stav; žádná logika v UI (deriváty v selektorech).
11. **DoD M7a celkově**: AI svět tiká deterministicky (zóny + frakce mění politiky/útočí + jednotky + napojení trhu); revolty/questy/tribute běží; UI. Milník M7a kompletní a hratelný.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK.
- **Známé gapy (NE bug)**: G-LISTZONE, G-WORLD-DAYEDGE/INJECT-QTY/PERSIST-DERIVED, G-FAVOUR-SHAPE, G-CAPITAL-MISMATCH, G-QUEST-PERSIST — schválené tom-proxy, kalibrace M9. Battle automat hráčských bitev = M7b/iter-018 (netestuj).

## Acceptance Criteria (DoD M7a)
- ci zelené, smoke OK (UI renderuje).
- processAI replay determinismus; self-rearm pro staré savy; favour migrace bez M7a-1 regrese.
- Catch-up-safe (≥1 rok sim s frakční aktivitou); battle.js nedotčen.
- M7a-2 nerozbil M7a-1/M5/M6/M4b; G1 determinismus.
- Verdikt GO/NO-GO (DoD M7a).

## Inputs
- Design: `context/refs/design_iter-017.md`, DR-017-01, DR-016-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-017_T-004..T-006.md`
- Testy: `test/m7a2-world-t2.test.js`, `m7a2-world-t3.test.js`, `ui-selectors-world-t6.test.js`, `m7a-world-t1.test.js`, `iter005-edge.test.js`
- Kód: `src/core/systems/world.js`, `src/core/balance/formulas.js` (aiBattleResolve), `src/core/commands/quests.js`, `src/ui/`, `src/save/`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-017_T-007.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-007 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
