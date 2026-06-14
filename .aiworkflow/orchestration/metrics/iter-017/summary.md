# Orchestration Metrics: iter-017 (M7a-2)

- **Closed**: 2026-06-15
- **Goal**: M7a-2 – Frakční AI + revolty/questy/tribute + UI → DoD M7a kompletní
- **Outcome**: MERGED do main (PR #20, 0c4635e); ci 1260/1260, smoke OK; DoD M7a komplet

## Per-Agent Metrics
| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 design | 166357 | 67 | 685872 |
| reviewer | T-002 design review | 146584 | 40 | 431322 |
| architect | T-002a revize | 106549 | 54 | 438650 |
| tom-proxy | T-003 gate | 85866 | 36 | 191673 |
| coder | T-004 T2 (2 spawny+WIP) | ~234000 | – | – |
| coder | T-005 T3 | 143270 | 89 | 758747 |
| coder | T-006 T6 UI | 118299 | 89 | 527338 |
| tester | T-007 QA | 126080 | 109 | 606382 |
| reviewer | T-008 gate | 127082 | 61 | 420521 |
| coder | T-008a minor | 62704 | 67 | 397976 |

> Orchestrátorské tokeny N/A. Pozn.: T-004 přes 2 spawny (uříznutí + dokončení); F-1 dodělal orchestrátor.
