# Implementation Summary — iter-015 T-007 (M6 T4 UI)

- **Task**: T-007 = T4 (UI academy/tech strom screen) — M6 finalizace
- **Datum**: 2026-06-14
- **Stav**: DONE

## Soubory:funkce zmenene

| Soubor | Zmena |
|---|---|
| `src/ui/screens.js` | +`TechScreen` komponenta (export) |
| `src/ui/App.js` | +`TechScreen` import; +tab `{ id:'tech', label:'Veda' }` do TABS; +render `activeTab==='tech'` |
| `src/ui/styles.css` | +CSS pro `.screen-tech`, `.research-list`, `.research-item`, `.tech-sectors`, `.tech-sector`, `.tech-list`, `.tech-item*`, `.tech-buy-btn`, mobile breakpoint |
| `src/precache.js` | precache regen (novy version hash, 101 souboru) |
| `test/ui-selectors-m6.test.js` | NOVY — 26 testu pro `selectTechTree`, `selectResearchProgress`, `selectTechPoints` |

## Pozn: Co bylo uz hotovo (T1-T3)

- `src/ui/selectors.js`: `selectTechTree`, `selectResearchProgress`, `selectTechPoints` — uz implementovano v predchozich taskech
- `src/core/commands/buyTech.js`: `buyTech` command + `registerBuyTech` — hotovo T1
- `src/core/systems/buildings.js`: `addTechModifiers`, `applyTechModifiers`, `findTech`, `rebuildBuildingDerived` (b2) — hotovo T2
- `src/core/systems/research.js`: `researchDaily` system — hotovo T3
- `src/app/main.js`: `registerBuyTech(creg)` — hotovo T1 (anti-dark-code)
- `src/data/techs.json`: katalog s 7 techy v 6 sektorech — hotovo T1/G

## Gate vystup

- `npm run ci`: 1097 pass, 0 fail (typecheck OK, lint:core OK, test OK)
  - Pridane testy: +26 v `test/ui-selectors-m6.test.js`
  - `selectTechTree`: odemcene/dostupne/zamcene, cena=techCap, prereqs, canAfford
  - `selectResearchProgress`: level, exp, cap=techCap(level), progPct derivat, 6 sektoru
  - `selectTechPoints`: zustatok techPt
- `npm run smoke`: SMOKE OK — boot + render bez console chyb; tab "Veda" videt v nav
- Determinismus G1: nedotcen (selektory = cisty read; zadny Math.random/Date.now)
- M5-1 round-trip: nedotcen
- M6 round-trip: nedotcen
- Precache: regen proveden (101 souboru, novy hash)

## Co UI pokryva

### TechScreen (src/ui/screens.js)

1. **Tech body zustatok** — hlavicka `Tech. body: {techPt}` (selectTechPoints)
2. **Research progres per sektor** — 6 sektoru (agriculture/civil/crafts/forestry/medicine/military):
   - uroven (`level`)
   - progress bar `<progress>` (progPct 0-100)
   - exp / cap text
3. **Tech strom** — techy grupovane dle sektoru:
   - `unlocked` → "Odemceno" text (zelene)
   - `available && canAfford` → tlacitko "Odemknout" → `send('buyTech', {techId})`
   - `available && !canAfford` → disabled tlacitko "Nedostatek bodu"
   - `!available` → "Vyzaduje: {prereqs}" text (sedy)
   - Efekty techu (`{target} {attr} +/-/x{value}`) pro kazdy tech

### App.js tab
- Tab "Veda" (id:'tech') pridan za "Kontrakty"
- Render `<TechScreen snapshot send />` dle vzoru ostatnich tabu

### Selektory (uz implementovano, testy pridane T4)
- `selectTechTree(s)` — full tech tree s unlock/available/canAfford/prereqs/cost/effects
- `selectResearchProgress(s)` — per-sektor level/exp/cap/progPct
- `selectTechPoints(s)` — techPt cislo

## Poznamky

- `buyTech` command uz wired v `main.js:registerBuyTech(creg)` — button funguje
- Vzor: pure komponenta `{snapshot, send}`, zadna herni logika v UI
- Mobile-first: progress bar `width:100%`, na 480px skryty level/exp labels
- Zadny DOM v core
- Gap G-LISTTECHS: vyreseno approximaci (7 techu, 6 sektoru, M9 kalibrace)
- Gap G-TECH-JOB-EFFECTIVE: job-cilene techy jsou tichy no-op do M9 (popsano v tech efektech)
