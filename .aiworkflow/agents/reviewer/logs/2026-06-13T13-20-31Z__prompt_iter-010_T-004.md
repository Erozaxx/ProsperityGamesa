# Brief
- **Brief ID**: BRIEF-039
- **Iteration**: iter-010 (M4a)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-010 (M4a) = DoD M4a. Verdikt GO / RE-RUN. Klíč: ekonomika auditovatelná z událostí (účetnictví observer), commandy v runtime + UI napojené.
## Scope IN
- DoD M4a: ekonomika gold/daně/upkeep funguje a je AUDITOVATELNÁ z událostí (účetní invariant Σ tx == Δ gold).
- WIRING (poučení M2b/M3): ctx.emitTx zapojen v bootSequence (jinak účetnictví mrtvé), setTaxRate registrovaný v runtime, CouncilScreen napojený v App.js. OVĚŘ reálně, ne jen unit.
- Účetnictví je OBSERVER (žádná inline mutace v platebních větvích – anti-pattern originálu opraven).
- Soulad s návrhem + reálnými čísly (TAXCENTERBASE 22, upkeep 108/162, burnWood koeficienty, spoilage).
- catch-up-safe; persist+migrace v1→v2 (council round-trip); core bez DOM.
- Spusť `npm run ci`.
## Inputs
- src/core/systems/{taxes,upkeep,burnWood}.js, src/core/resources/accounting.js, src/app/main.js, src/ui/screens.js, src/save/migrations.js, test/; návrh, impl note, test report; architektura §7.2; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; nálezy klasifikované; při RE-RUN přesně co.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-010_T-004.md
