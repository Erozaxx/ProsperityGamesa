# Orchestration Metrics: iter-006 (M1) — DoD M1 hotovo

| Agent | Task | Model | poznámka |
|---|---|---|---|
| architect | T-001 design | opus | 127878 tok; klíč: dump prázdný → derived/approximated |
| coder | T-002 impl | sonnet | více běhů; 17 katalogů, BUG-001 fix |
| tester | T-003 test loop | sonnet | PASS 238/238 (+66) |
| reviewer | T-004 review | opus | GO; S-1..S-3 → M2 backlog |

## Výsledek (M1)
- Extrakční pipeline (16 extractorů, reprodukovatelná) → 17 katalogů (6 extracted/4 derived/6 approximated)
- balance.js + formulas.js (reálná referenční čísla); fail-fast validátor; effects kostra; BUG-001 fix
- Gap report (strojový + lidský). Re-planning checkpoint M2+ PASS (DR-003) – plán beze změny.
