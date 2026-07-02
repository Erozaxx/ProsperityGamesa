# Impl Summary — iter-013 T-009a

- **Task**: T-009a — 4 minor hygiene fixes from review gate REVIEW-013-009 (before close M5-1)
- **Date**: 2026-06-14
- **Gate**: npm run ci 906/906 pass · npm run smoke OK · determinismus nedotčen

---

## Changes Made

### MINOR-1 — gap-report.json
**Status: already done, no change needed.**
`src/data/gap-report.json` was already fully updated with all M5-1 gaps:
G-BUILD-TXAUDIT, G-BUILD-COSTSCALE, G-BUILDER-CAP, G-BUILDER-MASON, G-LISTBUILDINGS (resolvedPartial),
G-BUILD-RESISTANCE, G-BUILD-SPACE, G-BUILD-UNLOCK, G-BUILD-MULSTACK, G-BUILD-TECHBONUS, G-REPAIR-RECYCLING.
All have id, description, milestone, severity, blocksMvp, provenance, designRef fields. Format consistent.

### MINOR-2 — tickOrder.md T4 section
**Status: already done, no change needed.**
`docs/tickOrder.md` lines 128-134 already updated to "T4 (LIVE — iter-013 M5-1, T-005/T-006/T-007)"
with correct path `src/core/systems/buildings.js` (not the non-existent `src/core/catalog/effective.js`).

### MINOR-3 — buildings.js misleading comment
**File: `src/core/systems/buildings.js` ~787-792**
Fixed misleading comment block that claimed "use effective() with modifier fold (replaces effectFromCatalog T2 workaround)".
New comment correctly explains:
- effectFromCatalog is the *permanent* helper for maxActiveProjects/maxProjectQueue
- These attrs have no top-level catalog base field → effective() returns 0 for them
- Per-hut capacity is read directly from effects[] — this is the correct read path for non-aggregated effect attrs
- NOT a T2 workaround

Also removed a stale adjacent comment line (`T4.5: effective() now uses modifier fold (modifier has value = perHut * created for 'add')`) that was factually incorrect for this code path.

### MINOR-4 — build.js dedup/comment fix
**File: `src/core/commands/build.js`**
- Removed dead function `getMaxActiveProjects(state)` (lines ~51-56) — was unused (no export, no call).
  maxActiveProjects enforcement lives in `buildersProcess` (buildings.js), which includes the masonProvided
  company bonus that build.js could not replicate. This is the NIT-3 from REVIEW-013-009, trivially removed.
- Updated `getMaxProjectQueue` JSDoc comment: replaced stale "T2: reads directly... T4: will replace with effective()"
  with accurate explanation that effectFromCatalog is the permanent helper for non-aggregated effect attrs.
- Added NOTE comment explaining why getMaxActiveProjects is absent from build.js (maxActiveProjects enforcement
  belongs in buildersProcess to include masonProvided).

**Dedup decision**: Full extract-to-shared-helper was considered (export getMaxProjectQueue from buildings.js, use in build.js). Decided against: the functions have different responsibilities (build.js validates queue capacity before enqueue; buildersProcess enforces maxActiveProjects with masonProvided bonus at execution time). No logical duplication in getMaxProjectQueue itself. The dedup concern was about maxActiveProjects having two separate computations, but since getMaxActiveProjects in build.js was dead code (never called), removing it resolves the duplication without needing a shared helper.

---

## Gate Output

| Check | Result |
|-------|--------|
| `npm run ci` | 906/906 pass, 0 fail |
| `npm run smoke` | OK — 0 console errors |
| Determinismus G1 | Unchanged (no logic changes, only comments/doc) |
| Round-trip persist | Unchanged |
| Precache regen | Not needed (gap-report.json in precache but not modified) |

---

## Files Changed

- `src/core/systems/buildings.js` — MINOR-3: comment fix at ~780-793
- `src/core/commands/build.js` — MINOR-4: removed dead getMaxActiveProjects, updated getMaxProjectQueue comment
