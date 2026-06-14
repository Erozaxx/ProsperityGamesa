# Current Task

- **Task ID**: T-006 (iter-013 M5-1 T3: builder companies — katalog + logika výběru/kapacit)
- **Brief**: brief_coder_T-006_iter-013.md
- **Iteration**: iter-013
- **Status**: done
- **Started**: 2026-06-14
- **Done**: 2026-06-14

## Checklist (T-006)

- [x] companies.json: doplněna pole buildersProvided/masonProvided (gap G-BUILDER-CAP, provenance:approximated)
- [x] tools/extract/extractors/companies.mjs: extractor upraven pro injekci buildersProvided/masonProvided (reprodukovatelný)
- [x] ownedCompanies state: již v createHomeState.js (T1/T2 anticipovalo), ověřeno
- [x] src/core/state/types.d.ts: ownedCompanies přidáno do HomeState interface
- [x] src/core/commands/buyCompany.js: NOVÝ soubor — buyCompany command (validace, pay, ownedCompanies), companyBuildersTotal helper
- [x] src/core/systems/buildings.js: buildersProcess rozšířen o companyBuildersTotal (T3 integrace)
- [x] src/save/persistSchema.js: ownedCompanies přidáno do persist bloku (home.ownedCompanies)
- [x] src/save/load.js: ownedCompanies obnoven z payload v applyPayload
- [x] src/app/main.js: registerBuyCompany přidán do bootstrapEngine()
- [x] precache regenerován (companies.json změněno → PRECACHE_VERSION aktualizován)
- [x] test/m5-buildings-t3.test.js: 22 nových testů (validace, happy-path, companyBuildersTotal, efekt na buildersProcess, persist round-trip)
- [x] npm run ci ZELENÉ — 862 testů, 0 fail
- [x] npm run smoke OK
- [x] G1 determinismus nedotčen

## Jak firmy ovlivňují stavbu (T3 implementace)

- **companyBuildersTotal(state)**: sečte `buildersProvided` ze všech owned companies → přičteno k `totalBuilders` v `buildersProcess`
- **Firmy fungují jako doplňkový zdroj builderů**: hráč kupuje firmu via `buyCompany` command (platí cenu z companies.json), firma pak přidává builders capacity do `buildersProcess` každý quarterDay
- **Typ firma → effect**: houseBuilder firmy poskytují `buildersProvided` builderů (+ masonProvided pro maxActiveProjects — zatím neimplementováno, stub); mineBuilder totéž; explorer bez capacity
- **G-BUILDER-COMPANIES odstraněn**: základní logika firem implementována; masonProvided napojení na maxActiveProjects odloženo (T4 po modifier fold)

## Zbylé gapy

- **G-BUILD-TXAUDIT**: buyCompany command volá pay() bez ctx (shodné s build command) — vědomý gap M-4, dořeší M5-2/M9
- **G-BUILDER-MASON**: masonProvided (navýšení maxActiveProjects z firem) zatím neimplementováno — effectFromCatalog workaround bude nahrazen v T4 modifier foldem
- Ostatní gapy z T2: G-BUILD-COSTSCALE, G-BUILD-RESISTANCE, G-BUILD-SPACE, G-BUILD-TECHBONUS, G-REPAIR-RECYCLING (všechny provenance:approximated, kalibrace M9)
