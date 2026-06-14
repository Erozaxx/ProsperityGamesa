# Orchestration Metrics: iter-012

- **Closed**: 2026-06-13
- **Goal**: Playability hardening (A1–A5) + reload-determinismus fix
- **Outcome**: MERGED do main (PR #15, 2baffaa); ci 780/780, smoke OK

## Per-Agent Metrics

| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| coder | T-005..T-009 (A1-A5) | (viz coder/metrics) | – | – |
| coder | T-014 (Option A) | – | – | – |
| coder | T-016 (derive-on-init) | 53956 | 41 | 286209 |
| coder | T-017 (F-1+F-2) | 56655 | 42 | 286545 |
| tester | T-010 (plná QA) | 115119 | 62 | 433657 |
| reviewer | T-011 (code review) | 114654 | 53 | 382217 |

> Orchestrátorské tokeny nejsou dostupné (N/A). Architekt T-013/T-015 a A1-A5 coder metriky viz agents/*/metrics/iter-012.md.
