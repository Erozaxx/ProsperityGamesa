# Orchestration Metrics: iter-016 (M7a-1)

- **Closed**: 2026-06-14
- **Goal**: M7a-1 – Zóny, jednotky & napojení trhu
- **Outcome**: MERGED do main (PR #19, bbaf10e); ci 1179/1179, smoke OK; DoD M7a-1 splněno

## Per-Agent Metrics
| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 design | 141187 | 54 | 593545 |
| reviewer | T-002 design review | 94800 | 53 | 439715 |
| architect | T-002a revize | 96165 | 41 | 336222 |
| tom-proxy | T-003 gate | (viz tom-proxy) | – | – |
| coder | T-004 T1 zone tick | 144234 | 244 | 2575207 |
| coder | T-005 T4 jednotky | 110836 | 69 | 474620 |
| coder | T-006 T5 napojení trhu | 140052 | 69 | 570712 |
| tester | T-007 QA (re-dispatch) | 112199 | 70 | 558754 |
| reviewer | T-008 gate | 116495 | 49 | 432428 |
| coder | T-008a minor fixes | 67534 | 57 | 289295 |

> Orchestrátorské tokeny N/A. T-007 původní běh zabit reclaimem kontejneru → re-dispatch.
