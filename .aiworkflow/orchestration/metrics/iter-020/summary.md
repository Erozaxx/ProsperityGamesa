# Orchestration Metrics: iter-020 (M9a – Balanční kalibrace)

- **Closed**: 2026-06-15

## Per-Agent Metrics

| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 (M9a design) | 111735 | 39 | 493750 |
| reviewer | T-002 (design review) | 94631 | 47 | 386594 |
| tom-proxy | T-003 (cap gate) | 48523 | 11 | 117875 |
| coder | T-004 (C-020-A trh) | 123530 | 53 | 434648 |
| coder | T-005 (C-020-B cap+regression) | 145286 | 83 | 748018 |
| tester | T-006 (test loop + DoD M9a) | 99235 | 56 | 411151 |
| reviewer | T-007 (review gate + DoD M9a) | 87634 | 38 | 294285 |
| tom-proxy | T-008 (close gate) | N/A | N/A | N/A |

> Orchestrátorské tokeny nejsou dostupné (N/A).

## Výsledek
- **DoD M9a splněn**: trh + offline cap kalibrovány proti explicitním hratelnostním cílům; balanc regression zelená; vědomé odchylky zapsané.
- CI 1550/1550, smoke OK, determinismus G1 nedotčen.
- driftK=0.2 calibrated (G-MARKET-DRIFT closed); cap=8h (capBalanceRealHours, MINOR-1 wiring fix); regression bit-identičnost (golden 4005350179).
- Carry-over na M9b/cleanup: TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1; M8 MINOR-1/2 + nity.
