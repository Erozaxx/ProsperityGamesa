# DR-015-01 — M6 designové podmínky (před implementací)

- **Datum**: 2026-06-14
- **Stav**: Rozhodnuto (reviewer GO-s-podmínkami T-002; revize T-002a, tom-proxy gate T-003)

## Rozhodnutí
Split M6 NE (T1–T4 jedna iterace). Generalizace rebuild (rozšíření rebuildBuildingDerived o tech krok) BEZ regrese M5-1 (ověřeno proti kódu). Před kódem zapracovat:
- **M-1 (major)**: `createPlayerState` (createHomeState.js) je plochý objekt BEZ unlockedTechs/research → fresh hra `undefined` vs load `{}` (undefined-guard) = hashState desync (třída DR-012-02 na player úrovni). Init `unlockedTechs:{}` + `research:{sectors:{}}` v createPlayerState + fresh-vs-load determinismus test.
- **M-2 (major)**: `addTechModifiers`/`findTech` defenzivní vůči chybějícímu `techs` katalogu — `rebuildBuildingDerived` běží i z `createInitialState` v testech/bootu bez načtených katalogů. `hasCatalog` guard + `if(!tech)continue` proti crashi.
- **m-3 (minor)**: ≥1-2 techy s prokazatelnou `effective()` cestou na produkci/efficiency (tech efekty na joby fungují jen když produkce čte přes effective()) → demonstrovatelná funkčnost bez M9.

## Reference
- Design: agents/architect/artifacts/final/design_iter-015_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-015_T-002.md
