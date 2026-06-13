# Brief
- **Brief ID**: BRIEF-023
- **Iteration**: iter-007 (M2a)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní implementační spec (pro Sonnet) pro iter-007 (M2a): transakční vrstva, persist schémata + migrace, systémy population/housing/food/health/crime, stuby world/battle + kontraktní testy §8. NAVÍC catalog hardening z M1 review. Posuď a doporuč split M2a-1/M2a-2.
## Context
- M0+M1 hotovo: engine core, PWA, save minimal, 17 katalogů + balance/formulas. Teď M2a = první živé herní systémy + transakční/persist infrastruktura.
- Toto je nejhustší iterace (architektura §11/S-04: 3× L). Architektura POVOLUJE split M2a-1 (T1–T2 infrastruktura: transakce+persist) / M2a-2 (T3–T5 systémy+stuby). V návrhu DOPORUČ, zda split provést (a jak), na základě reálné komplexity.
- catch-up-safe invariant (S-05) se zde POPRVÉ zavádí: každý systém deterministický, levný v dávce, bez DOM/Date.now/Math.random.
## Scope IN (navrhni všechny)
- T1 transakční vrstva (K5/D7, §7.1): resourceHandlers[kind], generické canAfford/pay/grant, txEvent emise, invarianta ne-pod-nulu bez allowDeficit.
- T2 deklarativní persist schémata (K11, §6.3): allowlist per doména, generický save průchod, load = čistá konstrukce dle §6.4 (7 kroků), migrace v1 (očíslované kroky).
- T3 systémy population + housing: migrační akumulátor (per step), births/retirement (noon), house tiery, settlementLevel (day) – dle tickOrder.
- T4 systémy food + health + crime: meal#1/#2, fair-share food handler + foodVariety, spoilage (month), disease, crime (noon) – dle tickOrder; balanc čísla do balance.js.
- T5 stub-registrace world/battle v tickOrder a persist schématech (no-op fn) + kontraktní testy §8: determinismus prázdné bitvy, round-trip state.battle/zones, schedule s AI eventy přežívá save/load, NEGATIVNÍ test S-06 (stub world nevolá getGoldValue/market.inject před M4).
- Catalog hardening (M1 review S-1/S-2/S-3): byId registr, K10 kolize napříč typy, B4 cross-ref cost/products proti registru zdrojů, typová/min-max/enum validace schémat; gap-report metadata (blocksMvp/provenance); jobs.products připravit na mapu {resourceId:amount}.
## Inputs (POVINNÉ)
- Architektura: §4.3 tickOrder, §5 katalogy, §6 save, §7 resource/transakce, §8 kontrakty bitva/AI, §9.4 R4 stuby
- iter-006 review: agents/reviewer/artifacts/final/review_iter-006_T-004.md (S-1..S-3, N-1/N-2)
- Engine+data: src/core/*, src/data/*; agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá T1–T5 + catalog hardening: cesty, signatury, datové tvary state.population/housing/food/health/crime, persist allowlist per doména, migrace formát, kontraktní testy §8 vč. S-06.
- Doporučení split M2a-1/M2a-2 (ano/ne + jak rozdělit tasky a DoD).
## Expected Outputs
- agents/architect/artifacts/final/design_iter-007_T-001.md
## Constraints
- Core bez DOM. Všechny nové systémy catch-up-safe (deterministické, levné v dávce). Persist schéma vzniká SE systémem (§14.3).
