# DR-012-02: Reload-determinismus regres (workforce.total) odhalený A1 seedem

- **ID**: DR-012-02
- **Iteration**: iter-012
- **Date**: 2026-06-13
- **Status**: open (architekt rozhoduje fix přístup → coder implementuje)
- **Owner**: architect (decision), coder (impl)
- **Rozhodl o směru**: uživatel (T-004 follow-up) → „Nejdřív architekt"

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

## Acceptance po fixu
- `test/iter005-edge.test.js` G1 vrácen na **plný `hashState`** (žádné applyPersist obejití) a zelený.
- `npm run ci` + `npm run smoke` zelené.
- Žádná změna tvaru save (verze 3), determinismus spojitého simu zachován.

## Odkazy
- impl summary: `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md` (latentní nález + odchylka #2)
- architektura: `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (§9.1 K11)
