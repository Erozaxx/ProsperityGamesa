# Brief
- **Brief ID**: BRIEF-027
- **Iteration**: iter-007 (M2a)
- **To**: reviewer (Opus) – review gate s pravomocí re-run
## Goal
Review gate iter-007 (M2a) = DoD M2a. Verdikt GO / RE-RUN. Klíč: persist schéma vzniklo SE systémem, tickOrder aktualizován ve stejných commitech, kontrakty §8 zavedeny.
## Scope IN
- DoD M2a (master plán): populace/jídlo/zdraví/krimi běží deterministicky live i v dávce; save round-trip všech nových domén; stuby + kontraktní testy existují.
- Catch-up-safe invariant (S-05) reálně drží (ne jen testy projdou – posuď i kód, zda systémy nemají skryté ne-determinismy/alokace v hot-path).
- Kontrakty §8 vč. negativního S-06 (world/battle stuby nevolají goldValue/market.inject před M4).
- Soulad s návrhem design_iter-007_T-001.md (split M2a-1/M2a-2, transakce, persist 7 kroků, catalog hardening).
- Kvalita: persist allowlist (ne celý stav), balance čísla do balance.js s odkazem/approximated+gap, tickOrder pořadí věrné, hranice vrstev (core bez DOM).
- Spusť `npm run ci`.
## Inputs
- src/core/systems/, src/core/resources/, src/save/, src/core/catalog/, test/, docs/tickOrder.md; návrh, impl notes T-002a/b, test report; architektura §4.3/§6/§7/§8; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Verdikt GO / RE-RUN; nálezy klasifikované; při RE-RUN přesně co opravit.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-007_T-004.md
