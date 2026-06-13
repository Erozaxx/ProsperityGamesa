# Brief (CONTINUATION M4a – předchozí běh nedokončil)
- **Brief ID**: BRIEF-037b
- **Iteration**: iter-010 (M4a)
- **To**: coder (Sonnet)
## Stav
Hotovo: taxes.js, upkeep.js, burnWood.js, accounting.js (v src/core/resources/). CHYBÍ: dokončení účetnictví, WIRING (emitTx, setTaxRate, CouncilScreen), impl note. A 6 tsc chyb.
## Krok 0: oprav 6 tsc chyb
- src/core/commands/setTaxRate.js: BALANCE.taxes nemá rateMin/rateMax → doplň je do balance.js (approximated, gap-flag) nebo oprav referenci; oprav typy (state.player, CommandRegistry param).
- src/core/resources/accounting.js: state.council/world.council typ → doplň do types.d.ts (state.world.council nebo home.monthlyFinances dle návrhu) + persist schéma.
## Krok 1: dokonči účetnictví + WIRING (jinak RE-RUN)
- ctx.emitTx = tx => recordTx(state, tx) zapojit v bootSequence (main.js) – dnes 0× → txEventy se zahazují. Test: účetnictví zaznamenává po platbě.
- setTaxRate command registrovat v bootstrapEngine (vzor setSpeed) – dnes 0×. Test dosažitelnosti přes send().
- closeMonth (month order, poslední) → monthlyFinances report.
## Krok 2: T4 UI
- CouncilScreen (tab Rada) napojený v App.js přes selectFinance + send('setTaxRate').
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. účetního invariantu Σ gold tx == Δ gold, tabulkových daní/upkeep/burnWood, wiring testů).
- Core bez DOM; catch-up-safe; účetnictví observer (žádná mutace v platbě).
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-010_T-001.md; src/*; review pattern z iter-009 (commandy v bootstrapEngine); agents/coder/AGENTS.md
## Outputs
- impl note agents/coder/artifacts/final/impl_iter-010_T-002.md; handoff-out.sh T-002
