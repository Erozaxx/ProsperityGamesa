# Iteration Plan: iter-010

- **Created**: 2026-06-13
- **Goal**: M4a – Gold, daně, upkeep, účetnictví: peníze tečou – daně, upkeep a finanční reporty z transakčních událostí. Dle master plánu §3/iter-010 (T1–T4).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-010: T1 gold/techPt handlery + daně (localTaxes 5 dní, taxes month, setTaxRate command, tax vzorce do formulas.js), T2 upkeep (month) + burnWood (day) + foodSpoilage napojení na ekonomiku, T3 účetnictví jako observer (K5/§7.2: txEvent → měsíční finanční report, consumption/productionHistory; žádná inline mutace v platebních větvích), T4 UI finanční přehled/council panel. POVINNÉ: commandy registrované v runtime + UI napojené (poučení z M2b/M3 re-run). Model: Opus.
- [ ] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep + catch-up-safe + runtime wiring. Model: Sonnet.
- [ ] T-003: tester – Test loop (Sonnet): účetní konzistence (suma txEventů = delta goldu), tabulkové testy daní/upkeep, catch-up-safe, round-trip, PWA smoke. Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run). Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Commandy (setTaxRate) registrované v runtime + UI napojené
- [ ] Implementace prošla test loop (účetní konzistence + tabulkové daně/upkeep)
- [ ] Review gate GO (= DoD M4a)

## Exit Criteria
- ekonomika gold/daně/upkeep funguje a je auditovatelná z událostí; reviewer GO.
