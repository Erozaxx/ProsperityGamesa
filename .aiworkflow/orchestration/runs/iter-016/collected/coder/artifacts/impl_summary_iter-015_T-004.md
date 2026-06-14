# Impl Summary — iter-015 T-004 (M6 T1: tech strom + buyTech + techCap + player state init)

- **Task**: T-004 / BRIEF-015-004
- **Iteration**: iter-015 (M6)
- **Date**: 2026-06-14
- **Status**: done

---

## Změněné soubory: funkce

| Soubor | Funkce / změna |
|---|---|
| `src/core/state/types.d.ts` | Přidány typy `ResearchSectorState` + rozšíření `PlayerState` o `unlockedTechs` + `research` (M-1 §1.3a) |
| `src/core/state/createHomeState.js` | `createPlayerState()`: již obsahovala `unlockedTechs:{}` a `research:{sectors:{}}` (bylo přidáno před spuštěním agenta) |
| `src/core/systems/buildings.js` | Přidán import `hasCatalog, getCatalog` z loader.js; nové exporty: `findTech(techId)`, `addTechModifiers(state)`, `applyTechModifiers(state)`; privátní: `removeAllTechSourcedModifiers(state)`; rozšíření `rebuildBuildingDerived` o krok (b2) — re-gen tech modifikátorů |
| `src/core/commands/buyTech.js` | **Nový soubor**: `buyTech(state, params)` command + `registerBuyTech(creg)` |
| `src/app/main.js` | `bootstrapEngine()`: přidán import `registerBuyTech` + volání `registerBuyTech(creg)` (anti-dark-code) |
| `src/core/catalog/schemas.js` | Již obsahoval `techs: { required: ['techBase','techScale'] }` schema |
| `src/app/catalogs.js` | Již obsahoval `'techs'` v `CATALOG_NAMES` |
| `src/data/techs.json` | **Přepsán** z prázdné kostry na approximovaný strom: 6 sektorů + 7 techů s efekty (`provenance:'approximated'`). Zároveň přidán do `SEEDED_CATALOG_CONTENT` v iter006 testu |
| `src/save/persistSchema.js` | Již obsahoval `'unlockedTechs'` a `'research'` v `PERSIST_SCHEMA.player` |
| `src/save/load.js` | Generický loop přes `PERSIST_SCHEMA.player` pokrývá `unlockedTechs`+`research` automaticky (undefined-guard přes `createPlayerState` init) |
| `src/precache.js` | Regenerováno (techs.json změna ovlivňuje manifest hash) |
| `test/m6-tech-t1.test.js` | **Nový soubor**: 37 testů (techCap tabulkový, schema, findTech, M-1 determinismus, persist round-trip, buyTech validace, addTechModifiers, applyTechModifiers idempotence, round-trip hash po buyTech) |
| `test/iter006-catalog-schema.test.js` | Přidáno `techs` do `SEEDED_CATALOG_CONTENT` + `before()` upraven (seeded write BEFORE snapshot) — zabraňuje extract.mjs přepsání techs.json na prázdný strom při CI |

---

## Gate výstup

- **npm run ci**: 1027 testů, 1027 pass, 0 fail ✅
- **npm run smoke**: SMOKE OK, 0 console errors ✅
- **Determinismus G1** (iter005-edge.test.js): 16/16 pass ✅
- **Round-trip identita M5-1** (m5-buildings-t4.test.js): 44/44 pass ✅
- **fresh-vs-load determinismus (M-1)**: zelený (test v m6-tech-t1.test.js) ✅
- **Nové testy (m6-tech-t1.test.js)**: 37/37 pass ✅

---

## Placeholder pro T2

- `applyTechModifiers(state)` je **plně implementován** (v buildings.js): odstraní tech modifikátory, přidá z `unlockedTechs`, invaliduje cache, recalc aggregáty. Není placeholder.
- **Tech efekty na job atributy** (target: `farmer`, `baker`, `lumberjack`, `warrior`) jsou v `techs.json` přítomny, ALE jsou tichý no-op do M9, protože `jobsProduction` nečte přes `effective()` (gap **G-TECH-JOB-EFFECTIVE**, zdokumentováno v design §2.7). Přepojení job produkce na `effective()` = M9.
- **`rebuildDerived` alias**: design zvažoval alias `export const rebuildDerived = rebuildBuildingDerived`. Není nutný pro T2 — `buyTech` volá `applyTechModifiers` (delta cesta), `load.js` volá `rebuildBuildingDerived` (původní jméno). Alias přidá T2 volitelně.
- **`recalcBuildingAggregates` agreguje jen `op:'add'`** z budov — tech `mul`/`set` efekty na budovy se do `home.derived` nepromítnou (design §2.7 "add" omezení). T2 může toto rozšířit nebo zdokumentovat jako gap G-TECH-MUL-AGGREGATE.
- **`research.daily` systém** (T3): init `research:{sectors:{}}` je připraveno; periodikum `researchDaily` není implementováno (scope T3).

---

## Klíčová rozhodnutí / odchylky

- **`applyTechModifiers` resetuje `_modVersion` na 0** před `invalidateModifiers` — stejně jako `rebuildBuildingDerived`. Bez resetu by každý `buyTech` inkrementoval `_modVersion` → `hashState` po N buyTech ≠ `hashState(load(save(...)))` (třída bugu DR-012-02). Toto rozhodnutí není explicitně v design §2.2 ale plyne přímo z invariantu (design §2.3 komentář o `_modVersion` resetu).
- **`techs.json` přidán do `SEEDED_CATALOG_CONTENT`** v `iter006-catalog-schema.test.js` — protože `extract.mjs` (který test spouští) přepsal `techs.json` na prázdný strom, čímž rušil veškeré M6 testy. Analogické řešení jako pro `goods.json` (G-LISTGOODS).
