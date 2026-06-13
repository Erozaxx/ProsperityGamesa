# Brief
- **Brief ID**: BRIEF-024 (M2a-1)
- **Iteration**: iter-007 (M2a, split 1/2)
- **To**: coder (Sonnet)
## Goal
Implementuj M2a-1 (infrastruktura) PŘESNĚ dle návrhu §1–§3, §5, §6, §3-formulas: catalog hardening + transakční vrstva + persist schémata + pure formulas. SKUTEČNĚ vytvoř soubory a průběžně `npm run ci`. Nekonči bez zelené CI + impl note + handoff.
## Scope IN (dle design_iter-007_T-001.md)
- §3 catalog hardening: byId registr + K10 kolize ID napříč typy + typová/min-max/enum/ref validace schémat + B4 cross-ref cost/products proti registru zdrojů (food platný cíl) + gap-report metadata (blocksMvp/provenance/summary) + jobs.products → mapa {resourceId:amount}.
- §5 T1 transakční vrstva: resourceHandlers[kind], canAfford/pay/grant, atomicita, ne-pod-nulu bez allowDeficit, txEvent přes ctx.emitTx (opt-in).
- §6 T2 persist: deklarativní allowlist per doména, applyPersist, 7-krokový load (čistá konstrukce), migrace v1. Uprav loadGame signaturu + app glue ve stejném commitu (návrh §1 to flaguje).
- §2 fixovaný tvar state.home/state.player + createHomeState factory (kontrakt pro round-trip testy).
- pure formulas (consumeFood, foodVariety, diseaseChance, crimeCount) – čisté funkce s referenčními čísly.
- Testy: catalog validace+kolize+cross-ref, tx invarianty (ne-pod-nulu, atomicita, txEvent), persist round-trip přes createHomeState, formulas tabulkové.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-007_T-001.md
- src/core/*, src/data/*; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc, grep gate core OK, node --test vše pass). Core bez DOM.
## Outputs
- Kód; impl note agents/coder/artifacts/final/impl_iter-007_T-002a.md; bash scripts/handoff-out.sh T-002a "M2a-1 infrastruktura hotova; CI zelene"
