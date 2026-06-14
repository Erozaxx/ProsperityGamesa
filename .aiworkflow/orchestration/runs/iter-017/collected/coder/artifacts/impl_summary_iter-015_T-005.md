# Impl Summary — iter-015 T-005 (M6 T2: dotažení & zatvrzení tech modifikátor determinismu)

- **Task**: T-005 / BRIEF-015-005
- **Iteration**: iter-015 (M6)
- **Date**: 2026-06-14
- **Status**: done

---

## Co bylo přidáno

### Nový soubor: `test/m6-tech-roundtrip.test.js`

Nový test soubor (19 testů v 8 describe blocích) pokrývající:

| Scénář | Popis |
|---|---|
| A | 0 techů, 0 budov (baseline) |
| B | 1 building-cílící tech, BEZ postavené cílové budovy — modifier v poli, home.derived nezměněn, round-trip OK |
| C (KRITICKÝ) | 1 building-cílící tech + postavená cílová budova — agriculture_granaries+granary → storage.food ↑, civil_attractiveness+well → attractiveness ↑; hashState BIT-IDENTICKÝ |
| D | Víc techů (mix job+building, víc building-cílících) + budovy — hashState BIT-IDENTICKÝ |
| E | Payload NEobsahuje home.derived, _effCache, _modVersion; unlockedTechs = source of truth |
| F | persist↔re-gen idempotence — tech modifikátory po loadu identické s před-save; žádné duplikáty |
| G | effective() hodnoty shodné před save i po load (fold konzistence) |
| H | Catch-up-safe — stejná offline dávka → stejný hashState; rebuildBuildingDerived je idempotentní; save→load→save = identický payload |

---

## Co bylo ověřeno (beze změny kódu)

### Persist↔re-gen konzistence — stav z T-004 byl SPRÁVNÝ, žádná oprava nutná:

- `applyPersist` ukládá `catalogState.modifiers` (zahrnuje tech mods po buyTech)
- `applyPayload` načte modifikátory jako shallow copy
- `rebuildBuildingDerived` (Step 5) provede:
  1. `removeAllBuildingSourcedModifiers` + `addBuildingModifiers` (re-gen budov)
  2. `removeAllTechSourcedModifiers` + `addTechModifiers` (re-gen z unlockedTechs)
- Výsledné modifikátory jsou **bit-identické** s před-save stavem (same order, same values)
- Žádné duplikáty, žádný drift, žádné dvojí započtení

Klíčová konzistentní cesta:
- `buyTech` → `applyTechModifiers` (remove-all-tech + add-tech + invalidate + recalc)
- `load` → `rebuildBuildingDerived` (b2: remove-all-tech + add-tech; pak c/d: invalidate+recalc)
- Obě cesty volají stejné helpery (`removeAllTechSourcedModifiers` + `addTechModifiers`)
- `_modVersion` resetováno na 0 před `invalidateModifiers` v obou cestách → vždy `_modVersion=1` po buildu → hashState stabiliní

### Zjištění re konzistenci `catalogState.modifiers`:
- Tech modifikátory se ukládají i načítají (jsou v allowlistu přes celý `catalogState.modifiers`)
- Na loadu jsou přepsány (remove + re-gen) — redundance je záměrná a žádoucí (arch §2.4 "uložené modifikátory jsou redundantní... load je nepoužije naslepo, přepočte je")
- Toto je JEDNÁ konzistentní cesta (M6-D5/D6) — NEexistuje load-only větev

---

## Gate výstup

- **npm run ci**: 1046 testů, 1046 pass, 0 fail ✅ (+19 nových testů)
- **npm run smoke**: SMOKE OK, 0 console errors ✅
- **Determinismus G1** (iter005-edge.test.js): 16/16 pass ✅ (nedotčeno)
- **Round-trip identita M5-1** (m5-buildings-t4.test.js): 44/44 pass ✅ (nedotčeno)
- **Round-trip s techy** (m6-tech-roundtrip.test.js): 19/19 pass ✅ — BIT-IDENTICKÝ hashState
- **Catch-up-safe s techy**: ✅ (Scenario H)
- **Persist payload NEobsahuje derived data**: ✅ ověřeno (Scenario E)

---

## Soubory změněné

| Soubor | Typ změny |
|---|---|
| `test/m6-tech-roundtrip.test.js` | **Nový soubor** — 19 testů round-trip identity s techy |
| `.aiworkflow/agents/coder/state/current-task.md` | Aktualizováno na done |
| `.aiworkflow/agents/coder/artifacts/final/impl_summary_iter-015_T-005.md` | Tento soubor |

Žádné produkční soubory změněny — T-004 implementace z `src/` byla kompletní a správná.
