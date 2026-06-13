# Current Task

- **Task ID**: T-017 (iter-012 oprava review F-1 + F-2)
- **Brief**: brief_coder_T-017_iter-012.md
- **Iteration**: iter-012
- **Status**: done
- **Started**: 2026-06-13
- **Done**: 2026-06-13

## Checklist (T-017)
- [x] F-1 health.js healthBirths: guard `pop >= sanityCap ? pop : Math.min(pop+actualBorn, sanityCap)` (neredukuje over-cap loaded total)
- [x] F-1 population.js populationMigration: stejný guard (symetrie births<->migration, R-A4-3)
- [x] F-2 health.js: import + použití `populationSanityCap(capacity)` místo inline `Math.max(capacity, BALANCE.population.sanityMaxPop)`
- [x] Regress test test/population.test.js: over-cap total se po healthBirths i populationMigration nesnižuje ani nepřeroste cap (2/2 pass)
- [x] npm run ci ZELENÉ — 780 testů, 0 fail (exit 0)
- [x] npm run smoke OK (pop=50, exit 0)
- [x] determinismus nedotčen: iter005-edge G1 + iter012-playability 25/25 pass
- [x] precache regenerován (node tools/gen-precache.mjs) — deterministický, jen změna PRECACHE_VERSION

## Výsledek
Hotovo. F-1+F-2 opraveny v obou systémech, regress test přidán. Gate zelený.
Determinismus (deriveWorkforceTotal, G1) nedotčen. Detaily v
artifacts/final/impl_summary_iter-012_T-017.md.
