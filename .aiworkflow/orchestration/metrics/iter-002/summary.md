# Orchestration Metrics: iter-002

- **Closed**: 2026-06-12

## Per-Agent Metrics

| Agent | Task | Model | total_tokens | tool_uses | duration_ms |
|-------|------|-------|-------------|-----------|-------------|
| architect | T-001 | fable (xhigh) | 151639 | 38 | 925114 |
| reviewer | T-002 (pokus 1, socket err) | opus | 5276 | 19 | 272313 |
| reviewer | T-002 (pokus 2, session limit) | opus | 9359 | 25 | 366286 |
| reviewer | T-002 (úspěšný) | opus | 106591 | 29 | 433220 |
| architect | T-003 (rework) | fable | 105528 | 35 | 475150 |

> Orchestrátorské tokeny nejsou dostupné (N/A).

## Poznámky
- Návrh architektury (T-001) na Fable bez timeoutu (~15 min).
- Reviewer (T-002) dvakrát přerušen infra (socket error, session limit), třetí běh úspěšný po resetu limitu.
- T-003 = zapracování všech nálezů review (S-01..S-06, N-01..N-04) na žádost uživatele (i když review byla 0-blocker).
- Bonus deliverable: doc/HLD/architecture-overview.html (HTML one-pager s blokovými diagramy).
