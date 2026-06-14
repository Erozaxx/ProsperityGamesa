# Current Task

- **Task ID**: T-009a (iter-015 M6 — oprava M-A double-count researchExp + m-1 tickOrder doc)
- **Brief**: brief_coder_T-009a_iter-015.md
- **Iteration**: iter-015
- **Status**: done
- **Done**: 2026-06-14

## Vysledek
- M-A: research.js opraven — odstraněno dvojité násobení `* bSt.created`; effective() již vrací agregát přes created instance (hodnota 10 pro 2 university, 2 pro 1 academy)
- m-1: docs/tickOrder.md doplněn o `research.daily` (day, order 75) do tabulky i ASCII diagramu
- Test zpřísnění: m6-tech-research.test.js — 2 universities test změněn z `>= 10` na `strictEqual(10)` s opraveným komentářem
- CI: 1097/1097 pass, 0 fail
- smoke: SMOKE OK, 0 console errors
- Determinismus G1: NEDOTČEN
- Round-trip M5-1 (m5-buildings-t4): NEDOTČEN (44/44 pass)
- Round-trip M6 (m6-tech-roundtrip): NEDOTČEN (19/19 pass)
- Precache: NEregenerován (research.js změna je correctness fix, neovlivňuje manifest)
