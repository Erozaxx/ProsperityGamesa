# Rework note – T-004 (micro-rework analýz dle review T-003)

- **Task**: T-004, iter-001 (BRIEF-004)
- **Autor**: architect
- **Datum**: 2026-06-12
- **Vstupy**: review T-003 (§2 G1/G2, §5 F1–F3), T-002a, T-002b; citace ověřeny proti `doc/original_source/modules/prosperity/services/` (game.js, market.js, world.js)
- **Rozsah**: redakční přesnost citací + 2 doplněné návrhové poznámky. Žádná nová analýza, žádná změna struktury či priorit mimo doplnění, konsolidovaný seznam reviewera (T-003 §6) nedotčen.

## Co bylo změněno a kde

### F1 – `Engine.curStep` je service-level undefined
- **T-002a A6**: upřesněno, že `Engine.curStep` je **service-level undefined** (service literál `Engine` property nemá), zatímco `$rootScope.engine.curStep` existuje a funguje – rozbitý je jen odkaz na service; služby si proto den/poledne počítají lokálně z `$rootScope.engine.curStep`. *(Pozn.: tato část byla zapracována už v prvním běhu T-004 – commit 436b681.)*
- **T-002b B5**: doplněn jako druhý exemplář vzoru „křehký výraz bez testů": `world.js:568–569` čte service-level undefined `Engine.curStep` → `NaN` → flagy tiše vždy false; odkaz na detail v T-002a A6.

### F2 – citace signatury `Game.save`
- **T-002a A8 + B1**: opravena citace – skutečná definice je `save: function(callback)` (game.js ř. 112); `game.save(true, null, $rootScope.curGameSave)` je volání z `autoSave` (ř. 45), extra argumenty funkce ignoruje. Substance nálezů (server-only persistence, deep copy, mrtvá copy smyčka, logy v savu) beze změny. *(Zapracováno už v prvním běhu T-004 – commit 436b681; v tomto běhu ověřeno proti zdroji.)*

### F3 – `/market` precedence bug na ř. 25
- **T-002a C2**: explicitně doplněno, že precedence bug je ve **volání na market.js ř. 25** (`curStep % STEPSPERDAY * 5 == 0` v `Market.step`), nikoli uvnitř `getUpdatedData` (ta začíná až na ř. 263).

### G1 – seedovatelný/serializovatelný RNG (Med)
- **T-002a B5**: doplněno explicitní návrhové rozhodnutí – originál používá globální `Math.random()` (+ wrapper `services/rand.js`), který nelze seedovat ani uložit; rebuild musí použít seedovatelný PRNG se stavem v save, jako předpoklad reprodukovatelného offline catch-upu (varianta a) a testovatelnosti vzorců (T-002b D2).
- **T-002a, tabulka D**: přidán řádek **#15 (B5-RNG, Med, S)** – číslování stávajících položek 1–14 nezměněno, aby zůstaly platné existující reference.

### G2 – bitvy během catch-upu (Med)
- **T-002a B5**: propojeno – auto-resolve obranných bitev při catch-upu je přirozený důsledek návrhu bitvy jako serializovatelného deterministického automatu na jednotném časovém zdroji (T-002a A4, T-002b C3; konsolidovaná položka K7/K8 review T-003). Balanční/UX zbytek (cap, auto-resolve vs. odložení) zůstává k eskalaci.

## Ověření citací proti zdroji (tento běh)
- market.js ř. 25: `if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY * 5 == 0)` → volání `getUpdatedData()` – potvrzeno.
- market.js ř. 263: `getUpdatedData: function(callback)` – potvrzeno.
- game.js ř. 45: `game.save(true, null, $rootScope.curGameSave)` v `autoSave` – potvrzeno; ř. 112: `save: function(callback)` – potvrzeno.
- world.js ř. 568–569: `isNewDay/isNewNoon` z `Engine.curStep % $rootScope.STEPSPERDAY` – potvrzeno.
- `services/rand.js` existuje – potvrzeno.

## Scope OUT dodrženo
- F4 neřešeno (vyřešeno konsolidací K7/K8 v review T-003 §6).
- Konsolidovaný seznam reviewera nedotčen; žádná implementace, žádná re-strukturace analýz.
