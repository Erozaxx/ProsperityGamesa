# Brief

- **Brief ID**: BRIEF-015-006
- **Iteration**: iter-015 (M6)
- **Task**: T-006 = T3 (academy/university — research progres + techPt produkce)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T3** dle designu: academy/university systém — research progres (akumulace exp per sektor) a **techPt produkce**, napojení na joby/efficiency. Design je source of truth. Determinismus/catch-up-safe je tvrdá podmínka.

## Source of truth
`agents/coder/context/refs/design_iter-015.md` — čti **T3 sekci** + §2.7 (research exp přes effective). DR-015-01.

## Stav (z T-004)
- `state.player.research = { sectors: {} }` UŽ init'd v `createPlayerState` (lazy per sektor `{level, exp}`).
- `research` v persist allowlistu (ověř `persistSchema.js`).
- `unlockedTechs` + buyTech hotové.
- techPt resource handler existuje (M4a). `grant(state, {techPt:n}, cause, ctx, step)` signatura (transactions.js).
- Modifier vrstva: `effective(itemId, attr, state)` — pro `researchExp` produkci z academy/university budov.

## Scope IN (T3)
1. **`research.daily` systém** na **day** edge, **order 75** (po `buildings.age` 70) — registruj do `tickOrder.js` (`registerCorePeriodics`/declared order dle vzoru). Žádný schedule handler, žádný nový RNG stream.
2. **Research progres**: per sektor akumulace `exp` z definovaných zdrojů dle designu — typicky:
   - exp z jobů per kategorie (dle designu které joby přispívají kterému sektoru), a/nebo
   - academy/university budovy přes `effective(buildingId, 'researchExp', state)` (m-3 cesta — building agregát přes effective).
   - **Deterministické**: žádný `Math.random` (originálový university bonus VYNECHÁN — gap, viz design). Žádný Date.now/DOM.
3. **techPt produkce / level-up**: `while exp >= techCap(level)` → `exp -= techCap(level)`, `level++`, `grant(state, {techPt:1}, 'research:<sector>', ctx, step)`. (research je tick fn → má ctx → tx audit funguje, na rozdíl od command vrstvy.)
4. **Napojení na efficiency** dle designu (pokud research level ovlivňuje efficiency/produkci — přes modifikátory nebo effective; drž design).
5. **Persist**: `research.sectors` round-trip (level+exp se ukládá, deriváty ne). Ověř že fresh-vs-load determinismus drží i s research progresem.
6. **Balanc konstanty** (exp rate, zdroje) → `balance.js` s odkazem na zdroj/§.

## Scope OUT
- UI academy/tech screen = T4 (T-007).
- Tech strom / buyTech / modifikátory = hotovo (T1/T2).
- Žádné nové gameplay mimo research/techPt produkci.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej: research.daily akumulace exp + level-up + techPt grant (tabulkově proti techCap), determinismus (stejný seed → stejný research stav), persist round-trip research, fresh-vs-load s research progresem.
- `npm run smoke` OK.
- **Determinismus G1** + **M5-1 round-trip (m5-buildings-t4)** + **M6 round-trip (m6-tech-roundtrip)** nedotčené.
- **Catch-up-safe**: research běží levně v offline dávce, deterministicky.
- Precache regen jen při změně zdroje ovlivňujícího manifest.

## Inputs
- Design: `context/refs/design_iter-015.md` (T3, §2.7), DR-015-01
- T-004/T-005 summaries: `agents/coder/artifacts/final/impl_summary_iter-015_T-004.md`, `…_T-005.md`
- Kód: `src/core/engine/tickOrder.js` (edge order, buildersProcess order 40, ageBuildings 70), `src/core/state/createHomeState.js` (research init ~ř.73), `src/core/systems/buildings.js` (effective), `src/core/balance/formulas.js` (techCap), `src/core/systems/transactions.js` (grant+ctx), `src/core/systems/jobs.js` (joby — zdroj exp?), `src/save/persistSchema.js`+`load.js`, `src/data/techs.json` (sektory)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-015_T-006.md` (soubor:funkce, gate výstup, jak research produkuje techPt, zdroje exp)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
