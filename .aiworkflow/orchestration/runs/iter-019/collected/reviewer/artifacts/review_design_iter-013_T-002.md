# Review: Design M5 (iter-013, T-002)

- **Task**: T-002, iter-013 (BRIEF-013-002)
- **Reviewer**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Předmět**: `agents/architect/artifacts/final/design_iter-013_T-001.md` (562 ř.) — architektonický gate před implementací M5
- **Typ**: review DESIGNU (ne kódu), před zahájením implementace

---

## Verdikt

**GO — s podmínkami.**

Design je věcně solidní, věrně konkretizuje architekturu iter-002 (K0/K5/K11/K13/K14/K16/§6/§7.1/§8) bez její změny, invarianty determinismu a persistu jsou explicitně a správně ošetřené, a všechna klíčová tvrzení o originálu i o stávajícím kódu jsem **ověřil proti zdroji** (viz §"Ověření tvrzení" níže) — sedí. Split M5-1/M5-2 je opodstatněný a doporučuji ho přijmout.

Podmínky (žádná není architektonický blocker; jsou to konkrétní upřesnění, bez nichž Sonnet narazí na rozhodovací mezeru — viz major nálezy M-1 až M-4). Podmínky lze splnit doplněním do designu nebo jako explicitní pokyn coderovi v briefu M5-1; nevyžadují nové architektonické rozhodnutí.

## Doporučení ke splitu

**ANO, split na M5-1 (T1–T4) / M5-2 (T5–T6).** Hranice je správná a čistá (viz §4). Jediná drobná výhrada: T6 (UI) je celé v M5-2, takže M5-1 je hratelné jen přes commandy/testy, ne přes obrazovku — pro účely iterace (DoD "město roste" ověřitelné testy) to ale stačí, build screen nemusí být v M5-1. Doporučení: ponechat hranici beze změny, neposouvat část T6 do M5-1.

## Souhrn nálezů

| Závažnost | Počet | IDs |
|---|---|---|
| blocker | 0 | — |
| major | 4 | M-1, M-2, M-3, M-4 |
| minor | 5 | m-1 … m-5 |
| nit | 3 | n-1, n-2, n-3 |

---

## Ověření tvrzení proti kódu/zdroji (provedeno)

Design hustě cituje `home.js:NNNN` / `config.js`. Ověřil jsem nosná tvrzení — **všechna sedí**:

| Tvrzení designu | Ověřeno | Výsledek |
|---|---|---|
| `instId = building.id + "_" + totalMade` (deterministické, §1.1) | `home.js:285` | ✔ přesně tak; `totalMade++` na ř. 291 |
| `project.id = (new Date()).getTime()` v originále → nahradit (§2.1, §10) | `home.js:2344` | ✔ je tam nedeterministický `Date.now` ekvivalent; náhrada za `projectSeq` korektní |
| `scaleCost(cost,pct) = floor(amt*pct)` (§2.4) | `config.js:1170` | ✔ přesně `Math.floor(amt*pct)` per klíč |
| Originál budovy neškáluje podle počtu → scaleCostByCount je approximated addice | buildingcard.js / config.js | ✔ `scaleCost` se na budovy per-count neaplikuje; per-count růst je nová designová addice (viz §3) |
| `getGoldValue(state, basket)` existuje a je oceňovací API (§1.3) | `market.js:91` | ✔ signatura `getGoldValue(state, basket)`, gold 1:1 |
| `effects.js` = registr string-ID handlerů (M1 stuby) (§5.3) | `registry/effects.js` | ✔ `register(reg, id, fn)`, stuby noop/createScholars/…; rozšíření o kontraktové handlery zapadá |
| `catalogState.modifiers` se ukládá; cache mimo allowlist (§4.2) | `persistSchema.js:41`, `createInitialState.js:115` | ✔ `catalogState` se ukládá CELÉ (řádek 41), `modifiers:[]` v initial state |
| builder job = `category:'builder'`, `noProduction:true`, přeskakován (§3.2) | `jobs.json:83-88`, `jobs.js:102-103,226-228` | ✔ produkce i autoAssign builder přeskakují |
| Load Step 5 = jediná cesta přepočtu derivátů (§1.4, §4.4) | `load.js:215-228` | ⚠ viz M-2 (Step 5 dnes dělá JEN `workforce.total`, ne obecný rebuild) |
| `buildings.json` neúplný (4 budovy, provenance derived) → G-LISTBUILDINGS (§9) | `buildings.json` | ✔ jen builderHut/granary/townCenter/warehouse, `provenance:'derived'` |
| `companies.json` má houseBuilder/mineBuilder, chybí buildersProvided (§3.1) | `companies.json` | ✔ houseBuilder má jen `{id,name,type,cost}`; `buildersProvided` chybí → doplnění approximated korektní |

Závěr ověření: design **nemá fabrikovaná tvrzení**; čísla i řádky odpovídají. To výrazně zvyšuje důvěru v jeho proveditelnost.

---

## 1. Soulad s architekturou iter-002 (K0–K19, §)

Celkově **velmi dobrý soulad**. Mapování §12 designu na K0/K5/K11/K13/K14/K16/K17/§6/§8 je úplné a věcně správné.

- **K13 (§5.3 arch — fold add→mul→set, save jen modifikátory)**: §4.1 designu reprodukuje pořadí přesně; modifier tvar `{id,source,target,attr,op,value}` shodný s arch §5.3. Save = jen `catalogState.modifiers` (§4.2, M5-D7) — ověřeno, že `catalogState` je v allowlistu a cache má `_`-prefix mimo něj. **Soulad ✔.** Viz ale M-3 (fold "stable order by source") a m-1 (mapové atributy).
- **K14 (§5.4 arch — string-ID + params, ne imperativní háčky)**: §5.1–5.3 designu drží `onComplete/onExpire/onReject` jako data `{effect:string, ...params}`, handlery registrované při startu, neznámé ID = fail-fast. `onBuild` přes registr (§2.2). **Soulad ✔.**
- **§6.3–6.4 (persist allowlist + load = čistá konstrukce, žádná load-only větev)**: §1.4 + §4.6 designu drží allowlist princip; deriváty mimo save; load Step 5 jako jediná cesta. **Soulad v záměru ✔**, ale realizační mezera → M-2 (Step 5 dnes neexistuje jako obecný rebuild) a M-1 (persist blok pro `home.buildings`/`projectQueue`/`contractQueue` se musí přidat do `applyPersist`/`applyPayload` — design to popisuje deklarativně, ale stávající `applyPersist` je psaný imperativně per doména, ne čistě data-driven; coder musí přidat kód, ne jen řádek do tabulky).
- **§7.1 (transakce pay/canAfford)**: §2.3 build → `canAfford` → `pay`; §1.3 repair odložená platba v builderu. **Soulad ✔.** Viz M-4 (chybějící `ctx` v command → emitTx vynechán) — design to vědomě řeší gapem G-BUILD-TXAUDIT, akceptovatelné.
- **§8 (kontrakty)**: §5 designu drží kontrakt §8 arch (onComplete/onExpire/onReject string-ID, expirace přes schedule, serializovatelné). **Soulad ✔.**

**Odchylka od architektury: žádná materiální.** Design explicitně neměnní architekturu, jen konkretizuje. Jediné, co jde nad arch iter-002, je `scaleCostByCount` (nová fn) a struktura `state.home.buildings/projectQueue/contractQueue/projectSeq/contractSeq` — vše respektuje K0 (serializovatelné) a persist allowlist.

---

## 2. Correctness invariantů (determinismus + catch-up-safe + persist)

**Hodnocení: velmi dobré.** §10 designu prochází invarianty bod po bodu a já je potvrzuji:

- **Žádný Date.now/Math.random/DOM v core**: deterministické čítače `projectSeq`/`contractSeq`/`totalMade` (§2.1, §5.1, §1.1) místo `(new Date()).getTime()` — ověřeno proti `home.js:2344`. `ageBuildings` přes `rng.stream('buildings')` (nový izolovaný stream, §1.2) místo `Math.random()` — ověřeno, originál na `home.js:345` skutečně používá `Math.random()`. Builder/build/completion deterministické. **✔**
- **Levné v dávce**: `ageBuildings` day-edge (1×/den), `buildersProcess` quarterDay (4×/den), agregáty event-driven, `effective` memoizováno. Konzistentní s catch-up-safe S-05. **✔** Drobnost → n-1 (per-instance smyčka v ageBuildings je O(instances), u stovek instancí ok, ale stojí za poznámku).
- **Save = JEN modifikátory (nikdy derivované)**: §4.2, §4.5 — cache `_effCache`/`_modVersion`/`home.derived` mimo allowlist (`_`-prefix + neuvedeno). Re-aplikace po loadu = fold. **✔** Reviewer grep gate (§4.5) je dobrý nápad — doporučuji ho zařadit do test loopu (m-2).
- **`created === instances.length` re-derivace**: §1.4 — load re-derivuje `created = instances.length`, reviewer invariant gate. **✔** Ale viz M-2: re-derivace musí být reálně přidána do Step 5, dnes tam není.
- **Žádné in-place applyUpgrade mutace**: §4.5 — `effective` nemutuje katalog, modifikátory jsou data. **✔**

Závěr: invarianty jsou navržené správně. **Riziko není v návrhu, ale v realizaci Step 5 (M-2)** — pokud coder jen "doplní blok jako jobs" a nezavede obecný `rebuildBuildingDerived`, vznikne load-only drift (přesně M5-R1). Proto M-2 zvedám na major.

---

## 3. scaleCostByCount — rozhodnutí (faithful default)

**Hodnocení: korektní.** Ověřeno, že originál budovy per-count neškáluje (`scaleCost` v `config.js:1170` existuje, ale na build cost karty se neaplikuje). Design to přiznává jako **approximated designovou addici** (G-BUILD-COSTSCALE), `provenance:'approximated'`, kalibrace M9 — to je přesně správný režim dle Q3/DR-001.

- **Default `scaleFactor=1.0` nerozbije hratelnost M5**: při 1.0 je `pct = 1.0^created = 1.0` → `scaleCost(base, 1.0) = floor(base*1.0) = base`. Tedy M5 default = **přesně věrné originálu** (fixní cena), žádná regrese. **✔**
- **`created` argument = `totalMade`** (§2.4, kumulativní) je správné rozhodnutí — destrukce + znovustavba nezlevňuje. Pozor na konzistenci: design na ř. 216 (§2.3 krok 5) i ř. 249 říká `totalMade`, ale fn parametr se jmenuje `created`. To je matoucí pojmenování → n-2.
- Tabulkový test (§2.4 konec) je konkrétní a správný (`floor(30×1.15)=34`). **✔**

Jediná drobnost: pokud balancér v M9 zvedne factor, geometrický `scaleFactor^totalMade` roste rychle (1.15^20 ≈ 16×) — ale to je M9 starost, ne M5. m-3 (poznámka).

---

## 4. Split M5-1 (T1–T4) / M5-2 (T5–T6)

**Doporučení: PŘIJMOUT split.** Argumentace §8 designu je věcná a sedí na split-trigger (§A3 master plánu — iterace ~4–6 tasků + test + review):

- **Kapacita**: T1(M)+T2(M)+T3(M)+T4(L=6 sub-kroků) ≈ 9 efektivních jednotek + test loop + review = horní hranice jedné iterace. Přidat T5(kontrakty)+T6(UI) by překročilo bezpečnou kapacitu. **Souhlasím.**
- **Dva oddělené review gates** (K13 infra vs. K14 obsah) v jedné iteraci = riziko re-run celé iterace kvůli izolovanému nálezu. Split izoluje riziko. **Silný argument, souhlasím.**
- **Dependency hranice je čistá**: T5/T6 závisí na T2 (pay/fronty) a T4 (effective), ne naopak. M5-1 je samostatně koherentní základ. **Ověřeno — žádná zpětná závislost.**

**Je M5-1 samostatně hratelné BEZ T6?** Ano, v rozsahu DoD iterace: město roste (build command + builderHut kapacita + builder job), budovy se opotřebovávají a opravují, modifikátory foldují čistě, agregáty event-driven. Hratelnost je ověřitelná **testy a commandy**, ne UI obrazovkou. Build screen (T6) je legitimně až v M5-2. **Nedoporučuji** posouvat část T6 do M5-1 — přidalo by UI závislost do infra-iterace a zředilo by čistotu review gate. Jedna výhrada: orchestrátor by měl v DoD M5-1 explicitně napsat, že hratelnost se ověřuje přes commandy/testy (ne přes UI), aby tester nečekal build screen → m-4.

---

## 5. T4 (L) dekompozice na 6 kroků — Sonnet-proveditelnost

**Hodnocení: ANO, proveditelné.** §4.4 rozkládá T4 na T4.1–T4.6, každý má soubor, samostatný test a explicitní závislost. To splňuje požadavek master plánu §1.2 (L task MUSÍ mít dekompozici na Sonnet kroky). Posouzení:

- **T4.1 (effective + fold)**: čistá fn, tabulkový test — jednoznačné. ✔
- **T4.2 (memoizace + invalidace)**: cache hit / invalidate test — jednoznačné. ✔
- **T4.3 (building.effects → modifier)**: round-trip test — jednoznačné, ale mapování `building.effects → modifier` tvar je definováno jen příkladem (§9 ř. 517 `{workers:+5}` → `{op:'add',attr:'workers',value:5}`). Pro víc tvarů (mul, mapové attr) chybí úplné mapovací pravidlo → M-1 (zvedám, protože T4.3 je jádro K13 a coder bez úplného mapování musí rozhodovat sám).
- **T4.4 (recalcBuildingAggregates)**: součtový test — jednoznačné. ✔
- **T4.5 (napojení jobs.workerSlots / housing.settlementLevel)**: dotýká se existujících systémů. Ověřitelné, ale design říká `jobs.workerSlots (jobs.js:45)` — neověřoval jsem přesnou existenci té funkce; coder musí najít integrační bod. m-5 (poznámka, ať coder ověří aktuální název/řádek, kód se od extrakce architektury posunul).
- **T4.6 (load re-aplikace, save jen modifiers)**: round-trip test — jednoznačné v záměru, ale viz M-2 (Step 5 dnes neexistuje jako obecný rebuild; T4.6 ho fakticky musí zavést, ne jen "ověřit allowlist").

Závěr: dekompozice je dost jemná pro Sonnet. Dvě místa (T4.3 mapování, T4.6 Step 5) potřebují upřesnění → major nálezy M-1, M-2.

---

## 6. G-LISTBUILDINGS gap (≥6 budov approximated, informativní eskalace)

**Hodnocení: OK, dle Q3/DR-001.** §9 designu doplní `buildings.json` autonomně na min. hratelnou sadu ≥6 budov, `provenance:'approximated'` per chybějící pole, gap-report aktualizace, **informativní eskalace** (ne blocker). To je přesně režim Q3/DR-001 (chybějící data → approximated, doplnit autonomně, uživatel informován, DR jen při materiální díře — pro M5 mechaniky nemá, balanc se ladí M9). **Souhlasím.**

Min. sada (§9 tabulka) pokrývá všechny mechaniky M5 (opotřebení, storageCapacity agregát, attractiveness→settlementLevel, maxWorkers, levná budova pro scaleCost/age testy). Pokrytí je promyšlené. **✔**

Drobnost: design míchá nové budovy (`house`, `well/hut`) s existujícími (`builderHut` atd.) a nové potřebují pole `resistance/maxProgress/builders/spaceType/effects/unlocked`, která **žádná** ze 4 existujících budov dnes nemá. Takže fakticky se musí doplnit pole i ke 4 existujícím, nejen přidat 2 nové → n-3 (upřesnit, ať coder neopomene).

---

## Nálezy — detail

### Major

**M-1 — Mapování `building.effects → modifier` není úplně specifikováno (T4.3).**
§4.3/§9 dávají jen příklad `{workers:+5} → {op:'add',attr:'workers',value:5}`. Chybí pravidlo pro: (a) `mul`/`set` operace z dat, (b) mapové atributy (`baseCost.wood`), (c) zda efekt platí per-instance (§9 ř. 517 "per instance") nebo per-budova-typ, (d) jak vzniká `modifier.id`/`source` (kolize při více instancích téže budovy — dvě `house` instance musí dát dva modifikátory nebo jeden agregovaný?). To je jádro K13; bez úplného pravidla Sonnet rozhodne sám → riziko nekonzistence s fold/agregáty.
**Návrh**: do §4.3 doplnit explicitní mapovací tabulku tvarů `building.effects` (atom add/mul/set, mapový attr) a pravidlo `modifier.id = \`bld:${buildingId}:${instId}:${attr}\``, `source = \`building:${buildingId}\``. Vyjasnit, zda agregáty (§4.4) čtou modifikátory NEBO počítají `created × effective(attr)` — design používá OBĚ cesty (§4.3 modifikátory vs. §4.4 `created * effective(id,'workers')`), což může dvojitě započítat. **Toto vyjasnit je podmínka GO.**

**M-2 — Load Step 5 dnes NENÍ obecný rebuild; `rebuildBuildingDerived` se musí zavést, ne "doplnit jako jobs".**
Ověřeno `load.js:215-228`: Step 5 dnes počítá JEN `workforce.total` (DR-012-02), žádný obecný recalc derivátů. Design (§1.4, §4.4, §4.6) předpokládá Step 5 = jediná cesta foldu/agregátů/`created` re-derivace. Pokud coder vezme formulaci doslova ("doplnit blok analogický jobs"), zavede load-only větev a vznikne přesně M5-R1 drift.
**Návrh**: explicitně v designu uvést, že T4.6 zavede `rebuildBuildingDerived(state)` volaný z load Step 5 **i** z `completeBuild`/`destroyInstance` (sdílená fn = jediná cesta), a že `created = instances.length` + `recalcBuildingAggregates` jsou v něm. Round-trip test (save jen modifiers → load → derived identické) je povinný. **Podmínka GO.**

**M-3 — Fold "stable order by source" potřebuje deterministicky definované řazení.**
§4.1: `for m in mods where op==='mul' (stable order by source)` a `set` "poslední dle source order vyhrává". `source` je string; "stable order" musí být **explicitní** (lexikografické řazení podle `source`, při shodě podle `id`), jinak pořadí závisí na pořadí vložení do `modifiers[]`, které se může lišit nová hra vs. load → nedeterminismus foldu (porušení K16). Pro `add`/`mul` je výsledek komutativní (součet/součin), takže pořadí nevadí — ALE pro `set` (poslední vyhrává) pořadí **rozhoduje**.
**Návrh**: v §4.1 explicitně: mods se před foldem řadí `sort by (source, id)` lexikograficky; `set` bere poslední po tomto řazení. Doplnit tabulkový test se dvěma `set` modifikátory různého source.

**M-4 — `build` command bez `ctx` → `pay` bez emitTx (audit) — akceptováno jako gap, ověřit že nerozbije accounting invariant.**
§2.3 pozn. řeší, že command signatura `(state, params)` nemá `ctx`, takže `pay(state, cost, cause)` bez emitTx → stavba se neobjeví v měsíčním reportu (G-BUILD-TXAUDIT). To je akceptovatelné pro hratelnost, ALE: M4a zavedl accounting jako observer transakčních událostí (K5/K18). Pokud `pay` bez emitTx **tiše** vynechá událost, gold se odečte, ale report nesedí — to je přijatelný gap. Pokud by ale `pay` vyžadoval `ctx` nepovinně a házel při jeho absenci, je to bug.
**Návrh**: ověřit v `resources/transactions.js`, že `pay(state, cost, cause)` s `emitTx` optional skutečně funguje bez `ctx` (design tvrdí "emitTx je optional v transactions.js:29" — coder ať to ověří před implementací). Gap zdokumentovat v gap-reportu. Není blocker.

### Minor

**m-1 — Mapové atributy ve foldu: dot-path vs. celá mapa.** §4.1 nechává coderovi volbu ("coder zvolí dot-path variantu"). Pro konzistenci s persistem a testovatelnost doporučuji dot-path **zafixovat** v designu (`baseCost.wood` jako attr), ne nechat na coderovi — jinak T4.1 a T4.3 mohou zvolit jinak.

**m-2 — Reviewer grep gate na payload zařadit do test loopu.** §4.5 navrhuje grep, že payload neobsahuje `derived`/`_effCache`/`maxWorkers`. Doporučuji to formalizovat jako test v T-TEST M5-1 (save → JSON.stringify → assert neobsahuje zakázané klíče), ne jen jako reviewer manuální grep.

**m-3 — Geometrický růst scaleCostByCount při M9 factor > 1.** Poznámka pro M9, ne M5: `scaleFactor^totalMade` roste exponenciálně; balancér by měl zvážit cap nebo lineárně-logaritmickou variantu. Mimo scope M5 (default 1.0). Jen flag.

**m-4 — DoD M5-1 musí explicitně říct "hratelnost ověřená přes commandy/testy, ne UI".** Aby tester nečekal build screen (ten je T6/M5-2). Orchestrátor do plan.md M5-1.

**m-5 — Integrační body T4.5 ověřit proti aktuálnímu kódu.** Design cituje `jobs.js:45` / `jobs.workerSlots` z extrakce architektury; kód se od té doby posunul (M3/M4 iterace). Coder ať najde aktuální funkci čtoucí worker sloty, ne slepě řádek 45.

### Nit

**n-1 — `ageBuildings` O(Σ instances) per den.** Pro pozdní hru se stovkami instancí ok (day-edge), ale stojí za poznámku v kódu. Žádná akce.

**n-2 — Pojmenování `scaleCostByCount(base, created)` matoucí.** Parametr se jmenuje `created`, ale předává se `totalMade` (§2.4). Doporučuji přejmenovat parametr na `count` nebo `builtCount` a v JSDoc napsat "pass totalMade".

**n-3 — Doplnění polí ke 4 existujícím budovám.** §9 přidává 2 nové budovy, ale všechny budovy (i 4 existující) potřebují nová pole `resistance/maxProgress/builders/spaceType/effects/unlocked`. Coder ať nezapomene rozšířit i existující 4, ne jen přidat 2.

---

## Závěr

Design je **dost konkrétní pro Sonnet implementaci** s výjimkou dvou míst (M-1 mapování effects→modifier, M-2 Step 5 rebuild), která vyžadují doplnění, jinak by Sonnet musel architektonicky rozhodovat. M-3 (fold řazení) a M-4 (emitTx) jsou menší upřesnění. Žádný blocker; invarianty determinismu/persistu jsou navržené správně a tvrzení o originálu/kódu jsem ověřil — sedí.

**Verdikt: GO s podmínkami** (M-1, M-2 doplnit do designu nebo briefu M5-1; M-3, M-4 ověřit/upřesnit).
**Split: ANO, M5-1 (T1–T4) / M5-2 (T5–T6), hranice beze změny.**

---

*Konec review. Nálezy: 0 blocker / 4 major / 5 minor / 3 nit.*
