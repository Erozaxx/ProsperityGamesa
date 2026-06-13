# Brief
- **Brief ID**: BRIEF-036
- **Iteration**: iter-010 (M4a)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní spec (pro Sonnet) pro iter-010 (M4a): gold/daně/upkeep + účetnictví observer + UI. Staví na M3.
## DŮLEŽITÉ POUČENÍ (z M2b/M3 re-run)
Návrh MUSÍ explicitně pokrýt END-TO-END APP INTEGRACI: každý nový command registrovaný v bootstrapEngine/main.js, ctx.catalog napojení, a UI obrazovky napojené na commands/selektory. Ne jen simulační jádro. Bez toho review udělá RE-RUN.
## Scope IN (navrhni všechny)
- T1 gold/techPt handlery (už částečně z M2a – ověř) + daně: localTaxes (5 dní), taxes (month), setTaxRate command (REGISTROVAT v main.js), tax vzorce do formulas.js.
- T2 upkeep (month) + burnWood (day) + foodSpoilage napojení na ekonomiku (upkeep z budov/jednotek; reálná čísla z balance/katalogů).
- T3 účetnictví jako OBSERVER (K5/§7.2): txEvent → měsíční finanční report, consumption/productionHistory; ŽÁDNÁ inline mutace v platebních větvích (observer pattern přes txEvent stream z M2a).
- T4 UI: finanční přehled/council panel (daně se setTaxRate, měsíční report) napojený na App.js.
## Inputs (POVINNÉ)
- Architektura §7.2 účetnictví/observery, §5 balanc; doc/original_source_doc.md + doc/original_source/modules (daně/upkeep mechaniky + čísla: TAXCENTERBASE, CITYGUARDBASE z balance)
- M3 kód: src/core/systems/, src/core/resources/ (txEvent, handlers), src/app/main.js (bootstrapEngine pattern), src/ui/ (screens pattern); agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá T1–T4: cesty, signatury, tax/upkeep vzorce s reálnými čísly, observer účetnictví (txEvent→report), command registrace v main.js, UI napojení.
- Účetní invariant: suma txEventů == delta goldu (testovatelné).
## Expected Outputs
- agents/architect/artifacts/final/design_iter-010_T-001.md
## Constraints
- Core bez DOM; catch-up-safe; účetnictví observer (žádná inline mutace v platbě). Balanc čísla s odkazem/approximated+gap.
