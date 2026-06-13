# Orchestration Metrics: iter-007 (M2a) — DoD M2a hotovo

| Agent | Task | Model | poznámka |
|---|---|---|---|
| architect | T-001 design | opus | split M2a-1/M2a-2 doporučen |
| coder | T-002a M2a-1 | sonnet | catalog hardening+transakce+persist+formulas; více běhů |
| coder | T-002b M2a-2 | sonnet | population/housing/health/food/jobs/crime + stuby + §8 |
| tester | T-003 test loop | sonnet | PASS 460/460; catch-up-safe 13/13 |
| reviewer | T-004 review | opus | GO; S-1 HIGH → M2b první úkol |

## Výsledek (M2a)
- Transakční vrstva + persist (allowlist, 7-krokový load, migrace v1) + catalog hardening
- Živé systémy populace/jídlo/zdraví/krimi (catch-up-safe), stuby world/battle + kontrakty §8 (S-06)
- CI 460/460. Carry-over S-1 (persist napojit na save/load cestu) = první úkol M2b.
