# Current Task

- **Task ID**: T-002
- **Brief**: BRIEF-020b
- **Iteration**: iter-006
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Checklist (iter-006 T-002b)
- [x] BUG-001: registry.js WeakSet cycle protection (byl přítomen, ověřen + 3 regresní testy)
- [x] src/core/balance/balance.js (pojmenované konstanty s source refs)
- [x] src/core/balance/formulas.js (čisté vzorce)
- [x] test/formulas.test.js (25+ tabulkových testů s reálnými čísly z návrhu)
- [x] tools/extract/ pipeline (extract.mjs + 16 extractors + lib/sources+provenance+writeCatalog)
- [x] src/core/catalog/ (schemas.js, validate.js, loader.js, index.js) – opraveny TS chyby
- [x] test/catalog-validate.test.js
- [x] src/data/ 16 JSON katalogů (food, houseTypes, companies, achievements, military, population, resources, jobs, buildings, goods, techs, zones, skills, sectors, marketBaseline, balance)
- [x] src/data/gap-report.json
- [x] src/core/registry/effects.js (M1 kostry + 8 registry testů)
- [x] doc/gap-report-iter-006.md (lidsky čitelný)
- [x] tsc --noEmit: 0 chyb
- [x] npm run ci: 172 pass, 0 fail
