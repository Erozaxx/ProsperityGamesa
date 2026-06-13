# Current Task

- **Task ID**: T-016 (iter-012 reload-determinismus fix dotažení, Derive-on-init)
- **Brief**: brief_coder_T-016_iter-012.md
- **Iteration**: iter-012
- **Status**: done
- **Started**: 2026-06-13
- **Done**: 2026-06-13

## Checklist (T-016)
- [x] createInitialState.js: import deriveWorkforceTotal z '../systems/jobs.js'
- [x] createInitialState.js: state sestaven do lokální proměnné; před return dopočet state.home.workforce.total = deriveWorkforceTotal(state) (bez ctx)
- [x] node --test test/app-bootstrap.test.js PASS (dříve red) — 8/8
- [x] node --test test/export-string.test.js PASS (dříve red) — 12/12
- [x] node --test test/iter005-edge.test.js G1 plný hashState PASS — 16/16
- [x] node --test test/iter012-playability.test.js PASS — 9/9
- [x] npm run ci ZELENÉ (typecheck + lint:core + test 778/778, exit 0)
- [x] npm run smoke OK (pop=50, 0 console errors, exit 0)
- [x] applyPersist(state) payload NEobsahuje workforce.total (jen {"assigned":0})
- [x] Single source of truth: workforce.total derivován VÝHRADNĚ přes deriveWorkforceTotal (init/load/autoAssign), žádná 4. inline kopie
- [x] precache regenerován (node tools/gen-precache.mjs) — deterministický, jen změna PRECACHE_VERSION

## Výsledek
Hotovo. Plné `npm run ci` zelené, smoke OK, 2 dříve red testy zelené. Detaily v
artifacts/final/impl_summary_iter-012_T-016.md.
