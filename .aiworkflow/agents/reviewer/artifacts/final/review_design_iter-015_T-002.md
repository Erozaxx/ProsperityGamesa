# Review — DESIGN M6 (iter-015, T-002)

- **Review ID**: REVIEW-015-002
- **Reviewer**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Předmět**: `design_iter-015_T-001.md` (M6 — Výzkum & tech strom: tech strom + techy=modifikátory K13 + academy)
- **Brief**: BRIEF-015-002
- **Metoda**: ověřeno proti KÓDU (buildings.js, formulas.js, buyCompany.js, load.js, persistSchema.js, handlers.js, createHomeState.js, createInitialState.js, main.js, dispatch.js, transactions.js, tickOrder.js, techs.json, catalogs.js) + architektura iter-002 §5.3.

---

## VERDIKT: **GO-s-podmínkami**

Design je technicky správný, dohledatelný v kódu a proveditelný Sonnetem bez další architektonické volby. **Generalizace rebuild NEzpůsobuje regresi M5-1** (viz §1) a **determinismus/persist invarianty drží** (viz §2). Podmínky GO jsou 2 major nálezy (musí se odstranit/explicitně vyřešit v implementaci) + drobnosti. Split=NE — **souhlasím**.

**Počet nálezů: 0 blocker, 2 major, 4 minor, 3 nit.**

---

## 1. Generalizace rebuild — posouzení regrese M5-1: **BEZ REGRESE** ✅

Ověřeno proti `buildings.js:475-518` (`rebuildBuildingDerived`):

- **Round-trip identita budov zůstane.** Krok (b) budov (buildings.js:489-495 `removeAllBuildingSourcedModifiers` + `addBuildingModifiers`) se NEMĚNÍ. Návrh přidává krok (b2) `removeAllTechSourcedModifiers` + `addTechModifiers`. Když `unlockedTechs={}` (fresh hra / starý save), `addTechModifiers` je no-op (prázdná smyčka přes `Object.keys`) → `modifiers` pole je bit-identické s M5-1. Krok (c) `_modVersion` reset→invalidate (buildings.js:503-505) je beze změny → `_effCache.version=1` identicky. Krok (d) `recalcBuildingAggregates` čte `effective()` = fold; bez tech modifikátorů je fold identický. **M5-1 round-trip testy (`test/m5-buildings-t4.test.js`) zůstanou zelené.**

- **Žádná load-only ani tech-only větev (DR-012-02 splněno).** Design M6-D5 explicitně volí volbu A: tech re-gen JEN ve sdílené `rebuildBuildingDerived` (b2) + cílená delta `applyTechModifiers` (buyTech). `rebuildBuildingDerived` se volá z: load.js:285 (Step 5), createInitialState.js:133, destroyInstance (buildings.js:553), completeBuild (buildings.js:701). Všechny tyto cesty po rozšíření re-aplikují budovy I techy → JEDNA cesta. **buyTech delta** přes `applyTechModifiers` (`removeAllTechSourced + addTech + invalidate + recalc`) je podmnožinou téže logiky se sdílenými atomy (M6-D5 §2.3 poslední odrážka to předepisuje).
  - **Pozn. (důležité, ne nález):** Komentář v `buildings.js:488` UŽ dnes říká „Modifiers from other sources (M6 techs, events — source != 'building:*') stay untouched." — tj. M5-1 byla psaná s vědomím M6 a krok (b) tech modifikátory **nemaže**. Krok (b2) tedy musí mít vlastní `removeAllTechSourcedModifiers` (filtr `tech:`), což design má (§2.2). Konzistentní.

- **Tech modifikátory ve stejném `catalogState.modifiers`, deterministický fold.** Tvar (design §2.1) přesně odpovídá arch §5.3:297 (`source:'tech:<id>'`, `target`, `attr`, `op`, `value`) — ověřeno v architektuře (řádky 297-298: `source:'tech:bookKeeping', target:'baker', attr:'products.bread', op:'mul', value:1.15`). Fold `cmpModifier` (buildings.js:48-52) řadí `sort by (source,id)` PŘED foldem → `building:*` < `tech:*` lexikograficky, deterministicky. `effective` (buildings.js:146-148) filtruje `m.target===itemId && m.attr===attr` **bez ohledu na source** → techy čte beze změny `effective`/`fold`. **Žádná změna fold/effective potřebná — potvrzeno.**

**Závěr §1: generalizace rebuild je bezpečná, regrese M5-1 = NE.**

---

## 2. Determinismus / Persist — posouzení: **DRŽÍ** ✅

- **Persist allowlist.** Design M6-D6 tvrdí save = `unlockedTechs` (raw) + `catalogState.modifiers`. Ověřeno: `persistSchema.js:11` PERSIST_SCHEMA.player je generický loop (persistSchema.js:73), přidání `'unlockedTechs'` ho uloží automaticky; load.js:96-98 ho načte automaticky. `catalogState.modifiers` se už ukládá celé (persistSchema.js:52-53) a v load.js:78-84 se **slice-clonuje** (ne reference) → round-trip bezpečné. **Derivované se neukládají** (`_effCache`/`_modVersion`/`derived` mimo allowlist) — potvrzeno. `research` analogicky (jobs vzor persistSchema.js:157-165 / load.js:149-155).
- **Round-trip korektnost.** Po loadu `rebuildBuildingDerived` (load.js:285) re-generuje building I tech modifikátory z pravdy (instances + unlockedTechs) → uložené `modifiers` se přepočtou (remove-all + re-add obou zdrojů), NEpoužijí se „naslepo". To je žádaný stav (arch §6.4 fold jediná cesta). Design §2.4 to popisuje správně.
- **Staré savy undefined-guard.** Ověřeno precedentem: `ownedCompanies` (load.js:199), `projectQueue` (load.js:189), `contractQueue` (load.js:204) — všechny undefined-guard, SAVE_VERSION zůstává 3, žádná migrace. `unlockedTechs` přesně tento vzor (M6-D11). Pole zůstane `{}` z `createPlayerState`. **Ověř ale níže M-2** ohledně createPlayerState init.
- **Determinismus research.** `grant(state, {techPt:1}, cause, ctx, step)` ověřeno proti transactions.js:57-62 (signatura `grant(state, prod, cause, ctx, step=0)`, emituje tx jen když `ctx.emitTx`). Research je tick fn s ctx → audit funguje. `while` smyčka level-upů je deterministická (techCap čistý vzorec). Žádný RNG. Catch-up-safe (day edge, 1×/den).

**Závěr §2: determinismus a persist invarianty drží.**

---

## 3. Nálezy

### MAJOR

**M-1 (major) — `createPlayerState` init `unlockedTechs`/`research` chybí v designu jako konkrétní edit, hrozí desync fresh vs. load.**
Design §1.3 říká „Inicializace v `createPlayerState()`", ale `createPlayerState` (createHomeState.js:64-66) vrací **plochý objekt bez** `unlockedTechs`/`research`. Pokud coder zapomene přidat oba klíče do `createPlayerState`, fresh hra bude mít `unlockedTechs===undefined`, kdežto load přes guard dá `{}` → **divergence hashState fresh vs. load** (přesně třída DR-012-02, ale na player úrovni). Dekompozice T1.1/T3.1 (§9) to zmiňuje, ale slabě.
*Návrh:* Coder MUSÍ přidat do `createPlayerState`: `unlockedTechs: {}` a do home/player `research: { sectors: {} }` (design váhá §3.1 „doporučeno `state.player.research`" — **rozhodni: player**, konzistentní s techPt). `selectTechTree`/`addTechModifiers` čtou `s.player.unlockedTechs ?? {}` (defenzivně), ale init musí být přítomen, aby fresh===load. Přidat do review-gate coderovi: fresh-vs-load hashState test s 0 techy musí být identický (rozšíření existujícího round-trip testu).

**M-2 (major) — `addTechModifiers` musí být robustní vůči chybějícímu `techs` katalogu (test prostředí / boot pořadí).**
`addTechModifiers` (design §2.2) volá `findTech(techId)` který čte `getCatalog('techs')`. `rebuildBuildingDerived` se volá z `createInitialState.js:133` — to běží i v testech a při bootu, kde katalog `techs` **nemusí být načten** (`loadAllCatalogs` je async, mnoho testů konstruuje stav bez katalogů — viz createInitialState komentář o `houseTypes` fallback ř.139). Pokud `unlockedTechs={}` je to no-op (OK), ale jakmile starý save měl tech a katalog není → `findTech` vrátí null. Design §4.2 `findTech` má guard `if (!hasCatalog('techs')) return null` a §2.2 „pokud chybí → skip (defenzivně)" — **dobře**, ale musí to platit i pro `addTechModifiers` smyčku (skip atom když tech null). Riziko: pokud coder volá `tech.effects` na null → crash v `createInitialState`/load → tvrdá regrese i pro nehrané techy.
*Návrh:* Explicitně předepiš: `addTechModifiers` na začátku `if (!hasCatalog('techs')) return;` a uvnitř smyčky `const tech = findTech(techId); if (!tech) continue;`. Coder-gate: createInitialState test BEZ načteného techs katalogu nesmí spadnout. (Stejná defenzíva jako `hasId` guard v `addBuildingModifiers` buildings.js:299.)

### MINOR

**m-1 (minor) — techCap doložitelnost: POTVRZENO, ale komentář formulas.js cituje config.js:1393, ne techs.js:37.**
Ověřeno: `formulas.js:31` `techCap(level) = Math.round(100 * Math.pow(1.25, level))`, komentář cituje „config.js:1393-1394, source doc §6". Design M6-D1 tvrdí navíc oporu `techs.js:37 calcCap` — to je v designu, ne v kódu, ale není to nutné. **Vzorec EXISTUJE a je doložitelný, coder jen reuse + tabulkový test.** Bez výhrad k samotnému vzorci.
*Pozn.:* Design §1.2 zmiňuje, že `techCap` cena sektoru (research level-up) i cena techu (`techCap(tech.level)`) sdílí JEDEN vzorec se základem 100/1.25. Originál má `techBase=100` pro tech body, ale `scholarLevelCap` (formulas.js:42) má základ **300** (`getScholarLevelCap`). Design správně sjednocuje na techPt/techCap (approximace G-LISTTECHS), ale pokud research level-up má odpovídat scholar systému, mohl by být relevantní `scholarLevelCap`. *Návrh:* drobnost — explicitně uveď v gap-reportu, že research level-up používá `techCap` (100/1.25), NE `scholarLevelCap` (300/1.25), jako vědomou approximaci (M9 kalibrace). Neblokuje.

**m-2 (minor) — `recalcBuildingAggregates` po tech změně agreguje JEN `add` atomy na `workers`/`attractiveness`/`storage.*`.**
Ověřeno `recalcBuildingAggregates` (buildings.js:387-432): iteruje JEN přes `state.home.buildings` (built buildings) a JEN přes jejich vlastní `entry.effects` `add` atomy. **Tech modifikátory, které cílí na budovu (`target:'granary', attr:'storage.food', op:'add'`), se v agregátu projeví správně** (protože agregát čte `effective(buildingId, 'storage.food')`, který foldne i tech modifikátor). ALE: tech, který cílí na budovu, jejíž `created===0` (budova nepostavená), se v agregátu NEprojeví (smyčka skipuje `created<=0`, buildings.js:398) — to je korektní (efekt na neexistující budovu je no-op). Tech cílící na **job** (`target:'baker'`) se v `recalcBuildingAggregates` neprojeví vůbec (správně — joby nejsou agregát budov), efekt se čte přes `effective('baker',...)` v jobs/production systému.
*Riziko:* Design §2.2 volá `recalcBuildingAggregates` i v `applyTechModifiers`, což je správně (drží invariant levně), ALE coder musí vědět, že tech efekt na job se NEpromítne do `home.derived` — promítne se až při čtení `effective()` v produkci. To je v pořádku (stejný model jako M5-1), ale design by to měl 1 větou potvrdit, aby coder nehledal „kde se baker bonus aplikuje".
*Návrh:* drobnost — doplnit poznámku, že tech efekt na job je čten lazy přes `effective()` v produkčním systému, ne přes agregát. Ověř, že produkční systém (jobs/production) skutečně čte `effective(jobId, attr)` a ne `baseAttr` přímo — **GAP K OVĚŘENÍ CODEREM**: pokud production čte produkci jobu mimo `effective()`, tech `mul` na `products.bread` bude tichý no-op. (Viz m-3.)

**m-3 (minor) — proveditelnost tech efektů na JOBY není ověřena proti čtecí cestě produkce.**
Design předpokládá, že tech `{target:'baker', attr:'products.bread', op:'mul'}` ovlivní produkci. To platí JEN když produkční systém čte hodnotu přes `effective('baker','products.bread',state)`. M5-1 `effective` je psaná primárně pro budovy (`baseAttr` čte z `byId(itemId).entry`). Pro job `baker` musí `byId('baker')` existovat a `entry.products.bread` být dohledatelné. **Toto design NEOVĚŘUJE proti kódu** — jen předpokládá (§2.1 „Tech může cílit na cokoli"). Příklady v techs.json (`farmer.efficiency`, `baker.products.bread`, `lumberjack.efficiency`, `warrior.upkeep`) musí mít existující čtecí cestu přes `effective`.
*Návrh:* major-leaning minor — coder-gate: pro KAŽDÝ `target/attr` v approximovaném stromu ověřit, že existuje produkční/čtecí cesta volající `effective(target, attr)`. Pokud ne (např. production jobu nečte přes effective), efekt je tichý no-op → tech je „dark". Design to delegoval na „ladí M9" (R4), což je přijatelné PRO BALANC, ale ne pro „demonstrovatelnou funkčnost M6". Doporučení: zvolit do min. sady **alespoň 1-2 techy, jejichž target/attr má prokazatelně `effective` čtecí cestu** (např. `storage.food` na `granary` — ověřitelné přes `recalcBuildingAggregates`), aby DoD „tech mění chování" byl demonstrovatelný bez M9. Ostatní mohou zůstat approximated/no-op s gap.

**m-4 (minor) — `findTech` přes `getCatalog('techs').techs.tree` vyžaduje schema validátor, jinak runtime crash.**
Design §4.1 bod 3 zmiňuje „schema validátor pro `techs` (assertCatalogValid) — min. tvar". `techs.json` dnes (ověřeno) má `{techs:{sectors:[],techBase,techScale,tree:[]}}` — prázdné. Po přidání do `CATALOG_NAMES` (catalogs.js:10 — ověřeno, `techs` tam NENÍ) musí `loadAllCatalogs` (catalogs.js:30-34 `fetch ./src/data/${name}.json`) najít soubor (existuje) a validovat. Pokud validátor chybí nebo je příliš striktní vůči ostatním katalogům → boot fail.
*Návrh:* Coder přidá `techs` do CATALOG_NAMES + tolerantní validátor (min. `{techs:{tree:Array}}`). Ověř, že `loadAllCatalogs` collision-check (byId K10) NEindexuje `techs.tree` ID do globálního byId (design používá `findTech`, ne `byId` — R5). Pokud loader automaticky indexuje všechny katalogy do byId, tech ID by mohly kolidovat. **Coder-gate:** potvrdit, že přidání `techs` do CATALOG_NAMES neláme byId index (nebo `techs` z byId vyřadit).

### NIT

**n-1 (nit)** — Design §2.2 `id` schema: kanonicky `id = 'tech:'+techId+':'+atom.target+':'+atom.attr+':'+atom.op` (s targetem). Building `id` (buildings.js:328) je `bld:${buildingId}:${attr}:${op}` (bez targetu, protože target===self). Rozdíl je odůvodněný (tech může cílit víc targetů stejným attr/op). OK, ale design má v §2.2 pseudokódu nejdřív `id` BEZ targetu (ř.137) a pak ho opravuje v poznámce — coder by měl použít **finální** verzi s targetem. Sjednoť pseudokód, ať coder nezkopíruje chybnou variantu.

**n-2 (nit)** — Design §2.3 navrhuje ponechat jméno `rebuildBuildingDerived` (ne rename na `rebuildDerived`). Souhlasím — rename = 3 import-site ripple (load.js:11, createInitialState.js:10, interní) bez funkčního přínosu. Volitelný alias `export const rebuildDerived = rebuildBuildingDerived` je čistší pro call-site `buyTech`. Neblokuje. Doporučuji alias kvůli čitelnosti, že fn teď dělá „buildings I techy".

**n-3 (nit)** — `research.daily` order 75 na edge `day`: ověřeno, že je VOLNÝ (tickOrder.js:198-214 má na `day` edge: 5,10,20,30,35,40,50,60,70; 75 volné; `season.change` je na edge `season` order 10, ne `day`). Pořadí „po buildings.age(70)" je správné (academy budovy aktuální). OK, žádná kolize. Pozn.: design §3.5 zmiňuje `burnWood(60)` na `day` — ověřeno (tickOrder.js:211). Sedí.

---

## 4. Odpovědi na cílené body briefu

1. **Generalizace rebuild bez regrese M5-1** → ANO, bez regrese (§1). Žádná load-only/tech-only větev (volba A, M6-D5). Volá se z load Step 5 + mutací + createInitialState + buyTech delta. Tech modifikátory v `catalogState.modifiers`, `source=tech:<id>`, deterministický fold by (source,id). **Potvrzeno proti kódu.**
2. **techCap** → vzorec EXISTUJE formulas.js:31 `round(100*1.25^level)`, doložitelný (config.js:1393 + source doc §6). Coder jen reuse + tabulkový test. **Potvrzeno.** (Drobnost m-1: research vs scholarLevelCap.)
3. **Persist** → save = jen `unlockedTechs` + `catalogState.modifiers`; derivované se neukládají; round-trip přes re-gen; staré savy undefined-guard (precedent ownedCompanies). **Potvrzeno**, podmínka M-1 (createPlayerState init).
4. **buyTech** → validace prereqs(⊆unlockedTechs) + canAfford(techPt) + pay; vzor `buyCompany.js` (ověřeno: idempotency guard, canAfford, pay bez ctx). `registerBuyTech` v bootstrapu PŘEDEPSÁN (design §5.3, anti-dark-code z B1; ověřeno že main.js:104-107 je správné místo, registerBuyCompany/registerBuild vzor). **OK.**
5. **Academy/research determinismus** → `research.daily` (day, order 75), grant techPt přes ctx (signatura grant ověřena). Vynechán originálový `Math.random` university bonus = vědomý gap (G-RESEARCH-UNIV-RNG), provenance:'approximated'. Catch-up-safe. **OK** — determinismus má přednost (S-05).
6. **G-LISTTECHS** → approximovaný strom, provenance:'approximated', vzorec doložitelný. Postup OK (Q3/DR-001). Podmínka m-3/m-4: ověřit čtecí cesty target/attr + catalog wiring.
7. **Soulad s architekturou + proveditelnost Sonnet** → tvar modifikátoru = arch §5.3:297 přesně; persist §6 allowlist; K13 plně (druhý zdroj). Proveditelné Sonnetem (vzory buyCompany/build/rebuildBuildingDerived hotové). **Split=NE — SOUHLASÍM** (žádný task není L; T2 generalizace je lokalizovaná nadstavba nad hotovou M5-1; split by zdvojil katalog/persist wiring).

---

## 5. Podmínky GO

1. **M-1**: Coder přidá `unlockedTechs:{}` + `research:{sectors:{}}` do `createPlayerState` (createHomeState.js) — JINAK fresh≠load desync. + fresh-vs-load hashState test s 0 techy.
2. **M-2**: `addTechModifiers` + `findTech` defenzivní vůči chybějícímu `techs` katalogu (`hasCatalog` guard + `if(!tech)continue`) — JINAK crash v createInitialState/load v testech.
3. **m-3/m-4** (doporučeno před closem): coder-gate ověřit, že (a) ≥1-2 techy v min. sadě mají prokazatelnou `effective()` čtecí cestu (demonstrovatelná funkčnost bez M9), (b) `techs` catalog wiring neláme byId K10 collision.

Drobnosti m-1, m-2, n-1..n-3 → vyřešit v implementaci, nezadržují GO.

---

## 6. Souhrn pro orchestrátora

- **VERDIKT: GO-s-podmínkami** (2 podmínky major + 1 doporučení).
- **Generalizace rebuild: BEZ REGRESE M5-1** (no-op tech krok při unlockedTechs={}, bit-identické, jedna sdílená cesta, DR-012-02 splněn).
- **Determinismus/persist: DRŽÍ** (allowlist OK, re-gen z pravdy, undefined-guard precedent, grant ctx ověřen, žádný RNG v research).
- **Nálezy: 0 blocker / 2 major / 4 minor / 3 nit.**
- **Split=NE: SOUHLASÍM.**
