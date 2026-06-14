# Brief

- **Brief ID**: BRIEF-017-006
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-006 = T6 (UI world/zones screen)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T6 (UI world/zones screen)** dle designu — tím se M7a-2 dokončuje (a celé M7a). Drž vzor existujícího UI: pure komponenty `{snapshot, send}`, čtou přes **selektory**, píší přes **commands**. ŽÁDNÁ herní logika v UI.

## Source of truth
`agents/coder/context/refs/design_iter-017.md` — čti **T6 UI sekci** (WorldZonesScreen, selektory, tab). Commandy (acceptQuest/rejectQuest) + frakční stav/zóny/questy už hotové (T2/T3).

## Scope IN (T6)
1. **Selektory** (`src/ui/selectors.js` dle designu): `selectWorldZones` (zóny: liege/policy/favour/units/ratingy on-demand), `selectWorldFactions` (frakce: state/diplomacie), `selectQuests` (nabízené/aktivní questy: odměna, deadline/daysLeft, requirements). Deriváty (ratingy, daysLeft) počítané ZDE (ne v UI/persistu).
2. **WorldZonesScreen** komponenta (`src/ui/screens.js`): mapa/seznam zón (liege, policy, favour přehled), frakce/diplomacie, questy panel (accept → `send('acceptQuest',...)` / reject → `send('rejectQuest',...)`, deadline, odměna).
3. **Tab** v `src/ui/App.js`: přidej `world` (Svět) tab dle existujícího vzoru.
4. Styly (`src/ui/styles.css`) dle potřeby (mobile-first, žádný overflow).

## Scope OUT
- Core frakční AI/revolty/questy/tribute logika = hotovo (T2/T3). Jen UI vrstva. Žádná logika v UI. battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy selektorů (selectWorldZones/Factions/Quests deriváty, daysLeft, ratingy).
- `npm run smoke` OK — **boot + render world screen bez console chyb** (klíčové, smoke renderuje UI); ověř accept/reject quest tlačítko volá command a mění stav.
- **Determinismus G1** + **M7a-1 round-trip + T2 + T3** + M5/M6/M4b nedotčené; selektory čisté read (žádný Date.now/Math.random ovlivňující stav).
- Žádný DOM v core. Precache regen pokud přidání UI souborů ovlivní manifest (`node tools/gen-precache.mjs`).

## Inputs
- Design: `context/refs/design_iter-017.md` (T6)
- T-004/T-005 summaries
- Kód/vzor: `src/ui/screens.js` (BuildScreen/TechScreen/MarketScreen vzor), `src/ui/selectors.js` (selectContracts/selectTechTree vzor deriváty), `src/ui/App.js` (taby), `src/ui/styles.css`, `src/core/systems/world.js` (zóny/frakce/questy stav, calcMilitary/EconomicRating), `src/core/commands/quests.js` (acceptQuest/rejectQuest)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-006 (iter-017)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-017_T-006.md` (soubor:funkce, gate výstup, co UI pokrývá)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
