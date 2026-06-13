# Brief
- **Brief ID**: BRIEF-029
- **Iteration**: iter-008 (M2b)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-008 (M2b) PŘESNĚ dle návrhu. SKUTEČNĚ vytvářej soubory, průběžně `npm run ci`, nekonči bez zelené CI + impl note + handoff. Tím je M2 hotové (offline progres end-to-end).
## Scope IN (dle design_iter-008_T-001.md) – v tomto pořadí
1. S-1: saveStore.saveGame přes applyPersist allowlist; app/catalogs.js (load+validace+buildById); přepis main.js bootstrap (katalogy → loadGame(slot,catalog) → loadAndReconstruct); error screen kind catalog/save; createHomeState čte BALANCE.start (S-2).
2. T1: core/engine/catchup.js (catchupStepCount + runCatchupBatch: chunky ~25k, yield mezi chunky, cap min(technický 8h, balanční) z balance.offline; dohání jen systémy M2 přes step→runTick).
3. T2: přerušitelnost (stopPending přes state.engine.running, pendingCatchup, resume).
4. T3: buildOfflineSummary (čistý model) + OfflineSummary/CatchupProgress UI.
5. T4: app/autosave.js (throttle 60s, 'hide' obejde; 4 triggery periodicky/visibilitychange/pagehide/události).
6. T5: save/exportString.js (applyPersist→JSON→lz-string→base64; import přes loadAndReconstruct); vendor lz-string; UI copy/paste.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-008_T-001.md
- src/save/*, src/app/*, src/core/*; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass).
- catch-up = TÝŽ kód jako live (žádná druhá implementace); chunked==single-batch (G1) test; export→import round-trip test; save přes allowlist (ne celý stav).
- Core bez DOM (nowMs/missedMs injektován z app).
## Outputs
- Kód; impl note agents/coder/artifacts/final/impl_iter-008_T-002.md; handoff-out.sh T-002
