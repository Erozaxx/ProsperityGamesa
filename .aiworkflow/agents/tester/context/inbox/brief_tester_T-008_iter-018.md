# Brief

- **Brief ID**: BRIEF-018-008
- **Iteration**: iter-018 (M7b)
- **Task**: T-008 (tester) — plný test loop M7b + **DoD M7 (komplet)**
- **From**: Orchestrator
- **To**: tester (Sonnet)
- **Date**: 2026-06-15

## Goal
Nezávislá QA M7b (battle automat: bitvy live i offline) a ověření, že **celý milník M7 je hotový** (AI svět z M7a + bitvy z M7b). Ověřuj EMPIRICKY vlastním během. Přísný na **determinismus bitvy** (replay, kill-resume, G2 auto-resolve == live — DR-012-02 + catch-up-safe) a že M7b nerozbil M7a/M5/M6/M4b.

## Co implementováno (T1–T5)
- T1+T2: `battleStep` (7-krokový automat), `battleTick` (sub-step), damage/revival vzorce, combat staty, `createBattleState`/`resolveBattleOutcome`/`startBattle`/`banditRaid`.
- T3: `battleCommand` commands.
- T4: banditRaid schedule, battleLog → OfflineSummary.
- T5: BattleScreen + selektory + tab Bitva.

## Scope IN — ověř empiricky
1. **`npm run ci`** zelené (počet + 0 fail). **`npm run smoke`** OK (tab Bitva renderuje, 0 console errors).
2. **battleStep replay determinismus**: stejný seed → bit-identický průběh bitvy přes N kroků; jednotky reálně bojují (damage, casualties, revival). Žádný Math.random/Date.now/DOM v core.
3. **Kill-resume (kritické, DR-012-02)**: save UPROSTŘED bitvy (state.battle running) → load → pokračování **bit-identické** (hashState/deepEqual). `state.battle` plně serializovatelný (JSON round-trip bez výjimky, žádné cyklické/funkční ref).
4. **G2 auto-resolve == live (kritické)**: bitva spuštěná a dohraná v offline catch-up dávce (prázdná queue → obranná AI) dá **identický výsledek** jako live běh stejné bitvy (advance == catchup). Žádná druhá implementace. Ověř, že `battle.tick` (every:'step') běží v catch-up dávce.
5. **Vzorce 1:1 originál**: damage/defense/revival tabulkově vs originál; cd double-decrement (opponent AI 2× za tick, reaction timing warriors tick 60/archers 80); crit rng pevný počet (1×/útok po guardu); baseRevival fallback (0.25, žádný NaN).
6. **Invaze + bandité**: invaze z frakční AI (M7a-2 startBattle) → reálná bitva; banditRaid se naplánuje (idempotentní arm pro staré savy) → bitva; výsledky → offline summary (selectOfflineBattles, battle agregát).
7. **Catch-up-safe**: dlouhý seedovaný sim (≥1 herní rok) s bitvami (invaze/bandité) v offline dávce → bez crashe, deterministický, levný. Bitvy se auto-resolvnou.
8. **Persist round-trip state.battle**: aktivní bitva přežije save/load; battleLog; + M7a/M5/M6 domény; staré savy (state.battle null → undefined-guard).
9. **M7b nerozbil M7a/M5/M6/M4b**: m7a2-world-t2/t3 + m5/m6/m4b + G1 (iter005-edge) nedotčené.
10. **UI**: BattleScreen renderuje (jednotky, akce, log); battleCommand tlačítko volá command (bitva aktivní); žádná logika v UI.
11. **DoD M7 celkově**: AI svět tiká (M7a) + bitvy fungují live i offline auto-resolve (M7b); stuby z M2a (battle.js) plně nahrazeny; invaze/bandité. Milník M7 kompletní a hratelný.

## Scope OUT
- Neopravuj produkční kód. Bug → zapiš + repro, eskaluj. Helper skripty tmp OK.
- **Známé gapy (NE bug)**: G-MILITARY-STATS, baseRevival approx, G-AIBATTLE-DEDUP, G-WORLD-*, G-FAVOUR-SHAPE atd. — schválené tom-proxy, kalibrace M9. Originálové kuriozity (cd double-decrement) jsou ZÁMĚRNÉ (věrnost).

## Acceptance Criteria (DoD M7)
- ci zelené, smoke OK (UI renderuje).
- battleStep replay + kill-resume bit-identický; G2 auto-resolve == live.
- Vzorce 1:1 originál; invaze/bandité fungují; catch-up-safe (≥1 rok).
- M7b nerozbil M7a/M5/M6/M4b; battle.js stub nahrazen.
- Verdikt GO/NO-GO (DoD M7).

## Inputs
- Design: `context/refs/design_iter-018.md`, DR-018-01
- Impl summaries: `agents/coder/artifacts/final/impl_summary_iter-018_T-004..T-007.md`
- Testy: `test/m7b-battle-t1.test.js`, `m7b-battle-t3.test.js`, `m7b-battle-t4.test.js`, `ui-selectors-battle-t5.test.js`, `m7a2-world-t2/t3.test.js`, `iter005-edge.test.js`
- Kód: `src/core/systems/battle.js`, `src/core/balance/formulas.js`, `src/core/commands/battleCommand.js`, `src/ui/`, `src/save/`, originál `battle.js`

## Expected Outputs
- `agents/tester/artifacts/final/qa_report_iter-018_T-008.md` — každé AC PASS/FAIL + důkaz. Verdikt GO/NO-GO.

## Workflow po dokončení
- `agents/tester/state/current-task.md` → done (nebo blocked při NO-GO)
- `bash agents/tester/scripts/handoff-out.sh T-008 "<GO/NO-GO + 1 věta>"`
- NEcommituj (git).
