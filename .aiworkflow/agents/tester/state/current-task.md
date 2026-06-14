# Current Task

- **Task ID**: T-007
- **Brief**: BRIEF-017-007
- **Iteration**: iter-017
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Dokončeno. Nezávislá QA M7a-2 (frakční automat + revolty/questy/tribute + AI-AI bitvy + UI) + DoD M7a.
Verdikt **GO** — všech 11 AC empiricky ověřeno vlastním během. CI 1255/1255, smoke OK, catch-up deterministický.

## Předpoklady
- T4/T5/T6 implementoval coder (iter-017, T2+T3+T6).
- Scope OUT: žádná změna produkčního kódu (1 tmp helper test přidán pro QA).

## Blockery
–

## Checklist (z briefu BRIEF-017-007)
- [x] AC1: `npm run ci` zelené — 1255/1255 pass, 0 fail; smoke OK (tab "Svět" renderuje, 0 console errors)
- [x] AC2: processAI replay determinismus — stejný seed → stejný faction.state; frakce reálně mění state; žádný Math.random/Date.now/DOM v core
- [x] AC3: armFactionAI self-rearm (DR-012-02) — set-difference guard, idempotentní, fresh/plný/částečný schedule, po save/load
- [x] AC4: favour migrace (M7a-1 regrese) — number→{} deterministicky; fresh-vs-load hashState identický; M7a-1 round-trip nedotčen
- [x] AC5: Revolty/questy/tribute deterministické — favour-drain, gating, trigger, decay; questSeq, accept/reject mění stav; gatherTributes player+AI
- [x] AC6: AI-AI bitvy vzorcem — aiBattleResolve deterministický (1:1 originál); battle.js NEDOTČEN; startBattle stub
- [x] AC7: Catch-up-safe — 1 rok sim bez crashe, deterministický, batch==incremental; QA-CATCHUP-1..5 PASS
- [x] AC8: M7a-2 NEROZBIL M7a-1/M5/M6/M4b — m7a-world-t1+m7a2-world-t2+t3+m5/m6/m4b+G1 PASS
- [x] AC9: Persist round-trip M7a-2 domén — world.factions state 0–7, world.quests/questSeq, zone favour objekt; staré savy
- [x] AC10: UI — WorldZonesScreen renderuje; accept/reject quest tlačítka; selektory čisté, žádná logika v UI
- [x] AC11: DoD M7a celkově — AI svět tiká deterministicky; revolty/questy/tribute; UI; milník kompletní a hratelný
- [x] QA report: artifacts/final/qa_report_iter-017_T-007.md (verdikt GO — DoD M7a)
