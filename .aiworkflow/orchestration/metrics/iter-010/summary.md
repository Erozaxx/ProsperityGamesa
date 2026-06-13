# Orchestration Metrics: iter-010 (M4a) — DoD M4a hotovo

| Agent | Task | Model | poznámka |
|---|---|---|---|
| architect | T-001 design | opus | research subagent na ekonomiku; odhalil emitTx gap |
| coder | T-002 impl + continuation | sonnet | taxes/upkeep/burnWood/účetnictví + wiring |
| tester | T-003 test loop | sonnet | PASS 693; účetní invariant ✓ |
| reviewer | T-004 review | opus | GO (0 blockerů; crime.js → M4b) |

## Výsledek (M4a)
- Daně (monthlyTax curRate×curWorkers×22, localTaxes), upkeep (108/162), burnWood (sezónní)
- Účetnictví OBSERVER (recordTx, žádná mutace v platbě); ctx.emitTx zapojen; CouncilScreen UI
- CI 693/693; účetní invariant Σ tx == Δ gold (live i catch-up). Design preempce wiring = bez re-runu.
