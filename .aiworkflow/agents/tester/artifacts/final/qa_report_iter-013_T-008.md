# QA Report — iter-013 T-008 (M5-1)

- **Brief**: BRIEF-013-008
- **Tester**: Sonnet (independent QA)
- **Datum**: 2026-06-14
- **Verdikt**: **GO**

---

## Přehled

Nezávislá QA M5-1 (building instances + builder + companies + modifier vrstva K13). Všechny AC ověřeny empiricky vlastním během. Žádné bugy nalezeny — implementace odpovídá designu.

---

## AC-1: `npm run ci` zelené + `npm run smoke` OK

**PASS**

Důkaz:
```
# tests 906
# suites 220
# pass 906
# fail 0
```
`npm run smoke`: exit 0 (HTML renderuje stránku).

Vzrůst testů oproti iter-012: +126 testů (T1: +27, T2: +33, T3: +22, T4: +44).

---

## AC-2: Modifikátory round-trip = IDENTITA (plný hashState)

**PASS**

Empiricky ověřeno 4 scénáři ve vlastním QA skriptu (`tmp/agents/tester/state/qa_empirical_T-008.mjs`):

| Scénář | Výsledek |
|--------|----------|
| A: workerHouse(2) + well(3) + granary(1) → save/load → derived identický | PASS |
| B: firma BrickingBad (masonProvided=1) → round-trip → companyMasonTotal identický | PASS |
| C: save→load→save payload = IDENTITA (deepStrictEqual) | PASS |
| D: hashState klíčové pole derived: state==loadedState | PASS |

**Klíčový důkaz** (scénář C):
- payload1 (před save) = payload2 (po load→save): deepStrictEqual = true
- `derived.maxWorkers` před save == po loadu (rebuildBuildingDerived volán v load Step 5)
- `catalogState.modifiers` (seřazeno): identické bitově po round-tripu

Existing tests T4.6: "ROUND-TRIP hashState: fresh → mutace → save → load → hashState identický" = PASS.

---

## AC-3: Save = jen modifikátory (bez derived/_effCache/_modVersion/effective)

**PASS**

Empiricky ověřeno:
- `payload.home.derived` = `undefined` ✓
- `payload.catalogState._effCache` = `undefined` ✓
- `payload.catalogState._modVersion` = `undefined` ✓
- `payload.catalogState` keys = `["modifiers"]` only ✓
- `JSON.stringify(payload)` neobsahuje `"_effCache"`, `"_modVersion"` ✓

Implementace v `persistSchema.js:52-54`:
```js
if (s.catalogState) {
  payload.catalogState = { modifiers: s.catalogState.modifiers ?? [] };
}
```
`_effCache` a `_modVersion` jsou záměrně vynechány (T4.2 invariant).

Po loadu: `rebuildBuildingDerived` (load Step 5) přepočítá fold → `derived.maxWorkers` identické s před-save hodnotou.

---

## AC-4: Deterministický fold (add→mul→set; 2× set nezávisí na insertion order)

**PASS**

Empiricky ověřeny 3 testy:

| Test | Výsledek |
|------|----------|
| 2× set source=[B(9), A(5)]: order1=B↓A, order2=A↓B → obě = 9 (srcA<srcB → B poslední) | PASS |
| add→mul→set precedence: base=60, add=40→100, ×2→200, set=50 → 50 | PASS |
| add→mul bez set: (60+40)×2 = 200 | PASS |

**Klíčový důkaz** (2× set):
```
s1: mods=[{source:'srcB',value:9},{source:'srcA',value:5}] → v1=9
s2: mods=[{source:'srcA',value:5},{source:'srcB',value:9}] → v2=9
v1===v2 (deterministic sort by (source,id): srcA<srcB → B last → 9)
```

Implementace `cmpModifier` + `fold` v `buildings.js:48-87` — M-3 splněno.

---

## AC-5: Jedna cesta agregátů (lineární růst, bez ×created)

**PASS**

Empiricky ověřeno 3 testy:

| Test | Výsledek |
|------|----------|
| N=1..5 wells, attractiveness=5/inst: values=[5,10,15,20,25], diffs=[5,5,5,5] | PASS (lineární) |
| well×3: effective=15, derived.attractiveness=15 (NE 45=15×3) | PASS |
| workerHouse×4: derived.maxWorkers=20 (NE 80=20×4) | PASS |

**Klíčový důkaz** (no double-count):
```
addBuilding(well, 3) →
  modifier.value = 5*3 = 15  (baked into modifier by addBuildingModifiers)
  effective('well','attractiveness') = 15
  derived.attractiveness = Σ effective(id,'attractiveness') = 15   ← JEDNA cesta
  (NOT 15 × 3 = 45)
```

M-1 invariant splněn: `recalcBuildingAggregates` nikde nenásobí `created`.

---

## AC-6: Catch-up-safe (≥1 herní rok bez crashe, deterministický)

**PASS**

Empiricky ověřeno 3 testy (full `makeCtxFull()` ctx):

| Test | Výsledek |
|------|----------|
| ≥1 herní rok (365 dní = 328 500 kroků) bez crashe, buildings/ageBuildings běží | PASS |
| Same seed (42) × 30 dní × 2 runs → hashState identický (h1=h2) | PASS |
| save→load→run (10 dní) vs direct run (10 dní) → hashState identický | PASS |

**Klíčový důkaz** (determinismus):
```
seed=42, 30 herních dní:
  h1 = 0x88b15bc
  h2 = 0x88b15bc  (identické)

seed=0xDEADBEEF, save→load→run vs direct, 10 dní:
  hashA = hashB  (identické)
```

Poznámka: `home.store` (wood/ore) není v persist schématu — QA test používal výhradně persisted stav (gold + pre-built buildings bez resource cost). Catch-up funguje korektně.

---

## AC-7: Persist round-trip všech nových domén

**PASS**

Empiricky ověřeno 6 testů:

| Doména | Test | Výsledek |
|--------|------|----------|
| buildings | created/totalMade/instances[hp,inRepair] round-trip | PASS |
| projectQueue | in-progress build project pokračuje po loadu (curProgress=5 zachováno) | PASS |
| projectSeq | projectSeq=17 → load → 17 | PASS |
| ownedCompanies | KuttingKorners+StrikeGoldInc → load → obě true, BrickingBad=undefined | PASS |
| catalogState.modifiers | sorted modifiers bitově identické po round-tripu | PASS |
| repair projekt | type=repair, paid=false, curProgress=3 zachovány | PASS |

**Klíčový důkaz** (rozestavěný projekt pokračuje):
```
projectQueue.push({ curProgress: 5, maxProgress: 3, buildingId: 'well' })
save → load → projectQueue.length=1, curProgress=5  ✓
```

---

## AC-8: Determinismus G1 (iter005-edge) nedotčen; no Date.now/Math.random/DOM

**PASS**

Empiricky ověřeno 4 testy:

| Test | Výsledek |
|------|----------|
| `grep -rn "Date.now()" src/core/ --include="*.js"` → 0 non-comment hits | PASS |
| `grep -rn "Math.random()" src/core/ --include="*.js"` → 0 non-comment hits | PASS |
| `grep -rn "document|window|localStorage" src/core/` → 0 non-comment hits | PASS |
| G1: seed=12345, 5 dní × 2 runs → hashState identický; seed=99999 dává jiný hash | PASS |

`iter005-edge.test.js`: 16 testů, 0 fail (G1 determinismus, PWA smoke, benchmark sanity).

---

## AC-9: Build flow e2e

**PASS**

Empiricky ověřeno 5 testů:

| Test | Výsledek |
|------|----------|
| `build({itemId:'well'})` → `home.store.wood` klesl (pay) | PASS |
| build → projekt v frontě (type='build', buildingId='well', paid=true) | PASS |
| buildersProcess → curProgress≥completionUnits → instance++, totalMade++, projekt odstraněn | PASS |
| completeBuild → modifier efekt → derived.attractiveness > 0 | PASS |
| e2e: build→queue→complete→modifier→save→load round-trip | PASS |

**Klíčový důkaz** (e2e instance + modifier):
```
build({itemId:'well'}) → ok=true
project.curProgress = maxProgress*qpd-1  (pre-complete)
buildersProcess() →
  state.home.buildings['well'].created = 1
  state.home.buildings['well'].totalMade = 1
  state.home.projectQueue.length = 0
  catalogState.modifiers.filter(source='building:well').length = 1  (attractiveness:5)
  derived.attractiveness = 5
save→load → derived.attractiveness = 5  (identické)
```

---

## Shrnutí výsledků

| AC | Popis | Verdikt | Klíčový důkaz |
|----|-------|---------|---------------|
| 1 | CI zelené + smoke OK | PASS | 906 tests, 0 fail; smoke exit 0 |
| 2 | Modifikátory round-trip hashState identita | PASS | save→load→save payload deepStrictEqual; derived identický |
| 3 | Save = jen modifikátory | PASS | catalogState keys=["modifiers"], derived absent |
| 4 | Deterministický fold | PASS | 2× set srcB(9)+srcA(5): obě řazení → 9 |
| 5 | Jedna cesta agregátů (lineární) | PASS | well×3: effective=15=aggregate (NE 45) |
| 6 | Catch-up-safe ≥1 rok | PASS | 328500 kroků bez crashe; hashState h1=h2 |
| 7 | Persist round-trip (buildings/queue/seq/companies/modifiers) | PASS | rozestavěný projekt přežije; all domains round-trip |
| 8 | G1 determinismus nedotčen; no DOM/Date.now/Math.random | PASS | grep=0; G1 hash identický |
| 9 | Build flow e2e | PASS | pay→queue→complete→modifier→agregát |

---

## Nalezené problémy

**Žádné bloující bugy.** 

Minor observace (non-blocking, out-of-scope pro M5-1):
- `home.store` (wood/ore/stone) NENÍ v persist schématu — platba za buildings se po save→load "zapomíná". To je pre-existující omezení architektury (pre-M5), nikoli regrese M5-1. Dokumentováno jako test-setup awareness. Není bloker hratelnosti pro M5-1 (buildings cost odečten v momentu build commandu, před save).
- G-BUILD-TXAUDIT (vědomý gap M-4): audit log transakce stavby chybí. Vědomé rozhodnutí, gold se odečítá správně.
- masonProvided napojeno (T4.5/G-BUILDER-MASON) ✓ — dříve odloženo na T4, nyní implementováno.

---

## Verdikt

**GO** — M5-1 splňuje všechny acceptance criteria. Implementace je deterministická, persist je správně omezena na modifikátory (bez derivovaných dat), round-trip hashState je bitově identický, catch-up je safe, G1 nedotčen. Rozestavěné projekty i firmy přežívají save→load. Agregáty rostou lineárně bez dvojího započtení.

---

*Tester: Sonnet (independent QA agent), iter-013 T-008, 2026-06-14*
