# Current Task

- **Task ID**: T-004 (iter-016 M7a-1 — zone tick + zones catalog + hydrateZones + determinismus)
- **Brief**: brief_coder_T-004_iter-016.md
- **Iteration**: iter-016
- **Status**: done
- **Done**: 2026-06-14

## Vysledek
- worldTick: day-index round-robin (§2.1 formula), makeRng('world'), slot-boundary gate
- processZone: economy/policy (resource/growth/military), goldDemand/goldProduction, goldStore drain, M7a-2 stubs
- hydrateZones: id-based merge sdílená s createInitialState i load.js; katalog order wins; stale tail discarded
- zones.json: 13 zón (1 player, 5 theWarlord, 6 thePrincess, 1 thePsychopath), 8 aiStates, 4 factions, 3 policies; provenance na každé zone
- zones extractor (tools/extract/extractors/zones.mjs): updatován na plný katalog (zabraňuje přepsání testem iter006)
- Persist: goldDemand/goldProduction přidány do zónového persist schématu (M-2 gate)
- home.store přidáno do persist schema (M-2 gate; opravuje round-trip determinismus)
- BALANCE.world: zonePeriodDays, goldDemandPerUnit, goldProdPerWorker, growth/military constants
- CI: 1131/1131 pass, 0 fail
- Precache: regenerován (node tools/gen-precache.mjs)
- Git: NEcommitováno
