# Current Task

- **Task ID**: T-001 (iter-015) — detailní DESIGN M6 (výzkum & tech strom; techy jako modifikátory K13 plně; academy; UI)
- **Brief**: context/inbox/brief_architect_T-001_iter-015.md (BRIEF-015-001)
- **Iteration**: iter-015 (M6 – Výzkum & tech strom)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – plný design M6 (T1–T4) pro Sonnet implementaci. Žádný kód, žádná změna
architektury iter-002 (jen konkretizace). Ověřeno proti reálnému kódu.
**Výstup: `artifacts/final/design_iter-015_T-001.md`.**

## Klíčová rozhodnutí
- **M6-D1 (techCap DOLOŽITELNÝ + JIŽ EXISTUJE)**: `formulas.js:31 techCap(level)=round(100×1.25^level)`,
  source config.js:1393-1394 + original_source_doc §6 + originál techs.js:37. Coder NEpřidává vzorec,
  reuse + tabulkový test.
- **M6-D2/D3 (T1 tech strom)**: `state.player.unlockedTechs={[id]:true}` (plain object, deterministické,
  persistované raw); `buyTech(techId)` command (vzor buyCompany): validace+prereqs+canAfford(techPt)+
  pay(techPt bez ctx, G-TECH-TXAUDIT třída M-4)+unlockedTechs[id]=true+applyTechModifiers. Cena=techCap(level).
- **M6-D4/D5 (T2 KRITICKÉ — techy jako modifikátory K13 PLNĚ + generalizace)**: tech efekty výhradně přes
  catalogState.modifiers, source='tech:<id>', id='tech:<id>:<target>:<attr>:<op>' (target v id kvůli kolizím),
  tvar přesně arch §5.3:297. **Generalizace = rozšířit STÁVAJÍCÍ rebuildBuildingDerived o krok (b2)**
  re-gen tech:* modifikátorů (sdílené helpery addTechModifiers/removeAllTechSourcedModifiers) → JEDNA cesta
  re-aplikující budovy I techy (load Step 5 + mutace + createInitialState). applyTechModifiers = delta cesta
  buyTech sdílí tytéž helpery. ŽÁDNÁ load-only/tech-only větev (DR-012-02). Jméno fn PONECHÁNO
  (3 import-site ripple zbytečný; volitelný alias rebuildDerived). Round-trip budov M5-1 beze změny
  (unlockedTechs={} → addTech no-op → bit-identické).
- **M6-D6 (persist)**: save = jen unlockedTechs (raw, PERSIST_SCHEMA.player) + catalogState.modifiers
  (už ukládán celý). Load přepočte fold jedinou cestou. SAVE_VERSION zůstává 3, undefined-guard.
- **M6-D7 (T3 academy/research)**: state.player.research.sectors[id]={level,exp}; nový systém
  research.daily (edge day, order 75, po buildings.age 70). Exp z jobů per kategorie + academy/university
  (effective 'researchExp'); level-up while exp>=techCap(level) → grant(techPt+1, ctx — research je tick fn,
  ctx k dispozici). Deterministický (originál Math.random university bonus VYNECHÁN, gap G-RESEARCH-UNIV-RNG),
  catch-up-safe.
- **M6-D8 (G-LISTTECHS)**: viz níže.
- **M6-D9 (T4 UI)**: selectTechTree/selectResearchProgress/selectTechPoints (čisté) + TechScreen + tab
  'Výzkum' v App.js + send('buyTech'). Boot wiring: registerBuyTech v bootstrapEngine (main.js), techs do
  CATALOG_NAMES. Žádná logika v UI.
- **M6-D10 (split)**: viz níže.
- **M6-D11**: SAVE_VERSION 3, žádná migrace.

## G-LISTTECHS postup (resolved)
- Vzorec techCap = **DOLOŽITELNÝ** (existuje formulas.js:31). Tech strom = **approximovaný**
  (provenance:'approximated', kalibrace M9). techs.json dnes kostra + NENÍ v CATALOG_NAMES/ID_CATALOGS.
- Wiring: přidat 'techs' do CATALOG_NAMES (catalogs.js), schema validátor, `findTech(techId)` helper
  čtoucí getCatalog('techs').techs.tree (místo měnit buildById — items pod cat.techs.tree).
- Min. hratelná sada (§4.3): 6 sektorů (agriculture/civil/crafts/forestry/medicine/military z techs.js:70)
  + ~6 techů s efekty jako modifikátory pokrývající mechaniky (add efficiency, add storage kapacita,
  mul produkce/upkeep, add attractiveness). Každý tech: {id,sector,level,name,prereqs,effects:[{target,attr,op,value}],
  provenance}. Cíle target ∈ známá ID (job/budova). Gap-report: G-LISTTECHS resolved approximací, žádná eskalace blokeru.

## Split doporučení: NE
- T1–T4 souzní do jedné iterace. Žádný task není L; T2 generalizace je nejrizikovější ale lokalizovaná
  (1 fn rozšířená o (b2) + 2 helpery) nad HOTOVOU M5-1 modifier infrastrukturou. Split by přidal režii
  (zdvojení techs.json/persist wiring T2↔T3) bez přínosu.

## tickOrder dopady
- **Nové periodikum**: research.daily (edge day, order 75, po buildings.age 70, před month systémy).
  register + periodics[] v tickOrder.js. TICK_ORDER konstanta beze změny.
- Žádný schedule handler, žádný nový RNG stream (research deterministický).
- Tech modifikátory mimo tick — event-driven (buyTech→applyTechModifiers; load Step 5→rebuildBuildingDerived (b2)).

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-015-001, DR-013-00, M5-1 design §4 (modifier vrstva)
- [x] Architektura iter-002 §5.3 (K13)/§5.4 (K14)/§6.3-6.4 (persist/load)/§7.1 (transakce) ověřena
- [x] Master plán §3/iter-013(M6) T1–T4 (řádky 281-295)
- [x] Kód prozkoumán: buildings.js (effective/addBuildingModifiers/rebuildBuildingDerived/invalidate),
      handlers.js (techPt), formulas.js (techCap), load.js Step 5, persistSchema.js, registry/effects.js,
      dispatch.js+build.js+buyCompany.js, tickOrder.js, createInitialState.js, catalog/loader.js,
      app/catalogs.js+main.js, ui/App.js+selectors.js, systems/contracts.js+skills.js, techs.json
- [x] Originál techs.js (calcCap/step/sektory) + original_source_doc §6 → techCap doložitelný
- [x] T1 design (unlockedTechs, buyTech, techCap reuse, persist)
- [x] T2 design (techy jako modifikátory K13 plně + generalizace rebuildu budovy+techy jedna cesta)
- [x] T3 design (research.daily, techPt produkce, persist, determinismus, tickOrder)
- [x] T4 design (selektory + TechScreen + tab + boot wiring)
- [x] G-LISTTECHS postup; split rozhodnutí; rizika+mitigace; 4 alternativy
- [x] Výstup design_iter-015_T-001.md; handoff

## Blockery
–
