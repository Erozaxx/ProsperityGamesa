# Brief
- **Brief ID**: BRIEF-037
- **Iteration**: iter-010 (M4a)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-010 (M4a) PŘESNĚ dle návrhu. SKUTEČNĚ vytvářej soubory, průběžně `npm run ci`, nekonči bez zelené CI + impl note + handoff.
## KRITICKÉ (z návrhu – wiring gapy, jinak RE-RUN)
- ctx.emitTx NIKDE není přiřazen → txEventy se zahazují. Zapoj `ctx.emitTx = tx => recordTx(state, tx)` v bootSequence (pokryje live i catchup, sdílený ctx).
- setTaxRate command EXPLICITNĚ registruj v bootstrapEngine (vzor setSpeed).
- CouncilScreen napojený do App.js (tab Rada) přes selectFinance + send('setTaxRate').
## Scope IN (dle design_iter-010_T-001.md)
- T1: taxes.js (grant gold přes resource vrstvu; gold/techPt handlery už z M2a – použij), tax vzorce do formulas.js (TAXCENTERBASE=22: monthlyTax=curRate×curWorkers×22; localTaxes 5days+daily=rate×curWorkers), setTaxRate command registrovaný.
- T2: upkeep.js (military totWarriors×108+totArchers×162, insufficient→flag bez výjimky), burnWood.js (Zima floor(0.5×curWorkers)/Jaro+Podzim floor(0.2×curWorkers)/Léto 0; konzumuje firewood), foodSpoilage refactor na pay s emitTx (měsíčně, floor(rate×count)).
- T3: accounting.js OBSERVER recordTx (žádná mutace v platbě), ctx.emitTx zapojen, closeMonth (month order 40 poslední) → monthlyFinances report. Účetní invariant Σ gold tx == Δ gold (TEST).
- T4: CouncilScreen (tab Rada) + selectFinance napojené v App.js.
- Persist schéma + migrace v1→v2; gapy approximated (localRate/monthlyRate default) do gap-report.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-010_T-001.md
- src/core/resources/ (handlers/txEvent), src/core/systems/, src/app/main.js (bootSequence), src/ui/ (screens), src/data/balance.json; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. účetního invariantu + tabulkových daní/upkeep/burnWood).
- ctx.emitTx zapojen (test ověří, že účetnictví zaznamenává); setTaxRate dosažitelný v runtime; CouncilScreen napojený.
- Core bez DOM; catch-up-safe; účetnictví observer (žádná inline mutace v platbě).
## Outputs
- Kód; impl note agents/coder/artifacts/final/impl_iter-010_T-002.md; handoff-out.sh T-002
