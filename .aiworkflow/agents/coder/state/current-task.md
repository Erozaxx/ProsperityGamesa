# Current Task
- **Task ID**: T-007 (iter-018)
- **Iteration**: iter-018
- **Milestone**: M7b — T5 battle UI screen (dokončuje M7b a celé M7)
- **Status**: done
- **Done**: 2026-06-15
- **CI**: 1385 tests, 0 fail (+23 nových: test/ui-selectors-battle-t5.test.js)
- **Smoke**: OK — app rendered, 0 console errors, "Bitva" tab viditelný v renderovaném outputu
- **Determinismus**: G1 + M7b-battle-t1 (37 pass) + M7b-battle-t3 (35 pass) + M7b-battle-t4 (30 pass) + M7a + M5/M6/M4b nedotčené
- **Invarianty**: selectBattle čisté read (pure, bez mutace), BattleScreen pure komponenta (žádná logika v UI), Tab 'battle' přidán do App.js dle vzoru
