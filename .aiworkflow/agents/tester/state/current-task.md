# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-042
- **Iteration**: iter-011
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M4b/MVP – arbitrážní sanity, tabulkové ceny, drift mean-reversion, catch-up-safe, getGoldValue/marketInject, karavany send+return+save/load, wiring buyGoods/sellGoods/sendCaravan via send(), PLNÝ MVP e2e, migrace v2→v3, DA5 grep-gate.

## Předpoklady
- Produkční kód implementován coderem T-002 (M4b: market.js, buyGoods/sellGoods/sendCaravan, caravan.js, MarketScreen, crime fix, persist v3).
- Scope OUT: žádné změny produkčního kódu – jen nové testy.

## Blockery
–

## Checklist (z briefu iter-011 BRIEF-042)
- [x] npm install && npm run ci ZELENÉ (700 pass před, 762 pass po přidání testů)
- [x] ARBITRÁŽNÍ SANITY: buy→sell NENÍ ziskový (spread 0.6/1.35≈44%), cenový dopad jen zhoršuje
- [x] marketPrice clamp/meze: priceOf tabulkový test (baseline/0/max), buyingPrice×1.35, sellingPrice×0.6
- [x] marketDailyDrift mean-reversion: k=0.2/den, oba směry, clamp, deterministická čísla
- [x] marketDailyDrift catch-up-safe: 50 dní batch == 50× manuální drift
- [x] getGoldValue konzistence: koš×qty, gold 1:1, smíšený koš, cena dynamická
- [x] marketInject pozitivní kontrakt S-06: inject, clamp [0,max], withdraw, no-op neznámé
- [x] buyGoods happy path + clamp + validace edge cases
- [x] buyGoods nedostatek zlata → atomicita (stav nezměněn)
- [x] sellGoods happy path + clamp + nedostatek zboží
- [x] sendCaravan happy path (sentOut=27000, recGoods, zboží odebráno, scheduleInsert)
- [x] sendCaravan busy → {ok:false}, kapacita → {ok:false}
- [x] caravanReturns: grant recGoods (tools+gold), sentOut→0
- [x] caravan round-trip přes save/load uprostřed cesty (sentOut, recGoods, schedule event)
- [x] caravan vrátí se po catch-upu (sendCaravan + advance 30 dní engine)
- [x] WIRING: buyGoods/sellGoods/sendCaravan registrované v bootstrapEngine via send() dispatch
- [x] PLNÝ MVP e2e: fresh boot → marketState init → nákup via send() → save → offline shift → boot znovu → catch-up dopočítá → offlineSummary → drift mění ceny
- [x] migrace v2→v3: marketState={}, caravan default, saveVersion=3
- [x] persist round-trip: marketState+caravan zachovány
- [x] DA5 grep-gate: žádná player.gold = v src/core/systems/
- [x] Verdikt zapsán do artifacts/final/testreport_iter-011_T-003.md
