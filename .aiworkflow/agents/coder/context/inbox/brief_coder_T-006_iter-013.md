# Brief

- **Brief ID**: BRIEF-013-006
- **Iteration**: iter-013 (M5-1)
- **Task**: T-006 = T3 (builder companies)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Implementuj **T3** dle designu: builder companies — katalogová data + logika výběru/kapacit. Řeší gap **G-BUILDER-COMPANIES**, který T2 (T-005) odložil (`buildersProcess` zatím bere kapacitu jen z `builderHut.effects`/jobs). Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-013_T-001.md` — čti sekci **T3** (builder companies: výběr/kapacity, jak firmy ovlivňují stavbu). Řiď se přesně designem ohledně sémantiky (co firma poskytuje: odemčení typů budov vs. builder kapacitu vs. obojí).

## Scope IN (T3)
1. **Stav vlastněných firem**: kde ve `state` se drží koupené/najaté builder companies (dle designu). Deterministické, persistované.
2. **Command pro pořízení firmy** (`buyCompany`/`hireCompany` dle designu): validace, cena z `companies.json` (`cost`), odečet přes `pay`. Pozn. G-BUILD-TXAUDIT platí i tady (bez ctx).
3. **Logika výběru/kapacit**: napojení firem na stavbu dle designu — typicky firma odemyká stavbu určitých typů budov a/nebo přidává builder kapacitu. Integruj do `buildings.js` (`build()` validace a/nebo `buildersProcess` kapacita) tak, jak design předepisuje. Nahraď/rozšiř `effectFromCatalog` workaround z T2 jen pokud to design pro T3 vyžaduje (jinak nech na T4).
4. **companies.json**: ověř/doplň strukturu pro M5-1 potřeby (existuje: explorer/houseBuilder/mineBuilder se `cost`/`id`/`name`/`type`). Pokud chybí pole (kapacita/buildersProvided/odemčené typy), doplň s `provenance:'approximated'` a aktualizuj gap-report.
5. **Persist** vlastněných firem (allowlist) + round-trip.

## Scope OUT
- Modifier fold/effective/agregáty = T4 (T-007). Pokud firma poskytuje modifikátor, použij existující modifier API / nech stub dle designu — nepiš modifier fold engine (to je T4).
- kontrakty, build UI = M5-2.
- buildings.json katalog budov needituj (hotovo v T1).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Přidej testy: pořízení firmy (validace/pay), efekt firmy na stavbu (odemčení/kapacita dle designu), persist round-trip firem.
- `npm run smoke` OK.
- **Determinismus** G1 + existující nedotčené; žádný Date.now/Math.random/DOM v core; catch-up-safe.
- Pokud měníš zdroj ovlivňující precache, regeneruj `node tools/gen-precache.mjs` (čistý diff, jen PRECACHE_VERSION).

## Inputs
- Design: `context/refs/design_iter-013_T-001.md` (T3)
- T2 summary (G-BUILDER-COMPANIES popis): `agents/coder/artifacts/final/impl_summary_iter-013_T-005.md`
- Kód: `src/data/companies.json`, `src/core/systems/buildings.js` (build/buildersProcess/effectFromCatalog), `src/core/commands/` (vzor build.js), `src/save/persistSchema.js`, `src/core/systems/transactions.js` (pay)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-013_T-006.md` (soubor:funkce, gate výstup, jak firmy ovlivňují stavbu, zbylé gapy)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
