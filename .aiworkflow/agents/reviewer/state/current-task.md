# Current Task

- **Task ID**: T-004 (MVP GATE iter-011, DoD M4 = MVP)
- **Brief**: BRIEF-043
- **Iteration**: iter-011 (M4b → MVP)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: MVP GATE iter-011 (DoD M4 = MVP). Ověřeno reálné splnění bodů 1–7 v běžící aplikaci.
Výstup: agents/reviewer/artifacts/final/review_iter-011_T-004_MVPgate.md

## Výsledek
Verdikt: **GO – MVP HOTOVÉ**. Žádný BLOCKER. Žádný re-run.

Ověřeno:
- npm run ci ZELENÉ: tsc 0 err, lint:core OK (52), node --test 762 pass / 0 fail.
- Body 1–7 potvrzeny v reálném kódu (ne jen unit):
  1. PWA: manifest.webmanifest + service-worker.js (cache-first precache) + sw-register.
  2. Engine: SPEED_FACTOR {0,1,2}, DAYS_PER_SEASON=91 (4×91).
  3. M2 populace/housing/food regrese zelená.
  4. M3 forest/field/mine + jobs/skills/workerEfficiency.
  5. Trh: priceOf (marketPrice kubika) + spread 1.35/0.6; buyGoods/sellGoods/sendCaravan
     + caravanReturns; drift k=0.2. Vše registrované v bootstrapEngine + tickOrder.
  6. Idle smyčka uzavřená; MarketScreen napojený (App.js tab 'market', send→dispatch).
  7. Save: catchup + autosave + export/import + persist v2→v3 (marketState+caravan).
- Arbitráž ztrátová (0.444 spread). S-06 flipnuto na pozitivní. crime fix → pay(); grep-gate DA5 ČISTÝ.

## Nálezy
- BLOCKER: žádný.
- SUGGESTION (backlog, neblokuje GO): S-1 qty input + karavana editor (M5),
  S-2 balance kalibrace basePrice/max/driftK (M9), S-3 goods IDs vs design tabulka (K10, zdokumentováno).

## Kód neměněn (scope OUT).
