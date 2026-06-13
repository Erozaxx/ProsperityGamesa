# Benchmark ceny kroku – iter-005 (M0b)

- **Datum**: 2026-06-13 13:20:22
- **Node**: v22.22.2
- **OS/CPU**: linux x64, Intel(R) Xeon(R) Processor @ 2.80GHz (4 cores)
- **Commit**: (viz git log)

## METODIKA

SYNTETICKÝ (Node), prázdný tick + scheduler core (iter-004), 2,000,000 kroků, warmup 200,000.

⚠ A2: NENÍ reálné cílové zařízení (low-end mobil). Reálné potvrzení = uživatel/tester.

Měří: `step(state, ctx)` = calendar + scheduleDue (prázdný/naplněný heap) + 9 no-op periodik + devInvariants.

## VÝSLEDKY

| varianta            | ns/krok       | kroků/s          | catch-up 8h (576,000 kroků) |
|---------------------|---------------|------------------|------------------------------------|
| empty heap          |         567.2 |          1763120 |                   326.7 ms |
| loaded heap (~1k)   |         533.7 |          1873670 |                   307.4 ms |

## VYHODNOCENÍ CAPU (S-02/D10a)

- Technický strop 8 h = 576,000 kroků. Při změřené ceně catch-up trvá ~326.7 ms (empty heap).
- Prahy:
  - Cíl: ≤ 10 000 ns/krok (0,01 ms) → catch-up 8h ≈ ≤ 5 760 ms
  - Varování: 10 000–50 000 ns/krok → 5 760–28 800 ms; zvážit nižší cap nebo Worker
  - Eskalace: > 50 000 ns/krok → > ~29 000 ms na ref. HW → D13 Worker NEBO snížit cap
- **ZÁVĚR**: POTVRDIT cap 8h ✓ (prod. cesta pod cílem 1,500 ns/krok; catch-up 326.7 ms << 5760 ms)

## DOPORUČENÍ D13 (main thread vs Worker)

Main thread OK pokud catch-up dávka < ~1 s na cílovém HW.
Syntetický Node běh dává PŘEDBĚŽNÉ doporučení – závazné až po reálném zařízení.
Aktuální výsledek: main thread dostatečný (synteticky).
