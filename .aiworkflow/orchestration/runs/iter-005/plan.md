# Iteration Plan: iter-005

- **Created**: 2026-06-13
- **Goal**: M0b – PWA shell + save minimal + benchmark → M0 hotov: „prázdná" hra instalovatelná offline PWA, save/load funguje, cena kroku změřena (synteticky, Q2/A2) a technický strop capu potvrzen/eskalován. Dle master plánu §3/iter-005 (T1–T5).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-005: T1 PWA shell (index.html + app/ bootstrap, rAF, visibilitychange/pagehide, vendorovaný preact+htm, minimální UI čas/sezóna/pauza přes commands), T2 manifest+SW (cache-first, verzovaný precache) + tools/ generátor precache manifestu, T3 IndexedDB save minimal (K1: promise wrapper, stores slots/saves, 1 slot + N=3 generace, lastSimTimestamp, fallback), T4 benchmark ceny kroku (synteticky Node + prohlížeč, report → potvrzení/eskalace capu 8h + D13), T5 navigator.storage.persist() + chybová obrazovka loaderu. Plus .github/workflows CI gate (carry-over SUGGESTION-1) a BUG-001 fix (assertSerializable WeakSet) odložen na M1. Model: Opus.
- [x] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep + PWA artefakty. Model: Sonnet.
- [ ] T-003: tester – Test loop (Sonnet): save round-trip, PWA smoke (install + offline start), determinismus po loadu, benchmark report. Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run): DoD M0 komplet vč. benchmarku; nevyhovující benchmark → eskalace (Worker/cap), ne pokračování. Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Implementace prošla test loop (save round-trip + PWA smoke)
- [x] Benchmark změřen PŘED potvrzením technického stropu capu
- [ ] Review gate GO (= DoD M0)

## Exit Criteria
- Hra instalovatelná a startuje offline; čas/sezóny/save/load/pauza/rychlosti fungují; benchmark změřen před potvrzením capu; CI gate funkční; reviewer GO.
