# Iteration Plan: iter-008

- **Created**: 2026-06-13
- **Goal**: M2b – Offline catch-up MVP + autosave → M2 hotovo: zavřu hru, vrátím se, osada mezitím žila (end-to-end offline progres). Dle master plánu §3/iter-008 (T1–T5). PRVNÍ úkol: S-1 napojení persist pipeline na reálnou save/load cestu (carry-over z M2a review).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-008: S-1 napojení persistu (saveStore.saveGame přes applyPersist allowlist; main.js bootstrap: načíst katalogy → loadGame s katalogem → loadAndReconstruct), T1 catch-up smyčka end-to-end (§4.1 režim 3: load → missedMs → dávka chunky ~25k + yield → cap min(technický,balanční) → dohání jen systémy M2), T2 přerušitelnost dávky (stopPending), T3 offline summary UI (textový výčet), T4 autosave triggery komplet (§6.2), T5 export/import savu (komprese+base64). Model: Opus.
- [ ] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep + catch-up-safe. Model: Sonnet.
- [x] T-003: tester – Test loop (Sonnet): e2e catch-up scénáře (krátký výpadek/nad cap/event uprostřed dávky), determinismus catch-upu (G1), export/import round-trip, PWA smoke. Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run): acceptance „offline progres" splněno; catch-up MVP vědomě minimální = OK, ale invariant pro M3+ vyhlášen. Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Persist pipeline napojena na reálnou save/load cestu (S-1)
- [x] Implementace prošla test loop (e2e catch-up + determinismus G1)
- [ ] Review gate GO (= DoD M2)

## Exit Criteria
- osada žije offline – progres se dopočítá po návratu vč. capu a summary; autosave pokrývá mobilní swipe away; export/import funguje; reviewer GO.
