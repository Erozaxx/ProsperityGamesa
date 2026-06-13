# Brief

- **Brief ID**: BRIEF-012-013
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-13

## Goal
Rozhodnout **přístup k opravě reload-determinismus regresu** (`workforce.total`), který odhalil A1 seed (T-005), a dodat coderovi (T-014) jednoznačný, minimální design. Uživatel zvolil „nejdřív architekt" — tvé rozhodnutí je blocker před opravou.

## Context (root cause — ověřeno orchestrátorem z kódu)
- `jobsAccidents` (`src/core/systems/jobs.js:152-178`) hradí čerpání populačního RNG streamu: `workers = min(population.total, workforce.total)`; při `workers <= 0` → early return → **NEČerpá `rng.next()`**.
- `workforce.total` je **odvozená** (NEPERZISTUJE se, `persistSchema.js:7`). `load.js:125-127` ji po načtení **nepřepočítá** (default 0; obnoví jen `assigned`). Refresh až v `autoAssignWorkers`, který v tickOrder běží **po** `jobsAccidents` (registr 155 vs 156).
- → První post-load tick: stale `workforce.total=0` → `jobsAccidents` přeskočí RNG draw → **desync 'population' streamu** → vlčí útoky/úmrtí jinak → **rozejde se perzistovaná `population.total`**.
- Před iter-012 (pop 0) se nikdy neprojevilo; A1 seed (pop 50) bug aktivoval.

Plný kontext, dopad a 3 varianty: **`.aiworkflow/orchestration/decisions/DR-012-02_reload-determinism-workforce-total.md`** (povinné čtení).

## Scope IN
- Vybrat **jednu** variantu fixu (A rebuild-on-load / B jobsAccidents reload-independent / C reorder) — nebo zdůvodněnou jinou — s ohledem na: minimální dopad na determinismus, soulad s architektura §9.1 K11 („odvozená pole se rebuildují na load"), žádnou změnu tvaru save (v3), zachování determinismu spojitého simu.
- Dodat coderovi konkrétní design: které soubory/funkce, kde přesně přepočet, jak ověřit (vč. že G1 test se vrátí na **plný hashState**).
- Posoudit, zda fix nemá vedlejší účinek na frekvenci nehod / jiné systémy.

## Scope OUT
- Neimplementovat (to dělá coder v T-014). Žádné jiné oblasti než reload-determinismus workforce.total.

## Inputs
- `orchestration/decisions/DR-012-02_*.md` (ZÁVAZNÉ)
- `agents/coder/artifacts/final/impl_summary_iter-012_T-005-009.md` (latentní nález, odchylka #2)
- `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (§9.1 K11)
- Kód: `src/core/systems/jobs.js`, `src/save/load.js`, `src/save/persistSchema.js`, `src/core/engine/tickOrder.js`, `test/iter005-edge.test.js`

## Acceptance Criteria
- DR-012-02 doplněn: zvolená varianta + zdůvodnění (proč ne ostatní), Status → decided.
- Design pro T-014 dostatečně konkrétní, aby coder neimprovizoval (soubor, funkce, místo přepočtu, edge-case po load).
- Explicitně potvrzeno: G1 test (`iter005-edge.test.js`) se vrátí na plný `hashState` a musí projít po fixu.

## Expected Outputs
- Aktualizovaný `orchestration/decisions/DR-012-02_*.md` (rozhodnutí + design).
- Stručný design doc: `agents/architect/artifacts/final/fix_reload_determinism_iter-012_T-013.md`.

## Risks / Constraints
- Determinismus je core invariant — fix nesmí zavést novou nedeterministickou cestu.
- Zero-build, žádné nové runtime závislosti.
- Pokud zjistíš, že root cause je jinde/širší, NEulet potichu — zapiš to do DR a eskaluj orchestrátorovi.
