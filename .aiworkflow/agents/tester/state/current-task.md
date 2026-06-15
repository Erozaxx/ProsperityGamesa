# Current Task

- **Task ID**: T-008
- **Brief**: BRIEF-018-008
- **Iteration**: iter-018
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Dokončeno. Nezávislá QA M7b (battle automat: bitvy live i offline) + DoD M7 komplet.
Verdikt **GO** — všech 11 AC empiricky ověřeno vlastním během. CI 1385/1385, smoke OK, tab Bitva renderuje.

## Předpoklady
- T-004..T-007 implementoval coder (iter-018, M7b T1..T5).
- Scope OUT: žádná změna produkčního kódu.

## Blockery
–

## Checklist (z briefu BRIEF-018-008)
- [x] AC1: `npm run ci` zelené — 1385/1385 pass, 0 fail; smoke OK (tab "Bitva" renderuje, 0 console errors)
- [x] AC2: battleStep replay determinismus — stejný seed → bit-identický průběh; Math.random nepoužit; jednotky reálně bojují
- [x] AC3: Kill-resume bit-identický — save uprostřed bitvy (tick=20) → load → deepStrictEqual; JSON round-trip bez výjimky; F-1 splněno
- [x] AC4: G2 auto-resolve == live — battleTick(live) × 5000 == battleTick(catchup) × 5000; hashState, zones, battleLog identické; QA-CATCHUP-4 batch==incremental
- [x] AC5: Vzorce 1:1 originál — damage/defense/revival tabulkové PASS; M-2 timing warriors tick=60/archers tick=80; M-3 crit 1×/útok; M-1 baseRevival 0.25 fallback
- [x] AC6: Invaze+bandité — startBattle → reálná bitva; armBanditRaid idempotentní; offline summary s bitvami
- [x] AC7: Catch-up-safe — 328 500 kroků (≥1 rok), 50 bitev, no crash, no NaN, hashState finite
- [x] AC8: Persist round-trip — aktivní bitva přežije save/load; battleLog; staré savy guard OK
- [x] AC9: M7b NEROZBIL M7a/M5/M6/M4b — 316+ testů PASS, 1385/1385 CI celkem
- [x] AC10: UI — BattleScreen renderuje; battleCommand tlačítko volá command; žádná logika v UI; SB-1..SB-13 PASS
- [x] AC11: DoD M7 celkově — AI svět+bitvy live i offline; stub nahrazen; invaze/bandité; milník M7 kompletní a hratelný
- [x] QA report: artifacts/final/qa_report_iter-018_T-008.md (verdikt GO — DoD M7)
