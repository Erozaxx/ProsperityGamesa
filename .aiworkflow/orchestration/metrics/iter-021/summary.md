# Orchestration Metrics: iter-021 (M9b – Release kandidát)

- **Closed**: 2026-06-17

## Per-Agent Metrics

| Agent | Task | total_tokens | tool_uses | duration_ms |
|-------|------|-------------|-----------|-------------|
| architect | T-001 (M9b design) | 162900 | 58 | 572202 |
| reviewer | T-002 (design review) | 86336 | 44 | 406844 |
| tom-proxy | T-003 (design gate) | 47069 | 9 | 115820 |
| coder | T-004 (C-021-A mobile UX+PWA, 2 běhy) | ~241000 | ~160 | ~1310000 |
| coder | T-005 (C-021-B licence/PROVENANCE+docs) | 107341 | 65 | 642002 |
| tester | T-006 (test loop + e2e release) | 86493 | 39 | 321208 |
| reviewer | T-007 (RELEASE GATE) | 84280 | 26 | 230798 |
| human(user) | T-008 (licence GPL-3.0 + close) | N/A | N/A | N/A |

> Orchestrátorské tokeny nejsou dostupné (N/A). T-004 = 2 běhy (1. uříznut reclaimem, re-dispatch dokončil).

## Výsledek
- **DoD M9b = DoD M9 = RELEASE KANDIDÁT**. Master plán M0–M9 KOMPLETNÍ.
- Mobile UX (touch≥44px, render≤15/s, iOS Safari) + PWA audit (evikce R-F, SW save-safe update) + PROVENANCE (0 verbatim) + GPL-3.0 licence (user gate).
- CI 1566/1566, smoke OK, determinismus G1 nedotčen (hashState identický s iter-020).
- Licence: **GPL-3.0-or-later** + fan disclaimer (rozhodl uživatel).
- Known issues (KNOWN_ISSUES.md): carry-over gapy, žádný blokující.
