# Orchestration Metrics: iter-014 (M5-2)

- **Closed**: 2026-06-14
- **Goal**: M5-2 – Kontrakty (K14) + build UI → DoD M5 kompletní
- **Outcome**: MERGED do main (PR #17, 735846d); ci 990/990, smoke OK; DoD M5 hotový

## Per-Agent Metrics
| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 design | 191147 | 70 | 652789 |
| reviewer | T-002 design review | 154179 | 58 | 475887 |
| architect | T-002a revize | 111912 | 35 | 345460 |
| tom-proxy | T-003 gate | (viz tom-proxy) | – | – |
| coder | T-004 T5 kontrakty | 176540 | 144 | 1080290 |
| coder | T-005 T6 build UI | N/A (zemřel/zachráněno) | – | – |
| tester | T-006 QA | 117197 | 62 | 527783 |
| reviewer | T-007 gate | 136483 | 60 | 404811 |

> Orchestrátorské tokeny N/A. T-005 coder zemřel před handoffem; práce ověřena+zachráněna orchestrátorem.
