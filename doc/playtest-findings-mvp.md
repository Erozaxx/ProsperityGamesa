# MVP Playtest Findings (2026-06-13)

Zdroj: reálný headless-browser playtest MVP (po dokončení M0–M4). Odhalil bugy, které
CI (762 testů) neviděla, protože `node:test`/`tsc` neexercitují běh v prohlížeči ani
seedovaný dlouhý běh ekonomiky.

## Opraveno hned
- **BLOCKER (opraveno, PR #12)**: `index.html` neměl import-mapu pro vendorovaný preact →
  bare specifier `"preact"` v `src/vendor/hooks.module.js` → appka v prohlížeči
  nenastartovala. Fix: importmap `"preact"` → `./src/vendor/preact.module.js`.

## Otevřené nálezy → samostatná iterace „Playability & onboarding hardening"
1. **Prázdný start state (bug, ne jen balanc)**: `createInitialState` volá `createHomeState()`/
   `createPlayerState()` BEZ katalogu a factory čtou neexistující klíče
   (`startPopulation`/`startTents`) místo `BALANCE.start` (`population:50, gold:500, food, housing`).
   → hra startuje s 0 populace / 0 zlata, není co dělat. Fix: seedovat z `BALANCE.start`.
2. **Resolver zdrojů – gold/techPt (BLOCKER pro seedovanou hru)**: `resourceKindOf('gold')`
   nenajde 'gold' v katalogovém `byId` → vrátí `'resource'` handler, který čte 0. Takže
   `pay({gold})` vidí „have 0" i když `state.player.gold>0` → výjimka „insufficient funds".
   Fix: speciální měny vracet napřímo (`if (key==='gold'||key==='techPt') return key`).
   Dopad i mimo crash: gold přes handler (taxes/grant) nejde do `state.player.gold` → „Zlato 0".
3. **Crime pay throw**: `crimeDaily` může volat `pay({gold})`, které hodí při nedostatku
   (po opravě #2 nutné navíc integer-clamp na `floor(available)`, ať broke osada nespadne).
4. **Populace exploduje** (50 → ~8749 / herní rok): porody nejsou reálně zastropené
   bydlením/jídlem → balanc/sanity (M9 kalibrace, ale pro hratelnost MVP nutné dřív).
5. **Market UI přetéká** horizontálně na úzkém mobilu → mobile UX polish (M9).

## Proces (doporučení)
- Zaveden **browser-smoke gate**: `npm run smoke` (`tools/smoke.mjs`, headless Chromium) –
  boot + 0 console errors + #app se vyrenderuje. **Povinné v test loopu každého UI milníku**
  (M5–M8) a v této playability iteraci. Tím se „zelené CI, ale appka nejede" nestane.
- Zvážit do test loopu i **dlouhý seedovaný sim** (≥ 1–2 herní roky) jako catch na crash/balanc
  bugy typu #3/#4.
