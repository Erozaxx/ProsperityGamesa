# Impl Summary — iter-013 T-006 (M5-1 T3)

## Task
T-006 = T3: Builder companies — katalog + logika výběru/kapacit. Řeší gap G-BUILDER-COMPANIES z T2.

## Změněné soubory:funkce

| Soubor | Změna |
|--------|-------|
| `src/data/companies.json` | Doplněna pole `buildersProvided`/`masonProvided` ke všem houseBuilder a mineBuilder firmám (gap G-BUILDER-CAP, provenance:approximated). Pole `notes` přidáno do `_meta`. |
| `tools/extract/extractors/companies.mjs` | Extractor rozšířen: injectuje `buildersProvided`/`masonProvided` do houseBuilder/mineBuilder záznamů (constants `HOUSE_BUILDER_CAPACITY`/`MINE_BUILDER_CAPACITY`). Zajišťuje reprodukovatelnost extract.mjs testu. |
| `src/core/state/types.d.ts` | `ownedCompanies?: Record<string, boolean>` přidáno do `HomeState` interface (typecheck gate). |
| `src/core/commands/buyCompany.js` | **NOVÝ soubor**: `buyCompany(state, params)` command handler + `registerBuyCompany(creg)` + `companyBuildersTotal(state)` helper. Validace (companyId, existence v katalogu, already-owned guard, cost NaN guard, canAfford). Platba `pay()` bez ctx (G-BUILD-TXAUDIT gap, shodné s build command). Marks `ownedCompanies[companyId] = true`. |
| `src/core/systems/buildings.js` | `buildersProcess`: přidán import `companyBuildersTotal` + `totalBuilders += companyBuildersTotal(state)` (T3 napojení firem na stavbu). JSDoc komentář aktualizován. |
| `src/save/persistSchema.js` | `home.ownedCompanies` přidáno do persist bloku v `applyPersist`. |
| `src/save/load.js` | `state.home.ownedCompanies = payload.home.ownedCompanies` přidáno do `applyPayload`. |
| `src/app/main.js` | Import `registerBuyCompany` + volání `registerBuyCompany(creg)` v `bootstrapEngine()`. |
| `src/precache.js` | Regenerován (`prosperity-a202e26b4cb9` → `prosperity-c5f344d89977`) po změně `companies.json`. |
| `test/m5-buildings-t3.test.js` | **NOVÝ soubor**: 22 testů (viz níže). |

## Gate výsledek

- `npm run ci`: **862 testů, 0 fail** (typecheck + lint:core + test, exit 0)
- `npm run smoke`: **OK** (exit 0)
- **Determinismus**: G1 (iter005-edge) passes; `buildersProcess` rozšíření je deterministické (companyBuildersTotal čte jen owned state + catalog, žádný RNG/Date.now)
- **Persist round-trip**: ownedCompanies přežije save→load; companyBuildersTotal funguje správně po loadu
- **Precache regenerován**: `node tools/gen-precache.mjs` → čistý diff jen PRECACHE_VERSION

## Nové testy (22)

`test/m5-buildings-t3.test.js`:
- buyCompany validace × 5 (missing id, empty string, unknown id, already owned, insufficient gold)
- buyCompany happy-path × 4 (deducts gold, ownedCompanies entry set, buy multiple, no partial state on failure)
- companyBuildersTotal × 4 (0 when empty, single company, multiple companies, mineBuilder)
- Efekt na buildersProcess × 4 (company builders advance projekt, no progress without company/job, additive s job builderama, completes build)
- Persist round-trip × 5 (payload obsahuje ownedCompanies, empty = ok, round-trip, companyBuildersTotal po loadu, payload neobsahuje derived/_effCache)

## Jak firmy ovlivňují stavbu

**Integrace T3** (design §3.2):
1. Hráč spustí command `buyCompany({ companyId: 'KuttingKorners' })`
2. Command validuje, platí cenu z `companies.json` (např. `{ gold: 2000 }`) přes `pay()`
3. `state.home.ownedCompanies['KuttingKorners'] = true` (persistováno)
4. Každý quarterDay v `buildersProcess`: `totalBuilders += companyBuildersTotal(state)`
5. `companyBuildersTotal` iteruje owned companies a sčítá jejich `buildersProvided` z katalogu
6. Firma tedy přímo přidává builder kapacitu — projekty mohou postupovat i bez přiřazených builder jobů

**Kapacity** (buildersProvided z companies.json, provenance:approximated):
- KuttingKorners: 1 builder
- BrickingBad: 2 builders + 1 mason
- HonestlyGood: 3 builders + 1 mason
- LawyeredUp: 5 builders + 2 mason
- StrikeGoldInc: 2 builders

**masonProvided** (navýšení maxActiveProjects): zatím neimplementováno — hodnota je v katalogu, ale napojení na maxActiveProjects odloženo na T4 (po modifier fold replaces effectFromCatalog workaround).

## Zbylé gapy

| Gap | Popis | Dořeší |
|-----|-------|--------|
| G-BUILD-TXAUDIT | buyCompany i build command: pay() bez ctx → emitTx audit chybí | M5-2/M9 |
| G-BUILDER-MASON | masonProvided nenapojeno na maxActiveProjects (stub) | T4 (po modifier fold) |
| G-BUILDER-CAP | buildersProvided/masonProvided jsou approximated (originál neobsahuje) | M9 kalibrace |
| G-BUILD-COSTSCALE | scaleCostByCount s factor=1.0 (věrné originálu, bez škálování) | M9 |
| G-BUILD-SPACE | Space gate přeskočen (všechny budovy unlocked, bez space check) | M5-2 |
| G-BUILD-TECHBONUS | Construction tech bonusy (constructionWood/Wood2) chybí | M6 |
| G-REPAIR-RECYCLING | Granite/marble recycling slevy při repair chybí | M6 |
