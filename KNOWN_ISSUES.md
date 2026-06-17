# Known Issues — Prosperity (rebuild)

Carry-over gaps and conscious deviations as of the M9b release candidate. **None is a
release blocker** — all are `low`/`medium` severity, have no effect on core playability or
determinism, and are carried over either because they lack a server-side reference or are
low priority. Full machine-readable list: `src/data/gap-report.json` (36 gaps).

Severity legend: `low` = cosmetic / accounting only; `medium` = reconstructed-from-source
approximation pending calibration.

## Accounting / audit

- **G-BUILD-TXAUDIT** (low, M5-2) — `build` calls `pay()` without `ctx`, so the gold spend is
  applied correctly but the transaction is not written to the monthly accounting report.
  *Impact:* report is missing one line item; balances are correct.
- **G-RECRUIT-TXAUDIT** (low, M4a) — same pattern for `recruit`: gold is deducted correctly
  but the military-recruitment spend is absent from the monthly tx report. *Impact:* report
  line missing only.

## World / AI

- **G-WORLD-PERSIST-DERIVED** (low, M9) — `goldDemand`/`goldProduction` are persisted despite
  being derivable, to keep fresh-vs-load `hashState` identical. *Impact:* none on play; an
  intentional determinism trade-off, revisit in a persist audit.
- **G-AIBATTLE-DEDUP** (low, M9) — the inline AI battle resolve in `world.js` duplicates logic
  from `formulas.aiBattleResolve` instead of calling it. *Impact:* maintenance only; outcomes
  match.
- **G-WORLD (G-LISTZONE)** (low, M9) — zone catalog reconstructed from world structure, not a
  full extracted `listZone`. *Impact:* approximated zone set; numbers may need calibration.

## Military

- **G-MILITARY-STATS** (medium, M9) — combat stats are approximated; the original has no
  extractable server-side reference for exact values. *Impact:* battle balance approximated.
- **MIN-1 (player-ATTACKING)** (low, M8) — player-as-attacker battle-state edge handling is a
  documented minor note from the M8 review; behaves by design for the supported flow.

## Contracts

- **G-CONTRACTS-CATALOG** (low, M9) — minimal playable contract set; full catalog not
  extractable. *Impact:* fewer contract variants.
- **G-CONTRACT-GEN** (low, M9) — contract offer cadence/selection is approximated. *Impact:*
  offered-contract mix not calibrated to the original.
- **G-CONTRACT-SCHED-CLEANUP** (low, M9) — stale offer/expire schedule events are not proactively
  pruned. *Impact:* harmless residual schedule entries; no gameplay effect.

## Balance / calibration (severity low, M9)

- **D-CHEESE-SPOILAGE** (low, M9) — `spoilage.cheese=0.08` in active config vs a differing
  baseline reference. *Impact:* minor food-spoilage discrepancy.
- **G-SKILL-COMPENSATION** (low, M9) — 2× step compensation (`stepCompensation=0.5`,
  `effMaxStep` halving) is approximated. *Impact:* skill completion pacing approximated.
- **G-JOB-MAXSTEP** (high-tagged, M3/M9) — exact `job.maxStep`/`job.products` quantities are not
  extractable from the original list files; reconstructed from `home.js` loops. *Impact:*
  production amounts estimated pending calibration. (No server reference exists → carry-over.)
- **G-LISTJOB / G-LISTGOODS / G-LISTTECHS / G-LISTSKILL** (M3–M6) — the original `listJob` /
  `listGoods` / `listTechs` / `listSkill` files were not present in the dump; these catalogs
  are reconstructed/approximated. *Impact:* the affected values are derived, not server-exact.

## Data holes (extraction)

- Catalogs flagged `provenance: approximated` or `missing` in `src/data/*.json` hold derived
  (not server-exact) values where the original list file was unavailable. See each catalog's
  `_meta` and `gap-report.json`.

## By-design / deferred (from M8)

- **MINOR-1 / MINOR-2 (M8)** — documented persist-comment / structural notes from the M8
  review; no functional impact, deferred as cleanup.
- **V1 (tech → jobs)** — tech effects do not yet fully drive job unlocks; deferred enhancement.
- **V2 (university RNG)** — university research RNG path is a conscious deviation/approximation
  from M8; deterministic but not server-identical.
- **Achievements `onUnlock: []`** — unlock-effect hooks are intentionally empty (achievements
  fire/record, but trigger no side-effects). By design for the MVP.

---

*Reporting: see `src/data/gap-report.json` for the authoritative, per-gap detail
(id, severity, milestone, description, location).*
