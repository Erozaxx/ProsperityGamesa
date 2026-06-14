# Current Task

- **Task ID**: T-002 (Review DESIGN M6 iter-015 — tech strom + techy=modifikátory K13 + academy, před implementací)
- **Brief**: BRIEF-015-002
- **Iteration**: iter-015
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Architektonický review gate DESIGNu M6 (design_iter-015_T-001.md) PROTI KÓDU.
Ověřeno: buildings.js (rebuildBuildingDerived ř.475-518, effective/fold ř.48-156, addBuildingModifiers,
removeAllBuildingSourcedModifiers, invalidateModifiers, recalcBuildingAggregates), formulas.js (techCap ř.31 EXISTUJE),
buyCompany.js (vzor command), load.js (Step 5 ř.285 + undefined-guard precedent ownedCompanies/projectQueue),
persistSchema.js (player allowlist ř.11 + catalogState modifiers ř.52), handlers.js (techPt ř.74),
createHomeState.js (createPlayerState ř.64), createInitialState.js (rebuildBuildingDerived ř.133), main.js
(bootstrapEngine ř.89-111), dispatch.js, transactions.js (grant ř.57), tickOrder.js (order 75 volný na day),
techs.json (prázdná kostra), catalogs.js (techs NENÍ v CATALOG_NAMES), architektura §5.3:297.
Výstup: agents/reviewer/artifacts/final/review_design_iter-015_T-002.md

## Výsledek
Verdikt: **GO-s-podmínkami** (2 podmínky major + 1 doporučení).
Generalizace rebuild: **BEZ REGRESE M5-1** (no-op tech krok při unlockedTechs={}, bit-identické, jedna cesta, DR-012-02 OK).
Determinismus/persist: **DRŽÍ** (allowlist, re-gen z pravdy, undefined-guard, grant ctx, žádný RNG v research).
Split=NE: **SOUHLASÍM**.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 2 (M-1 createPlayerState init unlockedTechs/research → fresh≠load desync; M-2 addTechModifiers/findTech defenzíva vůči chybějícímu techs katalogu → crash createInitialState/load)
- MINOR: 4 (m-1 techCap vs scholarLevelCap approximace; m-2 agregát čte add-only; m-3 tech efekt na job vyžaduje effective() čtecí cestu; m-4 techs catalog wiring vs byId K10)
- NIT: 3 (id pseudokód s targetem; alias rebuildDerived; order 75 ověřen volný)

## NEcommitnuto (per brief).
