# Orchestration Metrics: iter-018 (M7b)

- **Closed**: 2026-06-15
- **Goal**: M7b – Bitvy (battle automat) → DoD M7 kompletní
- **Outcome**: MERGED do main (PR #21, 5e465cc); ci 1385/1385, smoke OK; DoD M7 komplet

## Per-Agent Metrics
| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 design | 91304 | 40 | 552707 |
| reviewer | T-002 design review | 97064 | 44 | 397830 |
| architect | T-002a revize | 94479 | 46 | 451224 |
| tom-proxy | T-003 gate | 75332 | 30 | 193982 |
| coder | T-004 T1+T2 automat | 173503 | 144 | 1388212 |
| coder | T-005 T3 battleCommand | 101134 | 49 | 353421 |
| coder | T-006 T4 invaze/offline | 136078 | 81 | 542941 |
| coder | T-007 T5 UI | 121867 | 65 | 407085 |
| tester | T-008 QA (re-dispatch) | 143660 | 92 | 696773 |
| reviewer | T-009 gate | 139726 | 58 | 513564 |

> Orchestrátorské tokeny N/A. T-008 původní běh zabit reclaimem → re-dispatch.
