# Brief (RE-DISPATCH — dokončení T-004)

- **Brief ID**: BRIEF-019-004b
- **Iteration**: iter-019 (M8)
- **Task**: T-004 = T1 (importantEvent + story) — DOKONČENÍ (předchozí běh uříznut, CI RED)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## ⚠️ Kontext re-dispatch
Předchozí běh T-004 byl **uříznut** s **rozbitým typecheckem** (CI RED). Hotovo a commitnuto (WIP checkpoint `501afed`):
- ✅ NOVÉ soubory: `src/core/systems/story.js` (storyCheck/storyApplyEffects), `src/core/commands/story.js` (acknowledgeEvent), `src/core/systems/predicate.js` (evalPredicate — sdílí T3), `src/data/story.json`; `clock.js` advance running===false; `tickOrder.js`; `createInitialState.js` story init.
- ❌ **ROZBITÉ/CHYBÍ (tvůj úkol):**

## Scope IN (dokončení)
1. **Oprav typecheck RED** (`npm run ci` typecheck musí projít) — ověř `tsc --noEmit`:
   - `src/core/systems/predicate.js`: chybí JSDoc typy (obj/path/acc/p params `any`; predikát-data tvar `kind/path/value/paths/all/any/atLeast/id`) → přidej `@typedef` pro predikát-data + parametr typy.
   - `src/core/systems/story.js:22,66`: `getCatalog('story')` → `CatalogCache` typ nemá `story` → přidej `story` do CatalogCache type (`src/core/catalog/` types) a registruj story do CATALOG_NAMES/loader (jako jiné katalogy).
   - `src/core/systems/story.js:89`: `ctx.emitEvent` → `TickContext` nemá `emitEvent`. emitEvent je T4 (UI event bus). Pro T1: přidej `emitEvent?` (optional) do `TickContext` typu (`types.d.ts`) jako minimal stub; reálnou implementaci dodá T4 (T-006). NEBO odlož emitEvent z T1 (story log do state.log/queue). Zvol dle designu, vyjasni v summary.
   - `src/core/engine/clock.js:84`: TS2367 (`running === false` kde typ je narrowed na `true`) → oprav typ/guard (např. typovat `running: boolean` nebo restrukturalizovat).
2. **MAJ-1 catch-up re-vstup while-smyčka** (main.js, NOVÝ): main.js dnes má jen `if (!result.interrupted)` (ř.329) — jednorázové. Zaveď **while-smyčku** re-vstupu `runCatchupBatch` s `remaining` dokud není `interrupted=false` NEBO čeká na ack (engine-stopping event uprostřed → smyčka skončí, čeká na acknowledgeEvent, po acku pokračuje). **autosave/buildOfflineSummary AŽ ZA smyčkou** (ne uprostřed). Cap NEporušen. Dle DR-019-01 MAJ-1.
3. **Testy** (NOVÝ soubor např. `test/m8-story-t1.test.js`): story event→engine-stop (running=false), acknowledgeEvent→running=true+effects, save uprostřed eventu→identický load (hashState), catch-up pauza (event uprostřed dávky→interrupted→re-vstup remaining→pokračování, cap neporušen), ack nelosuje RNG.

## ⚠️ Invarianty (drž)
- state.story.* plain-data (žádné closury/funkce/katalog-ref ve stavu; speaker resolve v selektoru).
- acknowledgeEvent NELOSUJE RNG; žádný Date.now/Math.random/DOM v core.
- Engine-stopping přes EXISTUJÍCÍ running===false break (beze změny kontraktu); advance() zahodí akumulátor při running===false.

## Scope OUT
- Achievementy = T3 (predikát-cesta sdílená — predicate.js dokonči pro T1 potřeby, T3 rozšíří). Intro/tutoriál obsah + gamelog UI + reálný emitEvent = T2+T4 (T-006). NEsahej M7.

## Gate (DoD)
- `npm run ci` ZELENÉ (0 fail, **typecheck projde**) — uveď počet testů.
- `npm run smoke` OK.
- Determinismus G1 + M7 (m7b-battle, m7a2-world) + M5/M6 nedotčené; žádný Date.now/Math.random/DOM v core.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-019.md`, DR-019-01
- WIP soubory: `src/core/systems/story.js`, `commands/story.js`, `systems/predicate.js`, `data/story.json`, `clock.js`, `tickOrder.js`
- Kód: `src/app/main.js` (catch-up ~315-345, interrupted ~329), `src/core/state/types.d.ts` (TickContext, CatalogCache), `src/core/catalog/loader.js`+`index.js` (CATALOG_NAMES), `src/save/persistSchema.js`

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-004 (iter-019)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-019_T-004.md`
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
