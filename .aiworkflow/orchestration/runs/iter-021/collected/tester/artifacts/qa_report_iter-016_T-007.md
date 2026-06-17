# QA Report — iter-016 T-007 (M7a-1)

- **Task**: T-007, iter-016, M7a-1
- **Agent**: tester (Sonnet)
- **Datum**: 2026-06-14
- **Verdikt**: **GO**

---

## Executive Summary

M7a-1 (zóny + jednotky + napojení trhu) PASS ve všech 9 AC bodech.

CI: **1179/1179 PASS, 0 FAIL** (zahrnuje 34 T1 + 32 T4 + 16 T5 testů + regrese M5/M6/M4b/G1).
Smoke: OK.
Žádný drift, žádný crash, determinismus potvrzen empiricky (1yr sim, 2× shodný hash, save-load bez driftu).

---

## AC Body — PASS/FAIL + Důkaz

### AC-1: npm run ci zelené (0 fail), npm run smoke OK

**PASS**

```
# tests 1179
# pass 1179
# fail 0
SMOKE OK: app rendered, 0 console errors.
```

Důkaz: `npm run ci` tail output — 1179 testů, 0 fail. `npm run smoke` — "SMOKE OK: app rendered, 0 console errors."

---

### AC-2: Zone tick se REÁLNĚ tiká na day-edge (M-1 fix — ne no-op)

**PASS**

Empiricky ověřeno: po 1 herním roce (365 dní = 328 500 kroků) — všechny 12/12 non-home zón mají nastavené `goldDemand` (processZone se reálně spustil). Dříve byl kód mrtvý (`curStep % dist` na day-edge = prakticky nikdy 0).

**Implementace M-1 opravy** (`world.js:343-359`):
- Používá monotónní `state.season._absDay` (ne `curStep`)
- Gate: `day % slot === 0`, kde `slot = max(1, ceil(5/len))`
- Pro 13 zón: `slot=1` → každý den 1 zóna, všechny za 13 dní

**Round-robin formula test (T1-1, test 3)**:
```
processedIndices.size === len (13) within 13 days → PASS
```

**Empirický důkaz** (1yr sim):
```
[1] Zones with goldDemand: 12/12 non-home zones → ALL PROCESSED
```

---

### AC-3: Fresh-vs-load determinismus (M-2, kritické — DR-012-02)

**PASS**

**Test T1-3-1** (hashState identity):
```
hashState(createInitialState) == hashState(loadAndReconstruct(save(createInitialState)))
→ PASS: hash=2271647577 (oba identické)
```

**Test T1-3-2** (world.zones JSON identická po round-tripu): PASS

**Test T1-3-3** (world.factions identická): PASS

**Test T1-3-4** (round-trip 20 dní, break v den 10, pokračování):
- Přerušený sim = nepřerušený sim → PASS

**Empirický long-sim test** (save-load uprostřed 1yr):
```
[3] Save-load determinism: PASS NO DRIFT
```

**Mechanismus (§8.1.b)**: sdílená `hydrateZones(state)` volaná z fresh i load path. Id-based merge (ne `Object.assign` na pole). Statika re-hydrovaná z katalogu, dynamika ze save. Stale tail zahazován. Persisted: pouze dynamický stav (liege/policy/numWorkers/warriors/archers/resources/tribute/favour/goldStore/notEnoughGold/curQuest + goldDemand/goldProduction pro M-2 hashState stabilitu).

---

### AC-4: Catch-up-safe (AI v offline dávce, ≥1 rok)

**PASS**

Empirický test (1yr = 328 500 kroků):
```
[1] 1yr sim: 143ms. PASS no crash.
[2] Determinism: PASS IDENTICAL (hash=1322127688, hash2=1322127688)
[4] Batch==Incremental (50 days): PASS
[5] Perf: 2 297 203 steps/sec
```

- Žádný crash za 1 herní rok se zónovou aktivitou
- Stejný seed → identický hash (dva nezávislé běhy)
- Batch == incremental (50 dní identické)
- Performance O(1) per tick (max 1 zóna/den round-robin)

---

### AC-5: Napojení trhu — produkční inject (+), válčící drain (−), clamp [0,max], arbitráž

**PASS**

**Empirický test** (s marketInit, goodsId='tools', available=1000, max=2000):

Produkční zóna (liege==originalLiege, resources={tools:1000}):
```
available: 1000 → 1100 (Δ+100 = floor(0.1*1000)) PASS
Clamp ≤ max: PASS
```

Válčící zóna (liege!=originalLiege, available=50):
```
available: 50 → 45 (drain=5=warConsumption) PASS
Clamp ≥ 0: PASS
```

Clamp overflow (inject do blízkosti max):
```
available = max = 2000 (clamped) PASS
```

Clamp underflow (drain z 0):
```
available = 0 (clamped ≥ 0) PASS
```

**Kontrakt §8.2** — signatury `marketInject(state, goodsId, qty)` a `getGoldValue(state, basket)` BEZE ZMĚNY (market.js:103, market.js:91). Potvrzeno grep: žádná změna signatur.

**Arbitráž sanity** (T5-4 z CI): PASS (buy→sell není ziskové po inject).

**S-06 obráceno na pozitivní** (contracts.test.js sekce 4): PASS.

---

### AC-6: Jednotky — recruitUnit, upkeep.military

**PASS**

**recruitUnit empiricky** (persist test):
```
recruitUnit({unitType:'warrior', count:3}) → OK
recruitUnit({unitType:'archer', count:2}) → OK
totWarriors: 3, totArchers: 2
gold: 10000 → 3520 (= 10000 - 3*1080 - 2*1620 = 3520) PASS
```

**Nelze bez gold** (T4-3, 3 testy v CI): PASS.

**upkeep.military** (T4-7, 4 testy v CI, všechny PASS):
- 5 warriors: gold -= 5×108 = 540 ✓
- 3 archers: gold -= 3×162 = 486 ✓
- Combined 10w+5a: gold -= 10×108+5×162 = 1890 ✓
- notEnoughMilitaryFunding při gold=0: set ✓

**balance constants**:
- warriorCost=1080, archerCost=1620 (military.json, BALANCE.army) PASS
- warriorUpkeep=108, archerUpkeep=162 PASS

---

### AC-7: M7a-1 NEROZBIL M5/M6/M4b

**PASS**

Regresní testy po M7a-1:

| Test suite | Výsledek |
|---|---|
| test/m5-buildings-t4.test.js | 44/44 PASS |
| test/m6-tech-roundtrip.test.js | 19/19 PASS |
| test/m4b-market-caravan.test.js | 62/62 (+ m4b) PASS |
| test/iter005-edge.test.js (G1) | 16/16 PASS |

Celkem ze všech suitů: 1179/1179 PASS.

---

### AC-8: Persist round-trip M7a-1 domén

**PASS**

Empirický test (včetně mutace stavu):

| Doména | Výsledek |
|---|---|
| totWarriors (fresh=3, loaded=3) | PASS |
| totArchers (fresh=2, loaded=2) | PASS |
| player.gold (fresh=3520, loaded=3520) | PASS |
| zone.liege (mutated→player, restored) | PASS |
| zone.numWorkers (9999 → 9999) | PASS |
| zone.warriors (111 → 111) | PASS |
| zone.archers (222 → 222) | PASS |
| faction.state (3 → 3) | PASS |
| faction.wantToAttack (true → true) | PASS |
| home.store.ore (500 → 500) | PASS |
| home.store.stone (300 → 300) | PASS |
| home.store.wood (200 → 200) | PASS |
| hashState identity | PASS (hash=2271647577) |

**Staré savy (undefined zones/factions) → hydrateZones z katalogu**:
```
Old save (no zones) → 13 zones rehydrated from catalog PASS
Old save (no factions) → 4 factions rehydrated from catalog PASS
```

Undefined-guard v hydrateZones: `const savedZones = Array.isArray(state.world.zones) ? state.world.zones : [];`

---

### AC-9: Determinismus — jediný rng('world'), žádný Math.random/Date.now/DOM v core

**PASS**

**Grep gate** (`src/core/systems/world.js`, `src/core/commands/recruitUnit.js`):
- `Math.random`: 0 hits (pouze v komentářích v jiných souborech)
- `Date.now`: 0 hits v core
- DOM (document/window): 0 hits v core

**Detailní výsledek**:
```
grep -rn "Math\.random" src/core/systems/ | grep -v "comment" → 0 skutečných volání
grep -rn "Date\.now\(\)" src/core/ → 0 skutečných volání
```

Všechny náhodné volby v `processZone` a `worldTick` přes `makeRng(state, 'world')`.
Jediný world RNG stream, žádný nový stream v M7a-1 (dle design §7.1).

---

## Regresní rizika (pro M7a-2)

1. **hydrateZones** musí být volána i v M7a-2 po všech mutacích lieges (revolt/takeover). Aktuálně je to garantováno (volá se jen při fresh/load, ne per-tick — správně).
2. **RNG stream 'world'** je sdílený pro všechny zónové operace. M7a-2 (processAI) musí pokračovat ve stejném streamu — risk driftu pokud by M7a-2 přidala nový stream nebo resetovala world stream.
3. **goldDemand/goldProduction v persist** — tyto semi-derivované hodnoty jsou persistovány pro M-2 hashState stabilitu. M7a-2 musí toto respektovat pokud mění warriors/archers per-tick.

## Schválené gapy (NEhlásit jako bug)

- **G-LISTZONE**: zóny approximované (provenance:'approximated'), kalibrace M9 — OK
- **G-WORLD-DAYEDGE**: day-index round-robin (ne per-step) — vědomá odchylka, approved
- **G-WORLD-INJECT-QTY**: injectFraction=0.1, warConsumption=5 aproximováno — kalibrace M9 — OK
- **G-RECRUIT-TXAUDIT**: pay() bez ctx — třída G-BUILD-TXAUDIT, akceptováno, audit M9

---

## Verdikt

**GO — M7a-1 (iter-016) splňuje DoD.**

Všech 9 AC bodů: PASS.
CI 1179/1179. Smoke OK.
M5/M6/M4b/G1 nedotčeny.
Determinismus (M-1/M-2) ověřen empiricky.
