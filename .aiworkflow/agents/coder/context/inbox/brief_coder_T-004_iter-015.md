# Brief

- **Brief ID**: BRIEF-015-004
- **Iteration**: iter-015 (M6)
- **Task**: T-004 = T1 (tech strom + buyTech + techCap + player state init)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T1** dle schváleného designu: tech strom (katalog), `buyTech` command, techCap reuse, a **player state init** (M-1, determinismus-kritické). Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-015.md` (po revizi T-002a) — čti T1 sekci, §1.3a (player init M-1), §2.6 (catalog guard M-2 — pro T2, ale `findTech`/`hasCatalog` infrastrukturu zaveď zde) + DR-015-01.

## Scope IN (T1)
1. **techs.json approximovaný strom**: ~6 sektorů + ~6 techů dle designu (efekty jako modifikátory — popis polí dle designu, `provenance:'approximated'`). Wiring: `techs` do `CATALOG_NAMES` (`src/app/catalogs.js`) + schema validátor (`src/core/catalog/schemas.js`) + `findTech(techId)` helper (čte `getCatalog('techs')`, nemění `byId`).
2. **techCap reuse**: vzorec UŽ existuje `formulas.js:31` (`round(100×1.25^level)`). NEpřidávej nový — jen reuse + **tabulkový test** proti referenčním hodnotám (100, 125, 156, …).
3. **M-1 player state init (determinismus)**: v `createPlayerState` (`src/core/state/createHomeState.js`) přidej `unlockedTechs:{}` (+ `research:{sectors:{}}` připrav, plné research je T3 — ale init pole teď, ať fresh==load). Přidej **fresh-vs-load determinismus test**: `hashState(createInitialState()) === hashState(load(save(createInitialState())))` (zelený i s 0 techy).
4. **buyTech(techId) command** (`src/core/commands/`, vzor `buyCompany.js`): validace prerekvizit (`prereqs ⊆ unlockedTechs`) + `canAfford(techPt)` + `pay` (bez ctx, jako ostatní commandy). Zapiš `unlockedTechs[techId]=true`. **Aplikaci tech modifikátorů (applyTechModifiers) řeš v T2** — zde jen odemčení + (pokud design předepisuje volání rebuild/apply, deleguj na placeholder, který T2 naplní; vyjasni v summary).
5. **registerBuyTech v bootstrapu** (`src/app/main.js`) — anti-dark-code (poučení z B1 iter-014). Bez registrace by buyTech byl nedostupný.
6. **Persist**: `unlockedTechs` (a `research` placeholder) v player allowlistu (`persistSchema.js` + load); deriváty se neukládají. Round-trip.

## Scope OUT
- **Tech modifikátory / generalizace rebuild** = T2 (T-005). `findTech`/`hasCatalog` infrastrukturu zaveď, ale fold/addTechModifiers nech na T2 (nebo placeholder, jasně označený).
- academy/research produkce = T3 (jen init pole `research:{sectors:{}}`).
- UI = T4.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej: techCap tabulkový test, buyTech (validace/prereqs/pay/odemčení), **fresh-vs-load determinismus test** (M-1), persist round-trip unlockedTechs, techs.json schema validace.
- `npm run smoke` OK.
- **Determinismus G1** (iter005-edge) + **round-trip identita budov M5-1** (`m5-buildings-t4.test.js`) nedotčené — to je tvrdá podmínka (M6 nesmí rozbít M5-1).
- Pokud měníš zdroj ovlivňující precache, regeneruj `node tools/gen-precache.mjs`.

## Inputs
- Design: `context/refs/design_iter-015.md`, DR-015-01
- Kód: `src/core/state/createHomeState.js` (createPlayerState ~ř.64), `src/core/balance/formulas.js` (techCap ř.31), `src/core/commands/buyCompany.js` (vzor), `src/app/main.js` (bootstrap registrace), `src/app/catalogs.js`, `src/core/catalog/schemas.js`, `src/core/catalog/index.js` (getCatalog/hasCatalog), `src/save/persistSchema.js` + `load.js`, `src/data/techs.json`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-015_T-004.md` (soubor:funkce, gate výstup, co je placeholder pro T2)
- `bash agents/coder/scripts/handoff-out.sh T-004 "<stručně + gate výsledek>"`
- NEcommituj (git).
