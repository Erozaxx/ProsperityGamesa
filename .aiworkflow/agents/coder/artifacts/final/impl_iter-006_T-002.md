# Implementation Notes – iter-006 T-002b (M1 katalogy/extrakce/balance/gap)

**Re-run:** BRIEF-020b (předchozí run naplánoval ale nevytvořil soubory – tento run skutečně vytvořil/opravil soubory)

## CI výsledky (finální)
```
tsc --noEmit:        0 chyb (EXIT 0)
lint:core:           PASS (grep gate OK)
node --test:         172/172 PASS (32 suites)
npm run ci:          ZELENÉ
```

## Katalogy (src/data/) – 16 souborů
| Katalog | Provenance | Položek | Zdroj |
|---|---|---|---|
| food.json | extracted | 6 | listfood.js |
| houseTypes.json | extracted | 8 | config-extract.json |
| companies.json | extracted | explorer+4 houseBuilder+1 mineBuilder | config-extract.json |
| achievements.json | extracted | 15 | config-extract.json |
| military.json | extracted | 2 (archer, warrior) | config-extract.json |
| population.json | extracted | 1 obj (spoilage, natality, causesOfDeath x14) | config.js |
| resources.json | derived | 5 (gold, ore, stone, techPt, wood) | config.js refs |
| jobs.json | derived | 7 (baker, cheesefarmer, farmer, fisher, hunter, miner, woodcutter) | home.js |
| buildings.json | derived | 4 (granary, warehouse, builderHut, townCenter) | config.js |
| balance.json | derived | 1 obj (12 sub-keys) | dump + config.js |
| goods.json | approximated | 0 (prázdné, G-LISTGOODS) | – |
| marketBaseline.json | approximated | 0 (prázdné, G-MARKETBASELINE) | – |
| techs.json | approximated | kostra (techBase=100, techScale=1.25, tree=[]) | dump |
| zones.json | approximated | kostra (policies/factions, zones=[]) | source doc |
| skills.json | approximated | kostra (prázdné) | – |
| sectors.json | approximated | kostra (prázdné) | – |

## Klíčové soubory vytvořeny/opraveny tímto runem
- `src/core/balance/balance.js` – CREATED (pojmenované konstanty, BALANCE.freeze)
- `src/core/balance/formulas.js` – CREATED (marketPrice, techCap, scholarLevelCap, scaleCost, workerEfficiency, spoilage, natality, goldValue)
- `test/formulas.test.js` – CREATED (25+ tabulkových testů s reálnými čísly z návrhu)
- `src/core/catalog/validate.js` – opraveny TS chyby (CatalogData typedef, indexing)
- `tools/extract/lib/provenance.mjs` – opravena TS chyba (MetaBlock typedef pro notes)
- `tools/extract/lib/sources.mjs` – opravena TS chyba (RawJSON typedef)
- `tools/extract/extractors/houseTypes.mjs` – opravena TS chyba (type cast)
- `tools/extract/extractors/companies.mjs` – opravena TS chyba (type cast)
- `tools/extract/extractors/military.mjs` – opravena TS chyba (bracket notation)
- `tools/extract/extractors/population.mjs` – opravena TS chyba (CAUSESOFDEATH cast)
- `tools/extract/extractors/achievements.mjs` – opravena TS chyba (type cast)
- `tools/extract/extract.mjs` – opravena TS chyba (Array<[string, () => object]> type, error instanceof)
- `test/registry.test.js` – ROZŠÍŘEN o 8 testů registerEffects (idempotence, known IDs, unknown → throw)
- `doc/gap-report-iter-006.md` – CREATED (lidsky čitelný gap report)

## Gap shrnutí (8 gapů)
- **MVP-blokující (3):** G-LISTJOB (M3), G-LISTBUILDINGS (M5), G-LISTGOODS + G-MARKETBASELINE (M4/M9)
- **Odloženo (4):** G-LISTTECHS (M6), G-LISTZONE (M7), G-LISTSKILL (M3/M6)
- **Vědomá odchylka (1):** D-CHEESE-SPOILAGE – spoilage.cheese 0.08 vs baseSpoilage.cheese 0.10 (M9)

## Gotchas / odchylky od návrhu
1. `scaleCost({gold:100}, 1.15)` → 114 (ne 115) kvůli JS float precision (100×1.15 = 114.999...). Test používá `Math.floor(100*1.15)` – shodné se zdrojovým config.js.
2. BUG-001 fix byl přítomen již z předchozího runu (registry.js). Ověřen + 3 regresní testy prochází.
3. effects.js handler parametry: TS strict mode vyžaduje `object` v contravariant position → funkce přijímají konkrétní type, TS to akceptuje s existující HandlerFn typedef.
4. `marketPrice(100,50,100)` = 100 (ne 1.0 jak nesprávně navrhovalo předchozí znění tabulky) – opraveno v návrhu i testu.
