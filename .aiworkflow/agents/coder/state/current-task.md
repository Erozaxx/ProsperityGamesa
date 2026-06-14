# Current Task

- **Task ID**: T-009a (iter-013 M5-1 hygiene — 4 minor fixes from review gate)
- **Brief**: brief_coder_T-009a_iter-013.md
- **Iteration**: iter-013
- **Status**: done
- **Started**: 2026-06-14
- **Done**: 2026-06-14

## Checklist (T-009a)

- [x] MINOR-1: gap-report.json — verified already fully updated with all M5-1 gaps (no changes needed)
- [x] MINOR-2: tickOrder.md T4 section — verified already updated to LIVE status with correct path (no changes needed)
- [x] MINOR-3: buildings.js ~787-790 — fixed misleading comment (was claiming effective()/modifier fold; reality: effectFromCatalog permanent helper for non-aggregated effect attrs)
- [x] MINOR-4: build.js — removed dead getMaxActiveProjects (NIT-3, trivial removal); updated getMaxProjectQueue comment to reflect effectFromCatalog as permanent helper; added note explaining why maxActiveProjects logic lives in buildersProcess (masonProvided bonus)
- [x] npm run ci: 906/906 pass, 0 fail
- [x] npm run smoke: OK
- [x] Determinismus G1: unchanged (no logic changes)
- [x] Precache: gap-report.json is in precache but file was not modified → no regen needed
