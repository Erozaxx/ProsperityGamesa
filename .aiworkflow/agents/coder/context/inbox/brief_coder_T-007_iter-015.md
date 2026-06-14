# Brief

- **Brief ID**: BRIEF-015-007
- **Iteration**: iter-015 (M6)
- **Task**: T-007 = T4 (UI academy/tech strom screen)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T4 (UI academy/tech strom screen)** dle designu — tím se M6 dokončuje. Drž vzor existujícího UI: pure komponenty `{snapshot, send}`, čtou přes **selektory**, píší přes **commands**. ŽÁDNÁ herní logika v UI.

## Source of truth
`agents/coder/context/refs/design_iter-015.md` — čti **T4 UI sekci** (selektory, AcademyScreen/TechScreen, tab). `buyTech` command + research už hotové (T1/T3).

## Scope IN (T4)
1. **Selektory** (`src/ui/selectors.js` dle designu): `selectTechs` (sektory + techy: odemčené/dostupné/zamčené, cena `techCap(level)`, prerekvizity, canAfford(techPt)), `selectResearch` (per sektor: level, exp, exp-do-dalšího-techPt = `techCap(level)`, pctProgress). Deriváty počítané ZDE (ne v UI ani persistu).
2. **AcademyScreen / TechScreen** komponenta (`src/ui/screens.js`): tech strom (sektory + techy, stav odemčení, cena, prereqs, tlačítko buyTech → `send('buyTech',{techId})`), research progres per sektor (level, exp bar), zobrazení techPt zůstatku.
3. **Tab** v `src/ui/App.js`: přidej `academy` (nebo `research`/`tech`) tab dle existujícího vzoru (jako Build/Market/Council screen).
4. Styly (`src/ui/styles.css`) dle potřeby (mobile-first, žádný overflow).

## Scope OUT
- Core tech/research logika = hotovo (T1/T2/T3). Jen UI vrstva (selektory + komponenty + tab).
- Žádná herní logika v UI komponentách. Žádná změna engine/commands.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy selektorů (selectTechs odemčené/dostupné/cena, selectResearch progres/level).
- `npm run smoke` OK — **boot + render academy/tech screen bez console chyb** (klíčové, smoke renderuje UI); ověř, že buyTech tlačítko volá `buyTech` command (už wired) a odemčení se projeví.
- **Determinismus G1** + **M5-1 round-trip** + **M6 round-trip** nedotčené; selektory čisté read (žádný Date.now/Math.random ovlivňující stav).
- Žádný DOM v core.
- Precache regen pokud přidání UI souborů ovlivní manifest (`node tools/gen-precache.mjs`).

## Inputs
- Design: `context/refs/design_iter-015.md` (T4)
- T-004/T-006 summaries
- Kód/vzor: `src/ui/screens.js` (BuildScreen/MarketScreen vzor), `src/ui/selectors.js` (selectBuildableBuildings/selectContracts vzor deriváty), `src/ui/App.js` (taby), `src/ui/styles.css`, `src/core/balance/formulas.js` (techCap), `src/core/systems/buildings.js` (findTech), `src/data/techs.json`, `src/core/commands/buyTech.js`

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-015_T-007.md` (soubor:funkce, gate výstup, co UI pokrývá)
- `bash agents/coder/scripts/handoff-out.sh T-007 "<stručně + gate výsledek>"`
- NEcommituj (git).
