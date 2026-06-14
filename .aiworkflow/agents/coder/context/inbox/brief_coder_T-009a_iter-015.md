# Brief

- **Brief ID**: BRIEF-015-009a
- **Iteration**: iter-015 (M6)
- **Task**: T-009a = oprava M-A (correctness) + m-1 (doc) z review gate
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-14

## Goal
Oprav 1 major correctness bug (M-A) + 1 minor doc drift (m-1) z review gate T-009. Malé, lokalizované. Detaily: `agents/coder/context/refs/review_iter-015_T-009.md`.

## Scope IN

### M-A (major) — double-count `researchExp` (correctness/balanc)
`src/core/systems/research.js` (~ř. 94-99): research počítá academy/university exp jako `effective('academy','researchExp',state) * bSt.created`. ALE `addBuildingModifiers` (buildings.js) už **bakuje `created` do hodnoty** `add` modifikátoru → `effective('academy','researchExp')` už vrací `2 × created`. Násobení `bSt.created` podruhé = **kvadratická** exp produkce (2 univerzity → 20 exp/sektor místo 10).
- **Oprava** (dle reviewera, ~1 řádek): NEnásobit znovu `created` — `effective()` už agreguje přes všechny instance daného typu. Tj. `totalBonus = effective(buildingId, 'researchExp', state)` (bez `× created`). Ověř proti `recalcBuildingAggregates`/`effective` sémantice v buildings.js, ať je to konzistentní (effective vrací sumu přes created instance, ne per-instance).
- **Zpřísni test**: stávající multi-building test asertuje `>= 10` (projde i při chybných 20). Změň na **exact-match** (2 academy s researchExp=2 → přesně 2×2=4 exp/sektor, ne 8 — ověř správnou očekávanou hodnotu dle effective sémantiky a katalogu). Oprav i zavádějící komentář (tvrdí 10).

### m-1 (minor) — tickOrder doc drift (N-04)
`docs/tickOrder.md`: chybí `research.daily` (day, order 75) v tabulce i ASCII diagramu. Kód (`tickOrder.js:218`) je správně — jen doc zaostal. Doplň `research.daily` order 75 (po `buildings.age` 70) do tabulky + diagramu.

Nit (2) z review dle uvážení, jen pokud triviální.

## Scope OUT
- Žádná jiná změna chování. Neměň determinismus/modifier/persist logiku (kromě M-A correctness opravy).
- Neměň gameplay mimo M-A.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. Zpřísněný research test (exact-match) MUSÍ být zelený s opravenou hodnotou.
- `npm run smoke` OK.
- **Determinismus G1** + **M5-1 round-trip (m5-buildings-t4)** + **M6 round-trip (m6-tech-roundtrip)** nedotčené (M-A oprava nemění determinismus, jen hodnotu exp produkce).
- Precache regen jen při změně zdroje ovlivňujícího manifest (research.js změna → pravděpodobně ano; ověř).

## Inputs
- Review (M-A/m-1 detail): `agents/coder/context/refs/review_iter-015_T-009.md`
- Kód: `src/core/systems/research.js` (~ř.94-99), `src/core/systems/buildings.js` (effective/recalcBuildingAggregates/addBuildingModifiers — sémantika created), `docs/tickOrder.md`, `test/m6-tech-research.test.js` (multi-building test)

## Workflow po dokončení
- `agents/coder/state/current-task.md` → done
- `agents/coder/artifacts/final/impl_summary_iter-015_T-009a.md` (co opraveno, správná exp hodnota po opravě, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-009a "<stručně + gate výsledek>"`
- NEcommituj (git).
