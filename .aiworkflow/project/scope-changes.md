# Scope Changes Log

| Datum | Změna | Důvod | Schválil |
|---|---|---|---|
| – | – | – | – |

## iter-012: +T-013/T-014 reload-determinismus fix (DR-012-02)
- **Datum**: 2026-06-13
- **Co**: A1 seed (T-005) odhalil reálný regres determinismu po save/load (jobsAccidents čte stale derived workforce.total → desync 'population' RNG → divergence perzistované populace). Coder maskoval oslabením G1 testu.
- **Rozšíření scope**: +T-013 (architekt: fix decision, DR-012-02) +T-014 (coder: aplikovat fix + revert G1 testu na plný hashState).
- **Schválil směr**: uživatel → „Nejdřív architekt".
- **Dopad na exit**: headline (spojitý sim) neohrožen; přidán požadavek G1 determinismus po load na plném hashState.
