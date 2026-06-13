# Current Task

- **Task ID**: T-001 (iter-007)
- **Brief**: context/inbox/brief_architect_T-001_iter-007.md (BRIEF-023)
- **Iteration**: iter-007 (M2a – transakce/persist/systémy/stuby + catalog hardening)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – DETAILNÍ implementační spec (pro Sonnet codera) pro iter-007 (M2a). NE implementace.
Výstup: `artifacts/final/design_iter-007_T-001.md`.

Pokrytí (čerpáno z REÁLNÝCH src/core/*, src/data/*, balance.json, docs/tickOrder.md):
- Catalog hardening (M1 review S-1/S-2/S-3/N-1/N-2): byId registr + kolize ID napříč typy (K10),
  typová/min-max/enum/ref validace schémat, B4 cross-ref cost/products (food jako platný cíl N-2),
  gap-report blocksMvp+summary, jobs.products → mapa {resourceId:amount}.
- T1 transakční vrstva (§7): resourceHandlers[kind], canAfford/pay/grant (atomicita, ne-pod-nulu
  bez allowDeficit, NaN guard), txEvent emise přes opt-in ctx.emitTx.
- T2 persist (§6.3-6.4): PERSIST_SCHEMA allowlist per doména, applyPersist, loadAndReconstruct
  7 kroků (čistá konstrukce + createHomeState), migrations.js v1 řetěz.
- T3 population+housing: migrační akumulátor (step), births/retirement (noon), settlementLevel (day).
- T4 food+health+crime: meal#1(day)/#2(noon), consumeFood fair-share + foodVariety, spoilage(month),
  disease lifecycle, crime; nové balance konstanty + pure formulas.
- T5 stuby world/battle (no-op/null) + kontraktní testy §8 vč. NEGATIVNÍ S-06 (world nevolá
  getGoldValue/market.inject před M4).
- tickOrder §4 tabulka (nové sloty retirement/disease/crime/meal2/settlementLevel/spoilage).
- Cílový tvar state.home/state.player (§2) jako kontrakt.

## Doporučení ke splitu
ANO – split M2a-1 (catalog hardening + T1 transakce + T2 persist + pure formulas; čistě jednotkově
testovatelná infrastruktura) / M2a-2 (T3+T4+T5 živé systémy + kontraktní testy). M2a-1 je tvrdá
prerekvizita M2a-2. Tvar state.home fixován v §2 předem → žádný schéma drift. Alternativy B (bez
splitu) a C (3+ split) zamítnuty s důvody (§9).

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-023
- [x] POVINNÉ vstupy: architektura §4.3/§5/§6/§7/§8/§9.4, review_iter-006_T-004 (S-1..S-3,N-1/N-2)
- [x] Prozkoumán REÁLNÝ src/core/* (state/engine/registry/catalog/balance/save/commands/systems)
      + src/data/* (population/houseTypes/food/jobs/resources/balance/buildings/companies/military/zones/gap)
      + docs/tickOrder.md + tickOrder.js + calendar.js
- [x] Spec catalog hardening + T1-T5 (cesty, JSDoc signatury, datové tvary, persist allowlist,
      migrace formát, algoritmy, jak ověří test, catch-up-safe S-05)
- [x] Doporučení split M2a-1/M2a-2 + DoD každé části + min. 1 alternativa
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí (D1-D13 beze změny); scope OUT respektován (žádný kód).
- Reálná balanční čísla (start stav, disease/crime/variety) dotěží coder z home.js/config.js;
  nedoložitelné → approximated + gap, kalibrace M9.
- Implementaci provede Sonnet ve 2 krocích dle splitu.

## Blockery
–
