# Current Task

- **Task ID**: T-004
- **Brief**: BRIEF-027
- **Iteration**: iter-007
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: review gate iter-007 (M2a = DoD M2a), pravomoc re-run.
Výstup: agents/reviewer/artifacts/final/review_iter-007_T-004.md

## Výsledek
Verdikt: **GO**. 0 BLOCKER.
DoD M2a splněno: populace/jídlo/zdraví/krimi deterministicky live i v dávce (catch-up-safe
ověřen i v KÓDU – žádné skryté ne-determinismy/alokace v hot-path), save round-trip nových domén
na úrovni pipeline (applyPersist allowlist + loadAndReconstruct 7 kroků), stuby world/battle +
kontraktní testy §8 vč. negativního S-06 (world.js nevolá goldValue/market.inject – staticky i behaviorálně).
Soulad s návrhem (split, transakce atomické, persist 7 kroků, catalog hardening S-1/S-2/S-3/N-1/N-2).
tickOrder pořadí věrné, docs/tickOrder.md aktualizován ve stejné iteraci. core bez DOM.

Vlastní ověření: `npm run ci` → tsc 0, lint:core grep gate OK (32 souborů), node --test 460/460.
Working tree čistý — kód neměněn.

Nálezy (vše non-blocking):
- S-1 (HIGH, první v M2b): persist pipeline (applyPersist/loadAndReconstruct) NENÍ napojen na reálnou
  saveStore/load cestu; main.js volá loadGame bez katalogu a nenačítá katalogy → produkční save ukládá
  celý stav, load obchází 7 kroků. Design řadí bootstrap/catch-up do M2b → ne BLOCKER.
- S-2: createInitialState volá createHomeState přímo + nepoužité BALANCE.start (mrtvý startovní balanc).
- S-3: food handler capuje per-druh na 500 místo agregátu; foodAggregate handler chybí.
- N-1: crime.js "advance RNG" komentář zavádějící (makeRng je lazy, stream se neposune).
- N-2: sdílený 'population' RNG stream (disease+crime) bez dokumentace.
- N-3: migrate() čte verzi z payload.meta místo top-level obálky (bez dopadu při prázdném řetězu).

## Předpoklady
- Catch-up MVP / end-to-end bootstrap (S-1) je dle design §0 explicitně M2b → odchylka klasifikována
  jako SUGGESTION, ne BLOCKER. DoD M2a-1 vyžadoval pipeline + round-trip testy zelené, to splněno.

## Blockery
Žádné. Doporučení: GO → orchestrátor může uzavřít iter-007 / pustit M2b.
S-1 přenést jako prioritní první úkol M2b; S-2/S-3/N-* do M3/M9 backlogu.
