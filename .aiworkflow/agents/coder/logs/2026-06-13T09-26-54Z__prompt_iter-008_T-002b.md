# Brief (CONTINUATION M2b – předchozí běh nedokončil)
- **Brief ID**: BRIEF-029b
- **Iteration**: iter-008 (M2b)
- **To**: coder (Sonnet)
## DŮLEŽITÉ
Předchozí běh M2b nedokončil. Hotovo: catchup.js, catalogs.js, část S-1. CHYBÍ: dokončení S-1 typů, T2 přerušitelnost, T3 summary UI, T4 autosave.js, T5 exportString.js + lz-string vendor, impl note. A 2 tsc chyby. SKUTEČNĚ dotvoř soubory a doveď `npm run ci` do ZELENÉ.
## Krok 0: oprav 2 tsc chyby
- src/save/saveStore.js(104): applyPersist vrací Record<string,unknown>, ale je přiřazen kam TS čeká GameState. Oprav typy (saveGame ukládá persistovaný podstrom – uprav JSDoc/typ payloadu, ať tsc projde; payload je allowlist výřez, ne celý GameState).
- src/ui/OfflineSummary.js vs offlineSummary.js – KOLIZE casing (dva soubory liší se jen velikostí písmen). Sjednoť na JEDEN soubor (OfflineSummary.js), oprav importy, smaž duplikát.
## Zbývající kroky (dle design_iter-008_T-001.md)
- Dokonči S-1 (main.js bootstrap katalogy→loadGame(slot,catalog)→loadAndReconstruct; error screen; createHomeState čte BALANCE.start) pokud není hotové.
- T2 přerušitelnost (stopPending přes state.engine.running, pendingCatchup, resume).
- T3 buildOfflineSummary (čistý model) + OfflineSummary/CatchupProgress UI.
- T4 app/autosave.js (throttle 60s, 'hide' obejde; 4 triggery periodicky/visibilitychange/pagehide/události).
- T5 save/exportString.js (applyPersist→JSON→lz-string→base64; import přes loadAndReconstruct) + vendor lz-string + UI copy/paste.
- Testy: chunked==single-batch (G1), export→import round-trip, save přes allowlist, catch-up cap.
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass). Core bez DOM. catch-up=týž kód jako live.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-008_T-001.md; src/* ; agents/coder/AGENTS.md
## Outputs
- impl note agents/coder/artifacts/final/impl_iter-008_T-002.md; handoff-out.sh T-002
