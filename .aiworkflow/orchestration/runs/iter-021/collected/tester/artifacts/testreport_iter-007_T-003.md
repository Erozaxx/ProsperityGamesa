# Test Report – iter-007 T-003 (M2a)

- **Verdikt**: **PASS**
- **Task**: T-003, iter-007
- **Autor**: tester (Sonnet)
- **Datum**: 2026-06-13
- **Brief**: BRIEF-026

---

## Výsledky CI

| Krok | Výsledek |
|------|---------|
| `npm install` | OK |
| `tsc --noEmit` | 0 errors |
| `lint:core` (grep gate) | 32 files checked, OK (žádný DOM/Date.now/Math.random v core) |
| `node --test` | **460 pass, 0 fail** (bylo 411 před T-003; přidáno 49 nových testů) |

---

## S-05 Catch-up-safe invariant – KLÍČOVÝ TEST

**Verdikt: PASS – všechny systémy catch-up safe**

### Metodika
Pro každý scénář: stav A (live) vs. stav B (batch). Oba startují z identického seedu a stavu. Stav A je spuštěn `for i in range(N): step()`, stav B je spuštěn `runBatch(N)` v jednom cyklu. Výsledek: `hashState(A) == hashState(B)`.

### Výsledky

| Test | N kroků | Hash shoda | Systémy |
|------|---------|-----------|---------|
| Smoke – 1 krok | 1 | PASS | všechny |
| 1 den (900 kroků) | 900 | PASS | population/housing/food/health/crime |
| 2 dny (1800 kroků) | 1800 | PASS | food/health/crime |
| 5 dní (4500 kroků) | 4500 | PASS | quarterly/daily edges |
| 31 dní (~27900 kroků) | 27900 | PASS | spoilage (month edge crossing) |
| migrationAcc – 450 kroků | 450 | PASS | population accumulator bez float drift |
| RNG streamy – 900 kroků | 900 | PASS | všechny RNG streamy identické |
| Disease lifecycle – 3 dny | 2700 | PASS | diseaseActive/diseaseDaysLeft |
| Determinismus (seed→hash) | 4500 | PASS | celá simulace |
| curStep increments | 100 | PASS | engine |

**Per-system isolace:**
| System | N kroků | Hash shoda |
|--------|---------|-----------|
| population.migration | 1800 | PASS |
| food.spoilage (month crossing) | 31500 | PASS |
| crime.level | 2700 | PASS |

---

## Persist Round-trip per doména

**Verdikt: PASS**

| Doména | Pole | Výsledek |
|--------|------|---------|
| population | total, migrationAcc, bornTotal, diedTotal | PASS |
| housing | counts (deriváty NEJSOU v payload) | PASS |
| food | store | PASS |
| health | diseaseActive, diseaseDaysLeft | PASS |
| crime | level | PASS |
| migrace v1 | chybějící home pole doplněna factory defaulty | PASS |
| full round-trip | N kroků → save → load → continue → hash match | PASS |

---

## Tx invarianty

**Verdikt: PASS**

| Test | Výsledek |
|------|---------|
| no NaN po pay/grant sequence | PASS |
| gold nikdy záporné po pay | PASS |
| atomicita: neúspěšný pay nezmutuje stav | PASS |
| NaN v cost → throw | PASS |
| NaN v grant → throw | PASS |
| txEvent pro pay: záporná amount, cause, step (explicitní) | PASS |
| txEvent pro grant: kladná amount, cause, step (explicitní) | PASS |
| canAfford false při nedostatku | PASS |
| canAfford true při dostatku | PASS |
| crime gold loss nikdy záporné | PASS |

**Poznámka k txEvent API**: `pay(state, cost, cause, ctx, step)` a `grant(state, prod, cause, ctx, step)` přijímají `step` jako 5. argument (default 0). Testy předávají `state.engine.curStep` explicitně – API je správné a konzistentní s návrhem §7.2 (opt-in observer přes ctx.emitTx).

---

## Kontraktní testy §8 (S-05, S-06)

**Verdikt: PASS (z T-002b + T-003)**

| Kontrakt | Výsledek |
|---------|---------|
| battleStep determinismus – prázdná bitva | PASS |
| round-trip state.world/state.battle | PASS |
| schedule s AI eventem přežije save/load | PASS |
| S-06 NEGATIVNÍ: world.js neobsahuje goldValue | PASS |
| S-06 NEGATIVNÍ: world.js neobsahuje market.inject | PASS |
| worldTick behavioral spy – žádné tx world-cause | PASS |

---

## Edge testy

**Verdikt: PASS**

| Test | Výsledek |
|------|---------|
| Hladovění → úmrtí (starvation deaths per formula) | PASS |
| Populace nikdy záporná po hladovění | PASS |
| Přesnost: floor(starved * 0.001) per meal | PASS |
| Přeplnění bydlení – migrace omezena kapacitou | PASS |
| Přeplnění bydlení – porodnost omezena kapacitou | PASS |
| Tent (null capacity) – neomezený růst | PASS |
| Housing full: 3 dny, populace nepřekročí max | PASS |

---

## Invarianty po N krocích (žádné NaN/záporné)

**Verdikt: PASS**

| Scénář | Výsledek |
|--------|---------|
| 1 den, dostatek jídla | PASS |
| 5 dní, nedostatek jídla (starvation) | PASS |
| 20 dní, velká populace (potenciální epidemie) | PASS |

---

## PWA Smoke kumulativní

**Verdikt: PASS**

| Test | Výsledek |
|------|---------|
| 100 kroků bez pádu | PASS |
| 1800 kroků (2 dny) bez pádu | PASS |
| curStep finite integer po 5000 krocích | PASS |
| save/load/continue 3× cyklus | PASS |

---

## Determinismus gate

**Verdikt: PASS**

- Stejný seed → identický hash po 5 dnech (dvě nezávislá spuštění) **PASS**
- Různé seedy → různé hashe **PASS**

---

## Nové testové soubory

| Soubor | Testy | Popis |
|--------|-------|-------|
| `test/catchup-invariant.test.js` | 13 | S-05 catch-up safe invariant, per-system isolace, deterministmus |
| `test/edge-m2a.test.js` | 36 | Starvation, housing overflow, persist round-trip, tx invarianty, NaN guards, PWA smoke, determinismus gate |

**Celkem přidáno: 49 testů** (z 411 na 460)

---

## Regresní rizika

1. **catch-up invariant** závisí na deterministickém pořadí systémů v tickOrder.js – pokud se změní pořadí bez aktualizace `docs/tickOrder.md`, hash se zlomí.
2. **txEvent step** – volající musí explicitně předat `state.engine.curStep`; systémy v M3+ by měly propagovat step přes ctx.
3. **food fair-share** – allowDeficit sémantika; jakákoliv změna consumeFood algoritmu změní hashe catchup testů.
4. **BALANCE konstanty** jsou approximated (disease/crime/housing) – balanční kalibrace M9 změní hashe, ale ne invariant.

---

## Recommendation

**Go** – všechny acceptance criteria splněny. M2a je catch-up safe, persist round-trip zelený, žádné NaN/záporné zásoby, kontrakty §8 splněny včetně S-06. CI zelené (460/460).
