# Orchestration Metrics: iter-019 (M8 – Příběh & meta vrstva)

- **Closed**: 2026-06-15

## Per-Agent Metrics

| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 (M8 design) | 143109 | 83 | 710276 |
| reviewer | T-002 (design review) | 97432 | 47 | 416315 |
| tom-proxy | T-003 (human gate) | 69614 | N/A | N/A |
| coder | T-004 (T1 story) [zachráněno] | ~314000 | N/A | N/A |
| coder | T-005 (T3 achievementy K18) | 151116 | 145 | 1169216 |
| coder | T-006 (T2+T4 intro/gamelog) | 164784 | 137 | 1041502 |
| tester | T-007 (test loop + DoD M8) | 85787 | 59 | 473701 |
| reviewer | T-008 (review gate + DoD M8) | 133469 | 75 | 487501 |
| tom-proxy | T-009 (close gate) | N/A | N/A | N/A |

> Orchestrátorské tokeny nejsou dostupné (N/A).

## Výsledek
- **DoD M8 splněn**: obsahová vrstva kompletní (intro/tutoriál + story/acknowledge + achievementy K18 + gamelog/notifikace).
- CI 1514/1514, smoke OK, determinismus G1 + catch-up-safe nedotčen.
- MAJOR-1 firstStarve dead trigger opraveno v M8 (mirror diseaseActive + regrese test).
- Carry-over na M9: MINOR-1 (survivedWinter once), MINOR-2 (chained event skip loadStoryEvent), 3 nit, + dříve evidované gapy (G-BUILD/RECRUIT-TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1).
