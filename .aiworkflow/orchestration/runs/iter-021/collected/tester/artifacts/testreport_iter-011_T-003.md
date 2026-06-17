# Test Report – iter-011 T-003 (M4b → MVP)

- **Verdikt**: **PASS**
- **Datum**: 2026-06-13
- **Autor**: tester (Sonnet)
- **Brief**: BRIEF-042
- **Model**: claude-sonnet-4-6

---

## Shrnutí

| Metrika | Hodnota |
|---|---|
| CI před testováním | 700 pass, 0 fail |
| CI po přidání testů | **762 pass, 0 fail** |
| Nové testy přidány | **62 testů** (20 describe bloků) |
| Verdikt | **PASS** |
| Doporučení | **Go** |

---

## CI výsledky

```
npm run ci (celý pipeline):
- tsc: 0 errors
- lint:core: OK (52 files)
- node --test: 762 pass, 0 fail
```

Nový soubor: `test/m4b-market-caravan.test.js` (62 testů)

---

## Výsledky po skupinách

### TC-01: ARBITRÁŽNÍ SANITY (KLÍČOVÝ TEST) ✅ 3/3 PASS
- buy 100 tools → sell 100 tools: gold klesne (ztráta ~55%), ztráta/nákup > 40%
- sell/buy ratio ≈ 0.444 (= 0.6/1.35) pro všechny 5 komodit
- Velký nákup cloth (800/1000 dostupných) → cenový dopad → stále ztrátový

**Závěr**: okamžitý nákup→prodej je vždy ztrátový díky spreadu 0.6/1.35≈44.4%. Arbitráž NELZE.

### TC-02..04: marketPrice clamp/meze ✅ 7/7 PASS
- priceOf(tools) při baseline (available=1000, max=2000, basePrice=25): 25.0 ✓
- priceOf(tools) při available=0: 84.375 (horní mez (1.5)^3 × 25) ✓
- priceOf(tools) při available=max: 3.125 (dolní mez (0.5)^3 × 25) ✓
- buyingPrice = priceOf × 1.35 (2dp) ✓
- sellingPrice = priceOf × 0.6 (2dp) ✓
- priceOf nikdy < 0 ✓
- priceOf neznámé → 0 (graceful) ✓

### TC-05: marketDailyDrift mean-reversion ✅ 5/5 PASS
- Po 1 dni: posun přesně o 20% rozdílu k baseline (deterministické) ✓
- Funguje v obou směrech (available > baseline → klesá) ✓
- Clamp [0, max] ✓
- No-op při available == baseline ✓
- Tabulkový test 3 dny: 0→50→90→122 (gems, baseline=250) ✓

### TC-06: marketDailyDrift catch-up-safe ✅ 1/1 PASS
- 50 dní přes engine batch == 50× manuální marketDailyDrift (deterministické, < 0.01 tolerance) ✓

### TC-07: getGoldValue konzistence ✅ 5/5 PASS
- tools×10 → 10 × priceOf ✓
- gold 1:1 ✓
- Smíšený koš (gold + goods) = součet ✓
- Prázdný koš → 0 ✓
- Dynamická: mění se s available ✓

### TC-08: marketInject kontrakt S-06 ✅ 5/5 PASS
- inject +500: zvýší available ✓
- inject clamp na max ✓
- withdraw (−qty): sníží available ✓
- withdraw clamp na 0 ✓
- no-op pro neznámé goodsId (nevyhodí) ✓

### TC-09: buyGoods happy path + clamp ✅ 7/7 PASS
- gold klesne o totalCost, inventory +qty, available −qty ✓
- clamp: nákup > available → available = 0 (ne záporné) ✓
- validace: prázdné goodsId → {ok:false} ✓
- validace: neznámé goodsId → {ok:false} ✓
- validace: qty=0 → {ok:false} ✓
- validace: qty záporné → {ok:false} ✓
- validace: qty desetinné → {ok:false} ✓

### TC-10: buyGoods atomicita ✅ 1/1 PASS
- Nedostatek zlata → {ok:false}, gold nezměněn, inventory nezměněn ✓

### TC-11: sellGoods happy path + clamp ✅ 2/2 PASS
- gold +totalGain, inventory −qty, available +qty ✓
- clamp: prodej → available nesmí překročit max ✓

### TC-12: sellGoods nedostatek zboží ✅ 2/2 PASS
- Prázdný inventář → {ok:false} ✓
- qty > owned → {ok:false} ✓

### TC-13: sendCaravan happy path ✅ 3/3 PASS
- sentOut = 27000 (= 900 × (30-0)), recGoods naplněno ✓
- scheduleInsert: caravanReturns na step curStep+27000 ✓
- expenditures < 0: čistý příjem v recGoods.gold ✓

### TC-14: sendCaravan busy ✅ 1/1 PASS
- sentOut > 0 → {ok:false, error obsahuje 'cestě'} ✓

### TC-15: sendCaravan kapacita ✅ 1/1 PASS
- buy > 10000 → {ok:false} ✓

### TC-16: caravanReturns ✅ 2/2 PASS
- grant tools+gold, sentOut→0, recGoods→{} ✓
- Prázdné recGoods: no-op, žádná chyba ✓

### TC-17: caravan round-trip save/load ✅ 3/3 PASS
- sentOut+recGoods přežije applyPersist→loadAndReconstruct ✓
- engine.schedule (caravanReturns event) přežije save/load ✓
- Karavana se vrátí po 30 dnech engine advance (caravanReturns fired) ✓

### TC-18: WIRING přes send() ✅ 4/4 PASS
- buyGoods registrovaný v bootstrapEngine (ne 'unknown command') ✓
- sellGoods registrovaný ✓
- sendCaravan registrovaný ✓
- dispatch funguje přes manuální creg ✓

### TC-19: PLNÝ MVP e2e ✅ 4/4 PASS
- **TC-19a Fresh boot**: marketState init (5 komodit), send('buyGoods') funkční ✓
- **TC-19b Idle smyčka**: engine den projde, drift mění ceny (tools available → cena klesá) ✓
- **TC-19c Save/load**: marketState+caravan přežijí, available zachován ✓
- **TC-19d Offline catch-up**: bootSequence po 5min offline → catch-up dopočítá kroky, offlineSummary existuje, drift proběhl (gems.available > 50) ✓

**Idle smyčka funguje**: populace jí, produkce běží, daně, drift trhů – vše bez chyby.

### TC-20: migrace v2→v3 ✅ 3/3 PASS
- v2→migrate: marketState={}, caravan default, saveVersion=3 ✓
- SAVE_VERSION == 3 ✓
- Existující marketState zachován (idempotentní) ✓

### TC-21: persist round-trip ✅ 2/2 PASS
- marketState (modified available) přežije applyPersist→loadAndReconstruct ✓
- caravan (sentOut, recGoods) + schedule event přežijí ✓

### TC-22: grep-gate DA5 ✅ 1/1 PASS
- Žádná přímá mutace `player.gold =` v `src/core/systems/*.js` ✓
- crime.js používá `pay(state, {gold:goldLoss}, 'crime:loss', ctx, step)` ✓

---

## Bugs nalezené

**Žádné bugy.** Všechny AC splněny.

Poznámky:
- Goods katalog používá IDs tools/cloth/gems/spice/silk (ne wood/ore) – K10 ID collision avoidance. Design spec zmiňoval wood v tabulce, ale impl note dokument vysvětluje důvod. Testy jsou psány dle skutečného katalogu.
- DR-011-A (buyGoods/sellGoods bez ctx): vědomé rozhodnutí, karavanReturns má ctx a emituje txEvent.

---

## Regresní rizika

- **R-M1 (Mrtvé UI)**: ošetřeno TC-18 (registrace commandů) + existující BLOCKER-1 testy.
- **R-M2 (Prázdný katalog)**: TC-19a ověřuje init 5 komodit.
- **R-M3 (kind:goods)**: TC-09 ověřuje grant do inventory (goods handler).
- **R-M5 (caravanReturns neregistrovaný)**: TC-17c ověřuje advance 30 dní → vrátí se.
- **R-M6 (S-06 flip)**: contracts.test.js (existující, upraveno coderem).
- **R-M7 (drift přeteče mez)**: TC-05 clamp test.

---

## Recommendation: **Go**

Všechna acceptance criteria splněna:
- (a) Hráč může koupit i prodat zboží s živou cenou ✓
- (b) buy→sell NENÍ zisk ✓ (TC-01 arbitrážní sanity)
- (c) Karavana odjede a vrátí se ✓ (TC-17c)
- (d) getGoldValue ocení koš ✓ (TC-07)
- (e) Vše přežije save/load i offline catch-up ✓ (TC-17, TC-19c, TC-19d)
- (f) Grep-gate čistý ✓ (TC-22)

MVP gate kritéria ověřena. Idle smyčka uzavřena. iter-011 M4b/MVP = **PASS**.
