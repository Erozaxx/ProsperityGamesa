# Current Task
- **Task ID**: T-005 (iter-020 M9a — C-020-B Offline cap + Balanc regression)
- **Iteration**: iter-020
- **Status**: done
- **Done**: 2026-06-15
- **Gate**: CI 1550/1550 pass (0 fail, typecheck + lint:core OK), smoke OK (0 console errors). T3 offline cap: capBalanceRealHours=8 (var A) přidán, MINOR-1 vydrátováno (CATCHUP_CAP_MS odvozen z BALANCE přes min(tech,balance), exportován + testován). T4: test/m9a-regression.test.js — kvartální segmenty (81 900 kroků) přes save/load checkpointy (bit-identické, žádný drift), denní sampling (správné cesty MINOR-2: home.food.store/population.total/player.gold), invarianty pop/gold/food/NaN/kolaps, golden-hash checkpointy (3 seedy × 4 kvartály, regenerovatelné REGEN_GOLDEN=1), smoke+plná varianta. home.js:970 evidence zapsána (zamýšlená varianta 0.02+(inoc?0.01:0), original-intended; mechanika v core neexistuje → bez logiky). Determinismus G1 + M-série nedotčené.

## Dílčí checklist
- [x] T3.1 capBalanceRealHours=8 do balance.js (oddělená, provenance+DR komentář)
- [x] T3.2 MINOR-1: CATCHUP_CAP_MS odvozen z BALANCE min(tech,balance), volající přepojen + export
- [x] T3.3 test: cap odvozen z BALANCE (ne literál), min aplikováno, capBalance není no-op
- [x] T4.1 test/m9a-regression.test.js: kvartální segmenty přes save/load checkpointy (smoke+plný)
- [x] T4.2 invarianty křivek (pop 0–10000, gold≥0, food≤maxFood, NaN, kolaps proxy ≤30 dní); cesty MINOR-2
- [x] T4.3 golden-hash checkpointy (verzovaný, regenerovatelný, dokumentace regenerace)
- [x] T4.4 home.js:970 evidence (DR-020-01, komentář v balance.js health; bez logiky — grep=0)
- [x] Gate: npm run ci zelené (1550), npm run smoke OK
