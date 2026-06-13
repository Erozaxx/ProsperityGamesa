# Impl note: iter-008 T-002 (M2b offline catch-up)

## Hotovo (dle návrhu design_iter-008_T-001.md)
- S-1: saveStore.saveGame přes applyPersist allowlist; src/app/catalogs.js (load+validace+buildById); main.js bootstrap (katalogy→loadGame(slot,catalog)→loadAndReconstruct); error screen; createHomeState čte BALANCE.start.
- T1: src/core/engine/catchup.js (catchupStepCount + runCatchupBatch; chunky ~25k + yield; cap min(8h, balanční); dohání jen M2 přes step→runTick = týž kód jako live).
- T2: přerušitelnost (stopPending přes state.engine.running, pendingCatchup, resume).
- T3: buildOfflineSummary (čistý model) + OfflineSummary/CatchupProgress UI.
- T4: src/app/autosave.js (throttle 60s, 'hide' obejde; 4 triggery).
- T5: src/save/exportString.js (applyPersist→JSON→lz-string→base64; import přes loadAndReconstruct); vendor lz-string (@ts-nocheck dle konvence); UI copy/paste.

## CI
- tsc --noEmit: 0 (po @ts-nocheck na vendorovaném lz-string)
- grep gate core: OK (33 souborů)
- node --test: 458/460 — 2 FAIL = benchmark sanity (viz nález)

## NÁLEZ pro test loop (T-003) – benchmark regrese
- Cena kroku narostla z ~73 ns (M0/iter-005) na ~8000–8751 ns po M2a (systémy + devInvariants každý krok na větším stavu).
- Práh testu je 10000 ns → měření těsně pod, ale FLAKY pod zátěží CI (občas překročí).
- Pravděpodobná příčina: devInvariants (assertSerializable deep-walk) běží v DEV každý krok; produkční catch-up (DEV off) by měl být řádově levnější.
- Úkol pro testera: změřit produkční cestu (DEV off) reprezentativně, opravit bench sanity test ať není flaky a měří správnou věc; ověřit, že catch-up 8h reálně < strop.
