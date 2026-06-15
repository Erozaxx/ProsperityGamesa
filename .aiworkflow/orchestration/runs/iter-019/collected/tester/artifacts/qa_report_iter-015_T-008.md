# QA Report — iter-015 T-008 (M6: Tech strom + Research + UI)

- **Task**: T-008 / BRIEF-015-008
- **Iteration**: iter-015 (M6)
- **Tester**: tester agent (Sonnet) — nezávislá QA, vlastní empirický běh
- **Datum**: 2026-06-14
- **Verdikt**: **GO — DoD M6 (K13 plně) splněn**

---

## Výsledky CI / Smoke

| Test | Výsledek | Důkaz |
|---|---|---|
| `npm run ci` | PASS ✓ | 1097 tests, 1097 pass, 0 fail |
| `npm run smoke` | PASS ✓ | SMOKE OK, 0 console errors, tab "Veda" viditelný v nav |

---

## AC1 — `npm run ci` zelené + `npm run smoke` OK

**PASS ✓**

Empiricky ověřeno vlastním během:

```
# tests 1097
# suites 267
# pass 1097
# fail 0
# duration_ms 12897.916589
```

`npm run smoke`: `SMOKE OK: app rendered, 0 console errors.` App text obsahuje tab "Veda" v navigaci.

Počet testů vs. základ: T-004=+37, T-005=+19, T-006=+25, T-007=+26 → +107 nových M6 testů, vše zelené.

---

## AC2 — buyTech lifecycle: prereqs + canAfford + pay + odemčení; tech efekt v home.derived

**PASS ✓**

Ověřeno empiricky vlastním skriptem (`/tmp/qa_empirical3.mjs`) i testy v `test/m6-tech-t1.test.js` (37/37 pass):

| Scénář | Výsledek |
|---|---|
| buyTech happy path (`agriculture_irrigation`, techCap(0)=100) | ok:true, unlockedTechs[id]=true, techPt: 1000→900 ✓ |
| Bez techPt (techPt=0, need 100) | ok:false, error "insufficient techPt" ✓ |
| Prereq missing (`agriculture_crop_rotation` bez prereq) | ok:false, error "prereq missing: agriculture_irrigation" ✓ |
| Duplicate (2× stejný tech) | ok:false, error "already unlocked" ✓ |
| Neznámý tech (`fake_tech_xxx`) | ok:false, error "unknown tech" ✓ |
| Prereq chain: unlock prereq → pak unlock child | ok:true (techPt deducted techCap(1)=125) ✓ |
| Tech efekt v home.derived (`agriculture_granaries` + granary) | storage.food: 200→400 (+200 přes effective()) ✓ |
| Tech efekt v home.derived (`civil_attractiveness` + well) | attractiveness ↑ +3 ✓ |

Cesta: `buyTech` → `pay(techPt, techCap(level))` → `unlockedTechs[id]=true` → `applyTechModifiers` → `recalcBuildingAggregates` → `home.derived` aktualizováno.

---

## AC3 — Tech modifikátory round-trip IDENTITA (plný hashState)

**PASS ✓**

Ověřeno vlastním skriptem (bit-přesné porovnání hashState) i testy `test/m6-tech-roundtrip.test.js` (19/19 pass):

| Scénář | hashState identity |
|---|---|
| 0 techů, 0 budov (baseline) | PASS: identické ✓ |
| `agriculture_granaries` + granary + `civil_attractiveness` + well | PASS: BIT-IDENTICKÉ ✓ |
| 7 techů (vč. prereq chain) + 2 budovy | PASS: BIT-IDENTICKÉ ✓ |
| Idempotentní re-gen (addTechModifiers 2×) | PASS: žádné duplikáty ✓ |
| effective() hodnoty shodné před/po save | PASS ✓ |
| save→load→save: payload identický (Scenario H) | PASS ✓ |

Payload ověřen:
- `home.derived`: **NENÍ** v payload ✓
- `_effCache`: **NENÍ** v payload ✓
- `_modVersion`: **NENÍ** v payload ✓
- `unlockedTechs`: **JE** v payload jako source of truth ✓
- `storageCapacity`: **NENÍ** v payload (jen v modifiers/unlockedTechs) ✓

Detailní kód: `applyTechModifiers` a krok (b2) v `rebuildBuildingDerived` volají tytéž helpery (`removeAllTechSourcedModifiers` + `addTechModifiers`) → jediná implementace tech fold logiky. `_modVersion` se resetuje na 0 před `invalidateModifiers` v obou cestách → hashState stabilní.

---

## AC4 — K13 plně: budovy A techy STEJNÁ modifier vrstva

**PASS ✓**

Empiricky ověřeno vlastním skriptem:

```
Building modifier (source='building:granary', attr='storage.food', op='add', value=200):
  → v catalogState.modifiers ✓

Tech modifier (source='tech:agriculture_granaries', attr='storage.food', op='add', value=200):
  → ve STEJNÉM catalogState.modifiers ✓

SAME ARRAY: YES ✓ (bldMods.length=1 + techMods.length=1 = allMods.length=2)

fold(200_base, [building:add+200, tech:add+200]) = 600
  Krok add: 200 + 200 + 200 = 600; krok mul: žádný; krok set: žádný
  effective('granary','storage.food') = 600 ✓
  (base granary 200, building mod +200 = 2 instances baked, tech mod +200)
```

- **Jedna vrstva**: `catalogState.modifiers` obsahuje současně `building:*` i `tech:*` sources.
- **Jedna re-derivační cesta**: `rebuildBuildingDerived` krok (b) budovy + krok (b2) techy → sdílené helpery.
- **Deterministický fold**: `fold` (buildings.js:64) řadí sort by (source, id) před fold: add→mul→set.
- **Kombinace budova+tech na stejný atribut**: fold korektní, žádné přepsání, add sčítají ✓.
- **K13 round-trip BIT-IDENTICKÝ**: hashState před/po save→load shodné ✓.

---

## AC5 — Research/techPt: deterministický, catch-up-safe (≥1 rok sim)

**PASS ✓**

Empiricky ověřeno vlastním 365-denním skriptem (`/tmp/qa_research_365.mjs`):

```
Research state after 365 days (20 farmers + 10 woodcutters + 5 miners):
  agriculture: level=13, exp=426
  forestry:    level=10, exp=326
  crafts:      level=7,  exp=319
  techPt granted: 30
```

| Test | Výsledek |
|---|---|
| Research produkuje techPt (365 dní) | PASS: +30 techPt ✓ |
| Agriculture level ≥1 (level-up přes techCap) | PASS: level=13 ✓ |
| Determinismus (2× 365 dní → identický výsledek) | PASS ✓ |
| techPt deterministic | PASS ✓ |
| techCap(0)=100, (1)=125, (2)=156, (3)=195, (10)=931 | PASS ✓ |
| Research round-trip (365-day save→load) | PASS: BIT-IDENTICKÉ ✓ |
| Agriculture sektor persisted po load | PASS: level/exp zachováno ✓ |
| Catch-up-safe: 1×30workers == 3×10workers | PASS: totalExp identický ✓ |

`researchDaily` registrováno na `day` edge, order 75 (po `buildings.age` order 70). Potvrzeno v `test/m6-tech-research.test.js` (25/25 pass) a `tickOrder.js` řádky 219-220.

Žádný `Math.random` v `research.js` (G-RESEARCH-UNIV-RNG: schválený gap).

---

## AC6 — M6 NEROZBIL M5

**PASS ✓**

| Test suite | Výsledek |
|---|---|
| `m5-buildings-t4.test.js` (M5-1 round-trip, modifier vrstva) | 44/44 pass ✓ |
| `m5-buildings-t1.test.js` + `t2` + `t3` | 82/82 pass ✓ |
| `m5-contracts.test.js` (kontrakty lifecycle) | 51/51 pass ✓ |
| `iter005-edge.test.js` (G1 plný hashState) | 16/16 pass ✓ |
| Smoke: Build + Kontrakty + Veda taby | ✓ (smoke OK) |

Detailně ověřeno:
- G1 iter005-edge: 16 testů, vše pass. `hashState` nedotčen.
- M5-1 m5-buildings-t4: 44 testů, vše pass. Modifier vrstva budov nepoškozena.
- `rebuildBuildingDerived` krok (b2) je additivní — s `unlockedTechs={}`, `addTechModifiers` je no-op (M-2 guard: `hasCatalog('techs')` + `if(!tech)continue`) → M5-1 výsledek bit-identický.

---

## AC7 — Persist round-trip M6 domén + staré savy undefined-guard

**PASS ✓**

| Scénář | Výsledek |
|---|---|
| `unlockedTechs` survives save→load (raw plain object) | PASS ✓ |
| `research.sectors` (level+exp) survive save→load (365-day) | PASS ✓ |
| Starý save bez `research` → `{sectors:{}}` (undefined-guard) | PASS ✓ |
| Starý save bez `unlockedTechs` → `{}` (undefined-guard) | PASS ✓ |
| M5 domény (buildings, contracts, projectQueue) nedotčeny | PASS ✓ (m5-buildings-t4 44/44) |

Undefined-guard implementace: `load.js:95-99` — generický loop přes `PERSIST_SCHEMA.player` s `if (payload.player[field] !== undefined)`. `createPlayerState()` inicializuje `unlockedTechs:{}` a `research:{sectors:{}}` → starý save s chybějícím polem zůstane na defaultu. SAVE_VERSION=3, žádná migrace.

Payload keys ověřeny: `unlockedTechs` je přítomno; `research` je přítomno; deriváty (`storageCapacity`, `_effCache`, `_modVersion`, `progPct`) nejsou.

---

## AC8 — Determinismus: žádný Math.random/Date.now/DOM v core

**PASS ✓**

Grep gate (vlastní ověření bez komentářů):

```bash
grep "Math.random(" src/core/systems/research.js src/core/commands/buyTech.js src/core/systems/buildings.js
→ 0 výsledků ✓ (žádné volání Math.random ve funkčním kódu)
```

- `research.js`: explicitně determinizováno, žádný `Math.random(` call ✓
- `buyTech.js`: žádný `Math.random(` ✓
- `buildings.js`: žádný `Math.random(` ✓ (jen komentáře zmiňující eliminaci)
- Žádný `document.`, `window.` v core M6 souborech ✓

fresh-vs-load identita (DR-012-02):
- 0 techů, 0 research: hashState identický ✓
- s techy + 100 dní research: hashState identický ✓

---

## AC9 — UI: TechScreen renderuje, buyTech tlačítko odemyká, žádná logika v UI

**PASS ✓**

| Test | Výsledek |
|---|---|
| Tab "Veda" v navigaci (smoke) | PASS ✓ |
| TechScreen renderuje bez chyb | PASS ✓ (smoke OK, 0 console errors) |
| `selectTechTree`: 7 techů (flat list), cost=techCap(level), prereqs/available/canAfford ✓ | PASS ✓ |
| `selectResearchProgress`: 6 sektorů, cap=techCap(level), progPct derivát | PASS ✓ |
| `selectTechPoints`: vrací state.player.techPt | PASS: pts=400 po buyTech za 100 od 500 ✓ |
| buyTech button → `send('buyTech', {techId})` v `TechScreen` | ✓ (screens.js řádek 379) |
| UI purity: žádná herní logika v UI (jen selektory + send) | PASS ✓ |

UI test `test/ui-selectors-m6.test.js`: 26/26 pass ✓.

`TechScreen` grupuje flat list techů do `Map` dle `t.sector` interně — selektory zůstávají čisté (vracejí flat list s `sector` polem).

---

## Schválené gapy (NEhlásím jako bug — dle brief BRIEF-015-008)

| Gap ID | Popis | Schválení |
|---|---|---|
| G-TECH-JOB-EFFECTIVE | job-cílené techy (farmer.efficiency, baker.products.bread) = tichý no-op; jobsProduction nečte přes effective() → M9 | tom-proxy T-003 |
| G-RESEARCH-UNIV-RNG | university Math.random scholar bonus vynechán (determinismus); doplnění = M9 | design §3.2 |
| G-JOB-SECTOR-MAP | mapování jobů→sektory approximated | impl summary T-006 |
| G-RESEARCH-ACADEMY | researchExp hodnoty approximated (academy=2, university=5); kalibrace M9 | impl summary T-006 |

---

## Souhrn testů dle suite (empiricky ověřeno)

| Suite | Počet | Pass | Fail |
|---|---|---|---|
| `m6-tech-t1.test.js` | 37 | 37 | 0 |
| `m6-tech-roundtrip.test.js` | 19 | 19 | 0 |
| `m6-tech-research.test.js` | 25 | 25 | 0 |
| `ui-selectors-m6.test.js` | 26 | 26 | 0 |
| `m5-buildings-t4.test.js` | 44 | 44 | 0 |
| `m5-buildings-t1.test.js` | 25 | 25 | 0 |
| `m5-buildings-t2.test.js` | 27 | 27 | 0 |
| `m5-buildings-t3.test.js` | 30 | 30 | 0 |
| `m5-contracts.test.js` | 51 | 51 | 0 |
| `iter005-edge.test.js` | 16 | 16 | 0 |
| **CELKEM `npm run ci`** | **1097** | **1097** | **0** |

---

## Regresní rizika

- Žádná regrese nalezena. Krok (b2) v `rebuildBuildingDerived` je additivní — s prázdným `unlockedTechs={}`, `addTechModifiers` je no-op (M-2 guard: `if(!hasCatalog('techs')) return`), M5-1 výsledky bit-identické.
- `_modVersion` reset na 0 v obou cestách (`applyTechModifiers` a `rebuildBuildingDerived`) zajišťuje hashState stabilitu (třída DR-012-02 eliminována).
- `techs.json` přidán do `SEEDED_CATALOG_CONTENT` (iter006-catalog-schema.test.js) — zabraňuje přepsání prázdným stromem při CI spuštění `extract.mjs`.

---

## Verdikt

**GO — DoD M6 (K13 plně) splněn.**

Všech 9 AC ověřeno empiricky vlastním během. Výsledky konzistentní s impl summaries T-004..T-007. Tech modifikátory a building modifikátory jdou přes jednu vrstvu (`catalogState.modifiers`), jednu re-derivační cestu (`rebuildBuildingDerived` krok b2), deterministický fold (add→mul→set, sort by source+id). Round-trip identita bit-přesná (hashState). Research deterministický (365 dní, ≥30 techPt, catch-up-safe). M6 nerozbil M5 (m5-buildings-t4 44/44, m5-contracts 51/51, G1 iter005-edge 16/16). UI čisté (selektory+send, žádná logika).
