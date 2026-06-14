# Brief

- **Brief ID**: BRIEF-015-005
- **Iteration**: iter-015 (M6)
- **Task**: T-005 = T2 dotažení & zatvrzení (techy jako modifikátory — determinismus)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementace generalizace (tech modifikátory přes K13 vrstvu, `rebuildBuildingDerived` krok b2, `addTechModifiers`/`applyTechModifiers`) je **už hotová v T-004**. Tvůj úkol je **dotáhnout a ZATVRDIT determinismus tech modifikátorů** — přidat chybějící kritický round-trip identita test S odemčenými techy a ověřit/opravit konzistenci persist↔re-generace. Toto je třída bugu DR-012-02 (reload determinismus).

## Kontext / co už existuje (T-004)
- `src/core/systems/buildings.js`: `rebuildBuildingDerived` krok (b2) volá `removeAllTechSourcedModifiers` + `addTechModifiers`; `applyTechModifiers` (delta cesta v buyTech) resetuje `_modVersion=0` před invalidate.
- `src/core/commands/buyTech.js`, `src/data/techs.json` (6 sektorů, 7 techů), demo budovy-cílící techy (`agriculture_granaries`→`granary.storage.food`, `civil_attractiveness`→`well.attractiveness`).
- Testy `test/m6-tech-t1.test.js`: fresh-vs-load (0 techů), unlockedTechs persist round-trip, buyTech. **CHYBÍ: round-trip identita s odemčenými techy.**

## Scope IN (T2 dotažení)
1. **KRITICKÝ round-trip identita test (S TECHY)** — přidej do `test/m6-tech-t1.test.js` nebo nový `test/m6-tech-roundtrip.test.js`:
   - Scénář: fresh stav → `buyTech` jednoho+více **budovy-cílících** techů (které reálně mění `home.derived` přes effective, např. agriculture_granaries → granary.storage.food; ale potřebuješ postavit granary nebo zvolit tech cílící budovu, co existuje) → **snapshot `hashState`** → `save` → `load` → (`rebuildBuildingDerived` re-aplikuje) → `hashState` **bit-identický** se snapshotem.
   - Ověř na víc kombinacích (0 techů, 1 budovy-cílící tech, víc techů, tech bez postavené cílové budovy).
2. **Determinismus persist ↔ re-generace**: ověř (a oprav, pokud nesedí), že:
   - Save payload obsahuje `unlockedTechs` (zdroj pravdy). Pokud `catalogState.modifiers` persistuje i `tech:*` modifikátory, ověř že load (`removeAllTechSourcedModifiers` + `addTechModifiers`) je vůči nim **idempotentní** (re-gen dá bit-identické modifikátory, žádné duplikáty/drift). Pokud hrozí dvojí započtení nebo drift, oprav (preferovaně: tech modifikátory NEpersistovat a vždy re-generovat z unlockedTechs, NEBO persistovat a re-gen idempotentně — drž jednu konzistentní cestu).
   - Payload NEobsahuje derivované tech data (`home.derived` z techů, `_effCache`, `_modVersion`).
3. **Catch-up-safe s techy**: krátký test, že odemčené techy v offline dávce (catch-up) dají deterministický výsledek (stejný save+čas → stejný hashState).

## Scope OUT
- academy/research produkce = T3 (T-006). UI = T4.
- Neměň architekturu; neimplementuj nové gameplay mechaniky — jen test+zatvrzení determinismu (případná malá oprava konzistence persist/re-gen).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Nový round-trip-s-techy test MUSÍ být zelený.
- `npm run smoke` OK.
- **Determinismus G1** + **M5-1 round-trip (m5-buildings-t4)** nedotčené.
- Pokud jsi opravil persist/re-gen konzistenci, popiš co a proč.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-015.md` (§2.6/§2.7, persist), DR-015-01, DR-012-02 (precedens)
- T-004 summary: `agents/coder/artifacts/final/impl_summary_iter-015_T-004.md`
- Kód: `src/core/systems/buildings.js` (rebuildBuildingDerived/addTechModifiers/applyTechModifiers/removeAllTechSourcedModifiers), `src/save/persistSchema.js`+`load.js`, `src/core/commands/buyTech.js`, `src/core/commands/build.js` (postavit budovu pro test), `src/data/techs.json`, `test/m6-tech-t1.test.js`, `test/m5-buildings-t4.test.js` (vzor round-trip identity testu)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-015_T-005.md` (co přidáno/opraveno, gate výstup, výsledek round-trip-s-techy)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
