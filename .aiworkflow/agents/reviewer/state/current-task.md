# Current Task

- **Task ID**: T-011 (Code review celé implementace iter-012, playability A1-A5 + reload-determinismus fix)
- **Brief**: BRIEF-012-011
- **Iteration**: iter-012
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: Code review produkčního diffu `1418072..HEAD` (src/ tools/ test/) — A1 seed,
A2 resolver, A3 crime no-throw, A4 sanity-cap + denní sazba, A5 market CSS, reload-determinismus
fix (deriveWorkforceTotal single source of truth). Ověřeno proti architektuře T-003, DR-012-01/02,
impl summaries (T-005-009/T-014/T-016) a QA reportu T-010.
Výstup: agents/reviewer/artifacts/final/code_review_iter-012_T-011.md

## Výsledek
Verdikt: **GO** (žádný blocker ani major → orchestrátor nereopne).

Klíčová zjištění:
- Determinismus invariant DODRŽEN: deriveWorkforceTotal je single source of truth na 3 kanonických
  místech (init/load/autoAssign), žádná 4. kopie, žádná změna RNG cesty, save tvar v3 zachován,
  G1 plný hashState zelený.
- A1 seed čistý (single source v createInitialState, žádný dvojí seed), A2 Option A early-return
  přesně dle DR-012-01 (no-op s katalogem), A3 jen regress test, A4 ÷364 + symetrický hard-cap.
- F-1 (minor): healthBirths clamp shrinkuje již-nad-cap loaded populaci → formálně odporuje R-A4-3
  ("existující explodované savy zůstanou"). Nízký dopad (default seed sem nedojde).

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 3 (F-1 births shrink over-cap; F-2 duplikace sanity-cap výrazu vs populationSanityCap;
  F-3 mrtvý _catalog param v load.js)
- NIT: 4 (F-4 inline ÷DAYS_PER_YEAR; F-5 balance.json mirror; F-6 A3 test assert; F-7 hashA komentář)

## Kód neměněn (scope OUT). Negitcommitnuto.
