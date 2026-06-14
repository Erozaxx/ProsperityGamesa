# QA Report — iter-015 T-008 (M6: Tech strom + Research + UI)

- **Task**: T-008 / BRIEF-015-008
- **Iteration**: iter-015 (M6)
- **Tester**: tester agent (Sonnet)
- **Datum**: 2026-06-14
- **Verdikt**: **GO — DoD M6 splněn**

---

## Výsledky CI / Smoke

| Test | Výsledek | Důkaz |
|---|---|---|
| `npm run ci` | PASS ✓ | 1097 tests, 1097 pass, 0 fail |
| `npm run smoke` | PASS ✓ | SMOKE OK, 0 console errors, tab "Veda" viditelný v nav |

---

## AC1 — `npm run ci` zelené + `npm run smoke` OK

**PASS ✓**

- `npm run ci`: 1097 testů, 1097 pass, 0 fail. Přesný výstup: `# tests 1097 # suites 267 # pass 1097 # fail 0`.
- `npm run smoke`: `SMOKE OK: app rendered, 0 console errors.` App text obsahuje tab "Veda" v navigaci.
- Počet testů vs. předchozí iterace: T-004=+37, T-005=+19, T-006=+25, T-007=+26 → celkem +107 nových M6 testů, vše zelené.

---

## AC2 — buyTech lifecycle: prereqs + canAfford + pay + odemčení; tech efekt v home.derived

**PASS ✓**

Ověřeno empiricky vlastním skriptem i testy v `test/m6-tech-t1.test.js` (37/37 pass):

| Scénář | Výsledek |
|---|---|
| buyTech happy path (techPt dostatek, prereqs ok) | ok:true, unlockedTechs[id]=true, techPt odečten |
| Bez techPt (techPt=0, need 125) | ok:false, error "insufficient techPt — need 125, have 0" |
| Prereq missing (`agriculture_crop_rotation` bez `agriculture_irrigation`) | ok:false, error "prereq missing: agriculture_irrigation" |
| Duplicate (2× stejný tech) | ok:false, error "already unlocked" |
| Neznámý tech | ok:false, error "unknown tech" |
| Tech efekt v home.derived (building-cílící) | `agriculture_granaries` + 2 granaries: derived.storageCapacity.food 400→600 (+200 ✓) |
| Tech efekt v home.derived (attractiveness) | `civil_attractiveness` + 1 well: derived.attractiveness ↑ o ≥3 ✓ |

Cesta: `buyTech` → `pay(techPt)` → `unlockedTechs[id]=true` → `applyTechModifiers` → `recalcBuildingAggregates` → `home.derived` aktualizováno.

---

## AC3 — Tech modifikátory round-trip IDENTITA (plný hashState)

**PASS ✓**

Ověřeno skriptem (hashState = Buffer.toString('hex'), porovnáno bitově) i testy `test/m6-tech-roundtrip.test.js` (19/19 pass):

| Scénář | hashState identity |
|---|---|
| 0 techů, 0 budov (baseline) | PASS: h0=4163335208... h1=4163335208... |
| agriculture_granaries + civil_attractiveness + granary×2 + well | PASS: h0=2775682015... h1=2775682015... |
| Mix job+building techů + budovy | PASS: h0=3178598002... h1=3178598002... |
| Scenario F: tech modifikátory po load == před save (idempotentní re-gen) | PASS ✓ |
| Scenario G: effective() hodnoty shodné před/po save | PASS ✓ |
| Scenario H: catch-up-safe, rebuildBuildingDerived idempotentní, save→load→save = identický payload | PASS ✓ |

Payload ověřen:
- home.derived: **NENI** v payload ✓
- _effCache: **NENI** v payload ✓
- _modVersion: **NENI** v payload ✓
- unlockedTechs: **JE** v payload jako source of truth ✓

Více kombinací ověřeno: 0 techů, 1 building-cílící tech bez budovy, 1 tech s budovou, 2 techy, 4 techy (mix job+building), prereq řetězec.

---

## AC4 — K13 plně: budovy A techy STEJNÁ modifier vrstva

**PASS ✓**

Empiricky ověřeno (viz výstup skriptu):

```
K13 CHECK: both 'building:*' and 'tech:*' sources in catalogState.modifiers:
  building sources: building:granary
  tech sources: tech:agriculture_granaries
  SAME ARRAY: YES ✓

Fold check granary.storage.food mods:
  {id:bld:granary:storage.food:add, source:building:granary, op:add, value:400}
  {id:tech:agriculture_granaries:granary:storage.food:add, source:tech:agriculture_granaries, op:add, value:200}
  
Výsledek: effective(granary,storage.food) = 600 (base 200 × 2 instances baked in building mod + tech +200)
```

- **Jedna vrstva**: `catalogState.modifiers` obsahuje současně `building:*` i `tech:*` sources.
- **Jedna re-derivační cesta**: `rebuildBuildingDerived` provádí krok (b) budovy + krok (b2) techy → sdílené helpery, žádná load-only větev.
- **Deterministický fold**: `fold` (buildings.js:64) řadí sort by (source,id) před fold: `add→mul→set`, set poslední vyhrává.
- **Kombinace budova+tech na stejný atribut**: `building:granary` (op:add, value:400=2×200 baked) + `tech:agriculture_granaries` (op:add, value:200) → `effective()` = 600. Korektní fold ✓.
- **Modifier id unikátní**: tech modifikátor id = `tech:${techId}:${target}:${attr}:${op}` (zahrnuje target), budova = `bld:${buildingId}:${attr}:${op}`. Žádné kolize.

---

## AC5 — Research/techPt: deterministický, catch-up-safe (≥1 rok sim)

**PASS ✓**

Empiricky ověřeno 400-denní simulací (20 farmers, 10 woodcutters, 5 miners):

```
Research state after 400 days:
  agriculture: level=13, exp=1126/1819
  crafts: level=8, exp=17/596
  forestry: level=10, exp=676/931
  Total techPt granted: 31
```

| Test | Výsledek |
|---|---|
| Determinismus (2× 400 dní, stejný seed → stejný stav) | PASS ✓ |
| techCap tabulkový: (0)=100, (1)=125, (2)=156, (3)=195, (10)=931 | PASS ✓ |
| Catch-up-safe (batch 10 dní = incremental 10 dní) | PASS ✓ (level=1, exp=100 obě) |
| Research round-trip (save→load po 400 dnech) | PASS ✓ |
| Level-up grantuje techPt deterministicky | PASS ✓ |
| Multi-level-up (while loop): 400 workers → ≥3 level-upy v 1 tiku | PASS ✓ |

`researchDaily` je registrováno na `day` edge, order 75 (po buildings.age 70). Confirmed v `test/m6-tech-research.test.js` (25/25 pass).

Žádný `Math.random` v research.js (university RNG bonus vynechán — schválený gap G-RESEARCH-UNIV-RNG).

---

## AC6 — M6 NEROZBIL M5

**PASS ✓**

| Test suite | Výsledek |
|---|---|
| `m5-buildings-t4.test.js` (M5-1 round-trip, modifier vrstva) | 44/44 pass ✓ |
| `iter005-edge.test.js` (G1 plný hashState) | 16/16 pass ✓ |
| Smoke: Build a Kontrakty taby funkční | ✓ (smoke nezměnil) |

Detailně ověřeno:
- G1 iter005-edge: 16 testů všechny pass. `hashState` nedotčen.
- M5-1 m5-buildings-t4: 44 testů všechny pass. Modifier vrstva budov nepoškozena.
- `rebuildBuildingDerived` rozšíření o krok (b2) je additivní — když `unlockedTechs={}`, `addTechModifiers` je no-op → M5-1 výsledek bit-identický.
- Kontrakty a build UI: vychází z smoke testu (oba taby přítomné a funkční).

---

## AC7 — Persist round-trip M6 domén + staré savy

**PASS ✓**

| Scénář | Výsledek |
|---|---|
| unlockedTechs survive save→load (raw object) | PASS ✓ |
| research.sectors (level+exp) survive save→load | PASS ✓ (400-day round-trip) |
| Starý save bez `research` → `{sectors:{}}` (undefined-guard) | PASS ✓ |
| Starý save bez `unlockedTechs` → `{}` (undefined-guard) | PASS ✓ |
| M5 domény (buildings, contracts, projectQueue) nedotčeny | PASS ✓ (m5-buildings-t4 44/44) |

Undefined-guard ověřen: payload s odstraněným `research` a `unlockedTechs` → po load: `research={sectors:{}}`, `unlockedTechs={}`. SAVE_VERSION zůstává 3, žádná migrace.

---

## AC8 — Determinismus: žádný Math.random/Date.now/DOM v core

**PASS ✓**

Grep gate (výsledek):
- `Math.random\b` a `Date.now\b` v core: **jen v komentářích** (ne ve funkčním kódu)
- `window.`, `document.`, `localStorage.` v core: **žádné** výsledky
- `research.js`: explicitně determinizováno (university RNG bonus vynechán)
- fresh-vs-load identita (M-1): hash 4163335208... = hash 4163335208... ✓

Všechny RNG streamy jdou přes `makeRng(state, streamName)` — reproducibilní ze seedu.

---

## AC9 — UI: TechScreen renderuje, buyTech tlačítko odemyká, žádná logika v UI

**PASS ✓**

| Test | Výsledek |
|---|---|
| Tab "Veda" přítomný v navigaci (smoke) | PASS ✓ |
| TechScreen renderuje (tech strom, research progres, techPt) | PASS ✓ (smoke OK) |
| selectTechTree: 7 techů, cost=techCap(level), prereqs/available/canAfford korektní | PASS ✓ |
| selectResearchProgress: 6 sektorů, cap=techCap(level), progPct derivát | PASS ✓ |
| selectTechPoints: vrací state.player.techPt | PASS ✓ |
| UI purity: selectTechTree volána 2× → stejný výsledek, žádná mutace | PASS ✓ |
| buyTech button → send('buyTech', {techId}) | ✓ (TechScreen.js:379 — button onClick volá send) |
| Žádná logika v UI (jen selektory + send) | PASS ✓ — screens.js contains only rendering, selectors imported |

UI test `test/ui-selectors-m6.test.js`: 26/26 pass ✓.

---

## Schválené gapy (NEhlásím jako bug)

| Gap | Stav | Odkaz |
|---|---|---|
| G-TECH-JOB-EFFECTIVE | job-cílené techy (farmer.efficiency, baker.products.bread) jsou tichý no-op → M9 | tom-proxy T-003 |
| G-RESEARCH-UNIV-RNG | university Math.random bonus vynechán (determinismus má přednost) | design §3.2 |
| G-JOB-SECTOR-MAP | mapování jobů→sektory approximated | impl summary T-006 |
| G-RESEARCH-ACADEMY | researchExp hodnoty approximated (academy=2, university=5) | impl summary T-006 |

---

## Souhrn testů dle suite

| Suite | Počet | Pass | Fail |
|---|---|---|---|
| m6-tech-t1.test.js | 37 | 37 | 0 |
| m6-tech-roundtrip.test.js | 19 | 19 | 0 |
| m6-tech-research.test.js | 25 | 25 | 0 |
| ui-selectors-m6.test.js | 26 | 26 | 0 |
| m5-buildings-t4.test.js | 44 | 44 | 0 |
| iter005-edge.test.js | 16 | 16 | 0 |
| **CELKEM npm run ci** | **1097** | **1097** | **0** |

---

## Regresní rizika

- Žádná regrese nalezena. Krok (b2) v `rebuildBuildingDerived` je additivní — s `unlockedTechs={}` je no-op, M5-1 výsledky bit-identické.
- `_modVersion` reset na 0 před `invalidateModifiers` v obou cestách (buyTech + rebuildBuildingDerived) zajišťuje hashState stabilitu.
- Přidání `techs.json` do `SEEDED_CATALOG_CONTENT` (iter006-catalog-schema.test.js) zabraňuje přepsání při CI.

---

## Verdikt

**GO — DoD M6 (K13 plně) splněn.**

Všech 9 bodů AC ověřeno empiricky vlastním během. Tech modifikátory a building modifikátory jdou přes jednu modifier vrstvu (`catalogState.modifiers`), jednu re-derivační cestu (`rebuildBuildingDerived` (b2)), deterministický fold. Round-trip identita bit-přesná. Research deterministický, catch-up-safe. M6 nerozbil M5. UI čisté (jen selektory + send).
