# Brief

- **Brief ID**: BRIEF-019-004
- **Iteration**: iter-019 (M8)
- **Task**: T-004 = T1 (importantEvent + story progres)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T1 (importantEvent + story progres)** dle designu — engine-stopping eventy + acknowledgeEvent + catch-up pauza. Nejcitlivější task M8 (determinismus + jediná core engine změna). Design je source of truth. Drž invarianty.

## Source of truth
`agents/coder/context/refs/design_iter-019.md` — čti **T1 (importantEvent/story, engine-stopping, catch-up pauza)**. DR-019-01 (MAJ-1). Originál `doc/original_source/.../events.js`+`game.js`.

## ⚠️ Tvrdé invarianty
1. **state.story.* plain-data serializovatelné**: `{event, queue, used, lines, tutorials, pendingEffects}` — žádné closury, žádné katalog-ref/funkce (orig pasti `evt.speaker=itemList[]`, `options[].fn` — vyhni se; speaker resolve v SELEKTORU, ne ve stavu). Save uprostřed eventu → identický load.
2. **Engine-stopping eventy přes EXISTUJÍCÍ `running===false` break** (clock.js advance + catchup.js runCatchupBatch — kontrakt už v repu, beze změny). `acknowledgeEvent` command nastaví `running=true` + spustí pendingEffects.
3. **Jediná core engine změna (advance)**: `advance()` MUSÍ **zahodit akumulátor při `running===false`** (paralela existující `factor===0` pauzy) — jinak zastavený engine po acku přeskočí. Přesně dle designu.
4. **MAJ-1 catch-up re-vstup (main.js, NOVÝ kód)**: `runCatchupBatch` vrací `interrupted` při engine-stopping eventu → zaveď **while-smyčku** v main.js (re-vstup s `remaining`, cap NEporušen — byl ořezán předem). **autosave/buildOfflineSummary PŘESUNOUT ZA smyčku** (ne uprostřed přerušeného catch-upu).
5. **Determinismus**: `acknowledgeEvent` NELOSUJE RNG (stream nezměněn); žádný Date.now/Math.random/DOM v core; catch-up cap-safe.

## Scope IN (T1)
- `state.story.*` init (createInitialState — pokud už existuje, jen rozšiř dle designu) + persist (persistSchema).
- importantEvent systém (`src/core/systems/story.js` nebo dle designu): `storyCheck` (day order 90) — deklarativní triggery (sdílí predikát-cestu s achievementy T3, NE imperativní), `storyApplyEffects` (step order 5).
- `acknowledgeEvent` command + registrace v bootstrapu (anti-dark-code).
- `advance()` akumulátor-zahození při running===false.
- main.js catch-up re-vstup while-smyčka (MAJ-1) + přesun autosave/offline summary.

## Scope OUT
- Achievementy = T3 (T-005) — ale predikát-cesta sdílená; pokud zavádíš `evalPredicate`/`predicate.js`, koordinuj (T3 ho dokončí). Intro/tutoriál obsah + gamelog UI = T2+T4 (T-006). NEsahej M7 battle/world automaty.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: story event spustí engine-stop (running=false), acknowledgeEvent → running=true + effects, save uprostřed eventu → identický load (hashState), **catch-up pauza** (engine-stopping event uprostřed dávky → interrupted → re-vstup remaining → pokračování, cap neporušen), ack nelosuje RNG.
- `npm run smoke` OK.
- **Determinismus G1** + **M7 (m7b-battle, m7a2-world) + M5/M6** nedotčené; žádný Date.now/Math.random/DOM v core.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-019.md`, DR-019-01
- Kód: `src/core/engine/clock.js` (advance, running break ~77, factor===0 ~64), `src/core/engine/catchup.js` (runCatchupBatch ~51), `src/app/main.js` (catch-up volání ~315-345, autosave/buildOfflineSummary, ctx.emitTx ~200), `src/core/state/createInitialState.js` (story stav), `src/save/persistSchema.js`, `src/core/commands/` (vzor), `src/core/engine/tickOrder.js`, originál `events.js`/`game.js`

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-019)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-019_T-004.md` (soubor:funkce, gate výstup, jak vyřešeny engine-stopping/MAJ-1/determinismus, sdílená predikát-cesta pro T3)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
