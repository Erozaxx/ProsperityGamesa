# Current Task

- **Task ID**: T-009 (Review GATE M5-1 iter-013 — budovy/builder/companies/modifikátory, závěrečný gate)
- **Brief**: BRIEF-013-009
- **Iteration**: iter-013
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Závěrečný REVIEW GATE M5-1 (produkční diff 2e71c94..HEAD, 24 souborů, +4211).
Ověřeno proti KÓDU (ne tvrzení): 5 tvrdých invariantů, soulad s designem §4.1-4.8 + arch iter-002
(§5.3 K13/§6.3/§7.1), DR-013-01 (M-1..M-4). npm test = 906/906 pass.
Výstup: agents/reviewer/artifacts/final/review_iter-013_T-009.md

## Výsledek
Verdikt: **GO — s podmínkami** (MINOR-1 gap-report + MINOR-2 tickOrder.md T4 sekce před close-iteration;
zbytek backlog). BEZ re-run. Všech 5 tvrdých invariantů PLATÍ proti kódu.

Klíčová zjištění:
- Invariant 1 (save=minimal): persistSchema.js:52-54 jen modifiers; derived/_effCache/_modVersion ne-persist. ✓
- Invariant 2 (sdílený rebuild): 5 call-sites (createInitialState:133, load:275, completeBuild:701,
  destroyInstance:553, applyRepair:731→recalcAggregates delta). load NEvolá recalc/addMods přímo. ✓
- Invariant 3 (det. fold): cmpModifier sort (source,id); set=poslední po sortu; add→mul→set. ✓
- Invariant 4 (jedna cesta): recalcBuildingAggregates Σ effective bez ×created (created zapečen ve value). ✓
- Invariant 5 (no Date.now/Math.random/DOM, catch-up): grep=0; rng stream 'buildings' na konci STREAM_NAMES
  (G1 zachován); det. instId/projectSeq; requeue-smyčka terminuje (no infinite loop). ✓
- effectFromCatalog (T2 workaround) NEnahrazen v T4 — ale legitimní (maxActiveProjects/maxProjectQueue
  nemají top-level base, nejsou agregovány); není mrtvý kód, jen design slíbil náhradu + zavádějící komentáře.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 4 (M1 gap-report neaktualizován; M2 tickOrder.md T4 sekce zastaralá+neexist. cesta effective.js;
  M3 zavádějící komentář buildings.js:787-790; M4 effectFromCatalog nekonzistence+duplicita build.js/buildersProcess)
- NIT: 4 (N1 dvojí workforce.total derivace; N2 latentní dvojí započtení při dup (attr,op);
  N3 mrtvá build.js:getMaxActiveProjects; N4 cost:{} build projektu bez audit kopie)

## NEcommitnuto, NEopravoval kód (scope per brief).
