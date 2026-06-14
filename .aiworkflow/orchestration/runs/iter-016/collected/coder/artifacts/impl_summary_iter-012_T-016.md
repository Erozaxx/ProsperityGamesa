# Impl Summary — T-016 (iter-012): Derive-on-init dotažení reload-determinismu

- **Iteration**: iter-012
- **Task**: T-016 (coder impl) — dle závazného designu architekta T-015
  (`agents/architect/artifacts/final/fix_reload_determinism_complete_iter-012_T-015.md`, §2)
- **Decision**: DR-012-02 (decided-extended), Derive-on-init schválen uživatelem (T-015a, USER-GATE otevřen)
- **Date**: 2026-06-13
- **Status**: DONE — plné `npm run ci` zelené

## Změna kódu (jediná, přesně dle §2 design docu)

`src/core/state/createInitialState.js`:
1. **Import** (ř. 9): `import { deriveWorkforceTotal } from '../systems/jobs.js';`
2. **Dopočet** (ř. 82–136): koncový `return { ... }` přepsán na vzor
   "sestav `state` do lokální proměnné → dopočítej → vrať":
   - `/** @type {GameState} */ const state = { ... };`
   - před `return state;`: `state.home.workforce.total = deriveWorkforceTotal(/** @type {any} */ (state));`
   - bez `ctx` → `workerSlots` spadne do globálního katalog fallbacku (== chování `load.js` Step 5).

Žádná duplikace derivace — výhradně `deriveWorkforceTotal`. `jobs.js`, `load.js` Step 5,
`persistSchema.js`, `tickOrder.js`, `jobsAccidents`, `createHomeState.js`, tvar save (v3) — nedotčeno.

### Single source of truth (ověřeno grepem)
`workforce.total` se nastavuje na 3 kanonických místech, vždy přes `deriveWorkforceTotal`:
- `createInitialState.js:134` (init, T-016)
- `load.js:224` (rebuild-on-load Step 5, T-014)
- `jobs.js:219` `autoAssignWorkers` (přiřazuje `availableWorkers = deriveWorkforceTotal(state, ctx)` z ř. 213)

Žádná 4. inline kopie derivace.

## Výsledek ověření (cílový stav)

| Gate | Výsledek |
|---|---|
| `node --test test/app-bootstrap.test.js` (S-1, dříve RED) | **PASS** — 8 tests, 0 fail |
| `node --test test/export-string.test.js` (round-trip, dříve RED) | **PASS** — 12 tests, 0 fail |
| `node --test test/iter005-edge.test.js` (G1 plný hashState) | **PASS** — 16 tests, 0 fail (16/16) |
| `node --test test/iter012-playability.test.js` (A1) | **PASS** — 9 tests, 0 fail |
| `npm run ci` (typecheck + lint:core + test) | **ZELENÉ** — exit 0, 778 tests / 193 suites, 0 fail |
| `npm run smoke` | **OK** — exit 0, "SMOKE OK: app rendered, 0 console errors" (seeded pop=50) |
| `applyPersist(state)` payload | `home.workforce = {"assigned":0}` — **NEobsahuje `total`** (tvar save v3 beze změny) |

- **2 dříve RED testy nyní ZELENÉ**: app-bootstrap.test.js a export-string.test.js — potvrzeno.
- **Žádný test se nerozbil** — plné CI 778/778. Nic nemaskováno.
- Init při čistém `createInitialState()` (bez načteného katalogu) derivuje `workforce.total = 0`
  (edge-case §3 design docu — shodné s load i spojitým simem bez katalogu). Při boot cestě
  (katalog načten) derivuje reálnou hodnotu shodnou s load i autoAssign.

## Precache

Regeneroval jsem: `node tools/gen-precache.mjs` (exit 0, 93 files). Diff `src/precache.js` je
**čistý** — jediná změna je `PRECACHE_VERSION` (`prosperity-1d6ce1e8eb9b` →
`prosperity-3a46c11cccc6`), což je očekávané, protože se změnily bajty `createInitialState.js`.
Žádný nesouvisející šum → precache ponechán ve working tree pro commit orchestrátorem.

**Pozn. mimo scope**: `docs/benchmark_iter-005.md` je ve working tree také modifikovaný (jen
timestampy a perf čísla z dřívějšího běhu benche). NEgeneroval jsem ho v rámci T-016 (design §5:
bench NEspouštět jako gate) a NEsahal jsem na něj — orchestrátor rozhodne, zda ho committovat.

## NEcommitnuto
Git commit dělá orchestrátor po QA (dle briefu). Working tree změny: `src/core/state/createInitialState.js`,
`src/precache.js` (+ preexist. `docs/benchmark_iter-005.md` mimo scope).
