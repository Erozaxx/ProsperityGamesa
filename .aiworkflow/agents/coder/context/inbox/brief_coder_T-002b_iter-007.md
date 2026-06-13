# Brief
- **Brief ID**: BRIEF-025 (M2a-2)
- **Iteration**: iter-007 (M2a, split 2/2)
- **To**: coder (Sonnet)
## Goal
Implementuj M2a-2 (živé systémy) PŘESNĚ dle návrhu §4,§7,§8: population/housing/food/health/crime systémy + stuby world/battle + kontraktní testy §8 (vč. negativní S-06). Staví na M2a-1 infrastruktuře (transakce, persist, formulas, createHomeState). SKUTEČNĚ vytvářej soubory, průběžně `npm run ci`, nekonči bez zelené CI + impl note + handoff.
## Scope IN (dle design_iter-007_T-001.md §4,§7,§8)
- T3 systémy population + housing: migrační akumulátor (per step), births/retirement (noon), house tiery, settlementLevel (day) – zapojené do tickOrder ve správném pořadí (§4 tabulka). Používá transakce + formulas z M2a-1.
- T4 systémy food + health + crime: meal#1/#2, fair-share food handler + foodVariety, spoilage (month), disease, crime (noon) – dle tickOrder; reálná čísla z balance.js/katalogů (nedoložitelná → approximated + gap, kalibrace M9).
- T5 stub-registrace world/battle v tickOrder a persist schématech (no-op fn) + kontraktní testy §8: determinismus prázdné bitvy, round-trip state.battle/zones, schedule s AI eventy přežívá save/load, NEGATIVNÍ test S-06 (stub world NEVOLÁ getGoldValue/market.inject před M4 – behaviorální spy + statická kontrola).
- Zapsat nové sloty do docs/tickOrder.md (živý artefakt) ve stejném commitu.
- UI: minimální zobrazení populace/jídla/zdraví (nad selektory + commands) – jen co je nutné pro ověření, ne plný panel.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-007_T-001.md (§4,§7,§8)
- M2a-1 kód: src/core/resources/, src/save/, src/core/balance/, src/core/state/createHomeState.js
- src/data/*, docs/tickOrder.md; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. systémových + kontraktních testů §8).
- Systémy deterministické a CATCH-UP-SAFE (běží v dávce bez DOM/Date.now/Math.random, levně).
- Save round-trip nových domén (population/food/health/crime); negativní test S-06 zelený.
- docs/tickOrder.md aktualizován.
## Outputs
- Kód v src/core/systems/, src/core/world/ (stuby), test/; impl note agents/coder/artifacts/final/impl_iter-007_T-002b.md; handoff-out.sh T-002b
