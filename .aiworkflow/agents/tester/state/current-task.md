# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-038
- **Iteration**: iter-010
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Dokončeno. Nezávislý test loop M4a – účetní invariant, tabulkové daně/upkeep/burnWood, catch-up-safe, save round-trip council+taxRate, wiring setTaxRate via send(), foodSpoilage → accounting, negativní edge cases.

## Předpoklady
- Produkční kód implementován coderem T-002 (M4a: taxes/upkeep/burnWood/accounting/setTaxRate/CouncilScreen).
- Scope OUT: žádné změny produkčního kódu – jen nové testy.

## Blockery
–

## Checklist (z briefu iter-010 BRIEF-038)
- [x] npm install && npm run ci ZELENÉ (668 pass před, 693 pass po přidání testů)
- [x] ÚČETNÍ INVARIANT: Σ gold txEventů == Δ goldu (ručně + full tick run + catch-up multi-month)
- [x] Tabulkové: monthlyTax=curRate×curWorkers×22, localTaxes (5days+daily), militaryUpkeep=w×108+a×162, burnWood (Zima 0.5×/Jaro+Podzim 0.2×/Léto 0), foodSpoilage (floor(rate×count))
- [x] WIRING: ctx.emitTx zapojen (accounting-observer.test.js + boot-integration); setTaxRate dosažitelný přes send() po bootu (m4a-edge.test.js)
- [x] catch-up-safe: accounting v dávce == live (catch-up determinism test + hash tests)
- [x] save round-trip: council/monthlyFinances + taxRate/totWarriors/diseaseFromColdChance + migrace v1→v2 (persist.test.js + m4a-edge)
- [x] PWA smoke: gen-precache.test.js (existující, zelené)
- [x] Edge negativní: nedostatek na upkeep → flag notEnoughMilitaryFunding (ne výjimka)
- [x] Chybějící edge testy doplněny (m4a-edge.test.js: 25 nových testů)
- [x] Verdikt zapsán do artifacts/final/testreport_iter-010_T-003.md
