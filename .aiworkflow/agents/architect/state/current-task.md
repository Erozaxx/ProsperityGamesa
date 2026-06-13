# Current Task

- **Task ID**: T-001 (iter-008)
- **Brief**: context/inbox/brief_architect_T-001_iter-008.md (BRIEF-028)
- **Iteration**: iter-008 (M2b – offline catch-up: persist napojení + catch-up + autosave + export)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – DETAILNÍ implementační spec (pro Sonnet codera) pro iter-008 (M2b). NE implementace.
Výstup: `artifacts/final/design_iter-008_T-001.md`.

Pokrytí (čerpáno z REÁLNÝCH src/save/*, src/app/*, src/core/*, balance.json, testů):
- S-1 (první): saveGame→applyPersist allowlist; nový app/catalogs.js (load+validace katalogů,
  buildById K10); main.js bootstrap: katalogy → loadGame(slot,catalog) → loadAndReconstruct 7 kroků;
  createHomeState čte BALANCE.start (S-2); error screen kind:'catalog'/'save'.
- T1 catch-up end-to-end: nový core/engine/catchup.js (catchupStepCount, runCatchupBatch chunky
  ~25k + yield mezi chunky, cap min(technický 8h, balanční) z balance.offline); dohání jen živé
  systémy M2 (step→runTick→registerCorePeriodics); G1 test chunked==single-batch.
- T2 přerušitelnost: stopPending (state.engine.running=false slot v clock.js i runCatchupBatch),
  zbytek zůstává (app pendingCatchup), resume po acknowledgeEvent; v M2b mechanismus+test (eventy M8).
- T3 offline summary UI: buildOfflineSummary (čistý model, textový výčet pop/jídlo/zlato/čas),
  OfflineSummary + CatchupProgress views, progress nad prahem progressThresholdSteps.
- T4 autosave: nový app/autosave.js (throttle 60s, 'hide' obejde throttle, flush); triggery
  periodicky (timer/herní den) / visibilitychange→hidden / pagehide (lifecycle.js) / události
  (settlementLevel↑, konec catch-upu).
- T5 export/import: nový save/exportString.js (applyPersist→JSON→lz-string→base64; import přes
  loadAndReconstruct = stejná validace/migrace), vendor lzstring, UI copy/paste.
- §7 catch-up-safe invariant + rozšiřitelnost M3+ (registrace do tickOrder, catchup.js se nemění).

## Klíčové invarianty zdůrazněné coderovi
Core bez DOM/reálného času (missedMs injektován z app); catch-up = TÝŽ kód jako live (step);
dohání jen systémy M2 automaticky; G1 determinismus (chunked==batch, export→import round-trip).

## Alternativy (zamítnuté)
Alt1 agregátní vzorcový catch-up (rozbíjí G1 + dvojí implementace), Alt2 bez chunkování (blokuje UI),
Alt3 komprese i pro IDB (CPU daň, §6.5 plain disk). Vše s důvody v §9 spec.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-028
- [x] POVINNÉ vstupy: architektura §4.1/§4.3/§6/§6.2/§6.5/§9.2 (D3/D6/D10), review_iter-007_T-004 (S-1)
- [x] Prozkoumán REÁLNÝ src/save/* (saveStore/load/persistSchema/migrations/schema),
      src/app/* (main/loop/lifecycle/persist/env), src/core/* (engine clock/index/tickOrder/rng,
      catalog loader/validate, state factories, commands/dispatch) + ui (App/render/ErrorScreen) + testy
- [x] Spec S-1 + T1-T5 (cesty, JSDoc signatury, algoritmy chunky/yield/cap/přerušení, autosave
      triggery, export formát, jak ověří test vč. determinismu G1)
- [x] Catch-up dohání POUZE M2 + rozšiřitelnost M3+ (catch-up-safe invariant) explicitně
- [x] Min. 1 alternativa (3 alternativy s důvody)
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí (D1-D13 beze změny); scope OUT respektován (žádný kód).
- balance.offline doplní coder (approximated, ladí M9); lz-string vendor doporučen (fallback btoa);
  S-2 sjednocení factories minimum = bootstrap/load aplikují BALANCE.start, zbytek gap M3.

## Blockery
–
