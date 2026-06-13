# Brief
- **Brief ID**: BRIEF-038
- **Iteration**: iter-010 (M4a)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop M4a dle §1.3: účetní konzistence (Σ txEventů == Δ goldu), tabulkové daně/upkeep/burnWood, catch-up-safe, save round-trip, PWA smoke. + ověř runtime wiring.
## Scope IN
- `npm run ci` zelené.
- ÚČETNÍ INVARIANT: suma gold txEventů za měsíc == Δ goldu (žádné peníze nevzniknou/nezmizí mimo účetnictví). Klíčový test.
- Tabulkové: monthlyTax = curRate×curWorkers×22 (TAXCENTERBASE), localTaxes (5days+daily), militaryUpkeep = w×108+a×162, burnWood (Zima floor(0.5×cur)/Jaro+Podzim floor(0.2×cur)/Léto 0), foodSpoilage měsíčně floor(rate×count).
- WIRING ověř: ctx.emitTx zapojen (po platbě se účetnictví aktualizuje – integrační test přes bootSequence); setTaxRate dosažitelný přes send() po bootu.
- catch-up-safe (účetnictví a daně v dávce == live); save round-trip (council/monthlyFinances + migrace v1→v2); PWA smoke.
- Doplň chybějící edge testy; negativně (nedostatek na upkeep → flag, ne výjimka).
## Inputs
- src/core/systems/{taxes,upkeep,burnWood}.js, src/core/resources/accounting.js, src/app/main.js, src/save/migrations.js, test/; návrh design_iter-010_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky. Při FAIL přesně co.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-010_T-003.md + případné nové testy
