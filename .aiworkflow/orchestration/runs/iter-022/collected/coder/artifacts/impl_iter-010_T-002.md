# Implementation Note – iter-010 T-002 (M4a CONTINUATION)

- **Task**: T-002 (iter-010 M4a) – Fix tsc errors + complete wiring + CouncilScreen
- **Brief**: BRIEF-037b
- **Datum**: 2026-06-13
- **Autor**: coder (Sonnet)

## Co bylo hotovo z předchozího běhu

Ekonomické soubory (`taxes.js`, `upkeep.js`, `burnWood.js`, `accounting.js`) a UI soubory (`CouncilScreen`, `selectFinance`, App.js tab Rada) + wiring v `main.js` (`registerSetTaxRate`, `ctx.emitTx`, tickOrder registrace) byly z předchozího běhu implementovány. Chyběla správná typová anotace (příčina 6 tsc chyb) a restore `council` při načtení savegame (příčina hash mismatch testů).

## Krok 0 – Oprava tsc chyb (6 → 0)

Přidány `@typedef` JSDoc imports do těchto souborů:
- `/src/core/commands/setTaxRate.js` – `GameState`, `CommandRegistry`, `CommandResult`
- `/src/core/resources/accounting.js` – `GameState`, `TxEvent`
- `/src/core/systems/taxes.js` – `GameState`, `TickContext`
- `/src/core/systems/burnWood.js` – `GameState`, `TickContext`
- `/src/core/systems/upkeep.js` – `GameState`, `TickContext`
- `/src/core/state/createCouncilState.js` – přidány `@param {number} month/year` na `emptyReport`

Pattern: `@param {object} state` → `@param {GameState} state`; stejně pro ctx a creg.

## Krok 1 – WIRING (ověřeno, hotovo z předchozího běhu)

- `src/app/main.js` line 88: `registerSetTaxRate(creg)` ✓
- `src/app/main.js` line 165: `ctx.emitTx = (tx) => recordTx(state, tx)` ✓
- `src/core/engine/tickOrder.js` lines 163–167, 188–193: `taxes.local`/`taxes.monthly`/`upkeep.military`/`home.burnWood`/`council.closeMonth` registrované ✓

## Krok 1 – Bugfix: load.js neobnovoval council ze save

`src/save/load.js` `applyPayload()` neobsahoval restore pro `council` ani `home.notEnoughMilitaryFunding`. Při načtení savegame byl council vždy fresh (default z `createInitialState`), ale state po N krocích měl jiný council → hash mismatch.

**Fix**: přidán blok do `applyPayload()`:
```js
if (payload.council) {
  state.council = { current: payload.council.current, history: payload.council.history || [] };
}
if (payload.home && payload.home.notEnoughMilitaryFunding !== undefined) {
  state.home.notEnoughMilitaryFunding = payload.home.notEnoughMilitaryFunding;
}
```

## Krok 2 – UI (ověřeno, hotovo z předchozího běhu)

- `src/ui/screens.js`: `CouncilScreen` exportována ✓
- `src/ui/selectors.js`: `selectFinance` exportována ✓
- `src/ui/App.js`: import `CouncilScreen`, tab `{ id: 'council', label: 'Rada' }`, tab-content wired ✓

## Opraven stale test

`test/persist.test.js`: test `MIGRATIONS.length === 0` (napsán pro M2a-1 kdy migrace nebyly) byl z předchozího běhu již upraven na M4a verzi s MIGRATIONS.length === 1. Stávající stav: testy již reflektují M4a stav.

## CI výsledky

```
tsc --noEmit       : 0 errors ✓
lint:core (47 files): OK ✓
node --test        : 668 pass, 0 fail ✓
```

## Architekturní rozhodnutí (dle návrhu, bez odchylek)

- Accounting jako observer nad txEvent streamem (žádná inline mutace v pay/grant) ✓
- emitTx closure nad state v bootSequence (pokrývá live loop i catch-up) ✓
- closeMonth order 40 (poslední v month edge) ✓
- council persist: `{ current, history[] }` s cap 12 (ne neomezená mapa) ✓
- setTaxRate clamp `[rateMin=0, rateMax=5]` + finite guard ✓

## Approximated hodnoty (gap flags)

- `balance.tax.localRate: 2` – gap G-TAX-LOCALRATE (M9 kalibrace)
- `balance.tax.monthlyRate: 1` – gap G-TAX-MONTHLYRATE (M9)
- `curWorkers = workforce.assigned` – gap G-TAX-CURWORKERS (M9)
- burnWood: `firewood` resource, žádný producent v M4a – gap G-FIREWOOD-SOURCE (M5)
- season start: curSeason=0=Jaro, ale balance.season.startSeason='Winter' – gap G-SEASON-START (M9)
