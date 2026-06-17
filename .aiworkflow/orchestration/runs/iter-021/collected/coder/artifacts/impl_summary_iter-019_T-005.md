# Impl Summary — iter-019 T-005 (achievementy deklarativně K18)

## Změněné soubory

| Soubor | Funkce / změna |
|---|---|
| `src/data/achievements.json` | Přidáno `when:predicate-as-data` + `onUnlock:[]` ke každému achievementu; texty přepsány (R-G parafráze); `_meta.provenance` → `original-paraphrased` |
| `src/core/systems/achievements.js` | **NOVÝ** — `achievementsEval(state,_,ctx)` centrální evaluator; `unlockAchievement(state,ctx,id)` jediné místo zápisu `unlocked[id]` |
| `src/core/engine/tickOrder.js` | Přidán import `achievementsEval`; registrace `achievements.eval`; nový periodic `{every:'day', order:95}`; TICK_ORDER note aktualizován |
| `src/core/registry/effects.js` | `unlockMap` → reálná mutace `catalogState.unlockedMaps[mapId]=true`; `grantResource` → reálná mutace `home.store[resourceId]+=amount`; `registerEffects` přidáno guard `if (!has(reg,'noop'))` (anti-kolize s tickOrder noop) |
| `src/app/main.js` | `buildCtxCatalog()` rozšíření o achievements catalog; `bootstrapEngine()` volá `registerEffects(registry)` (MIN-2 registrace do prod); import `registerEffects` |
| `tools/extract/extractors/achievements.mjs` | Extractor přepsán: generuje `when`, `onUnlock`, R-G texty, `_meta.provenance=original-paraphrased` (nutné pro determinismus `extract.mjs` v iter006 testu) |
| `test/m8-achievements.test.js` | **NOVÝ** — 40 testů v 9 describe skupinách |

## Gate výstup

- **npm run ci**: 1467 tests, 0 fail (✓)
- **npm run smoke**: SMOKE OK (✓)
- **typecheck**: čistý (✓)
- **lint:core**: čistý (66 souborů, 0 porušení)

## C4 grep gate

```
grep -rn "achievements\.unlocked\[" src/ --include="*.js"
```

Výsledek: všechny výskyty jen v `src/core/systems/achievements.js`.
Přiřazení (`= true`) výhradně v `unlockAchievement`. **C4 gate ČISTÝ.**

## MIN-2: Real mutations

- `grantResource`: `state.home.store[resourceId] += amount` (was: `console.log` stub)
- `unlockMap`: `state.catalogState.unlockedMaps[mapId] = true` (was: `console.log` stub)
- `registerEffects` nově voláno v `bootstrapEngine` (bylo: nikde v prod)

## MIN-4: No process.env / runtime branch

- `predicate.js` (shared T1) — čistá `getPath` bez runtime větví, bez `process.env`
- `achievements.js` — žádný `Date.now`, `Math.random`, DOM, `process.env`
- lint:core potvrzuje 0 porušení

## Determinismus

- Achievementy idempotentní: `unlocked[id]` guard v `unlockAchievement` + v `achievementsEval`
- Denní eval (order 95) deterministický: `evalPredicate` = čistá fce, bez RNG/DOM/time
- `state.achievements.unlocked` persist přes `applyPersist` (klíč `achievements` celé)
- Persist round-trip verifikováno v testu AR-4
