# Current Task

- **Task ID**: T-005 (iter-015 M6 T2 — dotažení & zatvrzení tech modifikátor determinismu)
- **Brief**: brief_coder_T-005_iter-015.md
- **Iteration**: iter-015
- **Status**: done
- **Done**: 2026-06-14

## Výsledek
- CI: 1046/1046 pass, 0 fail (+19 nových testů)
- smoke: SMOKE OK, 0 console errors
- Determinismus G1: ✅ (iter005-edge.test.js 16/16)
- Round-trip M5-1: ✅ (m5-buildings-t4.test.js 44/44)
- Round-trip s techy (m6-tech-roundtrip.test.js): 19/19 ✅ BIT-IDENTICKÝ
- Persist↔re-gen konzistence: ověřeno — idempotentní, žádné duplikáty, žádný drift
- Catch-up-safe s techy: ✅
