# Benchmark ceny kroku – iter-005 (M0b)

- **Datum**: 2026-06-13 07:38:03
- **Node**: v22.22.2
- **OS/CPU**: linux x64, Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores)
- **Commit**: (viz git log)

## METODIKA

SYNTETICKÝ (Node), prázdný tick + scheduler core (iter-004), 2,000,000 kroků, warmup 200,000.

⚠ A2: NENÍ reálné cílové zařízení (low-end mobil). Reálné potvrzení = uživatel/tester.

Měří: `step(state, ctx)` = calendar + scheduleDue (prázdný/naplněný heap) + 9 no-op periodik + devInvariants.

## VÝSLEDKY

| varianta            | ns/krok       | kroků/s          | catch-up 8h (576,000 kroků) |
|---------------------|---------------|------------------|------------------------------------|
| empty heap          |          72.1 |         13876580 |                    41.5 ms |
| loaded heap (~1k)   |          61.3 |         16304482 |                    35.3 ms |

## VYHODNOCENÍ CAPU (S-02/D10a)

- Technický strop 8 h = 576,000 kroků. Při změřené ceně catch-up trvá ~41.5 ms (empty heap).
- Prahy:
  - Cíl: ≤ 10 000 ns/krok (0,01 ms) → catch-up 8h ≈ ≤ 5 760 ms
  - Varování: 10 000–50 000 ns/krok → 5 760–28 800 ms; zvážit nižší cap nebo Worker
  - Eskalace: > 50 000 ns/krok → > ~29 000 ms na ref. HW → D13 Worker NEBO snížit cap
- **ZÁVĚR**: POTVRDIT cap 8h ✓ (empty heap pod cílem 10,000 ns/krok; catch-up 41.5 ms << 5760 ms)

## DOPORUČENÍ D13 (main thread vs Worker)

Main thread OK pokud catch-up dávka < ~1 s na cílovém HW.
Syntetický Node běh dává PŘEDBĚŽNÉ doporučení – závazné až po reálném zařízení.
Aktuální výsledek: main thread dostatečný (synteticky).
