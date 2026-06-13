# Iteration Plan: iter-009

- **Created**: 2026-06-13
- **Goal**: M3 – Produkce, joby, skilly: produkční smyčka dřevo/jídlo/ruda, přiřazování pracovníků, efektivita, skilly (2× kompenzace). Dle master plánu §3/iter-009 (T1–T5). Plus backlog z M2b (BL-3 getCatalog cache).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-009: T1 systémy forest/field/mine (stocky trees/animals/ores/livestock/farmland jako resource handlery, regenerace lesa 10 dní, mine/field periodika, area/used plocha), T2 joby+produkce (quarterDay: jobsProduction vč. builder slotu, autoAssignWorkers, accidents; assignJob command), T3 workerEfficiency (day, čistá formula + napojení na produkci), T4 skilly (skillsProgress per step, 2× kompenzace maxStep/2 dle K4, startSkill command, UI), T5 UI obrazovky forest/field/mine/jobs. Plus BL-3 (getCatalog cache mimo hot-path). Model: Opus.
- [ ] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep + catch-up-safe. Model: Sonnet.
- [x] T-003: tester – Test loop (Sonnet): tabulkové testy produkce/efficiency proti referencím, catch-up-safe invariant nových systémů, save round-trip, PWA smoke. Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run): pořadí uvnitř dne ověřeno proti zdroji a zapsáno do tickOrder (věrnost §4.3). Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Implementace prošla test loop (produkce + catch-up-safe + workerEfficiency napojení)
- [x] tickOrder aktualizován (pořadí uvnitř dne věrné zdroji)
- [ ] Review gate GO (= DoD M3)

## Exit Criteria
- produkční smyčka hratelná na mobilu; skilly progresují s kompenzací; vše catch-up-safe; reviewer GO.
