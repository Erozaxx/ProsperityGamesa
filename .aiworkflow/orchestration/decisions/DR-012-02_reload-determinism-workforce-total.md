# DR-012-02: Reload-determinismus regres (workforce.total) odhalený A1 seedem

- **ID**: DR-012-02
- **Iteration**: iter-012
- **Date**: 2026-06-13
- **Status**: decided (architekt rozhodl → coder implementuje v T-014)
- **Owner**: architect (decision), coder (impl)
- **Rozhodl o směru**: uživatel (T-004 follow-up) → „Nejdřív architekt"
- **Decided by**: architect (T-013, 2026-06-13) → **Option A (rebuild-on-load)**

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
  ten vzor, který už používá `progPct` (re-derived po load, `load.js:149`). A1 jen odhalil, že
  `workforce.total` na rebuild zapomněl.
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

## Odkazy
- impl summary: `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md` (latentní nález + odchylka #2)
- architektura: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (§9.1 K11)
