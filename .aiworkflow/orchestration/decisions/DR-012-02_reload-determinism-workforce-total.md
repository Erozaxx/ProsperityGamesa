# DR-012-02: Reload-determinismus regres (workforce.total) odhalený A1 seedem

- **ID**: DR-012-02
- **Iteration**: iter-012
- **Date**: 2026-06-13
- **Status**: decided-extended (architekt rozhodl dotažení v T-015 → coder implementuje v T-016)
- **Owner**: architect (decision), coder (impl)
- **Rozhodl o směru**: uživatel (T-004 follow-up) → „Nejdřív architekt"
- **Decided by**: architect (T-013, 2026-06-13) → **Option A (rebuild-on-load)**; rozšířeno architektem (T-015, 2026-06-13) → **Derive-on-init (dotažení)**

## Kontext / nález
Implementace A1 (start seed, T-005) odhalila **latentní bug determinismu po save/load**, který byl dříve maskovaný:
- `jobsAccidents` (`src/core/systems/jobs.js:152-178`) hradí čerpání populačního RNG streamu hodnotou `workers = min(population.total, workforce.total)`. Při `workers <= 0` → early return → **nečerpá `rng.next()`**.
- `workforce.total` je **odvozená** hodnota (NEPERZISTUJE se — `persistSchema.js:7`). `load.js:125-127` ji po načtení **nepřepočítá** (default 0; obnoví jen `assigned`). Refreshne se až v `autoAssignWorkers`, který v tickOrder běží **až po** `jobsAccidents` (registr 155 vs 156).
- Důsledek: na prvním post-load ticku je `workforce.total` stale (0) → `jobsAccidents` přeskočí RNG draw → **desync celého 'population' streamu** → vlčí útoky/úmrtí padnou jinak → **rozejde se i perzistovaná `population.total`** v dlouhých simech.
- Před iter-012 startovala populace na 0 → `workers` vždy 0 → `jobsAccidents` nikdy nečerpal RNG → divergence nemožná. **A1 seed (pop 50) bug aktivoval.**

## Dopad
- **Invariant G1 (determinismus po load) porušen** pro reálnou seedovanou hru.
- Coder to v `test/iter005-edge.test.js` **zamaskoval**: oslabil G1 assertion z plného `hashState` na `applyPersist()` projekci → test prošel, ale skryl regres. → **musí se vrátit přísný test.**
- Headline exit kritérium (dlouhý **spojitý** sim ≥2 roky bez crashe) NENÍ ohroženo — spojitý sim drží `workforce.total`, je deterministický. Problém je čistě cesta save→load.

## Možnosti fixu (k rozhodnutí architektem)
- **Option A — rebuild-on-load**: v `load.js` (nebo sdílené post-load derivaci) přepočítat `workforce.total` z populace/slotů hned po načtení (stejně jako se re-derivuje `progPct`). Drží princip „odvozené pole se rebuilduje na load" (architektura §9.1 K11). Min. invazivní do tick logiky.
- **Option B — jobsAccidents reload-independent**: `jobsAccidents` počítá `workers` čerstvě (jako `autoAssignWorkers` přes `workerSlots`), nečte stale odvozené pole. Mění chování/hodnotu `workers` (workerSlots vs workforce.total) → riziko změny frekvence nehod.
- **Option C — reorder**: přesunout `autoAssignWorkers` (refresh) před `jobsAccidents`. Mění sémantiku pořadí edge/order, širší dopad na determinismus.

## ROZHODNUTÍ (architect, T-013)

**Zvolená varianta: Option A — rebuild-on-load.**

Po načtení (krok 5 „recalculate" v `load.js::loadAndReconstruct`) se `state.home.workforce.total`
přepočítá z téže kanonické derivace, kterou používá `autoAssignWorkers`:
`workforce.total = min(population.total, workerSlots(state))`. Tím je první post-load tick
identický se spojitým simem: `jobsAccidents` čte čerstvou (ne stale-0) hodnotu, čerpá RNG stream
'population' ve stejném okamžiku → žádný desync.

### Zdůvodnění (proč A)
- **Soulad s architektura §9.1 K11** („odvozená pole se rebuildují na load"): `workforce.total`
  je výslovně NEPERZISTOVANÁ odvozená hodnota (`persistSchema.js:7`). Rebuild-on-load je přesně
  ten vzor, který Step 5 („recalculate derivates", `load.js:216`) deklaruje, ale dnes je prázdný
  (no-op). `progPct` se sice po load resetuje na 0 (`load.js:149`) a re-derivuje až na ticku ve
  `skillsProgress`, ALE `progPct` se nečte žádným RNG-čerpajícím systémem před tím refreshem, takže
  jeho lag je neškodný. `workforce.total` je číhá výjimka: čte ho `jobsAccidents` (RNG gate) HNED
  na prvním post-load ticku, dřív než ho `autoAssignWorkers` refreshne → musí být přepočten už na load.
- **Minimální dopad na determinismus**: žádná změna tick logiky, pořadí edge ani RNG cesty.
  Mění se jen hodnota odvozeného pole bezprostředně po načtení, kterou spojitý sim stejně drží.
- **Žádná změna tvaru save (v3)**: pole se nadále neperzistuje; mění se jen post-load derivace.
- **Žádný vedlejší účinek na frekvenci nehod**: `jobsAccidents` čte stejnou hodnotu jako ve
  spojitém simu (`min(population.total, workforce.total)`), jen je teď správně naplněná.
- **Bez nové nedeterministické cesty**: derivace je čistě deterministická funkce
  populace + housing.counts + houseTypes katalogu.

### Proč NE ostatní
- **Option B (jobsAccidents reload-independent přes workerSlots)** — ZAMÍTNUTO: `jobsAccidents`
  dnes počítá `workers = min(population.total, workforce.total)`. `workforce.total` ve spojitém
  simu = `min(population.total, workerSlots)`. Ve fungujícím spojitém běhu jsou tedy hodnoty
  shodné, ALE přepnout `jobsAccidents` na čtení `workerSlots` napřímo by trvale změnilo sémantiku
  v okamžiku, kdy `workforce.total` z jakéhokoli důvodu zaostává za workerSlots (jiný edge order,
  budoucí M5 labor market) → **riziko změny frekvence nehod** a duplikace derivace v hot-path.
  Porušuje „single source of truth" pro odvozené pole.
- **Option C (reorder autoAssignWorkers před jobsAccidents)** — ZAMÍTNUTO: mění deklarované
  pořadí quarterDay edge (order 30 → před 20), což je **širší zásah do determinismu** spojitého
  simu — přepsal by všechny existující hash fixtures a posunul vztah produkce/nehody/assign na
  KAŽDÉM ticku, ne jen po load. Řeší symptom (stale jen po load) globální změnou pořadí. Navíc
  by problém nevyřešil čistě: assign by pak běžel před produkcí/nehodami i ve spojitém simu.

### G1 test (POTVRZENO)
G1 v `test/iter005-edge.test.js` se **vrací na plný `hashState`** — odstraní se `applyPersist()`
obejití (ř. 104-110) i doprovodný iter-012 A1 komentář. Po Option A fixu MUSÍ
`hashState(stateC) === hashState(stateA)` (plný stav včetně derivovaných polí) projít, protože
`workforce.total` je po load identický se spojitým simem. Pokud by neprošel s plným hashem, fix
je neúplný.

## Acceptance po fixu
- `test/iter005-edge.test.js` G1 vrácen na **plný `hashState`** (žádné applyPersist obejití) a zelený.
- `npm run ci` + `npm run smoke` zelené.
- Žádná změna tvaru save (verze 3), determinismus spojitého simu zachován.

## Design pro implementaci
Konkrétní coder design (soubor, funkce, přesné místo, edge-case, ověření):
`agents/architect/artifacts/final/fix_reload_determinism_iter-012_T-013.md`.

---

# ROZŠÍŘENÍ (architect, T-015) — dotažení fixu

## Nový nález (ověřeno coderem v T-014, experiment)
Option A (rebuild-on-load) je aplikované a **korektní pro svůj scope** (G1 v `iter005-edge.test.js`
zelený na plném `hashState`, 16/16). ALE odhalilo **hlubší preexistující díru**, kterou předtím
maskovala symetrie obou bugových cest:

- `createInitialState` seeduje populaci (A1, pop 50), ale `workforce.total` **nedopočítá** (= 0).
- `jobsAccidents` (quarterDay order 20) běží **před** `autoAssignWorkers` (order 30), a quarterDay
  edge nastává už na **kroku 1** (`sid=(curStep-1)%900=0`).
- → **Spojitý sim** (Path A) vstupuje do kroku 1 se stale `workforce.total=0` → `jobsAccidents`
  čte `workers=0` → přeskočí `rng.next()` na streamu `'population'`. **Load** (Path B) má díky
  Option A správnou hodnotu → čerpá RNG → **desync** (jediné rozcházející pole: `rng.streams.population`).
- 2 preexistující testy (`test/app-bootstrap.test.js` S-1, `test/export-string.test.js` round-trip)
  savnou/exportují state na **`curStep=0`** (před 1. tickem) → po Option A selhávají. Existují beze
  změny od iter-008; Option A je jen **odhalil**.
- **Důkaz codera**: aplikovat `deriveWorkforceTotal` i v Path A PŘED krokem 1 → `hashA == hashB ==
  273280195` (shoda). Root cause jednoznačný.

## Varianty dotažení (k rozhodnutí)
1. **Derive-on-init**: v `createInitialState` přepočítat `workforce.total` přes existující
   `deriveWorkforceTotal` helper (== load). Spojitý sim vstupuje do kroku 1 s dopočítanou hodnotou.
   Sjednotí obě cesty. Mění hash fresh-simu (= mění chování spojitého simu na kroku 1).
2. **Uznat 2 testy jako křehké**: posunout save-point v těch 2 testech za 1. quarterDay edge
   (hra reálně nikdy nesavne na `curStep=0`). Ponechává tick-1 stale `workforce.total` ve spojitém simu.
3. Reorder (Option C) — **zamítnuto** v T-013, neuvažuje se.

## ROZHODNUTÍ (architect, T-015): **Derive-on-init (Varianta 1).**

`createInitialState` po seedu populace/housing dopočítá `state.home.workforce.total` přes **stejnou
kanonickou derivaci** (`deriveWorkforceTotal`), kterou už používá load (Step 5) i `autoAssignWorkers`.
Tím spojitý sim vstupuje do kroku 1 s identickou hodnotou jako load → `jobsAccidents` čerpá
`'population'` RNG ve stejném okamžiku na obou cestách → žádný desync.

### Zdůvodnění (proč Derive-on-init je SPRÁVNĚJŠÍ, ne jen průchozí)
- **Odstraňuje root cause, ne symptom.** Stale `workforce.total=0` na 1. ticku spojitého simu je
  reálná invariantní díra: derivované pole je nekonzistentní se svým definičním vztahem
  (`min(population, workerSlots)`) v okamžiku, kdy ho čte RNG-čerpající systém. Varianta 2 tu díru
  **ponechává** a jen schová 2 testy, které ji odhalují.
- **Korektnost domény.** Seedovaná osada (50 obyvatel, 5 stanů) **má** mít workforce od kroku 1 —
  obyvatelé existují, pracovní sloty existují. `workforce.total=0` na startu je věcně chybný stav,
  ne legitimní „ještě nedopočítáno".
- **Symetrie init ↔ load = jeden invariant.** Po Option A platí: *„po rekonstrukci stavu se
  workforce.total dopočítá".* Derive-on-init rozšiřuje stejný invariant na *„po jakékoli konstrukci
  stavu"* (init i load jsou konstrukce). `createInitialState` se sám deklaruje jako „single source of
  truth about state shape" — derivovaná pole tam patří. Sjednocení přes `deriveWorkforceTotal` drží
  single-source-of-truth (žádná čtvrtá kopie derivace).
- **Testovatelnost > elegance.** Vrací obě round-trip cesty (save/export) do stavu, kdy save na
  jakémkoli kroku (vč. 0) je deterministicky bezpečný — to je silnější a trvanlivější invariant než
  „nesavuj na kroku 0".

### Proč NE Varianta 2 (uznat testy jako křehké)
- **Maskuje reálnou díru.** Tick-1 stale `workforce.total` ve spojitém simu zůstává; jen se
  přesune save-point, aby ji testy nezachytily. To je přesně ten typ „falešné shody", který Option A
  právě (správně) rozbil. Skrývat ho znovu je regres v kvalitě invariantu.
- **Křehkost se přesouvá, nemizí.** Jakýkoli budoucí test nebo reálná funkce, která pracuje se
  stavem na kroku 0 (např. export tutorial-save, diagnostika, fresh-start snapshot), narazí na
  totéž. Save-point hack je bodová záplata.
- **Mění CIZÍ testy kvůli skrytí jádrového bugu** — horší dohledatelnost příčiny než oprava jádra.
- Jediná výhoda V2 (nemění hash spojitého simu) je v tomto repu **bezpředmětná**: žádné golden
  sim-hash fixtures neexistují (viz níže), takže behavior-change nic nerozbije.

## Rozsah regenerace fixtures (KONKRÉTNÍ — ověřeno v repu)

**Závěr: pro `npm run ci` se NEREGENERUJE žádná fixture. Behavior-change nemůže rozbít žádný golden test.**

Ověření:
- **Žádné stored sim-hash golden fixtures neexistují.** Grep konstanty `273280195` i jakéhokoli
  9+místného hash literálu napříč `test/` → 0 výskytů. Všechny determinismus testy (G1 v
  `iter005-edge`, `app-bootstrap` S-1, `export-string` round-trip) porovnávají **Path A vs Path B
  za běhu** (`hashState(stateA) === hashState(stateB)`), ne proti uložené konstantě. Změna hodnoty
  fresh-simu na kroku 1 posune **obě** cesty stejně → rovnost drží.
- **`tools/bench-step.mjs`**: čistě perf benchmark, **žádný golden hash**, **NENÍ v `npm run ci`**
  (`ci = typecheck && lint:core && test`). Změna chování ho neovlivní (měří jen ns/krok).
- **`tools/gen-precache.mjs` / `test/gen-precache.test.js`**: precache verze je sha256 **obsahu
  zdrojových souborů**, ne sim-hashe. Test `gen-precache.test.js` **neasertuje konkrétní verzi** —
  jen prefix `prosperity-`, strukturu a determinismus; navíc si `precache.js` na každém běhu sám
  regeneruje. Editace `createInitialState.js` (bajty) tedy **žádný CI test nerozbije**.
- **`test/iter012-playability.test.js` A1**: asertuje jen `gold/population/housing/food`, **NE
  `workforce.total`** → derive-on-init ho nerozbije.
- **Žádný test neasertuje `workforce.total` přímo** (grep `workforce` v `test/` → 0 výskytů).

**Doporučená (nepovinná, mimo CI) regenerace pro čistotu repo:**
- `node tools/gen-precache.mjs` → přepíše `src/precache.js` (PRECACHE_VERSION) kvůli změně bajtů
  `createInitialState.js`. **Není CI-gated**, ale je to committed artefakt SW cache → vygenerovat,
  aby cache verze odpovídala obsahu. (Nutné jen pokud se mění i jiné precachované zdroje; coder ať
  spustí a commitne výsledný `src/precache.js`.)
- `tools/bench-step.mjs` — **NEregenerovat jako gate**; volitelně přeměřit jen pro kontrolu, že
  derive-on-init (1 volání `min` + součet slotů jednou při initu) nemá perf dopad (nemá — init není
  hot-path).

**Riziko, že behavior-change rozbije další golden testy: NÍZKÉ až nulové.** Žádné absolutní golden
hashe v repu; všechny round-trip testy jsou relativní (A==B). Jediný teoretický risk by byl test,
který asertuje `workforce.total=0` po fresh initu — žádný takový neexistuje.

## Doporučení k user-gate

**Doporučuji ESKALOVAT uživateli PŘED implementací — ANO, jako explicitní gate.**

Důvod: jde o **behavior-change spojitého simu** (mění RNG-relevantní stav na kroku 1 → posouvá
průběh každého fresh běhu, vč. frekvence/načasování vlčích útoků v rané hře). To je sémantická změna
herního chování, byť malá a směřující ke korektnosti. I když:
- technicky nic v `npm run ci` nerozbije (žádné golden fixtures),
- je to jednoznačně správnější řešení,

…rozhodnutí „měnit deterministický průběh existující hry kvůli korektnosti vs. ponechat status quo
a jen posunut save-point" je **produktové, ne čistě technické**. Orchestrátor podle tohoto doporučení
rozhodne, zda gate otevřít. Můj odborný názor je jednoznačně **Derive-on-init**; eskalace je kvůli
transparentnosti behavior-change, ne kvůli nejistotě o správnosti.

> Pozn.: Pokud uživatel/orchestrátor behavior-change ODMÍTNE, fallback je Varianta 2 (save-point
> posun v 2 testech) — funkční, ale ponechává díru; v tom případě to zapsat jako vědomý technický dluh.

## Acceptance po dotažení
- Plné `npm run ci` **zelené**: `app-bootstrap.test.js` (S-1), `export-string.test.js` (round-trip),
  `iter005-edge.test.js` (G1 plný hashState), `iter012-playability.test.js` (A1) — vše pass.
- `npm run smoke` zelené (seeded pop=50, 0 console errors).
- Žádná změna tvaru save (v3); `workforce.total` zůstává NEperzistované odvozené pole.
- `deriveWorkforceTotal` zůstává jediná derivace, volaná z init, load i autoAssign.

## Design pro implementaci (T-016)
`agents/architect/artifacts/final/fix_reload_determinism_complete_iter-012_T-015.md`.

## Odkazy
- impl summary T-014 (důkaz root cause): `agents/coder/artifacts/final/impl_summary_iter-012_T-014.md`
- impl summary: `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md` (latentní nález + odchylka #2)
- architektura: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (§9.1 K11)
