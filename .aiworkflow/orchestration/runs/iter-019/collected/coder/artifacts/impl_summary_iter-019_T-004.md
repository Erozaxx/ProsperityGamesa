# Impl Summary — iter-019 T-004 (T1 importantEvent + story)

> POZNÁMKA: Doplnil orchestrátor. T-004 přes duplicitní spawny: původní agent uříznut (CI red, WIP 501afed);
> jeho sub-spawn (a14f41df) práci PLNĚ dokončil (1426/1426); paralelní re-dispatch (ab6c8127) přidal redundantní
> duplicitní test m8-story-t1.test.js se 3 fail → zastaven (TaskStop) + duplikát odstraněn. Produkční kód = a14f41df verze.
> Nezávisle ověřeno orchestrátorem (CI 1426/1426, determinismus, smoke OK) → zachráněno (LL-006).

## Co implementováno (soubor:funkce)
- `src/core/systems/story.js`: storyCheck (day order 90, deklarativní triggery), storyApplyEffects (step order 5).
- `src/core/commands/story.js`: acknowledgeEvent (running=true + pendingEffects, NELOSUJE RNG) + registerStoryCommands.
- `src/core/systems/predicate.js`: evalPredicate (sdílí T3) — JSDoc typy opraveny.
- `src/data/story.json`: 12 MVP eventů (introWelcome/firstSettlement/…), vlastní/parafráze CZ texty (R-G provenance:'original-paraphrased').
- `src/core/engine/clock.js`: advance() zahodí akumulátor při running===false; clock.js:84 TS2367 fix (===false→!).
- `src/app/main.js`: registerStoryCommands wired; buildCtxCatalog načte story (map); **MAJ-1 while-smyčka** re-vstupu runCatchupBatch (main.js:337, autosave/buildOfflineSummary AŽ ZA smyčkou).
- `src/core/state/types.d.ts`: StoryEventDef/StoryCatalog + CatalogCache.story + TickContext.emitEvent? (minimal stub pro T4).
- `createInitialState.js`: story plný init {event,queue,used,lines,tutorials,pendingEffects}; catalogs.js+schemas.js story katalog.
- `test/m8-story.test.js`: 41 testů (engine-stop, acknowledgeEvent+effects, save round-trip, catch-up interruption, RNG non-consumption, evalPredicate).

## Gate (nezávisle ověřeno orchestrátorem)
- npm run ci: 1426/1426 pass, 0 fail (typecheck+lint+test)
- smoke: OK
- determinismus G1 + M7 (m7b-battle, m7a2-world) + M5/M6 nedotčené; m8-story 41/41
- emitEvent: minimal stub v TickContext type pro T1; reálná UI bus implementace = T4 (T-006)

## Sdílená predikát-cesta pro T3
predicate.js/evalPredicate je sdílený — T3 (achievementy) ho rozšíří o achievement predikáty.
