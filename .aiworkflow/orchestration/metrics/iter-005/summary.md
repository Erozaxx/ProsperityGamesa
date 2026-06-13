# Orchestration Metrics: iter-005 (M0b) — DoD M0 hotovo

| Agent | Task | Model | poznámka |
|---|---|---|---|
| architect | T-001 design | opus | 145634 tok / 59 tool / 634s |
| coder | T-002 impl | sonnet | ~3 běhy (přerušení+dokončení); CI 107/107 |
| tester | T-003 test loop | sonnet | PASS 122/122; +15 edge |
| reviewer | T-004 review | opus | GO; cap 8h potvrzen |

## Výsledek (M0 hotovo)
- PWA shell (preact+htm ESM), SW cache-first + precache, IndexedDB save (kill-safe, N=3 rotace, fallback)
- Syntetický benchmark ~66–78 ns/krok → cap 8h potvrzen; .github/workflows/ci.yml
- CI 122/122. Review GO. Carry-over: A2 reálné HW, htm licence, BUG-001 → M1.
