# Brief
- **Brief ID**: BRIEF-028
- **Iteration**: iter-008 (M2b)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní spec (pro Sonnet) pro iter-008 (M2b): S-1 napojení persistu na reálnou save/load cestu, catch-up smyčka end-to-end, přerušitelnost, offline summary UI, autosave triggery, export/import. Tím je M2 hotové (offline progres).
## Context
- M2a hotovo: systémy, transakce, persist pipeline (applyPersist/loadAndReconstruct) EXISTUJÍ, ale NEJSOU napojené na reálnou save/load cestu (S-1 HIGH z review M2a). saveStore.saveGame stále ukládá celý stav (structuredClone); main.js volá loadGame bez katalogu a nenačítá katalogy.
- Benchmark (M0) potvrdil cap 8h s rezervou; catch-up MVP je vědomě minimální – dohání jen systémy M2.
## Scope IN (navrhni všechny)
- **S-1 (první)**: saveStore.saveGame ukládat přes applyPersist allowlist (ne celý stav); app bootstrap (main.js): načíst katalogy (src/data) → validovat → loadGame(slot, catalog) → loadAndReconstruct 7 kroků. Error screen při fail katalogů/savu.
- T1 catch-up smyčka end-to-end (§4.1 režim 3): při startu load → missedMs z lastSimTimestamp → dávka v chuncích (~25k kroků, yield na UI mezi chunky) → cap min(technický 8h, balanční) → dohání jen systémy M2 (catch-up-safe invariant z M2a). 
- T2 přerušitelnost dávky (D10): stopPending přeruší dávku, zbytek akumulátoru zůstane, pokračování po odkliknutí.
- T3 offline summary UI: prostý textový výčet (produkce, události, kolik času doběhlo) + catch-up progress UI nad prahem.
- T4 autosave triggery komplet (§6.2): periodicky (herní den / 60–120 s), visibilitychange→hidden / pagehide, po významných událostech.
- T5 export/import savu jako string (K12/K19, §6.5): JSON → komprese → base64, UI copy/paste.
## Inputs (POVINNÉ)
- Architektura §4.1 (clock režimy/catch-up), §6 save model, §6.2 autosave, §6.5 export, §9.2 cap (D10)
- iter-007 review: review_iter-007_T-004.md (S-1 detail)
- Kód: src/save/*, src/app/*, src/core/*; agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá S-1 + T1–T5: cesty, signatury, catch-up algoritmus (chunky/yield/cap/přerušení), autosave triggery, export formát, jak ověří test (vč. determinismu G1).
- Catch-up dohání POUZE systémy M2 (vědomě minimální); jasně označeno, jak se rozšíří v M3+ (catch-up-safe invariant).
## Expected Outputs
- agents/architect/artifacts/final/design_iter-008_T-001.md
## Constraints
- Core bez DOM; catch-up běží přes engine clock (žádný Date.now v core – nowMs injektován z app). Dávka nesmí blokovat UI (yield).
