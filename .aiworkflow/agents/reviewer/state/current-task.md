# Current Task

- **Task ID**: T-009 (Závěrečný REVIEW GATE M6 + ověření DoD M6 K13 plně — budovy+techy)
- **Brief**: BRIEF-015-009
- **Iteration**: iter-015
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Závěrečný review gate M6 PROTI KÓDU (právo re-run). CI re-run: npm run ci = 1097/1097 pass.
Ověřeno proti kódu: buildings.js (b2 ř.606-611, applyTechModifiers ř.470-478, addTechModifiers ř.425-454,
findTech ř.383-388, _modVersion reset konzistentní ř.619-621 vs :474-476, fold ř.64-87),
research.js (researchDaily, žádný RNG, while-loop level-up, grant ctx ř.131),
buyTech.js (lifecycle, techCap reuse), createHomeState.js (M-1 init ř.72-73),
persistSchema.js (player allowlist ř.14, catalogState jen modifiers ř.55-57),
load.js (Step 5 ř.285 jedna cesta, undefined-guard ř.96-97), tickOrder.js (research.daily order 75 ř.218),
balance.js (research config), buildings.json (academy/university researchExp), techs.json, catalogs.js,
selectors.js (čisté selektory), App.js (tab Veda), docs/tickOrder.md (DRIFT — bez research.daily).
Výstup: agents/reviewer/artifacts/final/review_iter-015_T-009.md

## Výsledek
Verdikt: **GO-s-podmínkami**. DoD M6 (K13 plně budovy+techy): **SPLNĚN** (s podmínkou M-A).
Tvrdé invarianty 1-6: VŠECHNY PASS (jedna modifier vrstva, jedna re-derivace b2, žádná load/tech-only větev,
_modVersion reset konzistentní, deterministický fold, research bez RNG catch-up-safe, M6 nerozbil M5).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 1 (M-A double-count researchExp v research.js:94-99 — effective() už × created, násobí podruhé → kvadratická exp při created>1; testy maskuje loose >= aserce)
- MINOR: 1 (m-1 docs/tickOrder.md neaktualizován o research.daily order 75 — living artefakt drift)
- NIT: 2 (n-1 forestry_axes target lumberjack neexistuje, spadá pod schválený G-TECH-JOB-EFFECTIVE; n-2 zastaralé "placeholder T2" komentáře v buyTech.js)

## Podmínka GO
Opravit M-A (1 řádek: totalBonus = perBuilding) + zpřísnit test na exact-match; NEBO explicitní acceptace jako sledovaný gap M9.

## NEcommitnuto, NEopraven kód (per brief).
