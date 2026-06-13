# Brief (CONTINUATION M2a-1 – předchozí běh nedokončil)
- **Brief ID**: BRIEF-024b
- **Iteration**: iter-007 (M2a-1)
- **To**: coder (Sonnet)
## DŮLEŽITÉ
Předchozí běh M2a-1 nedokončil: catalog hardening je rozjetý (změněn gap-report.json, jobs.json, loader.js) a ROZBIL 1 test (gap-report _meta.iteration). Transakce/persist/formulas/factory CHYBÍ. SKUTEČNĚ dotvoř soubory a doveď `npm run ci` do ZELENÉ. Nekonči bez zelené CI + impl note + handoff.
## Krok 0: oprav rozbitý test
- `npm run ci` → padá test "gap-report.json has _meta.iteration=iter-006" (gap-report legitimně evolvuje v M2a o blocksMvp/provenance/summary dle návrhu §3). Aktualizuj příslušný test, ať odpovídá novému schématu gap-reportu (test sleduje kód). Pokud jsi nechtěně poškodil _meta, oprav.
## Krok 1: dokončit catalog hardening (§3)
- byId registr, K10 kolize ID napříč typy, typová/min-max/enum/ref validace, B4 cross-ref cost/products (food platný cíl), gap metadata (blocksMvp/provenance/summary), jobs.products jako mapa {resourceId:amount}. Testy.
## Krok 2: T1 transakční vrstva (§5)
- src/core/resources/: resourceHandlers[kind], canAfford/pay/grant, atomicita, ne-pod-nulu bez allowDeficit, txEvent přes ctx.emitTx. Testy (invarianty).
## Krok 3: T2 persist (§6)
- allowlist per doména, applyPersist, 7-krokový load (čistá konstrukce), migrace v1; uprav loadGame signaturu + app glue. createHomeState factory (§2 tvar state.home/state.player). Round-trip testy.
## Krok 4: pure formulas
- consumeFood, foodVariety, diseaseChance, crimeCount – čisté funkce + tabulkové testy.
## Scope OUT
- ŽÁDNÉ živé systémy (population/food/health/crime běh) ani stuby/kontrakty §8 – to je M2a-2.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-007_T-001.md (§1–§3,§5,§6,formulas)
- src/core/*, src/data/*, test/; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass). Core bez DOM.
## Outputs
- impl note agents/coder/artifacts/final/impl_iter-007_T-002a.md; handoff-out.sh T-002a
