# Current Task

- **Task ID**: T-008a (iter-016 M7a-1 — hygiena: 4 minor z review gate)
- **Brief**: brief_coder_T-008a_iter-016.md
- **Iteration**: iter-016
- **Status**: done
- **Done**: 2026-06-14

## Checklist
- [x] MINOR-1: calcMilitaryRating/calcEconomicRating odstraněny (grep src/ = 0 callerů; ~39 ř. mrtvého kódu odstraněno)
- [x] MINOR-2: komentář v persistSchema.js vysvětlující PROČ goldDemand/goldProduction persistovány + G-WORLD-PERSIST-DERIVED zapsán do gap-report.json (severity low, M9, provenance derived)
- [x] MINOR-3: komentář world.js ř.179 opraven (mirror → "NOT mirrored in M7a-1, deferred to M7a-2")
- [x] MINOR-4: docs/tickOrder.md world.tick STUB → LIVE (M7a-1: day-index round-robin processZone + marketInject); ASCII diagram stub → round-robin
- [x] precache.js regen (gap-report.json ovlivňuje manifest)
- [x] CI: 1179/1179 PASS, 0 fail
- [x] Smoke: SMOKE OK
- [x] Determinismus: m7a-world-t1 34/34 PASS, G1+M7a nedotčeny

## Výsledek
- Mrtvý kód: calcMilitaryRating/calcEconomicRating ODSTRANĚNY (39 ř.)
- Persist dokumentace: komentář + gap G-WORLD-PERSIST-DERIVED přidány
- Komentář homeZone opraven dle reality (mirror neimpl. v M7a-1)
- tickOrder.md aktualizován: STUB → LIVE
- Gate: ci 1179/1179 PASS, smoke OK, determinismus nedotčen
