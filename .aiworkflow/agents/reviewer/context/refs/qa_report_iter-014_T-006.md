# QA Report — iter-014 T-006 (M5-2 + DoD M5)

- **Report ID**: QA-014-006
- **Iteration**: iter-014 (M5-2)
- **Task**: T-006 (tester)
- **Date**: 2026-06-14
- **QA engineer**: tester (Sonnet)
- **Scope**: Nezávislá QA M5-2 (kontrakty K14 + build UI); DoD M5 celkově
- **Verdikt**: **GO — M5 kompletní a hratelný**

---

## Metodologie

Empirické ověření vlastním během — žádné přebírání tvrzení codera. Všechny testy spuštěny v Node.js prostředí. Kód pročten a chování ověřeno nezávisle. T6 coder agent zemřel před handoffem; práci ověřenu obzvlášť pečlivě (orchestrátor zachránil, ale kód je jeho, ne ověřovatelého).

---

## AC1: npm run ci + npm run smoke

**Výsledek: PASS**

**Důkaz:**
- `npm run ci`: **990/990 pass, 0 fail**, 239 suites, 12,458 ms
- `npm run smoke`: `SMOKE OK: app rendered, 0 console errors`
- Smoke output obsahuje taby "Stavba" a "Kontrakty":
  ```
  PřehledPřírodaPráceDovednostiRadaTrhStavbaKontrakty
  ```
- T5 přidal 51 testů (906→957), T6 přidal 33 testů (957→990)
- G1 (iter005-edge): 16/16 pass
- m5-contracts.test.js: 51/51 pass
- ui-selectors-t6.test.js: 33/33 pass
- m5-buildings.test.js: 126/126 pass

---

## AC2: Kontrakty životní cyklus

**Výsledek: PASS**

**Důkaz (empirický):**

### offer → accept → complete
```
offer generated: contract_0 status: offered
accept result: PASS (status: offered→active, expire scheduled: 1)
complete result: PASS (contract removed: PASS, gold changed: PASS)
```
- `completeContract` volá `applyContractComplete` → `pay(cost)` + `grant(reward)` (transactions.js)
- Atomicita: `canAfford` guard před `applyContractComplete`; pay hází při nedostatku (double-guard)
- techPt reward: `completeContract({cost:{gold:100},reward:{techPt:5}})` → `player.techPt += 5` PASS

### offer → expire
```
contractExpire handler: contract expired and removed: PASS
second expire no-op: PASS (idempotentní — findContract vrátí undefined)
```
- Handler: `c.status !== 'active'` → return (guard M52-R2)
- Expire po `completeContract` (orphaned v heapu): no-op PASS

### reject
- `rejectContract({'offered'})` → removes from queue PASS
- `rejectContract({'active'})` → removes from queue PASS
- Vše přes command vrstvu (dispatch), ne imperativní háčky
- `onComplete/onExpire/onReject` = string-ID v datech (`{effect:'contract.complete'}`) — K14 PASS

---

## AC3: B2 re-arm (KRITICKÉ)

**Výsledek: PASS — všechny 3 scénáře ověřeny empiricky**

**Empirický test B2:**
```
Fresh state contract.offer in schedule: 0
contract.offer in saved payload schedule: 0
Restored old save offers in schedule: 0        ← starý save
contractQueue: []  contractSeq: 0
After arm - offers in schedule: 1              ← arm PŘIDAL offer PASS

M5-2 save contract.offer in schedule: 1        ← M5-2 save
M5-2 restored offers in schedule: 1
M5-2 after arm (should still be 1): 1          ← arm = no-op PASS
```

**Idempotence:**
```
fresh arm: 1 offer
after 2 more arms: 1 (idempotentní — scheduleCountOf guard) PASS
```

**Implementace:** `armContractOffer(state)` v `contracts.js:262`:
- Guard: `scheduleCountOf(state,'contract.offer') === 0` → insert (jinak no-op)
- Voláno v `bootSequence` hned za `marketInit` (main.js:193)
- Deterministické: `step = Math.max(state.engine.curStep, BAL.firstOfferStep)`, žádný RNG/Date při armování
- m5-contracts.test.js sekce 11 "armContractOffer B2 re-arm": 6/6 PASS

---

## AC4: Determinismus

**Výsledek: PASS**

**Důkaz:**

### contract offer deterministický
```
same seed → same queue: PASS
same seed → same contractSeq: PASS
```

### rng stream 'contracts' izolovaný (G1)
```
G1 other streams untouched: PASS
Streams ['population','forest','mine','field','market','world','battle','events','buildings']
→ všechny shodné i po volání contract.offer (PASS)
```
- Implementace: `makeRng(state, 'contracts')` — izolovaný stream, STREAM_NAMES na konci (rng.js)
- iter005-edge.test.js (G1 fullHashState): 16/16 PASS, hash nedotčen

### contractQueue/contractSeq round-trip identita
```
hash round-trip: PASS (hash1 === hash2 po save/load)
```
- applyPersist → loadAndReconstruct → hashState: identický PASS

---

## AC5: Catch-up-safe (≥1 herní rok)

**Výsledek: PASS**

**Důkaz:**
```
1 year sim (365 * 900 = 328,500 steps): no crash PASS
offers generated: 24  (BALANCE.offerPeriodDays=15 → ~24/rok, realistické)
catch-up determinism (same seed+steps): PASS (hashState shodný)
```
- contract.offer = schedule one-shot re-schedulující se → v catch-up odpálí přesně tolikrát, kolikrát má
- contract.expire = one-shot na absolutní `deadlineStep` → deterministický v batch
- Žádný per-step polling (na rozdíl od originálu), žádný Date.now/Math.random/DOM v core
- Catch-up test v m5-contracts.test.js sekce 13: 2/2 PASS

---

## AC6: Persist round-trip

**Výsledek: PASS**

**Důkaz:**

### contractQueue/contractSeq přežijí save/load
```
m5-contracts.test.js sekce 10 "persist round-trip": 6/6 PASS
- contractQueue přežije save/load: PASS (id/status identické)
- contractSeq přežije: PASS (seq=7 → restored seq=7)
- contract.expire v schedule přežije: PASS (contractId identické)
- canComplete/daysLeft NEJSOU v save (deriváty): PASS
```

### schedule eventy přežijí
```
contract.offer v M5-2 save: 1 event → loaded: 1 event PASS
contract.expire po acceptu: 1 event → loaded: 1 event, contractId identické PASS
```
- engine.schedule + scheduleCount jsou v persistu (persistSchema.js:59-64) — automaticky

### M5-1 domény (buildings/projectQueue/ownedCompanies/modifiers)
- m5-buildings.test.js: 126/126 PASS (iter-013 T-008 ověřeno; T-006 neregresovalo)
- SAVE_VERSION = 3: PASS (schema.js a ověřeno empiricky: `state.meta.saveVersion === 3`)

### Starý save (bez contractQueue)
```
loadAndReconstruct(oldSave bez contractQueue/contractSeq):
contractQueue: [] (z createHomeState.js) PASS
contractSeq: 0 PASS
```
- undefined-guard v load.js:203-211 (precedent projektu load.js:189)

---

## AC7: Build UI funkční (B1)

**Výsledek: PASS**

**Důkaz:**

### Build command registrován (B1)
```
build dispatch (unknown item → non-unknown-command error): PASS
registerBuild(creg) voláno v bootstrapEngine (main.js:106) — B1 fix
```

### Build reálně staví (zdroje odečteny, projekt do fronty)
```
Building builderHut cost: {"wood":30}
build result: PASS
wood deducted: PASS (999999 -> 999969)
project in queue: PASS
project: builderHut type: build progress: 0%
```
- `home.store.wood` odečteno o 30 PASS
- Projekt v `projectQueue` s `type:'build'` PASS

### selectBuildableBuildings — selektor s canAfford a scaledCost
```
selectBuildableBuildings count: 6
buildings s canAfford/cost via scaleCostByCount PASS
Žádná herní logika v UI — jen selektory PASS
```

### buyCompany z UI
```
buyCompany: KuttingKorners canAfford: true owned: false
buyCompany result: PASS
```

### ContractsScreen accept/reject/complete reálně mění stav
```
accept via dispatch: PASS (status: offered→active)
canComplete: true, daysLeft: 15 (deriváty v selektoru, ne v UI) PASS
complete via dispatch: PASS (queue empty) PASS
reject via dispatch: PASS (queue empty) PASS
```

### Žádná logika v UI
- `canComplete` a `daysLeft` = deriváty v `selectContracts` (selectors.js:363-382): PASS
- Screeny jen volají `send(commandType, params)` — PASS
- Komponenty nedrží herní stav (pouze Preact `useState` pro aktivní tab) — PASS

---

## AC8: SAVE_VERSION kompatibilita

**Výsledek: PASS**

**Důkaz:**
```
SAVE_VERSION: 3 PASS (src/save/schema.js: export const SAVE_VERSION = 3)
state.meta.saveVersion === 3 PASS
```
- Žádná migrace nových polí — undefined-guard v load.js/persistSchema.js
- Starý v3 save se načte bez chyby: PASS (viz AC6)

---

## AC9: DoD M5 celkově

**Výsledek: PASS — M5 kompletní a hratelný**

**Summary:**

| Oblast | Stav | Důkaz |
|---|---|---|
| Budovy stavba (M5-1 T1) | PASS | m5-buildings 126/126 |
| Builder capacity/scaling (M5-1 T2) | PASS | builderHut → maxActiveProjects=1; build PASS |
| Builder companies (M5-1 T3) | PASS | buyCompany PASS, selectBuilderCompanies PASS |
| Modifikátory K13 (M5-1 T4) | PASS | modifier fold round-trip; G1 nedotčen |
| Kontrakty K14 (M5-2 T5) | PASS | lifecycle+persist+determinism 51/51 |
| Build UI + ContractsScreen (M5-2 T6) | PASS | selectors 33/33; screens renderují; B1 build reálně staví |
| B1 registerBuild | PASS | main.js:106 wired; build command dostupný |
| B2 armContractOffer | PASS | starý save → arm → 1 offer; M5-2 → no-op |
| G1 determinismus | PASS | hashState round-trip; stream izolace; 16/16 |
| SAVE_VERSION = 3 | PASS | žádný bump; starý save se načte |
| Catch-up ≥1 rok | PASS | 328,500 steps bez crashe; deterministický |
| Smoke UI tabs | PASS | Stavba+Kontrakty renderují bez console error |

**Celkový test count:** 990/990 pass, 0 fail

---

## Nálezy / Poznámky

### Drobnosti (neblokující)

1. **`selectBuildableBuildings` canAfford závisí na `home.store`, ne `player.inventory`**: resources (wood/ore) jsou v `home.store`. `player.inventory` je pro goods/zboží. Toto odpovídá architektuře, ale je neintuitivní. Neblokující.

2. **`ContractsScreen` — onReject pro aktivní kontrakt**: rejectContract funguje i pro `status:'active'`, ačkoli design zmiňuje primárně `status:'offered'`. Funguje správně, edge case ošetřen. PASS.

3. **T6 byl zachráněn orchestrátorem (T6 coder zemřel před handoffem)**: CI 990/990, smoke OK, ui-selectors-t6 33/33 — kód je funkční. Neprokázány žádné funkční problémy.

4. **`contract.offer` pro starý save (B2)**: správně ověřeno — fresh state (`scheduleCountOf = 0`) potřebuje arm; M5-2 save (`scheduleCountOf = 1`) nepotřebuje. V mém prvním testu byl bug v setupu testu (arm byl volán před save), ne v kódu. Kód je správný.

### Scope OUT (nezkoumáno)
- M6+ content (ximniTrader, marbleSeller, mercenaryForHire, houseBuilder, mineBuilder kontrakty)
- cancelProject command (gap G-BUILD-CANCEL)
- emitTx audit pro contract pay/grant (gap G-BUILD-TXAUDIT, known design decision)

---

## Verdikt

### GO — M5 kompletní a hratelný

Všechnych 9 AC **PASS**. 990/990 testů zelených. Smoke OK. B2 re-arm funguje deterministicky pro starý i nový save. Build UI reálně staví (B1 wired). ContractsScreen accept/reject/complete mění stav. G1 determinismus nedotčen. SAVE_VERSION = 3. Catch-up ≥1 rok bez crashe. Milník M5 splňuje DoD.
