# DR-016-01 — M7a split (M7a-1/M7a-2) + designové podmínky

- **Datum**: 2026-06-14
- **Stav**: Rozhodnuto (architekt T-001 + reviewer T-002 GO-s-podmínkami; revize T-002a, tom-proxy gate T-003)

## Rozhodnutí
1. **Split M7a potvrzen**: **iter-016 = M7a-1 (T1 zone tick + T4 jednotky + T5 market.inject)**, **iter-017 = M7a-2 (T2 frakční automat + T3 revolty/questy/tribute/AI-AI bitvy + T6 UI)**. M7a-1 samostatně hratelné (jednosměrná T2→čte data T1; market kontrakt §8.2 se uzavře v M7a-1; jednotky reuse upkeep M4a). DoD M7a se vyhodnotí po M7a-2. Downstream: M7b=iter-018, M8=iter-019, M9a=iter-020, M9b=iter-021 (orientačně).

2. **Designové podmínky (GO-s-podmínkami, zapracovat PŘED kódem):**
   - **M-1 (major correctness)**: round-robin `curStep % dist === 0` (převzato z originálu per-step) je na DAY-edge prakticky mrtvý (curStep násobek 900, dist=347, 900%347≠0 nikdy) → processZone se nespustí, zónová ekonomika tichý no-op. Přepočítat na **day-index round-robin** (zoneIndex z dayIndex, ne curStep%dist).
   - **M-2 (major, DR-012-02 třída)**: re-hydratace zón — (a) `world.zones`/`world.factions` chybí v `createWorldState()` → fresh-vs-load asymetrie; (b) generický `Object.assign` na pole zones[] → stale tail/index↔id mismatch → **id-based merge**; (c) sdílená `hydrateZones` fn volaná z load i createInitialState, žádná load-only větev (M5-R1 gate). + fresh-vs-load test.
   - Tribute split: akumulace v M7a-1 processZone, výběr přes month-edge v M7a-2.

## Potvrzeno bez akce
- market kontrakt §8.2 (getGoldValue/marketInject signatury beze změny); battle.js NEDOTČEN (AI-AI=RNG vzorec, AI-vs-player=scheduleInsert stub M7b); žádný duplicitní upkeep; G-LISTZONE approximací OK (Q3); tickOrder gatherTributes month 25 volný.

## Reference
- Design: agents/architect/artifacts/final/design_iter-016_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-016_T-002.md
