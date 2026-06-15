# Impl Summary — iter-012 T-017 (oprava review F-1 + F-2)

- **Agent**: coder
- **Iteration**: iter-012
- **Task**: T-017 — oprava 2 minor review nálezů z code review T-011 (F-1, F-2)
- **Date**: 2026-06-13
- **Brief**: brief_coder_T-017_iter-012.md
- **Vstupy**: code_review_iter-012_T-011.md (F-1, F-2), architektura R-A4-3

## Co změněno

### F-1 — neredukovat už-over-cap loaded total (oba systémy, symetricky)
Cap (`sanityCap`) smí zabránit jen NOVÉMU překročení; nikdy nesnižovat total, který už je nad capem (R-A4-3).

- `src/core/systems/health.js:55` — `healthBirths`:
  - Před: `const newTotal = Math.min(pop + actualBorn, sanityCap);`
  - Po: `const newTotal = pop >= sanityCap ? pop : Math.min(pop + actualBorn, sanityCap);`
  - `cappedBorn = newTotal - pop` zůstává; `bornTotal += Math.max(0, cappedBorn)` (přičítá jen skutečně přidané).
- `src/core/systems/population.js:96` — `populationMigration`:
  - Před: `state.home.population.total = Math.max(0, Math.min(pop + actualAdd, sanityCap));`
  - Po: `state.home.population.total = pop >= sanityCap ? pop : Math.min(pop + actualAdd, sanityCap);`
  - Guard řeší zbylý shrink z `min(pop, sanityCap)`; `actualAdd` je už 0 při over-capacity.
- Doplněn invariantní komentář R-A4-3 v obou funkcích.

### F-2 — reuse helper (odstranění inline duplikace)
- `src/core/systems/health.js:15` — import rozšířen o `populationSanityCap`.
- `src/core/systems/health.js:54` — inline `Math.max(capacity, BALANCE.population.sanityMaxPop)` nahrazeno `populationSanityCap(capacity)`.
- Jediná definice sanity-capu (`population.js:29`), použitá v births i migraci.

### Regress test
- `test/population.test.js` — nový describe blok `A4 over-cap loaded save is not shrunk (R-A4-3 / T-017 F-1)`:
  - `overCap = sanityMaxPop + 5000`, housing `{ tent: 100 }` (null capacity → sanityCap = sanityMaxPop).
  - `healthBirths` nad capem: total beze změny, `bornTotal === 0`.
  - `populationMigration` (migrationAcc=5 → toAdd>=1, cap větev se vykoná) nad capem: total beze změny.
  - 2/2 pass. Drží vzor existujících testů v souboru.

## Scope OUT (nedotčeno)
F-3..F-7 (nity, mrtvý `_catalog` param) → backlog. Žádné jiné refaktory, žádná změna RNG cest ani save tvaru. Determinismus invariant (deriveWorkforceTotal, G1) nedotčen — změny jsou mimo RNG i mimo derivaci workforce.total.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ — **780 testů, 0 fail** (exit 0; typecheck + lint:core + test).
- `npm run smoke` OK — pop=50, exit 0.
- Determinismus nedotčen — `test/iter005-edge.test.js` (G1 plný hashState) + `test/iter012-playability.test.js`: **25/25 pass**.
- Precache: `node tools/gen-precache.mjs` regenerován — **deterministický, čistý diff (jen `PRECACHE_VERSION`: prosperity-3a46c11cccc6 → prosperity-8874fcc9cfad)**. Zdrojová změna health.js/population.js ovlivnila hash precache → regenerace nutná.

## Změněné soubory
- `src/core/systems/health.js`
- `src/core/systems/population.js`
- `test/population.test.js`
- `src/precache.js` (auto-gen, jen PRECACHE_VERSION)

Necommitováno (commit dělá orchestrátor po ověření).
