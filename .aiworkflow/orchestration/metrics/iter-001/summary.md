# Orchestration Metrics: iter-001

- **Closed**: 2026-06-12

## Per-Agent Metrics

| Agent | Task | Model | total_tokens | tool_uses | duration_ms |
|-------|------|-------|-------------|-----------|-------------|
| architect | T-001 | fable (xhigh) | 193948 | 62 | 1057919 |
| architect | T-002 (timeout) | fable (xhigh) | 12276 | 22 | 597776 |
| architect | T-002a | fable (xhigh) | 148885 | 40 | 769637 |
| architect | T-002b | fable (xhigh) | 101712 | 42 | 701409 |
| reviewer | T-003 | opus | 112095 | 46 | 436473 |
| architect | T-004 | fable | 92806 | 30 | 356853 |

> Orchestrátorské tokeny nejsou dostupné (N/A).

## Poznámky
- T-002 (široký task) padl na Fable stream idle timeout → rozdělen na T-002a + T-002b (úspěšné).
- Fable: 5/6 architektonických běhů úspěšných, hluboké výstupy + nález reálných bugů; široké tasky lépe štěpit.
